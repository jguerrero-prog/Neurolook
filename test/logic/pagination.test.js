import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPageWindow, buildResultRangeLabel } from '../../public/js/logic/pagination.js';

test('buildPageWindow: a single page shows no page links and no previous/next', () => {
  const result = buildPageWindow(0, 1);
  assert.deepEqual(result, {
    pages: [],
    hasPrevious: false,
    hasNext: false,
    showFirstPageLink: false,
    showLastPageLink: false,
  });
});

test('buildPageWindow: the first page of many shows a next link but no previous link', () => {
  const result = buildPageWindow(0, 10);
  assert.deepEqual(result.pages, [0, 1, 2, 3, 4]);
  assert.equal(result.hasPrevious, false);
  assert.equal(result.hasNext, true);
  assert.equal(result.showFirstPageLink, false, 'page 0 is already visible, so no separate shortcut is needed');
  assert.equal(result.showLastPageLink, true, 'the last page is not in the visible window');
});

test('buildPageWindow: a page in the middle shows both previous and next links', () => {
  const result = buildPageWindow(5, 20);
  assert.deepEqual(result.pages, [3, 4, 5, 6, 7]);
  assert.equal(result.hasPrevious, true);
  assert.equal(result.hasNext, true);
  assert.equal(result.showFirstPageLink, true);
  assert.equal(result.showLastPageLink, true);
});

test('buildPageWindow: the last page shows a previous link but no next link', () => {
  const result = buildPageWindow(9, 10);
  assert.equal(result.hasPrevious, true);
  assert.equal(result.hasNext, false);
});

test('buildResultRangeLabel: zero total results', () => {
  assert.equal(buildResultRangeLabel(0, 12, 0, 0), 'No results');
});

test('buildResultRangeLabel: the first page of results', () => {
  assert.equal(buildResultRangeLabel(0, 12, 12, 100), 'Showing 1–12 of 100');
});

test('buildResultRangeLabel: a later page with fewer results than a full page', () => {
  assert.equal(buildResultRangeLabel(2, 12, 6, 30), 'Showing 25–30 of 30');
});

test('buildResultRangeLabel: adds thousands separators to large totals', () => {
  assert.equal(buildResultRangeLabel(0, 12, 12, 298339), 'Showing 1–12 of 298,339');
});
