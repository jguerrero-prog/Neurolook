import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchKnownFilterValue } from '../../public/js/logic/searchTermMatch.js';

const VALUES_BY_FIELD = {
  species: ['mouse', 'rat', 'zebrafish', 'human'],
  brain_region: ['neocortex', 'hippocampus'],
  cell_type: ['pyramidal cell', 'interneuron'],
  archive: ['Ascoli', 'Wearne_Hof'],
};

test('matchKnownFilterValue: an exact match on species', () => {
  assert.deepEqual(matchKnownFilterValue('mouse', VALUES_BY_FIELD), { field: 'species', value: 'mouse' });
});

test('matchKnownFilterValue: matching does not care about uppercase or lowercase', () => {
  assert.deepEqual(matchKnownFilterValue('MOUSE', VALUES_BY_FIELD), { field: 'species', value: 'mouse' });
});

test('matchKnownFilterValue: extra spaces around the typed term are ignored', () => {
  assert.deepEqual(matchKnownFilterValue('  mouse  ', VALUES_BY_FIELD), { field: 'species', value: 'mouse' });
});

test('matchKnownFilterValue: a term with no exact match anywhere returns null', () => {
  assert.equal(matchKnownFilterValue('fruitfly', VALUES_BY_FIELD), null);
});

test('matchKnownFilterValue: an empty search term is never treated as a match', () => {
  assert.equal(matchKnownFilterValue('', VALUES_BY_FIELD), null);
  assert.equal(matchKnownFilterValue('   ', VALUES_BY_FIELD), null);
});

test('matchKnownFilterValue: matches a value that only exists in a non-species field', () => {
  assert.deepEqual(matchKnownFilterValue('hippocampus', VALUES_BY_FIELD), {
    field: 'brain_region',
    value: 'hippocampus',
  });
});
