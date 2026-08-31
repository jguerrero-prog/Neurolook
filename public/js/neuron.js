// @ts-check
import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { createElement, renderLinkifiedNote, bindCopyToClipboardButton, showError, getElement } from './dom.js';
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

/** @typedef {import('./models/Neuron.js').Neuron} Neuron */

const requestedNeuronName = new URLSearchParams(window.location.search).get('name');
/** @type {Neuron|null} */
let currentNeuron = null;
/** @type {Array<{neuron: Neuron, similarity: number}>} */
let similarNeuronMatches = [];

// View layer: takes already-decided rows/text from the Neuron/Morphometry
// models and logic/neuronFields.js, and writes them to the DOM. No field
// lists, formatting rules, or citation text are decided here.

/** @param {string} listElementId @param {Array<[string, string]>} rows @returns {void} */
function renderFieldList(listElementId, rows) {
  const listElement = getElement(listElementId);
  listElement.replaceChildren(
    ...rows.map(([label, value]) =>
      createElement('div', {
        children: [createElement('dt', { text: label }), createElement('dd', { text: value })],
      }),
    ),
  );
}

// Notes can be long, free-flowing, and contain real links (a scaling-factor
// caveat, a note about a reprocessed file) — too much for a cramped dt/dd
// row, so this renders as its own full-width block, hidden when there is none.
/** @param {Neuron} neuron @returns {void} */
function renderNote(neuron) {
  const noteElement = getElement('neuron-note');
  if (!neuron.note) {
    noteElement.hidden = true;
    return;
  }
  renderLinkifiedNote(noteElement, neuron.note);
  noteElement.hidden = false;
}

// One link per resolved publication (a doi.org or pubmed.ncbi.nlm.nih.gov
// URL) — kept separate from the copyable citation text above it, so
// copying the citation still yields a clean academic reference rather than
// a pasted-in hyperlink.
/** @param {import('./logic/citation.js').CitationSource[]} sources @returns {void} */
function renderCitationSources(sources) {
  const sourcesElement = getElement('citation-sources');
  if (sources.length === 0) {
    sourcesElement.hidden = true;
    return;
  }

  sourcesElement.replaceChildren(
    ...sources.map(({ label, url }, index) => {
      const link = createElement('a', {
        attrs: { href: url, target: '_blank', rel: 'noopener noreferrer' },
        text: label ?? '',
      });
      if (index === 0) return link;
      const separator = createElement('span', {
        className: 'citation-sources__separator',
        attrs: { 'aria-hidden': 'true' },
        text: '  ·  ',
      });
      return createElement('span', { children: [separator, link] });
    }),
  );
  sourcesElement.hidden = false;
}

/** @param {Neuron} neuron @returns {void} */
function renderHeader(neuron) {
  document.title = `Neurolook — ${neuron.name}`;
  const breadcrumbName = getElement('breadcrumb-name');
  breadcrumbName.textContent = neuron.name ?? '';
  getElement('neuron-title').textContent = `${neuron.name} — ${neuron.cellType || 'Neuron'}`;
  getElement('neuron-subtitle').textContent = neuron.subtitle;
}

