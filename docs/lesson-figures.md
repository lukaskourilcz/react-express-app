# Worked examples in Learn lessons: what exists, and what does not

A figure earns its place by explaining a relationship or a change over time
better than a sentence can. Where a sentence is clearer, there is no figure —
and this document records those omissions rather than leaving the gap looking
like an oversight.

Everything is authored, deterministic HTML and CSS. There is no generated
imagery anywhere in this feature and there must not be: a diagram of a box
model, an execution order or a join is a claim about behaviour, and a picture
that merely looks like one is worse than no picture at all.

## Coverage

Twenty-three figures, one objective each, keyed to the level whose objective they
serve. They appear in the Learn level intro, before the questions.

| Topic | Level | Figure | Shape |
| --- | --- | --- | --- |
| HTML | 1 Structure & Semantics | What a screen reader hears | nested landmarks |
| HTML | 3 Forms | What connects a label to its field | flow |
| CSS | 2 Box Model, Flow & Overflow | Where the 300 pixels went | nested, with numbers |
| CSS | 3 Flexbox | The two axes, and which property moves which | flow |
| CSS | 4 Grid & Responsive Layout | What a fraction is a fraction of | table |
| CSS | 5 Positioning & Stacking | Why `z-index: 9999` lost | nested contexts |
| JavaScript | 5 Objects: Basics | Two names, one object | flow |
| JavaScript | 6 Array Iteration | `map` keeps the length | stepped trace |
| JavaScript | 7 Filter & Find | `filter` keeps the values | stepped trace |
| JavaScript | 8 Reduce | `reduce` carries one value along | stepped trace, with accumulator |
| JavaScript | 22 Async / Await | The order the lines actually run in | stepped trace |
| TypeScript | 11 Type Narrowing | What the compiler knows in each branch | flow |
| React | 3 Props | Data goes down, events come up | flow |
| React | 8 Updating State | Why two increments added one | stepped trace |
| Databases | 6 Joins | The same query, two joins | table with fixture rows |
| DSA | 2 Big-O Notation | What the notation is actually saying | table |
| DSA | 6 Stacks | A stack: last in, first out | stepped trace |
| DSA | 7 Queues | A queue: first in, first out | stepped trace |
| DSA | 11 Searching Algorithms | Halving a sorted array | stepped trace |
| General | 2 Clients & Servers | One click, end to end | flow |
| General | 16 What Tests Can Prove | What each kind of test can prove | table |
| Node.js | 10 Streams | Why a stream reads a 2 GB file on a 512 MB box | flow |
| System Design | 4 Load Balancing | What a load balancer has to know | flow |

The three contrast pairs the interleaver cares about most — `map`/`filter`/
`reduce`, stacks/queues, and the two joins — each get figures that use the same
data and the same shape, so the difference between them is the only thing that
differs.

## Deliberate omissions

- **HTML levels 2, 4, 5, 6.** Links versus buttons, media delivery, content
  structures and repair are all about which element to reach for. That is a
  choice between named things, which prose states better than a picture of two
  boxes would.
- **CSS levels 1 and 6.** The cascade is a set of rules with a precedence order,
  and maintainability is a set of habits. A diagram of either would be a list
  drawn as boxes.
- **TypeScript beyond narrowing.** Types are already a notation; a second
  notation on top of them adds a translation step rather than removing one. The
  exception is narrowing, where the point is that the *same value* has different
  types in different places — a relationship, not a notation.
- **System Design beyond load balancing.** The published levels are largely
  trade-off discussions, where a diagram tends to assert one architecture as
  correct. Load balancing is included because the two preconditions
  (interchangeable servers, session state outside memory) are structural facts
  rather than opinions.
- **FDE modules.** Out of scope: this does not implement unpublished path
  content, and the learning-path lessons already have their own trace player
  (`client/src/components/paths/LessonBody.tsx`) for the material that ships.
- **Coding task briefs.** They carry their own worked examples through visible
  tests and the approaches panel. A diagram in the brief would compete with the
  editor for the same attention.

## Accessibility, and why the text is not an afterthought

Every figure carries its content in words under a "This figure in words"
disclosure — the numbers, the order, the result — not a description of the
picture. It is a disclosure rather than an `alt` attribute so it is available to
everybody, and it is what makes the figure safe to lose to a narrow screen, a
stylesheet that failed, or a reading order that differs from the visual one. The
contract test rejects an alt text shorter than 120 characters, and one that
starts "a diagram of", because both are labels that have been mistaken for
content.

Beyond that:

- **No meaning through colour.** Every marked cell, row and layer carries the
  word that says why it is marked — "middle", "found", "top", "only in the LEFT
  JOIN". The tint is decoration on top of a word that is already there.
- **Stepping is manual.** Previous, Next, Reset. No autoplay, no dragging, no
  timer. The frames are states rather than an animation, so there is nothing for
  a reduced-motion preference to turn off.
- **The whole sequence is also written out** below the controls, so a stepped
  figure is readable without touching them.
- **What changed is announced.** The step description sits in a live region.
- **Assumptions are stated** where the answer would change without them: the
  `box-sizing` in effect, the container width behind an `fr` calculation, the
  `highWaterMark` behind a stream chunk size, the tie-break rule in a binary
  search.
- **Abbreviation help sits beside the figure**, never injected into its labels,
  so nothing rewrites the content the learner is reading.

## Answer leakage

A figure can be marked `afterSubmission`, which holds it until the level is
finished — for the case where the picture would answer the question being asked.
None of the twenty-three is marked today: each was authored as neutral context,
using values that do not appear in that level's questions. The mechanism is
still tested, against a synthetic marked figure, so it works the first time an
author needs it rather than the first time it is discovered not to.

## Checked, and what "checked" means

`npm run test:launch` fails if any of these stops holding:

- Every figure names a real topic and a level inside that topic's range.
- Every figure has an English and a Czech title and alt text, and the alt text is
  long enough to be the content rather than a label for it.
- No arrow is unlabelled — an unlabelled arrow means "somehow", which is the
  thing a diagram is supposed to replace.
- No mark is wordless; no table row is the wrong width; no frame marks a cell it
  does not have.
- A figure only ever appears on the level it was authored for.
- A figure held until after submission is not returned before it.
- The named topics are all covered, so the set cannot quietly collapse into
  whichever topic was easiest to author.

Every number in every figure was worked through by hand: the box model sums to
376px, the grid fractions divide 700px into 233.33 and 466.67, the binary search
finds 23 in two comparisons taking the lower middle, the growth table's `n log n`
at n = 1000 is 9,966, and the join returns three rows inner and four left.

## What this does not claim

It does not claim that adding a diagram improves learning. Concrete examples and
paired verbal-and-visual explanation are guiding principles, and the measurement
that would matter is comprehension on a *different* example — not whether the
figure was opened. That measurement has not been run.
