# Design review 2 closeout (28 Sep 2026)

This closes the second design review. Its 37 change IDs each have an issue (#270–#306, labelled `design-review-2` plus `P0`, `P1` or `P2`) and a commit on `main`. The bands merged in order: P0 in #309, P1 in #311, P2 in #313. Round one's record is `docs/design/audit-2026-09-27-closeout.md`. The review pages and the brief (`design-audit-2/`) were removed in the cleanup that followed and remain in Git history.

## Screenshot evidence

Nine items were marked "not verified" in the review. They were checked before being changed, with a Playwright harness against a `vite preview` build: Chrome, a fake signed-in session and fixture API responses. The screenshots and the measurements behind each verdict are on the `review2-evidence` branch (`before/` and `after/`), linked from each issue. Eight were reproduced as described. P1.9 was reproduced as a different layout problem: the tiles wrapped three plus one, and no figure overflowed. P2.8 was reproduced from the screenshot (the repeated "Correct" label), not from an overflow measurement.

## Changes

| ID | Issue | Commit | Deviation from the brief |
|---|---|---|---|
| R2-P0.1 GitHub garden cells | #270 | `d6e0d0a` | None. |
| R2-P1.1 Leaderboard header | #271 | `e5670da` | As the brief says, this reverses the optional half of R1 P2.1; the unit and storybook specs assert the new h1. |
| R2-P1.2 Period control row | #272 | `d9cfe5e` | None. |
| R2-P1.3 Rank discs | #273 | `b6c9082` | None. |
| R2-P1.4 Row density | #274 | `460866c` | None. |
| R2-P1.5 Keep the board while loading | #275 | `e1c9e03` | The previous board is drawn with the tab it came from, because each tab's rows have another shape. It is never cached under the new tab's key. |
| R2-P1.6 Identity ellipsis | #276 | `66da2d7` | None. |
| R2-P1.7 Streak tiles | #277 | `51737e6` | None. |
| R2-P1.8 Career card row | #278 | `0f11d76` | The row also wraps, and the rank title may take two lines. With min-width 0 alone the title shrank to "Junior…" at 360px. |
| R2-P1.9 Stat tiles | #279 | `54e3777` | Capped at two columns (a 2×2 grid). The brief's four-column minimum wrapped three plus one in the 432px column. |
| R2-P1.10 Path kind slot | #280 | `b37662c` | The shorter kind labels also show on the path pages and as Today's path-resume heading. |
| R2-P1.11 Path state slot | #281 | `3a34f54` | None. |
| R2-P1.12 Card stock | #282 | `70820d7` | None. |
| R2-P1.13 Learn end states | #283 | `d5b33be` | None. |
| R2-P1.14 Stale names | #284 | `e9a4c92` | None. |
| R2-P1.15 Duplicated facts | #285 | `83930fe` | `today.subtitle` stays: the homepage strip still uses it. Only its render on /today went. |
| R2-P1.16 Dead or contradicting keys | #286 | `65a8305` | None; `lib/shop.ts` did not read the shop item keys. |
| R2-P1.17 Home hero | #287 | `17048f5` | None. |
| R2-P1.18 Route loader tips | #288 | `10aefa8` | None. |
| R2-P1.19 Relaxed pace, New rank | #289 | `8ade81b` | None. |
| R2-P1.20 Today-tab empty CTA | #290 | `ea27251` | None. |
| R2-P1.21 Paths card inventory | #291 | `db4b8e3` | None. |
| R2-P2.1 Shared select | #292 | `ef37b79` | None. |
| R2-P2.2 Score type | #293 | `6c48a6b` | None. |
| R2-P2.3 Shared tag | #294 | `0e1e72d` | None. |
| R2-P2.4 Offline Banner | #295 | `d430f46` | None. |
| R2-P2.5 Empty state row | #296 | `8085da2` | None. |
| R2-P2.6 Page gap | #297 | `fd6f572` | None. |
| R2-P2.7 One visually-hidden utility | #298 | `27b6d84` | None. |
| R2-P2.8 Phone rows | #299 | `03aaebf` | None. |
| R2-P2.9 Plan line skeleton height | #300 | `4dea110` | None. |
| R2-P2.10 Plan line grid | #301 | `21b58dc` | None. |
| R2-P2.11 GitHub card buttons | #302 | `cad9533` | `.ss-link-button` stays: the Curation page still uses it. |
| R2-P2.12 Friends and paths buttons | #303 | `eb6d39f` | None. All 37 buttons moved. |
| R2-P2.13 Friends loading | #304 | `3f537f1` | None. |
| R2-P2.14 Dead CSS | #305 | `684f651` | `.ss-link-button` stays (see P2.11). |
| R2-P2.15 Copy P2 batch | #306 | `b042e61`, `82ddcae`, `bab7f0e`, `a4ea6c9`, `b1e32b8`, `864107b` | Six commits, one per family. The `today.reason*` keys are still rendered, so they stay (the brief's verify rule). Two reworded keys with no reader were deleted instead. `advisor.focus.*` stays because `lib/advisor.ts` reads it. |

## Across the round

- **Protected behaviour.** Grading, XP, scores, streaks, ranks, entitlements and `shared/tiers.ts` are untouched.
- **Czech.** Deleted keys went from both dictionaries. Changed values updated Czech only where the key already existed, and no Czech key was added.
- **Worktree.** The work ran in a separate git worktree, stacked on `main` as each band merged, so the parallel launch work in the main checkout stayed untouched.
- **Test load.** The client suite timed out under heavy host load (load average up to about 38 from other projects). Every push ran after a clean run, with one worker and a 30-second timeout when needed.

## Validation (final `review2/p2`)

| Check | Result |
|---|---|
| `npm run typecheck:api` | pass |
| `npm run test:client` | 362 passed |
| `npm run test:launch` | pass |
| `npm run build` | pass |
| `npm run check:responsive` | pass |
| `npm run check:unused` | no new findings |
| Browser specs from CI (public, evolving, segmented, on-accent, navigation, lazy-auth, route-errors, first-load, routes-axe) against a preview built with the CI Supabase placeholders | 59 passed |
| GitHub `verify` workflow on #309 and #311 | pass |
