# What the product may say about its own content

Two questions decide whether a question or a coding task stays in the active pool. Is it worth learning? Is it right? Both are scored, both have a threshold, and passing one says nothing about the other.

The same rules stop the product claiming more review than it can show. devShark has no public methodology page; the eligibility rule and the review records below are the authority.

## The two gates

Modern relevance is scored on five markers, 0 to 2 each, out of ten: present-day applicability, practical utility, transferable understanding, audience and level fit, and risk or outcome value. Below **4/10** the item leaves.

Seven quality dimensions are scored from one to five: topic relevance, learning value, technical correctness, wording, answer options, hint and explanation. The quality score is the lowest dimension, never an average or a count of passed criteria (`qualityFloor` in `shared/curation.ts`). Below **3/5** the item leaves.

`shared/curation.ts` owns both gates, and `passesBothGates` is the only way to ask whether an item passes. No helper takes one score alone.

## The gate, applied once

`eligibilityFrom` in `shared/curation.ts` is the rule every delivery surface applies: an item is served only when a record exists for its **exact current content**, the record's decision keeps it live (`retain` or `rewrite`), and both gates pass. No record, a record for other content, a `retire`, a `quarantine` (correctness that could not be verified) and a failed gate all withhold it.

`applyEligibility` in `lib/questions-store.ts` applies the rule once, while the effective question set is built. Quiz, daily, challenge, placement, Learn levels and part tests, personalised review, Play, flashcard creation and the coverage count all read that filtered set. Coding tasks pass through the same rule in `lib/coding/active.ts`, which every issuing path reads; the authored catalogue in `lib/coding/catalog.ts` keeps history and offers no issuing lookup.

The ledger's `scope` names what the audit covers completely: every devShark Learn category and all coding tasks (`codingTasks: true`). Inside that scope an item with no applicable record (none, one for other wording, a broken one) is withheld. A new or changed question, task, solution or grader therefore stays withheld until a passing review of its exact version is recorded.

All 769 issued coding tasks have a passing record. The 45 system-design tasks are authored but hidden: `CODING_SECTION_TRACKS` leaves the track out, and the ledger holds no rows for them, so they would stay withheld if the track were listed. `docs/audit/system-design-review-2026-10-22.md` records a model review of them that wrote no ledger rows.

Retirement is not deletion. A withheld item stays in its source file and in `getQuestionsForHistoryById`, so an old attempt still finds its explanation and a report still finds its summary; every selector skips it. A retired question thins its own Learn level and never pulls a neighbour under another level's title. A level with fewer than three served questions is *unavailable*: on the map with its number, never a prerequisite, and stepped over by the shared unlock rules so nothing behind it becomes a dead end.

An attempt that was open when its item was retired is handled explicitly: a quiz answer to the item is void (counted neither for nor against and reported in the result), a Learn attempt closes without a verdict and offers the level again, and a placement round voids the item and tops the run up to its budget.

## A review applies to one exact version

`contentVersion` in `lib/curation.ts` is a keyed digest of everything authored about a question: the text, the options, **the correct answer**, the explanation, the hint and the tags. Changing any of them changes the version, so a review recorded against the old one no longer applies: `reviewStatusFor` returns `superseded`, which the learner sees as identical to never-reviewed, because nobody has approved what is on their screen.

The digest is keyed because it covers the correct answer. An unkeyed hash over the options plus a candidate index could be brute-forced by anyone holding the question, handing out the answer key through the field meant to protect it.

`npm run build:curation-registry` generates the registry (`lib/curation-registry.ts`) from the audit ledger (`docs/audit/devshark-content-ledger.json`), and the launch contract fails when the two disagree. The ledger is the record: every score, piece of evidence and rationale, per item. The registry is the compact projection a request loads: the plain hash of the content a decision was made about, the seven quality dimensions and their floor, the five relevance markers and their sum, the decision and the revision. A row whose totals differ from what its markers and dimensions add up to counts as no record at all.

