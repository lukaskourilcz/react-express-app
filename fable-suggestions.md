# UX Sweep — 2026-07-04 (fable suggestions)

Merged findings from three parallel audits (UX/AI-slop, accessibility, frontend perf), focused on: **AI slop**, **redundant components / CTA overload**, and **mobile + tablet responsiveness**.

---

## Top 3 wins (do these first)

1. **De-clutter the Quiz setup screen** — it currently stacks five equal-weight CTAs (Today's Challenge, Biggest Shark Challenge, category grid, count/difficulty pickers, Start quiz). Keep the filled green **Start quiz** as the single primary; demote "Biggest Shark Challenge" to a text link (it's a route, not a setup action) and give "Today's challenge" a secondary treatment. `Quiz.tsx:580–623`
2. **Fix the shell bundle regression (+30 KB gzip)** — the shell grew from ~22 KB to 52 KB gzip since the motion/TanStack/Sentry additions. Biggest levers: make `lib/sentry.ts` use a dynamic import (~40 KB gzip time-bomb once a DSN is set), add a `tanstack` manualChunk, and lazy-load the Czech `levelIntros.cs` (28 KB gzip inside the Roadmap chunk).
3. **Restore usable touch targets** — the toolbar sound/theme buttons are ~18×18 px (WCAG 2.5.8 needs 24×24 minimum; 44 px is the comfortable bar). Same problem class: quiz category chips (26 px tall) and roadmap topic pills (~28–30 px). `App.tsx:257–275`, `Quiz.tsx:633–670`, `Roadmap.tsx:579–612`

---

## Critical

### Bugs / broken UX
- [ ] **`Roadmap.tsx:950–1035`** — `LessonRunner` keydown effect has no deps array → a new listener attaches every render; fast typing can double-fire `choose`/`advance` and corrupt hearts/score. Add the deps array.
- [ ] **`Quiz.tsx:416`** — `window.confirm('Leave this quiz?...')` is hardcoded English, bypasses i18n, and is blocked in many mobile WebViews / iOS PWA contexts. Replace with an MUI Dialog wired to translations.
- [ ] **`Challenge.tsx:446–449`** — Submit-score button has no in-flight state → double-tap posts two leaderboard records. Add `submitting` + disabled + spinner.
- [ ] **`PathPickerDialog.tsx:24`** — DialogContent can overflow without scrolling on short (landscape phone) viewports. Constrain with `overflowY: auto`.

### CTA overload / redundancy
- [ ] **Quiz setup screen (`Quiz.tsx:580–623`)** — 5 competing CTAs; see Top-3 #1.
- [ ] **Home authenticated hero (`Home.tsx:86–110`)** — three elements point at the same action (two CTA buttons + a hint sentence repeating the destination). Once a path is chosen show one primary "Continue: {track}" button; drop the hint.
- [ ] **`AuthButton.tsx:141–148`** — Leaderboard/Shop micro-links under the username triple the nav paths to the same routes (also in NAV_ITEMS + drawer). Remove from AuthButton.
- [ ] **`CareerRoadmap.tsx:296`** — "Continue in the learning path →" repeats after *every* pillar (5× identical buttons per scroll). Show one CTA at the top of the section.
- [ ] **`Profile.tsx:312–327`** — full-width green "Start a quiz" CTA duplicates the nav link on a page whose job is reviewing stats. Demote to outlined/text.

### Accessibility blockers
- [ ] **`Challenge.tsx:574–585, 415–419`** — answer feedback Alert and the game-over transition have no `aria-live` / focus move. AT users don't know the run ended. (WCAG 4.1.3)
- [ ] **`Challenge.tsx:497–517`** — low-time warning (≤15 s) is colour + pulse only. Add a one-shot `aria-live="polite"` "15 seconds remaining" announcement. (1.3.3/4.1.3)
- [ ] **`Challenge.tsx:544–547`** — RadioGroup not labelled by the question text. Add `id` + `aria-labelledby`. Same pattern gap in `Roadmap.tsx:1194` and the SkillCheckRunner (`role="group"` with no name).
- [ ] **`RoadmapTree.tsx:213–218`** — locked PartPill is a plain div: not focusable, label ignored, tooltip can't fire. Give it a role + `tabIndex`.
- [ ] **`PathPickerDialog.tsx:33–76`** — `role="radio"` items all have `tabIndex=0` and no arrow-key roving; violates the radiogroup pattern.
- [ ] **`Roadmap.tsx:561, 640`** — `role="tab"` without `aria-controls`/tabpanel wiring. Either complete the tabs pattern or switch to radiogroup semantics.

