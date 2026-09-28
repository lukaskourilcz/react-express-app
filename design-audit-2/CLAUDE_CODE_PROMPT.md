# devShark design review, round 2 — implementation brief for Claude Code

Read this file, then the pages under `design-audit-2/` (`00 Overview`, `01 Leaderboard`, `02 Account`, `03 Copy`). The folder arrives as `design-audit-2.zip`; unzip it at the repository root so the paths below resolve, and commit it on `review2/p0` so the issues can link to its pages (it is deleted again in the cleanup step at the end). Round one (`design-audit/`, closeout `docs/design/audit-2026-09-27-closeout.md`) is done and is not reopened here. This round is cut-and-tighten only: no new features, pages, gamification or AI; grading, XP, scores, streaks, ranks, entitlements and `shared/tiers.ts` untouched; English only; the name is devShark; no AI claims. Keep the shark identity (footer ocean, fin schools, loader fin, fins as lives, waterline kickers, the green). Use existing tokens (`--radius-*`, `--shadow-low/med/high`, `--ss-type-*`, `--ss-ink-rgb`) and components (Astryx Button, Banner, Kicker, SwimCta, LoadingScreen, ErrorRetry), never a new one-off. Keep 44px touch targets, the focus ring, status that never relies on colour alone, and no horizontal page scroll.

## How to work

- One GitHub issue per ID below (`gh issue create`), titled `Design review 2 <ID>: <short title>`, labelled `design-review-2` plus `P0`/`P1`/`P2`, body = the finding and the fix, referencing the page and finding number (e.g. `design-audit-2/02 Account.dc.html`, finding 10).
- Branches `review2/p0`, `review2/p1`, `review2/p2`, stacked in that order. One ID per commit: `Design review 2 <ID>: <title> (closes #<issue>)`. Push every 2–3 commits.
- Copy changes go through `client/src/i18n/translations.ts`. Deleted keys go from `translations.cs.ts` too; changed values update Czech only where the key already exists; add no Czech.
- Before every push: `npm run typecheck:api`, `npm run test:client`, `npm run test:launch`, `npm run build`, `npm run check:responsive`. Fix failures in the same commit.
- Rows marked **verify** on the Copy page: grep `client/src` for the key (both `t('key')` and template forms) before deleting. If it is used, leave it and note that in the issue.
- **Not verified** items name a screenshot. Take it first (`vite preview` + Chrome, or the browser specs). If the screenshot does not show the defect, close the issue as "not reproduced" and say what you saw.
- If a finding conflicts with code the review did not read (`lib/queries.ts`, `lib/tracks.ts`, `Today.tsx`, `CareerRoadmap.tsx`, Astryx internals), prefer the intent and note the deviation in the issue.

## Launch contracts touched