/** @param {Neuron} neuron @returns {void} */
function renderDownloadLinks(neuron) {
  const downloadLink = /** @type {HTMLAnchorElement} */ (getElement('download-swc'));
  downloadLink.href = api.getSwcUrl(/** @type {string} */ (neuron.name));
  downloadLink.download = neuron.swcFilename;
  /** @type {HTMLAnchorElement} */ (getElement('external-link')).href = neuron.neuroMorphoPageUrl;
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

/** @returns {void} */
function bindCopyLinkButton() {
  bindCopyToClipboardButton(getElement('copy-link'), () => window.location.href);
}

/** @param {HTMLElement} collectionToggleButton @param {boolean} isInCollection @returns {void} */
function renderCollectionToggleButton(collectionToggleButton, isInCollection) {
  collectionToggleButton.textContent = isInCollection ? '✓ In collection' : '+ Add to collection';
  collectionToggleButton.classList.toggle('button--primary', isInCollection);
  collectionToggleButton.classList.toggle('button--secondary', !isInCollection);
}

/**
 * @param {Neuron} neuron
 * @param {HTMLButtonElement} collectionToggleButton
 * @param {boolean} isInCollection
 * @returns {Promise<boolean>}
 */
async function handleCollectionToggleClick(neuron, collectionToggleButton, isInCollection) {
  collectionToggleButton.disabled = true;
  try {
    if (isInCollection) {
      await api.removeFromCollection(/** @type {string} */ (neuron.name));
    } else {
      await api.addToCollection(neuron);
    }
    initCollectionBadge();
    return !isInCollection;
  } catch (error) {
    // If this fails, the button must not stay stuck disabled forever, and
    // isInCollection must stay whatever it actually still is, not flip to a
    // state the save/remove call never actually reached.
    showError(`Could not update your collection: ${/** @type {Error} */ (error).message}`);
    return isInCollection;
  } finally {
    collectionToggleButton.disabled = false;
  }
}

/** @param {Neuron} neuron @returns {Promise<void>} */
async function bindCollectionToggle(neuron) {
  const collectionToggleButton = /** @type {HTMLButtonElement} */ (getElement('collection-toggle'));
  const collectionEntries = await api.getCollection();
  let isInCollection = collectionEntries.some((entry) => entry.neuron.name === neuron.name);
  renderCollectionToggleButton(collectionToggleButton, isInCollection);

  collectionToggleButton.addEventListener('click', async () => {
    isInCollection = await handleCollectionToggleClick(neuron, collectionToggleButton, isInCollection);
    renderCollectionToggleButton(collectionToggleButton, isInCollection);
  });
}

/** @returns {void} */
function bindCopyCitationButton() {
  bindCopyToClipboardButton(
    getElement('copy-citation'),
    () => getElement('citation-text').textContent ?? '',
    () => [
      createElement('img', { attrs: { src: '/assets/icons/check.svg', alt: '', width: 14, height: 10 } }),
      document.createTextNode('Copied!'),
    ],
  );
}

/** @param {string} neuronName @returns {Promise<NeuronViewer|null>} */
async function loadMorphologyViewer(neuronName) {
  const viewerStatus = getElement('viewer-status');
  /** @type {NeuronViewer|null} */
  let viewer = null;
  try {
    const swcResponse = await fetch(api.getSwcUrl(neuronName));
    if (!swcResponse.ok) throw new Error('SWC file unavailable');
    const swcText = await swcResponse.text();

    viewer = new NeuronViewer(getElement('viewer-container'));
    viewer.loadSwc(swcText);
    viewerStatus.remove();
    return viewer;
  } catch (error) {
    // loadSwc can throw after the viewer (and its render loop) already
    // exist, e.g. on an empty/garbled file — dispose it rather than leaving
    // a stray canvas animating behind the error message.
    viewer?.dispose();
    viewerStatus.textContent = 'Could not load the 3D morphology for this neuron.';
    // The message on screen covers both an expected failure (the file just
    // is not available) and a real bug in this code. Logging the real error
    // here means the difference is still visible to whoever is looking.
    console.error(`Could not load the 3D morphology for ${neuronName}:`, error);
    return null;
  }
}

/** @param {NeuronViewer} viewer @returns {void} */
function bindViewerToolbar(viewer) {
  const resetButton = document.getElementById('viewer-reset');
  const fullscreenButton = document.getElementById('viewer-fullscreen');

  resetButton?.addEventListener('click', () => viewer.resetView());
  fullscreenButton?.addEventListener('click', () => viewer.toggleFullscreen());

  getElement('viewer-toolbar').hidden = false;
}

// Comparing only makes sense against the neuron currently on screen, so
// checking any similar neuron always pairs it with this one — the bar that
// shows how many neurons are selected reports the count of *other* neurons,
// but the actual comparison set (built when navigating to Compare) always
// includes the current one too.
/** @param {Neuron} neuron @returns {string[]} */
function otherSelectedNames(neuron) {
  return getSelection().filter((name) => name !== neuron.name);
}

// Comparing needs at least 2 total (the current neuron plus at least one
// other), so the bar showing the selection count only ever appears once
// that's true — nothing to guard against a 1-selected state reaching
// Compare's error page.
/** @param {Neuron} neuron @returns {void} */
function updateSelectionTray(neuron) {
  const others = otherSelectedNames(neuron);

  getElement('selection-tray').hidden = others.length === 0;
  getElement('selection-count').textContent = `${others.length} Neurons Selected`;
  /** @type {HTMLAnchorElement} */ (getElement('compare-link')).href = buildCompareUrl([
    /** @type {string} */ (neuron.name),
    ...others,
  ]);
}

/** @param {Neuron} neuron @param {string} similarNeuronName @returns {void} */
function handleSimilarCardToggle(neuron, similarNeuronName) {
  if (!getSelection().includes(/** @type {string} */ (neuron.name)))
    toggleSelection(/** @type {string} */ (neuron.name));
  toggleSelection(similarNeuronName);
  updateSelectionTray(neuron);
}

/** @param {Neuron} neuron @returns {void} */
function bindSelectionTrayEvents(neuron) {
  document.getElementById('clear-selection')?.addEventListener('click', () => {
    clearSelection();
    document.querySelectorAll('.neuron-card__select').forEach((checkbox) => {
      /** @type {HTMLInputElement} */ (checkbox).checked = false;
    });
    updateSelectionTray(neuron);
  });
}

// Best-effort: the similarity service is a separate deployment from the main
// API, so a failure here just leaves the section hidden rather than
// breaking the rest of the page.
/** @param {Neuron} neuron @returns {Promise<void>} */
async function loadSimilarNeurons(neuron) {
  try {
    similarNeuronMatches = await api.getSimilarNeurons(/** @type {string} */ (neuron.name));
    renderSimilarNeurons(neuron, similarNeuronMatches);
  } catch (error) {
    // Leave the section hidden either way, but still log the real error so
    // an actual bug here does not look identical to the service just being
    // down.
    console.error('Could not load similar neurons:', error);
  }
}

// Rebuilds the similar-neurons grid from matches already fetched by
// loadSimilarNeurons, with no new network call. Used both right after that
// first fetch and when a bfcache restore needs each card's checkbox synced
// back to whatever is actually selected right now.
/** @param {Neuron} neuron @param {Array<{neuron: Neuron, similarity: number}>} matches @returns {void} */
function renderSimilarNeurons(neuron, matches) {
  if (matches.length === 0) return;

  const selectedNames = new Set(getSelection());
  const grid = getElement('similar-neurons-grid');
  grid.replaceChildren(
    ...matches.map(({ neuron: similarNeuron, similarity }) =>
      createNeuronCard(similarNeuron, {
        note: `${Math.round(similarity * 100)}% similar`,
        selected: selectedNames.has(/** @type {string} */ (similarNeuron.name)),
        onToggleSelect: (name) => handleSimilarCardToggle(neuron, name),
      }),
    ),
  );
  getElement('similar-neurons-section').hidden = false;
}

/** @returns {Promise<void>} */
async function init() {
  try {
    initCollectionBadge();
    bindBreadcrumbBrowseLink();
    bindCopyCitationButton();
    bindCopyLinkButton();

    if (!requestedNeuronName) {
      showError('No neuron specified.');
      return;
    }
    ensureScope(`neuron:${requestedNeuronName}`);

    const { neuron, morphometry, literature } = await api.getNeuron(requestedNeuronName);
    currentNeuron = neuron;

    renderHeader(neuron);
    renderNote(neuron);
    renderFieldList('identification-list', buildFieldRows(neuron, IDENTIFICATION_FIELDS));
    renderFieldList('organism-list', buildFieldRows(neuron, ORGANISM_FIELDS));
    renderFieldList('anatomical-list', buildFieldRows(neuron, ANATOMICAL_FIELDS));
    renderFieldList('experimental-list', buildFieldRows(neuron, EXPERIMENTAL_FIELDS));
    renderFieldList('morphometry-list', buildMorphometryRows(morphometry));
    const citation = buildCitationLines(neuron, literature);
    getElement('citation-text').textContent = citation.lines.join(' ');
    renderCitationSources(citation.sources);
    renderDownloadLinks(neuron);
    getElement('neuron-detail').hidden = false;
    recordVisit(neuron);

    bindSelectionTrayEvents(neuron);
    updateSelectionTray(neuron);

    // A failure here (adding/removing from your collection) should not stop
    // the 3D viewer or similar neurons below from loading. Those are their
    // own, unrelated features.
    try {
      await bindCollectionToggle(neuron);
    } catch (error) {
      // bindCollectionToggle never got to set the button's real label or
      // attach its click listener, so left alone it would sit there looking
      // clickable while silently doing nothing. Disabling it with its own
      // message matches how the viewer and similar-neurons section each
      // show their own failure locally, instead of a page-wide banner for
      // what is a small, non-blocking feature.
      console.error('Could not load collection status:', error);
      const collectionToggleButton = /** @type {HTMLButtonElement} */ (getElement('collection-toggle'));
      collectionToggleButton.disabled = true;
      collectionToggleButton.textContent = 'Collection unavailable';
    }
    loadMorphologyViewer(/** @type {string} */ (neuron.name)).then((viewer) => {
      if (viewer) bindViewerToolbar(viewer);
    });
    loadSimilarNeurons(neuron);
  } catch (error) {
    showError(`Could not load ${requestedNeuronName}: ${/** @type {Error} */ (error).message}`);
  } finally {
    getElement('loading-state').hidden = true;
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
  if (!event.persisted || !currentNeuron) return;
  updateSelectionTray(currentNeuron);
  renderSimilarNeurons(currentNeuron, similarNeuronMatches);
});
