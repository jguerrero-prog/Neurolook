import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as api from './lib/apiRoutes.js';
import { HttpError } from './lib/apiRoutes.js';

const PORT = process.env.PORT || 4310;
const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const ROUTES = [
  { method: 'GET', pattern: /^\/api\/stats$/, handler: () => api.handleGetStats() },
  { method: 'GET', pattern: /^\/api\/random-neuron$/, handler: () => api.handleGetRandomNeuron() },
  {
    method: 'GET',
    pattern: /^\/api\/filters\/(?<field>[a-z_]+)$/,
    handler: (req, params) => api.handleGetFilterValues(params.field),
  },
  {
    method: 'GET',
    pattern: /^\/api\/categories$/,
    handler: (req, params, search) => api.handleGetFacetCounts('cell_type', Number(search.get('limit')) || 6),
  },
  {
    method: 'GET',
    pattern: /^\/api\/facets\/(?<field>[a-z_]+)$/,
    handler: (req, params, search) => api.handleGetFacetCounts(params.field, Number(search.get('limit')) || 30),
  },
  {
    method: 'GET',
    pattern: /^\/api\/search$/,
    handler: (req, params, search) =>
      api.handleSearch({
        name: search.get('name') || '',
        species: search.get('species') || '',
        brain_region: search.get('brain_region') || '',
        cell_type: search.get('cell_type') || '',
        archive: search.get('archive') || '',
        sort: search.get('sort') || '',
        page: Number(search.get('page')) || 0,
        size: Number(search.get('size')) || 12,
      }),
  },
  {
    method: 'GET',
    pattern: /^\/api\/neuron\/(?<name>[^/]+)$/,
    handler: (req, params) => api.handleGetNeuronDetail(params.name),
  },
  {
    method: 'GET',
    pattern: /^\/api\/neuron\/(?<name>[^/]+)\/swc$/,
    handler: (req, params) => api.handleGetNeuronSwc(params.name),
    responseType: 'text',
  },
  {
    method: 'GET',
    pattern: /^\/api\/neuron\/(?<name>[^/]+)\/similar$/,
    handler: (req, params) => api.handleGetSimilarNeurons(params.name),
  },
  { method: 'GET', pattern: /^\/api\/collection$/, handler: () => api.handleListCollection() },
  {
    method: 'POST',
    pattern: /^\/api\/collection$/,
    handler: (req) => readJsonBody(req).then(api.handleAddToCollection),
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/collection\/(?<name>[^/]+)$/,
    handler: (req, params) => api.handleRemoveFromCollection(params.name),
  },
  {
    method: 'GET',
    pattern: /^\/api\/compare$/,
    handler: (req, params, search) =>
      api.handleCompareNeurons((search.get('names') || '').split(',').filter(Boolean)),
  },
];

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function serveStaticFile(res, pathname) {
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(PUBLIC_DIR, safePath === '/' ? 'index.html' : safePath);

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

async function handleApiRequest(req, res, url, route) {
  const match = url.pathname.match(route.pattern);
  try {
    const result = await route.handler(req, match.groups ?? {}, url.searchParams);
    if (route.responseType === 'text') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(result);
      return;
    }
    sendJson(res, 200, result ?? { ok: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error(error);
    sendJson(res, status, { error: error.message });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    const route = ROUTES.find((candidate) => candidate.method === req.method && candidate.pattern.test(url.pathname));
    if (!route) return sendJson(res, 404, { error: 'Not found' });
    return handleApiRequest(req, res, url, route);
  }

  await serveStaticFile(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Arbor running at http://localhost:${PORT}`);
});
