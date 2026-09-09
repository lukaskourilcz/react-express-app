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

The registry in `lib/curation.ts` is **empty**. No item-level audit has run, so
there are no recorded decisions, and every claim resolves to "not reviewed
yet". Populating it is
[#176](https://github.com/lukaskourilcz/react-express-app/issues/176)'s job.
Everything downstream is written to be correct while it is empty and to become
more specific, with no code change, when it is not.

## Three kinds of checking, three different words

| Kind | What it is | What it proves |
| --- | --- | --- |
| `human` | A person applies the criteria to the item as written | This is what "reviewed" means, and the only thing that word is used for |
| `automated` | A contract suite runs on every change | A specific class of mistake is absent; nothing about whether the item is worth asking |
| `execution` | A reference solution runs against a task's own grader | The task is solvable exactly as specified; **not** that it has no defects |

Coding tasks are the one place with per-item machine evidence today:
`npm run test:coding` proves a solution against every task's grader
individually. `codingTaskReview` records that as one execution check, and the
learner-facing sentence is "Checked by our automated content contracts. Not yet
read by a reviewer." Questions get no automated evidence, because the suites
that cover them assert repository-wide properties rather than per-item ones, and
claiming otherwise for four thousand items would be the exact failure this
design exists to prevent.

`itemClaim` returns one of five values and they never blur: human review
outranks machine evidence, more than once needs more than one recorded human
review, and unavailable metadata returns `none` — no sentence at all rather than
a friendlier default.

## A claim about the whole bank needs every source counted

`curationCoverage` counts the **effective** question set, which already folds in
database overrides and operator-authored questions. When the override layer
cannot be read, the count is not "the static bank" — it is `null`, because items
could exist that the process cannot see.

`coverageClaim` then returns:

- `complete` — every source counted, every item reviewed.
- `partial` — real numbers to quote, review still in progress.
- `none` — nothing reviewed yet, **or** one source that cannot be counted.

Today it returns `none`, and `/curation` says so in those words: the review has
not started, so the page describes the criteria that will be applied rather than
a result. There is no fallback sentence that sounds better.

## Where a learner meets this

- **Landing.** One line beside the topic picker, about the criteria applied —
  not about a plan the visitor has not chosen.
- **`/curation`.** The methodology, linked from the footer and from each path
  overview. Optional to read; no gate, no acknowledgement.
- **Report a problem.** In the quiz toolbar, in the Learn view and in the coding
  workbench, carrying the item id **and** the version that was on screen
  (migration 029) so a fix can be matched to the wording the learner actually
  saw. No account needed.

  There used to be a fourth surface: a "Why this question?" disclosure beside
  each item, showing the objective, the topic, plan membership, the tags, the
  review claim and the version. It was dropped in September 2026 as clutter next
  to the question itself. Only the display went: the item version still travels
  on every question and coding-task payload and still reaches every report, so a
  fix can still be matched to the wording that was on screen. Migration 029's
  own comment names the note as where the version was shown, which is no longer
  true of the note but remains true of the value.

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

## What this does not do

It does not audit anything. Not one item has been scored against these gates;
that work is #176 and it is outside this change. What exists now is the contract
the audit will write into, the plumbing that carries its results to a learner,
and the guarantee that until it runs, the product says so.
