// @ts-check
import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { createElement, bindCopyToClipboardButton, showError, getElement } from './dom.js';
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

/** @typedef {import('./models/Neuron.js').Neuron} Neuron */

const requestedNeuronNames = (new URLSearchParams(window.location.search).get('names') || '')
  .split(',')
  .filter(Boolean);

/** @param {string} neuronName @returns {string} */
function cssSafeId(neuronName) {
  return neuronName.replace(/[^a-zA-Z0-9_-]/g, '_');
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** @returns {SVGSVGElement} */
function createFullscreenIcon() {
  const svg = /** @type {SVGSVGElement} */ (document.createElementNS(SVG_NAMESPACE, 'svg'));
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');

  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('d', 'M1 5V1h4 M11 1h4v4 M15 11v4h-4 M5 15H1v-4');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);

  return svg;
}

/** @param {Neuron} neuron @param {string[]} otherNames @returns {HTMLElement} */
function createViewerColumn(neuron, otherNames) {
  const safeId = cssSafeId(/** @type {string} */ (neuron.name));

  const infoLink = createElement('a', {
    className: 'compare-column__info',
    attrs: { href: buildNeuronDetailUrl(/** @type {string} */ (neuron.name)) },
    children: [
      createElement('div', { className: 'compare-column__id', text: neuron.name }),
      createElement('div', { className: 'compare-column__title', text: neuron.cellType || 'Neuron' }),
      createElement('div', { className: 'compare-column__meta', text: `${neuron.species} · ${neuron.brainRegion}` }),
    ],
  });

  const removeLink = createElement('a', {
    attrs: { href: buildCompareUrl(otherNames), 'aria-label': `Remove ${neuron.name} from comparison` },
    text: '×',
  });

  const fullscreenButton = createElement('button', {
    className: 'compare-column__fullscreen',
    attrs: {
      type: 'button',
      id: `fullscreen-${safeId}`,
      title: 'Fullscreen (click the viewer, then press F)',
      'aria-label': 'Fullscreen',
    },
    children: [createFullscreenIcon()],
  });

  const downloadLink = createElement('a', {
    className: 'compare-column__download',
    attrs: { href: api.getSwcUrl(/** @type {string} */ (neuron.name)), download: neuron.swcFilename },
    text: 'Download SWC',
  });

  return createElement('div', {
    className: 'compare-column',
    children: [
      createElement('div', { className: 'compare-column__header', children: [infoLink, removeLink] }),
      createElement('div', {
        className: 'compare-column__viewer-wrap',
        children: [
          createElement('div', { className: 'compare-column__viewer', attrs: { id: `viewer-${safeId}` } }),
          fullscreenButton,
        ],
      }),
      downloadLink,
    ],
  });
}

/** @param {Array<{neuron: Neuron, morphometry: any}>} comparisonEntries @returns {void} */
function renderViewerColumns(comparisonEntries) {
  const viewersGrid = getElement('compare-viewers');
  viewersGrid.replaceChildren(
    ...comparisonEntries.map(({ neuron }) => {
      const otherNames = comparisonEntries
        .map((entry) => /** @type {string} */ (entry.neuron.name))
        .filter((name) => name !== neuron.name);
      return createViewerColumn(neuron, otherNames);
    }),
  );
}

/** @param {Array<{neuron: Neuron, morphometry: any}>} comparisonEntries @returns {Promise<void>} */
async function loadViewers(comparisonEntries) {
  for (const { neuron } of comparisonEntries) {
    const viewerContainer = getElement(`viewer-${cssSafeId(/** @type {string} */ (neuron.name))}`);
    /** @type {NeuronViewer|null} */
    let viewer = null;
    try {
      const swcResponse = await fetch(api.getSwcUrl(/** @type {string} */ (neuron.name)));
      if (!swcResponse.ok) throw new Error('SWC file unavailable');
      viewer = new NeuronViewer(viewerContainer);
      viewer.loadSwc(await swcResponse.text());
      document
        .getElementById(`fullscreen-${cssSafeId(/** @type {string} */ (neuron.name))}`)
        ?.addEventListener('click', () => /** @type {NeuronViewer} */ (viewer).toggleFullscreen());
    } catch {
      // loadSwc can throw after the viewer (and its render loop) already
      // exist, e.g. on an empty/garbled file — dispose it rather than leaving
      // a stray canvas animating behind the error message.
      viewer?.dispose();
      viewerContainer.textContent = 'Could not load 3D morphology.';
    }
  }
}

