# Deep End overhaul handoff

Updated: 2026-07-22
Branch: `codex/deep-end-handoff`

This file is the continuation point for the interrupted autonomous StudyShark/devShark overhaul. Read it with `CLAUDE.md`, `AGENTS.md`, `DESIGN_RULES.md`, and `docs/design/` before editing.

## Completed milestones

### 1. Audit, research, and thesis

Commit `382ef13` (`Document Shark product and design direction`) added the authoritative design set under `docs/design/`:

- route/state and product UX audit;
- Deep End v2 thesis, brand system, and practical design system;
- targeted Refero/Collect UI research converted into product decisions;
- visual QA checklist;
- Higgsfield opportunity/art-direction/manifest documents explicitly recording that generation did not occur.

The audit confirmed React 19/Vite, Vercel functions + Supabase (no Express backend), central product/subject registries, bilingual dictionaries, Astryx/Deep End primitives, and exactly twelve API handlers.

### 2. Shared foundations and learning integrity

Commit `71ac035` (`Refine Deep End foundations and learning integrity`) implemented:

- semantic background, border, focus, selected, disabled, overlay, warning, info, and on-accent tokens;
- shared inline style/state helpers and localized destructive confirmation;
- accessible radio-card semantics for roadmap, challenge, path, lesson, and skill-check selection;
- restored heading semantics, corrected invalid list structure, visible route focus, 44px utility targets, drawer close control, and offline/restored status;
- product-aware navigation, home-only registration prompt, safer auth feedback/timeouts, restricted remote avatars, and current-brand `/dev` naming;
- deterministic `SubjectPlate` and real catalog counts/microcopy for StudyShark discovery;
- Play reconnect/polling/stale feedback, Flashcards sign-in errors, Challenge leaderboard errors, and Profile heading hierarchy;
- stable server-defined daily attempt IDs and stronger multi-batch challenge proof requirements without adding an API handler.

The launch contracts passed after this milestone.

### 3. Fairness-neutral rewards and continuation tooling

The handoff commit containing this file finishes these changes:

- shop catalogue and behavior are cosmetic-only (`ring` and `flair`);
- purchased path bypasses and Double-XP consumption are removed;
- old `doubleXp` and `pathUnlockPrice` fields remain inert only for wire/config compatibility, with booster state cleared during sync;
- `/dev` settings no longer expose a path-unlock price;
- EN/CS shop copy explicitly states that cosmetics cannot affect access, XP, scores, or ranking;
- the richer, honest devShark career roadmap replaces an unconditional simplified branch and no longer calls itself StudyShark;
- launch tests lock stable attempt IDs and cosmetic-only rewards;
- the responsive harness covers the route inventory and 360/390/430/768/1024/1280/1440 widths, supports route/width filters, and writes temporary failure artifacts outside the repository;
- concise root instructions, five project skills, four specialist agents, and six real workflow commands replace stale React/MUI/Express-era agent guidance.

## Validation completed

- Baseline before the overhaul: `npm run typecheck:api`, `npm run test:launch`, `npm run build`, and `git diff --check` passed.
- After shared-foundation changes: launch contracts and `git diff --check` passed; focused browser-target esbuild compilation passed.
- After the fairness pass: `npm run test:launch` passed and reported product identity, scope, token confidentiality, stable attempts, fairness-neutral rewards, rate limiting, health, and the twelve-function budget. Focused esbuild compilation of the changed client modules passed.
- The final `npm run build` was started but intentionally interrupted when the CLI restart was requested; do not mark the current head build as passed until rerun.
- The environment was using Node 20 although `package.json` requires Node 22–24. Supabase printed its Node 20 deprecation warning, and the updated responsive harness intentionally requires Node 22.

## Continue in this order

1. Use Node 22–24, run `npm ci` and `npm ci --prefix client` if dependencies are not already trustworthy, then run the full release contract.
2. Run `python3 /Users/lukasbarsinbars/.codex/skills/.system/skill-creator/scripts/quick_validate.py` for each new `.claude/skills/*` directory and correct any metadata issue.
3. Build and preview both product configurations. Execute the responsive/browser matrix in `docs/design/visual-qa-checklist.md`; record only real coverage.
4. Continue route-by-route refinement, prioritizing active Quiz/review, Learn, Challenge, Play/live room, Profile, Leaderboards, Flashcards, and `/dev`. Preserve the foundation changes rather than replacing them.
5. Recheck natural EN/CS copy, every non-happy path, dark/light contrast, keyboard/focus, reduced motion, 400% reflow, and fixed-waterline clearance.
6. Run dependency audits, repository-wide stale-brand/duplicate-registry/security searches, and final documentation reconciliation.
7. Create additional coherent commits rather than amending the existing history, then provide the complete final implementation report requested in the original specification.

## Known technical limitation to keep visible

Challenge proof collection is materially stronger, but without a server-side append-only attempt ledger a determined client may still omit earlier proof batches. Do not claim cryptographic completeness. A complete fix must fit an existing typed handler and preserve the twelve-function limit.

## Deferred Higgsfield AI tasks

Higgsfield was unavailable and the user explicitly deferred all related research, prompts, generation, selection, and integration. Do not substitute another generator or create placeholder media. When the MCP is available, reassess and produce only approved high-value assets: refined family mark studies, StudyShark and devShark Open Graph/launch art, optional subject chapter plates, limited classroom/empty-state editorial media, and campaign crops. Authentic product UI must remain deterministic. Update `docs/design/generated-media-manifest.md` with real provenance only after generation.

## Pre-existing unrelated work

The following untracked paths existed before this overhaul and were deliberately not staged or modified as part of these commits:

- `.agents/skills/full-app-audit/`
- `.agents/skills/plan-feature/`
- `.agents/skills/security-reliability-sweep/`
- `.agents/skills/ux-sweep/`
- `.codex/`

Keep them separate unless the user explicitly brings them into scope.
