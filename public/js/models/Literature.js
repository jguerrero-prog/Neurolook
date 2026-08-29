// Wraps a raw /literature publication record so the citation logic can read
// simple, well-named fields instead of the API's raw shape (authors listed
// as an array, dates stored as a plain count of milliseconds since 1970).
export class Literature {
  constructor(payload) {
    this.raw = payload;
  }

  get title() { return this.raw.title; }
  get journal() { return this.raw.journal; }
  get doi() { return this.raw.doi; }

  // This is the publication's own resolved PMID, looked up by NeuroMorpho
  // from whatever identifier the neuron record carries — not necessarily
  // the same value. Some neurons carry an internal negative placeholder id
  // instead of a real PubMed id; NeuroMorpho still resolves those to a real
  // publication, and that publication's own pmid here is always genuine.
  get pmid() { return this.raw.pmid; }

  // A link is only built from this resolved record's own identifiers, never
  // from the neuron's original reference id, so a placeholder id can never
  // produce a dead link. DOI is preferred since it's guaranteed unique;
  // pmid is checked to actually look like a real PubMed id (positive,
  // digits only) before being trusted as one.
  get sourceUrl() {
    if (this.doi) return `https://doi.org/${this.doi}`;
    if (this.pmid && /^\d+$/.test(String(this.pmid))) return `https://pubmed.ncbi.nlm.nih.gov/${this.pmid}/`;
    return null;
  }

  get sourceLabel() {
    if (this.doi) return `doi: ${this.doi}`;
    if (this.pmid && /^\d+$/.test(String(this.pmid))) return `PMID: ${this.pmid}`;
    return null;
  }

  get authors() {
    return Array.isArray(this.raw.authors) ? this.raw.authors.join(', ') : this.raw.authors;
  }

  get year() {
    return this.raw.publishedDate ? new Date(this.raw.publishedDate).getFullYear() : null;
  }

  get citationLine() {
    return [this.authors, this.year && `(${this.year}).`, this.title && `${this.title}.`, this.journal && `${this.journal}.`]
      .filter(Boolean)
      .join(' ');
  }
}
