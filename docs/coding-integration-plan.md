# Coding challenges in devShark: integration plan

Status: plan, 2026-09-03. Implementation is tracked by the GitHub issues listed at the end. Read `CLAUDE.md`, `docs/product-architecture.md`, and `DESIGN_RULES.md` first; nothing here overrides them.

## 1. What changes

interview-prepper (Vite + React 18 + Firebase) becomes part of devShark (this repository, Vite + React 19 + Supabase). Its JavaScript, TypeScript, and React challenge tracks move here in two forms:

1. A new devShark-only **Coding** section at `/coding` with every coding challenge, organised by track and by technique, with a difficulty ladder that opens up as the learner clears the Learn foundations.
2. **Coding tasks inside Learn levels** for the `javascript`, `typescript`, and `react` topics. Each level keeps its eight questions and gains one to three coding tasks on the same topic. A level passes only when the questions reach the pass mark and every coding task passes.

Firebase is retired. Supabase becomes the only database; the owner's existing progress is imported once. The interview-prepper repository is archived after the import.

Out of scope for this plan, pending an owner decision: the system-design guided sessions and drills, the mock/runs mode, and the AI coach. The deterministic hint ladder ships; the AI coach can return later behind the existing `lib/ai-provider.ts` gates.

## 2. Product rules that bind this work

- All learning stays free. Coding tasks never sit behind support, cosmetics, or cards.
- The server owns grading, XP, scope, and one-time claims. Reference solutions never reach the client before a pass or an explicit give-up. Visible tests are not answers and may ship to the client; hidden tests stay on the server.
- Exactly twelve physical handlers remain under `api/`. Coding endpoints are new `resource=` values on existing handlers, delegating to `lib/coding/`.
- devShark stays out of StudyShark discovery. Every new route, nav item, and catalog entry is gated the same way `/typing` and `/roadmap` are today (`CURRENT_PRODUCT.id === 'devshark'`).
- EN/CS parity for every string, including prompts and hints.
- Deep End v2 design: ocean ink, tactile paper, editorial type, disciplined accents, restrained motion, visible focus. No Sandpack default theme, no glass, no neon.

## 3. Content model

### 3.1 Files

| Path | Ships to client | Contents |
| --- | --- | --- |
| `shared/coding-catalog.ts` | yes | Types, track list, tier names, technique tags, the id → level map, XP constants, badge ids |
| `lib/coding/tasks/javascript.ts`, `typescript.ts`, `react.ts` | prompt, starter, visible tests, hints: yes | Task definitions |
| `lib/coding/solutions/*.ts` | never | Reference solutions, hidden tests |
| `lib/coding/react-suites.ts`, `lib/coding/react-support.ts` | yes (per task) | Testing Library suites, fetch stub, fixtures |
| `lib/coding/handlers.ts`, `lib/coding/grade.ts`, `lib/coding/sandbox.ts`, `lib/coding/ts-check.ts` | never | API resource handlers, grading, QuickJS sandbox, TypeScript type-test runner |
| `client/src/coding/` | yes | Workbench, runner client, editor, section screens |
| `client/sandbox/` | yes (separate entry) | Self-hosted React harness page |

`scripts/test-launch-contracts.ts` gains an assertion that no file under `client/` imports `lib/coding/solutions`, and the Vite build gains the same check as a plugin so a mistake fails the build rather than a review.

### 3.2 Task shape

