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
