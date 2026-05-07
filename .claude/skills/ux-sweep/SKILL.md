---
name: ux-sweep
description: Run a focused UX + accessibility + frontend-performance sweep on the quiz app. Use when the user asks to "improve UX", "make it feel better", "polish the app", or "audit the frontend". Lighter than full-app-audit — only the three user-facing lenses.
---

# UX sweep

## Steps

1. **Spawn three agents in parallel:**

   - `ux-reviewer` — "Audit all components in `client/src/components/`. Cover loading/empty/error states, mobile (`maxWidth: 500px`), interaction states, microcopy, MUI consistency."
   - `accessibility-auditor` — "Audit WCAG 2.1 AA across all components and routes. Special attention: icon-only `IconButton`s in `App.tsx` (Instagram/GitHub) need `aria-label`; quiz answer choices need fieldset/legend; route-change focus management."
   - `performance-optimizer` — "Audit frontend perf. Special attention: `react-syntax-highlighter` (~1MB+) — should be lazy-loaded only when a code block renders; route-level code splitting for Quiz/Profile; Vite `manualChunks` for vendor caching."

2. **Merge into one report:**

   ```
   # UX Sweep — <date>

   ## Top 3 wins (do these first)
   1. ...

   ## Critical
   ...

   ## Important
   ...

   ## Polish
   ...

   ## Strengths to keep
   ...
   ```

3. **Ask which items to implement.** Do not auto-edit.

## Notes

- Read-only sweep. No edits.
- If the dev server isn't running, do not start it — agents work from source.
