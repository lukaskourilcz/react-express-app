# Generated media manifest

The share image's background is the one generated asset in the product, accepted on 12 October 2026 after three reviewed directions; its provenance is below. Every other brand asset is deterministic.

## Current brand assets

| Asset ID | Purpose | Source | Paths | Provenance / restrictions |
|---|---|---|---|---|
| `fin-mark` | Favicon and brand mark | Owner's V9 brand kit, deterministic SVG | `client/public/brand/v9/`, `client/public/favicon.svg`, `client/public/favicon-white.svg`, `client/public/favicon.ico`, `client/src/components/SharkFin.tsx`, `client/src/components/BrandLogo.tsx` | No generation; the fin geometry is copied from the kit, never redrawn. |
| `pwa-icons` | Install icons | V9 kit `favicon/app-icon-*.png` | `client/public/icon.svg`, `client/public/icon-192.png`, `client/public/icon-512.png`, `client/public/apple-touch-icon.png` | White clean fin on the green tile; the platform adds the corner radius. |
| `og-share` | Product share image | `scripts/render-og-image.mjs`, approved October navbar outlines and accepted Higgsfield background | `client/public/og-image.png` | 1200×630 raster; exact vector logo over generated art. See accepted record below. |
| `paper-grain` | Tactile surface | Inline deterministic SVG turbulence | `client/src/styles/astryx-theme.css` | Decorative, tiny, theme-safe. |

## Accepted generated asset record format

Every accepted entry must include: asset ID, purpose, product, subject, placement, provider, model/version, dated official pricing/license/privacy sources, workflow/tool, complete prompt, negative prompt, references, three reviewed variants, selected variant, rejection reasons, dimensions/crops, output paths, optimization, alt classification, motion poster/fallback, provenance, usage restrictions, and exact regeneration steps. API credentials are never recorded.

## Accepted OG refresh — 12 October 2026

Asset `og-share-20261012`, devShark/webdev, public social preview only. Provider Higgsfield; model `seedream_v4_5` / Seedream 4.5, Basic, original 2560×1440 PNG. Actual workflow: existing Plus account in Chrome extension; selected 2K, 16:9, count 1, Unlimited on and submit button Unlimited for each of three distinct jobs. Reference uploaded with the standard native file picker after extension file-URL upload was unavailable; no extension permissions, plan, purchases or automatic refill changed. Only the public approved logo and design prompt were uploaded. Same logo reference media `12ac1e98-1763-4940-805f-21225fb90bd1`; reconstructed from the exact navbar wordmark outlines and shared fin/wave paths, not AI-generated.

Credits before/after all three jobs: 699 / 699. Actual new OG consumption: **0 credits**, three Unlimited generations, no retries. Earlier task-wide ceiling remains 150 credits; this work adds zero. The connector's expired trial Unlimited is separate from the website allowance.

Official pricing, commercial rights, privacy/training/retention and model sources, dated 12 October 2026: see the three-provider comparison in `generated-media-opportunity-audit.md`. Higgsfield commercial outputs are permitted but not exclusive; inputs/outputs may be used for model improvement. Preserve any original provenance; do not claim the raster output is a vector. No visible watermark, external marks, generated letters, people, fake UI, code, charts or factual claims were found in the selected image.

| Direction | Completed job | Review |
|---|---|---|
| System bathymetry | `05318249-6967-4c39-9c9c-2fae0d1eb306` | Rejected after full-size inspection: dense fine contours and node-like linework become noisy in small previews and resemble an unexplained technical diagram. |
| Build ledger | `b23e1322-f912-4cbd-9def-7b6920ddc19c` | Rejected after full-size inspection: overly symmetrical green blocks, tape and shadows make it feel like a notebook mockup instead of a clear brand plate. |
| Architecture current | `36be7a32-7809-4350-9bfe-b0e0b8df65ed` | Selected after full-size inspection: broad green edge curves give strong recognition and keep the logo/caption region pale, clean and spacious. No extra generation needed. |

Selected original: https://d8j0ntlcm91z4.cloudfront.net/user_3Gr5XDBYP3nOykW6VGpibIjFyug/hf_20261012_175149_36be7a32-7809-4350-9bfe-b0e0b8df65ed.png . Completed state/model/URL also checked through `jobs_wait`. Only the selected image was downloaded; rejected generations remain outside Git.

