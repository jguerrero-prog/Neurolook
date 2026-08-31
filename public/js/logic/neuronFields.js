// Field definitions matching NeuroMorpho's own neuron_info.jsp page, not a
// curated subset — a researcher may need any of these. Pure functions only,
// no DOM access, so the view layer never decides what a field means.

function formatMeasurement(value, unit = '') {
  if (value === null || value === undefined || value === '') return 'Not reported';
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : `${numeric.toLocaleString()}${unit}`;
}

function formatText(value) {
  return value === null || value === undefined || value === '' ? 'Not reported' : value;
}

export const IDENTIFICATION_FIELDS = {
  nmoId: { label: 'NeuroMorpho.Org ID', get: (neuron) => formatText(neuron.nmoId) },
  cellName: { label: 'Cell Name', get: (neuron) => formatText(neuron.name) },
  archive: { label: 'Archive', get: (neuron) => formatText(neuron.archive) },
};

export const ORGANISM_FIELDS = {
  species: { label: 'Species Name', get: (neuron) => formatText(neuron.species) },
  scientificName: { label: 'Scientific Name', get: (neuron) => formatText(neuron.scientificName) },
  strain: { label: 'Strain', get: (neuron) => formatText(neuron.strain) },
  gender: { label: 'Gender', get: (neuron) => formatText(neuron.gender) },
  minAge: {
    label: 'Min Age',
    get: (neuron) => formatMeasurement(neuron.minAge, neuron.ageScale ? ` ${neuron.ageScale.toLowerCase()}` : ''),
  },
  maxAge: {
    label: 'Max Age',
    get: (neuron) => formatMeasurement(neuron.maxAge, neuron.ageScale ? ` ${neuron.ageScale.toLowerCase()}` : ''),
  },
  development: { label: 'Development', get: (neuron) => formatText(neuron.ageClassification) },
  minWeight: { label: 'Min Weight', get: (neuron) => formatMeasurement(neuron.minWeight) },
  maxWeight: { label: 'Max Weight', get: (neuron) => formatMeasurement(neuron.maxWeight) },
};

export const ANATOMICAL_FIELDS = {
  domain: { label: 'Structural Domains', get: (neuron) => formatText(neuron.domain) },
  physicalIntegrity: { label: 'Physical Integrity', get: (neuron) => formatText(neuron.physicalIntegrity) },
  primaryRegion: { label: 'Primary Brain Region', get: (neuron) => formatText(neuron.brainRegionTiers[0]) },
  secondaryRegion: { label: 'Secondary Brain Region', get: (neuron) => formatText(neuron.brainRegionTiers[1]) },
  tertiaryRegion: { label: 'Tertiary Brain Region', get: (neuron) => formatText(neuron.brainRegionTiers[2]) },
  primaryCellClass: { label: 'Primary Cell Class', get: (neuron) => formatText(neuron.cellTypeTiers[0]) },
  secondaryCellClass: { label: 'Secondary Cell Class', get: (neuron) => formatText(neuron.cellTypeTiers[1]) },
  tertiaryCellClass: { label: 'Tertiary Cell Class', get: (neuron) => formatText(neuron.cellTypeTiers[2]) },
  attributes: { label: 'Morphological Attributes', get: (neuron) => formatText(neuron.attributes) },
};

export const EXPERIMENTAL_FIELDS = {
  originalFormat: { label: 'Original Format', get: (neuron) => formatText(neuron.originalFormat) },
  protocol: { label: 'Experiment Protocol', get: (neuron) => formatText(neuron.protocol) },
  experimentCondition: { label: 'Experimental Condition', get: (neuron) => formatText(neuron.experimentCondition) },
  stain: { label: 'Staining Method', get: (neuron) => formatText(neuron.stain) },
  slicingDirection: { label: 'Slicing Direction', get: (neuron) => formatText(neuron.slicingDirection) },
  slicingThickness: { label: 'Slice Thickness', get: (neuron) => formatMeasurement(neuron.slicingThickness, ' μm') },
  tissueShrinkage: { label: 'Tissue Shrinkage', get: (neuron) => formatText(neuron.tissueShrinkageDisplay) },
  objectiveType: { label: 'Objective Type', get: (neuron) => formatText(neuron.objectiveType) },
  magnification: { label: 'Magnification', get: (neuron) => formatMeasurement(neuron.magnification, 'x') },
  reconstructionSoftware: {
    label: 'Reconstruction Method',
    get: (neuron) => formatText(neuron.reconstructionSoftware),
  },
  depositionDate: { label: 'Date of Deposition', get: (neuron) => formatText(neuron.depositionDate) },
  uploadDate: { label: 'Date of Upload', get: (neuron) => formatText(neuron.uploadDate) },
};

