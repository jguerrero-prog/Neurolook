import { joinField } from '../dom.js';

// Wraps a raw NeuroMorpho neuron JSON payload — or the smaller subset stored
// in the local collection file — so widgets never read raw API field names
// directly. Tolerates partial data: a collection record only carries a few
// fields, and every getter below degrades gracefully when one is missing.
export class Neuron {
  constructor(payload) {
    this.raw = payload;
  }

  get id() { return this.raw.neuron_id; }
  get nmoId() { return this.id == null ? null : `NMO_${String(this.id).padStart(5, '0')}`; }
  get name() { return this.raw.neuron_name; }
  get archive() { return this.raw.archive; }
  get note() { return this.raw.note; }

  get species() { return this.raw.species; }
  get scientificName() { return this.raw.scientific_name; }
  get strain() { return this.raw.strain; }
  get gender() { return this.raw.gender; }
  get ageClassification() { return this.raw.age_classification; }
  get minAge() { return this.raw.min_age; }
  get maxAge() { return this.raw.max_age; }
  get ageScale() { return this.raw.age_scale; }
  get minWeight() { return this.raw.min_weight; }
  get maxWeight() { return this.raw.max_weight; }

  get domain() { return this.raw.domain; }
  get physicalIntegrity() { return this.raw.physical_Integrity; }
  get attributes() { return this.raw.attributes; }

  get brainRegionTiers() {
    return Array.isArray(this.raw.brain_region) ? this.raw.brain_region : [this.raw.brain_region].filter(Boolean);
  }

  get cellTypeTiers() {
    return Array.isArray(this.raw.cell_type) ? this.raw.cell_type : [this.raw.cell_type].filter(Boolean);
  }

  get originalFormat() { return this.raw.original_format; }
  get protocol() { return this.raw.protocol; }
  get experimentCondition() { return joinField(this.raw.experiment_condition); }
  get stain() { return this.raw.stain; }
  get slicingDirection() { return this.raw.slicing_direction; }
  get slicingThickness() { return this.raw.slicing_thickness; }
  get objectiveType() { return this.raw.objective_type; }
  get magnification() { return this.raw.magnification; }
  get reconstructionSoftware() { return this.raw.reconstruction_software; }
  get uploadDate() { return this.raw.upload_date; }
  get depositionDate() { return this.raw.deposition_date; }

  get pngUrl() { return this.raw.png_url; }

  // Tissue shrinkage is reported as either a corrected or a raw measurement,
  // each optionally split into xy/z components — combine into one line.
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

  get cellType() { return joinField(this.raw.cell_type); }
  get brainRegion() { return joinField(this.raw.brain_region); }

  get displaySpecies() {
    return this.scientificName ? `${this.species} (${this.scientificName})` : this.species;
  }

  get subtitle() {
    return [this.species, this.brainRegion, this.archive].filter(Boolean).join(' · ');
  }

  get swcFilename() {
    return `${this.name}.CNG.swc`;
  }

  get neuroMorphoPageUrl() {
    return `https://neuromorpho.org/neuron_info.jsp?neuron_name=${encodeURIComponent(this.name)}`;
  }

  get referencePubmedIds() {
    const ids = this.raw.reference_pmid;
    return Array.isArray(ids) ? ids : [ids].filter(Boolean);
  }

  // The deliberately small subset of fields worth persisting when a neuron is
  // saved to the local collection — enough to render a card without a refetch.
  toCollectionRecord() {
    return {
      neuron_name: this.name,
      archive: this.archive,
      species: this.species,
      cell_type: this.raw.cell_type,
      brain_region: this.raw.brain_region,
      png_url: this.pngUrl,
    };
  }
}
