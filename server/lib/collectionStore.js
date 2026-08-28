import { mkdir, readFile, writeFile } from 'node:fs/promises';

const STORE_PATH = new URL('../../data/collection.json', import.meta.url);
const DATA_DIR = new URL('../../data/', import.meta.url);

// Persists the user's saved neurons to a single JSON file on disk. This is
// separate from the API response cache: the cache is disposable and rebuilt
// automatically, but the collection is data the user deliberately chose to keep.
export class CollectionStore {
  constructor() {
    this.items = new Map();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    try {
      const raw = await readFile(STORE_PATH, 'utf8');
      for (const record of JSON.parse(raw)) {
        this.items.set(record.neuron_name, record);
      }
    } catch {
      // No collection saved yet.
    }
    this.loaded = true;
  }

  async persist() {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(STORE_PATH, JSON.stringify([...this.items.values()], null, 2), 'utf8');
  }

  async list() {
    await this.load();
    return [...this.items.values()];
  }

  async add(record) {
    await this.load();
    this.items.set(record.neuron_name, { ...record, savedAt: Date.now() });
    await this.persist();
  }

  async remove(neuronName) {
    await this.load();
    this.items.delete(neuronName);
    await this.persist();
  }
}

export const collectionStore = new CollectionStore();
