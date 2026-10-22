# Retired Learn topics, and where the material went

Testing, Abbreviations and Code Snippets used to be Learn topics of their own. Each one let the format become the subject, so each was retired in a different direction:

- **Testing** spent six of fifteen levels defining what a test is. Its foundations became four General levels, and the applied material belongs in the topics it verifies.
- **Abbreviations** asked what letters stand for. A learner gets stuck meeting `CORS` mid-sentence, so the expansions became contextual help.
- **Code Snippets** collected language tricks with no tie to what the learner was building. Reading code became a question format any topic can use.

`shared/retired-content.ts` (`RETIRED_TOPICS`) records each retirement, its reason, the destination topic and the issue that decided it (#179, #177, #178).

## What a retirement keeps

**History.** Each retired topic keeps its category in `shared/subject-catalog.ts` and loses its topic. Every attempt, receipt and progress row written before the retirement still resolves to devShark: a learner who passed Testing level 7 still passed it, and the record renders with its own name. Delivery is gone: `defaultDeploymentCategories()` excludes the three, the roadmap does not list them, the skill check does not grant them, the category picker and the admin publish target do not offer them. `npm run test:launch` asserts each of those.

**Old links.** `/learn?topic=testing` explains where the material went and says the learner's record is untouched. It neither 404s nor redirects somewhere the learner did not ask for.

**Prerequisites.** No plan in `shared/progression.ts` names a retired topic. Frontend's fourth stage is General, and Backend and Fullstack name the destinations, so nothing is stranded and no gate became broader.

The old seed files (`lib/roadmap-questions-testing.ts`, `-abbreviations.ts`, `-html.ts`, `-css.ts`) stay in the repository for history and the inventory audit. No delivery path serves them.

## Testing → General levels 16 to 19

`lib/roadmap-questions-testing-foundations.ts` holds thirty-two original questions across four levels, scenario-first:

| Level | Objective |
| --- | --- |
| 16. What Tests Can Prove | A green build, a regression test, and choosing the scope that answers the question |
| 17. Read a Meaningful Test | Arrange/act/assert, assertions that miss the bug, boundaries, and what a call assertion does not verify |
| 18. Make Checks Reliable | Missing awaits, order dependence, the clock, doubles, sleeps, flakes, shared data |
| 19. Verify a Change | Reverting to check a regression test, skips, generated suites, risk, blast radius, and why no single number says "good enough" |

The levels correct two claims the old bank got wrong: a green build says the checks that ran passed, not that the change is safe, and a regression test proves one failure is caught, not that the bug can never return.

The applied material maps onto other topics: async assertions into JavaScript and Node, component behaviour into React and Next.js, authorization and persistence into Security and Databases, boundaries and counterexamples into DSA, isolated CI runs into DevOps, acceptance and evaluation into the FDE modules.

## Abbreviations → contextual help

`shared/glossary.ts` holds 32 reviewed terms: the expansion, one plain sentence about what it means in its domain, the domains that sense belongs to, and a review date. `TermsBar` (`client/src/components/ui/Terms.tsx`) renders one control per block of learner content, listing the abbreviations that block contains. Learn levels, the quiz, the coding workbench brief, lesson figures and lessons (`client/src/components/learn/LessonBody.tsx`) use it.

The control sits beside the block instead of inside the prose:

1. **Answer options are buttons.** An info button inside one would be a nested interactive control, and pressing it would select the answer.
2. **Code stays untouched.** Injecting anything into a snippet changes what the learner reads and, in an editor, what they run.
3. **Content is never rewritten.** Terms are found by matching the glossary against the text with word boundaries and exact case. No string is replaced and no markup is generated from content.

The help is neutral: the same list appears whichever option is correct, so it cannot coach one. `API` matches `API` and `APIs`, never the `api` inside `rapid`. A term with several senses is disambiguated by the content's topic; without a hint every sense is shown. `npm` has no expansion, because it is a name.

A term with no glossary entry gets no help. Extending the glossary is authoring work.

## Code Snippets → a question format

`shared/snippet-format.ts` defines the metadata: the language or notation, the kind of reading asked for (predict, find-bug, choose-implementation, trace, complete), the objective, prerequisites and any assumption the reader has to make. A question declares it in its seed's `snippet` field. A fenced code block alone does not make a snippet question; inferring the format from the text would make the coverage report and the interleaving rule meaningless.

Pacing is an authoring guideline with no code behind it: about one snippet in four, never three in a row, never two of the same subtype adjacent.

A snippet question is evidence that the learner can follow code. Coding tasks remain the evidence that they can write it.

Six JavaScript questions in `lib/roadmap-questions-js.ts` and one in `lib/roadmap-questions-restored.ts` declare the format today. Other topics have none.

## What retirement did not change

No XP was awarded or removed, no level completion granted or revoked, and no prerequisite became easier or harder to satisfy beyond a plan naming the destination in place of a retired topic.

## HTML and CSS: six levels each

HTML used to spend fifteen levels on tags and CSS nine levels on one library's class vocabulary. Both are now six levels of eight questions (`lib/roadmap-questions-html-core.ts`, `lib/roadmap-questions-css-core.ts`):

| HTML | CSS |
| --- | --- |
| 1. Structure & Semantics | 1. Cascade, Inheritance & Selectors |
| 2. Links, Buttons & Interaction | 2. Box Model, Flow & Overflow |
| 3. Forms | 3. Flexbox |
| 4. Images, Media & Responsive Delivery | 4. Grid & Responsive Layout |
| 5. Real Content Structures | 5. Positioning & Stacking |
| 6. Inspect & Repair | 6. Maintainable, Accessible Styling |

Each level asks what the browser does with what you wrote: which element brings the keyboard behaviour, why the page jumps when an image lands, which rule won and why, what created a stacking context you did not ask for. A framework appears only as an example of a mechanism; the one Tailwind question is about `@theme` generating custom properties.

Accessibility runs through the semantics, forms, media, content-structure and repair levels instead of sitting in a level of its own.

A topic gets one checkpoint per five levels. Only the checkpoint that ends a topic is titled "Final Mastery Exam" (`lib/roadmap.ts`), so a six-level topic has no "final" exam after level five, and General's checkpoint after level fifteen is no longer final either.
