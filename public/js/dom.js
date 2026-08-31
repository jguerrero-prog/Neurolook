// @ts-check

// Several NeuroMorpho fields (brain_region, cell_type) are arrays of tags
// rather than a single string; this renders either shape as one readable line.
/**
 * @param {string[]|string|null|undefined} value
 * @returns {string}
 */
export function joinField(value) {
  return Array.isArray(value) ? value.join(', ') : (value ?? '');
}

/**
 * @typedef {Object} CreateElementOptions
 * @property {string} [className]
 * @property {Object<string, string|number|boolean|null|undefined>} [attrs]
 * @property {string} [text]
 * @property {Array<Node|null|undefined>} [children]
 */

// Builds one element without ever touching innerHTML — text goes through
// .textContent and attributes through .setAttribute(), so nothing passed in
// can be parsed as markup, whatever it contains. Kept small and declarative
// so a template reads as one shape instead of a dozen imperative lines.
/**
 * @param {string} tag
 * @param {CreateElementOptions} [options]
 * @returns {HTMLElement}
 */
export function createElement(tag, { className, attrs, text, children } = {}) {
  const element = document.createElement(tag);
  if (className) element.className = className;

  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      element.setAttribute(name, value === true ? '' : String(value));
    }
  }

  if (text !== undefined) element.textContent = text;
  if (children) {
    for (const child of children) {
      if (child) element.appendChild(child);
    }
  }

  return element;
}

const COPIED_FEEDBACK_DURATION_MS = 1500;

// Wires a button to copy `getText()`'s current value to the clipboard,
// swapping its label to a confirmation for a moment before restoring
// whatever it displayed before. `buildConfirmation` returns the replacement
// child nodes — override it to show an icon alongside the text.
/**
 * @param {HTMLElement} button
 * @param {() => string} getText
 * @param {() => Node[]} [buildConfirmation]
 * @returns {void}
 */
export function bindCopyToClipboardButton(
  button,
  getText,
  buildConfirmation = () => [document.createTextNode('Copied!')],
) {
  const originalLabel = button.textContent;
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(getText());
    button.replaceChildren(...buildConfirmation());
    setTimeout(() => {
      button.textContent = originalLabel;
    }, COPIED_FEEDBACK_DURATION_MS);
  });
}

// Every page shares one #error-banner element for showing a failure message.
/**
 * @param {string} message
 * @returns {void}
 */
export function showError(message) {
  const errorBanner = /** @type {HTMLElement} */ (document.getElementById('error-banner'));
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

const PICKING_RANDOM_NEURON_LABEL = 'Picking a neuron…';

// Wires the "random neuron" button used on both Search and Browse: disables
// it, shows a temporary label while picking, then lets the caller decide
// what happens with the result (each page navigates to a different URL
// shape). Restores the button's own original label on failure, so Search
// and Browse can each keep their own wording.
/**
 * @param {HTMLButtonElement} button
 * @param {() => Promise<void>} pickRandomNeuron
 * @returns {void}
 */
export function bindRandomNeuronButton(button, pickRandomNeuron) {
  const originalLabel = button.textContent;
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = PICKING_RANDOM_NEURON_LABEL;
    try {
      await pickRandomNeuron();
    } catch (error) {
      button.disabled = false;
      button.textContent = originalLabel;
      showError(`Could not pick a random neuron: ${/** @type {Error} */ (error).message}`);
    }
  });
}

const NEUROMORPHO_ORIGIN = 'https://neuromorpho.org/';
const SIMPLE_ANCHOR_PATTERN = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

/**
 * @param {string} href
 * @returns {string}
 */
function resolveNeuroMorphoHref(href) {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:')) return trimmed;
  return NEUROMORPHO_ORIGIN + trimmed.replace(/^\//, '');
}

// Some NeuroMorpho text fields (notably `note`) embed plain <a href="...">
// links rather than being pure text. Rebuilds that as real DOM nodes —
// everything else stays a plain text node, and only that exact anchor
// pattern becomes a real <a> — so nothing here is ever parsed as HTML,
// whatever the field actually contains. Clears and repopulates `container`.
/**
 * @param {HTMLElement} container
 * @param {string|null|undefined} text
 * @returns {void}
 */
export function renderLinkifiedNote(container, text) {
  container.replaceChildren();
  if (!text) return;

  let lastIndex = 0;
  for (const match of text.matchAll(SIMPLE_ANCHOR_PATTERN)) {
    const [fullMatch, href, linkText] = match;
    // matchAll always fills in `index` for every match; it's only typed as
    // optional because the same array shape is reused for a plain (non-global)
    // regex match, where it can't happen here.
    const matchIndex = /** @type {number} */ (match.index);
    if (matchIndex > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, matchIndex)));
    }
    container.appendChild(
      createElement('a', {
        attrs: { href: resolveNeuroMorphoHref(href), target: '_blank', rel: 'noopener noreferrer' },
        text: linkText,
      }),
    );
    lastIndex = matchIndex + fullMatch.length;
  }
  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}
