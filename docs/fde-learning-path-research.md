# devShark: Forward Deployed Engineer learning path

Research and product decision | 8 September 2026 | Audience: product owner, content authors, engineering implementers

## Recommendation

Keep devShark a developer-learning product with two independent choices: **engineering track (Fullstack, Frontend, Backend)** and **optional role specialization (Forward Deployed Engineer)**. Preserve the foundations experience and add an experienced-engineer route with targeted diagnostics, implementation exercises, customer scenarios, and a portfolio capstone. Ship in phases behind a devShark-only flag.

Position the first specialization as **FDE foundations with production AI emphasis**. Its value is learning to turn an unclear customer problem into a working, evaluated, maintainable solution. FDE is not a fourth base track, a new product, or an XP rank. No additional specializations are in this release.

This is implementation preparation, not an implemented feature. Companion documents specify the [curriculum](fde-curriculum.md) and [engineering plan](fde-implementation-plan.md). All sizing and pass thresholds below are product hypotheses for a pilot, not validated educational outcomes.

## What the evidence supports

| Evidence | Implication |
|---|---|
| OpenAI's FDE role owns discovery, scoping, system design, build and production rollout, and measures adoption and workflow impact. Its FDSWE role emphasizes hands-on full-stack delivery and reusable abstractions. [OpenAI FDE](https://openai.com/careers/forward-deployed-engineer-(fde)-sf-san-francisco/), [OpenAI FDSWE](https://openai.com/careers/forward-deployed-software-engineer-sf-san-francisco/) | Include technical delivery and customer outcomes together; teach how a prototype becomes a supported production service. |
| Palantir describes customer collaboration, data-intensive work, architecture, custom applications and end-to-end execution. This vacancy asks for 1+ years, while Anthropic's asks for 4+ years. [Palantir role](https://jobs.lever.co/palantir/dab396d4-2f14-4796-aac0-0d82883dccf0), [Anthropic role](https://job-boards.greenhouse.io/anthropic/jobs/5302966008) | Role and seniority must be separate. The intended audience is practicing engineers, but a job title or years-of-experience gate is inappropriate. |
| Anthropic includes Python, customer discovery, enterprise deployments, model evaluation, MCP artifacts and feeding reusable patterns back into Product and Engineering. [Anthropic role](https://job-boards.greenhouse.io/anthropic/jobs/5302966008) | Include a Python bridge and enterprise integration, while preserving devShark's TypeScript strengths. Assess handoff and product feedback, not just model prompts. |
| Anthropic distinguishes fixed workflows from agents and recommends increasing complexity only when justified. The article explicitly notes that its tooling landscape has changed since original publication. [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Teach architectural choices first. Use the article for durable principles, not a frozen recommendation of frameworks or models. |
| Evaluation guidance emphasizes outcome-based checks, representative cases, isolated trials and investigating grader failures. [Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Teach reproducible evaluations and apply similar discipline to the course's own graders; do not require one exact implementation sequence. |
| OWASP identifies direct and indirect injection and excessive permissions/autonomy; retrieval does not eliminate injection. [Prompt injection, 2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/), [Excessive agency, 2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) | Security exercises must test downstream authorization and bounded actions. A stronger prompt alone cannot pass the security gate. |
| MCP documents protocol-specific security boundaries; OpenTelemetry describes logs, metrics and traces for understanding running systems. [MCP security](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices), [Observability primer](https://opentelemetry.io/docs/concepts/observability-primer/) | Include scoped tools and incident diagnosis with supplied traces. Teach a versioned protocol, without making any one platform mandatory. |
| Carnegie Mellon's guidance aligns application and analysis with projects, prototypes and cases, and explains explicit rubric criteria and performance levels. [Assessment alignment](https://www.cmu.edu/teaching/designteach/design/assessments.html), [Rubrics](https://www.cmu.edu/teaching/assessment/assesslearning/rubrics.html) | Keep quizzes as supporting checks; require practical evidence and make assessment criteria visible before submission. This is general teaching guidance, not an FDE-specific efficacy study. |

## Repository findings

Inspected baseline: [`85544c705d0d7d6c7721b03cb26df8055654ba26`](https://github.com/lukaskourilcz/react-express-app/tree/85544c705d0d7d6c7721b03cb26df8055654ba26). This was main when inspected. The issue search found no open issues before this planning work.

| Existing capability | Reuse and boundary |
|---|---|
| `client/src/lib/tracks.ts`, `trackPref.ts`, `PathPickerDialog.tsx` | All three requested tracks already exist. Selection is local plus Supabase user metadata. Add an independent role preference; avoid repurposing track values used by StudyShark. |
| `shared/assessment.ts`, placement branches in `api/quiz/roadmap.ts` | Broad placement already exists. A broad quiz unlock is not evidence of customer delivery or FDE competence. |
| `shared/coding-catalog.ts`, `lib/coding/`, `client/src/components/coding/` | Server-graded JS/TS/React and structured system-design tasks exist. Reuse their execution and sealed-session patterns. There is no general Python, Docker, SQL or remote repository execution service. |
| `client/src/lib/roadmap.ts`, `RoadmapTree.tsx`, `CareerRoadmap.tsx` | Existing level and topic progress stays intact. Add role milestones alongside it; avoid forcing projects into a fixed multiple-choice level ladder. |
| `docs/product-architecture.md`, `lib/product-scope.ts` | devShark is `webdev`, separate from StudyShark. AI tutor features are explicitly disabled for devShark. Learning about AI does not require enabling them. |
| `AGENTS.md`, `package.json`, `vercel.json` | Actual stack is React 19, Vite, Astryx and Vercel handlers; `npm run dev` uses `vercel dev`. No `server/src` exists. The repository planning agent's Express/MUI instructions are stale and must not drive implementation. Keep twelve physical handlers. |
| `translations.ts`, `translations.cs.ts`, product/design documents | Preserve EN/CS parity, existing design primitives and free access. Some landing copy still frames the journey as starting from zero or reaching senior; make the developer-wide promise accurate. |

## Learner experience

1. **Choose engineering track:** Fullstack, Frontend, Backend, in that order on devShark. Describe these as a learning focus, not a claim about current ability.
2. **Choose specialization:** Forward Deployed Engineer or “Continue without specialization.” Explain the role, prerequisites, practical workload and outputs. No fictitious future-role cards.
3. **Choose a starting point:** “Start with foundations” or “Check my existing skills.” FDE learners can preview everything and take targeted diagnostics. Self-declaration affects recommendations only.
4. **See one personal roadmap:** foundations, any needed bridges, then FDE modules. The header reads, for example, “Frontend · Forward Deployed Engineer.” One clear next action; optional exploration remains available.
5. **Practice and retain evidence:** read a short brief, make a decision, implement or debug, inspect feedback, revise, and save a handoff artifact. Resume long work without hearts, countdowns or lost drafts.
6. **Change direction safely:** switching a track recalculates recommendations and preserves passed work. Removing FDE hides its queue entries and preserves its history. Existing users get an optional invitation rather than forced onboarding.

Frontend learners typically need backend/data/operations bridges; backend learners may need operator UI/accessibility bridges; fullstack learners still need customer delivery and AI evaluation. These are defaults to validate through diagnostics, never automatic judgments about an individual.

## Options considered

| Option | Decision |
|---|---|
| Add FDE beside Frontend/Backend/Fullstack | Reject: mixes discipline with a cross-disciplinary role and does not support the requested two-step choice. |
| Add an FDE topic to the existing quiz tree | Use existing topics as prerequisites, but reject this as the whole solution: it cannot represent project evidence, handoff and practical completion honestly. |
| Create a separate advanced app or change every track into an FDE course | Reject: fragments devShark and disrupts its current audience. |
| Add a versioned specialization curriculum over existing tracks | Recommend: preserves foundations and makes additional roles possible through data without shipping them now. |
| Launch with a paid live AI tutor, hosted Python containers and automatic repository evaluation | Defer: creates infrastructure and cost dependencies before validating the curriculum. Core exercises use deterministic fixtures and existing execution. |

## Scope, effort and success measures

The first complete path contains ten modules, a capstone, and optional bridges. Estimate **60–90 learner hours plus 4–12 bridge hours** as an initial planning range. It is not a completion guarantee. At 6–8 hours weekly this is roughly 8–15 weeks before bridges, with substantial individual variation.

Delivery hypothesis for planning: approximately 6–10 engineer-weeks plus 4–6 content/review person-weeks, with overlap possible. This is not a committed calendar; authoring and validating credible exercises may be the critical path. First prove one complete vertical slice before scaling content production.

Pilot with 6–10 practicing engineers spanning all three tracks; observe misunderstandings, grader disagreements and draft/resume behavior. Define activation as track selection → FDE enrollment → first verified practical task within seven days. Track bridge bypass rate, practical completion, task abandonment, repeat visits, grading appeals and reported relevance. Compare cohorts and sample sizes; do not infer hiring impact or causation from a small pilot. Record only aggregate event properties, never code or free-text artifacts.

Proposed launch gates: every required module and Czech overlay reviewed; reference solutions pass; known flawed solutions fail; no grade/tenant isolation failures; no duplicate rewards; complete guest/sign-in/resume and legacy-progress regression coverage. Pilot relevance and usability feedback informs iteration; no invented target conversion rates.

## Evidence limits and maintenance

FDE is not a standardized qualification. The cited employers are deliberately selected examples of general data/platform delivery and AI-intensive delivery, not a representative labor-market survey. No hiring, salary or demand forecast is made. The course cannot reproduce workplace stakeholder pressure or certify seniority. Automated checks verify bounded behavior; portfolio reflections and external deployments remain explicitly self-reviewed until a real review capability exists.

Use original teaching material and synthetic business data. Link primary sources and record retrieval/version information. Do not copy job descriptions, CMU rubric examples or third-party exercises wholesale. Recheck role sources and curriculum quarterly, and recheck provider/protocol details before publishing affected lessons. No vendor account or certification is required.

Research used bounded role searches, targeted technical/teaching guidance, then repository trace and high-impact source spot-checks. We stopped after the role overlap, disagreements, assessment approach and architecture boundaries had primary support. The Supabase changelog fetch returned an internal error; no database change was made. Recheck it before schema implementation.

## Additional requested path

The owner also requested standalone DSA Foundations during planning. It is a focused skill path, not an additional role specialization. Its separate [curriculum and evidence](dsa-foundations-plan.md) covers Big O, core structures, searching, sorting and trees with coding, excluding advanced algorithms. Both paths use the shared engineering infrastructure with independent release gates. See the [complete issue index](learning-paths-plan.md).

## Source provenance

All links above were accessed 8 September 2026. Job postings and CMU guidance expose no reliable publication date in the inspected content; treat them as current snapshots, not permanent requirements. Anthropic's agent-pattern article was originally published 19 December 2024 and now carries a tooling-change notice; its evaluation article is dated 9 January 2026. OWASP pages are the 2025 edition. MCP security uses the versioned 28 July 2026 documentation URL. OpenTelemetry and Supabase documentation are living references.

Claim ledger: employer responsibility/seniority claims map to the four role links; architecture-choice guidance maps to Building effective agents; evaluation design maps to Demystifying evals; threat controls map to OWASP and MCP; observability maps to OpenTelemetry; assessment alignment and rubric structure map to CMU. Repository findings map to the pinned baseline and named files. Curriculum, thresholds, data model, UI and estimates are recommendations from this research, not statements made by these sources.