```ts
type CodingTrack = 'javascript' | 'typescript' | 'react';
type CodingTier = 1 | 2 | 3 | 4 | 5;

interface CodingTask {
  id: string;                 // stable slug: 'js-arrays-queue-shift'
  legacyId?: string;          // interview-prepper id ('j12', 't3', 'r7', 'c2') for the import
  track: CodingTrack;
  topic: 'javascript' | 'typescript' | 'react';
  level: number;              // Learn level 1–25 (index into LEVEL_TITLES)
  tier: CodingTier;           // 1 foundations · 2 fluency · 3 combine · 4 interview · 5 capstone
  focus: string[];            // 'for' | 'while' | 'do-while' | 'for-of' | 'for-in' | 'map' | 'filter' | 'reduce' | 'find' | 'some' | 'every' | 'push' | 'pop' | 'shift' | 'unshift' | 'splice' | 'slice' | 'sort' | 'flat' | 'hooks' | 'generics' | …
  title: Localized;           // { en, cs }
  prompt: Localized;          // markdown, deterministic text
  starter: string;
  skeleton?: string;          // hint-ladder rung
  hints: LocalizedList;       // rungs before the skeleton
  approach?: LocalizedList;   // numbered steps
  verify: 'tests' | 'checklist';
  tests?: CallTest[];         // JS/TS: { call: string; expect: unknown; async?: boolean; label?: Localized }
  typeTests?: string[];       // TS only: one-line type assertions, including `rejects` lines
  suite?: string;             // React: Testing Library source for /App.test.js
  fixtures?: Record<string, string>;
  estimatedMinutes: number;
}
```

`solutions/*.ts` map `id → { solution: string; hiddenTests?: CallTest[] }`.

### 3.3 Port of the existing catalogue

| Source (interview-prepper) | Count | Destination |
| --- | --- | --- |
| `src/challenges/javascript.js` (`j1`…) | 42 | `lib/coding/tasks/javascript.ts`, tier 3–4 by current Easy/Medium split |
| `src/challenges/typescript.js` (`t1`…) | 20 | `lib/coding/tasks/typescript.ts` |
| `src/challenges/react.js` (`r1`…) | 38 | `lib/coding/tasks/react.ts`; `verify: 'checklist'` tasks stay Coding-section only |
| `src/challenges/capstones.js` (`c1`…) | 10 | `lib/coding/tasks/react.ts`, tier 5 |
| `src/challenges/approaches/*.js` | — | `approach` field |
| `src/challenges/reactTests.js`, `reactTestSupport.js` | — | `lib/coding/react-suites.ts`, `react-support.ts` |
| `src/lib/methodShapes.js` | — | `focus` tags and the technique index on `/coding` |

Every ported task gets a `level` from its tags (the `techniquesFor` mapping in `methodShapes.js` is the starting point) and Czech copy. The node content test (`npm run test:coding`) asserts unique ids, that every reference solution passes its own visible and hidden tests (jsdom + esbuild for React, the real TypeScript compiler for `typeTests`), and that every Learn level of the three topics has at least one task.

### 3.4 New tasks: loops and array methods

The owner's requirement is confidence with every loop form and with `map`, `reduce`, `filter`, `push`, `pop`, `shift`, `unshift`, `splice`, `slice`, and friends, in JavaScript first and then mirrored in TypeScript and React. Target counts: 40 JavaScript, 20 TypeScript, 15 React. Assignment by Learn level:

| Level (javascript) | Tier | Tasks |
| --- | --- | --- |
| 4 Arrays: Basics | 1 | queue with `push`/`shift`; stack with `push`/`pop`; add to the front with `unshift`; remove a range with `splice`; copy a range with `slice` without mutating; insert at index with `splice`; rotate once with `shift` + `push`; take the last item safely |
| 6 Array Iteration | 1 | sum with `for`; count matches with `for`; reverse in place with two indexes; countdown with `while`; first divisible with `while` and `break`; `do…while` retry until a condition; join words with `for…of`; index and value with `for…of` + `entries()`; multiplication table with nested `for`; `forEach` side effects vs `map` values |
| 7 Filter & Find | 1–2 | `filter` evens; `find` by id; `some`/`every` checks; `includes`/`indexOf`; `findIndex` then `splice` |
| 8 Reduce | 2 | sum; max; count by key; group by key; flatten one level; `reduce` as a pipeline; running totals |
| 9–10 Destructuring, Spread & Rest | 2 | immutable insert/remove/replace with `slice` + spread; swap with destructuring inside a loop; variadic `sum(...nums)` with `for…of` |
| 15 Callbacks & HOFs | 3 | write `myMap`, `myFilter`, `myReduce`, `myFind` with plain loops; `pipe` |
| 23 Sets & Maps | 3 | dedupe with `Set` + `for…of`; frequency `Map`; iterate `Map` entries |
| 24–25 Edge Cases, Mixed Mastery | 3 | chunk; zip; rotate by n; run-length encode; two-pointer pair sum; binary search; sliding-window max; matrix transpose with nested loops; paginate with `slice`; stable partition |

