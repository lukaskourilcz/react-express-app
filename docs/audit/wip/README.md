# Content audit (#176) — work in progress

This directory holds the interim artifacts of the devShark content audit while
the branch `claude/qa-hints-audit-i0kh9t` is in progress. Nothing here is a
result the product may quote yet. `docs/audit/HANDOFF-176-w1.md` says what is
done, what is not, and the order to finish the first wave.

- `REVIEWER-BRIEF.md`, `CODING-BRIEF.md`, `CS-BRIEF.md` — the rubric and the
  output schema the item-level reviewers apply (the issue's rubric, verbatim
  in substance), the coding-task variant that requires the real grader, and
  the brief for the Czech localisation pass.
- `inventory/inventory.json` — the reconciled inventory: every question a
  learner can be served (2,128 active, 319 in retired sections), 312
  unreferenced, 795 legacy, 249 coding tasks, with plain content hashes.
- `inventory/batch-*.json` — the reviewer inputs, one per topic batch
  (English item + served Czech translation + automated flags), fifty items
  for the first-wave topics, sixty or fewer elsewhere.
- `context/` — the per-batch level titles, plan membership and instructions.
- `coding/` — the coding-task batches with their server-only solutions and
  hidden tests. Never copy anything from here into learner-visible copy.
- `review/` — item-level review fragments: `review-css.json` (complete, array
  format) and `review-<topic>-<n>.jsonl` (one JSON object per line, appended
  as the reviewer went; a partial file is resumed after its last id, never
  rewritten). Each row carries the seven quality dimensions, the five
  relevance markers, both gate outcomes, the decision, evidence and a Czech
  parity verdict. These are the rows the ledger
  (`docs/audit/devshark-content-ledger.json`) is built from once a topic's
  batches are all in.
- `tools/` — the scripts that turn the fragments into content changes and
  ledger rows (`apply-rewrites.ts`, `apply-cs.ts`, `build-ledger.ts`,
  `grade-task.ts`, `export-coding.ts`, `seed-locator.ts`) and the Python
  helpers that validate reviews, enrich batches, build contexts, build Czech
  batches and summarise the ledger. The handoff shows how to bundle them.

State when this snapshot was taken: the eligibility gate is implemented,
fails closed, and is scoped by the ledger's `scope` — which is still empty —
so it withholds nothing yet and every repository gate passes on the branch.
462 of the first wave's 848 items (css, javascript, typescript, react, nodejs)
have a review; 386 do not. Do not add a category to the ledger's scope
before its rows exist: that withholds the whole category.
