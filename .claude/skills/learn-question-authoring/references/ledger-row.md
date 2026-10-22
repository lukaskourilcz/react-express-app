# Ledger row templates

`docs/audit/devshark-content-ledger.json` holds one row per reviewed item in `items`. `scripts/build-curation-registry.ts` (`LedgerItem`, `registryFromLedger`) reads only the fields marked **gate** below; the rest is the review record that `docs/curation-claims.md` says must exist ("every score, every piece of evidence, every rationale, per item"). Copy the shape of the nearest existing row of the same kind, for example `rm-javascript-fresh-1-1` for a question and `js-easy3-digits-only` for a coding task.

## Field rules

| Field | Gate | Rule and source |
|---|---|---|
| `id` | gate | The served id. Two rows with one id throw in `registryFromLedger`. |
| `kind` | gate | `question` or `coding-task` (`LedgerItem`). |
| `contentHash` | gate | `contentHash(q)` for a question, `taskHash(task, solution)` for a task (`lib/curation.ts`). Read it from `npm run audit:devshark-inventory -- --out <dir>`: `items[].contentHash` for questions, `codingTasks[].contentHash` for tasks. A hash for other content resolves to `superseded` (`eligibilityFrom` in `shared/curation.ts`). |
| `revision` | gate | `1` for a new item; previous plus one for a rewrite. |
| `quality` | gate | The seven `QUALITY_DIMENSION_KEYS`, integers 1 to 5 (`shared/curation.ts`). |
| `qualityScore` | gate | The minimum of the seven (`qualityFloor`). Must pass `QUALITY_MIN = 3`. |
| `relevance` | gate | The five `RELEVANCE_MARKER_KEYS`, integers 0 to 2. |
| `relevanceScore` | gate | Their sum (`relevanceTotal`). Must pass `RELEVANCE_MIN = 4`. |
| `decision` | gate | `retain` or `rewrite` serve; `retire` and `quarantine` withhold (`LEDGER_DECISIONS`). |
| `retireReason` | gate | `null` unless the decision is `retire` or `quarantine`. |
| `reviewedAt` | gate | ISO date of the review. |
| `verification.verdict` | launch | A row with `revision > 1` and a serving decision needs `accept` or `amend` (`scripts/test-launch-contracts.ts`, "Content this audit rewrote is served only after a second reader checked the rewrite"). |
| `previousHash` | record | Question rows: the hash of the version before the rewrite, present only at `revision` 2 or more (no `revision: 1` question row carries it). Coding rows: the rows of the 17 October coding wave carry `previousHash` and `previousHashSchema` even at `revision: 1`, because the wave recorded the hash of the version it started from; the DSA rows (`alg-dsa-*`) are new tasks and carry neither. `previousHashSchema` names the hash schema of that version: `task-hash:v2` on most rows, `task-hash:v1` on ten `revision: 2` rows such as `js-easy3-digits-only`. A new coding task has no earlier version, so its row omits both; an edited task records its old hash with `previousHashSchema: "task-hash:v2"`. |
| `reviewer.kind` | record | What the review was: `human`, `model`, `automated` or `execution` (`REVIEW_EVENT_KINDS`). A model review is recorded as a model review, never as a person (`docs/curation-claims.md`, "Four kinds of checking"). |

A row whose `qualityScore` or `relevanceScore` disagrees with its dimensions or markers stops `npm run build:curation-registry`: `registryFromLedger` throws `<id>: scores do not add up to their totals`. At runtime, `eligibilityFrom` in `shared/curation.ts` applies the same `registryEntryConsistent` check and resolves such an entry to `invalid-record`, a second line of defence for a registry edited by hand.

Serialize the ledger with `JSON.stringify(ledger, null, 1)` plus a trailing newline. That is the file's current format, so the diff shows only your rows.

## Question row

