---
description: Push the branch, open the pull request, wait for `verify` and `sql`, merge, delete the branch, and record the release.
argument-hint: <issue-number> [--draft]
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

Ship the current branch for issue `$ARGUMENTS` through a pull request. Follow `.claude/skills/ci-parity-and-pr/SKILL.md` ("Branch, commits and pull request", "After the merge", "The `docs/release-acceptance.md` entry").

1. Confirm the branch is `claude/<issue-id>-<slug>`, not `main`, and sits on the current `origin/main` (`git fetch origin && git merge-base --is-ancestor origin/main HEAD`). If it does not, rebase and rerun the checks.
2. Confirm the tree is clean and that a `npm run ci:parity` run (`--fast` at least) on this exact head is in `artifacts/ci-parity/summary.json`. If not, run `/ci-parity --fast` first.
3. Read the issue (`gh issue view <n>`) and tick its acceptance checklist against what the branch does. Where the issue and section 10 of `docs/learn-sections-fde-flagship-plan.md` disagree, the plan wins: note it in the body and update the issue with `gh issue comment`.
4. Push with `git push -u origin HEAD`, write the body in the skill's shape to a scratch file (real results only, `Closes #<n>`, the attribution line), and run `gh pr create --base main --body-file <file>` (with `--draft` when asked).
5. Wait with `gh pr checks <pr> --watch --required` in the background. On a failure, read `gh run view <run-id> --log-failed`, fix it on the branch, push, and wait again.
6. When `verify` and `sql` are green and the PR is not a draft, run `gh pr merge <pr> --merge --delete-branch`, then `git switch main && git pull --ff-only && git branch -d <branch>`.
7. When the change alters production behaviour: wait for the READY production deployment of the merge SHA, run the read-only smoke checks it needs, and write the acceptance entry and the `NEEDED.md` updates on the next branch.

Do not merge a draft, a red check or a PR the owner asked to hold. Report the PR URL, the required run id with both job durations, the merge SHA and the deployment id you actually saw.
