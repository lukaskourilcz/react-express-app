# Higgsfield opportunity audit

Audit date: 22 July 2026.

## Live capability result

The Higgsfield MCP is connected and its live tool catalog was verified on 22 July 2026. Workspace discovery, workspace selection, balance lookup, model discovery, model recommendation and generation-cost preflight all respond. The selected private workspace reports the Plus plan and 10 credits.

Production generation is nevertheless blocked by account state: the workspace is in an active trial and the image backends reject MCP submissions. `recraft_v4_1` and `z_image` return `only_website_usage_on_trial_is_available`; `soul_location` returns a generic provider failure. Selecting the workspace explicitly and retrying did not change the result. No output job was created, no credit was consumed, and no generated asset is claimed. Exact attempts and request IDs are recorded in `generated-media-manifest.md`.

The next agent must not treat a paid Higgsfield upgrade as the only path. Because pricing, free tiers, licenses and model availability change frequently, it must browse current official sources and compare at least three cheap or free image-generation services before deciding whether to wait for Higgsfield, use an alternative, or ask the owner to generate manually on a website. Agents must not buy a plan, create an external account, accept paid terms, enable auto-refill, expose credentials or upload sensitive material without explicit owner authorization. Keep deterministic SVG marks, CSS/SVG subject plates and authentic interface captures regardless of provider; never use a fake placeholder.

## Mandatory alternative-provider research

Update this section with a dated comparison before the next generation attempt. Use official provider pricing, terms/license, privacy/data-use, retention/training and model documentation; do not rely on affiliate roundups or stale remembered pricing.

Compare at least three providers on:

- genuinely free allowance or estimated cost for six review images plus two finals;
- commercial-use and redistribution rights for generated outputs;
- whether prompts/uploads may be retained or used for training, and available opt-outs;
- account, credit-card and regional requirements;
- watermarking and original-file export;
- 16:9 and 9:16 support, output resolution, upscale/outpaint support and file formats;
- style adherence, no-text reliability and reference-image support;
- website-only, API, MCP or automation availability;
- provenance information that can be recorded in the media manifest.

Prefer a no-card free tier or low capped cost with clear commercial rights and clean original exports. If the best option requires manual website use, give the owner exact prompts and filenames, then inspect the uploaded originals. A free service is not acceptable when its license, privacy posture, watermark or output quality conflicts with the product.

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
