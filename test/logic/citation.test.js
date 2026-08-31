import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCitationLines } from '../../public/js/logic/citation.js';

const ATTRIBUTION_LINE = 'NeuroMorpho.Org (RRID:SCR_002145).';

function fakeNeuron({ name = 'test_neuron', referencePubmedIds = [] } = {}) {
  return { name, referencePubmedIds };
}

function fakeLiterature({ citationLine, sourceUrl = null, sourceLabel = null }) {
  return { citationLine, sourceUrl, sourceLabel };
}

test("buildCitationLines: uses a resolved publication's own citation line", () => {
  const neuron = fakeNeuron({ name: 'JV1192_1' });
  const literature = [fakeLiterature({ citationLine: 'Some Author (2020). A paper title. Some Journal.' })];

  const result = buildCitationLines(neuron, literature);

  assert.equal(result.lines[0], 'Some Author (2020). A paper title. Some Journal.');
  assert.ok(result.lines.includes(ATTRIBUTION_LINE), 'always includes the required NeuroMorpho attribution');
  assert.ok(result.lines.includes('Neuron ID for citation: JV1192_1'));
});

test('buildCitationLines: falls back to a plain PMID line when nothing could be looked up', () => {
  const neuron = fakeNeuron({ referencePubmedIds: ['12345678'] });

  const result = buildCitationLines(neuron, []);

  assert.equal(result.lines[0], 'See the original publication(s): PMID 12345678.');
  assert.deepEqual(result.sources, [], 'an unresolved reference id never becomes a link');
});

test('buildCitationLines: says so plainly when there is no reference at all', () => {
  const neuron = fakeNeuron({ referencePubmedIds: [] });

  const result = buildCitationLines(neuron, []);

  assert.equal(result.lines[0], 'Original publication not linked in the database record.');
});

test('buildCitationLines: only a resolved publication with a real identifier becomes a source link', () => {
  const neuron = fakeNeuron();
  const literature = [
    fakeLiterature({ citationLine: 'Has a DOI.', sourceUrl: 'https://doi.org/10.1/x', sourceLabel: 'doi: 10.1/x' }),
    fakeLiterature({ citationLine: 'Has no identifier at all.' }),
  ];

  const result = buildCitationLines(neuron, literature);

  assert.deepEqual(result.sources, [{ label: 'doi: 10.1/x', url: 'https://doi.org/10.1/x' }]);
});
