---
name: shark-release-validation
description: Run the StudyShark/devShark release contract after implementation. Use before commits, handoff, deployment, or when checking scope, security, tests, builds, dependencies, documentation, and Git state.
---

# Shark Release Validation

1. Inspect branch, status, unstaged/staged diffs, and recent commit style. Separate pre-existing work.
2. Confirm exactly 12 `api/**/*.ts` handlers and no native app.
3. Search for public DevQuiz copy, product relationship errors, duplicate registries/URLs/counts/colors, EN-only UI, unsafe client answers/scores/XP, paid learning advantages, heavy global media, and motion without reduced-motion handling.
4. Run the actual project contract:

   ```sh
   npm run typecheck:api
   npm run test:launch
   npm run build
   npm audit --omit=dev
   npm audit --omit=dev --prefix client
   git diff --check
   ```

5. For visual work, run the real preview/browser matrix and `npm run check:responsive` over touched routes.
6. Fix introduced failures, rerun dependent checks, and remove only temporary files created by the validation.
7. Reconcile README, `DESIGN_RULES.md`, `docs/product-architecture.md`, design docs, and agent instructions with implementation.
8. Stage coherent scopes only. Do not stage unrelated untracked `.agents` or `.codex` work.

Report pass/fail/not-run exactly. Include 12-handler count, actual visual cells, audits, final status, intended commits, unrelated changes, and concrete limitations. Never claim external configuration, legal review, backups, support, AI, or deployment actions without verification.
