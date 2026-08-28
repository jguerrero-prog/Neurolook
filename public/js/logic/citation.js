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
    'Tecuatl C, et al. (2024) NeuroMorpho.Org: a database of digitally reconstructed neurons and glia. Neuroinformatics.',
    `Neuron ID for citation: ${neuron.name}`,
  ];
}
