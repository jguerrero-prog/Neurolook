// Builds the citation lines shown on a neuron's detail page. Prefers real
// publication details (title/authors/journal) when we could look them up;
// falls back to a plain PMID reference otherwise. Every citation also
// carries the required NeuroMorpho attribution, per their terms of use.
export function buildCitationLines(neuron, literatureEntries) {
  const publicationLines = literatureEntries.length > 0
    ? literatureEntries.map((entry) => entry.citationLine)
    : [
        neuron.referencePubmedIds.length > 0
          ? `See the original publication(s): PMID ${neuron.referencePubmedIds.join(', ')}.`
          : 'Original publication not linked in the database record.',
      ];

  return [
    ...publicationLines,
    'NeuroMorpho.Org (RRID:SCR_002145).',
    'Tecuatl C, Ljungquist B, Ascoli GA (2024) Accelerating the continuous community sharing of digital neuromorphology data. FASEB Bioadv. 6(7):207-221. doi: 10.1096/fba.2024-00048',
    `Neuron ID for citation: ${neuron.name}`,
  ];
}
