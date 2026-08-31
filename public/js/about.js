// @ts-check
import { api } from './api.js';
import { initCollectionBadge } from './header.js';

/** @returns {Promise<void>} */
async function loadStats() {
  const stats = await api.getStats();
  /** @type {HTMLElement} */ (document.getElementById('stat-neurons')).textContent =
    stats.totalNeurons.toLocaleString();
  /** @type {HTMLElement} */ (document.getElementById('stat-species')).textContent =
    stats.speciesCount.toLocaleString();
  /** @type {HTMLElement} */ (document.getElementById('stat-brain-regions')).textContent =
    stats.brainRegionCount.toLocaleString();
  /** @type {HTMLElement} */ (document.getElementById('stat-archives')).textContent =
    stats.archiveCount.toLocaleString();
}

/** @returns {void} */
function init() {
  initCollectionBadge();
  loadStats();
}

init();