---

## Important

### AI slop / copy (translations.ts unless noted)
- [ ] `home.subtitle` — feature-list-as-sentence. → "The structured path from zero to job-ready — frontend, backend, or fullstack."
- [ ] `home.step1–3Text` — paragraph-length explanations for one-line steps; step *titles* exist but are never rendered (`Home.tsx:162–168`). Render the titles, tighten the text.
- [ ] `home.featureLearnText` — "zero to hero" cliché. → "16+ topics split into short levels, each ending in a checkpoint test."
- [ ] `challenge.description` + `challenge.rule1–4` (`Challenge.tsx:356–360`) — the prose paragraph and the bullet list explain the same three facts twice on one card. Keep the bullets, cut the prose.
- [ ] `home.pathDialogSubtitle` — second sentence is pre-emptive reassurance nobody asked for. Cut it.
- [ ] Shop item descriptions — mechanical "A X next to your name" ×3, "A X ring around your avatar" ×3. Collapse.
- [ ] `register.body` — three stacked benefits dilute each other. Lead with progress sync + token bonus.
- [ ] **`CareerRoadmap.tsx:38–94, 150–163, 168, 216, 296`** — extensive hardcoded English outside i18n (pillar copy, honesty alert, track chooser, progress caption, CTA). Czech users see English. Move to translations.ts.

### Mobile / tablet responsiveness
- [ ] **`RoadmapTree.tsx:141`** — fixed 232 px cards can overflow the 760 px container at tablet widths. Use `flex: 1 1 200px` or calc-based widths.
- [ ] **`Challenge.tsx:485–521`** — playing header (score | timer+lives) has no flex constraints; wraps badly at 360 px. Pin with `flex: 1 1 auto` / `flexShrink: 0`.
- [ ] **`Challenge.tsx:438–449`** — submit-score row: button wraps under the full-width TextField at 360–400 px. Add `flexShrink: 0`.
- [ ] **`App.tsx:319`** — at ~768 px the toolbar shows hamburger + logo + auth in a mostly-empty 768 px bar (nav hidden until MUI `md` = 900 px). Consider showing nav links from a custom ~760 px breakpoint.
- [ ] **`Roadmap.tsx:413–414`** — serpentine at 2 columns on narrow phones: node labels clip at 72 px. Clamp label lines with `WebkitLineClamp: 2`.
- [ ] **`App.tsx:462–470`** — footer fin at 94% + translateX can nudge horizontal scroll; add `overflow: hidden` to the footer Box.
- [ ] **`Leaderboard.tsx:50–65`** — three-tab ToggleButtonGroup squeezes at 360 px; shorten "By category" → "Category".

### Contrast (WCAG AA)
- [ ] **`XpToaster.tsx:93–94`** — white text on `#7be24a` gradient stop = 1.64:1. Darken the gradient start or use dark text.
- [ ] **`categories.ts`** — white chip text fails on `abbreviations` #0ea5e9 (2.77:1), `general` #14b8a6 (2.49:1), `cool-stuff` #f97316 (2.80:1). Add all three to `DARK_TEXT_CATEGORIES`.
- [ ] **`AuthButton.tsx:136`** — BRAND.green rank title at 0.62 rem on dark paper = 3.26:1 (needs 4.5:1 at that size). Use a lighter green in dark mode.
- [ ] **`Quiz.tsx:686, 787–790`** — `aria-describedby="categories-error"` points at an element that doesn't always exist.
- [ ] **`Roadmap.tsx:1243–1253`** — lesson feedback panel appears without a live-region announcement.

### Performance
- [ ] **`lib/sentry.ts:14`** — static `import * as Sentry` will add ~40 KB gzip to the shell the moment a DSN is set. Switch to dynamic import (same pattern as PostHog in analytics.ts).
- [ ] **`lib/levelIntros.ts:13`** — static CS import bundles 28 KB gzip of Czech intros into the Roadmap chunk for everyone. Lazy-import per locale.
- [ ] **`vite.config.ts`** — add `tanstack: ['@tanstack/react-query', '@tanstack/query-core']` manualChunk for long-lived vendor caching (~13 KB gz separated from app-code hash churn).
- [ ] **`App.tsx:428–431`** — four fresh animation-prop objects allocated per App render in the hottest path. Hoist to module constants.
- [ ] **`public/triage-verdicts.json`** — 618 KB admin-only file on the public CDN. Move behind the dev API or add long-cache headers in vercel.json.
- [ ] **react-router v7** — router chunk 58 KB gz vs ~25 KB in v6 for identical declarative APIs used here. Consider pinning v6 (structural, optional).
- [ ] **motion core in shell (~15 KB gz)** — `AnimatePresence` route transitions require it synchronously. Only recoverable by making the route-transition wrapper itself lazy; noted as a deliberate trade-off unless the shell budget matters more than the fade.

