import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  IDENTIFICATION_FIELDS,
  ORGANISM_FIELDS,
  ANATOMICAL_FIELDS,
  MORPHOMETRY_FIELDS,
  buildFieldRows,
  buildMorphometryRows,
  buildFieldComparisonRows,
} from '../../public/js/logic/neuronFields.js';

test('buildFieldRows: reads each field in the declared order', () => {
  const neuron = { nmoId: 'NMO_00001', name: 'test_neuron', archive: 'SomeLab' };

  const rows = buildFieldRows(neuron, IDENTIFICATION_FIELDS);

  assert.deepEqual(rows, [
    ['NeuroMorpho.Org ID', 'NMO_00001'],
    ['Cell Name', 'test_neuron'],
    ['Archive', 'SomeLab'],
  ]);
});

test('buildFieldRows: a missing value reads as "Not reported" instead of blank or "null"', () => {
  const neuron = { nmoId: null, name: undefined, archive: '' };

  const rows = buildFieldRows(neuron, IDENTIFICATION_FIELDS);

  assert.deepEqual(
    rows.map(([, value]) => value),
    ['Not reported', 'Not reported', 'Not reported'],
  );
});

test('buildFieldRows: a measurement field adds its unit after the number', () => {
  const neuron = { minAge: 5, ageScale: 'Day' };

  const [[label, value]] = buildFieldRows(neuron, { minAge: ORGANISM_FIELDS.minAge });

  assert.equal(label, 'Min Age');
  assert.equal(value, '5 day');
});

test('buildFieldRows: a missing lower-tier brain region or cell type reads as "Not reported"', () => {
  const neuron = { brainRegionTiers: ['cerebral cortex'], cellTypeTiers: ['principal cell'] };

  const rows = buildFieldRows(neuron, ANATOMICAL_FIELDS);
  const bySection = Object.fromEntries(rows);

  assert.equal(bySection['Primary Brain Region'], 'cerebral cortex');
  assert.equal(bySection['Secondary Brain Region'], 'Not reported');
  assert.equal(bySection['Tertiary Brain Region'], 'Not reported');
});

test('buildMorphometryRows: no measurements available for this neuron', () => {
  const rows = buildMorphometryRows({ isAvailable: false });

  assert.deepEqual(rows, [['Morphometry', 'Not available for this neuron']]);
});

test('buildMorphometryRows: reads the real measurement fields when available', () => {
  const morphometry = { isAvailable: true, stemCount: 4, width: 120.5 };

  const rows = buildMorphometryRows(morphometry);
  const bySection = Object.fromEntries(rows);

  assert.equal(bySection['Number of Stems'], '4');
  assert.equal(bySection['Overall Width'], '120.5 μm');
});

test('buildFieldComparisonRows: flags a field where the compared neurons differ', () => {
  const neurons = [{ species: 'mouse' }, { species: 'rat' }];

  const [row] = buildFieldComparisonRows(neurons, { species: ORGANISM_FIELDS.species });

  assert.deepEqual(row.values, ['mouse', 'rat']);
  assert.equal(row.differs, true);
});

test('buildFieldComparisonRows: does not flag a field where the compared neurons agree', () => {
  const neurons = [{ species: 'mouse' }, { species: 'mouse' }];

  const [row] = buildFieldComparisonRows(neurons, { species: ORGANISM_FIELDS.species });

  assert.equal(row.differs, false);
});

test('MORPHOMETRY_FIELDS: every field has both a label and a value getter', () => {
  for (const [key, field] of Object.entries(MORPHOMETRY_FIELDS)) {
    assert.equal(typeof field.label, 'string', `${key} is missing a label`);
    assert.equal(typeof field.get, 'function', `${key} is missing a value getter`);
  }
});
