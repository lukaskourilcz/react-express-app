---
name: section-code-audit
description: Audit and fix the code behind one product area (a Learn section such as Web Developer, Software Engineer or Forward Deployed Engineer, or Quiz, Play, Profile, Leaderboard) before users arrive. Covers how to split the area, what to look for, how to fix and commit, and the checks to run without browser tests. Learned from the FDE audit of 22–23 October 2026 (PR "FDE code review").
---

# Section code audit

Use this when the owner asks for a code review of one area with "find and fix it now". The goal is code that does not break at launch and is faster where it matters. It is not a redesign: keep every API shape, grading rule, tier gate, XP amount and piece of reviewed content as it is unless a bug forces a change, and then change both sides together.

## 1. Map the area before you start

List every file the area owns, then split them into **four disjoint groups** so parallel agents never edit the same file:

| Group | What it holds |
|---|---|
| server-handlers | the `lib/` handler module(s) and only the area's branches in `api/*` routers, plus the SQL it calls (read-only) |
| server-core | grading, validation, the public projection (`catalog`-style allowlists), shared types in `shared/` |
| client-screens | the big screen components, their data hooks in `client/src/lib/`, the area's routes and lazy imports in `client/src/App.tsx` |
| client-parts | smaller views, cards, dialogs, CSS, canvas/share/export helpers |

Area maps known today (check them, files move):

- **FDE**: `lib/learning-paths/*` (not `content/`, `solutions/`), `shared/learning-path*.ts`, `shared/learn-section*.ts`, `lib/learn-lessons/*`, `client/src/components/paths/*`, `client/src/lib/learningPaths.ts`, `learningPathWorkspace.ts`, `pathPortfolio.ts`, `shareCard.ts`, `client/src/components/learn/LessonBody.tsx`.
- **Web Developer** (topics html, css, javascript, typescript, react, nextjs, nodejs, databases, git, general): `api/quiz/roadmap.ts` (Learn levels), `lib/roadmap.ts`, `lib/questions-store.ts`, `lib/quiz-tokens.ts`, `shared/progression.ts`, `shared/tiers.ts` (read, gate logic only), `client/src/components/Roadmap.tsx`, `client/src/components/learn/*`, the coding section (`lib/coding/handlers.ts`, `lib/coding/grade.ts`, `client/src/coding/*`, `client/src/components/coding/*`). Question banks `lib/roadmap-questions-*.ts` are content: leave them alone.
- **Software Engineer** (dsa, dsa-advanced, algorithms, system-design, devops, security, databases, git, general): the same Learn and coding code as Web Developer, plus the DSA and algorithms tasks (`lib/coding/tasks/dsa*.ts`, `algorithms*`), `lib/coding/complexity.ts`, `client/src/coding/CodePuzzle.tsx`, `DesignRunner.tsx` (system design is hidden; review it, do not unhide it). Review only what Web Developer did not already cover.
- **Quiz, Play, Profile, Leaderboard**: locate them with `grep -rn` on their routes in `client/src/App.tsx` and their `api/` operations; Play includes Classroom rooms and Realtime.

Read `CLAUDE.md`, the area's tests (`client/tests/*`, `scripts/*contracts*.ts`, `scripts/test-*.ts`) and the SQL the handlers call before changing anything.

## 2. What to look for (each found real in the FDE audit)

**Server**
- Races on unique keys: two enrols or two first draft saves at once hit `23505` and answered 500. Map the conflict to the existing row or to the routine's own 409.
- Validation that the SQL does again with a raise: out-of-range numbers (a revision over 1,000,000) and `pg_column_size` limits turned into 500s. Check every bound the routine checks before calling it, and map its raise to 400/413.
- Sequential awaits that are independent: reading progress and diagnostics, or opening an attempt and reading the draft, one after the other. Run them with `Promise.all` *after* the ownership check, and keep any ordering that guards correctness (read after grading when concurrent submits must see each other).
- Work repeated on every request: running the full content validator per request. Cache pure, content-only results per object in a `WeakMap`. Do not cache anything a test mutates in place.
- Silent failures: an ignored error that changes what the learner sees must be logged with the request id, and the response must say so when `null` would be misread (`draftUnavailable: true`).
- Untrusted JSON: read own keys only and keep only the expected primitive types (`[{}]` became `"[object Object]"`).
- Validator gaps that only show on a live submission: fractional answer indexes, `NaN`/`Infinity` thresholds and weights, empty traces, blank captions. `NaN` passes every range test, so check `Number.isFinite` and `Number.isInteger` explicitly.
- Hardcoded copies of shared constants (a `0.8` threshold): import the constant.
- Never let a response, log or projection carry answer keys, hidden tests or reference solutions.

