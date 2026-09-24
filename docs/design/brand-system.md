# devShark brand system

## Architecture

devShark is a developer-learning product with one subject, `webdev`, and the only product this repository builds. StudyShark and its subject brands moved to their own repository, `lukaskourilcz/studyshark`, on 2026-09-24. The public name is exact: devShark. Product identity and links come from `client/product-catalog.ts` and `client/src/lib/products.ts`.

## Identity

- Mark: a swept-back fin with a hooked tip, its base cut into a wave so it sits in the water. `SharkFin` (`client/src/components/SharkFin.tsx`) holds the paths and `client/public/favicon.svg` repeats them. Use these deterministic SVG primitives; do not redraw the fin elsewhere.
- Neutrals: ocean ink, off-white paper, muted blue-green surfaces.
- Surface: restrained grain, hairline edge, tactile bottom edge, quiet shadow.
- Typography: Manrope for editorial headings, Inter for reading/UI/code metadata with system fallbacks.
- Accent: the one devShark accent, read through `var(--brand-accent)`, plus semantic feedback colors.
- Image language: flat editorial plates, measured linework, authentic interface/data.

## Product expression

- Content and mark language: modular code structure, architecture flow, authentic technology glyphs, restrained grid rhythm.
- Avoid: fake terminals or code, neon, cyberpunk, robots, bootcamp-funnel framing.

## Voice

Concise, direct, active, specific, encouraging, honest, technically accurate, and natural in English. Prefer real actions: practise a topic, complete a level, review weak areas, join a classroom, report an answer. Avoid generic “unlock,” “revolutionize,” “supercharge,” “AI-powered,” and “future of education” claims.

## Free-forever rule

Support is voluntary and never affects content, explanations, paths, challenges, multiplayer, cards, scoring, XP, streaks, ranks, leaderboards, matching, or accounts. Cosmetics remain fairness-neutral. Support stays disabled until externally configured and owner-approved.

