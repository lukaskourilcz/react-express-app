# What the product is allowed to say about its own content

Two questions decide whether a question or a coding task stays in the active
pool. Is it worth learning? Is it right? Both are scored, both have a
threshold, and passing one says nothing about the other.

That much is a methodology, and it is written for learners at `/curation`. The
harder half is the part that stops the product claiming more than it can show,
and that is what this document is about.

## The two gates

Modern relevance is scored across five markers, 0–2 each, out of ten:
present-day applicability, practical utility, transferable understanding,
audience and level fit, and risk or outcome value. Below **4/10** the item
leaves.

Quality is scored out of five, one point each: the answer is right, the
question asks one clear thing, the wrong options are plausibly wrong, the hint
helps without answering, and the explanation says why. Below **3/5** the item
leaves.

`shared/curation.ts` owns both, and `passesBothGates` is the only way to ask
whether an item passes. There is deliberately no helper that takes one score.

## The gate, applied once

`eligibilityFrom` in `shared/curation.ts` is the rule every delivery surface
applies: an item is served only when a record exists for its **exact current
content**, the record's decision keeps it live (`retain` or `rewrite`), and both
gates pass. No record, a record for other content, a `retire`, a `quarantine`
(correctness that could not be verified) and a failed gate all withhold it. The
rule is applied in one place, `applyEligibility` in `lib/questions-store.ts`,
while the effective question set is built, so quiz, daily, challenge,
placement, Learn levels and part tests, personalised review, Play, flashcard
creation and the coverage count read the same filtered set and none of them
can forget to ask. Coding tasks go through the same rule in
`lib/coding/active.ts`, which every issuing path reads; the authored catalogue
in `lib/coding/catalog.ts` keeps history and offers no issuing lookup.

A recorded decision is enforced wherever its item lives: a retirement
withholds the item and a passing review serves it, whether or not its category
is complete. The ledger's `scope` names the devShark categories the audit has
covered **completely**; only there is an item with no applicable record — none
at all, one for other wording, a broken one — withheld as well. The audit lands
in waves, and a category the current wave has reached only in part keeps
serving its unreviewed items as before, with no review claim, while the
decisions already recorded for it hold. Adding a category to the scope without
all of its rows withholds the rest of it, which is the intended failure.
StudyShark subjects are outside the audit entirely.

Retirement is not deletion. A withheld item stays in its source file and in
`getQuestionsForHistoryById`, so an old attempt still finds its explanation
and a report still finds its summary; it is absent from every selector. A
retired question thins its own Learn level rather than sliding a neighbour
under another level's title, and a level with fewer than three served
questions is *unavailable*: on the map with its number, never a prerequisite,
stepped over by the shared unlock rules so that nothing behind it becomes a
dead end.

In-flight attempts on an item retired while they were open are handled
explicitly rather than left to chance: a quiz answer to it is void — counted
neither for nor against, no proof minted, reported in the result — a Learn
attempt is closed without a verdict and the level offered again, and a
placement round voids the item and tops the run up to its budget.

## Nothing is reviewed until a record says so about the exact version

`lib/curation.ts:contentVersion` is a keyed digest of everything authored about
an item: the question, the options, **the correct answer**, the explanation, the
hint and the tags. Two consequences follow.

Changing any of them changes the version, so a review recorded against the old
one no longer applies — `reviewStatusFor` returns `superseded`, which the
learner sees as identical to never-reviewed, because in both cases nobody has
approved what is on their screen.

The digest is keyed rather than plain because it covers the correct answer.
An unkeyed hash over the four options plus a candidate index could be
brute-forced by anyone holding the question, which would hand out the answer key
through the field meant to protect it.

The registry (`lib/curation-registry.ts`) is generated from the audit ledger
(`docs/audit/devshark-content-ledger.json`) by
`npm run build:curation-registry`, and the launch contract fails when the two
disagree. The ledger is the record — every score, every piece of evidence,
every rationale, per item; the registry is the compact projection a request
loads: the plain hash of the exact content a decision was made about, the
seven quality dimensions and their floor, the five relevance markers and their
sum, the decision, the revision. A row's totals must equal what its markers
and dimensions add up to, or the row is treated as no record at all.

Two hashes, deliberately. The keyed `contentVersion` is what a learner sees and
quotes in a report; it covers the answer and is keyed so the options cannot
be hashed against it. The plain `contentHash` is what the ledger records
against, so the ledger stays checkable outside any one deployment; it is never
served. It also covers the category, because topic fit was scored against it
and moving an item is an edit the reviewer did not see. A served translation
has its own hash: a Czech version that is not the reviewed one is dropped, and
the reviewed English served in its place, rather than served unreviewed.

