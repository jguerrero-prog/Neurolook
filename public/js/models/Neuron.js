// @ts-check
import { joinField } from '../dom.js';

/**
 * @typedef {Object} NeuronPayload
 * A neuron record as NeuroMorpho's API returns it, or the smaller subset
 * saved in the local collection file. Any field can be missing on a
 * collection record, so every property here is optional.
 * @property {number} [neuron_id]
 * @property {string} [neuron_name]
 * @property {string} [archive]
 * @property {string} [note]
 * @property {string} [species]
 * @property {string} [scientific_name]
 * @property {string} [strain]
 * @property {string} [gender]
 * @property {string} [age_classification]
 * @property {string|number} [min_age]
 * @property {string|number} [max_age]
 * @property {string} [age_scale]
 * @property {string|number} [min_weight]
 * @property {string|number} [max_weight]
 * @property {string} [domain]
 * @property {string} [physical_Integrity]
 * @property {string} [attributes]
 * @property {string|string[]} [brain_region]
 * @property {string|string[]} [cell_type]
 * @property {string} [original_format]
 * @property {string} [protocol]
 * @property {string|string[]} [experiment_condition]
 * @property {string} [stain]
 * @property {string} [slicing_direction]
 * @property {string|number} [slicing_thickness]
 * @property {string} [objective_type]
 * @property {string|number} [magnification]
 * @property {string} [reconstruction_software]
 * @property {string} [upload_date]
 * @property {string} [deposition_date]
 * @property {string} [png_url]
 * @property {string|number} [corrected_value]
 * @property {string|number} [corrected_xy]
 * @property {string|number} [corrected_z]
 * @property {string|number} [reported_value]
 * @property {string|number} [reported_xy]
 * @property {string|number} [reported_z]
 * @property {string} [shrinkage_reported]
 * @property {string|number|Array<string|number>} [reference_pmid]
 */

/**
 * @typedef {Object} NeuronCollectionRecord
 * The small subset of a neuron's fields worth saving to the local
 * collection file, enough to render a card again without a new fetch.
 * @property {string} neuron_name
 * @property {string} [archive]
 * @property {string} [species]
 * @property {string|string[]} [cell_type]
 * @property {string|string[]} [brain_region]
 * @property {string} [png_url]
 */

// Wraps a raw NeuroMorpho neuron JSON payload — or the smaller subset stored
// in the local collection file — so widgets never read raw API field names
// directly. Tolerates partial data: a collection record only carries a few
// fields, and every getter below degrades gracefully when one is missing.
export class Neuron {
  /** @param {NeuronPayload} payload */
  constructor(payload) {
    /** @type {NeuronPayload} */
    this.raw = payload;
  }

  /** @returns {number|undefined} The neuron's numeric database id. */
  get id() { return this.raw.neuron_id; }
  /** @returns {string|null} The id formatted the way NeuroMorpho displays it, for example "NMO_00001". Null if there is no id. */
  get nmoId() { return this.id == null ? null : `NMO_${String(this.id).padStart(5, '0')}`; }
  /** @returns {string|undefined} The neuron's name, as used in NeuroMorpho URLs and file names. */
  get name() { return this.raw.neuron_name; }
  /** @returns {string|undefined} The name of the lab archive this neuron came from. */
  get archive() { return this.raw.archive; }
  /** @returns {string|undefined} A free-text note from the original record, if any. */
  get note() { return this.raw.note; }

  /** @returns {string|undefined} The common species name, for example "mouse". */
  get species() { return this.raw.species; }
  /** @returns {string|undefined} The scientific (Latin) species name. */
  get scientificName() { return this.raw.scientific_name; }
  /** @returns {string|undefined} The animal strain. */
  get strain() { return this.raw.strain; }
  /** @returns {string|undefined} The animal's gender. */
  get gender() { return this.raw.gender; }
  /** @returns {string|undefined} The animal's age group, for example "adult". */
  get ageClassification() { return this.raw.age_classification; }
  /** @returns {string|number|undefined} The lowest reported age for this record. */
  get minAge() { return this.raw.min_age; }
  /** @returns {string|number|undefined} The highest reported age for this record. */
  get maxAge() { return this.raw.max_age; }
  /** @returns {string|undefined} The unit the age values are measured in, for example "Day". */
  get ageScale() { return this.raw.age_scale; }
  /** @returns {string|number|undefined} The lowest reported weight for this record. */
  get minWeight() { return this.raw.min_weight; }
  /** @returns {string|number|undefined} The highest reported weight for this record. */
  get maxWeight() { return this.raw.max_weight; }

  /** @returns {string|undefined} The structural domain, for example "Dendrites, No Soma". */
  get domain() { return this.raw.domain; }
  /** @returns {string|undefined} How complete or damaged the reconstruction is. */
  get physicalIntegrity() { return this.raw.physical_Integrity; }
  /** @returns {string|undefined} Free-text notes on shape attributes captured during reconstruction. */
  get attributes() { return this.raw.attributes; }

