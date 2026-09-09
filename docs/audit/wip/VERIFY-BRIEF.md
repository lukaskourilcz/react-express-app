# devShark content audit — second-reading brief

You are the second reader for **devShark** (free, bilingual English/Czech web-development learning). A first reviewer scored every item in your batch and wrote a rewrite (new hint, usually a fuller explanation, sometimes rebuilt options or a changed key). Nothing has been applied yet. Your job: read **every rewritten item as it will be served**, try to break it, and either accept it, amend it, or reject it. You are the last check before the wording reaches learners, so be adversarial: assume the first reviewer made a mistake and look for it.

## Non-negotiables
1. **Every item, individually**, in batch order; one JSON object per line; append as you go (see Output). No sampling, no "same as above".
2. **Never fabricate verification.** An `evidence` entry is the literal output of code you ran (`node:` / `tsc:` / `run:`), a URL you fetched in this session, or `knowledge:` for a well-established fact. If a correctness-critical claim cannot be verified with the tools here, say so and use verdict `reject` with `problems: ["unverifiable: …"]`.
3. **Do not edit any repository file.** Read the batch, run checks in the scratch directory, write the output file.
4. **Report, do not soften.** A key you cannot defend is a defect even if the item reads well.

## Input
A JSON array. Each item: `id`, `category`, `level`, `levelTitle` (the learning objective as the learner sees it), `difficulty` (1–5), `risky` (true when the rewrite changed `question`, `options` or `correctAnswer`), `original` (the currently served English: `hint`, `question`, `options`, `correctAnswer`, `explanation`), `final` (the English **as it will be served** after the rewrite, same five fields), `changed` (which fields the rewrite changed), `reviewer` (`objective`, `rationale`, `evidence`, `defects`, `rescored` scores). The learner sees `hint` before answering and `explanation` after.

## What to check on every item
1. **Key.** Is `final.options[final.correctAnswer]` the one correct answer under the stated assumptions? If the answer depends on runtime behaviour (output, logged value, throw, inferred type, what a query returns), **run it** — `node -e '…'` (Node 22), or a temp `.ts` with `npx tsc --noEmit --strict` — and record the literal result. For version-dependent claims (defaults, deprecations, framework behaviour: React 19, TypeScript 5.x, Node 22, Next.js 15, current MDN baseline) fetch the primary page and cite it. For facts you are certain of, `knowledge:`.
2. **Exactly one defensible answer.** Read each distractor as a lawyer for it: is there a reading of the question under which it is also right? If yes, the item has `multiple-defensible` and must be amended (state the assumption in the question, or replace the distractor) or rejected.
3. **Hint.** Specific to this question and this misconception; one or two sentences (≈30 words at most); does not restate the answer, name or paraphrase an option, or eliminate every alternative but one; is not the generic filler ("Trace the code one line at a time…", "Identify the requirement…", "Explain the term in your own words…", "Name the requirement or behavior first…", "Check the statement against the normal case…", "Read the code once for control flow…"). A hint that gives the answer away is a defect: amend it.
4. **Explanation.** Says why the key is right **and** why the strongest distractor is wrong; two to four sentences; every factual claim in it is true (check them — an explanation that is wrong is worse than a thin one); mentions runtime/version where behaviour depends on it.
5. **Options.** Exactly four; comparable length, grammatical shape and specificity; no "all/none of the above"; no repeated wording that reveals the key; no conspicuously detailed correct option; no two options that mean the same thing.
6. **Question.** One clear question; assumptions stated (strict mode? module or script? which runtime?); fenced code blocks and backticks intact; no answer leaked in the code or the wording; fits `levelTitle` and `difficulty`.
7. **Style.** Plain and short; no "delve", "leverage", "seamless", "master", "robust", no marketing tone, no em-dash chains, no exclamation marks. The bank uses **American spelling** (serialize, behavior, color, normalize) — a British spelling introduced by a rewrite is an amend.
8. **Hint independence.** The commonest defect the first pass introduces is a hint that states the very rule the item tests, or that rules out every option but one. Read the hint alone and ask: could a learner who has not read the code pick the key from it? If yes, amend it to point at what to notice rather than at what to conclude.

## Verdicts
- `accept` — the final item passes all seven checks as written.
- `amend` — one or more local fixes make it pass: give **only** the changed fields in `fields` (any of `question`, `options` (array of 4), `correctAnswer`, `hint`, `explanation`), keep the id and the objective, keep four options, and give `rescored` only when a score changes (same shape as the reviewer's `rescored`: `quality` seven dimensions 1–5, `qualityScore` = minimum, `relevance` five markers 0–2, `relevanceScore` = sum). An amended item must still pass both gates (quality ≥ 3, relevance ≥ 4). Prefer the smallest change that fixes the defect. Do not reorder options merely to move the key.
- `reject` — the item cannot be made sound locally (wrong premise, no single defensible answer without becoming a different question, correctness you could not verify, duplicate of a better item in the same batch — name it). A rejected item is withheld from learners until a later pass; say exactly why in `problems`.

## Output — JSON Lines, written as you go
One file, the `.jsonl` path in your task. One object per line, in batch order. **Append after every 8–10 items** (`>>` heredoc); never rewrite the file. If the file exists when you start, read its ids and continue from the first item not in it. Schema (one line each):
```json
{"id":"rm-js-1","verdict":"accept","fields":null,"rescored":null,"problems":[],"evidence":["node: 2 ** 3 + 1 → 9"],"notes":""}
{"id":"rm-js-2","verdict":"amend","fields":{"hint":"…"},"rescored":null,"problems":["hint names the correct option"],"evidence":["knowledge: …"],"notes":""}
{"id":"rm-js-3","verdict":"reject","fields":null,"rescored":null,"problems":["multiple-defensible: option 2 is also true when …"],"evidence":["node: …"],"notes":""}
```
**Use the repository's own toolchain, not whatever is on the PATH.** Bare `npx tsc` in a scratch directory resolves to a globally installed TypeScript (6.x, where `strictNullChecks` is already on) and will give you answers the product does not produce. Run `/home/user/react-express-app/node_modules/.bin/tsc` and record the version; require `react`, `react-dom`, `express` and the rest from `/home/user/react-express-app/node_modules` for the same reason.

Group executable checks (10–20 items per `node` invocation) and record each item's result separately. Keep `evidence` to three entries and `notes` to one sentence. When finished, re-open the file, confirm every line parses and the line count equals the batch length, and report the counts by verdict in one line.
