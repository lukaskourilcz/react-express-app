# StudyShark + devShark control document

This repository ships two bilingual web-learning products from one React/Vite client and twelve Vercel/Supabase handlers:

- **StudyShark** is the umbrella for geoShark, mathShark, historyShark, bioShark, chessShark, and pokerShark.
- **devShark** is the standalone `webdev` developer-learning sibling, never a StudyShark subject.

Read [the product architecture](docs/product-architecture.md), [the design contract](DESIGN_RULES.md), and [the design docs](docs/design/) before broad changes. The central sources are `client/product-catalog.ts` and `shared/subject-catalog.ts`; extend them instead of creating brand, URL, subject, count, or color copies.

## Protected behavior

- All learning is free. Support and cosmetic shop items never change access, content, explanations, paths, XP, scores, streaks, ranks, leaderboards, matchmaking, or AI availability.
- The server owns answers, grading, score/XP, product scope, subject scope, admin roles, and one-time claims. Correct answers never reach the client before submission.
- Keep exactly twelve physical TypeScript handlers under `api/`; preserve validation, auth, authorization, rate limits, request IDs, safe errors, RLS, and service-role isolation.
- Keep devShark out of StudyShark discovery and preserve the all-family footer.
- Keep natural EN/CS parity and responsive web accessibility. Native/Expo work is out of scope.
- Public legacy `DevQuiz` copy is stale; compatibility storage keys, migrations, package names, fixtures, and history may remain.

## Implementation rules

Search before creating. Reuse Astryx, existing `client/src/components/ui/`, landing primitives, Shark fins/waterlines, glyphs, hooks, dialogs, toasts, tokens, and translation keys. Deep End v2 uses ocean ink, tactile paper, editorial type, disciplined accents, restrained motion, visible focus, and purpose-built density—never glass, neon, generic AI imagery, or excessive cards/pills.

Handle relevant loading, empty, error, offline/reconnect, auth/permission, disabled, success, destructive, expired/stale, long-content, and narrow states. Validate keyboard/focus, non-color status, reduced motion, 44px targets, zoom/reflow, fixed-shell clearance, light/dark, EN/CS, and representative widths.

Generative-media production uses `.claude/skills/generated-media-production/SKILL.md` and the three authoritative media documents under `docs/design/`. Generate only accepted high-value opportunities, review three real directions, preserve authentic UI and deterministic text, and record exact provenance. Before recommending or using a generator, perform fresh web research into at least three cheap or free services using official pricing, commercial-license, privacy, retention/training, watermark, resolution, export, and API documentation. Never add filler or fake UI, buy a plan, accept paid terms, enable auto-refill, or upload sensitive material without explicit owner authorization.

## Working map

- Client/routes: `client/src/App.tsx`, `client/src/components/`
- Tokens/shell: `client/src/styles/astryx-theme.css`, `client/src/styles/app-shell.css`
- Localization: `client/src/i18n/translations.ts`, `client/src/i18n/translations.cs.ts`
- API: `api/`, `lib/`, `shared/`
- Supabase: `supabase-schema*.sql`
- Design guidance: `docs/design/`
- Skills: `.claude/skills/`
- Agents: `.claude/agents/`
- Commands: `.claude/commands/`

## Validation and Git

Use the actual scripts: `npm run typecheck:api`, `npm run test:launch`, `npm run build`, `npm run check:responsive`, both production dependency audits, and `git diff --check`. Do not report unexecuted checks as passing. Preserve unrelated work, stage deliberately, and create coherent incremental commits for large tasks. See `.claude/skills/shark-release-validation/SKILL.md` and `docs/DEEP_END_HANDOFF.md`.

Definition of done: implementation, EN/CS copy, states, responsive/accessibility behavior, tests, documentation, and Git history agree with the product architecture and all relevant checks have real results.


## Session routine & markdown conventions

This repo follows a shared markdown contract (see the `session-start`,
`session-end`, and `markdown-checkup` skills under `.claude/skills/`):

- **`NEEDED.md`** — owner/agent action items. Each task:
  `- [ ] **Title** — desc. [imp:1-5] [owner:me|ai] [time:30m] [kind:K]`, where
  `[kind:K]` is one of `setup` `deploy` `legal` `content` `decision`.
- **`about-project.md`** — project summary + the tech stack.
- **`scaling.md`** — cost & scaling only (renamed from `stack-and-scaling.md`).
- **`monetization.md`** — how the project could earn (options table).

At session start, check `NEEDED.md` for `[owner:ai]` tasks that can now be done;
at session end, update `NEEDED.md` (finished + newly-needed owner items).
