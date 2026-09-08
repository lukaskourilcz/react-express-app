# Three sections devShark stopped teaching, and where the material went

Testing, Abbreviations and Code Snippets were each a learning path of their own.
None of them is any more. They were retired for the same reason from three
different directions: in each case the *format* had become the subject.

- **Testing** spent six of fifteen levels defining what a test is, two
  overlapping levels on doubles, and eight questions on the words red, green and
  refactor. What a working engineer needs is smaller and sharper.
- **Abbreviations** asked what letters stand for. Nobody is stopped by not
  having memorised an expansion in advance; they are stopped by meeting `CORS`
  in the middle of a sentence.
- **Code Snippets** collected language tricks with nothing tying any of them to
  what the learner was building. A snippet about closures belongs in JavaScript;
  one about queue costs belongs in DSA.

This document records what happened to each, and — importantly — what did not.

## Retirement is not deletion

Three things survive, deliberately:

**History.** Each section keeps its *category* in `shared/subject-catalog.ts`
while losing its *topic*. Every attempt, receipt and progress row written before
the retirement still resolves to devShark exactly as it did; a learner who
passed Testing level 7 still passed it, and their record still renders with its
own name. What is gone is delivery: `defaultDeploymentCategories()` excludes
them, the roadmap no longer lists them, the skill check no longer grants them,
the category picker no longer offers them, and the admin screen no longer offers
them as somewhere to publish. The launch contract asserts every one of those.

**Old links.** `/learn?topic=testing` explains where the material went and says
that the learner's record for it is untouched. It does not 404 and it does not
silently redirect somewhere they did not ask for.

**Prerequisites.** No plan in `shared/progression.ts` points at a retired topic.
Frontend's fourth stage is General rather than Testing, and Backend and
Fullstack name their destinations directly, so nothing is stranded and nothing
gained a broader gate than it had.

## Testing → General levels 16–19, plus the topics it verifies

`lib/roadmap-questions-testing-foundations.ts` — thirty-two authored questions
across four levels, scenario-first, none copied from the old bank:

| Level | Objective |
| --- | --- |
| 16. What tests can prove | A green build, a regression test, and choosing the scope that answers the question |
| 17. Read a meaningful test | Arrange/act/assert, assertions that miss the bug, boundaries, and what a call assertion does not verify |
| 18. Make checks reliable | Missing awaits, order dependence, the clock, doubles, sleeps, flakes, shared data |
| 19. Verify a change | Reverting to check a regression test, skips, generated suites, risk, blast radius, and why no single number says "good enough" |

Two claims the old bank got wrong are corrected throughout: a green build says
the checks that ran passed, not that the change is safe; and a regression test
proves one failure is caught, not that the bug can never return.

**The applied material.** The destination map from the decision — async
assertions into JavaScript and Node, component behaviour into React and Next.js,
authorization and persistence into Security and Databases, boundaries and
counterexamples into DSA, isolated CI runs into DevOps, acceptance and
evaluation into the FDE modules — is the plan for where the *remaining* useful
questions go.

