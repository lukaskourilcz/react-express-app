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
- generated-media opportunity, art-direction, and manifest documents explicitly recording that no production asset has been accepted.

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

### 4. Interaction, accessibility, and recovery hardening

The continuation commit after `96ff1c6` completes the highest-impact findings from the UX, accessibility, and performance sweep:

- StudyShark topic pages now reject `webdev`, devShark topic pages reject general subjects, and a valid topic switches StudyShark into its owning subject before quiz navigation;
- Quiz setup, Play mode selection, and Learn topic selection use the shared roving-tabindex radio-card pattern, including disabled-option skipping and 44px targets;
- active Quiz, Play, and sample questions expose a semantic question/answer relationship; quiz and Learn outcomes move focus to an `h1`; mobile leaderboard and live scoreboard rows are native lists;
- Play exposes copy failures, polling/stale states, distribution failure, a one-shot timer warning, retry for failed direct-room loading, and duplicate-safe host controls;
- challenge and roadmap reflow no longer clip long content, roadmap dark-mode feedback uses semantic colors, and reduced motion disables custom landing/path movement;
- the cosmetic shop hydrates account state before purchases, and an equipped item is honestly labelled “Unequip” when its action removes it;
- Career Roadmap handles structure loading/failure, stale devShark copy is corrected in EN/CS, and `/dev` declares the language of its intentionally English operational UI;
- single-question triage deletion now requires the existing branded destructive confirmation;
- route focus no longer jumps merely because the locale changes, and all new copy has English/Czech parity.

## Validation completed

Final validation for the current handoff used `/opt/homebrew/bin/node` 23.1.0 (the default shell still resolves Node 20, so keep the PATH override):

- `PATH=/opt/homebrew/bin:$PATH npm run typecheck:api` — passed;
- `PATH=/opt/homebrew/bin:$PATH npm run test:launch` — passed product identity, scope, token confidentiality, stable attempts, fairness-neutral rewards, rate limiting, health, and the twelve-function budget;
- `PATH=/opt/homebrew/bin:$PATH npm run build` — passed; Vite reported only the existing static/dynamic import chunk warnings;
- `PATH=/opt/homebrew/bin:$PATH npm run check:responsive` — 133 route/viewport probes, zero overflow or containment issues across 360, 390, 430, 768, 1024, 1280, and 1440 widths;
- `npm audit --omit=dev` and `npm audit --omit=dev --prefix client` — zero vulnerabilities;
- browser rendering inspected the StudyShark landing, mobile Quiz setup, signed-out `/dev`, and allowed/blocked topic pages at mobile and desktop widths; no console errors were recorded in the checked state;
- every `.claude/skills/*` package passed `quick_validate.py`;
- `git diff --check` passed and `find api -type f -name '*.ts'` returned exactly twelve handlers.

## Continue in this order

1. Use Node 22–24 (`PATH=/opt/homebrew/bin:$PATH` on this machine). Dependencies and the StudyShark production build are currently validated; reinstall only if the restarted environment requires it.
2. Build and visually inspect the devShark product configuration as well as signed-in deterministic fixtures for active Quiz/review, a live/classroom room, Profile, Shop inventory, and the authenticated `/dev` console. Do not claim those states were browser-verified from this handoff.
3. Continue lower-priority sweep findings: Challenge result-leaderboard partial error, DevSettings unsaved-change protection, flashcard undo, profile preference-save failure, live-room timing accommodation documentation, and performance work that can be proved safe (auth loading and roadmap intro chunking were not changed here).
4. Recheck Czech copy, both themes, keyboard/focus, reduced motion, 400% reflow, and fixed-waterline clearance in those authenticated/deterministic states.
5. Run the full release contract again after further edits, reconcile documentation, and create coherent new commits rather than amending existing history.

## Known technical limitation to keep visible

Challenge proof collection is materially stronger, but without a server-side append-only attempt ledger a determined client may still omit earlier proof batches. Do not claim cryptographic completeness. A complete fix must fit an existing typed handler and preserve the twelve-function limit.

## Generated-media production continuation

No generated production asset has been accepted. The existing solid-green OG image remains a deterministic fallback and must not be presented as finished launch art.

The repository includes the `generated-media-production` skill, `generated-media-art-director` specialist and `generate-shark-media` command. `docs/design/generated-media-opportunity-audit.md`, `generated-media-art-direction.md` and `generated-media-manifest.md` contain the provider-neutral research requirements, six product direction briefs, acceptance criteria and continuation workflow.

Before recommending or using a generator, the next agent must perform current web research into at least three cheap or free image-generation services using official pricing, licensing, commercial-use, privacy, retention/training, watermark, output-resolution, aspect-ratio, export and API documentation. Record dated findings and source links in `docs/design/generated-media-opportunity-audit.md`, recommend the lowest-risk viable path, and provide website prompts when manual owner generation is the best free route. Do not register accounts, accept paid terms, purchase credits, enable auto-refill, upload sensitive material or switch providers through a state-changing action without explicit owner authorization.

Produce these items only where the real interface still benefits:

1. Shark-family fin-and-waterline mark studies for favicon/PWA/social-avatar refinement; convert the selected geometry into reviewed deterministic SVG rather than shipping a raw raster.
2. StudyShark Open Graph/launch composition representing geography, math, history, biology, chess, and poker with text-safe negative space; place through product-aware metadata and overlay real EN/CS text deterministically.
3. devShark Open Graph/launch composition using authentic system/code structure without generated code or terminal text; place through the same product-aware metadata path.
4. Seven optional subject chapter plates for geography, mathematics, history, biology, chess, poker, and web development; integrate only in existing `SubjectPlate`/landing hooks, with responsive still crops and decorative alt treatment.
5. One restrained classroom promotional composition for the public classroom page, using a deterministic capture of the real interface if UI appears in the artwork.
6. A small reusable empty/onboarding editorial set (not one image per card) for genuinely emotional empty states such as no flashcards or no progress.
7. StudyShark and devShark campaign crops in landscape, portrait, and square formats; EN/CS messaging must be real overlay text, never generated text.
8. Optional motion studies only after stills succeed: a subtle water/current or fin pass for public landings, with optimized WebM/MP4, poster still, reduced-motion fallback, and no loading in core learning/admin bundles.

For every accepted asset, record the provider, model/version, dated pricing/license sources, actual tool/workflow, prompts, job IDs, rejected variants, crop behavior, optimization, provenance, accessibility classification, output path, usage restrictions and regeneration steps in `docs/design/generated-media-manifest.md`. Do not create output directories or runtime references until a production asset actually exists.

## Pre-existing unrelated work

The following untracked paths existed before this overhaul and were deliberately not staged or modified as part of these commits:

- `.agents/skills/full-app-audit/`
- `.agents/skills/plan-feature/`
- `.agents/skills/security-reliability-sweep/`
- `.agents/skills/ux-sweep/`
- `.codex/`

Keep them separate unless the user explicitly brings them into scope.
