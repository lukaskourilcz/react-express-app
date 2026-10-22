# FDE curriculum v1

Proposed content specification | 8 September 2026 | [Research and rationale](fde-learning-path-research.md)

## Learning contract

The learner can scope an ambiguous customer workflow, integrate data and services, build a bounded AI-assisted solution where justified, evaluate it, handle an operational change, and explain deployment and handoff decisions. Completion describes performance in devShark's exercises, not employment readiness or verified production experience.

All three engineering tracks reach the same FDE outcomes. Base track only changes bridge recommendations. The core path needs no paid API or vendor-specific account. TypeScript is the primary executable language because the platform already grades it; Python reading and local practice broaden fluency. Do not claim server-verified Python execution in v1.

## Diagnostic and bridges

Proposed diagnostic: 12 authored scenario items across API/data, security/operations, UI/product and AI evaluation, plus two short JS/TS debugging exercises. Store per-competency evidence and “not assessed,” not just a single score. It should take roughly 25–40 minutes; no time limit. A learner can skip the diagnostic and receives recommendations without verified exemptions.

A bridge exemption requires all mandatory checks for that competency in the versioned rubric. Do not grant FDE core completion, old lesson passes or XP for placement. Wrong or skipped answers recommend specific learning and do not block browsing. Core tasks can be challenged directly, using the same grading criteria as the ordinary route.

| Bridge | Suggested audience, subject to evidence | Outcomes and assessment |
|---|---|---|
| Backend/data | Frontend engineers | Trace an authenticated request; validate input; transform dirty data; explain joins, transactions and idempotency. Reuse targeted Node/database lessons plus a TS mapping exercise. |
| Operator interface | Backend engineers | Accessible forms, loading/error/retry, human approval, citations and streaming cancellation. Reuse React/testing material plus an operator-state exercise. |
| Delivery operations | Any unassessed engineer | Environments, secrets, CI, logs/metrics/traces, rollback and service ownership. Structured incident case and runbook analysis. |
| Python interoperability | Anyone unfamiliar with Python | Read typing, async, JSON transformations, environments and API client code. Authored code-review questions are graded; optional local Python work is labeled self-reviewed. |

## Modules and deliverables

The minimum authored inventory is **20 short lessons, 40 scenario checks, 10 practical exercises and one staged capstone**, plus diagnostic/bridge content. The core modules use lessons, scenario checks and code exercises or required self-reviewed artifacts. The manifest and `pathInventory` give the current total after each content revision. This is a production target, not a count to display before the content exists. Every item needs objectives, sources, version, estimated effort and feedback. Module practical exercises may combine existing task types; do not create arbitrary runtime infrastructure to meet the count.

