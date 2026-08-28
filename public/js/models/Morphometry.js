// Wraps a raw morphometry JSON payload. A neuron can legitimately have none
// (the endpoint 404s for some records), so every getter is null-safe rather
// than assuming the payload exists. Field names/labels here match NeuroMorpho's
// own neuron_info.jsp page exactly, not a curated subset.
export class Morphometry {
  constructor(payload) {
    this.raw = payload;
  }

  get isAvailable() { return this.raw != null; }

  get stemCount() { return this.raw?.n_stems; }
  get bifurcationCount() { return this.raw?.n_bifs; }
  get branchCount() { return this.raw?.n_branch; }
  get width() { return this.raw?.width; }
  get height() { return this.raw?.height; }
  get depth() { return this.raw?.depth; }
  get averageDiameter() { return this.raw?.diameter; }
  get somaSurface() { return this.raw?.soma_Surface; }
  get totalLength() { return this.raw?.length; }
  get surfaceArea() { return this.raw?.surface; }
  get volume() { return this.raw?.volume; }
  get maxEuclideanDistance() { return this.raw?.eucDistance; }
  get maxPathDistance() { return this.raw?.pathDistance; }
  get maxBranchOrder() { return this.raw?.branch_Order; }
  get averageContraction() { return this.raw?.contraction; }
  get totalFragmentation() { return this.raw?.fragmentation; }
  get partitionAsymmetry() { return this.raw?.partition_asymmetry; }
  get averageRallsRatio() { return this.raw?.pk_classic; }
  get averageBifurcationAngleLocal() { return this.raw?.bif_ampl_local; }
  get averageBifurcationAngleRemote() { return this.raw?.bif_ampl_remote; }
  get fractalDimension() { return this.raw?.fractal_Dim; }
}
