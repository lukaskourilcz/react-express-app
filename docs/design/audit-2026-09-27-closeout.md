# Design audit closeout (27–28 Sep 2026)

This closes the pre-launch design audit in `design-audit/` (brief: `design-audit/CLAUDE_CODE_PROMPT.md`). Each of the 25 change IDs has its own GitHub issue (#240–#264, labelled `design-audit` plus `P0`, `P1` or `P2`) and its own commit. The work sits on three stacked branches, one pull request each: `audit/p0` → `main`, `audit/p1` → `audit/p0`, `audit/p2` → `audit/p1`. Merge them in that order. An issue closes when its commit reaches `main`.

## Changes

| ID | Issue | Commit | Deviation from the brief |
|---|---|---|---|
| P0.1 Hide what does not exist yet | #240 | `5e4f670` | `/api/settings` had no redemption flag, so it now publishes `merch.redemptionOpen`: the shop is on and some item has a coin price. No new handler. The merchandise line is filtered on `/premium` too, so the sheet and the page list the same plan. Unpriced and switched-off tiles are left out of the grid. Orphaned `shop.merchClosed` and `landing.compare.none` are deleted. |
| P0.2 Fairness said once | #241 | `93d9066` | None. |
| P0.3 Social profiles | #242 | `35c1e12` | At the owner's request, the footer shows Instagram, Threads and LinkedIn as icon links, not text. Threads uses `@devshark.app`. LinkedIn appears once its URL is in `client/product-catalog.ts`. The `/dev` "Social visit grant" input is removed; the settings field stays so saved settings still parse. The footer rule in `CLAUDE.md`, `docs/product-architecture.md`, `docs/brand/brand-guidelines.md` and the `shark-product-context` skill now includes the social profiles. |
| P0.4 Grading and end-state copy | #243 | `b89cac1` | `roadmap.correct` ("Correct!") matched the new contract too and now reads "Correct". |
| P0.5 Homepage bottom third | #244 | `3d19e87` | None. |
| P0.6 Header for a signed-out visitor | #245 | `0077f7c`, `69ec341` | The brief's desktop rows leave out Career and Collection, so both are drawer-only now. Career stays reachable from the homepage strip and the path links, Collection from Today. The follow-up commit treats a session that is still restoring as signed in, because the first-load browser spec caught the nav jumping when a stored session landed. |
| P0.7 Challenge intro | #246 | `90623c5` | None. |
| P1.1 Watermark fins | #247 | `70602eb` | `--ss-fin` stays: `Today.css` (not read by the audit) still uses it. `SubjectPlate` had no other use and is deleted with its media-manifest row. |
| P1.2 One card recipe | #248 | `0a0e469` | `.ss-raised` wraps an Astryx Card, which paints its own surface and 1px border. It takes `.ss-panel`'s radius, edge and shadow but not the fill, to avoid double borders. `Coding.css`, `Quiz.css`, `Roadmap.css` and `Today.css` also moved off the deleted variables. The hover shadows use `--shadow-med`. |
| P1.3 Rewards page | #249 | `d6d2fd6` | `rewards.earnIntro` is deleted: with no per-row Premium tags it pointed at nothing, and the Premium note under the list says it. The merchandise section loses its own "See what Premium includes" button, so the page keeps one. `CoinIcon` moved to `ui/icons.tsx` for the header. |
| P1.4 Homepage top | #250 | `de08c97` | A signed-in visitor's second CTA also became a text link, so the hero has one `FadeFinCta` in both states. `home.statPaths`, `home.statForever` and `finBg` were unused and are deleted. `.ss-text-links` now styles a `<button>`. |
| P1.5 Profile | #251 | `b0345f2` | The four stat tiles use a 2xl figure so they fit one row inside the career card. The launch contract that required the rotating tip now forbids it. |
| P1.6 Coding home | #252 | `3a213a6` | The algorithms track has no logo, so `CategoryGlyph` draws its accent dot there. The collapsed planner stays open while a run is active or scheduled. A client test covers the collapsed row. |
| P1.7 Quiz result and review | #253 | `63c9105` | The result line lists up to three topics, then "{n} topics" (new `quiz.resultTopics`). Daily and review sets show "Mixed". `quiz.questionN` became unused and is deleted. |
| P1.8 Type and radius tokens | #254 | `2a92429` | Only the files the brief names. 0.95rem maps to `--ss-type-compact`. The Challenge timer badge moved to `--radius-element`. Progress bars and the scrollbar keep 999. |
| P1.9 Dark theme check | #255 | `ad7d3ce` | The axe spec now scans eight dark routes. Light and dark passed with zero violations, so no colour changed. The spec is signed-out only; the signed-in Profile and Coins were not scanned. |
| P1.10 Dead code and copy | #256 | `0c835fd` | The `*Localized` and `sampleOption*` keys are still used by `localizeLandingTopic` and stay. Both `.de-gold-pill` rules are gone. The Coins subtitle mentions merchandise only while redemption is open (`shop.subtitleMerch`), which completes P0.1. |
| P2.1 Leaderboard scope copy | #257 | `d2e80fa` | The optional heading "Most correct answers" is applied; the board ranks by correct answers. The shorter lines no longer say that a Learn question counts once a day or that coding challenges do not count. |
| P2.2 Quiz setup copy | #258 | `a5878a4` | None. |
| P2.3 Coding technique chips | #259 | `e230f48` | None. Verified at 390 and 1280 px. |
| P2.4 Icon consolidation | #260 | `dae5293` | `Roadmap.tsx` also had a trophy copy. It uses the shared icon but keeps its 26px node size. The Coins shield went from 40px to 24px. |
| P2.5 Button consolidation | #261 | `0b7acfa` | `.cd-btn` also lived in Collection, CodePuzzle, DesignRunner, the workbench and the run planner; all moved to Astryx Button. Astryx Button overwrites `aria-disabled`, so the "locked but pressable" controls use a new `ui/LockedButton` that keeps it. Non-primary workbench actions lose the fin hover. Desktop workbench buttons are 32px (touch still gets 44px). The report flag is no longer red. The calendar download stays a native link. |
| P2.6 Ink RGB token | #262 | `4b27588` | The share-card canvas, the QR code and the fin data URI cannot read variables, so they carry `#132019` directly. The editor's light background moved to the brand ink. |
| P2.7 Homepage strip focus ring | #263 | `cbeaae1` | None. |
| P2.8 Dedupe components | #264 | `1e172d6` | `CategoryTag` lives in `components/ui/CategoryTag.tsx`, not in Quiz, so the Challenge does not import the Quiz chunk. |

## Across the pass

- **Czech dictionary.** The brief asked to keep `translations.cs.ts` in sync; `CLAUDE.md` says not to extend it. Deleted keys went from both files. Changed values were updated in Czech where the key already existed. New keys got Czech only where their family already had it. `rewards.earn.*`, `leaderboard.scope*` and the other untranslated families stay English-only, as before.
- **Scope.** No grading, XP, scoring, streak or entitlement logic changed, and `shared/tiers.ts` is untouched. The one server change is P0.3: the social click-through claim now returns `granted: false`. The ledger keeps the `social` reason.
- **Flaky tests.** The client suite hit 5-second timeouts under heavy host load (load average ~46 from other processes). Affected files passed in isolation, and the suite passed with `--maxWorkers=2`. The leaderboard first-draw test failed twice in a full run and passed on every rerun, including on unchanged code.

## Validation (final `audit/p2`, 28 Sep 2026)

| Check | Result |
|---|---|
| `npm run typecheck:api` | pass |
| `npm run test:client` (`--maxWorkers=2`) | 337 passed |
| `npm run test:launch` | pass |
| `npm run build` (with the CI Supabase placeholders) | pass |
| `npm run check:public`, `npm run check:bundle` | pass; 229,332 of 243,000 gzip bytes |
| `npm run check:unused` | no new findings |
| `npm run check:responsive` | 238 probes, 0 issues |
| `npm audit --omit=dev` (root and client) | 0 vulnerabilities |
| Browser specs from CI (public, evolving, segmented, on-accent, navigation, lazy-auth, route-errors, first-load, routes-axe) against `vite preview` in Chrome | 59 passed |
| `git diff --check main..audit/p2` | clean |

`storybook.spec.ts` was not run (needs a Storybook build). Signed-in screens were checked only through unit tests and the mocked-session browser specs, not against a live account.
