// Read-only localhost lab with invented public settings and fixed API delay.
// No database connection, credentials, user session, provider or write handler.
import http from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(process.argv[2]);
const port = Number(process.argv[3] || 4180);
const settings = JSON.parse(readFileSync('tests/fixtures/api-settings.json', 'utf8'));
settings.billing = { ...settings.billing, enabled: false, launchOffer: false };
const files = new Map();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };

http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname.startsWith('/api/')) {
    return setTimeout(() => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(pathname === '/api/settings' ? settings : { error: { code: 'fixture_only', message: 'No external provider in this lab' } }));
    }, 400);
  }
  // The React iframe has an opaque origin. Match production's public
  // sandbox/worker asset policy; no API or personal response receives CORS.
  if (/^\/(?:sandbox\/|assets\/coding-worker\/)/.test(pathname)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  let file;
  try { file = resolve(root, '.' + decodeURIComponent(pathname)); }
  catch { res.writeHead(400); return res.end(); }
  if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403); return res.end(); }
  try { if (statSync(file).isDirectory()) file = resolve(file, 'index.html'); }
  catch { file = resolve(root, 'index.html'); }
  try {
    let entry = files.get(file);
    if (!entry) {
      const body = readFileSync(file);
      entry = { body, gzip: /\.(js|css|html|json|svg)$/.test(file) ? gzipSync(body) : null, type: types[extname(file)] || 'application/octet-stream' };
      files.set(file, entry);
    }
    res.setHeader('Content-Type', entry.type);
    res.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public,max-age=31536000,immutable' : 'no-cache');
    res.setHeader('Vary', 'Accept-Encoding');
    const compressed = entry.gzip && req.headers['accept-encoding']?.includes('gzip');
    if (compressed) res.setHeader('Content-Encoding', 'gzip');
    res.end(req.method === 'HEAD' ? undefined : compressed ? entry.gzip : entry.body);
  } catch { res.writeHead(404); res.end(); }
}).listen(port, '127.0.0.1', () => console.log(`Read-only fixture on http://127.0.0.1:${port}`));
