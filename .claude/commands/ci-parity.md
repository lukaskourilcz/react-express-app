---
description: Run the `verify` CI job locally in workflow order and report each step's real result.
argument-hint: [--fast] [--sql] [--only step,step] [--bail]
allowed-tools: Read, Grep, Glob, Bash, Edit
---

Reproduce the `verify` job of `.github/workflows/quality.yml` for the current branch with `$ARGUMENTS`. Follow `.claude/skills/ci-parity-and-pr/SKILL.md`; its "When to run which" rule decides between `--fast` and the full job.

1. Check `git status --short` and `git rev-parse HEAD`. CI sees only committed files: if the tree is dirty, say so, and ask before committing anything you did not write.
2. Check `node -v`. CI uses Node 24; when the major version differs, put a Node 24 `bin` first on `PATH` (the skill says how) or report the mismatch.
3. Run `npm run ci:parity -- --list`. Exit 2 means the plan no longer matches the workflow. If the workflow change is part of this branch, update `PLAN` or `KNOWN_GLUE` in `scripts/ci-parity.mjs` and the table in the skill; otherwise stop and report the printed difference.
4. Run `npm run ci:parity -- $ARGUMENTS` in the background. Ports 4173 and 6006 must be free, and only one run may go at a time. Pass `--sql` only when `DATABASE_URL` points at an empty Postgres you started with the owner's approval. Give `--only` runs their own `--log-dir`.
5. For each failed step, read the log file named in that step's `log` field of `summary.json`, find the cause, and say whether the branch caused it or `main` already fails the same way (`gh run list --branch main --workflow quality.yml --limit 1`).
6. Report from `summary.json`: mode, `complete`, head SHA, dirty flag, Node version, minutes, and every step as pass, fail, skipped (reason) or not run (reason).

Never report a skipped or not-run step as passing, and never quote a summary whose `complete` is false, whose `dirty` is true or whose `head` is not the current commit.
