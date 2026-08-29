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
  } catch (error) {
    // A missing file just means this key was never cached — expected, not
    // worth logging. Anything else (corrupted JSON, a permissions error, a
    // full disk) still falls back to a fresh fetch, but silently swallowing
    // it too would hide a real problem, so it's logged here instead.
    if (error.code !== 'ENOENT') console.error(`Cache read failed for ${key}:`, error);
    return null;
  }
}

export async function setCached(key, value, ttlMs) {
  await mkdir(CACHE_DIR, { recursive: true });
  const entry = { key, value, cachedAt: Date.now(), expiresAt: Date.now() + ttlMs };
  await writeFile(fileForKey(key), JSON.stringify(entry), 'utf8');
}