| Level (typescript) | Tier | Tasks |
| --- | --- | --- |
| 4 Arrays & Tuples | 1 | typed queue/stack; `readonly` array rejects `push` (type test) so the learner reaches for spread; tuple returns from a loop |
| 11–12 Narrowing, Type Guards | 2 | filter with a type-guard predicate; narrowing inside `for…of` |
| 14–15 Generics | 2–3 | `chunk<T>`, `zip<A, B>`, `groupBy<T, K extends PropertyKey>` returning `Record<K, T[]>`, `myReduce<T, U>` |
| 18–20 Partial, Pick, Record | 3 | immutable update helpers typed with `Partial<T>`; `Record` counters |
| 25 Mixed Mastery | 3–4 | typed two-pointer, binary search, sliding window |

| Level (react) | Tier | Tasks |
| --- | --- | --- |
| 4 Rendering Lists | 1 | render a list with keys; `filter` before `map` |
| 9 State: Objects & Arrays | 1–2 | add (immutable push), remove (`filter`), insert at index (`slice` + spread), reorder (move up/down), toggle in place with `map` |
| 15 Forms & Inputs | 2 | todo list that prepends (`unshift` semantics) and clears |
| 19 useReducer | 3 | undo stack with push/pop; queue with shift |
| 21 Custom Hooks | 3 | `useQueue`, `usePagination` with `slice` |
| 23 Performance Patterns | 3 | chunked grid; windowed list |

Every new task has visible tests, hidden tests where hard-coding is easy, a hint ladder, a Czech version, and a reference solution proven by the content test.

## 4. Where coding shows up

### 4.1 Learn levels

Server side (`lib/roadmap-build.ts`, `api/quiz/roadmap.ts`):

