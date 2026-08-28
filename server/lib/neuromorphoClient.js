import { getCached, setCached } from './cache.js';

const BASE_URL = 'https://neuromorpho.org/api';
const SIMILARITY_BASE_URL = 'https://neuromorpho.org/similarity';
const USER_AGENT = 'Neurolook/0.1 (local personal NeuroMorpho browser; non-commercial)';
const REQUEST_SPACING_MS = 200;

const HOUR = 60 * 60 * 1000;

// NeuroMorpho's terms ask API clients to throttle programmatic queries.
// This chains every outgoing request onto the previous one with a fixed gap,
// so Neurolook never fires requests in a burst regardless of how many pages load at once.
let requestQueue = Promise.resolve();

function schedule(task) {
  const result = requestQueue.then(task);
  requestQueue = result.then(
    () => new Promise((resolve) => setTimeout(resolve, REQUEST_SPACING_MS)),
    () => new Promise((resolve) => setTimeout(resolve, REQUEST_SPACING_MS))
  );
  return result;
}

async function fetchJson(path) {
  const url = `${BASE_URL}${path}`;
  const cached = await getCached(url);
  if (cached) return cached;

  const response = await schedule(() =>
    fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
  );
  if (!response.ok) {
    throw new Error(`NeuroMorpho API returned ${response.status} for ${path}`);
  }
  return response.json();
}

async function fetchJsonCached(path, ttlMs) {
  const url = `${BASE_URL}${path}`;
  const cached = await getCached(url);
  if (cached) return cached;

  const payload = await fetchJson(path);
  await setCached(url, payload, ttlMs);
  return payload;
}

export async function getTotalNeuronCount() {
  const payload = await fetchJsonCached('/neuron?size=1', 6 * HOUR);
  return payload.page.totalElements;
}

export async function getFieldCount(field) {
  const payload = await fetchJsonCached(`/neuron/fields/${field}?size=1`, 6 * HOUR);
  return payload.page.totalElements;
}

export async function getFieldValues(field) {
  const payload = await fetchJsonCached(`/neuron/fields/${field}?size=500`, 24 * HOUR);
  return payload.fields;
}

// Partition endpoints are paginated (max 500 entries per page). This walks every
// page and merges them so category counts reflect the whole database, not page one.
export async function getPartition(field) {
  const firstPage = await fetchJsonCached(`/neuron/partition/${field}?page=0&size=500`, 6 * HOUR);
  const merged = { ...firstPage.fields };

  for (let page = 1; page < firstPage.page.totalPages; page += 1) {
    const nextPage = await fetchJsonCached(`/neuron/partition/${field}?page=${page}&size=500`, 6 * HOUR);
    Object.assign(merged, nextPage.fields);
  }
  return merged;
}

export async function getNeuronByName(name) {
  return fetchJsonCached(`/neuron/name/${encodeURIComponent(name)}`, 24 * HOUR);
}

export async function getNeuronById(id) {
  return fetchJsonCached(`/neuron/id/${id}`, 24 * HOUR);
}

export async function getMorphometryByName(name) {
  return fetchJsonCached(`/morphometry/name/${encodeURIComponent(name)}`, 24 * HOUR);
}

// Reports whether a neuron's own record is already on disk, without
// triggering a fetch — used to show a "served from cache" indicator.
export async function isNeuronCached(name) {
  const url = `${BASE_URL}/neuron/name/${encodeURIComponent(name)}`;
  return (await getCached(url)) !== null;
}

export async function getLiteratureByPmid(pmid) {
  const payload = await fetchJsonCached(`/literature/select?q=pmid:${encodeURIComponent(pmid)}`, 7 * 24 * HOUR);
  return payload._embedded?.publicationResources?.[0] ?? null;
}

// Picks one neuron at random from the whole database by jumping to a random
// page index (each page holds one record), matching NeuroMorpho's own
// "random cells" feature.
export async function getRandomNeuronName() {
  const total = await getTotalNeuronCount();
  const randomIndex = Math.floor(Math.random() * total);
  const payload = await fetchJson(`/neuron?page=${randomIndex}&size=1`);
  return payload._embedded?.neuronResources?.[0]?.neuron_name ?? null;
}

// The `q` parameter's parser splits a multi-word value (e.g. "dentate gyrus")
// into separate terms unless it's quoted, which 404s instead of matching —
// so every comma-separated value going into `q` gets quoted individually.
// The one exception is a wildcard search (neuron_name:cnic_001*): quoting
// disables the wildcard entirely, so a value containing `*` is left unquoted.
// `fq` is the opposite: it handles raw multi-word/multi-value text fine and
// 404s if a value is quoted at all, so `fq` values are always left as-is.
function formatPrimaryQueryValue(value) {
  return value
    .split(',')
    .map((segment) => (segment.includes('*') ? segment : `"${segment}"`))
    .join(',');
}

// criteria: array of { field, value }. The first entry becomes the primary `q`
// match, every other entry becomes an additional `fq` (AND) filter, matching
// the query syntax documented at neuromorpho.org/apiReference.html.
export async function searchNeurons(criteria, { size = 12, page = 0, sort = '' } = {}) {
  if (criteria.length === 0) {
    throw new Error('searchNeurons requires at least one criterion');
  }
  const params = new URLSearchParams();
  params.set('q', `${criteria[0].field}:${formatPrimaryQueryValue(criteria[0].value)}`);
  for (const { field, value } of criteria.slice(1)) {
    params.append('fq', `${field}:${value}`);
  }
  params.set('size', String(size));
  params.set('page', String(page));
  if (sort) params.set('sort', sort);

  const response = await schedule(() =>
    fetch(`${BASE_URL}/neuron/select?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
  );

  // The API returns 404 both for a malformed query and for a well-formed
  // one that simply matches nothing — there's no way to tell those apart
  // from the status code alone, so a 404 here is treated as zero results.
  if (response.status === 404) {
    return { neurons: [], totalElements: 0, totalPages: 0 };
  }
  if (!response.ok) {
    throw new Error(`NeuroMorpho API returned ${response.status} for /neuron/select`);
  }

  const payload = await response.json();
  return {
    neurons: payload._embedded?.neuronResources ?? [],
    totalElements: payload.page.totalElements,
    totalPages: payload.page.totalPages,
  };
}

// NeuroMorpho's similarity-search service (github.com/NeuroMorpho/similarity-search),
// deployed live at neuromorpho.org/similarity — a separate service from the
// main REST API, documented in that repo's README rather than apiReference.html.
// searchType: 0 = FAISS, 1 = Pearson correlation, 2 = both combined.
export async function getSimilarNeurons(neuronId, { usePCA = 0, count = 8, searchType = 1 } = {}) {
  const url = `${SIMILARITY_BASE_URL}/similarNeurons/${usePCA}/${neuronId}/${count}/${searchType}`;
  const cached = await getCached(url);
  if (cached) return cached;

  const response = await schedule(() =>
    fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
  );
  if (!response.ok) {
    throw new Error(`NeuroMorpho similarity service returned ${response.status}`);
  }
  const payload = await response.json();
  const results = payload.similarityresult ?? [];
  await setCached(url, results, 24 * HOUR);
  return results;
}

export async function downloadSwcFile(archive, neuronName) {
  const url = `https://neuromorpho.org/dableFiles/${archive.toLowerCase()}/CNG%20version/${neuronName}.CNG.swc`;
  const response = await schedule(() => fetch(url, { headers: { 'User-Agent': USER_AGENT } }));
  if (!response.ok) {
    throw new Error(`Could not download SWC file for ${neuronName} (${response.status})`);
  }
  return response.text();
}
