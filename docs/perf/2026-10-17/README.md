# devShark performance investigation — 17 October 2026

Issue [#475](https://github.com/lukaskourilcz/react-express-app/issues/475), PR [#476](https://github.com/lukaskourilcz/react-express-app/pull/476).
Baseline main: `db95ad2afc89873222ee90ebdece2023ae8af474`. Tested application changes: `2e293e558babb89818cfce1a7e81a405e983393d`.

## Result and approval boundary

The monitoring SDK is 109,266 gzip bytes smaller (157,957 → 48,691, **69.2%**). Eight concurrent settings callers now initiate one provider read instead of eight. An old read can no longer overwrite settings cached after a successful save. Neither result relies on a faster production database or on a changed visual design.

The local mobile home-page LCP median improved 3,320 → 3,076 ms (7.3%); repeat-browser LCP improved 792 → 604 ms. Several other pages did not improve, and desktop guide LCP increased in this small sample. These are **lab observations, not a production speedup claim or statistically established effect**.

Production remains unchanged. The preview proposes moving Vercel functions next to the existing Stockholm database. **Owner approval is required before merging, deploying to production or applying any production migration.** No schema migration is included. No production accounts, submissions, orders, payments, messages or jobs were created.

## Verified technology and geography

- React 19.2.8, TypeScript 5.9.3, Vite-generated static SPA, React Router, TanStack Query; Node 24 Vercel functions. The historical repository name contains Express; the deployed application uses the Vercel handlers.
- Vercel project `prj_E07Vsg4wS2K2jTximjwW6Nviahyj`. Production deployment `dpl_CCFSoSeN5wKth8zj5KCWeK1ZNWsp`, baseline main SHA above, function region **iad1 (Washington)**. Public static responses observed at edge **fra1**.
- Supabase project `rvlybcjdpafwyeuojvhl`, healthy, Postgres 17.6.1.127, **eu-north-1 (Stockholm)**. Metadata read through authenticated management tools; no database relocation.
- Exact preview `dpl_ALkdmw2KhLejwHuVSuv1d72yJ6kX`, SHA `2e293e55…`, READY, function region **arn1 (Stockholm)**. [Protected preview](https://react-express-9k6qeygje-lukas-kourils-projects.vercel.app). Normal Vercel access is required; no protection-bypass token is committed.

Vercel recommends placing functions near data ([function regions](https://vercel.com/docs/functions/configuring-functions/region), [region identifiers](https://vercel.com/docs/regions)). The production API-to-database path crosses the Atlantic; this supports the regional proposal. It does **not** quantify the database-round-trip saving. Sandbox grading location and execution were not changed or benchmarked.

## Causes and fixes

### Monitoring JavaScript

`initSentry` retained an entire dynamically imported module namespace. Rollup therefore kept public exports unrelated to the three APIs used by this application, including Replay/profiling code. A closed module now exports only `init`, `browserTracingIntegration` and `captureException`; the dynamic import targets that module.

Error reporting still initializes at the same point, with the same tracing sample rate and privacy settings. It has not been disabled or postponed to make a score look better. Consent-dependent PostHog was not loaded in the essential-consent measurements. A separate 60,000-byte monitoring gzip budget now prevents this regression, in addition to the unchanged 243,000-byte initial HTML dependency budget.

The byte comparison uses Node gzip on both production-shaped builds with identical placeholder environment variables from `docs/quality/bundle-budget.json`. It is not Chrome transferSize: headers and the fixture server's gzip representation produce slightly different wire totals. The initial entry graph remains essentially unchanged; the saving is a bootstrap-started dynamic monitoring chunk, not a 69% reduction of all JavaScript.

### Concurrent settings reads and stale responses

The existing 15-second settings cache did not deduplicate simultaneous misses. A deferred synthetic provider reproduced eight reads for eight callers. One in-flight promise now coalesces callers within the same process/cache generation. This is **not cross-instance caching**.

A generation counter makes successful saves and explicit resets win over reads already in flight. Promise-identity cleanup cannot remove a newer read. Existing TTL, validation, safe defaults, retry/timeout behavior and transaction checks remain in place. The cache contains the existing application-wide settings only; no new per-user shared cache is introduced. Failed reads settle to the existing defaults and are coalesced even when the SDK retries the underlying request.

Evidence: [before](settings-before.json), [after](settings-after.json). Permanent tests cover a concurrent miss, a read completing after a save, reset/retry and a provider outage, with fake hosts and keys only.

### Observability and placement

Existing production responses did not expose a timing breakdown. The common request wrapper now emits `Server-Timing`: `app`, `db_http`, `auth_http`, with aggregate duration and call count only. Supabase clients use a request-scoped transport wrapper. Nested wrappers share the response context; concurrent requests remain isolated. Header setting occurs before the first response write, and the original response methods are restored.

`db_http` is HTTP time **to response headers, including network and Supabase gateway/database work**, not SQL CPU time or full body parsing. `app` begins inside the common handler, excluding platform routing/module startup, and ends at the first response write. Parallel spans overlap and cannot be subtracted from `app`. Cache-joined callers may wait without initiating their own transport. Public CDN hits can replay historical origin timings; always inspect `Age` and `x-vercel-cache`. No SQL text, URLs, tokens, identity or payloads enter these headers.

`vercel.json` proposes `regions: ["arn1"]`. Preview metadata and read-only method-guard requests confirm the deployed function uses Stockholm. Database and production deployment are untouched.

## Comparable browser experiment

Host: macOS/Apple arm64, Google Chrome **155.0.8059.80**, Playwright 1.63.0, Node 24.19.0. CDP network/CPU emulation, not physical phones. Both builds have the same production-shaped placeholder environment. Before and after run sequentially without concurrent local builds/tests; each combination has three samples.

- Mobile: 390 × 844, device scale 1, CPU ×4 slowdown, 150 ms latency, 1.6 Mbps download.
- Desktop: 1440 × 1000, device scale 1, CPU ×1, 20 ms latency, 10 Mbps download.
- Light theme, reduced motion, anonymous, essential consent; service workers blocked. External destinations and writes blocked. A localhost server supplies identical invented public settings after 400 ms, with commercial features disabled; no database/provider credentials.
- Fresh browser/context per cold/repeat pair; browser cache enabled and bounded. Repeat navigation uses the same context. **Cold browser is not proof of a cold function, cold database or cold CDN**. Cache-hit counters and each resource's timings/bytes are preserved.
- Navigation waits for load plus three seconds on mobile/1.5 seconds desktop. LCP and CLS are captured before the interaction. Safe menu/theme controls are then exercised for EventTiming; nothing starts a game or authenticates. EventTiming has a 16 ms reporting threshold: absent entries do not mean zero latency.
- `navigation.ttfb` is responseStart minus requestStart; DNS/connect/TLS are separate navigation fields. Resource records include request wait, download, encoded/decoded/transfer bytes. Browser-cache zero-transfer resources are not new downloads.
- 5 routes × 2 profiles × 3 samples × 2 browser-cache states = **60 navigations per build**, 120 total. Values below are medians; CLS column is the maximum across both cache states.

| Profile / route | Cold browser LCP before → after | Repeat browser LCP before → after | Max CLS before → after |
|---|---:|---:|---:|
| mobile `/` | 3320 → 3076 ms | 792 → 604 ms | 0.0000 → 0.0000 |
| mobile `/quiz` | 2168 → 2180 ms | 284 → 304 ms | 0.0000 → 0.0000 |
| mobile `/coding` | 2196 → 2152 ms | 376 → 392 ms | 0.0000 → 0.0000 |
| mobile `/premium` | 1580 → 1216 ms | 300 → 304 ms | 0.0155 → 0.0155 |
| mobile `/topics/javascript-closures` | 1252 → 1244 ms | 836 → 852 ms | 0.0000 → 0.0000 |
| desktop `/` | 772 → 816 ms | 512 → 500 ms | 0.0000 → 0.0000 |
| desktop `/quiz` | 432 → 412 ms | 80 → 84 ms | 0.0000 → 0.0000 |
| desktop `/coding` | 424 → 424 ms | 104 → 80 ms | 0.0000 → 0.0000 |
| desktop `/premium` | 272 → 320 ms | 516 → 524 ms | 0.0303 → 0.0303 |
| desktop `/topics/javascript-closures` | 816 → 908 ms | 500 → 564 ms | 0.0000 → 0.0000 |

The small desktop guide regression (816 → 908 ms) and home regression (772 → 816 ms) are retained rather than omitted. With three samples, host/scheduling variance and the fixed synthetic settings delay, this experiment does not establish a reliable desktop rendering gain. Premium's existing layout shift is unchanged (maximum 0.0303 desktop, 0.0155 mobile). Other sampled lab routes had zero observed CLS.

The home page's complete cold-browser JavaScript transfer in this fixture was **435,322 → 325,426 bytes** including resource timing header estimates (25.2% less); encoded JS bodies were 427,822 → 317,926 bytes. That is the whole-page transfer comparison, separate from the 69.2% SDK-only gzip result. All 120 lab navigations requested public settings once; the eight-to-one server fix concerns concurrent callers at the server, not an invented eightfold reduction in one browser's requests.

Across the five routes, the median of each navigation's slowest reported menu/theme event was unchanged: mobile cold 96 ms, repeat 32 ms; desktop cold 80 ms, repeat 24 ms. These are distinct controls on the two profiles and a small EventTiming sample, not field INP or proof that all interactions are fast.

Raw sanitized results: [before](lab-before.json), [after](lab-after.json). Headings/button text are omitted; resource paths have no query strings. An earlier exploratory production run overlapped a local build; an initial local run failed from temporary disk pressure. Neither is included as accepted comparison evidence. The successful rerun used a fresh browser per pair and bounded disk caches.

## Production baseline and separation of costs

Production read-only curl samples are in [production-api-before.json](production-api-before.json), three sequential fresh connections per path. Times include real network and connection establishment, without emulation:

| Request | CDN state | End-to-end TTFB | Interpretation |
|---|---|---:|---|
| `/` | HIT, all three | 89–151 ms | Static edge delivery |
| `/api/settings` | HIT, all three | 85–124 ms | Cached public response, not a database measurement |
| `/api/quiz/roadmap` | first MISS, then HIT | 987 ms; 278 / 131 ms | First request includes connection and origin work |
| `/api/leaderboard?period=30d` | first MISS, then HIT | 1,895 ms; 114 / 109 ms | First request includes ~1,052 ms DNS/TCP/TLS; cannot attribute all delay to the server |

Curl's connect and TLS fields are cumulative from request start. Approximate post-handshake wait on the first roadmap/leaderboard read was 919/843 ms respectively, still including network, queueing, function and downstream work. A CDN MISS does not prove a cold function. The existing production version lacks server timings, so pure same-request SQL/Auth/platform startup decomposition is unavailable.

A second, quiet production browser pass used the current probe with no concurrent local builds/tests: eight routes × two profiles × two samples × cold/repeat = **64 read-only navigations**. The same CDP profiles above apply, against the actual production CDN and APIs. This is a baseline only; production has not been changed. Raw data: [production-browser-baseline.json](production-browser-baseline.json). Two-sample medians are descriptive, not population estimates.

| Production route | Mobile cold / repeat LCP | Desktop cold / repeat LCP | Max observed CLS |
|---|---:|---:|---:|
| `/` | 3496 / 748 ms | 900 / 272 ms | 0.0000 |
| `/quiz` | 2280 / 296 ms | 586 / 98 ms | 0.0000 |
| `/learn` | 2348 / 294 ms | 1080 / 146 ms | 0.0000 |
| `/coding` | 2254 / 306 ms | 844 / 106 ms | 0.0000 |
| `/leaderboard` | 2408 / 304 ms | 550 / 128 ms | 0.0000 |
| `/premium` | 1516 / 304 ms | 428 / 356 ms | 0.0191 |
| `/topics/javascript-closures` | 1500 / 684 ms | 796 / 198 ms | 0.0000 |
| `/big-o` | 2306 / 308 ms | 906 / 442 ms | 0.0000 |

Two bounded read-only `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` probes returned plan/timing metadata only, no learner rows: [database-plans.json](database-plans.json). Settings uses its primary-key index: execution **0.078 ms**, planning 0.565 ms, two shared-buffer hits. Reading 485 small override rows took **0.156 ms**, planning 0.396 ms, four shared-buffer hits. These were warm-buffer management-connection microbenchmarks, not browser API, RLS or HTTP latency. No blocks were dirtied/written. They do not justify speculative indexes or a database migration.

Three equivalent `HEAD /api/settings` method-guard requests in each deployment returned 405 before Auth/DB access: [production](production-readonly-head.json), [preview](preview-readonly-head.json). Production traces contain `fra1::iad1`; preview contains `fra1::arn1` and `app` 0.0–0.3 ms, zero DB/Auth calls, private/no-store. End-to-end median TTFB was 350.44 ms production versus 153.99 ms preview; production had a 2,597 ms outlier. With n=3, different deployments/protection paths, and **no business API or DB query**, this is routing verification only, not evidence of a 56% API or database improvement.

The exact protected preview also completed **20 navigations** (five routes, both profiles, cold/repeat, one sample): [preview-browser-fixtures.json](preview-browser-fixtures.json). All API reads were intercepted with invented responses before transmission; writes and external destinations were blocked. These verify preview rendering/static delivery under the regional configuration, **not live backend behavior or a comparable production speedup**. Its real environment differs from the placeholder lab builds, so its single samples are not added to the before/after table.

## Existing behavior deliberately retained

TanStack Query already provides client read caching/deduplication, independent leaderboard reads are started together, and server request memoization exists. Navigation retains SPA history/current content during lazy loading. No speculative new prefetches or full-page reloads were added. Personal endpoint cache policies remain private/no-store unless an existing explicitly public response overrides them. Checkout, stock/price/eligibility checks remain server-owned; this work changes no commercial authorization.

Two preloaded self-hosted variable Latin WOFF2 files total 73,092 encoded bytes (Manrope 24,836 + Inter 48,256). Home imagery is a small SVG wordmark/icons, not a large photographic LCP. No new image/font conversion or third-party script was added without evidence. Monitoring was the larger avoidable transfer cost.

## Reproduction

Use the Node runtime required by the repository, `npm ci` and `npm ci --prefix client`, with Chrome available. Build baseline and branch in separate checkouts using the **same placeholder variables** in `docs/quality/bundle-budget.json` (never production credentials). Preserve each `client/dist`.

```sh
npm run perf:fixture -- /absolute/before/dist 4180
npm run perf:fixture -- /absolute/after/dist 4181
# Run sequentially on an otherwise idle host; set CHROME_BIN if needed.
npm run perf:measure -- --url=http://127.0.0.1:4180 --samples=3 --routes=/,/quiz,/coding,/premium,/topics/javascript-closures --output=/tmp/before.json
npm run perf:measure -- --url=http://127.0.0.1:4181 --samples=3 --routes=/,/quiz,/coding,/premium,/topics/javascript-closures --output=/tmp/after.json
npm run test:performance
npm run check:bundle
```

The probe defaults to read-only anonymous production measurement. It blocks writes and external destinations via CDP interception (rather than Playwright routing, which disables cache). Optional `--fixture=1` supplies public invented settings in-browser and returns 503 for other API reads before any request is sent. Use that mode for previews so their environment cannot contact real providers. Protected access, if needed, is supplied by a private file through `--access=...`; never publish its URL/token.

## Limits and remaining approval

There is no real-user p75 LCP/CLS or field INP dataset in this report. Menu/theme EventTiming is a bounded lab check, **not INP** ([INP measurement](https://web.dev/articles/inp)). Authenticated learning/coding/profile paths are exercised only with existing isolated browser fixtures. Physical device/network conditions, actual function cold starts and a successful same-request production DB/Auth breakdown remain unmeasured. Do not turn these lab results into a production performance guarantee.

After approval and required checks, deploy through the normal release process, then repeat the same bounded read-only probes against production and inspect new timing/cache headers. Do not relocate the database. No commercial activation or production test submissions are needed for this change.
