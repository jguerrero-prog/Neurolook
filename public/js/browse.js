// @ts-check
import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { createNeuronCard } from './neuronCard.js';
import { showError, bindRandomNeuronButton } from './dom.js';
import { ensureScope, getSelection, toggleSelection, clearSelection } from './compareSelection.js';
import { buildCompareUrl, buildNeuronDetailUrl } from './routes.js';
import { buildPageWindow, buildResultRangeLabel } from './logic/pagination.js';
import { matchKnownFilterValue } from './logic/searchTermMatch.js';
import { initCombobox } from './combobox.js';
import { initMultiCombobox } from './multiCombobox.js';

let currentParams = new URLSearchParams(window.location.search);
/** @type {Map<string, ReturnType<typeof initMultiCombobox>>} */
let facetMultiComboboxes = new Map();
const PAGE_SIZE = 12;
const FACET_FIELDS = ['species', 'brain_region', 'cell_type', 'archive'];
/** @type {Object<string, string>} */
const FACET_FIELD_LABELS = {
  species: 'Species',
  brain_region: 'Brain Region',
  cell_type: 'Cell Type',
  archive: 'Archive / Lab',
};
const RESULTS_VIEW_STORAGE_KEY = 'neurolook:browseResultsView';
// Landing on Browse with no name/filters used to show a "Start browsing"
// prompt; defaulting to this instead means there's always something to look
// at, and mouse is comfortably the most-reconstructed species in the library.
const DEFAULT_SPECIES = 'mouse';

