// @ts-check

// Centralizes how one page links to another, so view code never hand-builds
// query strings inline.
/**
 * @param {string} neuronName
 * @returns {string}
 */
export function buildNeuronDetailUrl(neuronName) {
  return `/neuron.html?name=${encodeURIComponent(neuronName)}`;
}

/**
 * @param {Object<string, string|undefined>} params
 * @returns {string}
 */
export function buildBrowseUrl(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return `/browse.html?${query.toString()}`;
}

/**
 * @param {string[]} neuronNames
 * @returns {string}
 */
export function buildCompareUrl(neuronNames) {
  return `/compare.html?names=${neuronNames.map(encodeURIComponent).join(',')}`;
}
