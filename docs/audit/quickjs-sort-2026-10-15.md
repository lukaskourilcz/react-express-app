# Bounded Node24 sort compatibility — 15 October 2026

Issue [#422](https://github.com/lukaskourilcz/react-express-app/issues/422).

The installed SDK0.32 engine skips indexed writes when a sorted value retains
its position. The original13-case native/worker comparison found six differences;
24 further cases found eight. A source patch removes that optimization and
preserves the supported Node24 zero/singleton early return. All37 constructed
cases now agree in the actual JavaScript worker. The compiled React guest also
checks frozen sorted input, an observable setter and an unread singleton getter.
Comparator call order/count and universal ECMAScript parity are not asserted.
The current specification requires singleton writeback; the explicit length<2
exception follows the supported Node24 implementation, as documented in the
[vendor notes](../../lib/coding/vendor/README.md).

Both learner VMs use the same503122-byte wasm payload with the existing SDK0.32
loader/FFI through its supported wasmModule hook. No host Array.prototype shim,
learner capability, test/result authority, isolation budget, dependency/lockfile,
production dependency snapshot, database, entitlement or reward policy changes.
The React guest bundles the matching SDK boundary so its existing snapshot
cannot substitute a different ABI. The initially tried factory packaging failed
in the local ESM harness; it was replaced with this data-only payload, and both
ESM/CJS harnesses and the real compiled guest pass. Those exploratory failures
are not represented as successful checks.

Provenance pins the SDK source commit, vendored C hash, Emsdk5.0.1 compiler
commit, patch hash, data-module hash, decoded wasm hash and sizes. Redistribution
notices are included. The checked-in rebuild script fetched a separate temporary
source tree and produced byte-identical wasm/module output locally. It neither
overwrites the checked-in artifact nor changes a system profile. Required CI
repeats the build on runtime/build/dependency-input changes. Cross-platform
reproducibility is pending the actual Linux CI result.

## Executed local checks

- API/script/client-tooling type checks, launch contracts (including compiled
  React guest), full grading/Learn integrity,263/263 native bindings, build,
  unused/security checks and both production dependency audits pass. Both audits
  report zero vulnerabilities. Twelve physical handlers; archived Czech unchanged.
- Required integrity verifies data-only encoding, payload/decoded wasm/patch
  hashes, WebAssembly validity and installed SDK ABI version before worker tests.
- The full coding-content run reported exactly one timing-budget failure:
  react-product-explorer's fetch-but-render-nothing negative consumed9352ms,
  exceeding its6000ms guard. The targeted unchanged task rerun passes the full
  contract. This is recorded as a failed broad run plus a successful focused
  recheck, not as a passing full run. Required fresh CI must pass before merge.
- No visual layout changes. The B073 content cohort has its separate80 passing
  fixture-backed light/dark responsive probes; no new device acceptance is claimed.

## Exact production-before evidence

The baseline was READY production dpl_48gWCzxissSMHVEetrEnUKXXjL57, merge
 dcee58e3d25f2d22ee1a501218b2dd960d411fe4 (PR#428). Actual guest Submits on
free js-debug-average and react-heading-and-intro each pass the ordinary reference
control and reject the otherwise-correct solution requiring sorted frozen input
to throw TypeError. Four observations, guest0XP/null progress, no fixture accounts.
This independently demonstrates the deployed gap in both grading paths.

## Remaining release acceptance

Required Linux rebuild/full checks, exact-head preview regression/control,
guarded merge, then exact production regression/control and before/after live
alias checks. Keep #422 open until those results exist. Content coverage remains
395/725 in source,390/725 production-verified;330 coding reviews remain.
