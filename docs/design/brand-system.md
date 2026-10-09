# devShark brand system

## Architecture

devShark is a developer-learning product with one subject, `webdev`, and the only product this repository builds. StudyShark and its subject brands moved to their own repository, `lukaskourilcz/studyshark`, on 2026-09-24. The public name is exact: devShark. Product identity and links come from `client/product-catalog.ts` and `client/src/lib/products.ts`.

## Identity

- Mark: the V9 kit in `client/public/brand/v9/` (rules in `docs/brand/brand-guidelines.md`). The header and the mobile menu show the compact logo, `BrandLogo` (`client/src/components/BrandLogo.tsx`): the fin with its wave and the outlined wordmark, in `currentColor`. Every other fin is the clean fin, `SharkFin` (`client/src/components/SharkFin.tsx`), whose `wave` prop draws the standalone fin-wave symbol. The favicon and app icons are the clean fin. All of them copy the kit paths from `brandGeometry.ts`; do not redraw the fin.
- Neutrals: ocean ink, off-white paper, muted blue-green surfaces.
- Surface: restrained grain, hairline edge, tactile bottom edge, quiet shadow.
- Typography: Manrope for editorial headings, Inter for reading/UI/code metadata with system fallbacks. The logo's lettering is outlines, so it needs no font.
- Accent: the one devShark accent, read through `var(--brand-accent)`, plus semantic feedback colors.
- Image language: flat editorial plates, measured linework, authentic interface/data.

## Product expression

- Content and mark language: modular code structure, architecture flow, authentic technology glyphs, restrained grid rhythm.
- Avoid: fake terminals or code, neon, cyberpunk, robots, bootcamp-funnel framing.

## Voice

Concise, direct, active, specific, encouraging, honest, technically accurate, and natural in English. Prefer real actions: practise a topic, complete a level, review weak areas, join a classroom, report an answer. Avoid generic “unlock,” “revolutionize,” “supercharge,” “AI-powered,” and “future of education” claims.

## Freemium rule

devShark is freemium. `shared/tiers.ts` sets what every account opens (HTML, CSS and JavaScript in full, React levels 1 to 12, the opening stages of every project and short path, and a starter set of coding challenges, about 19 % of the coding challenges together) and what Premium opens for 3.99 EUR a month or 39.99 EUR a year. Copy states the price with "VAT included" beside it and never calls devShark free for everyone; "Free to start" is the claim. A lock reads "Premium" in text, so colour or an icon never carries it alone.

Premium, coins, cosmetics and merchandise decide which content a learner may start. They leave explanations, grading, XP amounts, scores, streaks, ranks, leaderboards, matching and accounts as they are. Voluntary support is retired: `/support` redirects to `/premium`.

History: this section was the "Free-forever rule" until the owner made devShark freemium on 25 September 2026 (`SECOND-HANDOFF-25-9-2026.md`).

