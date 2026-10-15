import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function checkQuickjsProvenance() {
  const root = 'lib/coding/vendor';
  const manifest = JSON.parse(readFileSync(join(root, 'provenance.json'), 'utf8'));
  const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
  const payload = readFileSync(join(root, manifest.artifact.file), 'utf8');
  assert.equal(manifest.schema, 'devshark.quickjs-sort/v1');
  assert.equal(manifest.sdk.version, '0.32.0');
  assert.equal(JSON.parse(readFileSync('node_modules/@jitl/quickjs-singlefile-cjs-release-sync/package.json', 'utf8')).version, manifest.build.abiSdk);
  assert.equal(hash(payload), manifest.artifact.sha256);
  assert.equal(Buffer.byteLength(payload), manifest.artifact.bytes);
  const encoded = payload.match(/^\/\/ Generated QuickJS wasm bytes; see README\.md and provenance\.json\.\nmodule\.exports = ("[A-Za-z0-9+/=]+");\n$/);
  assert(encoded, 'Runtime artifact is a data-only CommonJS string');
  const bytes = Buffer.from(JSON.parse(encoded[1]), 'base64');
  assert.equal(bytes.length, manifest.artifact.wasmBytes);
  assert.equal(hash(bytes), manifest.artifact.wasmSha256);
  assert(WebAssembly.validate(bytes));
  assert.equal(hash(readFileSync(join(root, manifest.patch.file))), manifest.patch.sha256);
  console.log('PASS integrity: pinned runtime payload, decoded wasm, ABI version and source patch hashes');
}
