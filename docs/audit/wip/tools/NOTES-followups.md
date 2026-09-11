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
- **32 items ship with no Czech at all.** The whole Testing Foundations block
  (General levels 16-19) has `cs: null`, so a Czech learner meets those levels
  in English today. The localisation pass writes them from scratch rather than
  repairing a translation.
- **Distractors that need no knowledge.** In the General bank roughly 35 of 51
  items in one batch carry two or more category-error options ("Sends emails",
  "Routes electrical signals" against a question about caching), so a learner
  who knows nothing can answer by elimination. This is the second systemic
  defect after the generic hint, and unlike the hint it varies by topic, so the
  report should give it per topic rather than as one number.
- **`rm-general-100` states a foreign key must reference a primary key.**
  PostgreSQL's documentation says any unique constraint may be the target.
- **`rm-git-47` teaches a default Git does not have.** Its explanation says
  modern repositories default to `main`. Git 2.43 still prints the hint that it
  is using `master` for the initial branch when `init.defaultBranch` is unset,
  and the documentation says the fallback changes only in Git 3.0. The rewrite
  moves the claim to hosting platforms and states Git's own behaviour.

## What the second reading catches that the first pass introduces

The JavaScript beginner batch amended 17 of 45 rewrites, the highest rate in
the audit, and the pattern is worth stating plainly: a reviewer that has just
worked out why an item is hard tends to put that reasoning into the hint, which
is precisely what a hint must not contain. Eleven of the seventeen were that.
Three more were new factual errors in rewritten explanations — a `push` variant
said to return the array when it returns the new length, a slice described as
"the opposite order" when it is the same order without the uppercase step, and
`"he"` attributed to a wrong start index rather than a wrong end. None of the
three would have been caught by re-running the item's own key, because the key
was right and only the reasoning about a distractor was wrong. That is the case
for a second reader rather than a second automated check.
- **`rm-db-57` states UNIQUE absolutely.** PostgreSQL treats two nulls as
  distinct under a unique constraint unless the constraint declares `NULLS NOT
  DISTINCT` (PostgreSQL 15 and later), so the item is wrong for the engine the
  product itself runs on.
- **`rm-db-47` Czech reverses the English.** "Spojení vyžaduje SQL" says SQL is
  required by joins rather than joins are required by SQL. The clearest single
  translation defect the audit has found.
- **System Design fails on presentation, not facts.** All 60 keys in its first
  batch are correct and singly defensible — the only topic so far with no
  correctness blocker at all. It fails on the generic hint, on 28 items with
  nonsense distractors ("Email", "Add SPOFs", "Writes are dropped"), and on 26
  whose key runs between 1.6 and 5.7 times the average distractor length. The
  report should say this plainly: a bank can be entirely true and still
  unusable, because a learner who reads only the shape of the options answers
  most of it correctly.
- **Next.js carries the most version rot, as expected.** Three items teach
  `params` and `searchParams` as plain objects; they have been Promises since
  version 15. Two leave the caching default unstated, which preserves the
  pre-15 "cached by default" model in the learner's head. One anchors itself to
  "Next.js 13+". Eleven of sixty are near-duplicate clusters. The Pages-Router
  items are correctly labelled legacy and were kept, which is the right
  treatment: legacy knowledge with a stated maintenance context passes the
  relevance gate, legacy taught as current does not.
- **Twelve Security items have a hint that names the answer.** The generic
  fallback ends "Focus on `<tag>`", and in twelve items that tag is the keyed
  option word for word while the stem withholds it. That is not a weak hint but
  a spoiling one, recorded as `misleading-hint`, and it means the generic hint
  is not uniformly harmless filler: where the fallback interpolates a tag, it
  can hand over the answer. Worth a mechanical sweep of the whole bank for
  items whose hint contains the keyed option's distinguishing word.
- **Password-storage advice is a generation behind.** Three Security items list
  bcrypt, scrypt and Argon2 as interchangeable. The current OWASP guidance
  ranks Argon2id first, scrypt second, PBKDF2 for FIPS, and bcrypt for legacy
  systems only; one item also places a pepper in application config where the
  guidance requires a vault or HSM.
- **Key position is not uniformly harmless after all.** In the second Security
  batch the key sits at option index 1 in 57 of 60 items. Delivery shuffles
  options, so this does not help a learner in the product, but it does mean the
  authored bank was written to a template; rewrites that rebuild options should
  vary the position so the source stops encoding it.
- **The OWASP references are a full edition behind.** Five items cite the 2021
  Top Ten by name or by category title; the 2025 edition renamed several
  categories and folded SSRF into A01. One item also asserts the naive
  double-submit cookie pattern is unforgeable, which the OWASP CSRF cheat sheet
  explicitly says is bypassable by anyone who can write a cookie on the domain.
