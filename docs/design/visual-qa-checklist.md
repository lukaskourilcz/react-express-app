# Visual QA and accessibility checklist

## Matrix

- Widths: 360, 390, 430, 768, 1024, 1280, 1440px.
- Locale: English.
- Themes: light and dark.
- Motion: normal and `prefers-reduced-motion: reduce`.
- Zoom/reflow: 200% and 400% where practical.

## Representative routes and states

- devShark landing, Today and the career roadmap.
- Topic guide, the question of the day (`/daily`) and `/big-o`.
- Quiz setup, active text/code question, submit error, results and two-column review.
- Learn sections (Web Developer, Software Engineer, Forward Deployed Engineer), locked/current/completed level, level lesson and figure, lesson feedback, skill check, missing structure.
- Coding home, a track page, the workbench (editor, results, hints, solution), the narrow-screen puzzle or waiting state, a project's stage list and the FullStack screen.
- The FDE path hub and an activity (lesson, check, code, artifact), with the switch on and off.
- Collection: saved questions and saved coding challenges.
- Challenge intro, active timer, timeout, verified result, unavailable board.
- Play signed out, host/join, room ticket/QR, lobby, live, reconnect/stale, results.
- Profile no-progress/populated/delete failure.
- Leaderboard skeleton/empty/error/populated.
- Flashcards signed out/empty/reveal/remove error.
- Rewards (`/shop`) signed out/loading/error; coins and ledger; crown and streak protection owned/unaffordable/at cap. Merchandise is off (`MERCH_ENABLED`), so no merchandise state shows.
- Premium locks: a Learn node, a coding row and a later stage read "Premium" in text and open the upgrade sheet.
- `/premium` billing off/signed out/free/paying/settings error and the voucher form; `/premium/success` checking/done/pending/expired; `/premium/cancel` both steps; privacy; terms; classroom; 404.
- `/dev` denied, list, question editor, quality, report, logs, settings, destructive action.

## Per-screen checks

1. One visible `h1`, correct landmarks, route title and focus.
2. Primary action is obvious and unique.
3. Loading, empty, error, offline/partial, permission, success and destructive states are distinguishable.
4. Keyboard reaches every control in logical order; radio arrows/Home/End work; Escape and restoration work.
5. Focus remains visible in both themes against the accent.
6. Status is not color-only; timers do not chatter; live updates are purposeful.
7. 44px target goal, readable line lengths, no clipped long copy or code, no hidden horizontal overflow.
8. No content sits under the bottom waterline; answer positions stay stable.
9. Motion freezes without losing state; fins meet their container baseline.
10. Media has intrinsic dimensions, correct crop, alt classification, static fallback and no generated defects.

## Automated contract

- `npm run ci:parity` (the CI `verify` job; `--fast` skips the browser specs)
- `npm run typecheck:api`
- `npm run test:launch`
- `npm run build`
- `npm run check:responsive` against a running build preview
- `git diff --check`
- Root and client production dependency audits

The responsive harness reports viewport overflow, escaping children, missing route headings and browser console errors. Screenshots are artifacts for failed probes or explicit review runs, not committed production data.
