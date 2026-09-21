---
description: Review and implement product copy for a route or diff, preserving Shark terminology and factual claims.
argument-hint: <route-or-diff-scope> [--fix]
allowed-tools: Read, Grep, Glob, Bash, Edit
---

Review `$ARGUMENTS` in its rendered product context, not as isolated dictionary
text. The app ships English only (`ENABLED_LANGS`); the retained Czech files are
finished work to leave alone, not a parity obligation.

1. Inspect the current diff, trace the route/component in `client/src/App.tsx`, and read every relevant use site plus the matching section of `client/src/i18n/translations.ts`.
2. Read `client/product-catalog.ts`, `docs/product-architecture.md`, and `docs/design/brand-system.md`. Search every changed phrase and legacy `DevQuiz` occurrence so metadata, navigation, dialogs, errors, and historical identifiers are classified correctly.
3. Check exact brand casing; StudyShark/devShark separation; real action-oriented outcomes; free/fair support and cosmetic language; curated-versus-optional-AI hierarchy; honest counts/settings; and button clarity.
4. Reject generic SaaS claims, repeated ocean puns, guilt/urgency, casino framing, and invented metrics, users or legal conclusions.
5. Check interpolation placeholders, heading hierarchy, screen-reader wording, error specificity without secret leakage, and the longest plausible label at the narrowest supported width.
6. If `--fix` is present, edit `translations.ts` and all affected call sites. Reuse an existing key only when its meaning is truly identical; preserve compatibility/storage/database identifiers unless evidence shows they are public copy.
7. Search again for orphaned keys and inconsistent terminology, then run:

   ```sh
   npm run test:launch
   npm run build
   git diff --check
   ```

Report changed keys/call sites, terminology decisions, intentionally retained
legacy identifiers, narrow-layout considerations, and only the checks actually
executed. Update brand documentation only when a reusable voice rule changes.
