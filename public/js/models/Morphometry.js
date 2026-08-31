// @ts-check

/**
 * @typedef {Object} MorphometryPayload
 * The raw morphometry measurements NeuroMorpho's API returns for one neuron.
 * @property {number} [n_stems]
 * @property {number} [n_bifs]
 * @property {number} [n_branch]
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [depth]
 * @property {number} [diameter]
 * @property {number} [soma_Surface]
 * @property {number} [length]
 * @property {number} [surface]
 * @property {number} [volume]
 * @property {number} [eucDistance]
 * @property {number} [pathDistance]
 * @property {number} [branch_Order]
 * @property {number} [contraction]
 * @property {number} [fragmentation]
 * @property {number} [partition_asymmetry]
 * @property {number} [pk_classic]
 * @property {number} [bif_ampl_local]
 * @property {number} [bif_ampl_remote]
 * @property {number} [fractal_Dim]
 */

// Wraps a raw morphometry JSON payload. A neuron can legitimately have none
// (the endpoint 404s for some records), so every getter is null-safe rather
// than assuming the payload exists. Field names/labels here match NeuroMorpho's
// own neuron_info.jsp page exactly, not a curated subset.
export class Morphometry {
  /** @param {MorphometryPayload|null|undefined} payload */
  constructor(payload) {
    /** @type {MorphometryPayload|null|undefined} */
    this.raw = payload;
  }

  /** @returns {boolean} True if this neuron actually has morphometry data. */
  get isAvailable() { return this.raw != null; }

  /** @returns {number|undefined} The number of stems (branches leaving the soma). */
  get stemCount() { return this.raw?.n_stems; }
  /** @returns {number|undefined} The number of bifurcation points. */
  get bifurcationCount() { return this.raw?.n_bifs; }
  /** @returns {number|undefined} The number of branches. */
  get branchCount() { return this.raw?.n_branch; }
  /** @returns {number|undefined} The overall width of the reconstruction, in micrometers. */
  get width() { return this.raw?.width; }
  /** @returns {number|undefined} The overall height of the reconstruction, in micrometers. */
  get height() { return this.raw?.height; }
  /** @returns {number|undefined} The overall depth of the reconstruction, in micrometers. */
  get depth() { return this.raw?.depth; }
  /** @returns {number|undefined} The average diameter of the branches, in micrometers. */
  get averageDiameter() { return this.raw?.diameter; }
  /** @returns {number|undefined} The surface area of the soma, in square micrometers. */
  get somaSurface() { return this.raw?.soma_Surface; }
  /** @returns {number|undefined} The total length of every branch combined, in micrometers. */
  get totalLength() { return this.raw?.length; }
  /** @returns {number|undefined} The total surface area, in square micrometers. */
  get surfaceArea() { return this.raw?.surface; }
  /** @returns {number|undefined} The total volume, in cubic micrometers. */
  get volume() { return this.raw?.volume; }
  /** @returns {number|undefined} The greatest straight-line distance from the soma to any point. */
  get maxEuclideanDistance() { return this.raw?.eucDistance; }
  /** @returns {number|undefined} The greatest distance from the soma to any point, measured along the branches. */
  get maxPathDistance() { return this.raw?.pathDistance; }
  /** @returns {number|undefined} The highest branch order reached (how many bifurcations deep the branching goes). */
  get maxBranchOrder() { return this.raw?.branch_Order; }
  /** @returns {number|undefined} The average contraction ratio (how much a branch curves versus a straight line). */
  get averageContraction() { return this.raw?.contraction; }
  /** @returns {number|undefined} The average fragmentation (how many short segments make up each branch). */
  get totalFragmentation() { return this.raw?.fragmentation; }
  /** @returns {number|undefined} The average partition asymmetry at each bifurcation. */
  get partitionAsymmetry() { return this.raw?.partition_asymmetry; }
  /** @returns {number|undefined} The average Rall's ratio at each bifurcation. */
  get averageRallsRatio() { return this.raw?.pk_classic; }
  /** @returns {number|undefined} The average bifurcation angle measured right at each branch point, in degrees. */
  get averageBifurcationAngleLocal() { return this.raw?.bif_ampl_local; }
  /** @returns {number|undefined} The average bifurcation angle measured between the resulting branch tips, in degrees. */
  get averageBifurcationAngleRemote() { return this.raw?.bif_ampl_remote; }
  /** @returns {number|undefined} The fractal dimension, a measure of how much the shape fills space. */
  get fractalDimension() { return this.raw?.fractal_Dim; }
}
