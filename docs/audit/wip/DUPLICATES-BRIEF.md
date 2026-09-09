# devShark content audit — cross-batch duplicate pass

The first reviewers retired in-batch duplicates. The pairs in your input were flagged by wording similarity but reviewed in **different** batches, so nobody has decided them yet. For every pair, decide once whether devShark should keep both items or retire one.

Input: a JSON array of `{ "pair": [idA, idB], "a": item, "b": item }`, each item with `id`, `category`, `level`, `levelTitle`, `objective` (the reviewer's stated learning objective), and the final English as it will be served (`hint`, `question`, `options`, `correctAnswer`, `explanation`).

Rule: two items are duplicates when a learner who has answered one has shown everything the other tests — same rule, same misconception, same reasoning step. Different levels with the same objective are still duplicates. Similar surface (both "what does this print") with a different rule is **not** a duplicate. When they are duplicates, retire the weaker one: the one with the less complete snippet, the weaker distractors, the less transferable variant, or the one placed in a level whose title it does not serve. Never retire both.

Output — JSON Lines at the path in your task, one line per pair in input order:
```json
{"pair":["rm-js-101","rm-js-97"],"verdict":"keep-both","retire":null,"reason":"101 tests the closure's captured variable, 97 the call order; different rules."}
{"pair":["rm-ts-122","rm-ts-32"],"verdict":"retire","retire":"rm-ts-32","reason":"duplicate of rm-ts-122 (same keyof rule); 122 has the complete snippet."}
```
Do not edit any repository file. Keep each reason to one sentence that names the rule tested. Before finishing, confirm the line count equals the number of pairs.
