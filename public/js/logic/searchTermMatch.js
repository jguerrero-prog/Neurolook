// @ts-check

const RESCUE_FIELDS = ['species', 'brain_region', 'cell_type', 'archive'];

/**
 * @typedef {Object} FilterMatch
 * @property {string} field The filter field the term matched, for example "species".
 * @property {string} value The real, known value it matched.
 */

// NeuroMorpho's search only matches a neuron's literal name, so typing
// "mouse" alone finds nothing even though it's the most-reconstructed
// species in the whole database. If a name search comes back empty,
// checking the typed term against the other filterable fields catches
// exactly that mistake — only ever an exact, case-insensitive match against
// a real known value, never a guess.
/**
 * @param {string} term The name someone typed into the search box.
 * @param {Object<string, string[]>} valuesByField Every known value for each filterable field.
 * @returns {FilterMatch|null}
 */
export function matchKnownFilterValue(term, valuesByField) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return null;

  for (const field of RESCUE_FIELDS) {
    const match = (valuesByField[field] || []).find((value) => value.toLowerCase() === normalized);
    if (match) return { field, value: match };
  }
  return null;
}
