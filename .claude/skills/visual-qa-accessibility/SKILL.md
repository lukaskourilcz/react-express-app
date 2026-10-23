---
name: visual-qa-accessibility
description: Validate devShark routes across responsive widths, themes, keyboard, focus, reduced motion, state handling, and WCAG-oriented behavior. Use after UI changes or for a focused visual/accessibility review.
---

# Visual QA and Accessibility

Read `docs/design/visual-qa-checklist.md` and inspect real rendered behavior when available.

## Matrix

- Widths: 360, 390, 430, 768, 1024, 1280, and 1440.
- Presentation: light, dark, reduced motion, zoom/reflow. devShark ships English only, with no second language, translation overlay or language switch, so the matrix has no language axis.
- States: loading, empty, error, offline/reconnect, auth/permission, disabled, success, destructive, stale/expired, long content.

## Checks

- Keyboard order and expected arrow-key patterns.
- Visible focus, route focus, skip link, dialog/drawer trap, Escape, and restoration.
- Names, labels, descriptions, errors, headings, landmarks, live status, timers, and answer state.
- Focus after a change: when a pressed control disables or is replaced (Submit, Next on the last step, an answer at time up), focus moves to the nearest working control or the verdict, never to the page. A live region exists before its text changes; one mounted with its words is not announced. A destructive action (Reset, Remove friend) asks first and returns focus to its opener or the list heading.
- Non-color success/error/ranking cues, contrast, 44px targets, 400% reflow where practical.
- No horizontal overflow, clipped code/options, unstable answers, hidden waterline content, broken media crops, or decorative motion in dense flows.

Build and serve the real client, then use `npm run check:responsive` plus browser interaction for the requested scope. In the Claude Code cloud environment set `CHROME_BIN=/opt/pw-browsers/chromium`: the browser is preinstalled there and `npx playwright install` is disabled. Screenshots use real data or deterministic fixtures and stay outside tracked source unless intentionally approved. Report executed matrix cells separately from static findings; never label static inspection as browser validation.
