# Follow-ups raised by reviewers, to settle in one pass rather than per item

- **The falsy list and `document.all`.** `rm-js-137` and `rm-js-144` both state
  the complete falsy list as `false, 0, -0, 0n, "", null, undefined, NaN`.
  That is exact for ECMAScript values; in a browser MDN also lists
  `document.all` (https://developer.mozilla.org/en-US/docs/Glossary/Falsy).
  Harmonise both sentences at once, so the two items cannot disagree.
- **`rm-js-147` distractor `{ a: 1, a: 2 }`.** A legal literal evaluating to
  `{ a: 2 }`. Defensible only if options are read as source rather than as
  results; the explanation says an object cannot hold a key twice.
  `answerOptions` is already capped at 3. Decide once whether the bank shows
  results or source in options of this shape.
- **`rm-js-189` case-only distractor `"Function"`.** Kept: the key is still the
  only defensible answer and no stronger distractor was available.
- **`rm-node-62` and `rm-node-64` Czech drift.** The reviewer recorded that the
  Czech tracks an older English stem for both; the localisation pass must
  retranslate rather than keep.
- **`rm-ts-36` and `rm-ts-40`.** The second reader flagged them as teaching the
  same excess-property rule, differing only in call-site versus assignment
  position. Both are sound as written; the duplicate pass should decide once
  whether the second position is worth its own item.
- **Hint calibration inside a batch.** The `ts-a` reader deliberately matched
  the line the earlier rows of the same file had drawn rather than a stricter
  one of its own, so a resumed batch stays internally consistent. Keep that
  rule: a resumed second reading calibrates to the rows already in its file.
- **`rm-node-191` wrong key.** `assert.strictEqual` uses `Object.is`, not `===`:
  verified on Node 22 that `strictEqual(NaN, NaN)` passes and
  `strictEqual(0, -0)` throws, the opposite of `===` in both cases. The
  reviewer's rewrite fixes it; this is one of the two wrong keys the audit
  found in the bank.
- **Snippets that never compiled.** `rm-ts-93` and `rm-ts-142` ship code with
  an undeclared identifier (`TS2304`), so the question asked about a program
  that does not exist. Both rewrites supply the declaration.
- **`rm-node-32` "which is NOT a Node global?"** `__dirname` is not a global
  either: `Object.hasOwn(globalThis, "__dirname")` is false in CommonJS and it
  is a `ReferenceError` in ESM, and the Node 22 documentation says so
  explicitly. The item's explanation asserted the opposite. The rewrite asks
  about availability inside a CommonJS module, which turns the bug into the
  lesson.
- **`rm-react-51` rewrite has options without `correctAnswer`.** Only the fourth
  option changed, so the key stays at index 1, but the applying pass should set
  `correctAnswer` explicitly rather than rely on the old value surviving.
- **StrictMode caveat missing across React effect items.** `rm-react-81`, `85`,
  `93`, `97` and `98` state production behaviour without saying what a learner
  running the development build actually sees (setup, cleanup, setup). Decide
  once whether the bank teaches the production model with a development note,
  or the development model outright.
