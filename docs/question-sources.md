# Question sources - mining the open-source learning repos

devShark is a dev-knowledge quiz, so the best raw material for new questions is
the same set of open-source study repos learners already trust. These are
**content sources**, not code dependencies - use them to draft questions in
`/dev → Question bank`, then edit for tone, difficulty weighting, and our category
taxonomy.

> Licensing: each repo has its own license (mostly CC-BY-SA / MIT / CC0). You're
> writing **original questions inspired by** the material, not copying prose
> verbatim. When a definition is lifted closely, attribute the source in the
> question's explanation and check the repo's license first.

## The four repos

| Repo | Best for these categories | How to mine it |
| --- | --- | --- |
| [donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer) | System design, backend, databases | Scalability, caching, sharding, CAP theorem - turn each concept box into a "which trade-off applies?" multiple-choice. Great for `advanced` / `zero-to-hero` difficulty. |
| [codecrafters-io/build-your-own-x](https://github.com/codecrafters-io/build-your-own-x) | Fundamentals across the stack | The tutorials expose *how things work under the hood* (git, a database, a browser). Mine the "why" - e.g. "what does a database WAL guarantee?" |
| [jwasham/coding-interview-university](https://github.com/jwasham/coding-interview-university) | Algorithms, data structures, CS fundamentals | Its topic checklist maps almost 1:1 to quiz categories. Each bullet (big-O, trees, hashing) is a question cluster; vary difficulty from `basics` to `advanced`. |
| [sindresorhus/awesome](https://github.com/sindresorhus/awesome) | Discovering *new* categories | The meta-list points to per-topic "awesome-x" lists. Use it to spot under-covered areas (e.g. a specific framework) worth a new category before writing questions. |

## Workflow

1. Pick a repo + a narrow topic (e.g. "caching strategies" from system-design-primer).
2. Draft 5–10 questions in `/dev → Question bank`, each with 4 options + an
   explanation. Prefer *conceptual* questions (why/when/trade-off) over trivia;
   they age better and are harder to Google mid-quiz.
3. Set the `difficulty` weight and `category` to match our taxonomy
   (`client/src/lib/categories.ts`).
4. Add a short source note in the explanation when you paraphrase closely.
5. Record a review for each new id in `docs/audit/devshark-content-ledger.json`
   and run `npm run build:curation-registry`. Every roadmap category is in the
   curation gate's scope, so a question without a record is withheld from
   learners.
6. Use `/dev → Learner flags` to see which questions learners flag as
   unclear/outdated and refine.

## Why not auto-import?

These repos are prose and checklists, not a question bank - quality comes from a
human turning a concept into a well-formed MCQ with a good distractor set.
Auto-scraping would produce low-quality trivia and risk license/attribution
issues. Treat this as a curated, human-in-the-loop pipeline.

### DSA Foundations E3, 22 October 2026

The Learn bank combines the path's 52 original checks (including code context),
62 corrected existing seeds and six original synthesis questions. The origin
mapping, previous ledger rows and 42 replaced foundation seeds are retained
in `docs/audit/wip/history/`. The latter are an unserved historical archive
with their original errors, not current learning material.
Every current item has its own exact-hash ledger review and second-reading
notes. Both passes were performed in the same Codex model session; these
records claim neither an independent reviewer nor execution of question snippets.

The closing readings use Princeton Algorithms' [analysis and cost models](https://algs4.cs.princeton.edu/14analysis/)
and [binary search trees](https://algs4.cs.princeton.edu/32bst/), the
[ECMAScript Map access requirements](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects)
and [MDN's sort contract](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort).
The explanations distinguish these models from engine guarantees. The readings
are original summaries, not copied source passages.


### DSA Advanced (E4, 22 October 2026)

The new bank has 120 questions in the approved 15-level order. Sixteen are
freshly worded/reviewed moves of the heap/graph concepts preserved in
`lib/roadmap-questions-dsa-advanced-holding.json`; 104 are original. The old
source remains intact and the id map lives in the E4 provenance history.
No question or task copies a university exercise, solution or employer prompt.

Further reading checked at authoring: MIT 6.006 Spring 2020 lectures 8–10, 13,
15–16, 18 and 20; Stanford CS106B Lecture 21 on tries; Waterloo CS341 Winter 2026
greedy notes; MDN’s Number bitwise and collection references. The Princeton
union-find claim was verified in its official indexed text; direct automated
fetches returned 403, so no full-page fetch is claimed. The eight lesson objects
carry exact source URLs and dates. Reviews are item-specific model self-reviews
with `independent:false`, not independent certification. New task checks use
original bounded fixtures in the production sandbox.
