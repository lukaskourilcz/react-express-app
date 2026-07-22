# Higgsfield opportunity audit

Audit date: 22 July 2026.

## Live capability result

The Higgsfield MCP is connected and its live tool catalog was verified on 22 July 2026. Workspace discovery, workspace selection, balance lookup, model discovery, model recommendation and generation-cost preflight all respond. The selected private workspace reports the Plus plan and 10 credits.

Production generation is nevertheless blocked by account state: the workspace is in an active trial and the image backends reject MCP submissions. `recraft_v4_1` and `z_image` return `only_website_usage_on_trial_is_available`; `soul_location` returns a generic provider failure. Selecting the workspace explicitly and retrying did not change the result. No output job was created, no credit was consumed, and no generated asset is claimed. Exact attempts and request IDs are recorded in `generated-media-manifest.md`.

The next generation run requires a paid, non-trial workspace that permits MCP generation. Agents must not buy a plan, enable auto-refill or change billing without explicit owner authorization. Until then, keep deterministic SVG marks, CSS/SVG subject plates and authentic interface captures; do not replace the blocked assets with another generator or a fake placeholder.

## Opportunity classification

| Candidate | Classification | Decision |
|---|---|---|
| Family fin/waterline logo, favicon, PWA icons | High-value, but deterministic | Refine existing SVG primitives; do not ship a raw raster-generated logo. |
| StudyShark OG / launch art | High-value | Generate editorial environment only; overlay real brand text deterministically. Accepted brief; blocked by trial-only MCP access. |
| devShark OG / launch art | High-value | Technical editorial environment without code text; overlay authentic code/text. Accepted brief; blocked by trial-only MCP access. |
| Subject chapter plates | High-value | Implement deterministic lightweight SVG/CSS plates now; optional generated texture variants later. |
| Social square/portrait/landscape campaigns | High-value for launch | Produce from the selected product directions; compose real product screenshots and real EN/CS text deterministically. Blocked with the parent stills. |
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

The current solid-green `client/public/og-image.png` is a temporary deterministic fallback, not accepted launch art. Replace it only when both product variants exist and the Vite metadata pipeline can point each deployment at a real committed file.
