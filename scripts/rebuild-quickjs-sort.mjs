import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vendor = join(root, 'lib/coding/vendor');
const manifest = JSON.parse(readFileSync(join(vendor, 'provenance.json'), 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(manifest.sdk.repository, 'https://github.com/justjake/quickjs-emscripten');
assert.equal(manifest.compiler.repository, 'https://github.com/emscripten-core/emsdk');
for (const ref of [manifest.sdk.commit, manifest.compiler.managerCommit]) assert.match(ref, /^[a-f0-9]{40}$/);
assert.equal(manifest.sdk.version, '0.32.0');
assert.equal(manifest.compiler.version, '5.0.1');
assert.equal(hash(readFileSync(join(vendor, manifest.patch.file))), manifest.patch.sha256);
const work = mkdtempSync(join(tmpdir(), 'devshark-quickjs-'));
const run = (command, args, cwd = work, options = {}) => execFileSync(command, args, { cwd, stdio: 'inherit', ...options });
const checkout = (url, ref, path) => {
  mkdirSync(path);
  run('git', ['init', '--quiet', path]);
  run('git', ['-C', path, 'remote', 'add', 'origin', url]);
  run('git', ['-C', path, 'fetch', '--quiet', '--depth=1', 'origin', ref]);
  run('git', ['-C', path, '-c', 'core.autocrlf=false', '-c', 'advice.detachedHead=false', 'checkout', '--quiet', '--detach', 'FETCH_HEAD']);
};
try {
  const source = join(work, 'source');
  checkout(manifest.sdk.repository, manifest.sdk.commit, source);
  assert.equal(hash(readFileSync(join(source, 'vendor/quickjs/quickjs.c'))), manifest.sdk.vendorSourceSha256);
  run('git', ['apply', '--check', join(vendor, manifest.patch.file)], source);
  run('git', ['apply', join(vendor, manifest.patch.file)], source);
  let emsdk = process.env.SHARK_EMSDK_DIR && resolve(process.env.SHARK_EMSDK_DIR);
  if (!emsdk) {
    emsdk = join(work, 'emsdk');
    checkout(manifest.compiler.repository, manifest.compiler.managerCommit, emsdk);
    const python = process.env.SHARK_PYTHON || 'python3';
    run(python, ['-c', 'import sys; assert sys.version_info >= (3, 10), "Python3.10+ is required; set SHARK_PYTHON"']);
    run(python, ['emsdk.py', 'install', manifest.compiler.version], emsdk);
    run(python, ['emsdk.py', 'activate', manifest.compiler.version], emsdk);
  }
  const inSdk = (command, args, cwd, options = {}) => run('bash', [
    '-c', '. "$1/emsdk_env.sh" >/dev/null 2>&1; shift; exec "$@"',
    'quickjs-build', emsdk, command, ...args,
  ], cwd, options);
  const compiler = inSdk('emcc', ['--version'], source, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  assert(compiler.includes(manifest.compiler.version) && compiler.includes(manifest.compiler.emscriptenCommit), 'Pinned Emscripten version/commit required');
  const variantDir = join(source, 'packages', manifest.build.variant);
  const makefile = join(variantDir, 'Makefile');
  const recipe = readFileSync(makefile, 'utf8');
  assert.equal(recipe.split('CFLAGS_WASM+=--closure 1').length, 2);
  writeFileSync(makefile, recipe.replace('CFLAGS_WASM+=--closure 1', 'CFLAGS_WASM+=--closure 0'));
  const generator = join(source, 'scripts/generate.rebuild.cjs');
  // The generator uses only readFileSync/writeFileSync from fs-extra. The
  // compiled output stays under upstream/scripts so its repoRoot is unchanged.
  run(join(root, 'node_modules/.bin/esbuild'), [join(source, 'scripts/generate.ts'),
    '--bundle', '--platform=node', '--format=cjs', '--tsconfig-raw={}',
    '--alias:fs-extra=node:fs', '--alias:prettier=' + join(root, 'client/node_modules/prettier/index.mjs'),
    '--outfile=' + generator, '--log-level=warning'], source);
  inSdk('make', ['dist/emscripten-module.cjs', `GENERATE_TS=${process.execPath} ${generator}`], variantDir, {
    env: { ...process.env, DEBUG: 'false', ASYNCIFY: 'false', TYPE_ONLY: 'false' },
  });
  const require = createRequire(join(root, 'package.json'));
  const sdk = require('quickjs-emscripten');
  const imported = require('@jitl/quickjs-singlefile-cjs-release-sync');
  const base = imported.default ?? imported;
  const factory = require(join(variantDir, 'dist/emscripten-module.cjs'));
  const original = WebAssembly.instantiate;
  let bytes;
  WebAssembly.instantiate = async (input, ...args) => {
    if (!(input instanceof WebAssembly.Module)) {
      assert(!bytes, 'Only one temporary wasm instantiation expected');
      bytes = Buffer.from(input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength));
    }
    return original(input, ...args);
  };
  try { await sdk.newQuickJSWASMModuleFromVariant({ ...base, importModuleLoader: async () => factory }); }
  finally { WebAssembly.instantiate = original; }
  assert(bytes, 'Built factory must expose its wasm bytes through instantiation');
  assert.equal(bytes.length, manifest.artifact.wasmBytes);
  assert.equal(hash(bytes), manifest.artifact.wasmSha256, 'Rebuilt wasm must match the reviewed payload');
  const payload = '// Generated QuickJS wasm bytes; see README.md and provenance.json.\nmodule.exports = ' + JSON.stringify(bytes.toString('base64')) + ';\n';
  assert.equal(hash(payload), manifest.artifact.sha256);
  assert.equal(payload, readFileSync(join(vendor, manifest.artifact.file), 'utf8'));
  console.log(`PASS pinned QuickJS source/compiler rebuild: ${bytes.length} wasm bytes, ${hash(bytes)}`);
} finally {
  if (process.env.SHARK_KEEP_QUICKJS_BUILD === '1') console.log('Build retained:', work);
  else rmSync(work, { recursive: true, force: true });
}