Production background: `client/public/brand/og/architecture-current.webp`, quality 88, metadata preserved, approximately 89 KiB. Final: `client/public/og-image.png`, 1200×630, approximately 398 KiB, PNG for share crawler compatibility. `scripts/render-og-image.mjs` embeds the WebP, exact SVG fin/wordmark and the existing Manrope font in a deterministic browser render. Caption: "Lessons · Quizzes · Coding challenges"; URL: "devShark.app". Logo colors are exactly #2D7A2D / #132019; no generative lettering, counts, prices or invented UI. The fin tip and wave bottom use the same bounds as `BrandLogo.tsx`.

The image is a fixed static OG resource in either app theme, has no motion, no page layout shift and is not imported into any learning/profile bundle. Light/dark share environments use the same legible paper card. Informative `og:image:alt` names the product and learning activities. Existing product URL configuration resolves the absolute share image; its version query refreshes old cached previews. Deterministic task/daily cards keep factual catalog text and use `client/public/brand/approved/navbar-logo-ink.svg` from the same approved lockup.

Regeneration: restore the selected WebP; run `node scripts/render-og-image.mjs` for the production PNG, or `--reference --out /absolute/reference.png` for an authorized future reference. `--logo-svg --out client/public/brand/approved/navbar-logo-ink.svg` exports the deterministic lockup. An unavailable provider does not block the build: committed static assets are the fallback. Future new generations require fresh model/Unlimited cost verification and the remaining owner-authorized budget.

Complete prompts (negative constraints are included verbatim):

### System bathymetry

Create only a decorative background for the devShark website share image, landscape 16:9. Reference image is the real brand identity, use its palette and restrained bold visual character only; do not reproduce its lettering or logo. System bathymetry direction: off-white #F3F6F1 matte editorial field, fine green #2D7A2D cartographic contour lines clustered at the top-right and bottom-left edges, subtle abstract architectural nodes integrated into the contour rhythm, ink #132019 sparingly. Flat, rigorous, spacious, crisp, original graphic composition. Leave the entire middle 70% width and central 55% height clean pale paper for an exact logo and caption added later. No text, letters, numbers, code, equations, logos, watermarks, interface, screenshots, charts, data, people, sharks, new fins, robots, gradients, glow, neon, glossy 3D, stock technology art, lens flare, particles or clutter. No frame or mockup.

### Build ledger

Create only a decorative background for the devShark website share image, landscape 16:9. Reference is the real brand identity: use palette and quiet heavy editorial character only, no lettering or logo reproduction. Build ledger direction: flat pale #F3F6F1 engineering notebook collage, two large matte forest-green #2D7A2D rectangular paper modules cropped into the extreme left and right corners, precise thin ink #132019 rules and a few empty cut paper tabs along the outer edges, slight natural paper imperfections, no shadows or perspective. Bold modular asymmetry, generous whitespace. Middle 70% width and central 55% height must remain clear pale space for the exact logo and caption added later. No text, letters, numbers, code, equations, labels, logos, watermarks, interface, screenshots, charts, data, people, sharks, new fins, robots, gradients, glow, neon, glossy 3D, stock technology imagery, particles or clutter. No frame or mockup.

### Architecture current

Create only a decorative background for the devShark website share image, landscape 16:9. Reference is the real brand identity, use its palette and calm bold editorial character only, do not reproduce any lettering or logo. Architecture current direction: one continuous broad angular forest-green #2D7A2D paper ribbon sweeping around the bottom-right edge of a pale #F3F6F1 canvas, restrained thin ink #132019 parallel current lines at the top-left corner. Original abstract modular flow, flat print artwork, meticulous geometric rhythm with a small organic bend, no shadows, enormous breathing room. Entire middle 70% width and central 55% height stays clean pale for exact logo and caption added later. No text, letters, numbers, code, equations, logos, watermarks, interface, screenshots, factual diagrams, charts, data, people, sharks, new fins, robots, gradients, neon, glow, glossy 3D, technology stock art, lens flare, particles or clutter. No frame or mockup.

Reviewed deterministic campaign crops (no further AI generation): square 1080×1080 / 367,523 bytes and portrait 1080×1920 / 427,020 bytes, same exact logo and caption with crop-safe placement. Originals are in the owner's existing Drive folder as `devShark-OG-20261012-square.png` and `devShark-OG-20261012-portrait.png`; these optional social files are not loaded by the app. A dark 1200×630 renderer preview was also inspected; production sharing uses the fixed light card. Drive readback verified the main PNG (407,658 bytes) and both crop files in folder `1dPuabOcU_eAECMsY3rJNG9itw9bQ3Hip` without changing sharing.
