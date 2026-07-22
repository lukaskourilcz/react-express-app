# Higgsfield opportunity audit

Audit date: 22 July 2026.

## Capability result

No Higgsfield tool, MCP server, CLI, plugin, or repository integration is available in the implementation environment. The available tool inventory was checked explicitly. Therefore no Higgsfield generation is claimed and no credentials or speculative API surface were added.

The repository can still ship deterministic SVG marks, CSS/SVG subject plates, authentic screenshots, and the existing optimized PNG/OG assets. When Higgsfield becomes available, use the art direction and manifest workflow in this directory.

## Opportunity classification

| Candidate | Classification | Decision |
|---|---|---|
| Family fin/waterline logo, favicon, PWA icons | High-value, but deterministic | Refine existing SVG primitives; do not ship a raw raster-generated logo. |
| StudyShark OG / launch art | High-value | Generate editorial environment only; overlay real brand text deterministically. Deferred: integration unavailable. |
| devShark OG / launch art | High-value | Technical editorial environment without code text; overlay authentic code/text. Deferred. |
| Subject chapter plates | High-value | Implement deterministic lightweight SVG/CSS plates now; optional generated texture variants later. |
| Social square/portrait/landscape campaigns | High-value for launch | Deferred until integration and campaign need exist; compose real product screenshots. |
| Small shared onboarding/empty-state illustration | Potentially useful | Use one reusable family, only where it improves emotion/orientation. |
| Subtle landing background loop | Potentially useful | Reject by default; only with static poster, reduced-motion fallback and measured LCP. |
| Topic-page covers | Potentially useful | Use sparingly for priority editorial topics, never as factual diagrams. |
| Classroom campaign video | Potentially useful | Marketing-only; authentic UI; no role in core bundle. |
| Texture / paper grain | Unnecessary | Existing deterministic SVG grain is tiny, theme-safe and sufficient. |
| Functional icons / subject glyphs | Inappropriate | Keep deterministic SVG and current icon language. |
| Factual maps, equations, anatomy, chess positions, poker hands | Harmful | Generate from verified data or deterministic code only. |
| Fake UI, users, leaderboards, charts, testimonials, classrooms | Harmful | Never generate. |
| Hero video in Quiz, Learn, Play, Profile or `/dev` | Harmful | Core learning state must remain quiet and fast. |

## Acceptance gate for future generation

An asset is accepted only when it solves a named placement problem, has at least three meaningfully different reviewed directions, contains no text/artifacts/logos/factual claims, supports required crops and themes, stays outside core route bundles, has an optimized static fallback, and is recorded in `generated-media-manifest.md`.