- The playable level payload gains `coding: PlayableCodingTask[]` (id, title, prompt, starter, visible tests, focus, tier, hint rungs). No solutions, no hidden tests.
- Level composition: levels 1–5 one task, 6–15 two, 16–25 two or three. Selection is deterministic per level (the catalogue's `level` field), not random.
- The sealed session (`lib/quiz-tokens.ts`) carries `codingTaskIds`. `resource=complete` requires a `roadmap_attempt_coding` row with `passed = true` for each id. Part tests and placement stay questions-only.
- Pass rule: questions at or above `LEVEL_PASS` and all coding tasks passed. Hearts do not apply to coding tasks; a failed run is feedback, not a life.
- Give-up inside a level reveals the solution through `resource=coding-reveal`, records `revealed = true`, and ends the attempt as not passed, like running out of hearts does today. The learner retries the level later.
- Mastery and pass-day rules stay as they are; a level is only "cleared" when the coding tasks passed.

Client side (`client/src/components/Roadmap.tsx`):

- `LessonRunner` gets a coding phase after the questions: a header "Build it" / "Postav to", the task counter, and the workbench. The finish screen lists question score and coding tasks separately.
- The map shows a small code glyph on levels that carry coding tasks; the level intro lists the tasks.
- Today (`client/src/lib/today.ts`) can surface a due coding review as a queue item.

### 4.2 The Coding section

Routes (devShark-only): `/coding`, `/coding/:track`, `/coding/:track/:taskId`, `/coding/review`.

- `/coding`: three track panels with `WaterlineProgress`, a "Continue" CTA to the next open task, a technique index (loops, array methods, objects, async, hooks, generics) that filters across tracks, and the review queue summary.
- `/coding/:track`: task list grouped by tier with status (open, in progress, passed, revealed, due for review), filters by technique and status.
- `/coding/:track/:taskId`: the workbench (section 5).
- `/coding/review`: tasks due for a clean re-pass.

Difficulty ladder:

| Tier | Opens when |
| --- | --- |
| 1 Foundations | always |
| 2 Fluency | always |
| 3 Combine | Learn `javascript` levels 1–10 cleared, or every tier 1–2 task of that track passed |
| 4 Interview | 80 % of tier 3 passed in that track |
| 5 Capstones (React) | tier 4 of `react` 80 % passed |

Review queue: after a pass, the task returns at 4 h, then 24 h, then 48 h; two clean passes in separate sittings retire it. Stored in `coding_progress` (`review_stage`, `next_review_at`, `clean_passes`, `last_pass_sitting`).

Nav: `nav.coding` ("Coding" / "Kódování"), route titles under `title.coding.*`, a Home strip link next to Learn and Typing.

## 5. Workbench and runner

### 5.1 Editor and layout

- CodeMirror 6 through `@uiw/react-codemirror` with `@codemirror/lang-javascript` (`jsx`, `typescript` flags). Theme built from `astryx-theme.css` tokens and the `CodeBlock` palette, with `light-dark()` so light and dark both work. Font from the existing mono stack.
- Layout: at ≥ 1024 px a two-column page inside `.de-page`, prompt and editor left, output right; below that, stacked, output tabs under the editor. Output tabs: Results, Types (TS), Console, Preview (React). Tab badges carry text status, never colour alone.
- Actions: Run, Submit, Format (prettier standalone, lazy), Reset, Hint ladder, Give up. All 44 px, keyboard reachable, with visible focus.
- States: compiler loading, running, timed out, build error, offline, permission (signed-out preview allowed, progress needs sign-in), stale result banner, long prompt, narrow width, reduced motion.

### 5.2 JavaScript and TypeScript runner

Port `jsRunner.js`, `jsWorker.js`, `jsEvaluate.js`, `deepEqual.js`, `displayValue.js`, `tsCheck.js`, and `tsCompiler.js` to TypeScript under `client/src/coding/runner/`. The worker runs each test call against the learner's code with deterministic timeouts (2 s sync, 6 s async) and a virtual clock for `setTimeout`. TypeScript tasks compile in the worker with the real compiler loaded lazily.

CSP: the document keeps `script-src 'self' 'unsafe-inline'`. The worker needs `new Function`, so it is emitted at a stable path (`worker.rollupOptions.output.entryFileNames` in `client/vite.config.ts`) and `vercel.json` serves that path with its own header, `Content-Security-Policy: default-src 'none'; script-src 'self' 'unsafe-eval'`. A worker loaded from a URL takes the policy of its own response, so the page policy stays strict.

### 5.3 React harness

A self-hosted page, `client/sandbox/index.html`, built as a second Vite entry and served from `/sandbox/`. It bundles React 19, `react-dom/client`, `@testing-library/react`, `@testing-library/dom`, a jest-style `describe/it/expect` shim with `@testing-library/jest-dom` matchers, and sucrase for JSX. The workbench loads it in one `<iframe sandbox="allow-scripts">` (opaque origin, no access to the parent's storage or Supabase session). `vercel.json` gives `/sandbox/(.*)` a `script-src 'self' 'unsafe-eval' 'unsafe-inline'` header and `frame-ancestors 'self'`.

Protocol: the parent posts `{ type: 'run', token, files }`; the harness answers `ready`, `compiled | compile-error`, `test`, and `done` with the same `token`. One iframe serves both the preview and the tests, so there is one client state to reason about. The Sandpack failure class in section 6 cannot occur: there is no hidden "done" gate, no second client, and no listener that outlives its target. Timeout handling reloads the iframe with a new token.

Fallback: if the harness is not ready in time, `@codesandbox/sandpack-react` can be used behind the same interface with the fixes from section 6 and a `frame-src https://*.codesandbox.io` allowance. That is a temporary path, not the design.

### 5.4 Grading authority

| Track | Where tests run | Verdict of record | XP path |
| --- | --- | --- | --- |
| JavaScript | worker (instant feedback) and server (QuickJS-WASM) | server | `record_verified_activity_xp` |
| TypeScript | worker and server (`typescript` compiler for `typeTests`, QuickJS for calls) | server | `record_verified_activity_xp` |
| React | harness only | client report, stored with `verified = false` | the existing client-reported learning XP path (`merge_user_xp`), documented as a limitation |

Server sandbox (`lib/coding/sandbox.ts`): `quickjs-emscripten` with a 64 MB memory limit, a 2 s interrupt deadline per call, a virtual clock, no host access. Submit sends the code and a sealed coding session; the server grades visible and hidden tests, writes `coding_attempts` and `coding_progress`, and awards XP once per task. Well under the 10 s function limit; the cold-start cost of the WASM module and the compiler is measured in the implementing issue and recorded in `docs/perf/`.

The React limitation is recorded in `docs/DEEP_END_HANDOFF.md` under "Known technical limitation to keep visible", next to the existing entries, until a server-side DOM runner is proven.

## 6. Why interview-prepper's Submit needs a refresh

Symptom: Submit on a React challenge shows "Running tests…" and, after 60 s, "The test runner did not report back in time". A refresh brings the challenge back with the saved draft and the tests run on their own.

Root cause, confirmed in `@codesandbox/sandpack-react@2.20.0` and `@codesandbox/sandpack-client@2.19.8` source:

1. The workbench pushes code with `sandpack.updateFile(activeFile, code, true)`. The provider forwards a push only to clients whose runtime `status === "done"` (`watchFileChanges`, the "Avoid concurrency" branch). Any client that is still initialising or mid-compile silently drops the push, and there are two clients, one for `SandpackPreview` and one for `SandpackTests`.
2. When a push is dropped and nothing else is talking, the workbench's 10 s rescue calls `sandpack.runSandpack()`. The same call also runs whenever `sandpack.status !== 'running'`, which is the state after the provider's 40 s bundler timeout, easily reached on a cold load because both iframes install React Testing Library.
3. `runSandpack()` calls `createClient()` for every registered iframe. `createClient()` destroys the old client. `SandpackTests` registered its results listener on the old client, once, with stable effect dependencies; queued listeners are cleared after the first registration, so the new client never gets it. Its watch-mode listener does re-attach on the next render, so the new client still runs the suite on `done`, but `total_test_end` never reaches `onComplete`. The workbench's gate therefore never settles, every later Submit hits the 60 s timeout, and only a remount (refresh, or a new provider key) recovers.

A second, unrelated defect: `src/firebase.js` uses `getDoc` without importing it (the import was dropped in commit 886f3a4), so `loadCloudProgress` throws, `cloudReady` never becomes true, and progress is never synced from or to Firestore.

Rules for the port, so the same class of bug cannot return:

- Never call `runSandpack()` on a live provider. Recover by remounting with a new key.
- One client, one run at a time, keyed by a run token. Wait for that client's `done`, dispatch `run-all-tests` yourself, and collect `test` events for that token only.
- A push made while a compile is in flight is queued until `done`, never dropped and never counted as heard.
- Timeouts are explicit states with a visible retry, not a silent restart.

The interview-prepper issue for this bug carries a fix recipe against the current code for anyone who wants the old app usable meanwhile.

## 7. Supabase migration 025

`supabase/supabase-schema-025.sql`:

```sql
create table coding_progress (
  user_id uuid not null references auth.users on delete cascade,
  task_id text not null,
  status text not null check (status in ('in_progress', 'passed', 'revealed')),
  verified boolean not null default false,
  passes int not null default 0,
  clean_passes int not null default 0,
  last_pass_sitting date,
  review_stage int not null default 0,
  next_review_at timestamptz,
  reveal_count int not null default 0,
  best_passed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);
create table coding_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  task_id text not null,
  track text not null,
  outcome text not null check (outcome in ('passed', 'failed', 'error', 'timeout', 'revealed')),
  verified boolean not null default false,
  duration_ms int,
  run_count int,
  hints_used int,
  created_at timestamptz not null default now()
);
create table coding_drafts (
  user_id uuid not null references auth.users on delete cascade,
  task_id text not null,
  code text not null check (octet_length(code) <= 20480),
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);
create table roadmap_attempt_coding (
  attempt_id uuid not null references roadmap_attempts on delete cascade,
  task_id text not null,
  passed boolean not null default false,
  verified boolean not null default false,
  revealed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (attempt_id, task_id)
);
```

RLS: owners read their own rows; all writes go through service-role RPCs. New RPCs: `record_coding_verdict(user, task, outcome, verified, attempt_id)` (idempotent per attempt, updates progress and review scheduling, awards XP through `record_verified_activity_xp` only when `verified`), `save_coding_draft`, `schedule_coding_review`. `complete_verified_roadmap_attempt` checks `roadmap_attempt_coding`. `delete_user_data` and `purge_expired_learning_data` cover the four tables (attempts after 180 days, drafts after 90 idle days). Rate limits in `lib/rate-limit.ts`: `codingRun` 30 per 10 min, `codingDraft` 60 per 10 min, `codingReveal` 10 per hour. `scripts/test-launch-contracts.ts` asserts the migration content.

API surface (twelve handlers unchanged):

| Handler | Resource | Purpose |
| --- | --- | --- |
| `api/quiz/roadmap.ts` | `coding-task` | Playable task with sealed coding session |
| `api/quiz/roadmap.ts` | `coding-submit` | Server grading, verdict of record, XP |
| `api/quiz/roadmap.ts` | `coding-report` | Client verdict for React tasks (`verified = false`) |
| `api/quiz/roadmap.ts` | `coding-reveal` | Solution after pass or give-up; records the reveal |
| `api/user/[op].ts` | `coding-progress`, `coding-draft` | Progress list, review queue, drafts |

## 8. Owner progress import and Firebase retirement

`scripts/import-interview-prepper-progress.ts` reads a JSON export of interview-prepper state (localStorage keys `foundation-done`, `foundation-points`, `attempt-log`, `attempt-outcomes`, `review-queue`; or the Firestore `progress/{uid}` document and its `attempts` subcollection) and writes `coding_progress` and `coding_attempts` for one Supabase user id, mapping `legacyId → id`. The owner runs it once locally with the service role and verifies the counts. Then: README pointer in interview-prepper, archive the repository, delete its Vercel project and Firebase project, and revoke its OpenAI key.

## 9. Design notes

- Kicker "Coding" with the existing `Kicker` primitive; section intro in editorial type; no hero art.
- Task cards are rows, not tiles: title, technique glyphs, tier, status text, estimated minutes. Use `.ss-panel` and `.ss-lift` where the Learn map uses them.
- The workbench uses `--color-background-*` paper for the prompt and an ink surface for the editor; accents only for the primary action and pass state; `--ss-success/error/warning` with text labels.
- Motion: none beyond the existing fin/waterline transitions; results appear without animation under reduced motion.
- Check with `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "code editor learning" --domain ux` before locking the layout; this repository's contract wins over its generic advice.

## 10. Validation

Every implementing issue runs `npm run typecheck:api`, `npm run test:launch`, `npm run build`, `npm run check:responsive` (with the new routes added to its inventory), both production dependency audits, `git diff --check`, and the new `npm run test:coding`. Screens go through the visual QA checklist at desktop, tablet, and phone widths, both locales, both themes, keyboard only, and reduced motion. Nothing is reported as passing without a real run.

## 11. Issue map and order

react-express-app, in the order Opus should take them:

1. Epic: coding challenges in devShark (tracking).
2. Content: port the interview-prepper catalogue into `lib/coding` with content tests.
3. Content: loop and array-method task set for JavaScript, TypeScript, and React.
4. Supabase migration 025 and launch-contract coverage.
5. Client runner for JavaScript and TypeScript (worker, compiler chunk, CSP header).
6. Coding workbench UI in Deep End.
7. Self-hosted React harness.
8. Server grading, coding API resources, sealed coding sessions, rate limits, reveal.
9. The `/coding` section: routes, nav, home, track and task screens, review queue.
10. Coding tasks inside Learn levels.
11. Difficulty ladder, badges, Today integration.
12. Owner progress import, Firebase retirement, documentation sweep.

interview-prepper:

1. Bug: Submit hangs until a refresh (root cause and fix recipe).
2. Bug: `getDoc` is not imported, cloud sync never connects (fixed on the integration branch).
3. Retirement: migrate to devShark, archive after import.

## 12. Open decisions for the owner

Recorded in `NEEDED.md`:

- Whether system design (guided sessions, drills), mock/runs mode, and the AI coach should follow later.
- Accepting client-graded React tasks with the documented limitation until a server DOM runner exists.
- Applying migration 025 in production and running the one-time import.
- Deleting the Firebase and Vercel projects once the import is verified.
