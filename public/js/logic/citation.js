// Builds the citation lines shown on a neuron's detail page. Prefers real
// publication details (title/authors/journal) when we could look them up;
// falls back to a plain PMID reference otherwise. Every citation also
// carries the required NeuroMorpho attribution, per their terms of use.
//
// Also returns `sources`: a clickable link for each publication that
// resolved to a real DOI or PMID. Only literatureEntries carry those —
// never neuron.referencePubmedIds directly — since a neuron's own
// reference id can be one of NeuroMorpho's internal placeholder numbers,
// which isn't a real, dereferenceable identifier and would be a dead link.
export function buildCitationLines(neuron, literatureEntries) {
  const publicationLines =
    literatureEntries.length > 0
      ? literatureEntries.map((entry) => entry.citationLine)
      : [
          neuron.referencePubmedIds.length > 0
            ? `See the original publication(s): PMID ${neuron.referencePubmedIds.join(', ')}.`
            : 'Original publication not linked in the database record.',
        ];

  const sources = literatureEntries
    .filter((entry) => entry.sourceUrl)
    .map((entry) => ({ label: entry.sourceLabel, url: entry.sourceUrl }));

  return {
    lines: [
      ...publicationLines,
      'NeuroMorpho.Org (RRID:SCR_002145).',
      'Tecuatl C, Ljungquist B, Ascoli GA (2024) Accelerating the continuous community sharing of digital neuromorphology data. FASEB Bioadv. 6(7):207-221. doi: 10.1096/fba.2024-00048',
      `Neuron ID for citation: ${neuron.name}`,
    ],
    sources,
  };
}
