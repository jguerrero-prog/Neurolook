import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { escapeHtml } from './dom.js';
import { buildCompareUrl, buildNeuronDetailUrl } from './routes.js';
import {
  ORGANISM_FIELDS,
  ANATOMICAL_FIELDS,
  EXPERIMENTAL_FIELDS,
  buildFieldComparisonRows,
  buildMorphometryComparisonRows,
} from './logic/neuronFields.js';
import { buildCompareCsv } from './logic/compareExport.js';
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
        <a class="compare-column__info" href="${buildNeuronDetailUrl(neuron.name)}">
          <div class="compare-column__id">${escapeHtml(neuron.name)}</div>
          <div class="compare-column__title">${escapeHtml(neuron.cellType || 'Neuron')}</div>
          <div class="compare-column__meta">${escapeHtml(neuron.species)} &middot; ${escapeHtml(neuron.brainRegion)}</div>
        </a>
        <a href="${buildCompareUrl(otherNames)}" aria-label="Remove ${escapeHtml(neuron.name)} from comparison">&times;</a>
      </div>
      <div class="compare-column__viewer-wrap">
        <div class="compare-column__viewer" id="viewer-${cssSafeId(neuron.name)}"></div>
        <button type="button" class="compare-column__fullscreen" id="fullscreen-${cssSafeId(neuron.name)}" title="Fullscreen (click the viewer, then press F)" aria-label="Fullscreen">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 5V1h4 M11 1h4v4 M15 11v4h-4 M5 15H1v-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
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
      const viewer = new NeuronViewer(viewerContainer);
      viewer.loadSwc(await swcResponse.text());
      document.getElementById(`fullscreen-${cssSafeId(neuron.name)}`)
        .addEventListener('click', () => viewer.toggleFullscreen());
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

function bindCopyLinkButton() {
  const copyLinkButton = document.getElementById('copy-link');
  copyLinkButton.addEventListener('click', async () => {
    await navigator.clipboard.writeText(window.location.href);
    const originalLabel = copyLinkButton.textContent;
    copyLinkButton.textContent = 'Copied!';
    setTimeout(() => { copyLinkButton.textContent = originalLabel; }, 1500);
  });
}

function bindExportCsvButton(neuronNames, sections) {
  document.getElementById('export-csv').addEventListener('click', () => {
    const csvText = buildCompareCsv(neuronNames, sections);
    const blobUrl = URL.createObjectURL(new Blob([csvText], { type: 'text/csv' }));

    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = 'neurolook-comparison.csv';
    downloadLink.click();

    URL.revokeObjectURL(blobUrl);
  });
}

async function init() {
  initCollectionBadge();
  bindCopyLinkButton();

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

    const sections = [
      { title: 'Organism & Strain', containerId: 'organism-table', rows: buildFieldComparisonRows(neurons, ORGANISM_FIELDS) },
      { title: 'Anatomical Classification', containerId: 'anatomical-table', rows: buildFieldComparisonRows(neurons, ANATOMICAL_FIELDS) },
      { title: 'Experimental Details', containerId: 'experimental-table', rows: buildFieldComparisonRows(neurons, EXPERIMENTAL_FIELDS) },
      { title: 'Morphometric Data', containerId: 'morphometry-table', rows: buildMorphometryComparisonRows(morphometryRecords) },
    ];

    document.getElementById('compare-heading').textContent = `Comparing ${comparisonEntries.length} neurons`;
    renderViewerColumns(comparisonEntries);
    for (const { containerId, rows } of sections) {
      renderComparisonTable(containerId, neuronNamesRow, rows);
    }
    bindExportCsvButton(neuronNamesRow, sections);
    document.getElementById('loading-state').hidden = true;
    document.getElementById('compare-page').hidden = false;

    await loadViewers(comparisonEntries);
  } catch (error) {
    document.getElementById('loading-state').hidden = true;
    showError(`Could not load comparison: ${error.message}`);
  }
}

init();
