# devShark marketing sources

OwnDashboard consumes `marketing-source/1` from this repository. The shared
runtime contract lives in OwnDashboard's `src/lib/marketing/contracts.ts`; the
schema copy here is `contracts/marketing-source-v1.schema.json`. The owner
requested this integration on 13 October 2026 (#364). The old BoardlessAI pinned
base-bank import remains historical compatibility, and cannot prove current
eligibility for new campaigns.

## Read-only integration

Call `GET https://devshark.app/api/quiz/questions?resource=marketing-source`.
Send `Authorization: Bearer <DEVSHARK_MARKETING_EXPORT_SECRET>`. The owner must
configure this server-only secret with at least 32 characters and put it in
n8n Cloud's credential store. It grants only this authored-source operation;
it is neither a learner token nor a Supabase key. Keep it out of browser bundles,
logs and workflow exports. An absent/short secret returns 503, an invalid bearer
returns 401. Existing quiz address and integration rate limits apply; the producer never forwards
the integration bearer to learner Auth. Responses carry
`Cache-Control: private, no-store` and `Vary: Authorization`.

Query options:

| Query | Result |
| --- | --- |
| `limit=20` | 1–50 packets, default 20; no arbitrary fields or tables |
| `cursor=<nextCursor>` | Next page from the same snapshot; 409 if sources changed; restart without cursor |
| `sourceId=question:<id>` | Fresh recheck, including an ineligible packet for a retained deleted/retired/quarantined item |
| `sourceId=coding-task:<id>` | Active task or retained `not-issued` tombstone |
| `daily=today` or `daily=YYYY-MM-DD` | Actual public question for an available UTC day, linking to `/daily/<date>` |

Do not combine `sourceId` with `daily`, or either with a cursor. Unknown and
repeated parameters return 400. A page returns `{packets, snapshot, nextCursor}`;
a recheck returns `{packets, nextCursor:null}`; daily adds `date`. Packets follow
the shared v1 fields with fixed brand `devshark` and locale `en`. Observed time
changes per request; identity/revision and content hash remain stable.

The producer hashes the `content` object only using SHA-256 over canonical JSON:
recursively sort object keys, retain array order and string bytes, omit
whitespace. `sourceRevision` also covers eligibility, current override timestamp,
review metadata and issuing/access rules. Coding revisions include an opaque
server-only authored/grader digest; the exporter never sends the grader.
Source revisions change when content, eligibility or relevant access changes.

## Eligibility and safe content

The question producer reuses the serving merge for base items and database
edits/custom items. It reads `question_edits` fresh in sorted pages of 500 with an exact count,
then verifies a second complete observation to hold concurrent edits. A DB
error, missing service configuration or a truncated result returns 503
`marketing_source_unavailable`, with no packets and no base fallback. The
bounded read supports at most 5,000 overrides within a ten-second deadline.
A PostgREST cap below 500 holds if it would truncate a page; configure at least
500 rows before activation. This read never omits an unseen override.

The same curation gate excludes unreviewed custom items and wording edited
since review, quarantine and retirement. Lists include ineligible retained
questions so consumers can invalidate pending drafts. Retired standalone topics
and private/out-of-product categories never become eligible. A hard-deleted
custom item has no remaining safe authored content: direct recheck returns 410
`source_removed`. OwnDashboard must invalidate dependent drafts on either that
response or an ineligible/superseding packet. Treat 503 as held, never usable.

Coding lists read `ACTIVE_CODING_TASKS`. Hidden system-design and history-only
tasks are absent; rechecks can return retained tombstones. `active-free` and
`active-premium` reflect `shared/tiers.ts`; promoting an eligible Premium task
does not grant a learner access or imply it is free. Learner tier/progression
checks still run when they open it. Packets allowlist title, prompt, earlier
requirements, starter and difficulty. They omit tests, hidden checks, user
submissions and solution modules. Coding answer and explanation are null: no
safe authored answer reveal has been reviewed for this integration. Do not
invent a solution from the starter or mark an answer-reveal draft ready.

Daily mode calls the existing `pickQuestionOfTheDay` selector over the effective
bank. It checks the serving cache too and holds if its selected wording/options
differ from fresh source proof. The daily revision binds the canonical date while keeping the question
source ID and content hash. Link that date. Recheck with `daily=<date>` before
scheduling and publishing; a generic `sourceId` recheck cannot prove the daily
selection. An edit can change the day's choice. Generic question packets link to their category quiz,
which selects a practice session rather than promising a dedicated item page.

## Consumer responsibilities and setup

OwnDashboard stores the usage ledger keyed by brand/source ID/revision, approvals
and publication records. n8n Cloud polls bounded pages and submits packets to
OwnDashboard's authenticated POST `/api/marketing/automation` with
`{action:"source",packet}`. That receiver uses its own brand-bound bearer secret,
`X-Marketing-Timestamp` and `X-Marketing-Signature` HMAC over the exact request
body, per the parent contract; these receiver headers are not the source GET
headers. Keep source-read and receiver credentials separate.

The owner approves each final post revision in OwnDashboard. Rechecks hold stale
or retired sources before scheduling/publication. Source edits invalidate earlier
prepared revisions and approvals through the consumer contract. This repository
adds no publishing path, model call, grading/XP change or learner-data export.
Dots and Higgsfield are excluded; production activation waits for owner review.

Before enabling the n8n workflow, the owner configures the source secret and
verified production Supabase service configuration, confirms a no-store 200
response, tests an invalid token and DB failure, and checks one dated daily link.
The PR prepares code and tests only; no secrets or production settings changed.
