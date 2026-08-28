import { access, mkdir, readFile, writeFile, constants as fsConstants } from 'node:fs/promises';
import { downloadSwcFile } from './neuromorphoClient.js';

const SWC_DIR = new URL('../../data/swc/', import.meta.url);

function localPathFor(archive, neuronName) {
  return new URL(`${archive.toLowerCase()}/${neuronName}.CNG.swc`, SWC_DIR);
}

export async function isCachedLocally(archive, neuronName) {
  try {
    await access(localPathFor(archive, neuronName), fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Returns the SWC file text, downloading and saving it to disk on first
// request. Every request after that reads straight from disk.
export async function ensureSwcCached(archive, neuronName) {
  if (await isCachedLocally(archive, neuronName)) {
    return readFile(localPathFor(archive, neuronName), 'utf8');
  }
  const text = await downloadSwcFile(archive, neuronName);
  await mkdir(new URL(`${archive.toLowerCase()}/`, SWC_DIR), { recursive: true });
  await writeFile(localPathFor(archive, neuronName), text, 'utf8');
  return text;
}
