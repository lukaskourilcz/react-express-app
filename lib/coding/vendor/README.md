# QuickJS sort compatibility

`quickjs-node24.cjs` contains only base64 WebAssembly bytes. The shared
`../quickjs-variant.ts` uses the published SDK0.32 `wasmModule` hook with its
existing loader and FFI. The JavaScript/TypeScript worker and React learner VM
instantiate the same pinned module. The React guest bundles that SDK boundary,
so an existing dependency snapshot cannot silently substitute a different ABI.

The patch makes sorted values pass through observable Set operations even when
they retain their original position. Readonly properties, setters and proxies
therefore behave like the native Node24 Run realm. It also preserves Node24's
length<2 early return, including no indexed getter/proxy calls. The current
[ECMAScript sort algorithm](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.sort)
requires writeback for every sorted item; the small-length compatibility guard
follows [the actual supported Node24 implementation](https://github.com/nodejs/node/blob/v24.19.0/deps/v8/third_party/v8/builtins/array-sort.tq#L1436-L1456).
This is bounded runtime compatibility, without a full ECMAScript conformance claim.

`sort-node24.patch`, `provenance.json` and `LICENSES.md` record the exact upstream
source, compiler, build choice, decoded/payload hashes and redistribution notices.
The original thirteen cases had six native/worker differences; twenty-four
additional cases had eight. All37 pass on the patched module. The required
integrity suite executes them in the actual worker; launch checks also exercise
the real compiled React guest. Comparator call order/count is not asserted.

Rebuild/check from a checkout with both root/client dependencies installed:

```sh
npm run check:quickjs-build
```

This needs Git, Make, Node22–24, Python3.10+ and network access. It creates and
removes its own temporary source/toolchain directory. `SHARK_PYTHON` can name a
suitable interpreter; `SHARK_EMSDK_DIR` can reuse an installed Emsdk5.0.1. No
system profile, Docker service, production configuration or dependency snapshot
is changed. `SHARK_KEEP_QUICKJS_BUILD=1` preserves the generated directory for
inspection. CI repeats the build when this runtime or its build recipe changes.
