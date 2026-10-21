---
description: Run the `verify` CI job locally in workflow order and report each step's real result.
argument-hint: [--fast] [--sql] [--only step,step] [--bail]
allowed-tools: Read, Grep, Glob, Bash
---

Reproduce the `verify` job of `.github/workflows/quality.yml` for the current branch with `$ARGUMENTS`. Follow `.claude/skills/ci-parity-and-pr/SKILL.md`.

1. Check `git status --short` and `git rev-parse HEAD`. CI sees only committed files: if the tree is dirty, say so, and ask before committing anything you did not write.
2. Check `node -v`. CI uses Node 24; when the major version differs, put a Node 24 `bin` first on `PATH` (the skill says how) or report the mismatch.
3. Run `npm run ci:parity -- --list`. Exit 2 means the plan no longer matches the workflow: update `PLAN` in `scripts/ci-parity.mjs` and the table in the skill before going on.
4. Run `npm run ci:parity -- $ARGUMENTS` in the background (the full job takes about 30 minutes, `--fast` less). Ports 4173 and 6006 must be free. Pass `--sql` only when `DATABASE_URL` points at an empty Postgres you started with the owner's approval.
5. For each failed step, read `artifacts/ci-parity/<step>.log`, find the cause, and say whether the branch caused it or `main` already fails the same way (check the latest `main` run with `gh run list --branch main --workflow quality.yml --limit 1`).
6. Report from `artifacts/ci-parity/summary.json`: mode, head SHA, dirty flag, Node version, minutes, and every step as pass, fail, skipped (reason) or not run (reason).

Never report a skipped or not-run step as passing, and never quote a run made before the last commit as evidence for the head.
