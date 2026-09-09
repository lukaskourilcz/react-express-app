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
- **Hooks called at module scope.** `rm-react-105`, `108`, `145` and `147` ship
  snippets whose `useRef`/`useState` call sits outside any component, so the
  code throws `Invalid hook call` rather than doing what the question asks
  about. One item was retired; the rest are rewritten with the call inside a
  component. Worth a mechanical check across the React bank for the same shape.
- **The Czech hint is one sentence for the whole bank.** Every Czech item
  carries "Pozorně si přečti kód a odhadni, co dělá nebo co vrací", which is
  not a translation of the English hint and tells the learner to read code that
  prose-only items do not contain. The localisation pass replaces all of them.
- **The HTML bank's Czech is a different bank.** All 48 Czech items translate
  the older abbreviation-and-tag-definition questions ("Co znamená zkratka
  HTML?"), not the rescoped English ones, and the automated drift detector
  caught only 12 of them. The topic needs retranslating whole, and the
  detector's miss rate is worth reporting: it flags changed code, and these
  items changed their subject without changing any code.
- **`rm-node-140` explanation reverses the event-loop ordering.** It says a
  `setImmediate` often runs after a zero-millisecond timeout inside an I/O
  cycle. Run inside an `fs.readFile` callback the order is immediate first, and
  the Node documentation says the immediate "is always executed first" there.
  The key is right and the explanation is wrong, and the Czech reproduces the
  same error faithfully — the one place in the audit where a translation is
  accurate to a mistake.
- **Four items teach the same rules-of-hooks rule.** `rm-react-50`, `91`, `114`
  and `186` each state that hooks cannot be called conditionally. They sit in
  four different batches, so no first reviewer could see the overlap; the
  cross-batch duplicate pass decides which one survives. The version carrying
  code is the strongest candidate.
- **`rm-react-177`/`181` overstate `memo`.** Both say a memoized component
  re-renders only when its props change. It also re-renders on its own state
  change and on a context change, which react.dev states and the reviewer
  measured. `rm-react-185`/`192` claim a render loop repeats forever; React
  throws "Too many re-renders" instead.
- **Status-code items state convention as specification.** `rm-general-31`
  keys 403 as "you are known but not allowed", while RFC 9110 says a request
  "might be forbidden for reasons unrelated to the credentials";
  `rm-general-32` keys 404 as "does not exist", while the specification also
  covers a server unwilling to disclose that it does; `rm-general-39` claims a
  301 "passes link equity", which Google's own redirect documentation does not
  state. All three are rewritten to what the specification says.
- **`rm-general-12` hard-codes TCP.** HTTP/3 carries requests on QUIC streams
  over UDP, so the key is wrong for the current protocol; rewritten to "the
  connection the request arrived on".
- **`rm-general-34` back-references "that URL" from `rm-general-33`.** Every
  delivery path shuffles, so the reference breaks. Worth a mechanical sweep for
  other items that lean on their neighbour.
