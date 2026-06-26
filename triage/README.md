# Question-bank triage & scoring

A full pass over the quiz question bank (**3,609 questions**) to (a) cut items that
shouldn't be in the bank and (b) rank the rest. Gates (binary cut) are kept
separate from the 1–5 ranking scores — they are not collapsed into one weighted sum.

## Audience
> Self-taught and bootcamp web developers progressing from **beginner to mid-level**
> (junior→mid role readiness), across Frontend, Backend, and Fullstack.

Every `relevance` and `difficulty_fit` judgment is relative to this audience. Change
the audience in `judge_prompt.md` and re-run to re-score.

## Method
1. **Extract** — the bank is built from TypeScript seeds (`lib/quiz-data.ts` +
   `lib/roadmap-questions-*.ts`); each question has `id, category, difficulty,
   stem (question), options, correctAnswer (index), explanation`. The correct
   answer field is unambiguous (`correctAnswer` index).
2. **Dedup** (`dupes.json`) — character 5-gram cosine over stem+options+answer,
   blocked by category. A **review** list, not an auto-cut: lexical matching also
   surfaces same-template/different-concept pairs (e.g. "stack vs queue ordering").
   28 near-duplicate non-representative items are flagged for removal.
3. **LLM judge** — each question scored by a Claude (Sonnet) judge using the rubric
   in `judge_prompt.md`. (No Anthropic Batch API / `ANTHROPIC_API_KEY` was used —
   judging ran via in-session subagents per the user's instruction.) Calibrated on a
   50-item sample (`calibration.json`) first, then the full bank in 25 chunks.

### Gates (any true → cut)
`ambiguous` · `wrong_or_outdated` · `trivial_recall`

### Axes (1–5, 5 best)
`relevance` · `discrimination` · `difficulty_fit` · `clarity`

### Keep rule (tunable — top of `scripts`/assembler)
```
keep = !gate_cut && !duplicate && relevance >= 3 && mean(4 axes) >= 3.0
```

## Outputs
- `scored.json` — every question + full verdict (gate, 4 scores, mean, dup flag, decision, reasons)
- `cut_list.json` — gated + duplicate + low-ranked items, each with the reason (sorted worst-first)
- `keep_list.json` — survivors (sorted best-first)
- `dupes.json` — near-duplicate clusters/pairs for review
- `calibration.json` — the 50-item calibration sample verdicts
- `judge_prompt.md` — the exact rubric used

## Results
- **Keep 3,027 (83.9%)  ·  Cut 582 (16.1%)**
- Gate cuts: **360** — `trivial_recall` 353, `ambiguous` 8 (`wrong_or_outdated` 0)
- Duplicate cuts: **28**
- Low-rank cuts (relevance/mean): **195**

Cut rate is concentrated in recall/trivia categories: dev-world 99%, abbreviations
85%, cool-stuff 83%, algorithms 43% — vs. single digits for react, ai, testing,
databases, devops, general.

## Caveats
- **No wrong answers were flagged** across 3,609 items. That's a good sign for
  correctness, but large per-judge batches can under-detect subtle key errors, so
  the (zero) `wrong_or_outdated` result is the least-certain part — worth a targeted
  re-check if answer correctness is the priority.
- The `trivial_recall` gate cuts many legitimately-basic fundamentals (e.g. "what
  does `git add` do", basic HTML element recall, all acronym questions). For a
  Duolingo-style beginner app these recall drills may be **pedagogically intended**.
  Review before applying — especially the trivia categories — or tune the rule
  (e.g. keep `trivial_recall` items with `relevance >= 4`, or exempt categories).
- Dedup is lexical (no semantic embeddings available here); treat `dupes.json` as
  candidates to eyeball, not auto-cuts.

## Re-running / tuning
The judge prompt and keep-rule constants are the two knobs. Adjust the audience or
gate strictness in `judge_prompt.md`, or the thresholds (`MIN_RELEVANCE`, `MIN_MEAN`,
`CUT_REDUNDANT_DUPS`) in the assembler, and re-score.
