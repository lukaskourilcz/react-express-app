# Repository instructions for coding agents

Audit before editing: inspect Git state, trace the route/data flow, read both translation dictionaries, and search for reusable registries, components, hooks, styles, dialogs, and tests. Preserve unrelated user work.

StudyShark contains the six general-learning subjects. devShark is the standalone `webdev` sibling and never appears in the StudyShark picker. Product identity, URLs, subjects, counts, and accents come from `client/product-catalog.ts`, `shared/subject-catalog.ts`, and their existing adapters. Preserve the all-brand footer and EN/CS parity.

All learning remains free. Support and cosmetics are fairness-neutral. The server remains authoritative for answers, grading, scores, XP, subject/product scope, roles, and claims. Keep Supabase/RLS/service-role isolation and exactly twelve physical TypeScript handlers under `api/`. Do not add native/Expo code.

Extend Astryx and Deep End v2 through `client/src/styles/astryx-theme.css`, `client/src/styles/app-shell.css`, `DESIGN_RULES.md`, `client/src/components/ui/`, and existing Shark/landing primitives. Do not add another UI, icon, dialog, toast, localization, state, product, or subject system. Use `.claude/skills/generated-media-production/SKILL.md` for meaningful media; keep authentic UI and factual visuals deterministic, review three directions, and record provenance. Before recommending or using a generator, research at least three current cheap or free services from official pricing, licensing, privacy, and model documentation. Never alter billing without explicit owner authorization.

Every screen change covers relevant loading, empty, error, offline, auth/permission, disabled, success, destructive, stale/expired, long-content, and narrow states. Validate focus/keyboard, names/errors/status, non-color cues, reduced motion, touch targets, zoom/reflow, light/dark, EN/CS, and widths 360 through 1440.

Hook copy is delivered from the quorum repo (Carousel Studio / Hook Brain) into `lib/hooks/` and is never edited here — a local edit is overwritten by the next delivery, so report a wrong string upstream. Read `docs/hooks/README.md` in quorum before touching anything hook-related. This repo owns selection mechanics and per-user state only (`shared/hooks/`, `client/src/lib/hooks.ts`). The delivered conformance vectors are the drift guard: if they and this implementation disagree, this implementation is wrong. Never feed the evaluator a defaulted difficulty, category, `hasCode` or question text — a wrong field silently makes a hook dishonest, and a question without metadata correctly renders no hook.

Authoritative references:

- `docs/product-architecture.md`
- `DESIGN_RULES.md`
- `docs/design/`
- `.claude/skills/`
- `.claude/agents/`
- `.claude/commands/`
- `docs/DEEP_END_HANDOFF.md`

Release commands are `npm run typecheck:api`, `npm run test:launch`, `npm run test:hooks`, `npm run build`, `npm run check:responsive`, `npm audit --omit=dev`, `npm audit --omit=dev --prefix client`, and `git diff --check`. Record actual outcomes. Stage only coherent intended files, leave unrelated work untouched, and commit incrementally.
