# Question sources

Learn questions are original. Open study repositories are good raw material for ideas: use them to find concepts worth asking about, then write the question, options and explanation yourself.

Each repository has its own license (mostly CC-BY-SA, MIT or CC0). Write original questions inspired by the material and never copy prose. When a definition follows a source closely, check the license first and name the source in the explanation.

## Repositories worth mining

| Repository | Best for | How to use it |
| --- | --- | --- |
| [donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer) | System design, databases | Turn a concept (caching, sharding, CAP) into a "which trade-off applies here?" scenario. |
| [codecrafters-io/build-your-own-x](https://github.com/codecrafters-io/build-your-own-x) | How tools work underneath | Ask the "why": what a database's write-ahead log guarantees, what git stores for a commit. |
| [jwasham/coding-interview-university](https://github.com/jwasham/coding-interview-university) | DSA and algorithms | Its topic checklist maps onto the DSA and Algorithms levels; each bullet is a question cluster. |
| [sindresorhus/awesome](https://github.com/sindresorhus/awesome) | Gaps in coverage | Its per-topic lists show areas a topic does not cover yet. |

## Workflow

1. Pick a narrow concept and the Learn level whose objective it serves (`LEVEL_TITLES` in `lib/roadmap.ts`).
2. Write the seed in that topic's `lib/roadmap-questions-<topic>.ts`, following `.claude/skills/learn-question-authoring/SKILL.md`: four options, one key, an explanation that says why each wrong option fails, and a hint. Prefer why, when and trade-off questions over trivia. A seed's position sets its level and difficulty; nothing is set by hand.
3. Name the source in the explanation when you paraphrase closely.
4. Record a review for the new id in `docs/audit/devshark-content-ledger.json` and run `npm run build:curation-registry`. Every Learn category is in the curation scope, so a question without a passing record for its exact content is withheld from learners ([curation claims](curation-claims.md)).
5. Read `/dev` → Learner flags to see which questions learners report, and fix them the same way.

A question drafted in `/dev` → Question bank is stored as an override and stays withheld until the ledger holds a review of its exact wording, so the seed files are the place to author.

Scraping these repositories into questions is not an option: they are prose and checklists, and a good multiple-choice question needs a person or reviewed model to turn a concept into a scenario with a plausible distractor set.

## Provenance of the DSA banks

The DSA (`lib/roadmap-questions-dsa.ts`) and DSA Advanced (`lib/roadmap-questions-dsa-advanced.ts`) banks are 120 questions each. Every item has its own exact-hash model review in the ledger; the records claim no independent reviewer and no execution of question snippets.

- **DSA** combines the original checks of the retired DSA path, corrected existing seeds and original synthesis questions. The seeds it replaced, the earlier ledger rows and the origin mapping are kept unserved in `docs/audit/wip/history/` as a record with their original errors. The closing readings draw on Princeton Algorithms' [analysis and cost models](https://algs4.cs.princeton.edu/14analysis/) and [binary search trees](https://algs4.cs.princeton.edu/32bst/), the [ECMAScript Map requirements](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects) and [MDN's sort contract](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort). The explanations separate these cost models from engine guarantees.
- **DSA Advanced** follows its fifteen-level order. Sixteen questions are reworded moves of the heap and graph concepts kept in `lib/roadmap-questions-dsa-advanced-holding.json`; the other 104 are original. Further reading checked at authoring: MIT 6.006 (Spring 2020) lectures 8 to 10, 13, 15 to 16, 18 and 20; Stanford CS106B lecture 21 on tries; Waterloo CS341 greedy notes; MDN's Number bitwise and collection references. The eight Advanced lessons carry their exact source URLs and dates.

No question or task copies a university exercise, a solution or an employer prompt.
