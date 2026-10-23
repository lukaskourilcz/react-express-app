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
- Sizes come from the shared system, never from the page (`DESIGN_RULES.md` §10, UX audit U1): the route shell picks the page width (`--ss-width-narrow` 800px by default, `--ss-width-standard` 1000px, `--ss-width-wide` 1200px) from the map in `client/src/components/ui/pageWidth.ts`, so a page sets no page `max-width`; task cards and the question column are `--ss-width-task` (640px); every button and form control is `--ss-control-height` (44px) on every pointer, and only controls inside `.ss-compact` (a component's own toolbar) are 36px with a 44px hit area; page actions use `.ss-action` or sit in `.ss-info-actions`; one filled primary per screen, `SwimCta` md; icon buttons are 44×44 with 20px glyphs; the sign-in verb is "Sign in", and each fact is said once per screen.
- Keep public pages medium density, learning pages medium-to-high density, and `/dev` high density and low decoration.

## Implementation workflow

1. Trace the route and inspect sibling components before creating anything.
2. Identify the user goal, primary action, states, breakpoint changes, and accessibility behavior.
3. Extend an existing primitive or token where the meaning is shared.
4. Add every user-visible string to `client/src/i18n/translations.ts`. devShark ships English only: write all copy in English and add no second language, translation overlay or language switch.
5. Verify keyboard/focus, non-color status, 44px targets, reduced motion, reflow, fixed-shell clearance, and dark/light contrast.
6. Run relevant checks from `package.json`, including `npm run test:launch`, `npm run build`, and `git diff --check`.

Do not weaken answer integrity, product/subject scope, the free/Premium boundary set in `shared/tiers.ts`, the footer's legal links and controls, or the 12-handler budget for visual convenience. A Premium lock carries the word "Premium" as text, never colour alone, and stays focusable.
