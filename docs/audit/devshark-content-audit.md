# devShark content audit — first wave

The item-by-item audit that
[#176](https://github.com/lukaskourilcz/react-express-app/issues/176) asks
for, as far as it has run. This report says what was counted, what was read,
what changed as a result, what the product now claims, and what has not been
done. The machine-readable record is `docs/audit/devshark-content-ledger.json`;
the runtime projection of it is `lib/curation-registry.ts`; the gate that
applies it is described in `docs/curation-claims.md`.

Last updated «DATE». Wave 1 covers the CSS, JavaScript, TypeScript, React and
Node.js banks in part: «REVIEWED» of their «WAVE_ITEMS» served items have a
decision, «REMAINING» do not yet.

## 1. What a learner can be served, counted

Every place a devShark question can reach a learner was reconciled from the
code (`npm run audit:devshark-inventory`). The numbers are the repository's;
the one source that could not be counted is named below.

| Pool | Items | Reaches learners | Reviewed in wave 1 |
| --- | ---: | --- | ---: |
| Active roadmap banks (18 topics, 8 questions a level) | 2,128 | Learn, part tests, quiz, daily, challenge, placement, review, Play, flashcards, Today | «REVIEWED» |
| Retired sections (abbreviations, testing, code-snippets, fix-the-test) | 319 | History only: refused by every delivery request | 0 |
| Unreferenced banks (cool-stuff, the pre-rescope HTML and CSS banks) | 312 | No delivery path | 0 |
| Legacy core bank (`coreQuestions`) | 795 | No devShark delivery path | 0 |
| Coding tasks | 249 | Practice, Learn level closers, learning paths | 0 (coding wave pending) |
| Operator overrides (`question_edits` table) | unknown | Merged over the bank at request time | cannot be counted from here |

The `question_edits` table holds operator edits and operator-authored
questions. No database credentials were available to this audit, so its
contents are unknown, which is what keeps every bank-wide sentence in the
product at "partial" or "none": a source that cannot be counted cannot be
claimed. The gate still applies to it — an edited item is withheld as
`superseded` in a completed category and served with no claim elsewhere —
because the rule runs on the merged set, not on the static bank.

## 2. How the review was done

**Rubric.** The issue's rubric, verbatim in substance
(`docs/audit/wip/REVIEWER-BRIEF.md`): seven quality dimensions scored 1–5
(topic relevance, learning value, technical correctness, wording and stated
assumptions, answer options, hint, explanation), the quality score being the
**minimum** dimension, never an average, with hard caps at 2 for a wrong key,
more than one defensible answer, or a hint that misleads or spoils; five
modern-relevance markers scored 0–2 (present-day validity, practical utility,
transferable understanding, audience fit, risk or outcome) summed to 0–10.
Quality gate ≥ 3, relevance gate ≥ 4, both required, neither offsetting the
other. Every item was scored individually against its level's stated
objective; no item was sampled or scored by file.

**Evidence.** A key that depends on runtime behaviour was executed (Node 22,
TypeScript 5.x with `--strict`, React 19 rendered through `react-dom`) and the
literal result recorded; a versioned or factual claim the reviewer was not
certain of was checked against the primary documentation and the URL cited;
well-established facts are marked `knowledge:`. An item whose correctness
could not be verified is `quarantine`, never `retain`.

**Two readings, then a duplicate pass, then Czech.** A first reviewer scored
every item and drafted the rewrite. A second reader, briefed to refute
(`docs/audit/wip/VERIFY-BRIEF.md`), then read every rewrite as it would be
served — key, single defensible answer, hint, explanation, options, wording,
style — re-running the executable checks, and accepted, amended or rejected
it; a rejected rewrite becomes a quarantine, so nothing reaches a learner on
one reading. Pairs flagged as similar across batches were decided once by a
third pass (`docs/audit/wip/DUPLICATES-BRIEF.md`). Finally a localisation
pass wrote the Czech for every rewritten field (`docs/audit/wip/CS-BRIEF.md`),
keeping the served Czech verbatim where the first reviewer had verified it
and only the hint changed; a mechanical parity check confirms four options,
unchanged code and identifiers, and nothing left in English.

**Who reviewed.** Every pass was performed by a language model working from
the briefs above, with the checks it ran recorded per item. The product says
so: an item with a record shows "reviewed by an AI model against the
published criteria; a person has not read it", never "reviewed" without the
qualifier. No human has read these items. The ledger records the model
review as kind `model`, which the coverage sentences and the item note treat
as distinct from a human review.

## 3. Wave 1 by topic

«TOPIC_TABLE»

«DECISION_SUMMARY»

Scores before and after: «SCORE_SUMMARY»

## 4. What the review found

«PATTERNS»

## 5. What changed in the product

- **A central gate.** `eligibilityFrom` in `shared/curation.ts`, applied once
  in `applyEligibility` while the effective question set is built and once in
  `lib/coding/active.ts` for coding tasks. A recorded decision holds wherever
  its item lives; the ledger's `scope` names the categories audited
  completely, where an item with no applicable record is withheld as well.
  Every delivery surface reads the filtered set, so a retirement is central,
  not a client filter.
- **Retirement is not deletion.** A withheld item stays in its source file and
  in the history lookups, so an old attempt still finds its explanation. Its
  Learn level thins rather than sliding a neighbour under another title; a
  level with fewer than three served questions is unavailable and the unlock
  rules step over it, which also fixed a pre-existing dead end (level 6 of a
  25-level topic used to demand a checkpoint recorded only after level 9).
- **In-flight attempts.** A quiz answer to an item retired while the quiz was
  open is void — neither for nor against, no proof minted, reported in the
  result; a Learn attempt on a retired level closes without a verdict and is
  offered again; a placement round voids the item and tops the run up; a short
  assessment receipt is scaled to its budget.
- **Edits invalidate approval.** An operator edit in `/dev` turns an item
  `superseded` in its review column; in a completed category it is withheld
  until re-reviewed. There is no self-declared approval from the console.
- **Unreviewed Czech is dropped.** A translation whose hash is not the one the
  ledger records falls back to English for that item rather than being served
  unreviewed.
- **Stable ids and history.** No id changed. Rewritten items keep their id with
  `revision: 2` and the previous content hash on record; retired items keep
  their id and their history.

## 6. Limits of this wave

- «REMAINING» items of the five wave-1 banks have no decision yet and are
  served exactly as before, with no claim. Their batches and contexts are in
  `docs/audit/wip/inventory/` and `docs/audit/wip/context/`; the handoff
  (`docs/audit/HANDOFF-176-w1.md`) names the exact files to resume.
- The other thirteen active banks (git, html, dsa, algorithms, general, ai,
  databases, system-design, devops, security and the rest), the retired
  sections, the unreferenced banks and the legacy core bank are untouched.
- The 249 coding tasks are issued as before. Their audit needs the grader
  checks `docs/audit/wip/CODING-BRIEF.md` specifies (reference, starter, an
  alternative valid solution and two wrong approaches through the real
  sandbox), and the batches with solutions are ready in `docs/audit/wip/coding/`.
- The two learning paths are unpublished (both switches off) and unreachable;
  they were not inventoried item by item.
- The review is model-performed. It is a real item-level review with recorded
  evidence, and it is not a human review; the product's own wording keeps the
  distinction. A human reading of the retirements and of the amended keys is
  the cheapest next check.

## 7. Reproducing and continuing

- Inventory: `npm run audit:devshark-inventory -- --out <dir>`; per-category
  gate counts: `npm run audit:devshark-content` (its `audit` block).
- Ledger → registry: `npm run build:curation-registry`; the launch contract
  fails when the registry does not match the ledger.
- The review fragments (`docs/audit/wip/review/`), the second reading and the
  duplicate decisions (`docs/audit/wip/verify/`), the merged final rows
  (`docs/audit/wip/final/`) and the Czech rows (`docs/audit/wip/cs/`) are the
  audit's evidence; the tools under `docs/audit/wip/tools/` turn them into
  content changes and ledger rows, in the order the handoff gives.
