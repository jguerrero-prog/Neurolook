import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { createNeuronCard } from './neuronCard.js';
import { getSelection, toggleSelection, clearSelection } from './compareSelection.js';
import { buildCompareUrl } from './routes.js';
import { buildPageWindow, buildResultRangeLabel } from './logic/pagination.js';
import { initCombobox } from './combobox.js';
import { initMultiCombobox } from './multiCombobox.js';

const currentParams = new URLSearchParams(window.location.search);
const PAGE_SIZE = 12;
const FACET_FIELDS = ['species', 'brain_region', 'cell_type', 'archive'];
const RESULTS_VIEW_STORAGE_KEY = 'arbor:browseResultsView';

// A per-viewer display preference, not app state, so it lives in
// localStorage rather than the URL or server.
function getStoredResultsView() {
  try {
    return localStorage.getItem(RESULTS_VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

function applyResultsView(view) {
  document.getElementById('results-grid').classList.toggle('neuron-grid--list', view === 'list');
  document.querySelectorAll('.tm-view-toggle__button').forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('tm-view-toggle__button--active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function bindResultsViewToggle() {
  document.querySelectorAll('.tm-view-toggle__button').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      try {
        localStorage.setItem(RESULTS_VIEW_STORAGE_KEY, view);
      } catch {
        // Ignore storage failures (private browsing, quota, etc.) — the
        // view still applies for the rest of this page load.
      }
      applyResultsView(view);
    });
  });
}

function selectedValuesFor(field) {
  const rawValue = currentParams.get(field);
  return rawValue ? rawValue.split(',') : [];
}

// The search API requires a name or at least one filter; landing on Browse
// with none set (e.g. from the nav link) should invite a choice instead of
// firing a request that's guaranteed to fail.
function hasSearchCriteria() {
  return Boolean(currentParams.get('name')) || FACET_FIELDS.some((field) => currentParams.get(field));
}

function showBrowseWelcome() {
  document.getElementById('loading-state').hidden = true;
  document.getElementById('browse-welcome').hidden = false;
}

function restoreFormValues() {
  document.getElementById('browse-name-input').value = currentParams.get('name') || '';
  document.querySelector('select[name="sort"]').value = currentParams.get('sort') || '';
}

// Facets allow several values per field (e.g. rat + mouse) — the checked
// values are joined with commas before navigating, matching the
// NeuroMorpho API's own OR-within-a-field syntax. Each field is a
// MultiCombobox backed by hidden checkboxes, so the values themselves are
// still plain `input[name][checked]` elements underneath.
async function loadFacetOptions(field, multiComboboxes) {
  const facetCounts = await api.getFacetCounts(field, 30);
  const selectedValues = new Set(selectedValuesFor(field));
  multiComboboxes.get(field)?.setOptions(facetCounts, selectedValues);
}

function initFacetMultiComboboxes() {
  const controllers = new Map();
  document.querySelectorAll('.tm-multiselect').forEach((root) => {
    controllers.set(root.dataset.multiselect, initMultiCombobox(root));
  });
  return controllers;
}

function buildQueryFromForm(browseForm) {
  const params = new URLSearchParams();

  const nameValue = browseForm.querySelector('#browse-name-input').value.trim();
  if (nameValue) params.set('name', nameValue);

  const sortValue = browseForm.querySelector('select[name="sort"]').value;
  if (sortValue) params.set('sort', sortValue);

  for (const field of FACET_FIELDS) {
    const fieldCheckboxes = [...browseForm.querySelectorAll(`input[name="${field}"]`)];

    if (fieldCheckboxes.length === 0) {
      // This facet's options are still loading (loadFacetOptions is async) —
      // a fast submit can race that fetch. Preserve whatever was already
      // active instead of silently dropping the filter.
      const existingValue = currentParams.get(field);
      if (existingValue) params.set(field, existingValue);
      continue;
    }

    const checkedValues = fieldCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
    if (checkedValues.length > 0) params.set(field, checkedValues.join(','));
  }

  params.set('page', '0');
  return params;
}

function handleFilterFormChange(event) {
  if (!event.target.matches('input[type="checkbox"], select')) return;
  navigateWithCurrentFilters(event.currentTarget);
}

function handleFilterFormSubmit(event) {
  event.preventDefault();
  navigateWithCurrentFilters(event.currentTarget);
}

function navigateWithCurrentFilters(browseForm) {
  window.location.href = `/browse.html?${buildQueryFromForm(browseForm).toString()}`;
}

function bindBrowseFormEvents() {
  const browseForm = document.getElementById('browse-form');
  browseForm.addEventListener('submit', handleFilterFormSubmit);
  browseForm.addEventListener('change', handleFilterFormChange);
}

