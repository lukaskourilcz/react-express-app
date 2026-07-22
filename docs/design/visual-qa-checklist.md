# Visual QA and accessibility checklist

## Matrix

- Widths: 360, 390, 430, 768, 1024, 1280, 1440px.
- Products: StudyShark and devShark.
- StudyShark subjects: geography, math, history, biology, chess, poker.
- Locales: English and Czech.
- Themes: light and dark.
- Motion: normal and `prefers-reduced-motion: reduce`.
- Zoom/reflow: 200% and 400% where practical.

## Representative routes and states

- StudyShark picker and selected subject preview.
- devShark landing and career roadmap.
- Subject home and topic landing.
- Quiz setup, active text/code question, submit error, results and two-column review.
- Learn overview, locked/current/completed level, lesson feedback, skill check, missing structure.
- Challenge intro, active timer, timeout, verified result, unavailable board.
- Play signed out, host/join, room ticket/QR, lobby, live, reconnect/stale, results.
- Profile no-progress/populated/delete failure.
- Leaderboard skeleton/empty/error/populated.
- Flashcards signed out/empty/reveal/remove error.
- Shop owned/equipped/unaffordable.
- Support disabled/unconfigured/configured; privacy; terms; classroom; 404.
- `/dev` denied, list, bilingual editor, quality, report, logs, settings, destructive action.

## Per-screen checks

1. One visible `h1`, correct landmarks, route title and focus.
2. Primary action is obvious and unique.
3. Loading, empty, error, offline/partial, permission, success and destructive states are distinguishable.
4. Keyboard reaches every control in logical order; radio arrows/Home/End work; Escape and restoration work.
5. Focus remains visible in both themes and every subject accent.
6. Status is not color-only; timers do not chatter; live updates are purposeful.
7. 44px target goal, readable line lengths, no clipped Czech or code, no hidden horizontal overflow.
8. No content sits under the bottom waterline; answer positions stay stable.
9. Motion freezes without losing state; fins meet their container baseline.
10. Media has intrinsic dimensions, correct crop, alt classification, static fallback and no generated defects.

## Automated contract

- `npm run typecheck:api`
- `npm run test:launch`
- `npm run build`
- `npm run test:responsive` when a browser is available
- `git diff --check`
- Root and client production dependency audits

The responsive harness reports viewport overflow, escaping children, missing route headings and browser console errors. Screenshots are artifacts for failed probes or explicit review runs, not committed production data.

