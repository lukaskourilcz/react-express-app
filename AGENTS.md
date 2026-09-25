# Repository instructions for coding agents

Audit before editing: inspect Git state, trace the route/data flow, read the English translation dictionary, and search for reusable registries, components, hooks, styles, dialogs, and tests. Preserve unrelated user work.

This repository builds devShark, the `webdev` developer-learning product, and nothing else. StudyShark moved to its own repository (`lukaskourilcz/studyshark`) on 2026-09-24; do not add it, its subjects or links to it back. Product identity, subjects, counts, and accents come from `client/product-catalog.ts`, `shared/subject-catalog.ts`, and their existing adapters. The footer carries only the legal links and the appearance and sound controls. The app ships English only: write no Czech copy and add no Czech keys, and leave the retained `*.cs.ts` files as they are (see `ENABLED_LANGS`).

devShark is freemium. `shared/tiers.ts` is the only place that says what the free tier includes and what Premium opens; the server refuses locked content with 402 and the client only mirrors it. Premium, coins, cosmetic shop items, collectible Shark Cards and badges change which content a learner may start and nothing else: never grading, explanations, XP amounts, scores, streaks, ranks, leaderboards, matchmaking or AI availability. Streak protection is the one bounded exception: two a month are granted free, extra ones cost coins earned by learning, the ceiling never rises above two, and a protection changes the day count of a streak and nothing else; no leaderboard here ranks by streak. Finishing a whole learning path earns the merchandise package, a reward *for* learning that changes no progress. Merchandise is printed and shipped by Spreadshop; coins redeem items, never discounts. devShark ships no AI feature. See `shared/rewards.ts` and the "Tiers and billing" section of `docs/product-architecture.md`.

The server remains authoritative for answers, grading, scores, XP, entitlements, subject/product scope, roles, and claims. Keep Supabase/RLS/service-role isolation and exactly twelve physical TypeScript handlers under `api/`. Do not add native/Expo code.

Extend Astryx and Deep End v2 through `client/src/styles/astryx-theme.css`, `client/src/styles/app-shell.css`, `DESIGN_RULES.md`, `client/src/components/ui/`, and existing Shark/landing primitives. Do not add another UI, icon, dialog, toast, localization, state, product, or subject system. Use `.claude/skills/generated-media-production/SKILL.md` for meaningful media; keep authentic UI and factual visuals deterministic, review three directions, and record provenance. Before recommending or using a generator, research at least three current cheap or free services from official pricing, licensing, privacy, and model documentation. Never alter billing without explicit owner authorization.

Every screen change covers relevant loading, empty, error, offline, auth/permission, disabled, success, destructive, stale/expired, long-content, and narrow states. Validate focus/keyboard, names/errors/status, non-color cues, reduced motion, touch targets, zoom/reflow, light/dark, and widths 360 through 1440.

Authoritative references:

- `docs/product-architecture.md`
- `DESIGN_RULES.md`
- `docs/design/`
- `.claude/skills/`
- `.claude/agents/`
- `.claude/commands/`
- `docs/DEEP_END_HANDOFF.md`
- `docs/curation-claims.md` — what may be said about content review, and why
  every claim fails closed
- `docs/practice-scheduling.md` — the spacing and interleaving policies, kept
  apart on purpose
- `docs/release-acceptance.md` — the acceptance matrix: every gate with its
  actual result, and every check that could not run

Release commands are `npm run typecheck:api`, `npm run test:launch`, `npm run build`, `npm run check:responsive`, `npm audit --omit=dev`, `npm audit --omit=dev --prefix client`, and `git diff --check`. Record actual outcomes. Stage only coherent intended files, leave unrelated work untouched, and commit incrementally.