function renderPaginationNav(currentPage, totalPages) {
  const paginationNav = document.getElementById('pagination');
  paginationNav.innerHTML = '';

  const { pages, hasPrevious, hasNext } = buildPageWindow(currentPage, totalPages);
  const hrefForPage = (page) => {
    const params = new URLSearchParams(currentParams);
    params.set('page', String(page));
    return `/browse.html?${params.toString()}`;
  };

  if (hasPrevious) {
    paginationNav.appendChild(Object.assign(document.createElement('a'), { href: hrefForPage(currentPage - 1), textContent: '‹' }));
  }
  for (const page of pages) {
    const pageLink = document.createElement('a');
    pageLink.href = hrefForPage(page);
    pageLink.textContent = String(page + 1);
    if (page === currentPage) pageLink.classList.add('pagination__current');
    paginationNav.appendChild(pageLink);
  }
  if (hasNext) {
    paginationNav.appendChild(Object.assign(document.createElement('a'), { href: hrefForPage(currentPage + 1), textContent: '›' }));
  }
}

function updateSelectionTray() {
  const selectedNames = getSelection();
  const canCompare = selectedNames.length >= 2;
  const compareLink = document.getElementById('compare-link');

  document.getElementById('selection-tray').hidden = selectedNames.length === 0;
  document.getElementById('selection-count').textContent = `${selectedNames.length} selected`;
  // Comparing needs at least 2 — rather than let the click land on an error
  // page, send them back to pick another instead.
  compareLink.href = canCompare ? buildCompareUrl(selectedNames) : '/browse.html';
  compareLink.title = canCompare ? '' : 'Select at least one more neuron to compare';
}

function handleCardSelectToggle(neuronName) {
  toggleSelection(neuronName);
  updateSelectionTray();
}

function handleClearSelectionClick() {
  clearSelection();
  document.querySelectorAll('.neuron-card__select').forEach((checkbox) => { checkbox.checked = false; });
  updateSelectionTray();
}

function bindSelectionTrayEvents() {
  document.getElementById('clear-selection').addEventListener('click', handleClearSelectionClick);
}

async function runSearch() {
  const resultsGrid = document.getElementById('results-grid');
  const loadingState = document.getElementById('loading-state');
  const currentPage = Number(currentParams.get('page')) || 0;
  loadingState.hidden = false;

  const { neurons, totalElements, totalPages } = await api.search({
    name: currentParams.get('name') || '',
    species: currentParams.get('species') || '',
    brain_region: currentParams.get('brain_region') || '',
    cell_type: currentParams.get('cell_type') || '',
    archive: currentParams.get('archive') || '',
    sort: currentParams.get('sort') || '',
    page: currentPage,
    size: PAGE_SIZE,
  });

  loadingState.hidden = true;
  document.getElementById('no-results-message').hidden = totalElements > 0;
  document.getElementById('view-toggle').hidden = totalElements === 0;

  const selectedNames = new Set(getSelection());
  resultsGrid.innerHTML = '';
  for (const neuron of neurons) {
    resultsGrid.appendChild(createNeuronCard(neuron, {
      selected: selectedNames.has(neuron.name),
      onToggleSelect: handleCardSelectToggle,
    }));
  }

  document.getElementById('result-count').textContent = buildResultRangeLabel(currentPage, PAGE_SIZE, neurons.length, totalElements);
  renderPaginationNav(currentPage, totalPages);
}

function showError(message) {
  const errorBanner = document.getElementById('error-banner');
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

async function init() {
  initCollectionBadge();
  restoreFormValues();
  initCombobox(document.querySelector('.tm-combobox[data-combobox="sort"]'));
  const facetMultiComboboxes = initFacetMultiComboboxes();
  updateSelectionTray();
  bindBrowseFormEvents();
  bindSelectionTrayEvents();
  bindResultsViewToggle();
  applyResultsView(getStoredResultsView());

  try {
    await Promise.all(FACET_FIELDS.map((field) => loadFacetOptions(field, facetMultiComboboxes)));
    if (hasSearchCriteria()) {
      await runSearch();
    } else {
      showBrowseWelcome();
    }
  } catch (error) {
    document.getElementById('loading-state').hidden = true;
    showError(`Could not load results from NeuroMorpho.Org: ${error.message}`);
  }
}

init();

// A bfcache restore (e.g. clicking back from a neuron's detail page, or from
// Collection) reuses the frozen page as-is rather than reloading it — so it
// can show a stale compare selection (tray visibility/count, checked cards)
// left over from before you navigated away. Re-running both brings them back
// in sync with whatever is actually in sessionStorage right now. Safe to
// call again: neither does anything beyond replacing existing DOM content.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  if (hasSearchCriteria()) runSearch();
  updateSelectionTray();
});
