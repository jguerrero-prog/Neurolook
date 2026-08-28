import { escapeHtml } from './dom.js';
import { buildNeuronDetailUrl } from './routes.js';

// Renders one neuron summary card from a Neuron model instance. Used by both
// the browse grid and the collection grid, so selection (compare checkbox),
// the cached-offline badge, and the remove action are all optional depending
// on which page is calling it.
export function createNeuronCard(neuron, { selected = false, onToggleSelect, cached, onRemove, note } = {}) {
  const card = document.createElement('article');
  card.className = `neuron-card${selected ? ' neuron-card--selected' : ''}`;

  card.innerHTML = `
    <div class="neuron-card__header">
      <span class="neuron-card__id">${escapeHtml(neuron.name)}</span>
      <input type="checkbox" class="neuron-card__select" aria-label="Queue ${escapeHtml(neuron.name)} for comparison" ${selected ? 'checked' : ''}>
    </div>
    <div class="neuron-card__thumb">
      <img src="${escapeHtml(neuron.pngUrl)}" alt="Rendered morphology of ${escapeHtml(neuron.name)}" loading="lazy">
      ${note ? `<span class="neuron-card__note">${escapeHtml(note)}</span>` : ''}
    </div>
    <h3 class="neuron-card__title">${escapeHtml(neuron.cellType || 'Unclassified neuron')}</h3>
    <p class="neuron-card__meta">${escapeHtml(neuron.species)}${neuron.brainRegion ? ` &middot; ${escapeHtml(neuron.brainRegion)}` : ''}</p>
    <div class="neuron-card__footer">
      ${cached === undefined ? '' : `<span class="neuron-card__cache-status">${cached ? 'Cached offline' : 'Metadata only'}</span>`}
      <a class="neuron-card__link" href="${buildNeuronDetailUrl(neuron.name)}">View details &rarr;</a>
    </div>
  `;

  const thumbImage = card.querySelector('.neuron-card__thumb img');
  thumbImage.addEventListener('error', () => {
    thumbImage.replaceWith(Object.assign(document.createElement('span'), {
      className: 'neuron-card__thumb-fallback',
      textContent: 'No preview image',
    }));
  });

  if (onToggleSelect) {
    card.querySelector('.neuron-card__select').addEventListener('change', () => onToggleSelect(neuron.name));
  } else {
    card.querySelector('.neuron-card__select').remove();
  }

  if (onRemove) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'neuron-card__remove';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => onRemove(neuron.name));
    card.querySelector('.neuron-card__footer').prepend(removeButton);
  }

  return card;
}
