// Initial-load budget: the JavaScript and CSS a first visit to devshark.app
// downloads before anything interactive happens.
//
// The number has to describe what production serves, so the check builds its
// own copy of the client with production's shape instead of reading whatever
// client/dist holds. Code in the client is gated on build-time variables
// (`url && key ? createClient(...) : null` in lib/supabaseClient.ts drops the
// whole Supabase client when they are missing), and CI's main build sets only
// VITE_PRODUCT and VITE_LOCK_SUBJECT, so measuring that build left out about
// 55 kB that every visitor loads. docs/quality/bundle-budget.json lists the
// variables production sets and gives each a placeholder of realistic length;
// they apply to this measured build only, in its own output directory.
//
// The measurement follows index.html the way a browser does on a first visit:
// the entry script, its modulepreload links and its stylesheets, each gzipped.
//
//   npm run check:bundle
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const budget = JSON.parse(readFileSync('docs/quality/bundle-budget.json', 'utf8'));
const { outDir, env: shapedEnv } = budget.measuredBuild;
const outPath = `client/${outDir}`;

const shaped = Object.entries(shapedEnv);
rmSync(outPath, { recursive: true, force: true });
const build = spawnSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'warn'], {
  cwd: 'client',
  env: { ...process.env, ...shapedEnv },
  stdio: 'inherit',
});
if (build.status !== 0) {
  console.error(`The measured build failed (exit ${build.status}).`);
  process.exit(build.status ?? 1);
}

// Every same-origin request index.html starts on its own: module entry,
// modulepreload links and stylesheets.
const html = readFileSync(`${outPath}/index.html`, 'utf8');
const requests = [];
for (const tag of html.match(/<(?:script|link)\b[^>]*>/g) ?? []) {
  const attr = (name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  const isEntry = tag.startsWith('<script') && attr('type') === 'module' && attr('src');
  const rel = attr('rel');
  const isPreload = tag.startsWith('<link') && (rel === 'modulepreload' || rel === 'stylesheet');
  const url = isEntry ? attr('src') : isPreload ? attr('href') : undefined;
  if (url && url.startsWith('/assets/')) requests.push(url.slice(1));
}
const files = [...new Set(requests)];
if (files.length === 0) throw new Error(`No initial requests found in ${outPath}/index.html`);

const sizes = files.map((file) => ({ file, gzipBytes: gzipSync(readFileSync(`${outPath}/${file}`)).byteLength }));
const initialGzipBytes = sizes.reduce((sum, item) => sum + item.gzipBytes, 0);
const placeholders = shaped.filter(([key]) => !['VITE_PRODUCT', 'VITE_LOCK_SUBJECT'].includes(key)).map(([key]) => key);
const configuration = {
  build: `vite build --outDir ${outDir}`,
  product: `VITE_PRODUCT=${shapedEnv.VITE_PRODUCT}, VITE_LOCK_SUBJECT=${shapedEnv.VITE_LOCK_SUBJECT}`,
  placeholders,
};

mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/bundle.json', JSON.stringify({ configuration, initialGzipBytes, budget: budget.initialGzipBytes, sizes }, null, 2) + '\n');
rmSync(outPath, { recursive: true, force: true });

console.log(`Measured a production-shaped build: ${configuration.product}, with placeholder ${placeholders.join(', ')}.`);
for (const { file, gzipBytes } of [...sizes].sort((a, b) => b.gzipBytes - a.gzipBytes)) {
  console.log(`  ${String(gzipBytes).padStart(7)}  ${file}`);
}
console.log(`Initial requests of index.html: ${files.length} files, ${initialGzipBytes} gzip bytes; budget ${budget.initialGzipBytes}. Lazy routes, the coding sandbox and fonts are measured separately by Lighthouse.`);
if (initialGzipBytes > budget.initialGzipBytes) {
  console.error(`Over budget by ${initialGzipBytes - budget.initialGzipBytes} gzip bytes.`);
  process.exitCode = 1;
}
