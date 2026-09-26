# Product and UX audit

Last reviewed: 22 July 2026. Updated 24 September 2026 for devShark alone, 25 September 2026 for the free tier and Premium (`/shop`, `/premium` and `/support` rows), and 26 September 2026 for Premium vouchers (`/premium` and `/dev` rows).

## Executive summary

- The repository already has a strong Deep End v2 foundation, centralized product and subject registries, a fixed one-screen shell, bilingual dictionaries, lazy routes, and a server-authoritative assessment model. The overhaul should mature those systems, not replace them.
- The largest interface debt is inconsistency inside otherwise good foundations: duplicated inline values, missing warning/info/on-accent tokens, unsupported token names, a few old checkbox-based choice controls, and dense screens that do not consistently use the same surface hierarchy.
- Accessibility work is substantial and worth preserving, but lesson, skill-check, challenge, and path-picker choices still need the repository's own accessible radio-card primitive. Several fixed feedback colors fail in dark mode.
- The client already handles many happy and unhappy paths. The most visible gaps are live-room connection feedback, a global offline signal, roadmap no-content handling, sign-in failure feedback, and a guest registration prompt that is not actually restricted to the landing route.
- Performance is broadly healthy: routes, Czech copy, syntax highlighting, analytics, QR generation, and question banks are split or deferred. The main opportunities are avoiding full-tree timer rerenders, reducing initial Supabase/Motion work, and removing a profile request waterfall.
- The API contract baseline passes and the physical Vercel handler count is exactly 12. This design project does not require a schema or handler change.

## Route and surface inventory

