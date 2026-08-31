# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- ESLint and Prettier, set up to match the code style this project already
  uses instead of forcing a new one.
- Baseline security headers on every server response (`Content-Security-Policy`,
  `X-Content-Type-Options`, `X-Frame-Options`).
- This changelog.

## [0.1.0] - 2026-08-31

### Added
- The initial working app: Search, Browse, Neuron Detail, Compare, and My
  Collection pages, backed by a small dependency-free Node server that talks
  to NeuroMorpho.Org's API.
- A 3D viewer for neuron morphology (SWC files) built with three.js.
- A custom dropdown and multi-select filter component, since the browser's
  native `<select>` cannot be styled the way the design needed.
- Client-side soft navigation on Browse (page changes update the URL and
  results without a full page reload).
- An About page covering the project's purpose, data source, and citation
  policy.
- CSV export for both a full neuron comparison and the saved collection.
- A search box rescue: if someone searches for a term that is not a real
  neuron name but matches a real species, brain region, cell type, or
  archive, the search is retried as that filter instead of just showing no
  results.
- A visible link to the original publication on a neuron's detail page,
  built only from a confirmed real identifier, never a guess.

### Changed
- Renamed the project from Arbor to Neurolook, and restyled every page to
  match The Transmitter's visual brand.
- Rewrote every place that built HTML from a template string (which needed
  careful escaping to stay safe) to build DOM elements directly instead,
  removing that entire category of risk.
- Rewrote comments that leaned on unexplained jargon (browser cache
  internals, an unnamed UI element, an ML algorithm name) into plain
  descriptions of what actually happens.

### Fixed
- A default species filter that could get stuck and could not be unchecked.
- The "Clear all" control not resetting the filter dropdowns' own state.
- Cache read failures being silently treated the same as a normal cache
  miss, hiding a real problem like a corrupted file or a permissions error.
- Outbound requests to NeuroMorpho having no timeout, so a hung request
  there could hang this server's own response.
- A truncated or corrupted SWC file failing to load with no explanation,
  leaving the 3D viewer blank.
- A neuron card showing broken image text instead of a placeholder when
  NeuroMorpho has not rendered a thumbnail for that record yet.
- The Compare page's "Browse" link always resetting Browse back to its
  default filters instead of restoring the search you came from.

### Removed
- The soma wireframe toggle in the 3D viewer.

### Security
- Removed every use of `innerHTML` with page content built from user or API
  data, replacing it with safe DOM construction that cannot be parsed as
  markup.
