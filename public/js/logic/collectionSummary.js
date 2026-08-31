// Turns the list of { neuron, cached } collection entries into the summary
// text shown at the top of the My Collection page. Pure — no DOM.
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