**Client**
- Lost keystrokes: debounced autosaves dropped on unmount, or routed to the activity just opened instead of the one left. Flush on unmount through a latest-callback ref, and route by the id the view was opened with.
- Account changes: drafts kept across a voluntary sign-out leak to the next account; drafts wiped on an *involuntary* sign-out lose work. Keep per-account copies on session expiry only, check `accountEpoch()` before any late write or send, and register the flush with `beforeAccountChange`.
- Device copies trusted blindly: validate the stored shape before use, and never delete a device copy because the server answered "unknown".
- Late responses: a result that arrives after the learner moved on must not change the new screen. Use a token or ref per request, and abort fetches in effect cleanup.
- Double submits: guard Start, Pause, Claim and Submit with a ref, not only a disabled state.
- Loading versus "not started": do not offer "Start" while the enrollment list is loading or failed.
- Expiry: a sealed attempt that expired must say so, not silently re-deal and wipe answers.
- Re-render cost: memoise heavy, pure children (`LessonView`, rich-text parsing) only where they re-render per keystroke; check the memo's inputs are stable.
- Bundle: a static import of the editor pulled CodeMirror (about 173 kB gzip) into a screen that rarely needs it. Load heavy parts with `lazyShellPart` + `Suspense` + `ShellPartBoundary`. Helpers only lazy screens use must not live in a module the main chunk imports.
- Preloads: route prefix matchers must match only the routes that load that chunk.
- Destructive buttons: Reset needs the workbench's inline confirmation, and focus must return to the opener.
- Accessibility: no page-wide `aria-live` (screen readers re-read everything); move focus to the opened item and to each revealed hint; long code tokens must wrap at 200 % text and 360 px.
- Canvas and downloads: `roundRect` is missing before Safari 16 and Firefox 112, so fall back to `arcTo`; zero the canvas after export (iOS caps canvas memory); attach the anchor before `click()` and revoke the object URL later.
- Empty data: a trace with no frames threw and replaced the lesson with the error boundary.

## 3. How to work

- Run it as a workflow: four reviewers in parallel on the disjoint groups, each followed by a skeptic that tries to refute every commit and repairs or reverts with *new* commits, then one checks agent. Then a second, smaller round for the issues the first round listed as "not fixed" but that are real. Check the scariest-sounding "not fixed" items yourself first: in the FDE audit, a reported token/attempt TTL mismatch turned out to be 3 h on both sides.
- One fix per commit, right after its cheapest relevant check passes. Message: `fix|perf|refactor|test(<area>): <what and why>`. Agents share the worktree, so commit with `git commit -m … -- <paths>` and never `git add -A`, stash, reset, rebase or push. The owner wants many real commits; never pad.
- Behaviour fixes get a regression test in the area's existing test file, and the test must fail on the old code.
- Do not edit SQL migrations, reviewed content (`lib/learning-paths/content`, `solutions`, `lib/roadmap-questions-*`, `lib/coding/tasks`, `lib/coding/solutions`), tier gating, XP or copy meaning. Report DB issues that need a migration.
- Comments count: `scripts/test-learning-paths.ts` and `test-launch-contracts.ts` fail if any file under `client/src` *mentions* `lib/learning-paths`, even in a comment.

## 4. Checks (no browser or e2e)

```bash
export PATH=/private/tmp/devshark-codex-node24/node_modules/.bin:$PATH   # Node 24
npm run -s ci:parity -- --only typecheck:api,typecheck:scripts,typecheck:tooling,check:unused,check:security,test:paths,test:path-authority,test:launch,test:client,build,check:bundle --log-dir artifacts/<area>-review
git diff --check origin/main...HEAD
```

Add the area's own suites (`test:coding`, `test:coding-auth`, `test:billing` and so on) when the area touches them. Compare `check:bundle` with main's number: the initial load must not grow. On this 8-CPU machine a load average around 15 makes vitest time out; rerun a failing file alone before believing it. Then push, open one PR, wait for `verify` and `sql`, merge with a merge commit and record the result in `docs/release-acceptance.md`.

## 5. Finish

List what was fixed, what was left and why, and add the real open items to `NEEDED.md` (`[owner:ai]` for agent work, `[owner:me]` for decisions).
