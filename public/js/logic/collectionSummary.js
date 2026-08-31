// @ts-check

/**
 * @typedef {Object} CollectionSummary
 * @property {number} total How many neurons are saved.
 * @property {number} cachedCount How many have their SWC file downloaded and stored offline.
 * @property {number} metadataOnlyCount How many only have their metadata saved, with no offline file.
 * @property {string} summaryText A single readable summary line, or an empty string if there is nothing saved.
 */

// Turns the list of { neuron, cached } collection entries into the summary
// text shown at the top of the My Collection page. Pure — no DOM.
/**
 * @param {Array<{cached: boolean}>} items
 * @returns {CollectionSummary}
 */
export function summarizeCollection(items) {
  const cachedCount = items.filter((entry) => entry.cached).length;
  const total = items.length;

  return {
    total,
    cachedCount,
    metadataOnlyCount: total - cachedCount,
    summaryText:
      total === 0
        ? ''
        : `${total} neuron${total === 1 ? '' : 's'} saved locally · ${cachedCount} cached offline, ${total - cachedCount} metadata only`,
  };
}
