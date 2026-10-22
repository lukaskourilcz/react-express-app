# devShark marketing source export

`GET /api/quiz/questions?resource=marketing-source` serves authored questions
and coding tasks as `marketing-source/1` packets for OwnDashboard. The code is
`lib/marketing/source.ts`; the schema copy is
`contracts/marketing-source-v1.schema.json`. OwnDashboard holds the shared
runtime contract in its own `src/lib/marketing/contracts.ts`.

**Status: inactive.** `DEVSHARK_MARKETING_EXPORT_SECRET` is not set in any
Vercel environment, so every request returns 503 `marketing_not_configured`.
The owner dropped the October 2026 marketing plan (#239), and this repository
posts nothing to social networks. `npm run test:marketing` (part of
`npm run test:launch`) keeps the contract tested.

The separate `lib/webdev-bank.ts` contract that BoardlessAI imports (#218) is
older and does not prove that a question is eligible today.

## Authentication and limits

- Send `Authorization: Bearer <DEVSHARK_MARKETING_EXPORT_SECRET>`. The secret
  is server-only and needs at least 32 characters. It grants this read and
  nothing else: it is not a learner token or a Supabase key, and the handler
  never forwards it to Supabase Auth.
- An absent or short secret returns 503; a wrong bearer returns 401.
- The quiz per-address rate limit runs before authentication. Authenticated
  calls then share one budget of 20 requests per minute
  (`RATE_LIMITS.marketingExport`), so a wrong bearer cannot use it up.
- Responses carry `Cache-Control: private, no-store` and `Vary: Authorization`.

## Query

| Query | Result |
| --- | --- |
| `limit=20` | 1 to 50 packets, default 20 |
| `cursor=<nextCursor>` | The next page of the same snapshot; 409 `source_snapshot_changed` if sources changed, so restart without a cursor |
| `sourceId=question:<id>` | A fresh recheck, including an ineligible packet for a retired, quarantined or deleted item the bank still holds |
| `sourceId=coding-task:<id>` | An active task, or a `not-issued` packet for a task in the catalogue that is not issued |
| `daily=today` or `daily=YYYY-MM-DD` | The public question of the day for an open UTC date, linking to `/daily/<date>` |

`sourceId` cannot be combined with `daily`, and neither with a cursor. Unknown
or repeated parameters return 400. A page returns `{packets, snapshot,
nextCursor}`; a recheck returns `{packets, nextCursor: null}`; daily adds
`date`. An unknown `sourceId` returns 410 `source_removed`: the consumer must
drop drafts built on it.

Every packet has brand `devshark` and locale `en`. `contentHash` is SHA-256
over the canonical JSON of `content` (object keys sorted, array order kept, no
whitespace). `sourceRevision` also covers eligibility, the override timestamp,
review metadata and access rules, and for coding tasks an opaque digest of the
authored task and grader. `observedAt` changes on every request.

## Eligibility

- Questions go through the same merge as serving: base items plus
  `question_edits` overrides. The handler reads the overrides fresh in sorted
  pages of 500 with an exact count, reads them a second time, and returns 503
  `marketing_source_unavailable` unless both reads match. It reads at most
  5,000 overrides within ten seconds and never falls back to the base bank.
- The curation gate applies: unreviewed custom items, wording edited since
  review, quarantined and retired items are ineligible. Lists include them as
  ineligible packets so a consumer can drop pending drafts. Retired topics and
  private categories are never eligible.
- Coding lists read `ACTIVE_CODING_TASKS`, so hidden system-design tasks are
  absent. `active-free` and `active-premium` come from `shared/tiers.ts`.
  Packets carry title, prompt, earlier requirements, starter and difficulty.
  They never carry tests, hidden checks, submissions or solutions, and the
  answer and explanation fields are `null`.
- Daily mode runs `pickQuestionOfTheDay` over the fresh bank and over the
  serving cache, and returns 503 if the two picks differ. Recheck with
  `daily=<date>` before publishing; a `sourceId` recheck cannot prove the
  daily pick.

## Consumer side

OwnDashboard owns the usage ledger, approvals and publication records. Its
receiver, `POST /api/marketing/automation`, uses its own bearer and an HMAC
signature; keep those credentials apart from the source secret. This
repository has no publishing path, model call, grading or XP change, or
learner-data export.

Turning the export on is an owner decision: set the secret in Vercel
Production, confirm a 200 response with `no-store`, a 401 for a wrong token,
and one dated daily link.
