import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { createElement } from './dom.js';
import { buildNeuronDetailUrl } from './routes.js';
import { getRecentlyViewed } from './recentlyViewed.js';
import { initCombobox } from './combobox.js';

async function loadHeroSubtitle() {
  const stats = await api.getStats();
  document.getElementById('hero-subtitle').textContent =
    `Search ${stats.totalNeurons.toLocaleString()} digitally reconstructed neurons`;
}

function appendSelectOptions(selectElement, values) {
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  }
}

async function loadFilterSelect(field, comboboxes) {
  const filterSelect = document.querySelector(`select[data-filter="${field}"]`);

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

function renderRecentlyViewed() {
  const recentNeurons = getRecentlyViewed();
  if (recentNeurons.length === 0) return;

  const listElement = document.getElementById('recently-viewed-list');
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
  document.getElementById('recently-viewed-section').hidden = false;
}

async function handleRandomNeuronClick() {
  const randomButton = document.getElementById('random-neuron-button');
  randomButton.disabled = true;
  randomButton.textContent = 'Picking a neuron…';
  try {
    const { name } = await api.getRandomNeuron();
    window.location.href = buildNeuronDetailUrl(name);
  } catch (error) {
    randomButton.disabled = false;
    randomButton.textContent = 'Or try a random neuron →';
    showError(`Could not pick a random neuron: ${error.message}`);
  }
}

function showError(message) {
  const errorBanner = document.getElementById('error-banner');
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function initFilterComboboxes() {
  const comboboxes = new Map();
  document.querySelectorAll('.tm-combobox').forEach((root) => {
    comboboxes.set(root.dataset.combobox, initCombobox(root));
  });
  return comboboxes;
}

async function init() {
  initCollectionBadge();
  renderRecentlyViewed();
  document.getElementById('random-neuron-button').addEventListener('click', handleRandomNeuronClick);
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
    showError(`Could not load data from NeuroMorpho.Org: ${error.message}`);
  }
}

init();