/** @param {string} containerId @param {string[]} headerValues @param {import('./logic/neuronFields.js').FieldRow[]} rows @returns {void} */
function renderComparisonTable(containerId, headerValues, rows) {
  const table = getElement(containerId);
  table.replaceChildren();
  table.appendChild(renderTableRow('Field', headerValues, { isHeader: true }));

  for (const row of rows) {
    table.appendChild(renderTableRow(row.label, row.values, { highlight: row.differs }));
  }
}

/**
 * @param {string} label
 * @param {any[]} values
 * @param {{isHeader?: boolean, highlight?: boolean}} [options]
 * @returns {HTMLElement}
 */
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

/** @returns {void} */
function bindCopyLinkButton() {
  bindCopyToClipboardButton(getElement('copy-link'), () => window.location.href);
}

// The plain /browse.html href is only a fallback for direct/external visits.
// If the user actually came from Browse, going back restores their exact
// search — filters, sort, and page — instead of resetting it.
/** @returns {void} */
function bindBreadcrumbBrowseLink() {
  const breadcrumbBrowseLink = document.getElementById('breadcrumb-browse-link');
  const referrerPath = document.referrer ? new URL(document.referrer).pathname : '';
  if (referrerPath !== '/browse.html') return;

  breadcrumbBrowseLink?.addEventListener('click', (event) => {
    event.preventDefault();
    window.history.back();
  });
}

/** @param {string[]} neuronNames @param {import('./logic/compareExport.js').CompareCsvSection[]} sections @returns {void} */
function bindExportCsvButton(neuronNames, sections) {
  document.getElementById('export-csv')?.addEventListener('click', () => {
    const csvText = buildCompareCsv(neuronNames, sections);
    const blobUrl = URL.createObjectURL(new Blob([csvText], { type: 'text/csv' }));

    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = 'neurolook-comparison.csv';
    downloadLink.click();

    URL.revokeObjectURL(blobUrl);
  });
}

/** @returns {Promise<void>} */
async function init() {
  initCollectionBadge();
  bindCopyLinkButton();
  bindBreadcrumbBrowseLink();

  if (requestedNeuronNames.length < 2) {
    getElement('loading-state').hidden = true;
    showError('Select at least two neurons to compare.');
    return;
  }

  try {
    const comparisonEntries = await api.compare(requestedNeuronNames);
    const neurons = comparisonEntries.map((entry) => entry.neuron);
    const morphometryRecords = comparisonEntries.map((entry) => entry.morphometry);
    const neuronNamesRow = neurons.map((neuron) => /** @type {string} */ (neuron.name));

    const sections = [
      {
        title: 'Organism & Strain',
        containerId: 'organism-table',
        rows: buildFieldComparisonRows(neurons, ORGANISM_FIELDS),
      },
      {
        title: 'Anatomical Classification',
        containerId: 'anatomical-table',
        rows: buildFieldComparisonRows(neurons, ANATOMICAL_FIELDS),
      },
      {
        title: 'Experimental Details',
        containerId: 'experimental-table',
        rows: buildFieldComparisonRows(neurons, EXPERIMENTAL_FIELDS),
      },
      {
        title: 'Morphometric Data',
        containerId: 'morphometry-table',
        rows: buildMorphometryComparisonRows(morphometryRecords),
      },
    ];

    getElement('compare-heading').textContent = `Comparing ${comparisonEntries.length} neurons`;
    renderViewerColumns(comparisonEntries);
    for (const { containerId, rows } of sections) {
      renderComparisonTable(containerId, neuronNamesRow, rows);
    }
    bindExportCsvButton(neuronNamesRow, sections);
    getElement('loading-state').hidden = true;
    getElement('compare-page').hidden = false;

    await loadViewers(comparisonEntries);
  } catch (error) {
    getElement('loading-state').hidden = true;
    showError(`Could not load comparison: ${/** @type {Error} */ (error).message}`);
  }
}

init();
