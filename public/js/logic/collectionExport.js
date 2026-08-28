// Builds a CSV string from collection entries. Pure — no DOM, no download
// mechanics (that's the view's job).
const HEADER = ['Neuron Name', 'Species', 'Cell Type', 'Brain Region', 'Archive', 'Cached Offline'];

function escapeCsvField(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCollectionCsv(collectionEntries) {
  const rows = collectionEntries.map(({ neuron, cached }) => [
    neuron.name,
    neuron.species,
    neuron.cellType,
    neuron.brainRegion,
    neuron.archive,
    cached ? 'yes' : 'no',
  ]);

  return [HEADER, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\n');
}
