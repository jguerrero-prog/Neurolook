import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { escapeHtml } from './dom.js';
import { buildCompareUrl } from './routes.js';
import {
  ORGANISM_FIELDS,
  ANATOMICAL_FIELDS,
  EXPERIMENTAL_FIELDS,
  buildFieldComparisonRows,
  buildMorphometryComparisonRows,
} from './logic/neuronFields.js';
import { NeuronViewer } from './viewer.js';

const requestedNeuronNames = (new URLSearchParams(window.location.search).get('names') || '')
  .split(',')
  .filter(Boolean);

function cssSafeId(neuronName) {
  return neuronName.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function renderViewerColumns(comparisonEntries) {
  const viewersGrid = document.getElementById('compare-viewers');
  viewersGrid.innerHTML = '';

  for (const { neuron } of comparisonEntries) {
    const otherNames = comparisonEntries.map((entry) => entry.neuron.name).filter((name) => name !== neuron.name);

    const column = document.createElement('div');
    column.className = 'compare-column';
    column.innerHTML = `
      <div class="compare-column__header">
        <div>
          <div class="compare-column__id">${escapeHtml(neuron.name)}</div>
          <div class="compare-column__title">${escapeHtml(neuron.cellType || 'Neuron')}</div>
          <div class="compare-column__meta">${escapeHtml(neuron.species)} &middot; ${escapeHtml(neuron.brainRegion)}</div>
        </div>
        <a href="${buildCompareUrl(otherNames)}" aria-label="Remove ${escapeHtml(neuron.name)} from comparison">&times;</a>
      </div>
      <div class="compare-column__viewer" id="viewer-${cssSafeId(neuron.name)}"></div>
      <a class="compare-column__download" href="${api.getSwcUrl(neuron.name)}" download="${neuron.swcFilename}">Download SWC</a>
    `;
    viewersGrid.appendChild(column);
  }
}

async function loadViewers(comparisonEntries) {
  for (const { neuron } of comparisonEntries) {
    const viewerContainer = document.getElementById(`viewer-${cssSafeId(neuron.name)}`);
    try {
      const swcResponse = await fetch(api.getSwcUrl(neuron.name));
      if (!swcResponse.ok) throw new Error('SWC file unavailable');
      new NeuronViewer(viewerContainer).loadSwc(await swcResponse.text());
    } catch {
      viewerContainer.textContent = 'Could not load 3D morphology.';
    }
  }
}

function renderComparisonTable(containerId, headerValues, rows) {
  const table = document.getElementById(containerId);
  table.innerHTML = '';
  table.appendChild(renderTableRow('Field', headerValues, { isHeader: true }));

  for (const row of rows) {
    table.appendChild(renderTableRow(row.label, row.values, { highlight: row.differs }));
  }
}

function renderTableRow(label, values, { isHeader = false, highlight = false } = {}) {
  const row = document.createElement('div');
  row.className = `compare-table__row${isHeader ? ' compare-table__row--header' : ''}`;
  row.style.gridTemplateColumns = `200px repeat(${values.length}, 1fr)`;

  const labelCell = document.createElement('div');
  labelCell.className = 'compare-table__cell compare-table__cell--label';
  labelCell.textContent = label;
  row.appendChild(labelCell);

  for (const value of values) {
    const cell = document.createElement('div');
    cell.className = `compare-table__cell${highlight ? ' compare-table__cell--differs' : ''}`;
    cell.textContent = value;
    row.appendChild(cell);
  }

  return row;
}

function showError(message) {
  const errorBanner = document.getElementById('error-banner');
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

async function init() {
  initCollectionBadge();

  if (requestedNeuronNames.length < 2) {
    document.getElementById('loading-state').hidden = true;
    showError('Select at least two neurons to compare.');
    return;
  }

  try {
    const comparisonEntries = await api.compare(requestedNeuronNames);
    const neurons = comparisonEntries.map((entry) => entry.neuron);
    const morphometryRecords = comparisonEntries.map((entry) => entry.morphometry);
    const neuronNamesRow = neurons.map((neuron) => neuron.name);

    document.getElementById('compare-heading').textContent = `Comparing ${comparisonEntries.length} neurons`;
    renderViewerColumns(comparisonEntries);
    renderComparisonTable('organism-table', neuronNamesRow, buildFieldComparisonRows(neurons, ORGANISM_FIELDS));
    renderComparisonTable('anatomical-table', neuronNamesRow, buildFieldComparisonRows(neurons, ANATOMICAL_FIELDS));
    renderComparisonTable('experimental-table', neuronNamesRow, buildFieldComparisonRows(neurons, EXPERIMENTAL_FIELDS));
    renderComparisonTable('morphometry-table', neuronNamesRow, buildMorphometryComparisonRows(morphometryRecords));
    document.getElementById('loading-state').hidden = true;
    document.getElementById('compare-page').hidden = false;

    await loadViewers(comparisonEntries);
  } catch (error) {
    document.getElementById('loading-state').hidden = true;
    showError(`Could not load comparison: ${error.message}`);
  }
}

init();
