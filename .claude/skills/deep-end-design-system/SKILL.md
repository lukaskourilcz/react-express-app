---
name: deep-end-design-system
description: Apply the StudyShark/devShark Deep End v2 visual system when changing React screens, shared UI, CSS tokens, motion, themes, or responsive layout. Use for design implementation and design-system review.
---

# Deep End Design System

Build on Astryx and the existing Shark primitives. Read `DESIGN_RULES.md`, `docs/design/design-system.md`, `client/src/styles/astryx-theme.css`, and `client/src/styles/app-shell.css` before editing.

## Rules

- Use ocean-ink neutrals, tactile paper surfaces, disciplined subject accents, editorial type, and restrained fins/waterlines.
- Reuse Astryx, `SharkFin`, `SwimmingFin`, `Waterline`, `.ss-kicker`, `.ss-panel`, `.ss-raised`, `.ss-lift`, subject glyphs, and technology glyphs.
- Source brand, subject, URL, count, and accent data from the existing registries. Do not add component-local subject palettes.
- Keep fin bases on their container waterline. Fin-school cards do not also lift or tilt. Repeated roadmap waves vary. Non-essential motion respects `prefers-reduced-motion`.
- Use semantic tokens for shared meaning: backgrounds, text, borders, focus, selected, success, warning, error, info, overlays, and subject accents.
- Avoid glass, generic gradients, glows, fake dashboards, excessive pills/cards, mixed icon libraries, decorative heading icons, and filler imagery.
- Keep public pages medium density, learning pages medium-to-high density, and `/dev` high density and low decoration.

## Implementation workflow

1. Trace the route and inspect sibling components before creating anything.
2. Identify the user goal, primary action, states, breakpoint changes, and accessibility behavior.
3. Extend an existing primitive or token where the meaning is shared.
4. Add every user-visible string to both EN and CS dictionaries.
5. Verify keyboard/focus, non-color status, 44px targets, reduced motion, reflow, fixed-shell clearance, and dark/light contrast.
6. Run relevant checks from `package.json`, including `npm run test:launch`, `npm run build`, and `git diff --check`.

Do not weaken answer integrity, product/subject scope, free learning, the all-family footer, or the 12-handler budget for visual convenience.
