# Neurolook

A local-first tool for browsing NeuroMorpho.Org's library of digitally reconstructed neuron and glia morphologies.

It talks to the [NeuroMorpho.Org REST API](https://neuromorpho.org/apiReference.html) and caches responses locally, so repeated use doesn't keep hitting their servers. There's no login or accounts. It's built to run on one machine, for one person.

## Running it

Requires Node 20+ (uses native `fetch`, no other dependencies to install).

1. Get this repository onto your machine (clone it, or download and unzip it). Open a terminal inside that project folder. `npm start` only works from there, since that's where `package.json` lives.
2. Run:
   ```
   npm start
   ```
3. Open `http://localhost:4310` in your browser. The server doesn't open it for you. Running `npm start` just starts it in the terminal; you have to visit the address yourself.

## Structure

**`server/`**: a dependency-free Node HTTP server.
- `server.js` routes requests.
- `lib/neuromorphoClient.js` is the only file that talks to neuromorpho.org. It throttles requests, caches them to disk, and identifies itself with a User-Agent header, per NeuroMorpho's terms of use.
- `lib/collectionStore.js` and `lib/swcStore.js` save your collection and downloaded SWC files under `data/`.

**`public/`**: plain HTML/CSS/JS. No framework, no build step. Five pages (search, browse, neuron detail, compare, collection), each with its own script.

Shared code lives in `public/js/`:
- `api.js` is the only file that talks to our own server.
- `models/` wraps the raw API JSON in `Neuron`/`Morphometry` classes.
- `logic/` holds pure functions that decide what to show: field labels, pagination windows, comparison diffs.
- `viewer.js` is the three.js-based SWC morphology viewer.

## Known simplifications

- Free-text search only matches `neuron_name` (wildcarded). NeuroMorpho's API doesn't support fuzzy full-text search, so the filters (species, region, cell type, archive) are the real search mechanism.
- The 3D viewer renders morphology as colored line segments, not tapered cylinders. This matches how NeuroMorpho's own thumbnails look, and is far cheaper to render.
- The two viewers on the Compare page don't sync rotation with each other. Collections don't support folders or tags yet.
- "Original format" downloads aren't offered. NeuroMorpho's terms note those are currently suspended. Only the standardized `.CNG.swc` format is fetched, which their terms explicitly permit direct HTTP access to.