**What has not been done, and why.** The old bank's 120 questions have not
received item-by-item dispositions. That is content-audit work: it requires
scoring each item against the quality and modern-relevance gates, which is
[#176](https://github.com/lukaskourilcz/react-express-app/issues/176), and #176
is explicitly outside the scope of this work. The old seed file remains in the
repository, unreferenced by any delivery path, so the audit has something to
work from. Nothing in it reaches a learner in the meantime.

## Abbreviations → contextual help

`shared/glossary.ts` holds the reviewed terms: the expansion, one plain sentence
about what it means in that domain, the domains that sense belongs to, and a
review date. `client/src/components/ui/Terms.tsx` renders one visible control
per block of learner content, listing the abbreviations that block actually
contains.

One control per block rather than an icon inside the prose, for three reasons:

1. **Answer options are buttons.** An info button inside one would be a nested
   interactive control, and pressing it would select the answer. A control
   beside the block never can.
2. **Code must not be touched.** Injecting anything into a snippet changes what
   the learner is reading and, in an editor, what they would run.
3. **Nothing rewrites content.** Terms are found by matching the reviewed
   glossary against the text with word boundaries and exact case. No string in
   the page is replaced and no markup is generated from content.

The help is neutral by construction: the same list appears whichever option is
correct, so it cannot coach one of them. `API` matches `API` and `APIs`, and
never the `api` inside `rapid`. A term with more than one sense is disambiguated
by the content's own topic; without a hint, every sense is shown rather than the
wrong one. `npm` carries no expansion, because it is a name and not initials.

Wired into the Learn lesson, the classic quiz, the coding workbench brief and
the learning-path lessons.

**Gap.** The glossary covers thirty-two terms. It is not every abbreviation in
the product, and a term with no entry gets no help rather than a guessed one.
Extending it is authoring, not engineering.

## Code Snippets → a format any topic can use

`shared/snippet-format.ts` defines the metadata: the language or notation, the
kind of reading asked for (predict, find-bug, choose-implementation, trace,
complete), the objective, prerequisites and any assumption the reader has to
make. It is **declared**, not inferred — a fenced code block is not by itself a
snippet question, and guessing from the text would make both the coverage report
and the pacing rule meaningless.

Pacing is a guideline with a rule attached: roughly one snippet in four, never
three in a row, and never two of the same subtype adjacent. A run of one shape
teaches the shape; a strict alternation teaches the pattern of the quiz.

Reading is not writing. A snippet question is evidence that the learner can
follow code; the coding tasks remain the evidence that they can produce it, and
neither substitutes for the other.

**Coverage today.** Six existing JavaScript questions now declare the format —
questions that already were code-reading questions and had already been
reviewed, so declaring it is the migration rather than new content. The other
topics have none yet, and the legacy `code-snippets` pool is retired from
delivery pending the same #176 audit as the Testing bank.

## What none of this changed

No XP was awarded or removed. No level completion was granted or revoked. No
prerequisite became easier or harder to satisfy except where a plan stopped
naming a retired topic and named its destination instead. Every learner's record
is exactly what it was the day before.

## HTML and CSS, rescoped rather than retired

HTML and CSS are not going anywhere — but the two paths had grown into the same
shape the retired sections had, for the same reason. HTML spent fifteen levels
on tags, and CSS spent nine levels largely on one library's class vocabulary.
Neither is what the browser actually decides.

Both are now six levels of eight:

| HTML | CSS |
| --- | --- |
| 1. Structure & Semantics | 1. Cascade, Inheritance & Selectors |
| 2. Links, Buttons & Interaction | 2. Box Model, Flow & Overflow |
| 3. Forms | 3. Flexbox |
| 4. Images, Media & Responsive Delivery | 4. Grid & Responsive Layout |
| 5. Real Content Structures | 5. Positioning & Stacking |
| 6. Inspect & Repair | 6. Maintainable, Accessible Styling |

Ninety-six authored questions, none carried over. The organising question in
each is what the browser does with what you wrote: which element brings the
keyboard behaviour, why the page jumps when an image lands, which rule won and
why, what a stacking context is and what created one you did not ask for. Where
a framework appears it appears as an example of a mechanism — the one Tailwind
question is about `@theme` generating custom properties, not about class names.

Accessibility is not a level. It is in the semantics level, the forms level, the
media level, the tables level and the repair level, because that is where the
decisions are made.

The old `roadmap-questions-html.ts` and `roadmap-questions-css.ts` banks stay in
the repository, unreferenced by any delivery path, until
[#176](https://github.com/lukaskourilcz/react-express-app/issues/176)
dispositions their items — the same treatment the retired banks got, and for the
same reason.

### A checkpoint that stopped lying

A topic gets one checkpoint per five levels, and the last one was titled "Final
Mastery Exam" whichever level it fell after. At six levels that put a "final"
exam after level five with a level still to come. The title is now derived from
whether the checkpoint actually ends the topic, which also corrects General —
nineteen levels since the Testing Foundations levels joined it, with its last
checkpoint after level fifteen.
