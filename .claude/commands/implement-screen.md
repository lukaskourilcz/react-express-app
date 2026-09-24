---
description: Implement or refine one screen end to end with Deep End components, complete states, English copy, and validation.
argument-hint: <route-or-component> <desired-outcome> [--commit]
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

Implement `$ARGUMENTS` in the existing application rather than creating a parallel example.

1. Inspect `git status --short`, `git diff`, route ownership in `client/src/App.tsx`, the full current component/styles, its data flow, and relevant translation keys. Preserve unrelated edits.
2. Read `docs/product-architecture.md`, `DESIGN_RULES.md`, `docs/design/design-system.md`, `client/src/styles/astryx-theme.css`, and `client/src/styles/app-shell.css`.
3. Search before creating: Astryx imports, `client/src/components/ui/`, `client/src/components/SharkFin.tsx`, `client/src/components/landing/LandingKit.tsx`, shared dialogs/toasts, registries, hooks, and sibling route patterns.
4. Write a short implementation intent covering user goal, primary action, product/subject scope, reuse, changed states, responsive transformations, and accessibility behavior.
5. Implement the complete in-scope flow. Use Astryx and semantic tokens; keep the accent, counts, and URLs in their registries; preserve the footer's legal links and appearance and sound controls, the fixed shell, answer integrity, free/fair learning, and the 12-handler limit. Add every new user-visible string to `client/src/i18n/translations.ts`; the app ships English only.
6. Handle relevant loading, delayed, empty, error, partial/offline, auth/permission, disabled, success, destructive, stale-session, long-content, and narrow-screen states. Preserve focus and keyboard behavior, stable quiz options, non-color status, 44px targets, and reduced motion.
7. Review the diff for duplicate abstractions, hard-coded accent hexes/URLs/counts, stale public DevQuiz copy, English literals that bypass `translations.ts`, card nesting, mixed icons, and references to another product. Update existing design documentation only if a reusable contract changed.
8. Run focused checks, then execute:

   ```sh
   npm run typecheck:api
   npm run test:launch
   npm run build
   git diff --check
   ```

9. For visual changes, render the affected route in light/dark at the breakpoint matrix. Use `npm run preview --prefix client` and `node scripts/check-responsive.mjs` where applicable; never claim unexecuted matrix cells.
10. Report files, reused/refactored components, states added, and exact validation results. If `--commit` is present and all relevant checks pass, stage only this coherent scope and create one imperative commit; otherwise leave it uncommitted.
