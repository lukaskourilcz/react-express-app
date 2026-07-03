# Question sources — mining the open-source learning repos

devShark is a dev-knowledge quiz, so the best raw material for new questions is
the same set of open-source study repos learners already trust. These are
**content sources**, not code dependencies — use them to draft questions in
`/dev → Questions`, then edit for tone, difficulty weighting, and our category
taxonomy.

> Licensing: each repo has its own license (mostly CC-BY-SA / MIT / CC0). You're
> writing **original questions inspired by** the material, not copying prose
> verbatim. When a definition is lifted closely, attribute the source in the
> question's explanation and check the repo's license first.

## The four repos

| Repo | Best for these categories | How to mine it |
| --- | --- | --- |
| [donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer) | System design, backend, databases | Scalability, caching, sharding, CAP theorem — turn each concept box into a "which trade-off applies?" multiple-choice. Great for `advanced` / `zero-to-hero` difficulty. |
| [codecrafters-io/build-your-own-x](https://github.com/codecrafters-io/build-your-own-x) | Fundamentals across the stack | The tutorials expose *how things work under the hood* (git, a database, a browser). Mine the "why" — e.g. "what does a database WAL guarantee?" |
| [jwasham/coding-interview-university](https://github.com/jwasham/coding-interview-university) | Algorithms, data structures, CS fundamentals | Its topic checklist maps almost 1:1 to quiz categories. Each bullet (big-O, trees, hashing) is a question cluster; vary difficulty from `basics` to `advanced`. |
| [sindresorhus/awesome](https://github.com/sindresorhus/awesome) | Discovering *new* categories | The meta-list points to per-topic "awesome-x" lists. Use it to spot under-covered areas (e.g. a specific framework) worth a new category before writing questions. |

## Workflow

1. Pick a repo + a narrow topic (e.g. "caching strategies" from system-design-primer).
2. Draft 5–10 questions in `/dev → Questions`, each with 4 options + an
   explanation. Prefer *conceptual* questions (why/when/trade-off) over trivia —
   they age better and are harder to Google mid-quiz.
3. Set the `difficulty` weight and `category` to match our taxonomy
   (`client/src/lib/categories.ts`).
4. Add a short source note in the explanation when you paraphrase closely.
5. Use `/dev → Reports` to see which questions learners flag as unclear/outdated
   and refine.

## Why not auto-import?

These repos are prose and checklists, not a question bank — quality comes from a
human turning a concept into a well-formed MCQ with a good distractor set.
Auto-scraping would produce low-quality trivia and risk license/attribution
issues. Treat this as a curated, human-in-the-loop pipeline.