- **A measurement in the bank does not reproduce.** `rm-node-181`'s explanation
  cites thread-pool timings that a second reader could not repeat on a
  four-processor machine: it claims 695 ms at `UV_THREADPOOL_SIZE=32` where
  contention bites, but with only eight queued tasks a pool of 32 never runs
  more than eight threads, and the measured figure was about 200 ms. The
  explanation now states reproducible figures. This is the one class of claim
  no amount of documentation checking would have caught, and it argues for
  re-running any item that quotes a number.
- **Next.js 16 moved again during the audit.** The interceptor file is now
  `proxy.ts` and defaults to the Node.js runtime, `priority` on the image
  component is deprecated in favour of `preload`, single-argument
  `revalidateTag()` is a type error, and the error boundary's prop is `retry`
  rather than `reset`. Seven items teach the previous shape. One explanation
  says nested metadata merges; the documentation says the merge is shallow and
  a nested object is replaced wholesale, and the Czech repeats the error.
- **The audit's first retain.** `rm-devops-1` is the only item in 1,800 reviewed
  so far that passed both gates as written, and the reason is exactly the one
  the audit exists to find: it is the only item whose hint was written for its
  own question rather than taken from the six-sentence fallback set.
- **DORA now publishes five metrics, not four.** `rm-devops-5` teaches the old
  set and the old name; dora.dev renamed mean time to restore as failed
  deployment recovery time and added deployment rework rate.
- **`rm-devops-35` teaches a mistake that causes real deploys.** Its key says
  workflow jobs run in sequence; GitHub Actions documents that jobs run in
  parallel unless a dependency says otherwise, which is precisely how a deploy
  job runs despite failing tests.
- **The audit's first rejection.** `rm-react-73` was rejected by the second
  reader rather than amended: it duplicates `rm-react-77` in the same batch and
  two of its four options are not coherent code (one calls an undeclared
  setter, another declares a ref where the item needs state). A rejection
  becomes a quarantine, so the item is withheld rather than served on its old
  wording, which is the behaviour the pipeline was built for.
- **"Too many re-renders" is not thrown for an effect loop.** A second reader
  found the distinction the bank blurs: React throws that error only for a
  render-phase update. A `setState` loop inside an effect hits the passive
  limit, which logs an error and keeps going — the run reached 301 renders
  without throwing. Items claiming a throw for the effect case were scoped to
  what actually happens, and to development builds, since the production bundle
  does not contain the message at all.
- **Two Node items denied that ESM can read CommonJS exports.** Both
  explanations said an ES module "does not read" `module.exports.x = 1` or a
  whole-object assignment. Node 22 does: a named import from a `.cjs` file
  returned the values, and a default import returned the assigned object. This
  is the kind of claim that was true of an older Node and was never revisited.
- **React freezes props in development.** `rm-react-122` explained that
  assigning to `props.count` "mutates an object React will not look at again".
  In a development build React freezes props, so the assignment throws a
  TypeError; under a production build it does not. The item described neither
  behaviour correctly.
- **Two "measured" sentences in rewrites described something that was not
  measured.** One quoted three interval ticks after unmount where a run gives
  eight; another described a component that is not in its own snippet. Both
  came from the first pass, and both are the reason the second reader re-runs
  measurements rather than trusting the sentence.
- **Complexity taught without its case.** The DSA bank states push and pop as
  O(1) with no mention that it is amortised for an array-backed stack, hides a
  queue claim behind "well implemented" without saying that
  `Array.prototype.shift` is the implementation learners reach for and does not
  meet it, and asserts average-case hash lookup with no bounded-load-factor
  assumption. The reviewer counted operations with proxy index counters rather
  than timing: `shift` touched 40 indexed reads at n=40 where `pop` touched
  one, at every size. That is the right kind of evidence for this topic, and
  the items that already name their case are the strongest in the bank.
- **An outcome label is prose; a value is code.** The Czech pass surfaced a
  question the brief had not answered: is the option `Error` a value to keep in
  English or a description of what happened? Different batches answered
  differently. Settled: an option that names the outcome (`Error`, `Type
  error`, `Compiles`, `Nothing`) takes its Czech form, and an option a learner
  would type or see printed (`undefined`, `null`, `NaN`, `TypeError`, `string`,
  `"ACTIVE"`, `42`) stays byte-for-byte English. The test is whether the text
  is the value or a description of it. `normalise-cs.py` applies the rule to
  rows written before it was settled; run it once every Czech batch has
  finished, never while one is still appending.
- **The Czech translations were checked against the English that ships, not the
  English that was reviewed.** Three items in one batch had a served Czech
  question still showing the pre-rewrite snippet — an old array, a stale
  comment, a `Promise.all` that the rewrite had removed. The translator noticed
  because it works from the final English rather than from the served Czech,
  which is the right direction of travel and the reason the localisation pass
  runs after the rewrites are applied rather than beside them.
