---
description: Find and safely consolidate duplicated components, registries, tokens, layouts, dialogs, and helpers in a scoped area.
argument-hint: <directory-or-screen-group> [--fix]
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

Audit reuse in `$ARGUMENTS` with behavior preservation as the primary constraint.

1. Inspect current Git changes and inventory the target's components, hooks, utilities, types, CSS selectors, inline styles, dialogs, state messages, translation keys, and tests.
2. Search outward before classifying duplication:
   - product/brand data: `client/product-catalog.ts`, `client/src/lib/products.ts`
   - subject ownership/presentation: `shared/subject-catalog.ts`, `client/src/lib/subjects.ts`
   - UI: `client/src/components/ui/`, `client/src/components/SharkFin.tsx`, `client/src/components/landing/LandingKit.tsx`
   - tokens/layout: `client/src/styles/astryx-theme.css`, `client/src/styles/app-shell.css`, `client/src/components/DeepEndScreens.css`
   - state/data: `client/src/lib/`, existing query/API helpers, and `client/src/i18n/`
3. Classify each candidate as intentional specialization, safe composition, safe generalization, or risky coupling. Cite exact paths and callers. Do not centralize unique art direction merely for purity.
4. Prioritize removal of duplicate brand arrays, subject arrays, URL maps, count literals, dialog/toast/icon/motion/localization systems, semantic colors, loading/error patterns, and nearly identical layout components.
5. If `--fix` is present, make the smallest safe refactor: extend the most authoritative existing abstraction, migrate all in-scope callers, preserve exports/compatibility where needed, and remove code only after verifying it is unused. Keep EN/CS and all product/subject behavior identical.
6. Trace any changed data flow through its existing API handler and tests. Confirm no answer key, score, XP, admin, auth, product, or subject authority moved to the browser.
7. Run focused searches for leftover callers, then:

   ```sh
   npm run typecheck:api
   npm run test:launch
   npm run build
   git diff --check
   ```

8. Document a changed reusable contract in the existing `docs/design/design-system.md`, `DESIGN_RULES.md`, or `docs/product-architecture.md` only when necessary. Report consolidations, intentionally retained differences, bundle/runtime implications, and exact validation results. Do not commit unless requested.
