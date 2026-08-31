// @ts-check
import { api } from './api.js';
import { initCollectionBadge } from './header.js';
import { getElement } from './dom.js';

/** @returns {Promise<void>} */
async function loadStats() {
  const stats = await api.getStats();
  getElement('stat-neurons').textContent = stats.totalNeurons.toLocaleString();
  getElement('stat-species').textContent = stats.speciesCount.toLocaleString();
  getElement('stat-brain-regions').textContent = stats.brainRegionCount.toLocaleString();
  getElement('stat-archives').textContent = stats.archiveCount.toLocaleString();
}

/** @returns {void} */
function init() {
  initCollectionBadge();
  loadStats();
}

init();
