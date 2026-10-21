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
repeats the build on runtime/build/dependency-input changes. The required Linux CI rebuild now also reproduces the reviewed bytes, in
run38802106010.

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

## Completed release acceptance

PR#429 passed required run38802106010 at exact head45a4fbd5b6109bd374b17f3d2236a92f77b9c337 (verify28m26s; SQL40s), including Linux byte-identical pinned-source runtime rebuild, full coding catalogue, grading/Learn authority and browser/release gates. It merged at53b3967b9bc5b69733bb33818fd27286a366eb84 on15October2026 at20:56:56UTC. READY production dpl_2W9Cz1xU2JPDc3LvDRMSiCLURjso matches that merge; live devshark.app alias checks before and after probes point to it, without alias error. Exact preview and production each pass eleven general guest checks and four actual JavaScript-average/React-heading regression/control Submits for #422. Ordinary controls pass before/after; the two previously rejected correct frozen-sort guards now pass after the fix. Guest0XP/null progress; no authenticated payout claim. All five B073 changed tasks return402 and await dedicated authorized Premium acceptance. Local/CI evidence includes37 actual-worker/native sort cases, compiled React guest regression and pinned artifact/ABI hashes. The broad local9352ms React-negative timing failure and successful focused rerun remain recorded; fresh required full CI passed. B073 also has30/30 final-hash selected verdicts, twenty authored-target/base25 checks and80 fixture-backed light/dark probes. Verified production coverage is395/725 coding and263/263 native; ten later B074–B075 reviews are frozen separately in #430. This completes the bounded #422 engine/release acceptance, without universal JavaScript conformance, independent/human, real-device, dedicated Premium or whole-catalogue acceptance claims.