| ID | Module and lessons | Practical evidence | Dependency |
|---|---|---|---|
| M01 | Customer discovery: workflow and stakeholders; baseline, scope and the executive update | Turn “add AI to support” into a one-page scope (workflow, five questions, baseline, success metric, in scope, sequencing, non-goals, risks, acceptance) and an executive update in four capped fields (audience 200, decisions 600, open questions 600, next step 300 characters; 1,700 in all). Grade bounded decision cases; both written pieces are required and self-reviewed (B4, #500). | None |
| M02 | Integration/data: contracts and messy inputs; retries and idempotency | TS connector adapter handles missing fields, duplicates, pagination, throttling and repeated delivery using synthetic fixtures. | M01 |
| M03 | Enterprise boundaries and identity: identity and tenant access; delegated access (OAuth 2.0 authorization code with PKCE, token handling), SSO through SAML assertions and OIDC ID tokens, signed webhooks with replay protection, audit, and the retention and deletion of every copy the integration makes | Repair a tenant-scoped webhook receiver in TypeScript; hidden cases include a bad signature, a replayed delivery, a cross-tenant ticket id and an expired or revoked grant, each under its own critical criterion. Its check has ten questions. The revision kept a short retention and deletion section in lesson 2, so the `boundaries` competency still covers data lifecycles. Sources dated 21 October 2026 (B5, #501). Becomes M04 when B9 renumbers the path. | M02 |
| M05-data | Data plumbing (curriculum v2 M05; temporary id `fde-v1-m05-data` until B9 renumbers): SQL for integration (joins, dedupe, incremental loads, idempotent upserts); pipelines, schema migration, CSV and SOAP legacy sources, backfills | Six SQL reading questions on fixture tables (what a query returns, which index it needs, what breaks on a replay); no SQL runs (decision D5). A TypeScript reconciliation loads a CSV export and a paginated API into one validated ledger, counts every row as applied, stale or rejected, lands the same ledger when the batches replay in either order, and writes nothing when a page fails. Measures the `data-plumbing` competency. Prerequisite: the Databases topic in Learn (levels 5 to 11), named in the lesson 1 callout but not linked: lesson sections have no link field yet, so the link waits on a schema change (B1/B2). | M02 |
| M04 | AI system choices: deterministic code vs model vs workflow vs agent; structured outputs and failure modes | Select an architecture under explicit accuracy/latency/budget constraints, then validate malformed model responses. | M02 |
| M05 | Retrieval: ingestion/chunking/provenance; retrieval quality and access filters | Rank supplied retrieval results, enforce access filters, reject unsupported answers, and trace citations to source IDs. Embeddings/results are fixtures, not live calls. | M03, M04 |
| M06 | Tools, agents and MCP (curriculum v2 M08): tool schemas and the MCP 2026-07-28 boundary; the agent loop, approval and sub-agents, and when a fixed workflow beats an agent | Implement a simulated tool dispatcher with argument checks, scoped permissions, retry budget, idempotency, an approval state a person can approve or reject, and sub-agents with a narrowed grant and their own call budget. Six scenario checks, including versioned MCP protocol reading, workflow versus agent and a sub-agent's grant. | M03, M04 |
| M07 | Evaluation (curriculum v2 M09): golden sets, reference cases and leakage; failure modes, cost and latency beside quality | Implement a metrics function over a held-out synthetic golden set that reports cost per request and p95 latency beside accuracy and coverage, sorts each wrong answer into retrieval miss, tool misuse, hallucination or unclassified from its trace, compares two candidates against a baseline, and detects a candidate that wins on average while a slice regresses. Six scenario checks. | M05, M06 |
| M08 | AI security (v2 M10): injection and untrusted outputs; excessive agency, sandboxes and the security review | Fix unsafe tool/output handling in a sandbox fixture; prove malicious documents cannot authorize actions or leak another tenant's records. A second check grades sandboxed execution of generated code and what SOC 2, the HIPAA Security Rule and FedRAMP each ask of a deployment, as review questions rather than law (#504). | M05, M06 |
| M11 (`fde-v1-m11-deploy`) | Deploy in the customer's environment (v2 M11): containers, cloud primitives and the private network; infrastructure as code, release gates and rollback cost | Read Dockerfiles and Terraform plans in a six-question check; write a TypeScript release gate that holds a rollout on failed health, configuration or migration evidence and records why. Competency `deployment`. Prerequisite: the DevOps & Cloud Learn topic. B9 renumbers the id (#504). | M03, M08 |
| M09 | Production delivery: observability and rollout; incident handling and rollback | Diagnose supplied traces, identify a failing dependency, propose a rollback, and implement a bounded retry/circuit-state helper. | M07, M08 |
| M10 | Adoption and handoff: operator UX and acceptance; communication, enablement and reusable product feedback | Operator-state exercise plus a structured UAT decision; three required self-reviewed artifacts, each with its rubric dimensions: a runbook (trigger, owner, steps, rollback), a handover workshop outline, and a push-back email to a customer asking for the wrong feature (B4, #500). Becomes M13 when curriculum v2 renumbers the modules (B9). | M09 |
| C01 | Capstone: customer support operations workbench | Deliver the linked scenario below; combine verified task results with a clearly labeled portfolio packet. | M01–M10 required for final completion, all materials previewable |

## Capstone brief

A fictional B2B software company wants to reduce time spent triaging support cases. It has a ticket API, a CSV customer export and a knowledge base with stale and tenant-restricted articles. The operator must review proposed actions. The learner decides where deterministic routing suffices and where model assistance adds value.

Fixtures include two tenants, duplicate tickets, missing customer IDs, outdated articles, forbidden documents, malformed model output, a throttled API, and an indirect injection attempt. No real customer data, credentials or production action is involved.

1. **Discovery:** workflow map, five useful stakeholder questions, baseline metric, scope, non-goals, risk register and acceptance conditions.
2. **Build:** pass bounded adapter, authorization, retrieval, validation and operator-interaction tasks using the existing sandbox. These are linked components, not a claim that devShark deployed a whole service.
3. **Evaluate:** compare a deterministic baseline with supplied model-result candidates on at least 30 synthetic cases including failures. Hold out a labeled evaluation slice. Define quality, abstention, cost and latency measures; explain how fixture results differ from live model behavior.
4. **Change request:** the customer adds a restricted tenant and tightens latency requirements. Update the design and pass changed fixture checks without breaking earlier acceptance cases.
5. **Incident and handoff:** explain a failed rollout from traces; submit rollback/runbook/UAT checklist, demo outline and one reusable product improvement.

Portfolio outputs can be copied/exported as Markdown/JSON. Saving a repository URL is optional and does not grant a verified badge; v1 does not fetch or execute it. Optional local projects, Python practice and real-model experiments carry no additional XP, access or completion requirements.

## Assessment design

Use author-defined criteria before the learner starts. Suggested rubric dimensions: problem framing, technical correctness, integration/data quality, evaluation, security, operability, and communication. For open artifacts use four transparent levels: missing, partial, adequate, strong, with original observable descriptors. Store these as self-review until an actual independent-review workflow exists.

Example observable descriptor for adequate problem framing: identifies the operator, current pain, a measurable baseline, exclusions and acceptance conditions. Strong adds a justified tradeoff and handles a changed requirement. A text length check can enforce a payload limit or detect an empty submission; it cannot establish quality.

Automated practical pass: all critical assertions and at least 80% of noncritical weighted checks; the manifest defines weights and rationale. Security-critical failures cannot be averaged away. Scenario checks initially use an 80% threshold, retryable with explanatory feedback. Pilot these numbers and version any changes. Treat infrastructure timeout as retryable error, not a learner failure.

Completion states are distinct: `not_started`, `in_progress`, `verified_pass`, `self_reviewed`, `needs_revision`. Module requirements specify which evidence counts. The final server response says **“FDE guided path completed”** only after all required verified checks and required portfolio submissions; it separately displays **“Portfolio self-reviewed”**. No “Certified FDE,” hiring guarantee or automatic Senior rank.

MCQs use plausible options of comparable specificity, with the scenario constraints making the preferred choice defensible. Explain why alternatives fail here and when they could work. Exercises accept equivalent working code, include hidden edge cases, and keep solutions sealed. Review both false passes and unfair failures. Avoid vendor trivia, obscure syntax and keyword-matching essays.

## Content quality and upkeep

Code-reviewed source files remain the publishing authority. Extend the current `/dev` quality/reporting workflow to inspect FDE inventory and link issue reports; do not require a new full CMS. A catalog validator must reject duplicate IDs, dependency cycles, missing sources, invalid task references and public answer leakage. Every critical task has a passing reference and intentionally flawed variants.

Keep provider specifics in versioned reference notes. Verify current official Python, SQL, provider and protocol docs at authoring time. Technical recommendations in this specification are curriculum scope, not pinned package selections. Require quarterly source review and an immediate review for a broken API example or reported grading defect.


## Optional interview practice (B10)

Four modules sit on the interview-prep shelf after the required loop. They
have no completion requirements and add nothing to guided progress, phase
counts, the guided time estimate or completion rewards.

| Module | Practice |
| --- | --- |
| IP01 Learning round | Two lessons and three original 300–500-line TypeScript services to extend: rate cards, event selectors and an asset ledger. |
| IP02 Re-engineering round | Two lessons and three changed v2 services to debug: tenant quote batches, actor-scoped event pages and ledger previews. Earlier helpers may be familiar; the new contracts differ. |
| IP03 System design | Two lessons and twelve fictional customer scenarios, each with four objective questions and authored feedback. |
| IP04 Case bank and reflections | Two lessons linking the twelve original M02 cases, plus five capped STAR-style self-review artifacts. |

Suggested rehearsal times are guidance; no timer runs. Exercises execute only
in the existing sandbox and call no customer system. Machine checks establish
the authored bounded assertions, not engineering or interview readiness.
Reflection fields establish presence and length only; their quality stays
self-reviewed. Fictional rehearsal must be labelled, and no fabricated work
history or measured result is requested. These are original exercises, with
no employer question, scoring key or hiring guarantee.

The case bank uses the final M02 route from B3/B9. B10 remains draft until
those dependencies exist. All lesson/activity identifiers remain stable.
