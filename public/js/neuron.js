import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { escapeHtml } from './dom.js';
import { NeuronViewer } from './viewer.js';
import { createNeuronCard } from './neuronCard.js';
import { recordVisit } from './recentlyViewed.js';
import { buildCitationLines } from './logic/citation.js';
import {
  IDENTIFICATION_FIELDS,
  ORGANISM_FIELDS,
  ANATOMICAL_FIELDS,
  EXPERIMENTAL_FIELDS,
  buildFieldRows,
  buildMorphometryRows,
} from './logic/neuronFields.js';

const requestedNeuronName = new URLSearchParams(window.location.search).get('name');

// View layer: takes already-decided rows/text from the Neuron/Morphometry
// models and logic/neuronFields.js, and writes them to the DOM. No field
// lists, formatting rules, or citation text are decided here.

function renderFieldList(listElementId, rows) {
  const listElement = document.getElementById(listElementId);
  listElement.innerHTML = rows
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join('');
}

// Notes can be long, free-flowing, and contain real links (a scaling-factor
// caveat, a note about a reprocessed file) — too much for a cramped dt/dd
// row, so this renders as its own full-width block, hidden when there is none.
function renderNote(neuron) {
  const noteElement = document.getElementById('neuron-note');
  if (!neuron.note) {
    noteElement.hidden = true;
    return;
  }
  noteElement.innerHTML = neuron.noteHtml;
  noteElement.hidden = false;
}

function renderHeader(neuron) {
  document.title = `Arbor — ${neuron.name}`;
  document.getElementById('breadcrumb-name').textContent = neuron.name;
  document.getElementById('neuron-title').textContent = `${neuron.name} — ${neuron.cellType || 'Neuron'}`;
  document.getElementById('neuron-domain').textContent = neuron.domain || 'Domain not reported';
  document.getElementById('neuron-subtitle').textContent = neuron.subtitle;
}

function renderDownloadLinks(neuron) {
  const downloadLink = document.getElementById('download-swc');
  downloadLink.href = api.getSwcUrl(neuron.name);
  downloadLink.download = neuron.swcFilename;
  document.getElementById('external-link').href = neuron.neuroMorphoPageUrl;
}

function renderCacheBadge(metadataFromCache) {
  document.getElementById('cache-badge').hidden = !metadataFromCache;
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

function renderCollectionToggleButton(collectionToggleButton, isInCollection) {
  collectionToggleButton.textContent = isInCollection ? '✓ In collection' : '+ Add to collection';
  collectionToggleButton.classList.toggle('button--primary', isInCollection);
  collectionToggleButton.classList.toggle('button--secondary', !isInCollection);
}

async function handleCollectionToggleClick(neuron, collectionToggleButton, isInCollection) {
  collectionToggleButton.disabled = true;
  if (isInCollection) {
    await api.removeFromCollection(neuron.name);
  } else {
    await api.addToCollection(neuron);
  }
  collectionToggleButton.disabled = false;
  initCollectionBadge();
  return !isInCollection;
}

async function bindCollectionToggle(neuron) {
  const collectionToggleButton = document.getElementById('collection-toggle');
  const collectionEntries = await api.getCollection();
  let isInCollection = collectionEntries.some((entry) => entry.neuron.name === neuron.name);
  renderCollectionToggleButton(collectionToggleButton, isInCollection);

  collectionToggleButton.addEventListener('click', async () => {
    isInCollection = await handleCollectionToggleClick(neuron, collectionToggleButton, isInCollection);
    renderCollectionToggleButton(collectionToggleButton, isInCollection);
  });
}

function bindCopyCitationButton() {
  document.getElementById('copy-citation').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('citation-text').textContent);
  });
}

async function loadMorphologyViewer(neuronName) {
  const viewerStatus = document.getElementById('viewer-status');
  try {
    const swcResponse = await fetch(api.getSwcUrl(neuronName));
    if (!swcResponse.ok) throw new Error('SWC file unavailable');
    const swcText = await swcResponse.text();

    const viewer = new NeuronViewer(document.getElementById('viewer-container'));
    viewer.loadSwc(swcText);
    viewerStatus.remove();
    return viewer;
  } catch {
    viewerStatus.textContent = 'Could not load the 3D morphology for this neuron.';
    return null;
  }
}

function bindViewerToolbar(viewer) {
  const resetButton = document.getElementById('viewer-reset');
  const wireframeButton = document.getElementById('viewer-wireframe');
  const fullscreenButton = document.getElementById('viewer-fullscreen');

  resetButton.addEventListener('click', () => viewer.resetView());

  let wireframeOn = false;
  wireframeButton.addEventListener('click', () => {
    wireframeOn = !wireframeOn;
    viewer.setWireframe(wireframeOn);
    wireframeButton.classList.toggle('viewer-toolbar__button--active', wireframeOn);
  });

  fullscreenButton.addEventListener('click', () => viewer.toggleFullscreen());

  document.getElementById('viewer-toolbar').hidden = false;
}

// Best-effort: the similarity service is a separate deployment from the main
// API, so a failure here just leaves the section hidden rather than
// breaking the rest of the page.
async function loadSimilarNeurons(neuronName) {
  try {
    const matches = await api.getSimilarNeurons(neuronName);
    if (matches.length === 0) return;

    const grid = document.getElementById('similar-neurons-grid');
    for (const { neuron, similarity } of matches) {
      grid.appendChild(createNeuronCard(neuron, { note: `${Math.round(similarity * 100)}% similar` }));
    }
    document.getElementById('similar-neurons-section').hidden = false;
  } catch {
    // Leave the section hidden.
  }
}

function showError(message) {
  const errorBanner = document.getElementById('error-banner');
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

async function init() {
  initCollectionBadge();
  bindCopyCitationButton();
  bindCopyLinkButton();

  if (!requestedNeuronName) {
    document.getElementById('loading-state').hidden = true;
    showError('No neuron specified.');
    return;
  }

  try {
    const { neuron, morphometry, metadataFromCache, literature } = await api.getNeuron(requestedNeuronName);

    renderHeader(neuron);
    renderCacheBadge(metadataFromCache);
    renderNote(neuron);
    renderFieldList('identification-list', buildFieldRows(neuron, IDENTIFICATION_FIELDS));
    renderFieldList('organism-list', buildFieldRows(neuron, ORGANISM_FIELDS));
    renderFieldList('anatomical-list', buildFieldRows(neuron, ANATOMICAL_FIELDS));
    renderFieldList('experimental-list', buildFieldRows(neuron, EXPERIMENTAL_FIELDS));
    renderFieldList('morphometry-list', buildMorphometryRows(morphometry));
    document.getElementById('citation-text').textContent = buildCitationLines(neuron, literature).join(' ');
    renderDownloadLinks(neuron);
    document.getElementById('loading-state').hidden = true;
    document.getElementById('neuron-detail').hidden = false;
    recordVisit(neuron);

    await bindCollectionToggle(neuron);
    loadMorphologyViewer(neuron.name).then((viewer) => {
      if (viewer) bindViewerToolbar(viewer);
    });
    loadSimilarNeurons(neuron.name);
  } catch (error) {
    document.getElementById('loading-state').hidden = true;
    showError(`Could not load ${requestedNeuronName}: ${error.message}`);
  }
}

init();
