---
description: Render, inspect, and fix one route group across the Shark responsive, locale, theme, keyboard, and accessibility matrix.
argument-hint: <routes-or-area> [--fix] [--document]
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

Run visual and accessibility QA for `$ARGUMENTS` against the real web app.

1. Inspect current changes and trace each route through `client/src/App.tsx`; read its styles, UI primitives, translations, data states, and `docs/design/visual-qa-checklist.md`.
2. Build with `npm run build`. Start the built client with `npm run preview --prefix client` on port 4173; do not substitute fabricated screenshots for real rendering.
3. Exercise relevant routes at 360, 390, 430, 768, 1024, 1280, and 1440 pixels. Cover StudyShark/devShark, EN/CS, light/dark, and reduced motion where the target applies. Use `node scripts/check-responsive.mjs` for its automated overflow probes and browser screenshots/inspection for interaction states.
4. Verify fixed-header/main-scroll behavior, mobile drawer, footer/waterline clearance, wrapping/code blocks, stable answer positions, dialog fit, admin density, media fallback space, and absence of horizontal overflow.
5. Verify keyboard order and arrow-key patterns, visible focus, skip/route focus, accessible names, labels/errors, headings/landmarks, dialog trap/restoration/Escape, live announcements, timer behavior, non-color status, contrast, 44px targets, zoom/reflow, and reduced motion.
6. Reproduce loading, empty, error, offline/reconnect, signed-out/permission, disabled, success, destructive, stale room/session, and long-content states that the route exposes. Use deterministic fixtures or genuine local state, never fake production evidence.
7. If `--fix` is present, fix verified defects with existing primitives/tokens and EN/CS keys, rebuild, and rerun every failed matrix cell. Otherwise return exact `path:line` fixes.
8. Run `npm run test:launch` and `git diff --check`. If `--document` is present, append only executed coverage and residual concrete limitations to `docs/design/visual-qa-checklist.md`.

Report screenshots/conditions inspected, defects fixed, residual severity and WCAG criteria, and exact command outcomes. Static source review and automated overflow checks must be labelled separately from browser validation.
