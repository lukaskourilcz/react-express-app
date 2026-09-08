# When practice comes back, and what order it arrives in

Two policies, deliberately separate. One decides **which** concepts a learner
owes; the other decides **what order** they are practised in. Keeping them apart
is what makes each testable — and it stops the ordering policy quietly becoming
a second scheduler.

| | Owns | File |
| --- | --- | --- |
| Spaced practice | Which concepts are due, and when the next one is | `shared/spaced-practice.ts` |
| Interleaving | The order a session is played in | `shared/interleave.ts` |
| Shared vocabulary | What a concept is, and which are worth contrasting | `shared/concepts.ts` |

Both are pure, with the clock injected. Neither loads anything, neither knows
about a database, and both are covered by `npm run test:launch`.

## The unit is a concept, not a category

`javascript` is a shelf. `reduce` is a thing being assessed. A learner who
answers eight `reduce` questions has practised one idea, not eight, and
scheduling that as eight reviews would push it a week out on the strength of a
single evening.

`conceptOf(item)` resolves an item from tags the banks already carry, in the
item's own tag order, so it is deterministic and adds no authoring. A concept
never spans categories — a mix can therefore never reach into a topic the
learner has not unlocked, because it cannot reach outside the topic it started
in.

Twenty groups are authored today, covering fifty concepts across JavaScript,
TypeScript, React, CSS, DSA, security, databases, Node and system design. The
launch contract asserts every one of them matches at least one live question, so
a group that can never be practised fails the build rather than sitting there
looking complete.

### Gaps, named

- **Linear versus binary search.** The obvious contrast, and the tags do not
  distinguish them: everything is `Searching`. Rather than a group pretending
  otherwise, `dsa-searching` is one concept, contrasted with arrays and hash
  tables under "finding something again". Splitting it is authoring work on the
  DSA bank, not a change here.
- **HTML.** Its tags are structural (`Forms`, `Media`, `Repair`) rather than
  conceptual, so there is no pair a learner would confuse. No group.
- **`Cleanup` in React.** Every question carrying it also carries `useEffect`,
  which resolves first, so a separate concept would match nothing. It is folded
  into `react-useeffect` instead, with a comment saying why.
- **Coding tasks** are not concepts here. They have their own review ladder
  (migration 025), keyed by task, and this schedule does not touch it.

## Spacing: what counts as having remembered

Four retrieval kinds, and only one of them lengthens an interval:

| Kind | What happened | Effect |
| --- | --- | --- |
| `independent` | Answered with no hint open | Climbs one rung |
| `hinted` | A hint was open | Holds the rung |
| `revealed` | The answer had been shown | Holds the rung |
| `assisted` | Ordered shuffled lines, or another recognition task | Holds the rung |

Answering correctly immediately after seeing the answer is the exact thing
spaced practice exists to see through. Treating it as a success would defeat the
feature quietly, which is worse than not having it.

A wrong answer resets to the bottom rung and returns in **4 hours** — long
enough not to be the same sitting, short enough that the explanation is still
fresh. It resets whatever the kind: a wrong answer with a hint open is still a
wrong answer.

The ladder is **8, 24, 72, 168, 336, 720 hours**. It is bounded at both ends and
`SCHEDULING_POLICY_VERSION` travels with every stored row, so changing it later
is a new policy rather than a silent reinterpretation of what learners already
earned. Nothing in the product presents these numbers as optimal; spaced
retrieval has strong general support, and these particular hours are ours.

Hint usage is reported by the client. That is safe here for a specific reason:
it can only ever *weaken* an outcome. Saying a hint was open shortens nothing
for anyone else and cannot manufacture mastery; the interesting direction —
claiming independence that did not happen — is not a claim the client can make,
because the server derives correctness itself and treats the absence of a hint
id as the default rather than as an assertion.

### Absence is information, not debt

The due queue is capped (twelve concepts) and sorted most-overdue-first.
Returning after three weeks gives a normal session, not a backlog. What falls
outside the cap is not lost — it is still overdue tomorrow, and it sorts first
when it is. Nothing is revoked for being late: a level a learner passed stays
passed, and review grants no XP of its own, so there is no second reward system
and no repeated first-completion credit.

## Interleaving: the order, and only the order

Three failure modes it is written against:

1. **A long run of one concept** is a block with extra steps. Runs are capped at
   two.
2. **A strict alternation** is a pattern, and a pattern is a hint — after three
   A-B-A-B pairs a learner can answer the seventh without reading it. Run
   lengths follow a fixed short cycle (1, 2, 1, 1, 2), so the arrangement stays
   deterministic while the concept sequence does not repeat.
3. **A mix nobody can do** is a wall, not interleaving. A concept the learner has
   barely met gets a focused block of its own first; only concepts they have
   already practised are eligible to be mixed.

Format variety uses the *declared* snippet metadata from
`shared/snippet-format.ts` — never inferred from whether the text has a fenced
block, which would make both the pacing rule and the coverage report
meaningless. An item with no declared format is not "the same shape" as the last
one; it is an item nobody has said anything about.

Items belonging to no concept fill the gaps and are never dropped. With fewer
than two contrastable concepts the session is ordinary focused practice and the
learner is told nothing, because nothing is happening. When a session **is**
mixed, one line appears once: *"You're comparing related ideas here, to practise
choosing which one fits."* No tutorial, no gate.

## What review never does

It never widens the pool. The items a review session can draw on are the ones
the request already resolved under the same eligibility and plan filters as
everything else, so review cannot unlock a level, pull in an unselected path, or
resurrect retired material. It also never replaces a required assessment: this
is practice and review selection, and the levels, checkpoints and part tests are
untouched.

Where a concept is due, the selection prefers an item *other* than the one last
used for it, so a review tests the objective rather than the memory of one
question. When no other item exists it uses the same one and says nothing — the
objective has not changed.

## Persistence

`concept_reviews` (migration 030) is owner-scoped: readable by its owner,
writable only by the service role, and included in account erasure. Writes go
through `record_concept_review`, which takes an event id derived from the
attempt, so a retried submit or the same attempt arriving from two devices
reports the stored state and applies nothing.

One row is written per concept per session, from the **worst** outcome in that
session. A concept the learner got wrong once is not one they have retained,
however many times they got it right afterwards in the same sitting.

## What is asserted

`npm run test:launch` fails if any of these stops holding:

- Every authored concept matches at least one live question, and resolves only
  inside its own topic.
- Only `independent` climbs the ladder; `hinted`, `revealed` and `assisted` hold
  it and do not extend the streak.
- A wrong answer resets to stage 0 and returns at the relearn interval, whatever
  the kind.
- Intervals lengthen monotonically and are bounded at the top rung.
- Due selection is most-overdue-first, respects the cap, and excludes anything
  the eligibility predicate rejects.
- An arrangement places every item exactly once, never runs a concept more than
  twice, is deterministic for the same input, and is not a strict rotation.
- New material arrives as a focused block before it is mixed.
- One eligible concept produces ordinary focused practice, not a fake mix.
- Contrast only ever happens within a group.

## What this does not claim

It does not claim a learning gain. The measurement that would matter is delayed,
unhinted success on *unseen* items testing the same objective — not completion
counts and not streaks — and that measurement has not been run. What exists is
the scheduling, the ordering, the persistence, and the guarantee that each does
only its own job.
