// Parses SWC-format morphology text into a map of sample points keyed by id.
// SWC line format: id type x y z radius parent (whitespace separated).
export function parseSwc(text) {
  const samples = new Map();

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const fields = trimmed.split(/\s+/).map(Number);
    if (fields.length < 7 || fields.some(Number.isNaN)) continue;

    const [id, type, x, y, z, radius, parent] = fields;
    samples.set(id, { id, type, x, y, z, radius, parent });
  }

  return samples;
}
