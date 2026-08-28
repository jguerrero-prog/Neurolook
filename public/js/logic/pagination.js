// Pure pagination math: given where we are, which page numbers should be
// shown as links. No DOM, no URLs — the view decides how to render this.
const WINDOW_SIZE = 5;

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

export function buildResultRangeLabel(currentPage, pageSize, resultCount, totalElements) {
  if (totalElements === 0) return 'No results';
  const start = resultCount === 0 ? 0 : currentPage * pageSize + 1;
  const end = currentPage * pageSize + resultCount;
  return `Showing ${start}–${end} of ${totalElements.toLocaleString()}`;
}
