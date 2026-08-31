// @ts-check
import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { createElement, showError, bindRandomNeuronButton } from './dom.js';
import { buildNeuronDetailUrl } from './routes.js';
import { getRecentlyViewed } from './recentlyViewed.js';
import { initCombobox } from './combobox.js';

/** @returns {Promise<void>} */
async function loadHeroSubtitle() {
  const stats = await api.getStats();
  /** @type {HTMLElement} */ (document.getElementById('hero-subtitle')).textContent =
    `Search ${stats.totalNeurons.toLocaleString()} digitally reconstructed neurons`;
}

/**
 * @param {HTMLSelectElement} selectElement
 * @param {string[]} values
 * @returns {void}
 */
function appendSelectOptions(selectElement, values) {
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  }
}

/**
 * @param {string} field
 * @param {Map<string, ReturnType<typeof initCombobox>>} comboboxes
 * @returns {Promise<void>}
 */
async function loadFilterSelect(field, comboboxes) {
  const filterSelect = /** @type {HTMLSelectElement} */ (document.querySelector(`select[data-filter="${field}"]`));

  if (field === 'cell_type') {
    const categories = await api.getCategories(40);
    appendSelectOptions(
      filterSelect,
      categories.map((category) => category.value),
    );
  } else {
    const { values } = await api.getFilterValues(field);
    appendSelectOptions(filterSelect, values);
  }

  comboboxes.get(field)?.rebuildOptions();
}

/** @returns {void} */
function renderRecentlyViewed() {
  const recentNeurons = getRecentlyViewed();
  if (recentNeurons.length === 0) return;

  const listElement = /** @type {HTMLElement} */ (document.getElementById('recently-viewed-list'));
  listElement.replaceChildren(
    ...recentNeurons.map((entry) =>
      createElement('a', {
        className: 'tm-recently-viewed-card',
        attrs: { href: buildNeuronDetailUrl(entry.name) },
        children: [
          createElement('div', {
            className: 'tm-recently-viewed-card__thumb',
            children: [createElement('img', { attrs: { src: entry.pngUrl, alt: '', loading: 'lazy' } })],
          }),
          createElement('div', {
            className: 'tm-recently-viewed-card__body',
            children: [
              createElement('div', { className: 'tm-recently-viewed-card__title', text: entry.cellType || entry.name }),
              createElement('div', { className: 'tm-recently-viewed-card__meta', text: entry.species }),
            ],
          }),
        ],
      }),
    ),
  );
  /** @type {HTMLElement} */ (document.getElementById('recently-viewed-section')).hidden = false;
}

/** @returns {Map<string, ReturnType<typeof initCombobox>>} */
function initFilterComboboxes() {
  /** @type {Map<string, ReturnType<typeof initCombobox>>} */
  const comboboxes = new Map();
  document.querySelectorAll('.tm-combobox').forEach((root) => {
    const element = /** @type {HTMLElement} */ (root);
    comboboxes.set(element.dataset.combobox ?? '', initCombobox(element));
  });
  return comboboxes;
}

/** @returns {Promise<void>} */
async function init() {
  initCollectionBadge();
  renderRecentlyViewed();
  bindRandomNeuronButton(
    /** @type {HTMLButtonElement} */ (document.getElementById('random-neuron-button')),
    async () => {
      const { name } = await api.getRandomNeuron();
      window.location.href = buildNeuronDetailUrl(name);
    },
  );
  const comboboxes = initFilterComboboxes();

  try {
    await Promise.all([
      loadHeroSubtitle(),
      loadFilterSelect('species', comboboxes),
      loadFilterSelect('brain_region', comboboxes),
      loadFilterSelect('cell_type', comboboxes),
      loadFilterSelect('archive', comboboxes),
    ]);
  } catch (error) {
    showError(`Could not load data from NeuroMorpho.Org: ${/** @type {Error} */ (error).message}`);
  }
}

init();
