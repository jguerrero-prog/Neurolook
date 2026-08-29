# Neurolook

A local-first tool for browsing NeuroMorpho.Org's library of digitally reconstructed neuron and glia morphologies.

Built against the [NeuroMorpho.Org REST API](https://neuromorpho.org/apiReference.html), with local caching so repeated use doesn't repeatedly hit their servers, and no login or accounts — this runs on one machine, for one person.

## Running it

Requires Node 20+ (uses native `fetch`, no other dependencies to install).

1. Get this repository onto your machine (clone it, or download and unzip it), then open a terminal **inside that project folder** — `npm start` only works from there, since that's where `package.json` lives.
2. Run:
   ```
   npm start
   ```
3. Open `http://localhost:4310` in your browser. The server doesn't open it for you — running `npm start` just starts it in the terminal; you have to visit the address yourself.

## Structure

- `server/` — a dependency-free Node HTTP server. `server.js` routes requests;
  `lib/neuromorphoClient.js` is the only thing that talks to neuromorpho.org
  (throttled, cached to disk, identifies itself via User-Agent per their
  terms of use); `lib/collectionStore.js` and `lib/swcStore.js` persist your
  saved neurons and downloaded SWC files under `data/`.
- `public/` — plain HTML/CSS/JS, no framework, no build step. Five pages
  (search, browse, neuron detail, compare, collection), each with its own
  script. Shared code lives in `public/js/`: `api.js` (the only thing that
  talks to our own server), `models/` (Neuron/Morphometry wrappers around
  the raw API JSON), `logic/` (pure functions that decide what to show —
  field labels, pagination windows, comparison diffs), and `viewer.js` (the
  three.js-based SWC morphology viewer).

## Known simplifications

- Free-text search only matches `neuron_name` (wildcarded) — NeuroMorpho's
  API doesn't support fuzzy full-text search, so the filters (species,
  region, cell type, archive) are the real search mechanism.
- The 3D viewer renders morphology as colored line segments (not tapered
  cylinders) — matches how NeuroMorpho's own thumbnails look, and is far
  cheaper to render.
- No sync-rotation between viewers on the Compare page, no CSV export, no
  collection folders/tags — straightforward to add later if wanted.
- "Original format" downloads are not offered — NeuroMorpho's terms note
  those are currently suspended; only the standardized `.CNG.swc` format is
  fetched, which their terms explicitly permit direct HTTP access to.
