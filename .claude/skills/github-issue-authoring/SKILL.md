---
name: github-issue-authoring
description: Write devShark epics, child issues, design-audit findings and closeout records in the repository's established format. Use when turning a plan or audit into GitHub issues, editing an epic's child map, or closing out an issue or a batch.
---

# GitHub Issue Authoring

Read the plan or audit the issues come from before writing. Every issue points back to a section of a document under `docs/`, and the document's work-package table is the source of ids, titles and blockers. The templates live in [references/templates.md](references/templates.md).

## Rules

1. **One work package per issue, five parts per issue.** A child issue carries Scope, Affected files, Blocked by, Acceptance and Verification, in that order (#484–#517 show the form; `docs/learn-sections-fde-flagship-plan.md`, section 9, first paragraph). #512 to #517 name their files inside Scope and have no Affected files section; give every new issue the section.
2. **Ids come from the plan.** Title a child `[<Id>] <work package>`, where the id is the epic letter and the row number in the plan's table (`[A1] Section registry and plan membership`, #487). Title an epic `[Epic <letter>] <outcome>` (#479–#483).
3. **The first line links the parent and the source.** `Parent: #<epic> (Epic <letter>). Plan: section <n>.` (#484–#510) or `Audit: section <n>` (#511–#517).
4. **Blockers live in two places and agree.** The plan or audit keeps a blocker table (`| Id | Work package | Blocked by |`, as `docs/learn-sections-fde-flagship-plan.md` section 9 does). Each issue's Blocked by section repeats its row. "Dependencies block merges, not commits" (`docs/learn-sections-fde-flagship-plan.md` section 9).
5. **Acceptance is observable.** Each checkbox names something a reviewer can check: a command's result, a route's behaviour, an assertion in a contract. Write no box that only restates the scope (#485, #487, #493 show the shape).
6. **Verification names real scripts.** Every `npm run <script>` must exist in `package.json`, or in `client/package.json` when it carries `--prefix client`. Every issue from #484 to #517 runs `git diff --check`, and #485 to #517 end with it; end every new list with it. Name `test:sql`, `check:responsive` or the browser specs only with their preconditions (`.claude/skills/ci-parity-and-pr/SKILL.md`, "Environment").
7. **The epic holds the child map and the shared rules.** Its body has Specification, an Order or Conventions section, Child issues (`- <Id> #<n> <title>`) and Done when (#479–#483). Rules that bind every child go in the epic, as #482 "Rules that hold for every child issue" and #483 "Conventions" do, not repeated in each child.
8. **Record the numbers in the source document.** After creating issues, add the issue numbers and the creation date to the plan's work-package section as the "Issue numbers (created 21 October 2026)" paragraph after the work-package tables does in `docs/learn-sections-fde-flagship-plan.md` section 9.
9. **Labels: the audits use them, the epics do not.** Design-audit findings carry `design-audit` or `design-review-2` plus one priority: `P0` "Must change before launch", `P1` "Should change before launch", `P2` "Polish later" (`gh label list`; #240–#264 and #270–#306). Epics A to E and their children carry no label. Create no new label without the owner.
10. **A merged planning PR must not close implementation issues.** A pull request that adds or edits a plan, an audit or issue text references issues with `Refs #<n>` and never with `Closes`, `Fixes` or `Resolves` (#128 body "merging it does not implement or close this epic"; the first #128 comment reopened the epic after a merge closed it).
11. **An implementation PR closes its own issue only.** One branch `claude/<issue-id>-<slug>` and one pull request per issue, with `Closes #<n>` in its body (`.claude/skills/ci-parity-and-pr/SKILL.md`, "Branch, commits and pull request"). When an acceptance box needs a run this session cannot make, write `Refs #<n>` instead and leave the issue open with a closeout comment (#143 and #148 comments).
12. **Close out with evidence.** The closeout comment lists each command with its real result and each unrun check with the reason (#143 comment). A batch from one brief also gets a closeout record with the `| ID | Issue | Commit | Deviation from the brief |` table. Post it as a comment on the epic or tracking issue; dated records under `docs/` go stale and the repository deletes them.
13. **Prose follows the repository's rules.** English only (CLAUDE.md "Protected behavior"); active voice, specific nouns, no filler and no em dashes (`.claude/skills/stop-slop/SKILL.md`). A count in an issue comes from `npm run content:snapshot` or another script, never from memory (`.claude/skills/shark-learning-content-map/SKILL.md`).

## Workflow

1. Read the source section and its blocker table. List the ids, titles and blockers.
2. Draft each body from [references/templates.md](references/templates.md) into a scratch file outside the repository. `/write-issue` scaffolds one.
3. Check each draft (commands below), then create it: `gh issue create --title "<title>" --body-file <file>`, adding `--label` only under rule 9.
4. Read every created issue back with `gh issue view <n>` and compare it with the draft.
5. Create or update the epic's child map, then record the numbers in the source document (rule 8) through a planning PR that follows rule 10.

## Validation

No npm script covers issue text. Run these against the draft before `gh issue create`, and the read-backs after:

```sh
# The draft has the five sections of a child issue: prints 5.
grep -c -E '^## (Scope|Affected files|Blocked by|Acceptance|Verification)$' DRAFT.md

# Every script the draft names exists: a script followed by `--prefix client` in
# client/package.json, any other in package.json. Prints nothing when none is missing.
grep -o -E 'npm run [a-z0-9:-]+( -- [^`]*)?( --prefix client)?' DRAFT.md | sort -u | while read -r _ _ s rest; do
  case "$rest" in *'--prefix client'*) pkg=./client/package.json ;; *) pkg=./package.json ;; esac
  node -e "process.exit(require('$pkg').scripts['$s'] ? 0 : 1)" || echo "missing: $s in $pkg"
done

# A planning PR body carries no closing keyword (rule 10): prints nothing.
grep -n -i -E '\b(close[sd]?|fix(e[sd])?|resolve[sd]?) #[0-9]+' PR-BODY.md

# The created issue and the epic read back as drafted.
gh issue view <n>
gh issue view <epic>
```

Report the issue numbers created, the read-back result for each, and any source-document line you updated.
