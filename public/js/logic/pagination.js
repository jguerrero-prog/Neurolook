// @ts-check

// Pure pagination math: given where we are, which page numbers should be
// shown as links. No DOM, no URLs — the view decides how to render this.
const WINDOW_SIZE = 5;

/**
 * @typedef {Object} PageWindow
 * @property {number[]} pages Page numbers to show as direct links, zero-based.
 * @property {boolean} hasPrevious Whether a "previous page" link makes sense.
 * @property {boolean} hasNext Whether a "next page" link makes sense.
 * @property {boolean} showFirstPageLink Whether a separate shortcut to page 1 is needed.
 * @property {boolean} showLastPageLink Whether a separate shortcut to the last page is needed.
 */

/**
 * @param {number} currentPage Zero-based index of the page being viewed.
 * @param {number} totalPages Total number of pages available.
 * @returns {PageWindow}
 */
export function buildPageWindow(currentPage, totalPages) {
  if (totalPages <= 1) {
    return { pages: [], hasPrevious: false, hasNext: false, showFirstPageLink: false, showLastPageLink: false };
  }

  const start = Math.max(0, currentPage - 2);
  const end = Math.min(totalPages, start + WINDOW_SIZE);

  return {
    pages: Array.from({ length: end - start }, (_, index) => start + index),
    hasPrevious: currentPage > 0,
    hasNext: currentPage < totalPages - 1,
    // The visible page-number window doesn't always reach the first/last
    // page (e.g. hundreds of pages of results) — a direct shortcut is the
    // only way to reach either otherwise.
    showFirstPageLink: start > 0,
    showLastPageLink: end < totalPages,
  };
}

/**
 * @param {number} currentPage Zero-based index of the page being viewed.
 * @param {number} pageSize How many results are shown per page.
 * @param {number} resultCount How many results are actually on this page.
 * @param {number} totalElements The total number of matching results across every page.
 * @returns {string} A label like "Showing 1–12 of 100", or "No results".
 */
export function buildResultRangeLabel(currentPage, pageSize, resultCount, totalElements) {
  if (totalElements === 0) return 'No results';
  const start = resultCount === 0 ? 0 : currentPage * pageSize + 1;
  const end = currentPage * pageSize + resultCount;
  return `Showing ${start}–${end} of ${totalElements.toLocaleString()}`;
}
