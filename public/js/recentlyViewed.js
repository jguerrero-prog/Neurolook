// @ts-check

/** @typedef {import('./models/Neuron.js').Neuron} Neuron */

// Tracks the last few neurons a person opened, in localStorage — persists
// across sessions (unlike compareSelection's sessionStorage), since "what did
// I look at recently" is useful days later, not just within one browsing pass.
const STORAGE_KEY = 'neurolook:recentlyViewed';
const MAX_ENTRIES = 8;

/**
 * @typedef {Object} RecentlyViewedEntry
 * @property {string} name
 * @property {string} cellType
 * @property {string} species
 * @property {string|undefined} pngUrl
 */

/** @returns {RecentlyViewedEntry[]} */
function read() {
  try {
    return JSON.parse(String(localStorage.getItem(STORAGE_KEY))) ?? [];
  } catch {
    return [];
  }
}

/** @param {RecentlyViewedEntry[]} entries @returns {void} */
function write(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** @param {Neuron} neuron @returns {void} */
export function recordVisit(neuron) {
  const entry = {
    name: /** @type {string} */ (neuron.name),
    cellType: neuron.cellType,
    species: /** @type {string} */ (neuron.species),
    pngUrl: neuron.pngUrl,
  };
  const withoutThisNeuron = read().filter((item) => item.name !== entry.name);
  write([entry, ...withoutThisNeuron].slice(0, MAX_ENTRIES));
}

/** @returns {RecentlyViewedEntry[]} */
export function getRecentlyViewed() {
  return read();
}
