// Tracks which neurons are queued for comparison. Kept in sessionStorage so the
// selection survives navigation between the browse and collection pages within
// the same tab, without needing any server-side state for what is ephemeral choice.
const STORAGE_KEY = 'arbor:compareSelection';

function read() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function write(names) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(names));
}

export function getSelection() {
  return read();
}

export function toggleSelection(neuronName) {
  const current = read();
  const next = current.includes(neuronName)
    ? current.filter((name) => name !== neuronName)
    : [...current, neuronName];
  write(next);
  return next;
}

export function clearSelection() {
  write([]);
}
