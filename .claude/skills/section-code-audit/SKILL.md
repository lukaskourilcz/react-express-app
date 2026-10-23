---
name: section-code-audit
description: Audit and fix the code behind one product area (a Learn section such as Web Developer, Software Engineer or Forward Deployed Engineer, or Quiz, Play, Profile, Leaderboard) before users arrive. Covers how to split the area, what to look for, how to fix and commit, and the checks to run without browser tests. Learned from the FDE (#563), Web Developer (#564), Software Engineer (#565) and Quiz/Play/Profile/Leaderboard (#566) audits of 22–23 October 2026.
---

# Section code audit

Use this when the owner asks for a code review of one area with "find and fix it now". The goal is code that does not break at launch and is faster where it matters. It is not a redesign: keep every API shape, grading rule, tier gate, XP amount and piece of reviewed content as it is unless a bug forces a change, and then change both sides together.

## 1. Map the area before you start

List every file the area owns, then split them into **four disjoint groups** so parallel agents never edit the same file. For one Learn section, split by layer:

| Group | What it holds |
|---|---|
| server-handlers | the `lib/` handler module(s) and only the area's branches in `api/*` routers, plus the SQL it calls (read-only) |
| server-core | grading, validation, the public projection (`catalog`-style allowlists), shared types in `shared/` |
| client-screens | the big screen components, their data hooks in `client/src/lib/`, the area's routes and lazy imports in `client/src/App.tsx` |
| client-parts | smaller views, cards, dialogs, CSS, canvas/share/export helpers |

An area made of several products splits by product instead, as Quiz, Play, Profile and Leaderboard did, and then needs a last round for the shared files (`lib/http.ts`, `lib/rate-limit.ts`, `App.tsx`) that no single group owned.

Area maps known today (check them, files move):

- **FDE**: `lib/learning-paths/*` (not `content/`, `solutions/`), `shared/learning-path*.ts`, `shared/learn-section*.ts`, `lib/learn-lessons/*.ts`, `client/src/components/paths/*`, `client/src/lib/learningPaths.ts`, `learningPathWorkspace.ts`, `pathPortfolio.ts`, `shareCard.ts`, `client/src/components/learn/LessonBody.tsx`.
- **Web Developer** (topics html, css, javascript, typescript, react, nextjs, nodejs, databases, git, general): `api/quiz/roadmap.ts` (Learn levels and the map), `lib/roadmap.ts`, `lib/questions-store.ts`, `lib/quiz-tokens.ts`, `shared/progression.ts`, `shared/tiers.ts` (read, gate logic only), `client/src/components/Roadmap.tsx` (the map), `client/src/components/learn/*` (`LessonRunner.tsx` runs a level), `client/src/lib/roadmap.ts`, and the coding section (`lib/coding/handlers.ts`, `practice-handlers.ts`, `grade.ts`, `client/src/coding/*`, `client/src/components/coding/*`). Question banks `lib/roadmap-questions-*.ts` are content: leave them alone.
- **Software Engineer** (dsa, dsa-advanced, algorithms, system-design, devops, security, databases, git, general): the Web Developer code above, plus `lib/coding/complexity.ts`, `lib/coding/puzzles.ts`, `client/src/coding/CodePuzzle.tsx`, `DesignRunner.tsx` (system design is hidden; review it, do not unhide it), `client/src/components/ui/LessonFigure.tsx` with `shared/lesson-figures.ts`, and `/roadmap` (`client/src/components/CareerRoadmap.tsx`, `client/src/lib/tracks.ts`). The DSA and algorithms tasks (`lib/coding/tasks/dsa*.ts`, `algorithms.ts`) are content. Review only what Web Developer did not already cover.
- **Quiz**: `api/quiz/submit.ts`, `questions.ts`, `challenge.ts`, `daily.ts`, `api/flashcards.ts`, `lib/reports-store.ts`, `lib/concept-review.ts`, `lib/challenge-store.ts`; in the client `Quiz.tsx`, `Challenge.tsx`, `DailyQuestionPage.tsx`, `Today.tsx`, `TypingRacer.tsx`, `Flashcards.tsx`, `PendingQuizResults.tsx`, `client/src/lib/pendingQuizReceipts.ts`, `pendingQuizReplay.ts`, `xp.ts`.
- **Play**: `api/play/[action].ts`, `client/src/components/Play.tsx`, `client/src/lib/realtime.ts` (Classroom rooms included).
- **Profile**: `api/user/[op].ts`, `lib/friends-handlers.ts`, `lib/leaderboard-identity.ts`, `lib/settings-store.ts`, `Profile.tsx`, `FriendsPanel.tsx`, `SharknameCard.tsx`, `client/src/lib/leaderboardVisibility.ts`.
- **Leaderboard**: `api/leaderboard.ts`, `client/src/components/Leaderboard.tsx`, `client/src/lib/utcDay.ts`.

Read `CLAUDE.md`, the area's tests (`client/tests/*`, `scripts/*contracts*.ts`, `scripts/test-*.ts`) and the SQL the handlers call before changing anything.

## 2. What to look for (each one was found real in these audits)

**Server: failures and status codes**
- Timeouts: `withTimeout` rejects with `UpstreamTimeoutError` (503 `upstream_timeout`). A handler's own catch-all must answer it as 503 (the `caughtError` helpers in `api/user/[op].ts` and `api/play/[action].ts`) or rethrow it, never turn it into 500. An Auth outage keeps its 503 or 504, because a 401 tells a signed-in learner their session ended.
- Races on unique keys: two enrols or two first draft saves at once hit `23505` and answered 500. Map the conflict to the existing row or a 409 (`draft_conflict`), or 503 `draft_busy` when the other save is still running. For a new row (a room code), insert and retry on `23505` instead of reading first.
- Bounds the SQL checks again with a raise: a revision over 1,000,000, a `pg_column_size` limit or a huge practice position became 500. Check or clamp every bound before the call, and map the routine's raise to 400 or 413.
- Read errors treated as "nothing there": a failed passed-tasks read re-offered finished work, a failed draft read looked like no draft, a failed room read answered 404. Answer 503, or log it with the request id and flag it (`draftUnavailable: true` on a path start). A failed read that feeds a write must skip the write: a review-state read that returned `[]` reset every concept to its first stage. A failed settings read serves the last good copy.
- An attempt that expired mid-request answers 409 `invalid_session`, and a one-time claim the database cannot take answers 503 `claim_unavailable`, never 500. Check auth before `claimOnce`: a refused token used up a placement round.
- Rate limits for writes a class makes together: a class-sized address bucket plus a per-account bucket through `enforceClassRateLimit` (`questionReportAddress`, `questionReport`), or a class behind one NAT shares one person's budget.

**Server: untrusted input**
- Postgres text and JSONB refuse U+0000, so a draft, Shark Card or report holding it answered 500. Walk the values (not the JSON text, which would also catch code that spells `\u0000` out) and answer 400. Cut user text by code points (`Array.from`), not UTF-16 units, so an emoji is not split.
- `NaN` passes every range test, and a fractional index never matches. Check `Number.isFinite` and `Number.isInteger` on thresholds, weights, answer indexes, figure levels and field caps, and refuse an option index past the options.
- Query parameters can arrive as arrays (`?categories=a&categories=b`): read only a single string or refuse it; `.split()` on an array throws.
- Arrays from the client: refuse entries of the wrong type with 400 (topic ids, puzzle line ids) instead of acting on the rest. Where free text is expected, keep string entries only, never `String(entry)` (`[{}]` became `"[object Object]"`).
- Lookups by id on plain objects: use `Object.hasOwn` or a `Map`, or `constructor` and `__proto__` resolve to Object members (`puzzleFor('constructor')`).
- Calendar dates: `2026-02-30` and year 0 parse in JavaScript and fail in Postgres. Booleans: refuse anything but `true` or `false`. Ids: refuse one longer than any real id before it reaches the database.

**Server: speed**
- Independent sequential awaits: run them with `Promise.all` *after* the ownership check, and keep any ordering that guards correctness (read after grading when concurrent submits must see each other). Start the reads a request needs while its one-time claim is taken, but grade only after the claim.
- Reads that a later RPC already returns under its lock: take the value from the RPC (the first pass from `complete_verified_roadmap_attempt_v2`).
- Work repeated per request or per call: cache pure, content-only results in a `WeakMap` keyed by the object or readonly list (the path validator, the coding ladder's tiers). Do not cache anything a test mutates in place. Compute an expensive sort key once before the sort.
- Verify a token once per request: reuse the result the class rate limit already has.
- Public responses the same for every caller: `max-age` alone keeps them out of the CDN. Add `s-maxage` and `stale-while-revalidate` when no caller data is in them (the Learn map: `public, max-age=60, s-maxage=60, stale-while-revalidate=300`).
- Analysers over learner input (the complexity estimator): build no `RegExp` per input name, share one step budget across every pass, memoise per node, and answer "unknown" when the budget runs out. An uncertain answer must never lower XP. Snapshot every authored solution's report before and after a change to prove nothing else moved.
- Fields, tokens or requests nothing reads: grep for a reader and remove both sides if there is none. The sealed `answerProof` cost up to fifty AES-GCM seals per submit; the progress PUT wrote nothing and answers 405 now.

**Server: integrity**
- Never let a response, log or projection carry answer keys, hidden tests or reference solutions.
- Shuffles that can return the answer: a dealt puzzle must never start solved. Redraw, and test the identity shuffle.
- Hardcoded copies of shared constants (a `0.8` threshold): import the constant.

**Client: lost work and account changes**
- Debounced autosaves dropped on unmount, or sent to the activity just opened instead of the one left. Flush on unmount through a latest-callback ref, and route by the id the view was opened with.
- Drafts kept across a voluntary sign-out leak to the next account; drafts wiped on an *involuntary* sign-out lose work. Keep per-account copies on session expiry only, check `accountEpoch()` before any late write, send or announcement (a quiz grade, an XP sync, a Challenge reward), and register the flush with `beforeAccountChange`. Re-read a coding task when the learner signs out on it, so the editor does not keep their code.
- Device copies and stored progress: check the shape before use (`new Set(object)` crashed the Learn page), and never delete a device copy because the server answered "unknown".

**Client: late, double and stale actions**
- Late responses must not change the screen the learner moved to. Use a token, ref or sequence number per request, abort fetches in effect cleanup, and let only the latest read draw (a lookup answered after the search box changed, an older XP sync).
- Double submits: guard Start, Pause, Claim, Submit, Reveal, Next, level completion (focus and visibilitychange can fire together), friend actions and confirm dialogs with a ref, not only a disabled state. `isPending` reaches React a task later than the second click. Keep a row busy until the read that removes it lands.
- Effects keyed on objects that auth replaces on every token refresh (`user`): depend on `user.id`.
- Server state bound straight to a checkbox or select snaps back until the re-read lands: keep a local value and send saves from a queue.
- Realtime and polling: every subscribe returns a working unsubscribe, keep one poll in flight, and key a room component by code and account so moving between rooms remounts it.
- Dates that roll over: a page left open overnight moves to the new UTC day at midnight and when the tab is visible again (`useUtcDay` in `client/src/lib/utcDay.ts`).
- Controlled inputs bound to the URL: React Router updates the URL in a transition, so a search box controlled by it dropped keystrokes. Keep local state and write the URL after.

**Client: states**
- Do not offer "Start" while the enrollment list or the open run is loading or failed. Show a paused enrollment as paused, offer Try again when an activity fails to open, and say a sealed attempt expired instead of re-dealing it.
- Empty data: a trace with no frames threw and replaced the lesson with the error boundary.
- An offline copy belongs to its own tab or board, never the previous one.

**Client: focus and accessibility**
- No page-wide `aria-live` (screen readers re-read everything). A live region mounted with its words is not announced: keep it on the page and change its text. If the region wraps a visible card, let the region carry the card's styles while it has words (an empty wrapper around an absolutely positioned card has no box, and browser checks see it as hidden; this broke the Challenge release spec once).
- Move focus to the opened item, each revealed hint, each new question and the verdict. When a control disables or re-inserts itself (Next on the last step, a moved list item, Submit replaced by the verdict, an answer at time up), move focus to the nearest control that still works.
- Destructive buttons ask first: Reset uses the workbench's inline confirmation and returns focus to Reset; Remove friend uses `BrandedConfirmDialog` and moves focus to the list heading.
- Every button is at least 44px tall. Tabs take one Tab stop and arrow keys. Enter in a lone input submits, as a form would.
- Keyboard shortcuts ignore keys from forms and dialogs inside the screen and never act on a hidden editor.
- Long code tokens wrap at 200 % text and 360 px. End a drag on `pointercancel`.

**Client: loading and bundle**
- Load heavy parts with `lazyShellPart` + `Suspense` + `ShellPartBoundary`, the boundary inside `Suspense` as its doc comment says. A static import of the editor pulled CodeMirror (about 173 kB gzip) into a screen that rarely needs it; the Learn level runner, a path's code editor and Prettier now load only when shown.
- Helpers only lazy screens use must not live in a module the main chunk imports, and strings or defaults nothing reads still ship. Measure with `check:bundle`: the waiting-result sender loads only when a result waits.
- Route preload matchers (`routes(...)` in `App.tsx`) match only the paths their routes serve. Skip intent preloads and idle warm-ups when `navigator.connection.saveData` is set, except a left mouse press.
- Stop a browser run or worker when the learner leaves. Memoise heavy, pure children (`LessonView`, rich-text parsing) only where they re-render per keystroke, with stable inputs.
- Canvas and downloads: `roundRect` is missing before Safari 16 and Firefox 112, so fall back to `arcTo`; zero the canvas after export (iOS caps canvas memory); attach the anchor before `click()` and revoke the object URL later.
- Head tags: write `og:url` beside the canonical on client navigation, and read a trailing slash as the same route.

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

Add the area's own suites (`test:coding`, `test:coding-auth`, `test:grading-integrity`, `test:billing` and so on) when the area touches them. Compare `check:bundle` with main's number: the initial load must not grow. On this 8-CPU machine a load average around 15 makes vitest time out; rerun a failing file alone before believing it. Then push, open one PR, wait for `verify` and `sql`, merge with a merge commit and record the result in `docs/release-acceptance.md`.

## 5. Finish

List what was fixed, what was left and why, and add the real open items to `NEEDED.md` (`[owner:ai]` for agent work, `[owner:me]` for decisions).