// A per-viewer display preference, not app state, so it lives in
// localStorage rather than the URL or server.
/** @returns {'list'|'grid'} */
function getStoredResultsView() {
  try {
    return localStorage.getItem(RESULTS_VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

/** @param {'list'|'grid'} view @returns {void} */
function applyResultsView(view) {
  /** @type {HTMLElement} */ (document.getElementById('results-grid')).classList.toggle(
    'neuron-grid--list',
    view === 'list',
  );
  document.querySelectorAll('.tm-view-toggle__button').forEach((button) => {
    const element = /** @type {HTMLElement} */ (button);
    const isActive = element.dataset.view === view;
    element.classList.toggle('tm-view-toggle__button--active', isActive);
    element.setAttribute('aria-pressed', String(isActive));
  });
}

/** @returns {void} */
function bindResultsViewToggle() {
  document.querySelectorAll('.tm-view-toggle__button').forEach((button) => {
    button.addEventListener('click', () => {
      const view = /** @type {'list'|'grid'} */ (/** @type {HTMLElement} */ (button).dataset.view);
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

/** @param {string} field @returns {string[]} */
function selectedValuesFor(field) {
  const rawValue = currentParams.get(field);
  return rawValue ? rawValue.split(',') : [];
}

// The search API requires a name or at least one filter — used by
// applyDefaultFiltersOnFirstLoad() to detect when nothing's set yet (e.g.
// landing from the nav link) so a default can be applied before searching,
// and by refreshResults() to detect when a later change clears everything.
/** @returns {boolean} */
function hasSearchCriteria() {
  return Boolean(currentParams.get('name')) || FACET_FIELDS.some((field) => currentParams.get(field));
}

// Landing with no criteria at all (a fresh visit) defaults to mouse instead
// of leaving the results area empty — updates the URL (via replaceState,
// not a new history entry, since this is a normalization step rather than a
// distinct visited state) and checks the species facet's checkbox to
// match. Only called once, from init() — later on, deliberately clearing
// every filter (unchecking the last one, "Clear all") is respected rather
// than silently re-applied, otherwise the default could never be turned off.
/** @returns {void} */
function applyDefaultFiltersOnFirstLoad() {
  if (hasSearchCriteria()) return;
  const params = new URLSearchParams();
  params.set('species', DEFAULT_SPECIES);
  params.set('page', '0');
  currentParams = params;
  history.replaceState(null, '', `/browse.html?${params.toString()}`);
  facetMultiComboboxes.get('species')?.selectOnly(DEFAULT_SPECIES);
}

/** @returns {void} */
function showNoFilterMessage() {
  /** @type {HTMLElement} */ (document.getElementById('loading-state')).hidden = true;
  /** @type {HTMLElement} */ (document.getElementById('no-results-message')).hidden = true;
  /** @type {HTMLElement} */ (document.getElementById('search-term-matched-message')).hidden = true;
  /** @type {HTMLElement} */ (document.getElementById('view-toggle')).hidden = true;
  /** @type {HTMLElement} */ (document.getElementById('results-grid')).replaceChildren();
  /** @type {HTMLElement} */ (document.getElementById('pagination')).replaceChildren();
  /** @type {HTMLElement} */ (document.getElementById('result-count')).textContent = '';
  /** @type {HTMLElement} */ (document.getElementById('no-filter-message')).hidden = false;
}

// Re-runs the same search init() does on first load — reused after a soft
// navigation (filter change, pagination, a new name search, "Clear all") so
// none of those need a full page reload.
/** @returns {Promise<void>} */
async function refreshResults() {
  restoreFormValues();
  if (!hasSearchCriteria()) {
    showNoFilterMessage();
    return;
  }
  /** @type {HTMLElement} */ (document.getElementById('no-filter-message')).hidden = true;
  try {
    await runSearch();
  } catch (error) {
    /** @type {HTMLElement} */ (document.getElementById('loading-state')).hidden = true;
    showError(`Could not load results from NeuroMorpho.Org: ${/** @type {Error} */ (error).message}`);
  }
}

// Updates the address bar (so the URL stays bookmarkable/shareable) without
// a page reload, then re-renders in place.
/** @param {URLSearchParams} params @returns {void} */
function navigateToParams(params) {
  currentParams = params;
  history.pushState(null, '', `/browse.html?${params.toString()}`);
  refreshResults();
}

/** @returns {void} */
function restoreFormValues() {
  /** @type {HTMLInputElement} */ (document.getElementById('browse-name-input')).value =
    currentParams.get('name') || '';
  /** @type {HTMLSelectElement} */ (document.querySelector('select[name="sort"]')).value =
    currentParams.get('sort') || '';
}

// Facets allow several values per field (e.g. rat + mouse) — the checked
// values are joined with commas before navigating, matching the
// NeuroMorpho API's own OR-within-a-field syntax. Each field is a
// MultiCombobox backed by hidden checkboxes, so the values themselves are
// still plain `input[name][checked]` elements underneath.
/**
 * @param {string} field
 * @param {Map<string, ReturnType<typeof initMultiCombobox>>} multiComboboxes
 * @returns {Promise<void>}
 */
async function loadFacetOptions(field, multiComboboxes) {
  const facetCounts = await api.getFacetCounts(field, 30);
  const selectedValues = new Set(selectedValuesFor(field));
  multiComboboxes.get(field)?.setOptions(facetCounts, selectedValues);
}

/** @returns {Map<string, ReturnType<typeof initMultiCombobox>>} */
function initFacetMultiComboboxes() {
  /** @type {Map<string, ReturnType<typeof initMultiCombobox>>} */
  const controllers = new Map();
  document.querySelectorAll('.tm-multiselect').forEach((root) => {
    const element = /** @type {HTMLElement} */ (root);
    controllers.set(element.dataset.multiselect ?? '', initMultiCombobox(element));
  });
  return controllers;
}

/** @param {HTMLFormElement} browseForm @returns {URLSearchParams} */
function buildQueryFromForm(browseForm) {
  const params = new URLSearchParams();

  const nameValue = /** @type {HTMLInputElement} */ (browseForm.querySelector('#browse-name-input')).value.trim();
  if (nameValue) params.set('name', nameValue);

  const sortValue = /** @type {HTMLSelectElement} */ (browseForm.querySelector('select[name="sort"]')).value;
  if (sortValue) params.set('sort', sortValue);

  for (const field of FACET_FIELDS) {
    const fieldCheckboxes = /** @type {HTMLInputElement[]} */ ([
      ...browseForm.querySelectorAll(`input[name="${field}"]`),
    ]);

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

/** @param {Event} event @returns {void} */
function handleFilterFormChange(event) {
  if (!(/** @type {HTMLElement} */ (event.target).matches('input[type="checkbox"], select'))) return;
  navigateWithCurrentFilters(/** @type {HTMLFormElement} */ (event.currentTarget));
}

/** @param {Event} event @returns {void} */
function handleFilterFormSubmit(event) {
  event.preventDefault();
  navigateWithCurrentFilters(/** @type {HTMLFormElement} */ (event.currentTarget));
}

/** @param {HTMLFormElement} browseForm @returns {void} */
function navigateWithCurrentFilters(browseForm) {
  navigateToParams(buildQueryFromForm(browseForm));
}

/** @returns {void} */
function bindBrowseFormEvents() {
  const browseForm = /** @type {HTMLFormElement} */ (document.getElementById('browse-form'));
  browseForm.addEventListener('submit', handleFilterFormSubmit);
  browseForm.addEventListener('change', handleFilterFormChange);
}

// Lets a plain left-click soft-navigate instead of reloading, while leaving
// modified clicks (open in new tab, etc.) to follow the real href normally.
/**
 * @param {MouseEvent} event
 * @param {(params: URLSearchParams) => void} handler
 * @returns {void}
 */
function interceptInternalLinkClick(event, handler) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = /** @type {HTMLAnchorElement|null} */ (/** @type {HTMLElement} */ (event.target).closest('a[href]'));
  if (!link) return;
  event.preventDefault();
  handler(new URLSearchParams(new URL(link.href).search));
}

/** @returns {void} */
function bindPaginationEvents() {
  document.getElementById('pagination')?.addEventListener('click', (event) => {
    interceptInternalLinkClick(/** @type {MouseEvent} */ (event), navigateToParams);
  });
}

/** @returns {void} */
function bindClearAllFiltersEvent() {
  document.getElementById('clear-all-filters')?.addEventListener('click', (event) => {
    interceptInternalLinkClick(/** @type {MouseEvent} */ (event), (params) => {
      // navigateToParams alone only resets the URL/results — each facet's
      // checkboxes/pills are separate DOM state the MultiComboboxes own,
      // so they need to be told to clear too.
      facetMultiComboboxes.forEach((multiCombobox) => multiCombobox.clearSelection());
      navigateToParams(params);
    });
  });
}

/**
 * @param {HTMLElement} paginationNav
 * @param {number} page
 * @param {(page: number) => string} hrefForPage
 * @param {string} ariaLabel
 * @returns {void}
 */
function appendPageLink(paginationNav, page, hrefForPage, ariaLabel) {
  const link = document.createElement('a');
  link.href = hrefForPage(page);
  link.textContent = String(page + 1);
  link.setAttribute('aria-label', ariaLabel);
  paginationNav.appendChild(link);
}

/** @param {HTMLElement} paginationNav @returns {void} */
function appendEllipsis(paginationNav) {
  paginationNav.appendChild(
    Object.assign(document.createElement('span'), {
      className: 'pagination__ellipsis',
      textContent: '…',
    }),
  );
}

/** @param {number} currentPage @param {number} totalPages @returns {void} */
function renderPaginationNav(currentPage, totalPages) {
  const paginationNav = /** @type {HTMLElement} */ (document.getElementById('pagination'));
  paginationNav.replaceChildren();

  const { pages, hasPrevious, hasNext, showFirstPageLink, showLastPageLink } = buildPageWindow(currentPage, totalPages);
  /** @param {number} page @returns {string} */
  const hrefForPage = (page) => {
    const params = new URLSearchParams(currentParams);
    params.set('page', String(page));
    return `/browse.html?${params.toString()}`;
  };

  if (hasPrevious) {
    paginationNav.appendChild(
      Object.assign(document.createElement('a'), { href: hrefForPage(currentPage - 1), textContent: '‹' }),
    );
  }
  if (showFirstPageLink) {
    appendPageLink(paginationNav, 0, hrefForPage, 'Go to first page, page 1');
    appendEllipsis(paginationNav);
  }
  for (const page of pages) {
    const pageLink = document.createElement('a');
    pageLink.href = hrefForPage(page);
    pageLink.textContent = String(page + 1);
    if (page === currentPage) pageLink.classList.add('pagination__current');
    paginationNav.appendChild(pageLink);
  }
  if (showLastPageLink) {
    appendEllipsis(paginationNav);
    appendPageLink(paginationNav, totalPages - 1, hrefForPage, `Go to last page, page ${totalPages}`);
  }
  if (hasNext) {
    paginationNav.appendChild(
      Object.assign(document.createElement('a'), { href: hrefForPage(currentPage + 1), textContent: '›' }),
    );
  }
}

// Comparing needs at least 2, so the bar showing the selection count (and
// its "Compare selected" link) only ever appears once there are — nothing
// to guard against a 1-selected state reaching Compare's error page.
/** @returns {void} */
function updateSelectionTray() {
  const selectedNames = getSelection();

  /** @type {HTMLElement} */ (document.getElementById('selection-tray')).hidden = selectedNames.length < 2;
  /** @type {HTMLElement} */ (document.getElementById('selection-count')).textContent =
    `${selectedNames.length} Neurons Selected`;
  /** @type {HTMLAnchorElement} */ (document.getElementById('compare-link')).href = buildCompareUrl(selectedNames);
}

/** @param {string} neuronName @returns {void} */
function handleCardSelectToggle(neuronName) {
  toggleSelection(neuronName);
  updateSelectionTray();
}

/** @returns {void} */
function handleClearSelectionClick() {
  clearSelection();
  document.querySelectorAll('.neuron-card__select').forEach((checkbox) => {
    /** @type {HTMLInputElement} */ (checkbox).checked = false;
  });
  updateSelectionTray();
}

/** @returns {void} */
function bindSelectionTrayEvents() {
  document.getElementById('clear-selection')?.addEventListener('click', handleClearSelectionClick);
}

// Only checked against the other filterable fields, never guessed from
// scratch — species/brain region/archive use the full known list of values,
// cell type checks the 100 most common (there's no complete list endpoint
// for it, since it can run into the thousands).
/**
 * @param {string} name
 * @returns {Promise<import('./logic/searchTermMatch.js').FilterMatch|null>}
 */
async function findRescueMatch(name) {
  const [species, brainRegion, archive, cellTypeCounts] = await Promise.all([
    api.getFilterValues('species'),
    api.getFilterValues('brain_region'),
    api.getFilterValues('archive'),
    api.getFacetCounts('cell_type', 100),
  ]);
  return matchKnownFilterValue(name, {
    species: species.values,
    brain_region: brainRegion.values,
    archive: archive.values,
    cell_type: cellTypeCounts.map((entry) => entry.value),
  });
}

// A name search that truly found nothing (no other filter was already
// narrowing it down) gets one more chance against the other fields before
// giving up. matchedFrom/matchedField are only ever used to explain what
// happened in renderSearchTermMatchBanner — never sent to the API itself.
/** @param {string} name @returns {Promise<boolean>} */
async function tryRescueZeroResultSearch(name) {
  const match = await findRescueMatch(name).catch(() => null);
  if (!match) return false;

  const params = new URLSearchParams(currentParams);
  params.delete('name');
  params.set(match.field, match.value);
  params.set('matchedFrom', name);
  params.set('matchedField', match.field);
  params.set('page', '0');
  currentParams = params;
  history.replaceState(null, '', `/browse.html?${params.toString()}`);
  facetMultiComboboxes.get(match.field)?.selectOnly(match.value);
  return true;
}

/** @returns {void} */
function renderSearchTermMatchBanner() {
  const banner = /** @type {HTMLElement} */ (document.getElementById('search-term-matched-message'));
  const matchedFrom = currentParams.get('matchedFrom');
  const matchedField = currentParams.get('matchedField');
  if (!matchedFrom || !matchedField) {
    banner.hidden = true;
    return;
  }

  const fieldValue = selectedValuesFor(matchedField)[0] || '';
  const fieldLabel = FACET_FIELD_LABELS[matchedField] || matchedField;
  banner.textContent = `No neurons are named "${matchedFrom}". Showing results for ${fieldLabel}: ${fieldValue} instead.`;
  banner.hidden = false;
}

/** @returns {Promise<void>} */
async function runSearch() {
  const resultsGrid = /** @type {HTMLElement} */ (document.getElementById('results-grid'));
  const loadingState = /** @type {HTMLElement} */ (document.getElementById('loading-state'));
  const currentPage = Number(currentParams.get('page')) || 0;
  // Re-searching (a filter change, pagination, etc.) already has a grid full
  // of cards on screen — showing the tall loading-state block would shove
  // them down instead. Only the very first search needs that; a re-search
  // just dims the existing cards in place until the new ones are ready.
  const hasExistingResults = resultsGrid.children.length > 0;
  if (hasExistingResults) {
    resultsGrid.classList.add('neuron-grid--loading');
  } else {
    loadingState.hidden = false;
  }

  const nameValue = currentParams.get('name') || '';
  const { neurons, totalElements, totalPages } = await api.search({
    name: nameValue,
    species: currentParams.get('species') || '',
    brain_region: currentParams.get('brain_region') || '',
    cell_type: currentParams.get('cell_type') || '',
    archive: currentParams.get('archive') || '',
    sort: currentParams.get('sort') || '',
    page: currentPage,
    size: PAGE_SIZE,
  });

  const isNameOnlySearch = Boolean(nameValue) && !FACET_FIELDS.some((field) => currentParams.get(field));
  if (totalElements === 0 && isNameOnlySearch && (await tryRescueZeroResultSearch(nameValue))) {
    return runSearch();
  }

  loadingState.hidden = true;
  resultsGrid.classList.remove('neuron-grid--loading');
  /** @type {HTMLElement} */ (document.getElementById('no-results-message')).hidden = totalElements > 0;
  /** @type {HTMLElement} */ (document.getElementById('view-toggle')).hidden = totalElements === 0;
  renderSearchTermMatchBanner();

  const selectedNames = new Set(getSelection());
  resultsGrid.replaceChildren();
  for (const neuron of neurons) {
    resultsGrid.appendChild(
      createNeuronCard(neuron, {
        selected: selectedNames.has(/** @type {string} */ (neuron.name)),
        onToggleSelect: handleCardSelectToggle,
      }),
    );
  }

  /** @type {HTMLElement} */ (document.getElementById('result-count')).textContent = buildResultRangeLabel(
    currentPage,
    PAGE_SIZE,
    neurons.length,
    totalElements,
  );
  renderPaginationNav(currentPage, totalPages);
}

/** @returns {Promise<void>} */
async function init() {
  ensureScope('browse');
  initCollectionBadge();
  restoreFormValues();
  initCombobox(/** @type {HTMLElement} */ (document.querySelector('.tm-combobox[data-combobox="sort"]')));
  facetMultiComboboxes = initFacetMultiComboboxes();
  updateSelectionTray();
  bindBrowseFormEvents();
  bindPaginationEvents();
  bindClearAllFiltersEvent();
  bindSelectionTrayEvents();
  bindResultsViewToggle();
  bindRandomNeuronButton(
    /** @type {HTMLButtonElement} */ (document.getElementById('random-neuron-button')),
    async () => {
      const { name } = await api.getRandomNeuron();
      window.location.href = buildNeuronDetailUrl(name);
    },
  );
  applyResultsView(getStoredResultsView());

  try {
    await Promise.all(FACET_FIELDS.map((field) => loadFacetOptions(field, facetMultiComboboxes)));
  } catch (error) {
    /** @type {HTMLElement} */ (document.getElementById('loading-state')).hidden = true;
    showError(`Could not load filters from NeuroMorpho.Org: ${/** @type {Error} */ (error).message}`);
    return;
  }
  applyDefaultFiltersOnFirstLoad();
  await refreshResults();
}

init();

// Some browsers can bring back a page exactly as it looked when you left it
// (for example, clicking Back from a neuron's detail page, or from
// Collection) instead of reloading it from scratch. That means the
// comparison selection shown on screen (the bar showing how many neurons
// are selected, and which cards are checked) can be left over from before
// you navigated away. Re-running both
// functions below brings the screen back in sync with whatever is actually
// saved right now. Safe to call again: neither one does anything beyond
// replacing what's already on screen.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  runSearch();
  updateSelectionTray();
});

// Filter/pagination changes soft-navigate via pushState (see
// navigateToParams), which means the browser's actual Back/Forward buttons
// fire popstate instead of a normal reload. Re-syncing every control
// (facet checkboxes/pills, sort, name field) without re-fetching is more
// than this is worth — a real reload here is simple and correct.
window.addEventListener('popstate', () => {
  window.location.reload();
});
