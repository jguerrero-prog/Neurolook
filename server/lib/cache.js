import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const CACHE_DIR = new URL('../../data/cache/', import.meta.url);

function fileForKey(key) {
  const hash = createHash('sha256').update(key).digest('hex');
  return new URL(`${hash}.json`, CACHE_DIR);
}

export async function getCached(key) {
  try {
    const raw = await readFile(fileForKey(key), 'utf8');
    const entry = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) return null;
    return entry.value;
  } catch {
    return null;
  }
}

export async function setCached(key, value, ttlMs) {
  await mkdir(CACHE_DIR, { recursive: true });
  const entry = { key, value, cachedAt: Date.now(), expiresAt: Date.now() + ttlMs };
  await writeFile(fileForKey(key), JSON.stringify(entry), 'utf8');
}
