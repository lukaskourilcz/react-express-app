---
description: Push the branch, open the pull request, wait for `verify` and `sql`, merge, delete the branch, and record the release.
argument-hint: <issue-number> [--draft]
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

Ship the current branch for issue `$ARGUMENTS` through a pull request. Follow `.claude/skills/ci-parity-and-pr/SKILL.md` ("Branch, commits and pull request", "After the merge", "The `docs/release-acceptance.md` entry").

1. Confirm the branch is `claude/<issue-id>-<slug>`, not `main`, and sits on the current `origin/main` (`git fetch origin && git merge-base --is-ancestor origin/main HEAD`). If it does not, rebase and rerun the checks.
2. Confirm the tree is clean and that the local checks the skill's "When to run which" rule asks for ran on this exact head (`summary.json` with `complete: true`, `dirty: false` and `head` equal to `git rev-parse HEAD`, in the log directory you used). CI remains the gate.
3. Read the issue (`gh issue view <n>`) and tick its acceptance checklist against what the branch does. Where the issue and the code disagree, note it in the body and update the issue with `gh issue comment`.
4. Push with `git push -u origin HEAD`, write the body in the skill's shape to a scratch file (real results only, `Closes #<n>`, the attribution line), and run `gh pr create --base main --head <branch> --title "<issue title>" --body-file <file>` (with `--draft` when asked).
5. If the diff adds a migration under `supabase/`, do not merge until that migration is applied in production by the owner or by an agent the owner authorised for the task; until then keep an `[owner:me] [kind:deploy]` item in `NEEDED.md`.
6. Wait with `gh pr checks <pr> --watch --required` in the background. On a failure, read `gh run view <run-id> --log-failed`, fix it on the branch, push, and wait again.
7. When `verify` and `sql` are green and the PR is not a draft, run `gh pr merge <pr> --merge --delete-branch`, then `git switch main && git pull --ff-only && git branch -d <branch>`.
8. When the change alters production behaviour, wait for the READY production deployment of the merge SHA, run the read-only smoke checks it needs, and commit the acceptance entry and the `NEEDED.md` updates on the next branch (or a short acceptance branch with its own PR).

Do not merge a draft, a red check or a PR the owner asked to hold. Report the PR URL, the required run id with both job durations, the merge SHA and the deployment id you actually saw.
