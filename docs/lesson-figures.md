# Worked figures in Learn levels

A figure earns its place by explaining a relationship or a change over time better than a sentence can. Where a sentence is clearer there is no figure, and this document lists those omissions so the gaps read as decisions.

`shared/lesson-figures.ts` holds every figure as authored data, and `client/src/components/ui/LessonFigure.tsx` renders it as deterministic HTML and CSS. No figure uses generated imagery, and none may: a diagram of a box model, an execution order or a join is a claim about behaviour, and a picture that only looks like one is worse than none.

## Coverage

Twenty-three figures, one objective each, keyed to the level whose objective they serve. They appear in the Learn level intro, before the questions.

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
| JavaScript | 22 Async / Await | The order the lines run in | stepped trace |
| TypeScript | 11 Type Narrowing | What the compiler knows in each branch | flow |
| React | 3 Props | Data goes down, events come up | flow |
| React | 8 Updating State | Why two increments added one | stepped trace |
| Databases | 6 Joins | The same query, two joins | table with fixture rows |
| DSA | 2 Big O and Growth | What the notation is saying | table |
| DSA | 6 Stacks | A stack: last in, first out | stepped trace |
| DSA | 7 Queues | A queue: first in, first out | stepped trace |
| DSA | 10 Linear and Binary Search | Halving a sorted array | stepped trace |
| General | 2 Clients & Servers | One click, end to end | flow |
| General | 16 What Tests Can Prove | What each kind of test can prove | table |
| Node.js | 10 Streams | Why a stream reads a 2 GB file on a 512 MB box | flow |
| System Design | 4 Load Balancing | What a load balancer has to know | flow |

The three contrast pairs the interleaver cares about most (`map`, `filter` and `reduce`; stacks and queues; the two joins) use the same data and the same shape within each pair, so the difference between them is the only thing that differs.

## Deliberate omissions

- **HTML levels 2, 4, 5 and 6.** Links versus buttons, media delivery, content structures and repair are choices between named elements, which prose states better than a picture of two boxes.
- **CSS levels 1 and 6.** The cascade is a set of rules with a precedence order, and maintainability is a set of habits. A diagram of either would be a list drawn as boxes.
- **TypeScript beyond narrowing.** Types are already a notation, and a second notation adds a translation step. Narrowing is the exception: the same value has different types in different places, which is a relationship.
- **System Design beyond load balancing.** Most levels discuss trade-offs, where a diagram tends to assert one architecture as correct. Load balancing qualifies because its two preconditions (interchangeable servers, session state outside memory) are structural facts.
- **Lessons.** Learn lessons and learning-path lessons carry their own stepped traces (`kind: 'trace'`, rendered by `client/src/components/learn/LessonBody.tsx`).
- **Coding task briefs.** They carry worked examples through visible tests and the approaches panel. A diagram in the brief would compete with the editor.

## Accessibility

Every figure carries its content in words under a "This figure in words" disclosure: the numbers, the order and the result, not a description of the picture. A disclosure is available to everybody, unlike an `alt` attribute, and it keeps the figure safe to lose to a narrow screen, a failed stylesheet or a reading order that differs from the visual one. The validator rejects alt text shorter than 120 characters and alt text that opens by naming a picture ("A diagram", "An image", "The figure" and the like), because both are labels mistaken for content.

- **No meaning through colour.** Every marked cell, row and layer carries the word that says why it is marked: "middle", "found", "top", "only in the LEFT JOIN". The tint decorates a word that is already there.
- **Stepping is manual.** Previous, Next and Reset; no autoplay, dragging or timer. The frames are states, so a reduced-motion preference has nothing to turn off.
- **Focus stays on a control that still steps.** Reset, Next on the last step and Previous on the first turn themselves off, so focus moves to the button that still has something to do. The toggle and the step buttons are 44px tall.
- **The whole sequence is written out** below the controls, so a stepped figure reads without touching them.
- **Changes are announced.** The step description sits in a live region.
- **Assumptions are stated** where the answer would change without them: the `box-sizing` in effect, the container width behind an `fr` calculation, the `highWaterMark` behind a stream chunk size, the tie-break rule in a binary search.
- **Abbreviation help sits beside the figure** (`TermsBar`), never inside its labels.

## Answer leakage

A figure marked `afterSubmission` stays hidden until the level is finished, for the case where the picture would answer a question. None of the twenty-three is marked: each uses values that do not appear in its level's questions. The test still exercises the mechanism against a synthetic marked figure, so it works the first time an author needs it.

## What `npm run test:launch` checks

- Every figure names a real topic and a whole-number level inside that topic's range; `NaN` and fractions fail.
- Every figure has a title and alt text of at least 120 characters.
- No arrow is unlabelled: an unlabelled arrow means "somehow", the thing a diagram should replace.
- No mark is wordless; no table row has the wrong width; no frame or table marks a position it does not have, and a mark position is a whole number.
- A stepped figure has at least two frames.
- A figure appears only on the level it was authored for.
- A figure held until after submission is not returned before it.
- The named topics stay covered, so the set cannot collapse into whichever topic was easiest to author.

The test checks the level number, not whether the level's title still matches the figure, so moving a level's content needs a manual check of its figure.

Every number in every figure was worked by hand: the box model sums to 376px, the grid fractions divide 700px into 233.33 and 466.67, the binary search finds 23 in two comparisons taking the lower middle, the growth table's `n log n` at n = 1000 is 9,966, and the join returns three rows inner and four left.

## What this does not claim

Nothing here claims that a figure improves learning. The measurement that would matter is comprehension on a different example, not whether the figure was opened, and nobody has run it.
