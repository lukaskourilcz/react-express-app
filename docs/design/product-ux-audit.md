# Product and UX audit

Last reviewed: 22 July 2026.

## Executive summary

- The repository already has a strong Deep End v2 foundation, centralized product and subject registries, a fixed one-screen shell, bilingual dictionaries, lazy routes, and a server-authoritative assessment model. The overhaul should mature those systems, not replace them.
- StudyShark and devShark are correctly separated in the registries and API scope. The remaining product-level mismatch is the developer career roadmap appearing in the shared route/navigation rather than being treated as devShark-only.
- The largest interface debt is inconsistency inside otherwise good foundations: duplicated inline values, missing warning/info/on-accent tokens, unsupported token names, a few old checkbox-based choice controls, and dense screens that do not consistently use the same surface hierarchy.
- Accessibility work is substantial and worth preserving, but lesson, skill-check, challenge, and path-picker choices still need the repository's own accessible radio-card primitive. Several fixed feedback colors fail in dark mode.
- The client already handles many happy and unhappy paths. The most visible gaps are live-room connection feedback, a global offline signal, roadmap no-content handling, sign-in failure feedback, and a guest registration prompt that is not actually restricted to the landing route.
- Performance is broadly healthy: routes, Czech copy, syntax highlighting, analytics, QR generation, and question banks are split or deferred. The main opportunities are avoiding full-tree timer rerenders, reducing initial Supabase/Motion work, and removing a profile request waterfall.
- The API contract baseline passes and the physical Vercel handler count is exactly 12. This design project does not require a schema or handler change.

## Route and surface inventory

| Route | Product | Auth | Subject | Primary goal and action | Major states | Current component | Main debt / reuse / QA |
|---|---|---:|---:|---|---|---|---|
| `/` | Both | No | Yes | Understand the product; choose a subject or learning action | first visit, returning subject, auth failure | `SubjectPicker`, `Home` | Preserve `LandingKit`; differentiate subjects beyond color; keep devShark technical and StudyShark broad; verify hero at 360–1440px. |
| `/subjects` | StudyShark | No | Picker | Choose one of six general subjects | requested subject, unknown query, auth failure | `SubjectPicker` | Never include `webdev`; use catalog counts; improve card depth and focus; test keyboard selection and long Czech copy. |
| `/quiz` | Both | Optional | Yes | Configure, answer, submit, review | setup, loading, active, restored, empty, submit error, graded, AI unavailable/limited | `Quiz` | Preserve signed sessions and stable answers; use shared radios/tokens; test short-height phones, code, review grid, expiry and retry. |
| `/learn` | Both | Optional | Yes | See what is next; complete levels/checkpoints | loading, no structure, locked, active lesson, grading, completion, failure, skill check | `Roadmap` | Preserve verified grading and varied waves; repair radio keyboard behavior and dark feedback tokens; add no-level state. |
| `/challenge` | Both | Optional | Yes | Understand rules; complete a fair timed run | intro, leaderboard loading/error, buffering, active, timeout, verified result | `Challenge` | Replace checkbox cards with radios; correct list semantics; show board-unavailable separately from empty. |
| `/play` | Both | Sign-in to act | Yes | Host or join a free-for-all/classroom room | auth loading, signed out, create/join errors, room code | `PlayLanding` | Preserve mode clarity and server scope; prevent auth flash; verify mobile form wrapping and touch targets. |
| `/play/:code` | Both | Yes | Room-owned | Participate, host, reconnect, finish | lobby, live, presenter, reconnect, polling fallback, expired/stale room, result | `PlayMatch` | Preserve Realtime recovery and server timing; expose stale/disconnected state; keep QR ticket printable; reduce timer announcements. |
| `/leaderboard` | Both | No | Yes | Compare fair subject-scoped results | skeleton, empty, error, populated, category filter | `Leaderboard` | Preserve mobile cards/desktop table and scoped API; keep rank readable without trophy overload; verify names and Czech. |
| `/cards` | Both | Yes | Yes | Review saved questions | auth loading, signed out, loading, empty, error, remove error, deck | `Flashcards` | Preserve optimistic rollback; show sign-in errors; keep reveal keyboard/touch friendly. |
| `/shop` | Both | Optional | Yes | Preview and obtain fairness-neutral cosmetics | loading/sync, owned, equipped, unaffordable, error | `Shop` | Explicitly state cosmetics never affect scoring; use calm ownership states; test small screens and long item copy. |
| `/roadmap` | devShark | Optional | `webdev` | Understand a practical developer path | empty progress, in progress, complete | `CareerRoadmap` | Restrict to devShark; use developer-specific copy; do not expose on StudyShark; keep it distinct from `/learn`. |
| `/coding` | devShark | Optional | `webdev` | Pick a track; see passed counts, due reviews, and the next open tier | loading, signed out, empty progress, populated, error | `CodingHome` | Keep tier locks explained in words; no AI affordance; verify strip and track cards at 360px. |
| `/coding/:track` | devShark | Optional | `webdev` | Choose a task by level and tier | loading, locked tier, passed/due/revealed states, empty track | `CodingTrackScreen` | Non-color status glyphs; keep the ladder reason visible; long Czech titles. |
| `/coding/:track/:taskId` | devShark | Optional | `webdev` | Write, run, and submit a solution; climb the hint ladder | loading, signed out, locked, running, verdict, hidden-test failure, reveal confirm, offline, draft restore | `CodingTaskScreen`, `CodingWorkbench`, `DesignRunner` | Preserve server verdicts and sealed sessions; keyboard shortcuts documented; editor at 360px; results tab focus after a run. |
| `/coding/review` | devShark | Yes | `webdev` | Clear due reviews in order | loading, signed out, nothing due, populated | `CodingReviewScreen` | Explain the two-clean-passes rule; link back to tracks. |
| `/settings/github` | devShark | Yes | `webdev` | Finish the GitHub App installation | working, sign-in needed, missing params, GitHub error, organisation request | `GithubSettingsPage` | Always offer a way back to the profile; never loop on a failed finish. |
| `/profile` | Both | Yes | Yes | Understand progress and next action; manage account | auth loading, signed out, no progress, populated, sync error, delete confirm/failure, GitHub garden states (devShark) | `Profile`, `GithubGardenCard` | Add an `h1`; prioritize actionable progress; retain subject scope, privacy, and deletion confirmation. |
| `/support` | Both | No | Product | Understand costs, free pledge, optional support | disabled, unconfigured, configured | `SupportPage` | Preserve disabled-by-default support and no guilt; verify product-specific copy and no invented claims. |
| `/privacy` | Both | No | No | Understand data practices | owner-review markers | `PrivacyPage` | Improve reading hierarchy without inventing legal review; retain explicit owner action where unresolved. |
| `/terms` | Both | No | No | Understand terms | owner-review markers | `TermsPage` | Same legal constraint; test 400% reflow and headings. |
| `/classroom` | Both | No | Yes | Understand hosting/joining and privacy | public explanation, CTA | `ClassroomPage` | Use authentic workflow, not fake screenshots; explain sign-in, scope, QR and privacy. |
| `/topics/:slug` | Both | No | Catalog-owned | Learn a topic and enter practice | valid topic, wrong product, unknown slug | `TopicLandingPage` | Keep authored intro and no answer leakage; move conditional copy into dictionaries; verify SEO output. |
| `/dev` | Both deployments | Admin | Admin-selected | Operate questions, quality, reports, settings, logs | auth checking, denied, loading, empty, error, unsaved, save/delete | `DevPage` and `dev/*` | High-density, low-decoration control room; product-aware brand; explicit status/severity; never expose secrets or answer keys to normal users. |
| `*` | Both | No | No | Recover from a bad URL | not found | `NotFoundPage` | Give one clear route home; verify route title/focus and both locales. |

