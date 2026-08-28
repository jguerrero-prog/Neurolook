// Builds a CSV string from the same comparison rows compare.js renders as
// tables. Pure — no DOM, no download mechanics (that's the view's job).
function escapeCsvField(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCompareCsv(neuronNames, sections) {
  const lines = [['Field', ...neuronNames]];

  for (const { title, rows } of sections) {
    lines.push([`[${title}]`]);
    for (const { label, values } of rows) {
      lines.push([label, ...values]);
    }
  }

  return lines.map((row) => row.map(escapeCsvField).join(',')).join('\n');
}
