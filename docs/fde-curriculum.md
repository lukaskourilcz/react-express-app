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

The minimum authored inventory is **20 short lessons, 40 scenario checks, 10 practical exercises and one staged capstone**, plus diagnostic/bridge content. Each M01–M10 has two lessons, four checks and one practical exercise. This is a production target, not a count to display before the content exists. Every item needs an EN original, reviewed CS overlay, objectives, sources, version, estimated effort and feedback. Module practical exercises may combine existing task types; do not create arbitrary runtime infrastructure to meet the count.

| ID | Module and lessons | Practical evidence | Dependency |
|---|---|---|---|
| M01 | Customer discovery: workflow and stakeholders; baseline and scope | Turn “add AI to support” into structured success metrics, questions, risks and a one-page scope. Grade bounded decision cases; retain open narrative as self-reviewed. | None |
| M02 | Integration/data: contracts and messy inputs; retries and idempotency | TS connector adapter handles missing fields, duplicates, pagination, throttling and repeated delivery using synthetic fixtures. | M01 |
| M03 | Enterprise boundaries: identity and tenant access; data lifecycle and audit | Repair a tenant-scoped tool wrapper; hidden cases include cross-tenant IDs and expired permissions. | M02 |
| M04 | AI system choices: deterministic code vs model vs workflow vs agent; structured outputs and failure modes | Select an architecture under explicit accuracy/latency/budget constraints, then validate malformed model responses. | M02 |
| M05 | Retrieval: ingestion/chunking/provenance; retrieval quality and access filters | Rank supplied retrieval results, enforce access filters, reject unsupported answers, and trace citations to source IDs. Embeddings/results are fixtures, not live calls. | M03, M04 |
| M06 | Tools and MCP: schemas and boundaries; bounded execution and approval | Implement a simulated tool dispatcher with argument checks, scoped permissions, retry budget, idempotency and approval state. Include versioned MCP protocol-reading cases. | M03, M04 |
| M07 | Evaluation: reference cases and leakage; quality/cost/latency tradeoffs | Implement a metrics function over a held-out synthetic dataset, compare two candidates against a baseline, and detect a misleading average. Distinguish retrieval failure from generation failure. | M05, M06 |
| M08 | AI security: injection and untrusted outputs; excessive agency and adversarial tests | Fix unsafe tool/output handling in a sandbox fixture; prove malicious documents cannot authorize actions or leak another tenant's records. | M05, M06 |
| M09 | Production delivery: observability and rollout; incident handling and rollback | Diagnose supplied traces, identify a failing dependency, propose a rollback, and implement a bounded retry/circuit-state helper. | M07, M08 |
| M10 | Adoption and handoff: operator UX and acceptance; communication and reusable product feedback | React/operator-state exercise plus a structured UAT decision; save a demo outline, runbook and product-feedback memo. Open text remains self-reviewed. | M09 |
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

Code-reviewed source files remain the publishing authority. Extend the current `/dev` quality/reporting workflow to inspect FDE inventory and link issue reports; do not require a new full CMS. A catalog validator must reject duplicate IDs, dependency cycles, missing overlays, missing sources, invalid task references and public answer leakage. Every critical task has a passing reference and intentionally flawed variants.

Keep provider specifics in versioned reference notes. Verify current official Python, SQL, provider and protocol docs at authoring time. Technical recommendations in this specification are curriculum scope, not pinned package selections. Require quarterly source review and an immediate review for a broken API example or reported grading defect.
