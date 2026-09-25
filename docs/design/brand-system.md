# devShark brand system

## Architecture

devShark is a developer-learning product with one subject, `webdev`, and the only product this repository builds. StudyShark and its subject brands moved to their own repository, `lukaskourilcz/studyshark`, on 2026-09-24. The public name is exact: devShark. Product identity and links come from `client/product-catalog.ts` and `client/src/lib/products.ts`.

## Identity

- Mark: a swept-back fin with a hooked tip. In the logo (the navigation brand in the header and the mobile menu) its base is cut into a wave so it sits in the water: `<SharkFin wave />`, and `client/public/favicon.svg` repeats those paths. Every other fin on the page keeps a straight base, the `SharkFin` default. `SharkFin` (`client/src/components/SharkFin.tsx`) holds both sets of paths. Use these deterministic SVG primitives; do not redraw the fin elsewhere.
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

## Freemium rule

devShark is freemium. `shared/tiers.ts` sets what every account opens (HTML, CSS and JavaScript in full, React levels 1 to 12, stage one of every project and short path, and a starter set of about 15 % of the coding challenges) and what Premium opens for 3.99 EUR a month or 39.99 EUR a year. Copy states the price with "VAT included" beside it and never calls devShark free for everyone; "Free to start" is the claim. A lock reads "Premium" in text, so colour or an icon never carries it alone.

Premium, coins, cosmetics and merchandise decide which content a learner may start. They leave explanations, grading, XP amounts, scores, streaks, ranks, leaderboards, matching and accounts as they are. Voluntary support is retired: `/support` redirects to `/premium`.

History: this section was the "Free-forever rule" until the owner made devShark freemium on 25 September 2026 (`SECOND-HANDOFF-25-9-2026.md`).

