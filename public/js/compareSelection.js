// @ts-check

// Tracks which neurons are queued for comparison. Kept in sessionStorage so
// the selection survives a reload of the *same* page context — e.g.
// refining filters on Browse — without needing server-side state for what
// is an ephemeral choice. It's deliberately page-local, not shared across
// different pages: each page must call ensureScope() with an identifier for
// its own context before reading/writing, so moving to a different page
// (Collection, a different neuron's detail page, etc.) starts fresh instead
// of carrying over a selection you can no longer see checked anywhere.
const STORAGE_KEY = 'neurolook:compareSelection';

/**
 * @typedef {Object} SelectionState
 * @property {string|null} scope Which page context this selection belongs to.
 * @property {string[]} names The neuron names currently queued for comparison.
 */

/** @returns {SelectionState} */
function read() {
  try {
    return JSON.parse(String(sessionStorage.getItem(STORAGE_KEY))) ?? { scope: null, names: [] };
  } catch {
    return { scope: null, names: [] };
  }
}

/** @param {SelectionState} state @returns {void} */
function write(state) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Call once per page load, before getSelection/toggleSelection/clearSelection,
// with an identifier unique to that page's context (e.g. 'browse',
// 'collection', or `neuron:${name}`). Resets the selection if the stored
// scope doesn't match — i.e. the previous selection belonged to a different
// page context.
/** @param {string} scope @returns {void} */
export function ensureScope(scope) {
  const state = read();
  if (state.scope !== scope) write({ scope, names: [] });
}

/** @returns {string[]} */
export function getSelection() {
  return read().names;
}

/** @param {string} neuronName @returns {string[]} The selection after the change. */
export function toggleSelection(neuronName) {
  const state = read();
  const next = state.names.includes(neuronName)
    ? state.names.filter((name) => name !== neuronName)
    : [...state.names, neuronName];
  write({ ...state, names: next });
  return next;
}

/** @returns {void} */
export function clearSelection() {
  write({ ...read(), names: [] });
}
