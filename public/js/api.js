// @ts-check
import { Neuron } from './models/Neuron.js';
import { Morphometry } from './models/Morphometry.js';
import { Literature } from './models/Literature.js';

const REQUEST_TIMEOUT_MS = 15_000;

// The sole network client for Neurolook's own local server (never called
// directly from view code). Every method here returns model instances, not
// raw JSON, so widgets never have to read the server's raw field names directly.
/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function request(path, options) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(path, { ...options, signal: abortController.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || `Request failed with status ${response.status}`);
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The request timed out. Check your connection and try again.', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  /** @returns {Promise<{totalNeurons: number, speciesCount: number, brainRegionCount: number, archiveCount: number}>} */
  getStats: () => request('/api/stats'),
  /** @param {string} field @returns {Promise<{field: string, values: string[]}>} */
  getFilterValues: (field) => request(`/api/filters/${field}`),
  /** @param {number} [limit] @returns {Promise<Array<{value: string, count: number}>>} */
  getCategories: (limit = 6) => request(`/api/categories?limit=${limit}`),
  /** @param {string} field @param {number} [limit] @returns {Promise<Array<{value: string, count: number}>>} */
  getFacetCounts: (field, limit = 30) => request(`/api/facets/${field}?limit=${limit}`),

  /**
   * @param {Record<string, string|number>} params
   * @returns {Promise<{neurons: Neuron[], totalElements: number, totalPages: number}>}
   */
  async search(params) {
    const payload = await request(`/api/search?${new URLSearchParams(/** @type {Record<string,string>} */ (params))}`);
    return {
      neurons: payload.neurons.map((record) => new Neuron(record)),
      totalElements: payload.totalElements,
      totalPages: payload.totalPages,
    };
  },

  /**
   * @param {string} name
   * @returns {Promise<{neuron: Neuron, morphometry: Morphometry, cached: boolean, metadataFromCache: boolean, literature: Literature[]}>}
   */
  async getNeuron(name) {
    const payload = await request(`/api/neuron/${encodeURIComponent(name)}`);
    return {
      neuron: new Neuron(payload.neuron),
      morphometry: new Morphometry(payload.morphometry),
      cached: payload.cached,
      metadataFromCache: payload.metadataFromCache,
      literature: payload.literature.map((record) => new Literature(record)),
    };
  },

  /** @param {string} name @returns {string} */
  getSwcUrl: (name) => `/api/neuron/${encodeURIComponent(name)}/swc`,
  /** @returns {Promise<{name: string}>} */
  getRandomNeuron: () => request('/api/random-neuron'),

  /**
   * @param {string} name
   * @returns {Promise<Array<{neuron: Neuron, similarity: number}>>}
   */
  async getSimilarNeurons(name) {
    const payload = await request(`/api/neuron/${encodeURIComponent(name)}/similar`);
    return payload.map((entry) => ({ neuron: new Neuron(entry.neuron), similarity: entry.similarity }));
  },

  /** @returns {Promise<Array<{neuron: Neuron, cached: boolean}>>} */
  async getCollection() {
    const payload = await request('/api/collection');
    return payload.map((record) => ({ neuron: new Neuron(record), cached: record.cached }));
  },

  /** @param {Neuron} neuron @returns {Promise<any>} */
  addToCollection: (neuron) =>
    request('/api/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(neuron.toCollectionRecord()),
    }),

  /** @param {string} name @returns {Promise<any>} */
  removeFromCollection: (name) => request(`/api/collection/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  /**
   * @param {string[]} names
   * @returns {Promise<Array<{neuron: Neuron, morphometry: Morphometry}>>}
   */
  async compare(names) {
    const payload = await request(`/api/compare?names=${names.map(encodeURIComponent).join(',')}`);
    return payload.map((entry) => ({
      neuron: new Neuron(entry.neuron),
      morphometry: new Morphometry(entry.morphometry),
    }));
  },
};
