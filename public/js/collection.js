import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { createNeuronCard } from './neuronCard.js';
import { getSelection, toggleSelection, clearSelection } from './compareSelection.js';
import { buildCompareUrl } from './routes.js';
import { summarizeCollection } from './logic/collectionSummary.js';
import { buildCollectionCsv } from './logic/collectionExport.js';

let collectionEntries = [];

function updateSelectionTray() {
  const selectedNames = getSelection();
  document.getElementById('selection-tray').hidden = selectedNames.length === 0;
  document.getElementById('selection-count').textContent = `${selectedNames.length} selected`;
  document.getElementById('compare-link').href = buildCompareUrl(selectedNames);
}

function renderCollectionGrid() {
  const collectionGrid = document.getElementById('collection-grid');
  const emptyMessage = document.getElementById('empty-message');
  const selectedNames = new Set(getSelection());

  collectionGrid.innerHTML = '';
  emptyMessage.hidden = collectionEntries.length > 0;

  for (const entry of collectionEntries) {
    collectionGrid.appendChild(createNeuronCard(entry.neuron, {
      selected: selectedNames.has(entry.neuron.name),
      onToggleSelect: handleCardSelectToggle,
      cached: entry.cached,
      onRemove: handleRemoveCardClick,
    }));
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
  downloadLink.download = 'arbor-collection.csv';
  downloadLink.click();

  URL.revokeObjectURL(blobUrl);
}

function showError(message) {
  const errorBanner = document.getElementById('error-banner');
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

async function init() {
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