  /** @returns {string[]} The brain region, split into its tiers from broad to specific. Empty if none is reported. */
  get brainRegionTiers() {
    return Array.isArray(this.raw.brain_region) ? this.raw.brain_region : [this.raw.brain_region].filter(Boolean);
  }

  /** @returns {string[]} The cell type, split into its tiers from broad to specific. Empty if none is reported. */
  get cellTypeTiers() {
    return Array.isArray(this.raw.cell_type) ? this.raw.cell_type : [this.raw.cell_type].filter(Boolean);
  }

  /** @returns {string|undefined} The file format the original upload was in, before conversion to SWC. */
  get originalFormat() { return this.raw.original_format; }
  /** @returns {string|undefined} The experiment protocol, for example "in vitro". */
  get protocol() { return this.raw.protocol; }
  /** @returns {string} Any special experimental conditions applied, as one readable line. */
  get experimentCondition() { return joinField(this.raw.experiment_condition); }
  /** @returns {string|undefined} The staining method used. */
  get stain() { return this.raw.stain; }
  /** @returns {string|undefined} The direction the tissue was sliced in. */
  get slicingDirection() { return this.raw.slicing_direction; }
  /** @returns {string|number|undefined} The thickness of each tissue slice. */
  get slicingThickness() { return this.raw.slicing_thickness; }
  /** @returns {string|undefined} The type of microscope objective used, for example "oil". */
  get objectiveType() { return this.raw.objective_type; }
  /** @returns {string|number|undefined} The microscope magnification used. */
  get magnification() { return this.raw.magnification; }
  /** @returns {string|undefined} The software used to build the digital reconstruction. */
  get reconstructionSoftware() { return this.raw.reconstruction_software; }
  /** @returns {string|undefined} The date this record was uploaded to NeuroMorpho. */
  get uploadDate() { return this.raw.upload_date; }
  /** @returns {string|undefined} The date this record was deposited by the original lab. */
  get depositionDate() { return this.raw.deposition_date; }

  /** @returns {string|undefined} The URL of NeuroMorpho's rendered thumbnail image, if one exists yet. */
  get pngUrl() { return this.raw.png_url; }

  // Tissue shrinkage is reported as either a corrected or a raw measurement,
  // each optionally split into xy/z components — combine into one line.
  /** @returns {string} A single readable line describing tissue shrinkage, or "Not reported". */
  get tissueShrinkageDisplay() {
    const raw = this.raw;
    if (raw.corrected_value) {
      return ['Corrected:', raw.corrected_value, raw.corrected_xy && `(xy ${raw.corrected_xy}`, raw.corrected_z && `z ${raw.corrected_z})`]
        .filter(Boolean).join(' ');
    }
    if (raw.reported_value) {
      return ['Reported:', raw.reported_value, raw.reported_xy && `(xy ${raw.reported_xy}`, raw.reported_z && `z ${raw.reported_z})`]
        .filter(Boolean).join(' ');
    }
    return raw.shrinkage_reported || 'Not reported';
  }

  /** @returns {string} The cell type as one readable line, joining every tier. */
  get cellType() { return joinField(this.raw.cell_type); }
  /** @returns {string} The brain region as one readable line, joining every tier. */
  get brainRegion() { return joinField(this.raw.brain_region); }

  /** @returns {string|undefined} The species name, with the scientific name added in parentheses when known. */
  get displaySpecies() {
    return this.scientificName ? `${this.species} (${this.scientificName})` : this.species;
  }

  // Brain region can itself be a comma-joined list of several tags (see
  // joinField), so it goes in parentheses here rather than being joined
  // with the same dot used between species and archive. Otherwise a comma
  // list sitting between two dots reads as one long, confusing line.
  /** @returns {string} Species, brain region, and archive joined into one short line, skipping any that are missing. */
  get subtitle() {
    const brainRegion = this.brainRegion ? `(${this.brainRegion})` : '';
    return [this.species, brainRegion, this.archive].filter(Boolean).join(' · ');
  }

  /** @returns {string} The file name NeuroMorpho uses for this neuron's standardized SWC download. */
  get swcFilename() {
    return `${this.name}.CNG.swc`;
  }

  /** @returns {string} The URL of this neuron's page on the main NeuroMorpho.Org website. */
  get neuroMorphoPageUrl() {
    return `https://neuromorpho.org/neuron_info.jsp?neuron_name=${encodeURIComponent(this.name ?? '')}`;
  }

  /** @returns {Array<string|number>} The PubMed ids listed for this neuron's reference publication(s). Empty if none. */
  get referencePubmedIds() {
    const ids = this.raw.reference_pmid;
    return Array.isArray(ids) ? ids : [ids].filter(Boolean);
  }

  // The deliberately small subset of fields worth persisting when a neuron is
  // saved to the local collection — enough to render a card without a refetch.
  /** @returns {NeuronCollectionRecord} The small subset of fields worth saving to the local collection. */
  toCollectionRecord() {
    return {
      neuron_name: /** @type {string} */ (this.name),
      archive: this.archive,
      species: this.species,
      cell_type: this.raw.cell_type,
      brain_region: this.raw.brain_region,
      png_url: this.pngUrl,
    };
  }
}