```json
{
  "id": "rm-javascript-fresh-1-5",
  "kind": "question",
  "locale": "en",
  "delivery": "active",
  "surfaces": ["quiz", "daily", "challenge", "placement", "learn-level", "learn-part-test", "personalised-review", "play", "flashcards", "today-due"],
  "category": "javascript",
  "topic": "javascript",
  "level": 1,
  "levelTitle": "Values & Math",
  "objective": "One sentence: what the item checks, in the level's terms.",
  "intendedLevel": "beginner",
  "revision": 1,
  "contentHash": "<items[].contentHash from audit:devshark-inventory>",
  "quality": { "topicRelevance": 5, "learningValue": 4, "technicalCorrectness": 5, "wording": 4, "answerOptions": 4, "hint": 4, "explanation": 4 },
  "qualityScore": 4,
  "relevance": { "presentDay": 2, "practicalUtility": 2, "transferable": 2, "audienceFit": 2, "riskOutcome": 1 },
  "relevanceScore": 9,
  "gates": { "quality": true, "relevance": true },
  "correctnessBlocker": null,
  "decision": "retain",
  "retireReason": null,
  "defects": [],
  "rationale": "Why the item is worth asking at this level and why its key is the only right answer.",
  "evidence": ["https://developer.mozilla.org/... or run: the command whose output you checked"],
  "verification": { "pass": "second-reading", "verdict": "accept", "problems": [], "notes": "What the second reading checked." },
  "reviewer": { "kind": "model", "passes": ["item-review", "second-reading"], "run": "<tool and session>, <date>" },
  "reviewedAt": "<YYYY-MM-DD>"
}
```

## Coding-task row

Same gate fields, plus the grader evidence the coding wave recorded (`graderChecks`) and the hash schema in force (`task-hash:v2`, the tag inside `taskHash`). Most coding rows record `graderChecks` as `{ cases, notes }`; some add `boundaries`, `mutation` and `complexity`, and the template below uses that fuller shape. The template is for a new task, so it carries no `previousHash` or `previousHashSchema`; for an edit, keep the existing row's fields and set both (see the field table).

```json
{
  "id": "js-easy4-example",
  "kind": "coding-task",
  "locale": "en",
  "delivery": "active",
  "surfaces": ["coding", "challenge-run"],
  "category": "javascript",
  "topic": "javascript",
  "level": 4,
  "objective": "One sentence: the behaviour the tests pin down.",
  "intendedLevel": "beginner",
  "revision": 1,
  "contentHash": "<codingTasks[].contentHash from audit:devshark-inventory>",
  "hashSchema": "task-hash:v2",
  "quality": { "topicRelevance": 5, "learningValue": 4, "technicalCorrectness": 5, "wording": 4, "answerOptions": 4, "hint": 4, "explanation": 4 },
  "qualityScore": 4,
  "relevance": { "presentDay": 2, "practicalUtility": 2, "transferable": 2, "audienceFit": 2, "riskOutcome": 1 },
  "relevanceScore": 9,
  "gates": { "quality": true, "relevance": true },
  "correctnessBlocker": null,
  "decision": "retain",
  "retireReason": null,
  "defects": [],
  "rationale": "Why the task is worth doing and what its hidden checks rule out.",
  "evidence": ["run: npm run test:coding with CODING_ONLY='^js-easy4-example$'; reference, junior and senior pass, starter fails"],
  "graderChecks": {
    "cases": [{ "id": "js-easy4-example", "contentHash": "<same hash>", "label": "reference", "expected": "passed", "verdict": "passed", "visible": 5, "hidden": 3 }],
    "boundaries": "The edge inputs the tests cover.",
    "mutation": "Whether the task forbids changing its input, and which check proves it.",
    "complexity": "The authored Target sentence, or why there is none."
  },
  "verification": { "pass": "second-reading", "verdict": "accept", "problems": [], "notes": "What the second reading checked." },
  "reviewer": { "kind": "model", "passes": ["individual-item-review", "executable-recheck"], "run": "<tool and session>, <date>" },
  "reviewedAt": "<YYYY-MM-DD>"
}
```
