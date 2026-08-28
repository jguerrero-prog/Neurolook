import { api } from './api.js';
import { initCollectionBadge } from './header.js';

async function loadStats() {
  const stats = await api.getStats();
  document.getElementById('stat-neurons').textContent = stats.totalNeurons.toLocaleString();
  document.getElementById('stat-species').textContent = stats.speciesCount.toLocaleString();
  document.getElementById('stat-brain-regions').textContent = stats.brainRegionCount.toLocaleString();
  document.getElementById('stat-archives').textContent = stats.archiveCount.toLocaleString();
}

function init() {
  initCollectionBadge();
  loadStats();
}

init();
