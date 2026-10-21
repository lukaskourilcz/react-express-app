/** Pinned Node24-compatible QuickJS module, shared by both learner VMs.
 * SDK0.32's supported wasmModule hook keeps its existing loader and FFI ABI.
 * Module bytes are embedded for the self-contained worker/React guest bundle.
 */
import { Buffer } from 'node:buffer';
import { newVariant } from 'quickjs-emscripten';
import importedVariant from '@jitl/quickjs-singlefile-cjs-release-sync';
import wasmBase64 from './vendor/quickjs-node24.cjs';

// Node ESM wraps the CommonJS default; the bundled worker resolves it directly.
const base = (importedVariant as typeof importedVariant & { default?: typeof importedVariant }).default ?? importedVariant;
let binary: ArrayBuffer | undefined;
const loadBinary = () => binary ??= Uint8Array.from(Buffer.from(wasmBase64, 'base64')).buffer;

export default newVariant(base, {
  wasmModule: () => WebAssembly.compile(loadBinary()),
  wasmBinary: async () => loadBinary(),
});
