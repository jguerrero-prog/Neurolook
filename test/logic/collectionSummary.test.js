import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCollection } from '../../public/js/logic/collectionSummary.js';

test('summarizeCollection: an empty collection has no summary text', () => {
  const result = summarizeCollection([]);

  assert.deepEqual(result, { total: 0, cachedCount: 0, metadataOnlyCount: 0, summaryText: '' });
});

test('summarizeCollection: exactly one neuron uses the singular word "neuron"', () => {
  const result = summarizeCollection([{ cached: true }]);

  assert.equal(result.summaryText, '1 neuron saved locally · 1 cached offline, 0 metadata only');
});

test('summarizeCollection: several neurons uses the plural word "neurons"', () => {
  const items = [{ cached: true }, { cached: false }, { cached: true }];

  const result = summarizeCollection(items);

  assert.equal(result.total, 3);
  assert.equal(result.cachedCount, 2);
  assert.equal(result.metadataOnlyCount, 1);
  assert.equal(result.summaryText, '3 neurons saved locally · 2 cached offline, 1 metadata only');
});
