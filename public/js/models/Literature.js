// Wraps a raw /literature publication record so the citation logic can read
// clean fields instead of the wire format (authors as an array, dates as
// epoch milliseconds).
export class Literature {
  constructor(payload) {
    this.raw = payload;
  }

  get title() { return this.raw.title; }
  get journal() { return this.raw.journal; }
  get doi() { return this.raw.doi; }

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