There are two hashes. The keyed `contentVersion` travels with every question and coding-task payload and with every report; it covers the answer and is keyed so the options cannot be hashed against it. The plain `contentHash` is what the ledger records, so the ledger stays checkable outside any one deployment; it is never served. It also covers the category, because topic fit was scored against it and moving an item is an edit the reviewer did not see. A coding task's hash (`taskHash`) covers every revealed solution variant, hidden grader material, the authored reference and earlier requirements, comparisons and accepted puzzle material, and its keyed public version derives from the same full hash.

`docs/audit/devshark-content-audit.md` reports the current review totals.

## Four kinds of checking, four words

| Kind | What it is | What it proves |
| --- | --- | --- |
| `human` | A person applies the criteria to the item as written | The strongest claim, and never made on the strength of another kind |
| `model` | An AI model applies the same criteria to each item individually, running the code a question asks about and reading current documentation for versioned claims | The item was scored against the criteria with its checks run; it is labelled a model review, never a person's reading |
| `automated` | A contract suite runs on every change | A specific class of mistake is absent; nothing about whether the item is worth asking |
| `execution` | A reference solution runs against a task's own grader | The task is solvable as specified, **not** that it has no defects |

Every decision in the ledger today is a `model` review. A model's second reading of its own work is recorded as model self-review, never as an independent or human check.

Coding tasks also carry per-item machine evidence: `npm run test:coding` proves solutions against every task's grader, and `codingTaskReview` records that as one `execution` check. Questions get no automated evidence, because the suites that cover them assert repository-wide properties, and claiming per-item evidence for thousands of questions would be the exact overclaim this design prevents.

`itemClaim` returns one of six values and keeps them apart: human review outranks model review, which outranks machine evidence; "reviewed more than once" needs more than one recorded human review; and unavailable metadata returns `none`, no sentence at all.

## A claim about the whole bank needs every source counted

`curationCoverage` counts the **effective** question set, which already folds in database overrides and operator-authored questions. When the override layer cannot be read, the count is `null`, because items could exist that the process cannot see.

`coverageClaim` then returns:

- `complete`: every source counted, every item reviewed.
- `partial`: real numbers to quote, some items unreviewed.
- `none`: nothing reviewed, **or** one source that cannot be counted.

No fallback sentence sounds better than the numbers.

## Where a learner meets this

**Report a problem** sits in the quiz toolbar, the Learn view and the coding workbench (`client/src/components/ReportDialog.tsx`). A report carries the item id **and** the version that was on screen (migration 029), so a fix can be matched to the wording the learner saw. No account is needed. `enforceClassRateLimit` limits reports in two tiers: a class-sized bucket per address (`questionReportAddress`, 96 at once), then three at once per verified account, or per address for a guest (`questionReport`). A report whose id or detail holds U+0000 answers 400.

## What `npm run test:launch` asserts

- The version changes when the answer, the explanation or the question changes, and is not a plain digest of the content.
- An item with no record is `unreviewed`; unreadable metadata is `unavailable` and produces no sentence.
- A record for a different version, or one failing either gate, is `superseded`.
- "Reviewed more than once" requires more than one `human` event; automated and execution events never count toward it.
- A coding task's execution evidence is recorded, claimed as automatic, and not called a review.
- Public review metadata carries no scores without a current record, and no reviewer, report or answer at all.
- One uncountable source collapses the bank-wide claim to `none`.
- Passing one gate never satisfies the other.
- The registry equals the ledger; every served item of an audited category has a current, passing record for its exact content; every retired or quarantined row is absent from the served set; an edited copy is `superseded`.
- Relevance 3 retires, 4 alone does not, 4 with quality 2 retires, relevance 10 with a wrong key retires; a rewrite returns only on its new hash.
- A retired question thins its own level; a level below the floor is unavailable and the unlock rules step over it; an empty part is cleared rather than left as a dead end.
- An answer to a retired item is void, and a placement round tops itself up.

## The admin view

`/dev` → Question bank shows each item's review state: served or not, the reason in the gate's own words (`unreviewed`, `superseded`, `retired`, `quarantined`, `failed-gate`, `not-in-scope`), the scores on record and the revision. An operator who edits a devShark question there sees it turn `superseded`: the edit is stored, and the item is withheld until a review of the new wording reaches the ledger. The console offers no self-declared approval.
