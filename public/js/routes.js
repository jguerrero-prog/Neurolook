// Centralizes how one page links to another, so view code never hand-builds
// query strings inline.
export function buildNeuronDetailUrl(neuronName) {
  return `/neuron.html?name=${encodeURIComponent(neuronName)}`;
}

export function buildBrowseUrl(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return `/browse.html?${query.toString()}`;
}

export function buildCompareUrl(neuronNames) {
  return `/compare.html?names=${neuronNames.map(encodeURIComponent).join(',')}`;
}