- `scripts/test-launch-contracts.ts`, the R1 P0.4 check (no `!` / "Well done" in end-state keys): **R2-P1.13** extends its key regex to `roadmap\.(levelComplete|levelFailed|outOfHeartsTitle|checkpointComplete|allDone)`.
- Contracts that may pin strings changed here: `landing.compare.footnote` (R1 P0.1/P0.5 — the new text keeps "No ads on either plan." verbatim), `leaderboard.scope30d` / `scopeAllTime` (R1 P2.1 — update the assertion in the R2-P1.1 commit), the Profile tip contract (R1 P1.5 — R2-P1.18 removes the route loader's `tips`; check no contract asserts `devTips` renders).
- en/cs key parity is enforced by the compiler: every deletion goes from both files.

---

## P0 — must fix before launch

**R2-P0.1 GitHub garden cells overflow at the default width.** `client/src/styles/app-shell.css`: `.ss-cost-grid { grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); }` and add `.ss-cost-grid dd { min-width: 0; overflow-wrap: anywhere; }`. Remove the 700px media override of `.ss-cost-grid` if `auto-fit` makes it redundant (keep the `.ss-info-sections` half). `/premium` at 920px stays 4-up; the profile card drops to 2-up. Optional in the same commit: in `GithubGardenCard.tsx` give the repository `dd` `style={{ fontSize: 'var(--ss-type-compact)' }}`. Screenshot first: `/profile` connected, 1000px. (Account 10.)

## P1 — should fix before launch

**R2-P1.1 Leaderboard header.** `Leaderboard.tsx`: remove the `<Kicker>`; `<Heading level={1} type="display-3">{t('leaderboard.title')}</Heading>`; remove the `.lb-lede` paragraph. `translations.ts` (+ `.cs.ts` delete): delete `leaderboard.rule`; `leaderboard.scope30d` → "Ranked by correct answers, then accuracy: quiz, daily challenge, Biggest Shark Challenge and Learn answers from the last 30 days. Five answers put you on the board."; `leaderboard.scopeAllTime` → "Ranked by correct answers, then accuracy: every quiz and daily challenge answer since the board began. Five answers put you on the board."; `leaderboard.heading` becomes unused — delete it. Deviation note for the issue: this reverses the optional half of R1 P2.1 on structural grounds (the only page whose h1 is not its nav label); if the owner keeps "Most correct answers" as h1, still remove the Kicker and `leaderboard.rule`. (Leaderboard 1.)

**R2-P1.2 Period control and controls row.** `Leaderboard.tsx`: `layout={isMobile ? 'fill' : undefined}` on `SegmentedControl`; move `.lb-filter` into the same row as the control. `Leaderboard.css`: `.lb-controls { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px 16px; }` with the scope `<p>` given `flex: 1 1 100%`; under 600px `.lb-controls { flex-direction: column; align-items: stretch; }`. (Leaderboard 2.)

**R2-P1.3 Rank discs.** `Leaderboard.css`: `.lb-rank--top { border: 2px solid var(--ss-ink); background: transparent; color: var(--color-text-primary); font-weight: 800; }`. Update the file's header comment (it says the top three are filled). (Leaderboard 4.)

**R2-P1.4 Row density and gutter.** `Leaderboard.css`: `.lb-table th { padding: 12px 24px }`, `.lb-table td { height: 48px; padding: 4px 24px }`, `.lb-skeleton { min-height: 48px; padding: 8px 24px }`, `.lb-card { min-height: 56px }`; under 600px keep 16px side padding. (Leaderboard 6.)

**R2-P1.5 Keep the board while the next one loads.** `lib/queries.ts` `leaderboardQuery`: add `placeholderData: keepPreviousData` (TanStack Query 5). `Leaderboard.tsx`: draw the table while `isPlaceholderData || (isFetching && board)` with `aria-busy="true"` on `.lb-board`; add `.lb-board[aria-busy='true'] { opacity: .55; transition: opacity var(--ss-motion-feedback) ease-out 200ms; }` (reduced motion: `transition-duration: 0s`). `BoardSkeleton` stays only for `isLoading && !board` with no cached board. Screenshot first: 30 days → All time on a 40+ row board. (Leaderboard 9.)

**R2-P1.6 Identity name and email ellipsise.** `DeepEndScreens.css`: `.de-profile-identity__row > :first-child { min-width: 0; flex: 1 1 16rem; }`. `Profile.tsx`: wrap the name/email `VStack` in `<div style={{ minWidth: 0, flex: 1 }}>` (or pass `width="100%"` and `style={{ minWidth: 0 }}` if `VStack` forwards style). Keep `maxLines={1}`. Screenshot first: `/profile` at 360px with a 39-character name. (Account 1.)

**R2-P1.7 Streak tiles.** `Profile.tsx` `StreakCard`: `Grid columns={{ minWidth: 240, max: 2 }}`. Screenshot first: 400px, shield active. (Account 4.)

**R2-P1.8 Career card row.** `Profile.tsx` `CareerCard`: replace `<VStack gap={0} width="100%">` with `<div style={{ display:'flex', flexDirection:'column', minWidth:0, flex:'1 1 auto' }}>`; XP span `style={{ display:'inline-flex', alignItems:'baseline', gap:6, flexShrink:0, whiteSpace:'nowrap' }}`. Screenshot first: 360px, rank "Junior Full-Stack Developer", 12,480 XP; confirm the route no longer scrolls sideways. (Account 5.)

**R2-P1.9 Stat tiles.** `Profile.tsx`: `Grid columns={{ minWidth: 120, max: 4 }}`; `StatTile` figure `<Text size="xl" weight="bold" style={{ fontVariantNumeric: 'tabular-nums' }}>`. Note vs R1 P1.5 in the issue: 2xl fit 4-digit values; this covers 5 digits. (Account 6.)

**R2-P1.10 Path kind slot.** `LearningPaths.css`: `.lp-activity__kind { flex: 0 1 auto; width: auto; min-width: 5.5rem; }`. `translations.ts`: `paths.kicker.role` → "Role", `paths.kicker.skill` → "Skill path" (update `.cs.ts` values: "Role", "Dovednostní cesta"). (Account 7.)

**R2-P1.11 Path state slot.** `LearningPathsCard.tsx`: in `.lp-activity__minutes` render `t('roadmap.unavailable')` when `!isOpen(entry.availability)`; for an enrollment show `t(enrollment.status === 'paused' ? 'paths.action.resume' : 'paths.state.in_progress')`. `LearningPaths.css`: `.lp-activity__minutes { flex: 0 1 auto; min-width: 0; }`. (Account 8.)

**R2-P1.12 Card stock on the two child cards.** `LearningPathsCard.tsx`: wrap the `Card` in `<div className="ss-raised" style={{ display:'flex', width:'100%' }}>` exactly as `GithubGardenCard`'s `Raised` does (or export `Raised` from a shared place and import it). `Friends.css`: `.fr-card { padding: 24px; }` and delete its `background`, `border`, `border-radius`; `FriendsPanel.tsx`: `className="fr-card ss-panel"` on the four sections. (Account 9.)

**R2-P1.13 Learn end states.** `translations.ts` (+ `.cs.ts` values): `roadmap.levelComplete` → "Level complete"; `roadmap.levelFailed` → "Not passed"; `roadmap.outOfHeartsTitle` → "Out of hearts"; `roadmap.checkpointComplete` → "Part test passed"; `roadmap.allDone` → "Every level here is cleared."; `roadmap.incorrect` → "Incorrect". Extend the P0.4 regex in `scripts/test-launch-contracts.ts` to include these five keys.

**R2-P1.14 Stale names.** `title.shop` → "Coins · devShark"; `title.challenge` → "Biggest Shark Challenge · devShark"; `title.roadmap` → "Career · devShark"; `roadmapPage.title` → "Career roadmap" and delete `roadmapPage.kicker` (remove its render in `CareerRoadmap.tsx`). `subject.webdev.blurb`: delete after grep (verify).

**R2-P1.15 Duplicated facts.** `landing.compare.footnote` → "Premium never changes how an answer is graded, how much XP it gives or how the boards are ranked. It pays for the servers that grade your code. No ads on either plan."; delete `careerRoadmap.honestyLead` and `careerRoadmap.honestyBody` and their render in `CareerRoadmap.tsx`; delete `today.subtitle` and `today.doneBody` and their renders in `Today.tsx`.

**R2-P1.16 Dead or contradicting keys.** Delete, after grep: `landing.compare.rowAi`, `othersAi`, `rowBilingual`, `othersBilingual`, `rowCards`, `othersCards`, `rowStreaks`, `othersStreaks`, `othersQuizzes`, `othersLeaderboards`, `othersNoAds`, `oftenPaid`, `usuallyLimited` (none is in `PLAN_ROWS`); `shop.item.double-xp.name`, `.desc`, `shop.item.ring-*`, `shop.item.flair-*` ("Your next quiz earns 2× XP" contradicts CLAUDE.md even as a dead key — if `lib/shop.ts` still reads them, note it in the issue and stop). Run `npm run check:unused`.

**R2-P1.17 Home hero.** `home.title` → "Lessons, quizzes and coding tasks for web developers."; `home.subtitle` → "Guided lessons, quizzes and graded coding tasks for frontend and backend. HTML, CSS and JavaScript are free for every account."

**R2-P1.18 Route loader tips.** `App.tsx:220`: drop `tips={localizedDevTips(config.devTips, lang)}` from the route `LoadingScreen`. If `localizedDevTips` then has no caller, delete it and the `tips` prop from `LoadingScreen.tsx` (and the `.devshark-tip` rule). Leave the `/dev` setting in place so saved settings still parse.

**R2-P1.19 One name for the relaxed mode; no "Level up".** `challenge.practiceScore` → "Relaxed pace. Not ranked."; `challenge.shareDetailPractice` → "at relaxed pace"; `xp.rankUpKicker` → "New rank".

**R2-P1.21 Paths card inventory.** `LearningPaths.css`: `.lp-profile-inventory { grid-template-columns: minmax(7.5rem, 40%) minmax(0, 1fr); }`. `LearningPathsCard.tsx`: the three `dt`s render short labels instead of the picker questions — add `profile.inventory.goals` "Goals", `profile.inventory.experience` "Experience", `profile.inventory.studyTime` "Study time" (English only; the picker keeps `profile.picker.*Legend`). Screenshot first: `/profile` at 1000px with a saved learner profile. (Account 15.)

**R2-P1.20 Leaderboard Today-tab empty CTA.** `Leaderboard.tsx`: `label={tab === 'today' ? t('quiz.todaysChallenge') : t('leaderboard.emptyCta')}`; the route stays `/quiz`. (Leaderboard 10, copy half.)

## P2 — polish

**R2-P2.1** Topic filter uses `.ss-select` and `.ss-field-label`; `.lb-select { width: 14rem }` at ≥600px, 100% below; delete `.lb-select`'s own border/padding rules and `.lb-filter__label`. (Leaderboard 3.)
**R2-P2.2** `.lb-score { font: 700 1rem/1 var(--font-family-body); font-variant-numeric: tabular-nums; }`. (Leaderboard 5.)
**R2-P2.3** Move `.rw-tag` to `astryx-theme.css` as `.ss-tag`; use it for the "You" tag (`Leaderboard.tsx`) and the Premium tag (`Shop.tsx`); delete `.lb-you` and `.rw-tag`. (Leaderboard 7.)
**R2-P2.4** Offline notice → `<Banner status="warning" title={…offlineStale…} endContent={<Button size="sm" variant="ghost" label={t('quiz.retry')} onClick={reload} />} />`; delete `.lb-stale`. (Leaderboard 8.)
**R2-P2.5** `.lb-empty { flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: flex-start; gap: 12px 16px; padding: 16px 24px; text-align: left; }`; the CTA becomes `<Button variant="secondary" …>`. (Leaderboard 10, layout half.)
**R2-P2.6** `.lb { gap: 16px } .lb-head { margin-bottom: 8px }`. (Leaderboard 11.)
**R2-P2.7** One `.ss-sr-only` in `astryx-theme.css`; replace `.lb-vh`, `.fr-visually-hidden`, `.rw-sr-only`, `.lp-visually-hidden`, `.de-plan-line__sr`; delete the five rules. (Leaderboard 12.)
**R2-P2.8** Remove `.lb-card__label` and its span; the `<ol aria-label>` carries the caption. (Leaderboard 13.)
**R2-P2.9** `PlanLine.tsx` loading span: `.de-plan-line__loading { min-height: 2.6em; align-items: center }` at ≥600px and `4.2em` below (`DeepEndScreens.css`). (Account 2.)
**R2-P2.10** `.de-plan-line { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 12px; align-items: baseline; }` — label in column 1, tier and body in column 2 (wrap them in one `<span style={{display:'flex',flexDirection:'column',gap:2}}>`), the button `grid-column: 2; justify-self: start`; at ≤600px `grid-template-columns: minmax(0,1fr)`. (Account 3.)
**R2-P2.11** `GithubGardenCard.tsx`: the two `<a className="ss-link-button …">` → `<Button variant="secondary" size="sm" href={INSTALLATIONS_URL} target="_blank" rel="noopener noreferrer" label={t('github.manageOnGithub')} />`; delete `.ss-link-button*` if no other user (grep `PublicInfoPages`, `LegalPages`). (Account 11.)
**R2-P2.12** `.fr-btn` / `.fr-btn--primary` and `.lp-btn` / `.lp-btn--primary` → Astryx `Button` (`variant="primary" | "secondary"`) in `FriendsPanel.tsx`, `LearningPathsCard.tsx` (and `LearningPathScreens.tsx` / `PathRewardClaim.tsx` if they share the class); delete the CSS. Touch keeps 44px through the existing `pointer: coarse` floor. (Account 12.)
**R2-P2.13** `FriendsPanel.tsx`: loading → `<LoadingScreen label={t('friends.loading')} sx={{ minHeight: 160 }} />`; unavailable → the two lines inside `<div className="ss-panel" style={{ padding: 24 }}>`. (Account 13.)
**R2-P2.14** Delete dead CSS after grep: `.fr-friend__handle`, `.rw-wallet__rates`, `.rw-wallet__rates li`, `.de-profile-guidance*`, `.de-achievement-list*`, `.ss-link-button*` (if P2.11 removed the last user). (Account 14.)
**R2-P2.15** Copy P2 batch — apply every P2 row of `03 Copy.dc.html` (tightened values; deletions after grep; the loading-line shape "Loading …"; drop "Please" from the six error lines). One commit per family is fine; one issue for the batch.

## Done means

All issues closed with linked commits; `build`, `test:client`, `test:launch`, `check:unused`, `check:responsive` green; the nine named screenshots attached to their issues (or the issue closed as not reproduced); a short `docs/design/review-2026-09-28-closeout.md` listing each ID, the commit, and any deviation from this brief.

## After everything is implemented: clean the repository

Once every ID above is merged to `main`, do one final pass on a branch `review2/cleanup` and remove design material that no longer has a use in the repository. Delete, do not archive:

- `design-audit/` — the round-one review pages, its `CLAUDE_CODE_PROMPT.md`, `README.md`, `github.md`, `support.js` and `favicon.svg`. Its record is `docs/design/audit-2026-09-27-closeout.md`, which stays.
- `design-audit-2/` — this folder, including this brief, once `docs/design/review-2026-09-28-closeout.md` exists and lists every ID with its commit.
- Root-level hand-off and kickoff notes whose content is now in code or in `docs/`: `KICKOFF-25-9-2026.md`, `SECOND-HANDOFF-25-9-2026.md`, `docs/DEEP_END_HANDOFF.md` — read each first; keep any file that a document or skill still links to (`CLAUDE.md` references `docs/DEEP_END_HANDOFF.md`; update that line rather than leave a dead link).
- Stale design docs under `docs/design/` that describe screens or rules the code no longer has (compare against `astryx-theme.css`, `DESIGN_RULES.md` and `design-system.md`); keep the three authoritative media documents the generative-media skill names.
- CSS with no selector in use after this round (`npm run check:unused` plus a grep per class): the rules R2-P2.14 names, plus any `.lb-*`, `.fr-*`, `.lp-*`, `.rw-*`, `.de-*` rule that lost its last element.
- Translation keys with no `t()` or template user after the Copy batch, in both dictionaries.

Before deleting a file, `grep -r` its path and basename across the repository (docs, skills, scripts, `NEEDED.md`, `README.md`, `vercel.json`, `knip.json`). Update or remove the reference in the same commit. Do not touch `client/public/brand/`, `docs/brand/`, `DESIGN_RULES.md`, `docs/design/design-system.md`, the media documents, or anything under `.claude/`, `.agents/` or `.codex/`. Commit the cleanup as its own PR titled `Design review 2: remove stale design material`, list every deleted path in its description, run the full check set once more, and merge it last.
