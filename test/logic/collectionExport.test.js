import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCollectionCsv } from '../../public/js/logic/collectionExport.js';

function fakeEntry({ name, species, cellType, brainRegion, archive, cached }) {
  return { neuron: { name, species, cellType, brainRegion, archive }, cached };
}

test('buildCollectionCsv: one row per saved neuron, with a fixed header', () => {
  const entries = [
    fakeEntry({
      name: 'NMO_00001',
      species: 'mouse',
      cellType: 'pyramidal cell',
      brainRegion: 'neocortex',
      archive: 'SomeLab',
      cached: true,
    }),
  ];

  const csv = buildCollectionCsv(entries);
  const [header, row] = csv.split('\n');

  assert.equal(header, 'Neuron Name,Species,Cell Type,Brain Region,Archive,Cached Offline');
  assert.equal(row, 'NMO_00001,mouse,pyramidal cell,neocortex,SomeLab,yes');
});

test('buildCollectionCsv: a neuron that has not been downloaded is marked "no"', () => {
  const entries = [fakeEntry({ name: 'NMO_00002', species: 'rat', cached: false })];

  const csv = buildCollectionCsv(entries);

  assert.ok(csv.endsWith(',no'));
});

test('buildCollectionCsv: an empty collection still produces just the header row', () => {
  const csv = buildCollectionCsv([]);

  assert.equal(csv, 'Neuron Name,Species,Cell Type,Brain Region,Archive,Cached Offline');
});
