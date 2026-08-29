// Builds a CSV string from the same comparison rows compare.js renders as
// tables. Pure — no DOM, no download mechanics (that's the view's job).
function escapeCsvField(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Tidy layout — one row per neuron, one column per field — rather than
// mirroring the on-screen tables (fields as rows, neurons as columns).
// That transposed, section-header-interrupted shape isn't something
// pandas/R/Excel can load directly; this is.
export function buildCompareCsv(neuronNames, sections) {
  const fieldColumns = sections.flatMap(({ title, rows }) =>
    rows.map((row) => ({ ...row, label: `${title}: ${row.label}` }))
  );

  const header = ['Neuron ID', ...fieldColumns.map((column) => column.label)];
  const dataRows = neuronNames.map((neuronName, index) => [
    neuronName,
    ...fieldColumns.map((column) => column.values[index]),
  ]);

  return [header, ...dataRows].map((row) => row.map(escapeCsvField).join(',')).join('\n');
}
