import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const manifest = JSON.parse(readFileSync('client/dist/.vite/manifest.json', 'utf8'));
const visited = new Set(); const files = new Set();
function visit(key) {
  if (visited.has(key)) return; visited.add(key);
  const chunk = manifest[key]; if (!chunk) throw new Error(`Missing manifest chunk ${key}`);
  files.add(chunk.file); (chunk.css || []).forEach(file => files.add(file));
  (chunk.imports || []).forEach(visit);
}
visit('index.html');
const sizes = [...files].map(file => ({ file, gzipBytes: gzipSync(readFileSync(`client/dist/${file}`)).byteLength }));
const initialGzipBytes = sizes.reduce((sum, item) => sum + item.gzipBytes, 0);
const budget = JSON.parse(readFileSync('docs/quality/bundle-budget.json', 'utf8'));
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/bundle.json', JSON.stringify({ initialGzipBytes, sizes }, null, 2) + '\n');
console.log(`Initial static JS + CSS: ${initialGzipBytes} gzip bytes; budget ${budget.initialGzipBytes}. Lazy routes, coding sandbox and fonts are measured separately by Lighthouse.`);
if (initialGzipBytes > budget.initialGzipBytes) process.exitCode = 1;
