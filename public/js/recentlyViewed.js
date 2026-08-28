// Tracks the last few neurons a person opened, in localStorage — persists
// across sessions (unlike compareSelection's sessionStorage), since "what did
// I look at recently" is useful days later, not just within one browsing pass.
const STORAGE_KEY = 'arbor:recentlyViewed';
const MAX_ENTRIES = 8;

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function write(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function recordVisit(neuron) {
  const entry = { name: neuron.name, cellType: neuron.cellType, species: neuron.species, pngUrl: neuron.pngUrl };
  const withoutThisNeuron = read().filter((item) => item.name !== entry.name);
  write([entry, ...withoutThisNeuron].slice(0, MAX_ENTRIES));
}

export function getRecentlyViewed() {
  return read();
}