---

## Polish

- [ ] `title.home` — "devShark, Test your web dev skills" comma splice → "devShark — web dev quiz & learning paths".
- [ ] Home "100% free" banner (`Home.tsx:120–159`) reads as a second hero; reduce visual weight. The free message currently appears 3× (hero badge, banner, register snackbar) — keep it in at most two places.
- [ ] Emoji → SVG consistency: 🗓️/🦈 on quiz-home buttons (`Quiz.tsx:595`), ⚡️ on skill check (`Roadmap.tsx:549`), 56 px 💔🎉💪🏆 on lesson-result screens (`Roadmap.tsx:1088`), medals in `Leaderboard.tsx:134` (fixed-width box misaligns on Windows).
- [ ] `challenge.submitPrompt` "Add your name to the Hall of Fame:" → "Save your score:".
- [ ] Game-over screen shows the score twice (big number + "Correct answers: {n}" right under it). Drop the label. `Challenge.tsx:415–430`
- [ ] Exclamation-mark consistency across result headings ("Quiz complete!" vs "Game over").
- [ ] Theme tokens: `CHECKPOINT_GOLD #ffb300`, `HEART_COLOR #ff4b6e`, tooltip `#333`, hardcoded rgba correct/incorrect overlays in Challenge — map to theme palette so dark mode inherits.
- [ ] Skip-link background: `background: 'background.paper'` doesn't resolve as a token → transparent skip link. Use `backgroundColor`. `App.tsx:289`
- [ ] `.rm-node` pop-in animation missing from the `prefers-reduced-motion` block. `Roadmap.css`
- [ ] Locked LevelNode/PartTestNode tooltips can't fire on `disabled` buttons — wrap in span like the topic pills already do. `Roadmap.tsx:804–894`
- [ ] `Challenge.tsx:688` — `ol` with `list-style: none` loses list semantics in Safari/VoiceOver; add `role="list"`.
- [ ] Route-change focus fires before the AnimatePresence enter completes; delay to `onExitComplete`. `App.tsx:196–210`
- [ ] `CareerRoadmap` LinearProgress bars lack `aria-label` context; two different bar heights (10 px + 6 px) on one page.
- [ ] Leaderboard empty state has no action button; add "Start a quiz".
- [ ] `Home.tsx:35–41` — sign-in button has no busy state during the OAuth redirect wait.
- [ ] `modulepreload` hint for the Home chunk would remove one RTT on first visit.

---

## Strengths to keep

- **BRAND token discipline** — nearly all green usage flows through `BRAND.*` / `brandButtonSx`, not scattered hexes.
- **prefers-reduced-motion coverage at every layer** (CSS, motion hook, SharkFin) — unusually thorough.
- **Skeleton-based loading states everywhere** data has a known shape; error states with retry at every async boundary.
- **Comprehensive keyboard support** in Quiz/Challenge/lesson runner (1–9 answers, Enter/Space advance).
- **The chalkboard Home aesthetic** — distinctive, thematically coherent, implemented cheaply. Genuinely not AI slop; keep it.
- **Correct lazy-loading patterns** for PostHog, motion features, TanStack devtools, prism-light, triage JSON fetch path.
- **RegisterPromptSnackbar behaviour** — session-flag pattern, fires once, doesn't dismiss on clickaway.

---

## Bundle snapshot (vite build, 2026-07-04)

| Chunk | Raw | Gzip | Status |
|---|---|---|---|
| shell (index) | 151 KB | 52 KB | ⚠ was ~22 KB before motion/TanStack |
| mui (incl. React) | 328 KB | 100 KB | preloaded |
| router (RR v7) | 177 KB | 58 KB | ⚠ v6 would be ~25 KB |
| supabase | 167 KB | 44 KB | preloaded |
| Roadmap | 160 KB | 62 KB | ⚠ 28 KB gz is Czech levelIntros |
| motion-features | 37 KB | 14 KB | ✓ lazy |
| prism-light | 44 KB | 15 KB | ✓ lazy |
| DevPage | 43 KB | 13 KB | ✓ lazy |