| Route | Auth | Subject | Primary goal and action | Major states | Current component | Main debt / reuse / QA |
|---|---:|---:|---|---|---|---|
| `/` | No | Yes | Understand the product; choose a learning action | first visit, returning learner, auth failure | `Home` | Preserve `LandingKit`; keep the copy technical; verify hero at 360–1440px. |
| `/quiz` | Optional | Yes | Configure, answer, submit, review | setup, loading, active, restored, empty, submit error, graded | `Quiz` | Preserve signed sessions and stable answers; use shared radios/tokens; test short-height phones, code, review grid, expiry and retry. |
| `/learn` | Optional | Yes | See what is next; complete levels/checkpoints | loading, no structure, locked, active lesson, grading, completion, failure, skill check | `Roadmap` | Preserve verified grading and varied waves; repair radio keyboard behavior and dark feedback tokens; add no-level state. |
| `/challenge` | Optional | Yes | Understand rules; complete a fair timed run | intro, leaderboard loading/error, buffering, active, timeout, verified result | `Challenge` | Replace checkbox cards with radios; correct list semantics; show board-unavailable separately from empty. |
| `/play` | Sign-in to act | Yes | Host or join a free-for-all/classroom room | auth loading, signed out, create/join errors, room code | `PlayLanding` | Preserve mode clarity and server scope; prevent auth flash; verify mobile form wrapping and touch targets. |
| `/play/:code` | Yes | Room-owned | Participate, host, reconnect, finish | lobby, live, presenter, reconnect, polling fallback, expired/stale room, result | `PlayMatch` | Preserve Realtime recovery and server timing; expose stale/disconnected state; keep QR ticket printable; reduce timer announcements. |
| `/leaderboard` | No | Yes | Compare fair results, with the last 30 days first | skeleton, empty, error, offline with the last board, no activity in the window, own row pinned, topic filter | `Leaderboard` | Preserve mobile cards/desktop table and scoped API; keep rank readable as a number without medal colours; verify long names. |
| `/cards` | Yes | Yes | Review saved questions | auth loading, signed out, loading, empty, error, remove error, deck | `Flashcards` | Preserve optimistic rollback; show sign-in errors; keep reveal keyboard/touch friendly. |
| `/shop` | Optional | Yes | Rewards: see coins and their ledger, buy the crown or a streak protection, redeem merchandise with Premium | signed out, loading/sync, error, owned, unaffordable, at the protection cap, a free account's merchandise lock, redemption form, orders | `Shop` | State that coins change what a learner owns and never scoring; the Premium lock reads as text and opens the upgrade sheet; test small screens and long item copy. |
| `/roadmap` | Optional | `webdev` | Understand a practical developer path | empty progress, in progress, complete | `CareerRoadmap` | Use developer-specific copy; keep it distinct from `/learn`. |
| `/coding` | Optional | `webdev` | Pick a track; see passed counts and, beside the heading, the next challenge with Continue | loading (no title until progress arrives), signed out, empty progress, populated, error with retry | `CodingHome` | Keep tier locks explained in words; no AI affordance; verify strip and track cards at 360px. |
| `/coding/:track` | Optional | `webdev` | Choose a task by level and tier | loading, locked tier, passed/due/revealed states, empty track | `CodingTrackScreen` | Non-color status glyphs; keep the ladder reason visible; long titles. |
| `/coding/:track/:taskId` | Optional | `webdev` | Write, run, and submit a solution; climb the hint ladder | loading, signed out, locked, running, verdict, hidden-test failure, reveal confirm, offline, draft restore | `CodingTaskScreen`, `CodingWorkbench`, `DesignRunner` | Preserve server verdicts and sealed sessions; keyboard shortcuts documented; editor at 360px; results tab focus after a run. |
| `/coding/review` | Yes | `webdev` | Clear due reviews in order | loading, signed out, nothing due, populated | `CodingReviewScreen` | Explain the two-clean-passes rule; link back to tracks. |
| `/settings/github` | Yes | `webdev` | Finish the GitHub App installation | working, sign-in needed, missing params, GitHub error, organisation request | `GithubSettingsPage` | Always offer a way back to the profile; never loop on a failed finish. |
| `/profile` | Yes | Yes | Understand progress and next action; manage account | auth loading, signed out, no progress, populated, sync error, delete confirm/failure, GitHub garden states | `Profile`, `GithubGardenCard` | Add an `h1`; prioritize actionable progress; retain subject scope, privacy, and deletion confirmation. |
| `/support` | No | No | Redirects to `/premium`; the voluntary-support page and its free pledge were retired on 25 September 2026 (#222) | redirect | `Navigate` in `App.tsx` | Keep the redirect for old links. |
| `/premium` | Optional | No | Compare Free and Premium; start Checkout or manage billing; redeem a voucher | billing off, signed out, free, paying, complimentary grant, voucher grant, settings error; voucher: sign-in check, signed out, form, empty, refused code, already redeemed, too many attempts, offline, unavailable, expired session, redeemed with or without an end | `PremiumPage`, `PremiumVoucher` | Show "VAT included" beside every price; no urgency; keep the renewal, waiver and cancel links beside the buttons. While billing is off the voucher leads; one sentence for every refused code; move focus to the result. |
| `/premium/success`, `/premium/cancel` | Success: yes; cancel: no | No | Confirm a purchase; cancel or withdraw without signing in, confirmed through a link emailed to the address | checking, done, pending, pending after the last automatic check, expired, signed out; cancel email step, email error, confirm, check your email, sign in instead (no email provider), link loading, link confirm, link expired or used, link error, receipt, error, unavailable | `PremiumSuccessPage`, `PremiumCancelPage` | Move focus to each step heading, and to the email field when the address changes; take the link's token out of the address bar at once; never reveal whether an email has a subscription before its mail was read. |
| `/privacy` | No | No | Understand data practices | owner-review markers | `PrivacyPage` | Improve reading hierarchy without inventing legal review; retain explicit owner action where unresolved. |
| `/terms` | No | No | Understand terms | owner-review markers | `TermsPage` | Same legal constraint; test 400% reflow and headings. |
| `/classroom` | No | Yes | Understand hosting/joining and privacy | public explanation, CTA | `ClassroomPage` | Use authentic workflow, not fake screenshots; explain sign-in, scope, QR and privacy. |
| `/topics/:slug` | No | Catalog-owned | Learn a topic and enter practice | valid topic, unknown slug | `TopicLandingPage` | Keep authored intro and no answer leakage; move conditional copy into dictionaries; verify SEO output. |
| `/dev` | Admin | `webdev` | Operate questions, quality, reports, settings, logs, merchandise and Premium vouchers | auth checking, denied, loading, empty, error, unsaved, save/delete; vouchers: field errors, code in use, migration missing, the new code once, copy refused, revoke confirmation | `DevPage` and `dev/*` | High-density, low-decoration control room; devShark brand; explicit status/severity; never expose secrets or answer keys to normal users; a voucher code is shown once and listed by its first four characters. |
| `*` | No | No | Recover from a bad URL | not found | `NotFoundPage` | Give one clear route home; verify route title and focus. |

## Highest-priority findings

### P0 — interaction and accessibility

1. Lesson and skill-check choices implement roving radio tab stops without Arrow/Home/End navigation (`Roadmap.tsx`). Reuse `ui/RadioCards.tsx`.
2. Challenge and path-picker mutually exclusive choices use checkbox-emitting `SelectableCard`s inside radio-like flows. Migrate to `RadioCardGroup`/`RadioCard`.
3. Challenge contains invalid list structures (`li` without a list, `div` directly inside `ol`). Correct the semantics.
4. ~~`SplitText` ignores its requested semantic tag in the animated path.~~ Closed 2026-09-25: no screen rendered it, and #235 deleted it.

### P1 — product, resilience, and contrast

1. The registration nudge is mounted globally and can interrupt a focused route. Restrict it to the landing experience.
2. Live-room refresh and distribution failures are swallowed. Preserve the last snapshot but show a disconnected/stale state with retry.
3. ~~Bright dark-mode accents are paired with fixed white text. Add a theme-aware on-accent token and semantic warning/info colors.~~ Closed 2026-09-26. `--brand-on-accent`, `--ss-warning` and `--ss-info` exist, and Astryx's `--color-on-accent` follows `--brand-on-accent`, so an Astryx primary button, checked box or selected radio in dark mode reads at 6.69:1 instead of 2.77:1. No text on a coloured fill uses a fixed white any more:
   - On the accent, `--brand-on-accent`: `Today.css` (the pack and empty-state calls to action, the "start here" chip), the stage dots in `RoadmapTree.tsx`, and a finished stage's node in `DeepEndScreens.css`, a rule no screen renders today.
   - `Roadmap.css`'s accent buttons sit on the topic colour or the checkpoint gold, not the accent, so `--brand-on-accent` would not fit them. They take `textOnColor()` from `lib/categories.ts`, which picks white or the ocean ink `#0b141b`, falls back to black on a mid-tone neither reaches 4.5:1 on, and clears 4.5:1 on every fill: HTML orange 4.71:1 (white was 3.94:1), JavaScript yellow 13.74:1 (white was 1.35:1). On hover, `hoverFilterOn()` darkens a fill under white text and lightens one under dark text, so no topic drops below 5.2:1; the old uniform darkening took HTML orange's ink to 4.08:1.
   - The XP toast's fill is `--ss-success-strong`, so its text is the new `--ss-on-success-strong`: white at 7.13:1 in light, the ink at 8.16:1 in dark, where white was 2.28:1. The `/dev` score badges use `textOnColor()`.
   - `tests/browser/on-accent.spec.ts` renders the chip, the stage dots, the HTML, CSS and JavaScript start buttons and the toast's colours in both themes, and checks each with axe's `color-contrast` rule and a measured ratio: 12 of 12 pass, against 3 of 12 on the previous build. `client/tests/on-color-text.test.ts` covers every category colour and the token pairs.
4. Hard-coded red, green, and gold feedback colors fail on dark or light surfaces. Route them through semantic tokens.
5. The active quiz/question container can clip multiline answers on short viewports. Allow controlled internal scrolling.
6. Fast-path auth loading and sign-in/sign-out errors can hang or disappear. Add bounded, user-readable states without exposing environment names.
7. Multiplayer state refresh is approximately quadratic in room size. This is a documented scaling constraint; a safe fix requires a forward API/RPC design and is outside the visual-only migration.
8. On `/learn`'s topic rail, an unselected topic's progress line ("0/6") is 0.66rem text at `opacity: 0.72`, which blends to `#809098` on the light theme's white: axe measures 3.3:1, below 4.5:1. The dark theme passes. Found on 26 September 2026 while checking P1.3; not yet fixed.

### P2 — consistency and performance

- Undefined `--color-background-card`/`--radius-card` values cause card styling to be discarded.
- `LoadingScreen` and `ErrorRetry` duplicate an old MUI-style spacing adapter.
- The shell's always-loaded Motion and Supabase graphs are meaningful future performance targets, but changing auth boot order has enough risk to keep it outside the visual pass.
- Profile loads stats, progress, and XP serially. Consolidation should use the existing user handler, not a thirteenth function.
- The responsive script covers too few routes and widths and still uses a historical `devquiz` temp prefix.

## Strengths to preserve

- Central `client/product-catalog.ts`, `shared/subject-catalog.ts`, `client/src/lib/products.ts`, and `client/src/lib/subjects.ts` sources of truth.
- Product identity resolved in `client/product-catalog.ts`, which refuses any product but devShark; a footer of legal links and appearance and sound controls.
- Server-issued encrypted sessions, one-time grading claims, result receipts, answer proofs, atomic XP/streak/progression, product/subject validation, RLS, and service-role isolation.
- Real content counts from `SUBJECT_SCOPE_CATALOG` (the questions a learner can be served, checked by `test:launch`), an on-demand question bank, and lazy Czech loading.
- One-screen shell, internal main scroll, bottom-waterline clearance, skip link, route titles and route focus.
- Astryx primitives, `SharkFin`, `LandingKit`, technology glyphs (`CategoryGlyph`), `RadioCards`, dialogs, toast system, and query helpers.
- Existing loading/error/empty treatment in Quiz, Flashcards, Leaderboard, Profile and much of `/dev`.
- Lazy routes, lazy Prism Light languages, optional analytics and Sentry, and build-time CSS purging.
- Realtime polling fallback and server-side match timing.

## Deliberately rejected rewrites

- No new UI library, state manager, icon library, localization mechanism, product registry, subject registry, footer list, runtime image API, Express server, native app, database migration, or Vercel handler.
- No mechanical rename of `react-express-quiz-app`, legacy storage keys, migrations, or compatibility values.
- No generated factual diagrams, equations, code, product UI, testimonials, metrics, or people.

