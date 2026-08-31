// @ts-check

/**
 * @typedef {Object} LiteraturePayload
 * A publication record as NeuroMorpho's /literature endpoint returns it.
 * @property {string} [title]
 * @property {string} [journal]
 * @property {string|null} [doi]
 * @property {string|number} [pmid]
 * @property {string[]|string} [authors]
 * @property {number} [publishedDate] Milliseconds since 1970.
 */

// Wraps a raw /literature publication record so the citation logic can read
// simple, well-named fields instead of the API's raw shape (authors listed
// as an array, dates stored as a plain count of milliseconds since 1970).
export class Literature {
  /** @param {LiteraturePayload} payload */
  constructor(payload) {
    /** @type {LiteraturePayload} */
    this.raw = payload;
  }

  /** @returns {string|undefined} The publication's title. */
  get title() { return this.raw.title; }
  /** @returns {string|undefined} The name of the journal it was published in. */
  get journal() { return this.raw.journal; }
  /** @returns {string|null|undefined} The publication's DOI, if it has one. */
  get doi() { return this.raw.doi; }

  // This is the publication's own resolved PMID, looked up by NeuroMorpho
  // from whatever identifier the neuron record carries — not necessarily
  // the same value. Some neurons carry an internal negative placeholder id
  // instead of a real PubMed id; NeuroMorpho still resolves those to a real
  // publication, and that publication's own pmid here is always genuine.
  /** @returns {string|number|undefined} The publication's own real PubMed id. */
  get pmid() { return this.raw.pmid; }

  // A link is only built from this resolved record's own identifiers, never
  // from the neuron's original reference id, so a placeholder id can never
  // produce a dead link. DOI is preferred since it's guaranteed unique;
  // pmid is checked to actually look like a real PubMed id (positive,
  // digits only) before being trusted as one.
  /** @returns {string|null} A working link to the publication (a doi.org or pubmed.ncbi.nlm.nih.gov URL), or null if there is no real identifier to link to. */
  get sourceUrl() {
    if (this.doi) return `https://doi.org/${this.doi}`;
    if (this.pmid && /^\d+$/.test(String(this.pmid))) return `https://pubmed.ncbi.nlm.nih.gov/${this.pmid}/`;
    return null;
  }

  /** @returns {string|null} A short label for the link above, for example "doi: 10.1/x" or "PMID: 12345". Null if there is no real identifier. */
  get sourceLabel() {
    if (this.doi) return `doi: ${this.doi}`;
    if (this.pmid && /^\d+$/.test(String(this.pmid))) return `PMID: ${this.pmid}`;
    return null;
  }

  /** @returns {string|undefined} The list of authors, joined into one line. */
  get authors() {
    return Array.isArray(this.raw.authors) ? this.raw.authors.join(', ') : this.raw.authors;
  }

  /** @returns {number|null} The year this was published, or null if the date is missing. */
  get year() {
    return this.raw.publishedDate ? new Date(this.raw.publishedDate).getFullYear() : null;
  }

  /** @returns {string} A single formatted citation line: authors, year, title, and journal. */
  get citationLine() {
    return [this.authors, this.year && `(${this.year}).`, this.title && `${this.title}.`, this.journal && `${this.journal}.`]
      .filter(Boolean)
      .join(' ');
  }
}
