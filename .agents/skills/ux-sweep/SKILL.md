---
name: ux-sweep
description: Run a focused UX + accessibility + frontend-performance sweep on the devShark web app. Use when the user asks to "improve UX", "make it feel better", "polish the app", or "audit the frontend". Lighter than full-app-audit — only the three user-facing lenses.
---

# UX sweep

## Steps

1. **Spawn three agents in parallel:**

   - `ux-reviewer` — "Audit all components in `client/src/components/`. Cover loading/empty/error states, widths 360–1440, interaction states, microcopy, Astryx/Deep End consistency (DESIGN_RULES.md)."
   - `accessibility-auditor` — "Audit WCAG 2.1 AA across all components and routes. Special attention: icon-only `AxIconButton`s in `client/src/App.tsx` (menu, leaderboard, Premium and shop) need accessible names; quiz answer choices need fieldset/legend; route-change focus management."
   - `performance-optimizer` — "Audit frontend perf. Special attention: confirm Prism Light stays lazy, route chunks stay split, and `npm run check:bundle` stays within budget."

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
