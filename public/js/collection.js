// @ts-check
import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { createNeuronCard } from './neuronCard.js';
import { showError } from './dom.js';
import { ensureScope, getSelection, toggleSelection, clearSelection } from './compareSelection.js';
import { buildCompareUrl } from './routes.js';
import { summarizeCollection } from './logic/collectionSummary.js';
import { buildCollectionCsv } from './logic/collectionExport.js';
/** @typedef {import('./models/Neuron.js').Neuron} Neuron */

/** @type {Array<{neuron: Neuron, cached: boolean}>} */
let collectionEntries = [];

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

/** @returns {void} */
function renderCollectionGrid() {
  const collectionGrid = /** @type {HTMLElement} */ (document.getElementById('collection-grid'));
  const emptyMessage = /** @type {HTMLElement} */ (document.getElementById('empty-message'));
  const selectedNames = new Set(getSelection());

  collectionGrid.replaceChildren();
  emptyMessage.hidden = collectionEntries.length > 0;

  for (const entry of collectionEntries) {
    collectionGrid.appendChild(
      createNeuronCard(entry.neuron, {
        selected: selectedNames.has(/** @type {string} */ (entry.neuron.name)),
        onToggleSelect: handleCardSelectToggle,
        onRemove: handleRemoveCardClick,
      }),
    );
  }

  /** @type {HTMLElement} */ (document.getElementById('collection-summary')).textContent =
    summarizeCollection(collectionEntries).summaryText;
}

/** @param {string} neuronName @returns {void} */
function handleCardSelectToggle(neuronName) {
  toggleSelection(neuronName);
  updateSelectionTray();
}

/** @param {string} neuronName @returns {Promise<void>} */
async function handleRemoveCardClick(neuronName) {
  await api.removeFromCollection(neuronName);
  collectionEntries = collectionEntries.filter((entry) => entry.neuron.name !== neuronName);
  renderCollectionGrid();
  initCollectionBadge();
}

/** @returns {Promise<void>} */
async function handleRemoveSelectedClick() {
  const removeSelectedButton = /** @type {HTMLButtonElement} */ (document.getElementById('remove-selected'));
  const selectedNames = getSelection();

  removeSelectedButton.disabled = true;
  await Promise.all(selectedNames.map((name) => api.removeFromCollection(name)));
  removeSelectedButton.disabled = false;

  collectionEntries = collectionEntries.filter(
    (entry) => !selectedNames.includes(/** @type {string} */ (entry.neuron.name)),
  );
  clearSelection();
  renderCollectionGrid();
  updateSelectionTray();
  initCollectionBadge();
}

/** @returns {void} */
function bindSelectionTrayEvents() {
  document.getElementById('remove-selected')?.addEventListener('click', handleRemoveSelectedClick);
}

/** @returns {void} */
function handleExportCsvClick() {
  const csvText = buildCollectionCsv(collectionEntries);
  const blobUrl = URL.createObjectURL(new Blob([csvText], { type: 'text/csv' }));

  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = 'neurolook-collection.csv';
  downloadLink.click();

  URL.revokeObjectURL(blobUrl);
}

/** @returns {Promise<void>} */
async function init() {
  ensureScope('collection');
  initCollectionBadge();
  bindSelectionTrayEvents();
  updateSelectionTray();
  document.getElementById('export-csv')?.addEventListener('click', handleExportCsvClick);

  try {
    collectionEntries = await api.getCollection();
    renderCollectionGrid();
  } catch (error) {
    showError(`Could not load your collection: ${/** @type {Error} */ (error).message}`);
  } finally {
    /** @type {HTMLElement} */ (document.getElementById('loading-state')).hidden = true;
  }
}

init();

// Some browsers can bring back a page exactly as it looked when you left it
// (for example, clicking Back from Browse) instead of reloading it from
// scratch. That means the comparison selection shown on screen (the bar
// showing how many neurons are selected, and which cards are checked) can
// be left over from before you navigated away. Re-rendering against the
// collection already loaded in memory brings the screen back in sync with
// whatever is actually saved right now.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  renderCollectionGrid();
  updateSelectionTray();
});
