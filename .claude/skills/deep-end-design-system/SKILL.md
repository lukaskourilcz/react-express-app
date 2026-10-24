---
name: deep-end-design-system
description: Apply the devShark Deep End v2 visual system when changing React screens, shared UI, CSS tokens, motion, themes, or responsive layout. Use for design implementation and design-system review.
---

# Deep End Design System

Build on Astryx and the existing Shark primitives. Read `DESIGN_RULES.md`, `docs/design/design-system.md`, `client/src/styles/astryx-theme.css`, and `client/src/styles/app-shell.css` before editing.

## Rules

- Use ocean-ink neutrals, tactile paper surfaces, one disciplined accent, editorial type, and restrained fins/waterlines.
- Reuse Astryx, `SharkFin`, `SwimmingFin`, `Waterline`, `.ss-kicker`, `.ss-panel`, `.ss-raised`, `.ss-lift`, `BrandLogo`, and the technology glyphs (`CategoryGlyph` in `client/src/components/ui/techIcons.tsx`). Never redraw the fin: the brand paths come from `client/src/components/brandGeometry.ts`.
- Source brand, subject, URL, count, and accent data from the existing registries. Read the accent through `var(--brand-accent)`; never add a component-local palette or hard-code its hex.
- Keep fin bases on their container waterline. Fin-school cards do not also lift or tilt. Repeated roadmap waves vary. Non-essential motion respects `prefers-reduced-motion`.
- Use semantic tokens for shared meaning: backgrounds, text, borders, focus, selected, success, warning, error, info, overlays, and the accent.
- Avoid glass, generic gradients, glows, fake dashboards, excessive pills/cards, mixed icon libraries, decorative heading icons, and filler imagery.
- Sizes come from the shared system, never from the page: see "Build a new screen" below and `DESIGN_RULES.md` §10–11.
- Keep public pages medium density, learning pages medium-to-high density, and `/dev` high density and low decoration.

## Build a new screen

The tokens, the route map and the component catalogue are in `docs/design/design-system.md`. Tick each line:

1. **Width.** Add the route to `pageMaxWidth` in `client/src/components/ui/pageWidth.ts` (800px unless it is two-column or holds an editor) and to `client/tests/page-width.test.tsx`. Write no page `max-width`; an inner column is `var(--ss-width-task)`, text keeps `68ch`.
2. **Header.** An operational page opens with `PageHeader` (`components/ui/PageHeader.tsx`), a public page with `Page`, a Learn-area page with `LearnPageHeader`. No kicker that repeats the `h1`; the lead is one scope sentence.
3. **Controls.** Astryx buttons at the default 44px; no `size="sm"`. Only a component's own toolbar goes in `.ss-compact` (36px with a 44px hit area). Icon buttons 44×44 with a 20px glyph, a tooltip and an `aria-label`. Page actions use `.ss-action` or a shared action row.
4. **One primary.** One `SwimCta` md per screen; everything else Astryx `secondary` or `ghost`. A list row's action is `FadeFinCta`.
5. **Parts.** Reuse before you draw: `StatePanel` (or `StatePanel inline` with `signIn`) for any empty, gate or signed-out state; the `components/question/` parts for a question; `CodingWorkbench` and `BriefZone` for code; `.ss-panel` with a `<Kicker as="h2">` for a card; `.de-setting-row` for an account action; hairline rows (`1px solid var(--ss-card-line)`) for a list; `BrandedConfirmDialog` for a destructive step.
6. **Copy.** English keys in `translations.ts` or the route's own dictionary. Say each fact once; the verb is "Sign in".
7. **States.** Loading, empty, error, offline, signed out, disabled, success and long content, each with one cause and one next action and a layout that does not move.
8. **Verify.** `npm run check:design` (or `npm run check:public`, which runs it), the unit tests for the parts you touched, then a build with `npm run build`, `npm run preview --prefix client` and `npm run check:responsive`. Run the browser spec for the area: `npm run test:browser -- tests/browser/<spec>.spec.ts` (`first-load` for the shell, `routes-axe` for every route, `learn-sections`, `coding-workbench`, `daily`, `public`, `navigation`). An intended exception goes into `scripts/design-contract-allowlist.json` with a reason.

## Implementation workflow

1. Trace the route and inspect sibling components before creating anything.
2. Identify the user goal, primary action, states, breakpoint changes, and accessibility behavior.
3. Extend an existing primitive or token where the meaning is shared.
4. Add every user-visible string to `client/src/i18n/translations.ts`. devShark ships English only: write all copy in English and add no second language, translation overlay or language switch.
5. Verify keyboard/focus, non-color status, 44px targets, reduced motion, reflow, fixed-shell clearance, and dark/light contrast.
6. Run relevant checks from `package.json`, including `npm run check:design`, `npm run test:launch`, `npm run build`, and `git diff --check`.

Do not weaken answer integrity, product/subject scope, the free/Premium boundary set in `shared/tiers.ts`, the footer's legal links and controls, or the 12-handler budget for visual convenience. A Premium lock carries the word "Premium" as text, never colour alone, and stays focusable.
