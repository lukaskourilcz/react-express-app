# Content audit (#176) — work in progress

This directory holds the interim artifacts of the devShark content audit while
the branch `claude/qa-hints-audit-i0kh9t` is in progress. Nothing here is a
result the product may quote yet.

- `REVIEWER-BRIEF.md`, `CODING-BRIEF.md` — the rubric and output schema the
  item-level reviewers apply (the issue's rubric, verbatim in substance).
- `inventory/inventory.json` — the reconciled inventory: every question a
  learner can be served (2,128 active, 319 in retired sections), 312
  unreferenced, 795 legacy, 249 coding tasks, with plain content hashes.
- `inventory/batch-*.json` — the reviewer inputs, one per topic batch
  (English item + served Czech translation + automated flags).
- `context/` — the per-batch level titles, plan membership and instructions.
- `review/` — finished item-level review fragments. Each item carries the
  seven quality dimensions, the five relevance markers, both gate outcomes,
  the decision, evidence and a Czech parity verdict. These are the rows the
  ledger (`docs/audit/devshark-content-ledger.json`) is built from once every
  batch is in.

State when this snapshot was taken: the eligibility gate is implemented and
fails closed — with the ledger empty it withholds every devShark item, so
`npm run test:launch` fails on this branch by design. Do not merge or deploy
until the ledger is populated from the finished reviews and the contracts
pass again.
