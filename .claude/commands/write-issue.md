---
description: Scaffold a devShark child issue or epic body in the repository's template from its plan row, check it, and stop before creating it.
argument-hint: <epic-number> <work-package-id | epic> [--out <file>]
allowed-tools: Read, Grep, Glob, Bash, Write
---

Scaffold the issue `$ARGUMENTS` names, following `.claude/skills/github-issue-authoring/SKILL.md` and its `references/templates.md`. Write the body to a scratch file, never into the repository, and do not run `gh issue create` unless the request says to create it.

1. Read the epic with `gh issue view <epic-number>`. Take its Specification link: that document and section hold the work-package table with ids, titles and blockers.
2. Read that document section. Find the row for the work-package id (for example `A1` in `docs/learn-sections-fde-flagship-plan.md` section 9). With `epic` as the second argument, read the whole table instead and scaffold the epic.
3. Read the design sections the row points to, and the files it names. Confirm each path exists with `git ls-files` or mark it `(new)`. Mark generated files `(generated)`.
4. Fill the template:
   - Child issue: title `[<Id>] <work package>`; the `Parent:` line; `## Scope`, `## Affected files`, `## Blocked by`, `## Acceptance`, `## Verification`.
   - Epic: title `[Epic <letter>] <outcome>`; the outcome paragraph; `## Specification`, `## Order` (or `## Conventions`), `## Child issues`, `## Done when`.
   Blocked by repeats the table row, with issue numbers where they exist (`gh issue list --search "[<Id>] in:title" --state all`). Acceptance boxes name an observable result. Verification lists only scripts in `package.json`, or in `client/package.json` for a script run with `--prefix client`, and ends with `git diff --check`. Take every count from `npm run content:snapshot`, not memory.
5. Write the body to `--out <file>` when given, else to a new file in the session scratchpad or `$TMPDIR` named `issue-<id>.md`. Put the title on the first line of your report, not in the file.
6. Run the skill's validation block against the file: the section count (5 for a child issue; for an epic, check `## Specification`, `## Child issues` and `## Done when` by name), the script-existence check, and, when a pull request body is involved, the closing-keyword check. Fix the draft until each passes.
7. Report the title, the file path, the full body in a code block, and each check's real output. List any placeholder you could not fill and the source line you would need.

Apply `.claude/skills/stop-slop/SKILL.md` to the prose and write in English. Do not add labels unless the issue is a design-audit finding (skill rule 9). To create the issue afterwards, run `gh issue create --title "<title>" --body-file <file>` and read it back with `gh issue view <n>`; a planning pull request that records the new number references it with `Refs #<n>`, never `Closes`.
