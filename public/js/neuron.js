import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { createElement, renderLinkifiedNote, bindCopyToClipboardButton } from './dom.js';
import { NeuronViewer } from './viewer.js';
import { createNeuronCard } from './neuronCard.js';
import { recordVisit } from './recentlyViewed.js';
import { ensureScope, getSelection, toggleSelection, clearSelection } from './compareSelection.js';
import { buildCompareUrl } from './routes.js';
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
let currentNeuron = null;

// View layer: takes already-decided rows/text from the Neuron/Morphometry
// models and logic/neuronFields.js, and writes them to the DOM. No field
// lists, formatting rules, or citation text are decided here.

function renderFieldList(listElementId, rows) {
  const listElement = document.getElementById(listElementId);
  listElement.replaceChildren(...rows.map(([label, value]) => createElement('div', {
    children: [
      createElement('dt', { text: label }),
      createElement('dd', { text: value }),
    ],
  })));
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
  renderLinkifiedNote(noteElement, neuron.note);
  noteElement.hidden = false;
}

function renderHeader(neuron) {
  document.title = `Neurolook — ${neuron.name}`;
  document.getElementById('breadcrumb-name').textContent = neuron.name;
  document.getElementById('neuron-title').textContent = `${neuron.name} — ${neuron.cellType || 'Neuron'}`;
  document.getElementById('neuron-subtitle').textContent = neuron.subtitle;
}

function renderDownloadLinks(neuron) {
  const downloadLink = document.getElementById('download-swc');
  downloadLink.href = api.getSwcUrl(neuron.name);
  downloadLink.download = neuron.swcFilename;
  document.getElementById('external-link').href = neuron.neuroMorphoPageUrl;
}

// The plain /browse.html href is only a fallback for direct/external visits.
// If the user actually came from Browse, going back restores their exact
// search — filters, sort, and page — instead of resetting it.
function bindBreadcrumbBrowseLink() {
  const breadcrumbBrowseLink = document.getElementById('breadcrumb-browse-link');
  if (!document.referrer.includes('/browse.html')) return;

  breadcrumbBrowseLink.addEventListener('click', (event) => {
    event.preventDefault();
    window.history.back();
  });
}

function bindCopyLinkButton() {
  bindCopyToClipboardButton(document.getElementById('copy-link'), () => window.location.href);
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
  bindCopyToClipboardButton(
    document.getElementById('copy-citation'),
    () => document.getElementById('citation-text').textContent,
    () => [
      createElement('img', { attrs: { src: '/assets/icons/check.svg', alt: '', width: 14, height: 10 } }),
      document.createTextNode('Copied!'),
    ],
  );
}

async function loadMorphologyViewer(neuronName) {
  const viewerStatus = document.getElementById('viewer-status');
  let viewer = null;
  try {
    const swcResponse = await fetch(api.getSwcUrl(neuronName));
    if (!swcResponse.ok) throw new Error('SWC file unavailable');
    const swcText = await swcResponse.text();

    viewer = new NeuronViewer(document.getElementById('viewer-container'));
    viewer.loadSwc(swcText);
    viewerStatus.remove();
    return viewer;
  } catch {
    // loadSwc can throw after the viewer (and its render loop) already
    // exist, e.g. on an empty/garbled file — dispose it rather than leaving
    // a stray canvas animating behind the error message.
    viewer?.dispose();
    viewerStatus.textContent = 'Could not load the 3D morphology for this neuron.';
    return null;
  }
}

function bindViewerToolbar(viewer) {
  const resetButton = document.getElementById('viewer-reset');
  const fullscreenButton = document.getElementById('viewer-fullscreen');

  resetButton.addEventListener('click', () => viewer.resetView());
  fullscreenButton.addEventListener('click', () => viewer.toggleFullscreen());

  document.getElementById('viewer-toolbar').hidden = false;
}

// Comparing only makes sense against the neuron currently on screen, so
// checking any similar neuron always pairs it with this one — the bar that
// shows how many neurons are selected reports the count of *other* neurons,
// but the actual comparison set (built when navigating to Compare) always
// includes the current one too.
function otherSelectedNames(neuron) {
  return getSelection().filter((name) => name !== neuron.name);
}

// Comparing needs at least 2 total (the current neuron plus at least one
// other), so the bar showing the selection count only ever appears once
// that's true — nothing to guard against a 1-selected state reaching
// Compare's error page.
function updateSelectionTray(neuron) {
  const others = otherSelectedNames(neuron);

  document.getElementById('selection-tray').hidden = others.length === 0;
  document.getElementById('selection-count').textContent = `${others.length} Neurons Selected`;
  document.getElementById('compare-link').href = buildCompareUrl([neuron.name, ...others]);
}

function handleSimilarCardToggle(neuron, similarNeuronName) {
  if (!getSelection().includes(neuron.name)) toggleSelection(neuron.name);
  toggleSelection(similarNeuronName);
  updateSelectionTray(neuron);
}

function bindSelectionTrayEvents(neuron) {
  document.getElementById('clear-selection').addEventListener('click', () => {
    clearSelection();
    document.querySelectorAll('.neuron-card__select').forEach((checkbox) => { checkbox.checked = false; });
    updateSelectionTray(neuron);
  });
}

// Best-effort: the similarity service is a separate deployment from the main
// API, so a failure here just leaves the section hidden rather than
// breaking the rest of the page.
async function loadSimilarNeurons(neuron) {
  try {
    const matches = await api.getSimilarNeurons(neuron.name);
    if (matches.length === 0) return;

    const selectedNames = new Set(getSelection());
    const grid = document.getElementById('similar-neurons-grid');
    for (const { neuron: similarNeuron, similarity } of matches) {
      grid.appendChild(createNeuronCard(similarNeuron, {
        note: `${Math.round(similarity * 100)}% similar`,
        selected: selectedNames.has(similarNeuron.name),
        onToggleSelect: (name) => handleSimilarCardToggle(neuron, name),
      }));
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
  bindBreadcrumbBrowseLink();
  bindCopyCitationButton();
  bindCopyLinkButton();

  if (!requestedNeuronName) {
    document.getElementById('loading-state').hidden = true;
    showError('No neuron specified.');
    return;
  }
  ensureScope(`neuron:${requestedNeuronName}`);

  try {
    const { neuron, morphometry, literature } = await api.getNeuron(requestedNeuronName);
    currentNeuron = neuron;

    renderHeader(neuron);
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

    bindSelectionTrayEvents(neuron);
    updateSelectionTray(neuron);

    await bindCollectionToggle(neuron);
    loadMorphologyViewer(neuron.name).then((viewer) => {
      if (viewer) bindViewerToolbar(viewer);
    });
    loadSimilarNeurons(neuron);
  } catch (error) {
    document.getElementById('loading-state').hidden = true;
    showError(`Could not load ${requestedNeuronName}: ${error.message}`);
  }
}

init();

// Some browsers can bring back a page exactly as it looked when you left it
// (for example, clicking Back from Browse or Compare) instead of reloading
// it from scratch. That means the comparison selection shown on screen (the
// bar showing how many neurons are selected, and which similar-neuron cards
// are checked) can be left over from before you navigated away, so it needs
// to be refreshed here.
window.addEventListener('pageshow', (event) => {
  if (event.persisted && currentNeuron) updateSelectionTray(currentNeuron);
});
