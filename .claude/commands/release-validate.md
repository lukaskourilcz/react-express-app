---
description: Run the Shark release contract, fix introduced failures, and report the exact product, security, build, dependency, visual, and Git state.
argument-hint: [scope-or-commit-range] [--fix]
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

Validate `$ARGUMENTS` as a release candidate. Do not turn command failures into a checklist-only report when they can be fixed safely.

1. Inspect `git branch --show-current`, `git status --short`, `git diff`, `git diff --staged`, and the requested commit range. Identify pre-existing/unrelated work before touching anything.
2. Read `package.json`, `client/package.json`, `docs/product-architecture.md`, `docs/launch-runbook.md`, and `docs/design/visual-qa-checklist.md`; use current scripts rather than assumed lint/test commands.
3. Confirm exactly 12 physical TypeScript handlers under `api/`. Search the diff/repository for public DevQuiz copy, duplicated brand/subject arrays, `webdev` in StudyShark discovery, hard-coded public product URLs/counts/subject colors, missing devShark footer behavior, EN-only UI, unsafe client answers/scores/XP, native app code, heavy global media, and motion without reduced-motion handling.
4. Run the release commands independently and preserve their exact results:

   ```sh
   npm run typecheck:api
   npm run test:launch
   npm run build
   npm audit --omit=dev
   npm audit --omit=dev --prefix client
   git diff --check
   ```

5. When UI changed, build/serve the client and run relevant real-browser and `scripts/check-responsive.mjs` coverage. Check both products, every touched subject accent, EN/CS, light/dark, reduced motion, and representative widths. When API/security code changed, trace authorization, schema validation, product/subject scope, rate limits, safe errors, and answer secrecy through the existing handler.
6. If `--fix` is present, fix failures caused by the scoped work, rerun the failing check, then rerun dependent release checks. Never edit applied migrations to make a check pass; add a forward migration only when genuinely required.
7. Reinspect status and documentation consistency. Remove only temporary files created by this run; do not reset, checkout, stash, or overwrite unrelated work.
8. Return a release report listing pass/fail/not-run for each command, visual/accessibility matrix actually covered, 12-handler count, critical flow evidence, dependency findings, residual concrete limitations, intended tracked changes, and unrelated pre-existing changes.

Do not report a pass for a command or browser state that was not executed successfully. Do not deploy, push, enable support/AI, or claim owner-controlled production work unless explicitly requested and verified.