## Highest-priority findings

### P0 — interaction and accessibility

1. Lesson and skill-check choices implement roving radio tab stops without Arrow/Home/End navigation (`Roadmap.tsx`). Reuse `ui/RadioCards.tsx`.
2. Challenge and path-picker mutually exclusive choices use checkbox-emitting `SelectableCard`s inside radio-like flows. Migrate to `RadioCardGroup`/`RadioCard`.
3. Challenge contains invalid list structures (`li` without a list, `div` directly inside `ol`). Correct the semantics.
4. `SplitText` ignores its requested semantic tag in the animated path. Preserve real heading semantics while animating only descendant spans.

### P1 — product, resilience, and contrast

1. `/roadmap` currently appears for StudyShark even though developer career content must remain devShark-only.
2. The registration nudge is mounted globally and can interrupt a focused route. Restrict it to the landing experience.
3. Live-room refresh and distribution failures are swallowed. Preserve the last snapshot but show a disconnected/stale state with retry.
4. Bright dark-mode accents are paired with fixed white text. Add a theme-aware on-accent token and semantic warning/info colors.
5. Hard-coded red, green, and gold feedback colors fail on dark or light surfaces. Route them through semantic tokens.
6. The active quiz/question container can clip multiline answers on short viewports. Allow controlled internal scrolling.
7. Fast-path auth loading and sign-in/sign-out errors can hang or disappear. Add bounded, user-readable states without exposing environment names.
8. Multiplayer state refresh is approximately quadratic in room size. This is a documented scaling constraint; a safe fix requires a forward API/RPC design and is outside the visual-only migration.

### P2 — consistency and performance

- Undefined `--color-background-card`/`--radius-card` values cause card styling to be discarded.
- `LoadingScreen` and `ErrorRetry` duplicate an old MUI-style spacing adapter.
- The shell's always-loaded Motion and Supabase graphs are meaningful future performance targets, but changing auth boot order has enough risk to keep it outside the visual pass.
- Profile loads stats, progress, and XP serially. Consolidation should use the existing user handler, not a thirteenth function.
- The responsive script covers too few routes and widths and still uses a historical `devquiz` temp prefix.

## Strengths to preserve

- Central `client/product-catalog.ts`, `shared/subject-catalog.ts`, `client/src/lib/products.ts`, and `client/src/lib/subjects.ts` sources of truth.
- Environment-resolved product and sibling URLs; internal subject links; all-family footer.
- Server-issued encrypted sessions, one-time grading claims, result receipts, answer proofs, atomic XP/streak/progression, product/subject validation, RLS, and service-role isolation.
- Real authored content counts from `SUBJECT_SCOPE_CATALOG`, per-subject question chunks, and lazy Czech loading.
- One-screen shell, internal main scroll, bottom-waterline clearance, skip link, route titles and route focus.
- Astryx primitives, `SharkFin`, `LandingKit`, subject/technology glyphs, `RadioCards`, dialogs, toast system, and query helpers.
- Existing loading/error/empty treatment in Quiz, Flashcards, Leaderboard, Profile and much of `/dev`.
- Lazy routes, lazy Prism Light languages, optional analytics/Sentry/AI/support, and build-time CSS purging.
- Realtime polling fallback and server-side match timing.

## Deliberately rejected rewrites

- No new UI library, state manager, icon library, localization mechanism, product registry, subject registry, footer list, runtime image API, Express server, native app, database migration, or Vercel handler.
- No mechanical rename of `react-express-quiz-app`, legacy storage keys, migrations, or compatibility values.
- No generated factual maps, equations, anatomy, chess positions, poker hands, product UI, testimonials, metrics, or people.

