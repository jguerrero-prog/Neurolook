// Several NeuroMorpho fields (brain_region, cell_type) are arrays of tags
// rather than a single string; this renders either shape as one readable line.
export function joinField(value) {
  return Array.isArray(value) ? value.join(', ') : (value ?? '');
}

// Builds one element without ever touching innerHTML — text goes through
// .textContent and attributes through .setAttribute(), so nothing passed in
// can be parsed as markup, whatever it contains. Kept small and declarative
// so a template reads as one shape instead of a dozen imperative lines.
export function createElement(tag, { className, attrs, text, children } = {}) {
  const element = document.createElement(tag);
  if (className) element.className = className;

  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      element.setAttribute(name, value === true ? '' : value);
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

const NEUROMORPHO_ORIGIN = 'https://neuromorpho.org/';
const SIMPLE_ANCHOR_PATTERN = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

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
export function renderLinkifiedNote(container, text) {
  container.replaceChildren();
  if (!text) return;

  let lastIndex = 0;
  for (const match of text.matchAll(SIMPLE_ANCHOR_PATTERN)) {
    const [fullMatch, href, linkText] = match;
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    container.appendChild(
      createElement('a', {
        attrs: { href: resolveNeuroMorphoHref(href), target: '_blank', rel: 'noopener noreferrer' },
        text: linkText,
      }),
    );
    lastIndex = match.index + fullMatch.length;
  }
  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}
