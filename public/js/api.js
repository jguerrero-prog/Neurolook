import { Neuron } from './models/Neuron.js';
import { Morphometry } from './models/Morphometry.js';
import { Literature } from './models/Literature.js';

const REQUEST_TIMEOUT_MS = 15_000;

// The sole network client for Neurolook's own local server (never called
// directly from view code). Every method here returns model instances, not
// raw JSON, so widgets never see the wire format.
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
    if (error.name === 'AbortError') {
      throw new Error('The request timed out. Check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  getStats: () => request('/api/stats'),
  getFilterValues: (field) => request(`/api/filters/${field}`),
  getCategories: (limit = 6) => request(`/api/categories?limit=${limit}`),
  getFacetCounts: (field, limit = 30) => request(`/api/facets/${field}?limit=${limit}`),

  async search(params) {
    const payload = await request(`/api/search?${new URLSearchParams(params)}`);
    return {
      neurons: payload.neurons.map((record) => new Neuron(record)),
      totalElements: payload.totalElements,
      totalPages: payload.totalPages,
    };
  },

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

  getSwcUrl: (name) => `/api/neuron/${encodeURIComponent(name)}/swc`,
  getRandomNeuron: () => request('/api/random-neuron'),

  async getSimilarNeurons(name) {
    const payload = await request(`/api/neuron/${encodeURIComponent(name)}/similar`);
    return payload.map((entry) => ({ neuron: new Neuron(entry.neuron), similarity: entry.similarity }));
  },

  async getCollection() {
    const payload = await request('/api/collection');
    return payload.map((record) => ({ neuron: new Neuron(record), cached: record.cached }));
  },

  addToCollection: (neuron) =>
    request('/api/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(neuron.toCollectionRecord()),
    }),

  removeFromCollection: (name) => request(`/api/collection/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  async compare(names) {
    const payload = await request(`/api/compare?names=${names.map(encodeURIComponent).join(',')}`);
    return payload.map((entry) => ({
      neuron: new Neuron(entry.neuron),
      morphometry: new Morphometry(entry.morphometry),
    }));
  },
};
