import { createElement } from './dom.js';
import { buildNeuronDetailUrl } from './routes.js';

// Renders one neuron summary card from a Neuron model instance. Used by both
// the browse grid and the collection grid, so selection (compare checkbox)
// and the remove action are both optional depending on which page is calling it.
export function createNeuronCard(neuron, { selected = false, onToggleSelect, onRemove, note } = {}) {
  const headerChildren = [createElement('span', { className: 'neuron-card__id', text: neuron.name })];
  if (onToggleSelect) {
    const selectCheckbox = createElement('input', {
      className: 'neuron-card__select',
      attrs: { type: 'checkbox', 'aria-label': `Queue ${neuron.name} for comparison` },
    });
    selectCheckbox.checked = selected;
    selectCheckbox.addEventListener('change', () => onToggleSelect(neuron.name));
    headerChildren.push(selectCheckbox);
  }

  const thumbImage = createElement('img', {
    attrs: { src: neuron.pngUrl, alt: `Rendered morphology of ${neuron.name}`, loading: 'lazy' },
  });
  thumbImage.addEventListener('error', () => {
    thumbImage.replaceWith(createElement('span', {
      className: 'neuron-card__thumb-fallback',
      text: 'No preview image',
    }));
  });

  const metaText = neuron.brainRegion ? `${neuron.species} · ${neuron.brainRegion}` : neuron.species;

  const footerChildren = [createElement('a', {
    className: 'neuron-card__link',
    attrs: { href: buildNeuronDetailUrl(neuron.name) },
    text: 'View details →',
  })];
  if (onRemove) {
    const removeButton = createElement('button', {
      className: 'neuron-card__remove',
      attrs: { type: 'button' },
      text: 'Remove',
    });
    removeButton.addEventListener('click', () => onRemove(neuron.name));
    footerChildren.unshift(removeButton);
  }

  return createElement('article', {
    className: `neuron-card${selected ? ' neuron-card--selected' : ''}`,
    children: [
      createElement('div', { className: 'neuron-card__header', children: headerChildren }),
      createElement('div', {
        className: 'neuron-card__thumb',
        children: [
          thumbImage,
          note ? createElement('span', { className: 'neuron-card__note', text: note }) : null,
        ],
      }),
      createElement('h3', { className: 'neuron-card__title', text: neuron.cellType || 'Unclassified neuron' }),
      createElement('p', { className: 'neuron-card__meta', text: metaText }),
      createElement('div', { className: 'neuron-card__footer', children: footerChildren }),
    ],
  });
}
