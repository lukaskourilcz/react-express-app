---
name: shark-release-validation
description: Run the devShark release contract after implementation. Use before commits, handoff, deployment, or when checking scope, security, tests, builds, dependencies, documentation, and Git state.
---

# Shark Release Validation

1. Inspect branch, status, unstaged/staged diffs, and recent commit style. Separate pre-existing work.
2. Confirm exactly 12 `api/**/*.ts` handlers and no native app.
3. Search for public DevQuiz copy, references or links to another product, duplicate registries/URLs/counts/colors, user-visible strings that bypass `translations.ts`, unsafe client answers/scores/XP, paid learning advantages, heavy global media, and motion without reduced-motion handling.
4. Run the `verify` CI job locally: `npm run ci:parity -- --fast` while you iterate, and the full `npm run ci:parity` before a pull request that touches the client, routes or browser-covered behaviour. It runs the 53 steps of `.github/workflows/quality.yml` in order with the CI environment; `.claude/skills/ci-parity-and-pr/SKILL.md` lists them. The six commands below are a quick inner loop, not the release contract: PR #401 passed them and still failed `check:bundle` in CI.

   ```sh
   npm run typecheck:api
   npm run test:launch
   npm run build
   npm audit --omit=dev
   npm audit --omit=dev --prefix client
   git diff --check
   ```

5. For visual work, also run `npm run check:responsive -- --routes <touched routes>` against the preview and the browser specs that cover them.
6. Fix introduced failures, rerun dependent checks, and remove only temporary files created by the validation.
7. Reconcile README, `DESIGN_RULES.md`, `docs/product-architecture.md`, design docs, and agent instructions with implementation.
8. Stage coherent scopes only. Do not stage unrelated `.agents` or `.codex` changes.

Merge through a pull request with `verify` and `sql` green (`/pr-merge`). Report pass/fail/not-run exactly. Include 12-handler count, actual visual cells, audits, final status, intended commits, unrelated changes, and concrete limitations. Never claim external configuration, legal review, backups, support, or deployment actions without verification.
