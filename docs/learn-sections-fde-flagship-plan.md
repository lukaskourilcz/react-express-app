# Learn sections and the FDE flagship: design proposal

Prepared 21 October 2026 against main `5b114d2`. Status: **awaiting the owner's approval**. Once approved, the work packages in section 9 become GitHub issues; nothing in this document changes application code.

Companions: [FDE research of 8 September](fde-learning-path-research.md), [FDE curriculum v1](fde-curriculum.md), [shared path engineering plan](fde-implementation-plan.md), [learning-paths issue index](learning-paths-plan.md), [agent workflow audit](agent-workflow-audit.md).

## 1. Recommendation in one page

Split Learn into three **sections** that sit above what exists: **Web Developer**, **Software Engineer** and **Forward Deployed Engineer**. A section is a presentation and plan-membership grouping of the Learn topics and learning paths the product already has. It is not a fourth base track, not a subject, not a product. The base track (Fullstack, Frontend, Backend) keeps ordering the Web Developer section; the FDE role specialization and the DSA Foundations path keep their enrollments; progress stays keyed by topic and by path, so a topic that appears in two sections (Git, General, Node.js, Databases, Security) is one topic with one progress record.

Make the FDE section the Premium flagship by rewriting the path around the delivery loop every employer describes (discover → scope → integrate → build with models → harden → ship → enable → codify), adding the four things competitors skip (decomposition cases, enterprise plumbing, deployment in the customer's cloud, interview drills on unfamiliar code), and giving the section a hub that shows competency evidence rather than a module list. Everything stays within the existing activity kinds (lesson, check, code, artifact), the existing graders (QuickJS, TypeScript checker, React runner) and the existing honesty rules (no certification, no hiring claim, no live model, no AI feature).

Estimated scope: two epics, 23 issues, of which 11 are content authoring. Sequenced so the sections ship first with today's FDE v1 inside them, and the flagship content lands module by module behind the same switch.

## 2. Current state (verified)

| Surface | What exists | Files |
|---|---|---|
| Learn (`/learn`) | One topic rail of the learner's plan topics, three parts per topic with a part test, 8 questions a level, hearts, XP. Level counts: JavaScript 25, TypeScript 25, React 25, Node.js 25, AI & LLMs 20, General 19, Next.js 15, Git 15, DSA 15, Databases 15, System Design 15, DevOps & Cloud 15, Security 15, Algorithms 10, HTML 6, CSS 6. `cool-stuff`, `abbreviations` and `testing` are retired from the plans. | `client/src/components/Roadmap.tsx`, `lib/roadmap.ts`, `shared/progression.ts` |
| Plan | The base track decides which topics the server serves (`403 not_in_plan` otherwise) and in what order. FDE adds five bridge topics; DSA Foundations adds three. A topic opens when each prerequisite has its first part passed. | `WEBDEV_PLAN_STAGES`, `SPECIALIZATION_BRIDGE_TOPICS`, `SKILL_PATH_BRIDGE_TOPICS`, `TOPIC_PREREQS`, `planTopics` in `shared/progression.ts` |
| Career (`/roadmap`) | Five pillars with completion, the Beyond list, and the two path discovery cards. | `client/src/components/CareerRoadmap.tsx`, `paths/PathDiscovery.tsx` |
| Learning paths | FDE v1 (role specialization): 10 modules and a capstone, 20 lessons, 40 module checks, 9 module code exercises, 4 capstone exercises, 3 written artifacts, a 21-question diagnostic with 4 exercises, 4 bridges, 40–60 hours estimated; the validator passes. DSA Foundations v1 (skill path): 10 modules, 18 lessons, 36 + 10 checks, 30 exercises; validates. Both are Premium in full, open only when `LEARNING_PATH_FDE_ENABLED` / `LEARNING_PATH_DSA_ENABLED` is on, content validates and migration 026 is installed. Routes `/roadmap/specializations/fde/*` and `/roadmap/paths/dsa-foundations/*`. Czech overlays exist for every module and the validator still requires them. | `lib/learning-paths/`, `shared/learning-paths.ts`, `shared/learning-path-api.ts`, `client/src/components/paths/` |
| Picker | Base track → optional FDE → DSA Foundations → profile (goals, experience, study time). Stored as `LearnerProfile` v2 in user metadata with the v1 preference written beside it. | `client/src/components/PathPickerDialog.tsx`, `paths/LearningPathsCard.tsx`, `client/src/lib/trackPref.ts` |
| Tiers | Free: HTML, CSS, JavaScript in full, React 1–12, DSA 1–2, 141 of 725 coding tasks, the opening stages of every project. Premium: the rest, both paths in full. `contentTier` is the one rule. | `shared/tiers.ts`, `lib/access.ts` |
| Coding | JavaScript, TypeScript, React and Algorithms tracks, 725 tasks, evolving projects. Graders run with a 2.5-second deadline. No Python, SQL or shell execution exists. | `shared/coding-catalog.ts`, `lib/coding/` |

Two facts shape the design. First, progress is already shared: a Learn topic has one progress record whatever page shows it, and a path has one enrollment. Sections need no new progress storage. Second, the plan filter is the only thing that hides a topic from a learner, so "adding a section" means "adding its topics to the plan", which `planTopics` already knows how to do for bridges.

## 3. What employers require from an FDE (research, 21 October 2026)

Fifteen 2026 postings read in full (OpenAI, Anthropic ×2, Google Cloud, Databricks, Snowflake, Scale AI, Palantir, Harvey, Glean, Vercel, Cursor, Sierra, Exa, ElevenLabs), three partial (Decagon, Cohere, Datadog), and two analyses of about a thousand postings each (Bloomberry, November 2025; GetPerspective, first half of 2026).

| Requirement | Postings /15 | Market data |
|---|---|---|
| Executive and stakeholder communication | 12 | "working directly with customers" is the top responsibility (55 %, Bloomberry) |
| Production LLM applications (structured outputs, tool use, agents) | 11 | AI skills in over 80 % of H1 2026 postings (GetPerspective) |
| Ownership of ambiguous 0-to-1 work; codifying field patterns back to product | 10 each | most-cited soft skill |
| Python | 9 | 66 % (Bloomberry) |
| Customer discovery, scoping, success metrics | 9 | discovery in over 70 % and rising |
| Enterprise integration: REST, webhooks, OAuth, SSO/SAML, legacy SQL and SOAP, migrations | 9 | 32 % |
| Full-stack delivery; agents and tool use; evals and golden datasets | 8 each | agents 35 % |
| TypeScript / JavaScript | 7 | 35 %; the whole stack at Vercel, half at Cursor, Palantir, Databricks |
| Named cloud (AWS, GCP, Azure); observability and incidents; data pipelines and SQL; prompt engineering | 5 each | AWS 32 %, GCP 22 %, Azure 18 % |
| MCP by name; RAG and retrieval | 4 each | rising |
| Guardrails and human-in-the-loop; workshops, runbooks, enablement | 3 each | |
| Docker and Kubernetes; security review, VPC, compliance vocabulary (SOC 2, HIPAA, FedRAMP) | 2 each (+ government roles) | K8s 14 %, Docker 12 % |
| Fine-tuning | 0 | PyTorch 6 % |

Interview loops are distinctive and consistent: a **decomposition or customer-scenario case** at nearly every employer (Palantir, OpenAI, Anthropic, ElevenLabs, Google), with a reported pass rate near 40 %; Palantir's **learning round** (extend an unfamiliar codebase in 60 minutes) and **re-engineering round** (debug a few hundred lines of foreign code); OpenAI's one-week **take-home** defended live plus an AI-enabled refactor that must keep tests green and an **LLM system-design** round (retrieval over a private knowledge base, batching, a tenfold traffic spike); Anthropic's **MCP use-case screen**, multi-stage coding (an LRU cache extended across stages) and a solution-design round ("security and compliance for a regulated government contractor"). Seniority asked: 60 % of postings want 3–5 years; 12 % take entry level.

Competing courses (AI Makerspace at 5,250 USD for ten live weeks, Interview Kickstart at 23 weeks, AgileFever at 2,200 USD, FDE Academy at eight months, Educative's two-hour text course) are long, live, Python-and-LangChain-centric and aimed at engineers with five years behind them. None offers short daily practice, a TypeScript-first route, interactive decomposition, learning and re-engineering drills with feedback, enterprise-integration realism, or anything low-cost for the 2–5-year engineer who is most of the market. That is devShark's opening.

Primary sources: Palantir "Dev versus Delta"; Nabeel Qureshi "Reflections on Palantir"; YC Lightcone "The FDE Playbook" with Bob McGrew; Pragmatic Engineer, "What are Forward Deployed Engineers" (2025) and "The Pulse: FDE heats up again" (May 2026); PostHog "WTF is a forward deployed engineer"; Bloomberry "I analyzed 1,000 FDE jobs"; Colin Jarvis (OpenAI) at HumanX and on the Altimeter podcast; OpenAI "Deployment Company" (May 2026); the Anthropic, Blackstone, Hellman & Friedman and Goldman Sachs services-firm release (May 2026); Tobi Coker, Crunchbase (January 2025); TechCrunch (30 July 2026). Posting URLs are in the research transcript and will be copied into the content issues as `SourceReference` entries with their review date.

## 4. How comparable platforms model tracks (research, 21 October 2026)

- **Role versus skill is the universal split.** roadmap.sh lists role roadmaps (Backend, DevOps, and since 2026 Forward Deployed Engineer) beside skill roadmaps (Git and GitHub, System Design, DSA, Docker); a skill roadmap is linked from several roles, never copied. Codecademy sells Career Paths and Skill Paths at different tiers. devShark's existing vocabulary (role specialization, skill path) already matches.
- **Shared modules are one canonical unit referenced by many tracks; completion is keyed on learner + unit.** Boot.dev's two backend tracks reuse the same course for 16 of 25 items; Codecademy warns that resetting a shared course touches other paths; LMS vendors state the rule as "completion by learner and course, assignment by learner and program". Store position per track, completion per unit, and show the same card with the same progress ring in every track with an "Also in Software Engineer" line.
- **Free tiers gate by breadth or daily quota, never by track.** Brilliant opens the first two levels of every course and two lessons a day; Boot.dev opens the first chapters of every course; nobody charges per track. devShark's "opening stages free" rule fits.
- **A flagship feels premium through outcomes, not access**: a reviewed capstone, a proctored final, a credential with an expiry, mock interviews, career material. freeCodeCamp does this for free. devShark can carry the capstone, the timed final and the interview set without any certification claim.
- **Switcher pattern**: a segmented control or tab row at the top of the learning page, last choice remembered per device, enrollment on the server. Duolingo's rule applies: adding a course never erases another.
- **Pricing cluster**: 8–15 USD a month on annual plans for self-paced coding products; interview-prep products sell yearly or lifetime. devShark's 4.99 EUR a month sits below the cluster, which supports positioning Premium on the flagship rather than raising the price.

## 5. Design: three Learn sections

### 5.1 The registry

One new pure registry, `shared/learn-sections.ts`, imported by browser and server. It extends `shared/subject-catalog.ts`; it copies nothing from it.

```ts
export const LEARN_SECTION_IDS = ['web-developer', 'software-engineer', 'forward-deployed-engineer'] as const;
export type LearnSectionId = (typeof LEARN_SECTION_IDS)[number];

export interface LearnSection {
  id: LearnSectionId;
  /** Learn topics in the order the section rail shows them. */
  topics: readonly string[];
  /** Learning paths that live in this section. */
  paths: readonly LearningPathId[];
  /** How a learner joins: the base track implies Web Developer; Software
   * Engineer is an explicit opt-in; FDE is the role specialization. */
  membership: 'base-track' | 'opt-in' | 'specialization';
}
```

Proposed membership matrix (decision D2):

| Topic or path | Web Developer | Software Engineer | Forward Deployed Engineer |
|---|---|---|---|
| HTML, CSS, JavaScript, TypeScript, React, Next.js | owner | | |
| Node.js | owner | | shared (foundation) |
| Databases | owner | | shared (foundation) |
| Git | shared | shared | |
| General (how the web works, testing foundations) | shared | shared | shared (foundation) |
| DSA, Algorithms, System Design, DevOps & Cloud | | owner | DevOps & Cloud shared (foundation) |
| Security | | owner | shared (foundation) |
| AI & LLMs (20 levels) | | | owner |
| DSA Foundations path | | owner | |
| FDE path | | | owner |

"Shared" means the same topic id, the same levels, the same progress record. The section only decides where the topic is listed and whether it joins the plan. `validateProgressionGraph` gains three checks: every section topic exists in the subject catalogue and is not retired, every non-retired catalogue topic appears in at least one section, and every section path id is a published `LearningPathId`.

### 5.2 Plan membership and the learner profile

Today `planTopics(profile)` is the base track's stages, then the specialization's bridge topics, then the skill paths' bridge topics. The change is additive:

1. `LearnerProfile` gains an optional `sections: LearnSectionId[]`, parsed defensively like every other field. A missing field derives: Web Developer always; Forward Deployed Engineer when `specialization === 'fde'`; Software Engineer when `skillPaths` includes `dsa-foundations` or the base track is Backend or Fullstack and the learner has passed a level in any Software Engineer topic. The schema version stays 2, so no new metadata key, no migration of stored records, and older clients keep reading the record they understand (the same compatibility rule the v1 preference follows).
2. `planTopics` appends each opted-in section's topics in section order, then the transitive prerequisites of anything appended (`TOPIC_PREREQS` closure). That is what stops a Frontend learner who adds Software Engineer from meeting DevOps & Cloud behind a Node.js prerequisite their plan never offered. No prerequisite changes.
3. The server reads the same function, so `403 not_in_plan` and Today's ordering follow without a handler change. The existing `SPECIALIZATION_BRIDGE_TOPICS.fde` gains `ai` so the AI & LLMs topic reaches an FDE learner's plan.

Opting out of a section hides its topics from the rail and the queue and keeps every passed level (the existing rule for a removed specialization).

### 5.3 The Learn page

`/learn` becomes three views under one page. The route is `/learn/:section` with `/learn` resolving to the learner's last section on this device, else Web Developer. A deep link `/learn?topic=react` keeps working: the page picks the first section in order that lists the topic. `/learn/big-o` stays.

Each section view, top to bottom:

- **Section switcher**: an Astryx `SegmentedControl` with the three sections (the Career page already uses it for tracks). Each item shows a small progress figure derived from the section's topics and paths. Keyboard-browsable, selection on activation, not on focus.
- **Section line**: one sentence of purpose, and for a section the learner has not joined, one action: "Add Software Engineer to your plan" (writes `profile.sections`) or, for FDE, "Start the FDE path" (the existing enrollment flow, which sets the specialization). Joining is free; content keeps its tier.
- **Paths shelf** (Software Engineer and FDE): the section's learning paths as cards with inventory, enrollment state and Premium mark, reusing `PathDiscovery`'s card. The FDE section's shelf is its hub (section 6.4).
- **Topic rail**: today's `RadioCardGroup`, filtered to the section's topics that are in the plan or carry a passed level. A shared topic carries an "Also in …" chip. A topic the plan lacks because the learner has not joined the section is shown dimmed with the join action, not hidden, so the section reads as a whole.
- **The map, parts and lesson runner**: unchanged.

States to cover, per the design contract: loading (switcher first, rail skeleton), empty section (a joined section with every topic locked by prerequisites says which part opens it), error and retry, offline (last section and cached structure), signed-out (preview with the device-only note), Premium marks, narrow widths (switcher scrolls, rail wraps), reduced motion.

### 5.4 Paths inside sections and the Career page

- Canonical path routes move under their section: `/learn/forward-deployed-engineer/path` and `/learn/forward-deployed-engineer/path/:moduleId`; `/learn/software-engineer/dsa-foundations` and `/learn/software-engineer/dsa-foundations/:moduleId`. The old `/roadmap/specializations/fde/*` and `/roadmap/paths/dsa-foundations/*` redirect, client-side with `Navigate` and in `vercel.json` for crawlers; `check:public` and the static route list follow (decision D4).
- `PathDiscovery` leaves the Career page. The Career page keeps its pillars, regrouped under the three section headings with one progress line each that links into Learn. Its "Beyond" list stays.
- Home's topic chooser is unchanged. Today keeps its one next action; when the plan holds a joined Software Engineer section, Today's queue already orders its topics after the track stages because `planTopics` does.

### 5.5 The picker

Step 1 stays the base track (Fullstack, Frontend, Backend), described as the Web Developer focus. Step 2 becomes **Sections**: a Software Engineer toggle (free to join; DSA Foundations is offered inside it) and the Forward Deployed Engineer card (Premium, with the flagship line and the honest entry requirement), then the profile questions as today. "Continue without a specialization" stays a first-class answer. The Profile card (`LearningPathsCard`) shows the joined sections and keeps its two separate save-and-enroll operations with per-operation retry.

### 5.6 Tiers

No change in shape for Learn topics: `learn-level` and `learn-part-test` are decided per topic as today, and a section never changes a tier. The free spine of each section is what it already is: Web Developer has HTML, CSS, JavaScript and React 1–12; Software Engineer has DSA 1–2 and the Big O introduction; FDE has nothing free today.

Decision D3 proposes an FDE taster, mirroring "the opening stages of every project are free": the diagnostic and the first module (two lessons, one check, one artifact) open to every account, the rest Premium. It needs one new `GatedContent` kind, `learning-path-activity`, decided by `contentTier` from the manifest's module order, and the same check in `learning-path-start` and `-submit`. DSA Foundations gets the same rule (its first module free). The 402 body and the upgrade sheet already handle a new kind.

### 5.7 Copy and public pages

Section names in copy: "Web Developer", "Software Engineer", "Forward Deployed Engineer". The nav label stays "Learn". Each section gets a public landing variant of `/learn/:section` (the page already previews signed-out) with a title, a meta description and the honest inventory from `pathInventory`; no new marketing claims. English only; the retained Czech dictionaries stay untouched.

## 6. Design: the FDE flagship

### 6.1 Positioning

The pitch, in the posting language learners will meet: *discovery, eval-driven, codify patterns, deploy in the customer's environment.* The promise stays what the manifest's `nonGoals` already say: a record of what the learner passed in these exercises, no certification, no hiring claim, no vendor account, no live model. What makes it the flagship is depth and shape, not a badge:

1. the delivery loop as the spine, with each technical skill taught inside the phase where an FDE uses it;
2. decomposition cases, the round most candidates fail, drilled with rubrics drawn from the Palantir and OpenAI criteria;
3. enterprise plumbing that bootcamps skip: OAuth, SSO/SAML, webhooks, legacy SQL and SOAP, VPC and IAM vocabulary, a security review, change management;
4. deployment in the customer's cloud: Docker, one cloud's compute, storage, networking and IAM, infrastructure-as-code reading, CI/CD gates, rollbacks;
5. interview drills nobody else grades: extend an unfamiliar codebase, debug a few hundred lines of foreign code, LLM system-design checks;
6. a TypeScript-first route, which is the gap every competitor leaves and the stack devShark already grades, with Python kept as graded reading.

### 6.2 Curriculum v2: the delivery loop

Fourteen modules in five phases, one capstone, one optional interview-prep module, plus the existing diagnostic and bridges. "Keep" means the v1 module stays with a copy pass; "revise" names the additions; "new" is authored from scratch. Every module keeps the v1 shape: two lessons with sources, one scenario check, one practical activity, and the module's requirements.

| Phase | Module | Status | What changes or what it teaches |
|---|---|---|---|
| A. Discover and scope | M01 Customer discovery | revise | Add the one-page scope artifact fields the research names (success metric, non-goals, sequencing, risks) and an executive-update artifact. |
| | M02 Decomposition cases | **new** | Twelve graded cases in the Palantir and OpenAI style ("the ops team cannot trust the dashboard", "sync two employee record systems", "two weeks versus two months"): each case is one check with a shared scenario and four to five ordered questions (what to ask first, how to frame the end user, what to cut, which trade-off to name). Rubric from the interview criteria. |
| B. Integrate | M03 Integration and messy data | keep (v1 M02) | |
| | M04 Enterprise boundaries and identity | revise (v1 M03) | Add OAuth 2.0 flows, SSO/SAML assertions, webhook verification and replay, audit trails. Exercise: a tenant-scoped webhook receiver with signature and replay checks. |
| | M05 Data plumbing | **new** | SQL for integration (joins, dedupe, incremental loads) as graded reading checks; pipelines, schema migration, CSV and SOAP legacy sources. Exercise in TypeScript: reconcile two sources into one validated record set with idempotent replays. Prerequisite link to the Databases Learn topic. |
| C. Build with models | M06 AI system choices | keep (v1 M04) | |
| | M07 Retrieval and grounding | keep (v1 M05) | |
| | M08 Tools, agents and MCP | revise (v1 M06) | Add the agent loop with a human-in-the-loop approval step, sub-agents, and when a workflow beats an agent; keep tool-schema and MCP boundary cases. |
| | M09 Evaluation | revise (v1 M07) | Add golden datasets, a failure-mode taxonomy (hallucination, retrieval miss, tool misuse), cost per request beside quality and latency. |
| D. Harden and ship | M10 AI security and guardrails | revise (v1 M08) | Add the compliance vocabulary a security review uses (SOC 2, HIPAA, FedRAMP) as checks, not law; sandboxed execution and runtime safety cases. |
| | M11 Deploy in the customer's environment | **new** | Docker, one cloud's compute, storage, networking and IAM, VPC and private endpoints, infrastructure-as-code reading (Terraform), CI/CD gates, change management, rollback cost when the schema moved. Checks read real-shaped Dockerfiles and Terraform; exercise in TypeScript: a release gate that refuses a rollout on failed health and config checks. Prerequisite link to the DevOps & Cloud Learn topic. |
| | M12 Production delivery and incidents | keep (v1 M09) | |
| E. Enable and codify | M13 Adoption, handoff and enablement | revise (v1 M10) | Add a runbook artifact, a workshop outline and a push-back email to a customer asking for the wrong feature. |
| | M14 Codify the pattern | **new** | Turning one deployment into a reusable building block and product feedback: what generalises, what stays bespoke, how to write it up so Product and Engineering act on it. One check and one artifact. |
| Capstone | C01 Support operations workbench | revise | Keep the staged brief; add the change-request stage's executive update and a five-minute walkthrough script artifact (OpenAI's take-home asks for a recorded walkthrough; the script is the gradable part). |
| Interview prep (optional, Premium) | IP01 Learning round | **new** | Three code drills: read a 300–500-line TypeScript fixture and extend it under hidden tests, timed in copy only (no server timer). |
| | IP02 Re-engineering round | **new** | Three code drills: find and fix the defects in a few hundred lines of foreign code with the existing graders. |
| | IP03 LLM system-design checks | **new** | Twelve scenario checks: retrieval over a private knowledge base, batching, a tenfold spike, a regulated customer, hosted versus self-hosted. |
| | IP04 Case bank and behavioural prompts | **new** | Links M02's cases; five STAR-style prompts as self-reviewed artifacts with the rubric visible. |

Bridges stay (backend and data, operator interface, delivery operations, Python reading). The Python bridge gains two reading checks on FastAPI-shaped API clients and async data loaders, because nine of fifteen postings ask for Python and the product cannot grade it.

Inventory target after v2: 14 required modules, 28 lessons, about 70 module check questions plus 12 cases, 12 code exercises and 6 artifacts in the modules, 6 interview code drills and 12 design checks, one capstone with 4 exercises and 4 artifacts. Estimated 60–80 hours. Counts the product shows keep coming from `pathInventory`, so nothing advertises content before it exists.

Content decisions carried over unchanged from v1: no live model, fixtures for every model response and retrieval result, security-critical criteria cannot be averaged away, artifacts are self-reviewed and never counted as verified, every lesson carries sources with review dates, and the capstone needs every required module.

### 6.3 Engineering the new content shapes

All of v2 fits the four existing activity kinds. Three small schema additions in `lib/learning-paths/types.ts` and `shared/learning-paths.ts`:

- a check activity gains an optional `scenario` (a shared preamble shown above its ordered questions) so a decomposition case is one check, not five unrelated questions;
- an optional module flag `shelf: 'interview-prep'` so the hub can list interview modules apart from the loop, with `optional: true` keeping them out of completion;
- a code activity gains an optional `fixtureNote` for the learning and re-engineering drills, telling the learner the fixture is deliberately unfamiliar and what "done" means.

The validator must stop requiring Czech. CLAUDE.md forbids authoring Czech copy while `ENABLED_LANGS` holds one entry, but `validatePath` still raises `missing_translation` for any missing `cs`, so every new module would fail readiness. Change: English required; Czech optional while the app ships one language; when Czech is present, keep the parity check. The merge keeps `cs: ''` fallbacks, and `useLoc` already falls back to English.

Graders: unchanged. The learning and re-engineering drills are ordinary TypeScript code activities with larger fixtures; `PATH_LIMITS` (64 KiB submissions, 60 drafts per enrollment) covers them, and `npm run test:paths` keeps the draft cap above every path's exercises plus artifacts.

### 6.4 The FDE hub

The FDE section view is the flagship surface. Deep End v2, no new primitives beyond what `LearningPathScreens` and `PathDiscovery` already use.

1. **Competency board**: the thirteen competencies (v1's eleven plus `data-plumbing` and `deployment`) as rows with evidence state from `pathProgress` (not started, in progress, verified, self-reviewed, needs revision), the activities that supply each, and one next action from `nextActivityId`. Honest by construction: it draws from recorded evidence only.
2. **The loop**: the five phases as a horizontal stepper with module counts, the current phase marked. Reduced motion respected; it is a list with headings to assistive technology.
3. **Interview-prep shelf**: the four optional modules, marked optional and Premium.
4. **Bridges and the diagnostic**: as today, suggested by base track and by diagnostic evidence.
5. **Portfolio packet**: the existing Markdown and JSON export of artifacts, plus a completion share card built on `shareCard.ts` that says "FDE guided path completed" with the competency summary and nothing else.
6. **Premium entry**: for a free account, the taster (D3) and the upgrade sheet; the sheet's include list and `/premium` name the FDE path as the flagship.

### 6.5 What stays out, and why

- **Python and SQL execution.** No grader exists, Vercel's Node functions have no Python runtime, a Python function would be a thirteenth physical handler, and WebAssembly SQLite cannot run inside the QuickJS sandbox. Python stays graded reading; SQL stays graded reading inside M05 and the Databases topic. Decision D5 offers a bounded spike (server-side `sql.js` in the Node grader within the 2.5-second deadline) if the owner wants SQL exercises later.
- **Live model calls and an AI tutor.** devShark ships no AI feature; every model response stays a fixture, as v1 states in each module.
- **Certification, hiring claims, salary claims.** Completion copy stays "FDE guided path completed".
- **Travel, onsite craft and stakeholder pressure.** Taught as cases and artifacts; not simulated.

### 6.6 Versioning

If production runs with `LEARNING_PATH_FDE_ENABLED` off (the README default) and `learning_path_enrollments` holds no FDE rows, v1 is edited in place: the manifest keeps `version: 1`, `reviewedOn` moves, activity ids stay `fde-v1-…`, and no learner evidence exists to protect. If any FDE enrollment exists, v2 is published as a new curriculum version under the rules `fde-implementation-plan.md` set: a new enrollment on explicit choice, v1 completion shown separately, no blanket transfer. Decision D1 needs the owner to read the production table or state the switch.

## 7. Content quality contract

New and revised content follows what the existing path and the question bank already enforce:

- every lesson names its sources with `reviewedOn`; postings and essays from section 3 enter as sources with the 21 October 2026 review date;
- checks use plausible options of comparable specificity, explain why alternatives fail here, and pass at 80 % with retry and explanation;
- code activities carry a passing reference, intentionally flawed variants that must fail, and criteria grouped so a security-critical failure cannot be averaged away (`npm run test:paths`, `test:path-authority`, `test:harness` where graders change);
- artifacts list their required fields, their caps and the rubric dimensions before the learner starts;
- English copy passes the stop-slop pass and the product-copy review; no Czech is authored; no AI claim appears in brand or path copy;
- `/dev` → Learning paths shows readiness, and the switch turns on only after readiness, the launch contracts and the acceptance evidence in `docs/release-acceptance.md`.

## 8. Rollout

1. **Sections first, with today's paths inside them.** Epic A ships behind no new switch: it regroups what exists. Learners see three sections, the FDE section shows v1, and nothing they passed moves.
2. **Flagship content module by module.** Epic B lands under `LEARNING_PATH_FDE_ENABLED`; each content issue is independently mergeable because the manifest's inventory and the validator decide what the product shows.
3. **Switch on** after B12's verification, with the Premium copy and the landing promo in the same release.

Rollback: sections are a client and `planTopics` change with no table; disabling FDE keeps additive tables and history as before.

## 9. Work packages (become GitHub issues after approval)

Each issue will carry scope, affected files, blockers, an acceptance checklist and a verification plan in the format #130–#148 used. Dependencies block merges, not commits.

### Epic A: Learn sections

| Id | Work package | Blocked by |
|---|---|---|
| A1 | Section registry and plan membership: `shared/learn-sections.ts`, `LearnerProfile.sections` with derivation, `planTopics` section append plus prerequisite closure, `ai` in the FDE bridges, graph validation, launch contracts | none |
| A2 | Learn page with section switcher and `/learn/:section` routes: rail per section, shared-topic chip, dimmed not-joined state with the join action, deep-link resolution, device memory, states and responsive matrix | A1 |
| A3 | Paths inside sections: paths shelf, canonical routes under `/learn/:section`, client and `vercel.json` redirects, `check:public`, `PathDiscovery` retired from Career, Career pillars regrouped with section progress | A2 |
| A4 | Picker step 2 as Sections: Software Engineer toggle with DSA inside, FDE card, profile save, `LearningPathsCard` and Profile copy | A1 |
| A5 | Today, Home and public landing variants of the sections; translations; `docs/product-architecture.md`, README and `about-project.md` updates | A2, A3 |
| A6 | Path validator: English required, Czech optional while `ENABLED_LANGS` has one entry, parity kept when present; `test:paths` and `/dev` readiness follow | none |

### Epic B: FDE flagship

| Id | Work package | Blocked by |
|---|---|---|
| B1 | Content schema additions: check `scenario`, module `shelf`, code `fixtureNote`; projections, validator, `ActivityViews` rendering | A6 |
| B2 | FDE hub: competency board, loop stepper, interview shelf, taster entry, Premium entry, share card | A3, B1 |
| B3 | Author M02 Decomposition cases (12 cases) | B1 |
| B4 | Revise M01 and M13 (scope, executive update, runbook, workshop outline, push-back email artifacts) | B1 |
| B5 | Revise M04 Enterprise boundaries and identity (OAuth, SSO/SAML, webhooks) with the webhook exercise | B1 |
| B6 | Author M05 Data plumbing with the reconciliation exercise and SQL reading checks | B1 |
| B7 | Revise M08 and M09 (agent loop, human-in-the-loop, sub-agents, golden sets, failure taxonomy, cost) | B1 |
| B8 | Revise M10 and author M11 Deploy in the customer's environment with the release-gate exercise | B1 |
| B9 | Author M14 Codify the pattern; renumber the manifest and bridges; Python bridge reading checks | B3–B8 |
| B10 | Author the interview-prep modules IP01–IP04 (six code drills, twelve design checks, case bank, behavioural prompts) | B1 |
| B11 | Capstone revision: executive update and walkthrough script artifacts; completion label and share card copy | B9 |
| B12 | Taster tier (D3): `learning-path-activity` gating in `contentTier`, `learning-path-start` and `-submit`, upgrade sheet; DSA first module free | A3 |
| B13 | Premium, upgrade sheet and landing copy: FDE as the flagship, section names, `PREMIUM_INCLUDES`, static `/premium` HTML | A5, B2 |
| B14 | Release verification and switch-on: `test:paths`, `test:path-authority`, launch contracts, `check:responsive`, visual QA of the three sections and the hub, `release-acceptance.md`, D1 versioning check against production, the switch | everything above |

Suggested order: A1 → A2 → A3 and A4 in parallel → A5, A6. B1 as soon as A6 merges; B3–B8 and B10 in parallel after B1; B2 after A3 and B1; B9 → B11; B12 and B13 beside; B14 last.

## 10. Decisions for the owner

| Id | Decision | Recommendation |
|---|---|---|
| D1 | Edit FDE v1 in place or publish v2 | In place if the production switch is off and no FDE enrollment exists; otherwise v2. Needs one read of `learning_path_enrollments` in production. |
| D2 | Membership matrix (section 5.1): Git and General shared by Web Developer and Software Engineer; Node.js, Databases, General, DevOps & Cloud and Security shared into FDE as foundations; AI & LLMs owned by FDE; Databases not in Software Engineer | Approve as drawn, or add Databases to Software Engineer (System Design leans on it). |
| D3 | FDE taster: diagnostic and first module free; DSA Foundations first module free | Yes. It follows the "opening stages free" rule and gives the flagship a free front door. |
| D4 | Move path routes under `/learn/:section` with redirects | Yes. One place for learning; old links keep working. |
| D5 | SQL execution spike (server-side SQLite in the Node grader) | Defer. Not needed for v2; revisit after the flagship ships. |
| D6 | Interview prep inside the FDE path (Premium) rather than a separate product surface | Inside. It is the section's strongest differentiator and needs no new gating. |
| D7 | Software Engineer joins by explicit opt-in | Explicit, with derivation for existing learners who already passed its topics. Automatic joining would widen Backend learners' plans without asking. |
| D8 | Keep the Career page name and pillars | Keep; regroup under the three sections. |

## 11. Risks

- **Authoring is the critical path.** Eleven content issues, each with graded fixtures and flawed variants. Mitigation: the section split ships first and does not wait on content; each module is mergeable alone.
- **Plan widening.** Adding sections appends topics and their prerequisites to the plan; Today's queue must not flood. Mitigation: `planTopics` order keeps the track stages first, and Today's single next action is unchanged.
- **Route moves break old links.** Mitigation: client and `vercel.json` redirects, `check:public` updated, the old routes kept in the browser tests until the next release.
- **Validator relaxation hides a Czech regression.** Mitigation: parity still checked where Czech exists; the retained Czech files stay untouched.
- **Copy drift into claims.** Mitigation: the completion label, `nonGoals` and the Premium include list are the only places that describe the path, and the product-copy reviewer runs on every content issue.
