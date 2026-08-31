// @ts-check
import { api } from './api.js';

// Shows the saved-neuron count badge next to "My Collection" in the header,
// on every page. Silently stays hidden if the collection can't be loaded.
/** @returns {Promise<void>} */
export async function initCollectionBadge() {
  const collectionBadge = document.getElementById('collection-count');
  if (!collectionBadge) return;

  try {
    const collectionEntries = await api.getCollection();
    if (collectionEntries.length > 0) {
      collectionBadge.textContent = String(collectionEntries.length);
      collectionBadge.hidden = false;
    } else {
      collectionBadge.hidden = true;
    }
  } catch {
    collectionBadge.hidden = true;
  }
}