export const MORPHOMETRY_FIELDS = {
  stemCount: { label: 'Number of Stems', get: (m) => formatMeasurement(m.stemCount) },
  bifurcationCount: { label: 'Number of Bifurcations', get: (m) => formatMeasurement(m.bifurcationCount) },
  branchCount: { label: 'Number of Branches', get: (m) => formatMeasurement(m.branchCount) },
  width: { label: 'Overall Width', get: (m) => formatMeasurement(m.width, ' μm') },
  height: { label: 'Overall Height', get: (m) => formatMeasurement(m.height, ' μm') },
  depth: { label: 'Overall Depth', get: (m) => formatMeasurement(m.depth, ' μm') },
  averageDiameter: { label: 'Average Diameter', get: (m) => formatMeasurement(m.averageDiameter, ' μm') },
  somaSurface: { label: 'Soma Surface', get: (m) => formatMeasurement(m.somaSurface, ' μm²') },
  totalLength: { label: 'Total Length', get: (m) => formatMeasurement(m.totalLength, ' μm') },
  surfaceArea: { label: 'Total Surface', get: (m) => formatMeasurement(m.surfaceArea, ' μm²') },
  volume: { label: 'Total Volume', get: (m) => formatMeasurement(m.volume, ' μm³') },
  maxEuclideanDistance: {
    label: 'Max Euclidean Distance',
    get: (m) => formatMeasurement(m.maxEuclideanDistance, ' μm'),
  },
  maxPathDistance: { label: 'Max Path Distance', get: (m) => formatMeasurement(m.maxPathDistance, ' μm') },
  maxBranchOrder: { label: 'Max Branch Order', get: (m) => formatMeasurement(m.maxBranchOrder) },
  averageContraction: { label: 'Average Contraction', get: (m) => formatMeasurement(m.averageContraction) },
  totalFragmentation: { label: 'Total Fragmentation', get: (m) => formatMeasurement(m.totalFragmentation) },
  partitionAsymmetry: { label: 'Partition Asymmetry', get: (m) => formatMeasurement(m.partitionAsymmetry) },
  averageRallsRatio: { label: "Average Rall's Ratio", get: (m) => formatMeasurement(m.averageRallsRatio) },
  averageBifurcationAngleLocal: {
    label: 'Average Bifurcation Angle Local',
    get: (m) => formatMeasurement(m.averageBifurcationAngleLocal, '°'),
  },
  averageBifurcationAngleRemote: {
    label: 'Average Bifurcation Angle Remote',
    get: (m) => formatMeasurement(m.averageBifurcationAngleRemote, '°'),
  },
  fractalDimension: { label: 'Fractal Dimension', get: (m) => formatMeasurement(m.fractalDimension) },
};

function unavailableMorphometryRows() {
  return [['Morphometry', 'Not available for this neuron']];
}

// Renders one entity's (a single Neuron or Morphometry instance) fields as
// [label, value] rows, in the given field group's declared order.
export function buildFieldRows(entity, fieldGroup) {
  return Object.values(fieldGroup).map(({ label, get }) => [label, get(entity)]);
}

export function buildMorphometryRows(morphometry) {
  if (!morphometry?.isAvailable) return unavailableMorphometryRows();
  return buildFieldRows(morphometry, MORPHOMETRY_FIELDS);
}

// Renders the same fields across several entities as comparison rows, each
// carrying every entity's value plus whether they differ.
export function buildFieldComparisonRows(entities, fieldGroup) {
  return Object.values(fieldGroup).map(({ label, get }) => {
    const values = entities.map((entity) => get(entity));
    return { label, values, differs: !values.every((value) => value === values[0]) };
  });
}

export function buildMorphometryComparisonRows(morphometryRecords) {
  return buildFieldComparisonRows(morphometryRecords, MORPHOMETRY_FIELDS);
}
