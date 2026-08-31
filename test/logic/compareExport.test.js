import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCompareCsv } from '../../public/js/logic/compareExport.js';

test('buildCompareCsv: one row per neuron, one column per field, labeled by section', () => {
  const neuronNames = ['NMO_00001', 'NMO_00002'];
  const sections = [
    {
      title: 'Organism',
      rows: [
        { label: 'Species', values: ['mouse', 'rat'] },
        { label: 'Strain', values: ['C57BL/6', 'Sprague-Dawley'] },
      ],
    },
  ];

  const csv = buildCompareCsv(neuronNames, sections);
  const [header, row1, row2] = csv.split('\n');

  assert.equal(header, 'Neuron ID,Organism: Species,Organism: Strain');
  assert.equal(row1, 'NMO_00001,mouse,C57BL/6');
  assert.equal(row2, 'NMO_00002,rat,Sprague-Dawley');
});

test('buildCompareCsv: a value with a comma is quoted so it stays one column', () => {
  const csv = buildCompareCsv(['NMO_00001'], [{ title: 'Notes', rows: [{ label: 'Note', values: ['a, b'] }] }]);

  assert.equal(csv, 'Neuron ID,Notes: Note\nNMO_00001,"a, b"');
});

test('buildCompareCsv: a quote inside a value is doubled, matching standard CSV escaping', () => {
  const csv = buildCompareCsv(['NMO_00001'], [{ title: 'Notes', rows: [{ label: 'Note', values: ['say "hi"'] }] }]);

  assert.equal(csv, 'Neuron ID,Notes: Note\nNMO_00001,"say ""hi"""');
});

test('buildCompareCsv: a missing value becomes an empty column, not the word "undefined"', () => {
  const csv = buildCompareCsv(['NMO_00001'], [{ title: 'Notes', rows: [{ label: 'Note', values: [undefined] }] }]);

  assert.equal(csv, 'Neuron ID,Notes: Note\nNMO_00001,');
});
