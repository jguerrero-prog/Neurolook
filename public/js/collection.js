import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { createNeuronCard } from './neuronCard.js';
import { ensureScope, getSelection, toggleSelection, clearSelection } from './compareSelection.js';
import { buildCompareUrl } from './routes.js';
import { summarizeCollection } from './logic/collectionSummary.js';
import { buildCollectionCsv } from './logic/collectionExport.js';

let collectionEntries = [];

// Comparing needs at least 2, so the bar showing the selection count (and
// its "Compare selected" link) only ever appears once there are — nothing
// to guard against a 1-selected state reaching Compare's error page.
function updateSelectionTray() {
  const selectedNames = getSelection();

  document.getElementById('selection-tray').hidden = selectedNames.length < 2;
  document.getElementById('selection-count').textContent = `${selectedNames.length} Neurons Selected`;
  document.getElementById('compare-link').href = buildCompareUrl(selectedNames);
}

function renderCollectionGrid() {
  const collectionGrid = document.getElementById('collection-grid');
  const emptyMessage = document.getElementById('empty-message');
  const selectedNames = new Set(getSelection());

  collectionGrid.replaceChildren();
  emptyMessage.hidden = collectionEntries.length > 0;

  for (const entry of collectionEntries) {
    collectionGrid.appendChild(
      createNeuronCard(entry.neuron, {
        selected: selectedNames.has(entry.neuron.name),
        onToggleSelect: handleCardSelectToggle,
        onRemove: handleRemoveCardClick,
      }),
    );
  }

  document.getElementById('collection-summary').textContent = summarizeCollection(collectionEntries).summaryText;
}

function handleCardSelectToggle(neuronName) {
  toggleSelection(neuronName);
  updateSelectionTray();
}

async function handleRemoveCardClick(neuronName) {
  await api.removeFromCollection(neuronName);
  collectionEntries = collectionEntries.filter((entry) => entry.neuron.name !== neuronName);
  renderCollectionGrid();
  initCollectionBadge();
}

async function handleRemoveSelectedClick() {
  const removeSelectedButton = document.getElementById('remove-selected');
  const selectedNames = getSelection();

  removeSelectedButton.disabled = true;
  await Promise.all(selectedNames.map((name) => api.removeFromCollection(name)));
  removeSelectedButton.disabled = false;

  collectionEntries = collectionEntries.filter((entry) => !selectedNames.includes(entry.neuron.name));
  clearSelection();
  renderCollectionGrid();
  updateSelectionTray();
  initCollectionBadge();
}

function bindSelectionTrayEvents() {
  document.getElementById('remove-selected').addEventListener('click', handleRemoveSelectedClick);
}

function handleExportCsvClick() {
  const csvText = buildCollectionCsv(collectionEntries);
  const blobUrl = URL.createObjectURL(new Blob([csvText], { type: 'text/csv' }));

  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = 'neurolook-collection.csv';
  downloadLink.click();

  URL.revokeObjectURL(blobUrl);
}

function showError(message) {
  const errorBanner = document.getElementById('error-banner');
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

async function init() {
  ensureScope('collection');
  initCollectionBadge();
  bindSelectionTrayEvents();
  updateSelectionTray();
  document.getElementById('export-csv').addEventListener('click', handleExportCsvClick);

  try {
    collectionEntries = await api.getCollection();
    renderCollectionGrid();
  } catch (error) {
    showError(`Could not load your collection: ${error.message}`);
  } finally {
    document.getElementById('loading-state').hidden = true;
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
