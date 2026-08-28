const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

// Several NeuroMorpho fields (brain_region, cell_type) are arrays of tags
// rather than a single string; this renders either shape as one readable line.
export function joinField(value) {
  return Array.isArray(value) ? value.join(', ') : value ?? '';
}

const NEUROMORPHO_ORIGIN = 'https://neuromorpho.org/';
const SIMPLE_ANCHOR_PATTERN = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

function resolveNeuroMorphoHref(href) {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:')) return trimmed;
  return NEUROMORPHO_ORIGIN + trimmed.replace(/^\//, '');
}

// Some NeuroMorpho text fields (notably `note`) embed plain <a href="...">
// links rather than being pure text. This allows through ONLY that exact
// anchor pattern — every other character, including any other tag, is
// escaped as literal text — and resolves relative hrefs against
// neuromorpho.org, since they're written relative to that site, not ours.
export function linkifyRestrictedHtml(text) {
  if (!text) return '';
  let html = '';
  let lastIndex = 0;

  for (const match of text.matchAll(SIMPLE_ANCHOR_PATTERN)) {
    const [fullMatch, href, linkText] = match;
    html += escapeHtml(text.slice(lastIndex, match.index));
    html += `<a href="${escapeHtml(resolveNeuroMorphoHref(href))}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkText)}</a>`;
    lastIndex = match.index + fullMatch.length;
  }
  html += escapeHtml(text.slice(lastIndex));
  return html;
}
