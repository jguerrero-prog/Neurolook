// @ts-check
import { createElement } from './dom.js';
import { buildNeuronDetailUrl } from './routes.js';

/** @typedef {import('./models/Neuron.js').Neuron} Neuron */

/** @returns {HTMLElement} */
function createThumbFallback() {
  return createElement('span', { className: 'neuron-card__thumb-fallback', text: 'No preview image' });
}

// NeuroMorpho hasn't rendered a thumbnail for every neuron (recently
// deposited records especially) — pngUrl is simply null for those, rather
// than a broken link. Skip straight to the fallback instead of creating an
// <img> with no src, which would show its alt text as if it were content.
/**
 * @param {Neuron} neuron
 * @returns {HTMLElement}
 */
function createThumbnail(neuron) {
  if (!neuron.pngUrl) return createThumbFallback();

  const thumbImage = createElement('img', {
    attrs: { src: neuron.pngUrl, alt: `Rendered morphology of ${neuron.name}`, loading: 'lazy' },
  });
  thumbImage.addEventListener('error', () => thumbImage.replaceWith(createThumbFallback()));
  return thumbImage;
}

/**
 * @typedef {Object} NeuronCardOptions
 * @property {boolean} [selected]
 * @property {(neuronName: string) => void} [onToggleSelect]
 * @property {(neuronName: string) => void} [onRemove]
 * @property {string} [note]
 */

// Renders one neuron summary card from a Neuron model instance. Used by both
// the browse grid and the collection grid, so selection (compare checkbox)
// and the remove action are both optional depending on which page is calling it.
/**
 * @param {Neuron} neuron
 * @param {NeuronCardOptions} [options]
 * @returns {HTMLElement}
 */
export function createNeuronCard(neuron, { selected = false, onToggleSelect, onRemove, note } = {}) {
  const headerChildren = [createElement('span', { className: 'neuron-card__id', text: neuron.name })];
  if (onToggleSelect) {
    const selectCheckbox = /** @type {HTMLInputElement} */ (
      createElement('input', {
        className: 'neuron-card__select',
        attrs: { type: 'checkbox', 'aria-label': `Queue ${neuron.name} for comparison` },
      })
    );
    selectCheckbox.checked = selected;
    selectCheckbox.addEventListener('change', () => onToggleSelect(/** @type {string} */ (neuron.name)));
    headerChildren.push(selectCheckbox);
  }

  const thumbContent = createThumbnail(neuron);

  const metaText = neuron.brainRegion ? `${neuron.species} · ${neuron.brainRegion}` : neuron.species;

  const footerChildren = [
    createElement('a', {
      className: 'neuron-card__link',
      attrs: { href: buildNeuronDetailUrl(/** @type {string} */ (neuron.name)) },
      text: 'View details →',
    }),
  ];
  if (onRemove) {
    const removeButton = createElement('button', {
      className: 'neuron-card__remove',
      attrs: { type: 'button' },
      text: 'Remove',
    });
    removeButton.addEventListener('click', () => onRemove(/** @type {string} */ (neuron.name)));
    footerChildren.unshift(removeButton);
  }

  return createElement('article', {
    className: `neuron-card${selected ? ' neuron-card--selected' : ''}`,
    children: [
      createElement('div', { className: 'neuron-card__header', children: headerChildren }),
      createElement('div', {
        className: 'neuron-card__thumb',
        children: [thumbContent, note ? createElement('span', { className: 'neuron-card__note', text: note }) : null],
      }),
      createElement('h3', { className: 'neuron-card__title', text: neuron.cellType || 'Unclassified neuron' }),
      createElement('p', { className: 'neuron-card__meta', text: metaText }),
      createElement('div', { className: 'neuron-card__footer', children: footerChildren }),
    ],
  });
}