[#176](https://github.com/lukaskourilcz/react-express-app/issues/176) populates
the ledger in waves; `docs/audit/devshark-content-audit.md` reports each one.
Everything downstream is written to be correct at any point of that process.

## Four kinds of checking, four different words

| Kind | What it is | What it proves |
| --- | --- | --- |
| `human` | A person applies the criteria to the item as written | The strongest claim, and never made on the strength of another kind |
| `model` | An AI model applies the same criteria to every item individually, running the code a question asks about and reading current documentation for versioned claims | The item was scored against the criteria with its checks run; it is labelled as a model review, never as a person having read it |
| `automated` | A contract suite runs on every change | A specific class of mistake is absent; nothing about whether the item is worth asking |
| `execution` | A reference solution runs against a task's own grader | The task is solvable exactly as specified; **not** that it has no defects |

The content audit of #176 is a `model` review: every decision in the ledger
was made this way, and the learner-facing sentence for a reviewed item says
so ("Reviewed item by item by an AI model … Not yet read by a person").

Coding tasks are the one place with per-item machine evidence today:
`npm run test:coding` proves a solution against every task's grader
individually. `codingTaskReview` records that as one execution check, and the
learner-facing sentence is "Checked by our automated content contracts. Not yet
read by a reviewer." Questions get no automated evidence, because the suites
that cover them assert repository-wide properties rather than per-item ones, and
claiming otherwise for four thousand items would be the exact failure this
design exists to prevent.

`itemClaim` returns one of six values and they never blur: human review
outranks model review, which outranks machine evidence; more than once needs
more than one recorded human review; and unavailable metadata returns `none`
— no sentence at all rather than a friendlier default.

## A claim about the whole bank needs every source counted

`curationCoverage` counts the **effective** question set, which already folds in
database overrides and operator-authored questions. When the override layer
cannot be read, the count is not "the static bank" — it is `null`, because items
could exist that the process cannot see.

`coverageClaim` then returns:

- `complete` — every source counted, every item reviewed.
- `partial` — real numbers to quote, review still in progress.
- `none` — nothing reviewed yet, **or** one source that cannot be counted.

While the audit is in progress it returns `partial` with the real numbers, and
`/curation` quotes them. It becomes `complete` only when every served item has
a current record. There is no fallback sentence that sounds better.

## Where a learner meets this

- **Landing.** One line beside the topic picker, about the criteria applied —
  not about a plan the visitor has not chosen.
- **`/curation`.** The methodology, linked from the footer, from every "Why this
  question?" note and from each path overview. Optional to read; no gate, no
  acknowledgement.
- **"Why this question?"** A disclosure beside the question — never inside an
  answer option, for the same reason as the terms bar: a control inside an
  option would select it. It shows the level's own title as the objective, the
  item's own category as the topic, whether the topic is in the learner's plan
  (the same check the progression graph uses), the item's own tags, the review
  claim and the item version. Every line is omitted when its source is missing.
- **Report a problem.** In the note, in the quiz toolbar, in the Learn view and
  in the coding workbench, carrying the item id **and** the version that was on
  screen (migration 029) so a fix can be matched to the wording the learner
  actually saw. No account needed.

## What is asserted, not just intended

`npm run test:launch` fails if any of these stops holding:

- The version changes when the answer, the explanation or the question changes,
  and is not a plain digest of the content.
- An item with no record is `unreviewed`; unreadable metadata is `unavailable`
  and produces no sentence.
- A record for a different version, or one failing either gate, is `superseded`.
- "Reviewed more than once" requires more than one `human` event; automated and
  execution events never count toward it.
- A coding task's execution evidence is recorded, is claimed as automatic, and
  is not called a review.
- Public review metadata carries no scores without a current record, and no
  reviewer, report or answer under any circumstances.
- One uncountable source collapses the bank-wide claim to `none`.
- Passing one gate never satisfies the other.
- The registry equals the ledger; every served item of an audited category
  has a current, passing record for its exact content; every retired or
  quarantined row is absent from the served set; an edited copy is
  `superseded`; an unreviewed translation is dropped.
- Relevance 3 retires, 4 alone does not, 4 with quality 2 retires, relevance
  10 with a wrong key retires; a rewrite returns only on its new hash.
- A retired question thins its own level; a level below the floor is
  unavailable and the unlock rules step over it; an empty part is cleared
  rather than a dead end.
- An answer to a retired item is void, and a placement round tops itself up.

## The admin view

`/dev → Questions` shows each item's review state in a column: served or not,
the reason in the gate's own words (`unreviewed`, `superseded`, `retired`,
`quarantined`, `failed-gate`, `not-in-scope`), the scores on record and the
revision. An operator who edits a devShark question in the console sees it
turn `superseded` — the edit is stored, and the item is withheld until a review
of the new wording is recorded in the ledger. That is the intended cost of
"edits invalidate the previous approval"; there is no self-declared approval
from the console.

## What this does not do

It does not claim more than the ledger holds. An item with no applicable
record in a category outside the audited scope is served with no claim; an
item whose translation was not reviewed is served in English; a coding task
with no record is issued as before until the coding wave has landed.
`docs/audit/devshark-content-audit.md` says what each wave covered and what it
did not.
