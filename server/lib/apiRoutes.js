// @ts-check
import * as neuromorpho from './neuromorphoClient.js';
import { collectionStore } from './collectionStore.js';
import { isCachedLocally, ensureSwcCached } from './swcStore.js';

export class HttpError extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const LISTABLE_FILTER_FIELDS = new Set(['species', 'brain_region', 'archive']);
const FACETABLE_FIELDS = new Set(['species', 'brain_region', 'cell_type', 'archive']);

// Every export here is a request handler wired directly to an /api/* route
// in server.js — the "handle" prefix marks that boundary. Server-only
// business logic beyond simple field lookups lives in neuromorphoClient.js.

/** @returns {Promise<{totalNeurons: number, speciesCount: number, brainRegionCount: number, archiveCount: number}>} */
export async function handleGetStats() {
  const [totalNeurons, speciesCount, brainRegionCount, archiveCount] = await Promise.all([
    neuromorpho.getTotalNeuronCount(),
    neuromorpho.getFieldCount('species'),
    neuromorpho.getFieldCount('brain_region'),
    neuromorpho.getFieldCount('archive'),
  ]);
  return { totalNeurons, speciesCount, brainRegionCount, archiveCount };
}

/** @param {string} field @returns {Promise<{field: string, values: string[]}>} */
export async function handleGetFilterValues(field) {
  if (!LISTABLE_FILTER_FIELDS.has(field)) {
    throw new HttpError(400, `Unknown filter field: ${field}`);
  }
  return { field, values: await neuromorpho.getFieldValues(field) };
}

// Returns a field's distinct values ranked by how many neurons carry each one.
// cell_type has thousands of raw values, too many for a dropdown, so the
// homepage category cards and every browse-page facet draw from this
// count-ranked list rather than the raw distinct-values endpoint.
/** @param {string} field @param {number} limit @returns {Promise<Array<{value: string, count: number}>>} */
export async function handleGetFacetCounts(field, limit) {
  if (!FACETABLE_FIELDS.has(field)) {
    throw new HttpError(400, `Unknown facet field: ${field}`);
  }
  const partition = await neuromorpho.getPartition(field);
  return Object.entries(partition)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

/**
 * @typedef {Object} SearchParams
 * @property {string} name
 * @property {string} species
 * @property {string} brain_region
 * @property {string} cell_type
 * @property {string} archive
 * @property {number} page
 * @property {number} size
 * @property {string} sort
 */

/**
 * @param {SearchParams} params
 * @returns {Promise<import('./neuromorphoClient.js').SearchResult>}
 */
export async function handleSearch({
  name,
  species,
  brain_region: brainRegion,
  cell_type: cellType,
  archive,
  page,
  size,
  sort,
}) {
  /** @type {import('./neuromorphoClient.js').SearchCriterion[]} */
  const criteria = [];
  if (name) criteria.push({ field: 'neuron_name', value: `${name}*` });
  if (species) criteria.push({ field: 'species', value: species });
  if (brainRegion) criteria.push({ field: 'brain_region', value: brainRegion });
  if (cellType) criteria.push({ field: 'cell_type', value: cellType });
  if (archive) criteria.push({ field: 'archive', value: archive });

  if (criteria.length === 0) {
    throw new HttpError(400, 'Provide a search term or at least one filter.');
  }
  return neuromorpho.searchNeurons(criteria, { page, size, sort });
}

/** @param {string} name @returns {Promise<any>} */
export async function handleGetNeuronDetail(name) {
  const metadataFromCache = await neuromorpho.isNeuronCached(name);
  const neuron = await neuromorpho.getNeuronByName(name);
  const referencePubmedIds = Array.isArray(neuron.reference_pmid)
    ? neuron.reference_pmid
    : [neuron.reference_pmid].filter(Boolean);

  const [morphometry, swcCached, literature] = await Promise.all([
    neuromorpho.getMorphometryByName(name).catch(() => null),
    isCachedLocally(neuron.archive, neuron.neuron_name),
    Promise.all(
      /** @type {Array<string|number>} */ (referencePubmedIds).map((pmid) =>
        neuromorpho.getLiteratureByPmid(pmid).catch(() => null),
      ),
    ),
  ]);

  return { neuron, morphometry, cached: swcCached, metadataFromCache, literature: literature.filter(Boolean) };
}

/** @returns {Promise<{name: string}>} */
export async function handleGetRandomNeuron() {
  const name = await neuromorpho.getRandomNeuronName();
  if (!name) throw new HttpError(502, 'Could not pick a random neuron.');
  return { name };
}

/** @param {string} name @returns {Promise<string>} */
export async function handleGetNeuronSwc(name) {
  const neuron = await neuromorpho.getNeuronByName(name);
  return ensureSwcCached(neuron.archive, neuron.neuron_name);
}

/** @param {string} name @returns {Promise<Array<{neuron: any, similarity: number}>>} */
export async function handleGetSimilarNeurons(name) {
  const neuron = await neuromorpho.getNeuronByName(name);
  const matches = await neuromorpho.getSimilarNeurons(neuron.neuron_id);

  const enriched = await Promise.all(
    matches
      .filter((/** @type {any} */ match) => match.neuron_id !== neuron.neuron_id)
      .map(async (/** @type {any} */ match) => {
        try {
          return { neuron: await neuromorpho.getNeuronById(match.neuron_id), similarity: match.similarity };
        } catch {
          return null;
        }
      }),
  );
  return enriched.filter(Boolean);
}

/** @returns {Promise<any[]>} */
export async function handleListCollection() {
  const items = await collectionStore.list();
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      cached: await isCachedLocally(/** @type {string} */ (item.archive), item.neuron_name),
    })),
  );
}

/** @param {import('./collectionStore.js').CollectionRecord} record @returns {Promise<void>} */
export async function handleAddToCollection(record) {
  if (!record.neuron_name || !record.archive) {
    throw new HttpError(400, 'neuron_name and archive are required.');
  }
  await collectionStore.add(record);
}

/** @param {string} name @returns {Promise<void>} */
export async function handleRemoveFromCollection(name) {
  await collectionStore.remove(name);
}

/** @param {string[]} names @returns {Promise<Array<{neuron: any, morphometry: any}>>} */
export async function handleCompareNeurons(names) {
  if (names.length < 2) {
    throw new HttpError(400, 'Provide at least two neuron names to compare.');
  }
  return Promise.all(
    names.map(async (name) => {
      const [neuron, morphometry] = await Promise.all([
        neuromorpho.getNeuronByName(name),
        neuromorpho.getMorphometryByName(name).catch(() => null),
      ]);
      return { neuron, morphometry };
    }),
  );
}