- **The Testing retirement holds up under review.** Its first half retired 49 of
  60 items outright and redistributed 11, most into General levels 16-19, Node
  level 24, DevOps levels 3 and 11, and Databases level 11. That is the answer
  the retirement decision needed and never had: the section was not carrying
  material the rest of the map lacks.
- **One AI item's Czech asks a different question entirely.** `rm-ai-50` serves
  a Czech item about which 2017 paper introduced the transformer, where the
  English asks about the quadratic cost of attention. Every one of the 25 items
  in that range is drift of some degree.
- **A tokenizer rule of thumb stated as fact.** One item gives "one token is
  about four characters, about 0.75 words" as a general truth. Measured across
  tokenizers the range is 0.72 to 0.90 words per token, and Anthropic's own
  documentation gives roughly 3.5 characters. The key survives; the explanation
  needed the hedge.
- **The second reader corrected the first pass's correction.** `rm-general-132`
  claimed a boundary test catches swapping `<` for `<=` in a clamp. The first
  pass replaced that with "or a comparison against the wrong bound", which is
  also false: a clamp written against the wrong bound agrees with a correct one
  at the boundaries and differs only at the inside values. The second reader
  ran the probe set and credited each input with the bug it actually catches.
  Two passes were needed to get one sentence right, which is the strongest
  single argument in the audit for not shipping on one reading.
- **The AI bank teaches an API shape the vendors no longer have.** One item
  keys "roles such as system, user, and assistant"; Anthropic's Messages API
  states there is no system role for input messages, it is a top-level
  parameter, and OpenAI's current guide documents developer, user and
  assistant. Three more items assume temperature is settable, which newer
  Claude models reject outright. The rewrites state the assumption rather than
  dropping the concept, which is the right treatment: the idea of sampling
  temperature is still worth teaching even where one vendor has fixed it.
- **Express 5 changed the catch-all route.** One General item gives `*`, where
  the Express 5 migration guide requires a named wildcard such as `/*splat`.
- **A claim that was false in the level that teaches it.** One item said
  changing a query parameter always means a new request. Under `history.pushState`
  it does not, and client-side routing is the subject of that very level.
- **A graph item with no representation stated.** `rm-dsa-116` asks the time
  complexity of depth-first search while `O(V²)` sits in its option list. That
  is exactly the adjacency-matrix cost, so with no representation in the stem
  the option is defensible: measured at 64,000 vertices, the matrix walk
  inspects about four billion cells against two hundred thousand list
  operations. The sibling breadth-first item has the same omission but no
  matrix-consistent option, so it is a wording defect rather than a second
  answer. The reviewer brief now names this check, because no automated flag
  can see it.
- **A redistribution proposal checked against its destination, and one failed.**
  The Testing section's 11 surviving items each named a topic and level to move
  to. The second reader looked each destination up in the destination bank
  rather than taking the proposal on trust, and rejected `rm-testing-18`: the
  General level it proposed already keys the same choice with a sharper
  scenario, and two neighbouring items already cover its distractors. It should
  have been retired with the other 49. The other ten destinations hold, though
  one is weak: a Jest-framed item landing in a Node level that otherwise
  teaches the built-in runner.
- **The audit left its own working notes in learner copy.** Three Git items
  shipped evidence artifacts from the first pass: "(verified: `A`, `M` and `D`
  entries after one run)", "(here `6265b34` became `d6fc251`)", and a sentence
  naming `git version 2.43.0` as though it were the learner's own build. A
  System Design item printed an internal item id, and an earlier React item did
  the same. This is now five occurrences across four topics, so it is a
  recurring failure mode of the rewrite step rather than a slip: a reviewer
  writing an explanation immediately after running a check tends to carry the
  check into the explanation. Worth a mechanical sweep of every applied rewrite
  for item ids, commit hashes and tool version strings before the branch merges.
- **A hint that inverts the arithmetic.** One System Design storage estimate
  told the learner to multiply the exponents, where they add — following it
  turns 10^9 x 10^3 into 10^27.
- **A CRDT explanation that described the opposite of a CRDT.** It grouped them
  with strategies that drop writes or make the application resolve conflicts;
  automatic deterministic merge is their defining property.
- **The mechanical sweep found the leak in a fourth form: audit jargon.** The
  sweep for item ids, commit hashes and tool version strings came back clean —
  the second readings had already removed all five occurrences recorded above.
  But widening it to the audit's own vocabulary caught four items whose
  learner-facing copy called an option a "distractor": `rm-algorithms-50` and
  `rm-ts-18` in their explanations, `rm-security-26` in its explanation, and
  `rm-db-25` in its hint. Two of them ("One distractor also rearranges rows",
  "which is the distractor here") also point at a specific option, which the
  server's answer shuffle makes meaningless. All four are fixed. The lesson for
  the next wave is that the sweep has to cover the reviewer's working
  vocabulary, not only artifacts that look machine-generated: a reviewer
  explaining why a wrong answer is tempting naturally reaches for the word the
  brief taught them.
