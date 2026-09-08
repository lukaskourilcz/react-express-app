# FDE implementation plan

Prepared 8 September 2026 against main `85544c705d0d7d6c7721b03cb26df8055654ba26`.

Companions: [research and product decisions](fde-learning-path-research.md), [curriculum and assessment contract](fde-curriculum.md). GitHub work packages are indexed below after creation.

## Scope and invariants

Add optional FDE specialization after the existing Fullstack/Frontend/Backend choice, with experienced-engineer placement and practical evidence. Non-goals: implementing application code in this planning change; shipping other specializations or changing StudyShark; requiring paid APIs, a new AI tutor or a remote execution platform.

Keep all learning free, `webdev` scope, existing base-track IDs, twelve physical API handlers, EN/CS parity, existing foundations/XP, and the current Astryx/Deep End design. Do not confuse the existing `Specialization` career-label type in `leveling.ts` with the new role ID. Name the new concept `RoleSpecializationId`.

## Domain and content contract

The additional standalone DSA request uses this same bounded path infrastructure: `LearningPathId = 'fde' | 'dsa-foundations'`, with manifest `kind: 'role_specialization' | 'skill_path'`. FDE retains its role preference; DSA has its own independent enrollment and never occupies that preference. See [DSA plan](dsa-foundations-plan.md). Capability and publish readiness are per path so either can launch independently.

Proposed shared modules are `shared/learning-paths.ts` and `shared/learning-path-api.ts`; authored content, answer keys and grading live under `lib/learning-paths/`. This is a new learning domain built on existing registries, not a replacement product/subject registry.

```ts
type RoleSpecializationId = 'fde';
type LearningPreference = {
  schemaVersion: 1;
  baseTrack: 'fullstack' | 'frontend' | 'backend';
  specialization: RoleSpecializationId | null;
};
type EvidenceState =
  | 'not_started' | 'in_progress' | 'verified_pass'
  | 'self_reviewed' | 'needs_revision';
```

Each curriculum definition has immutable ID/version, localized title and outcomes, competency IDs, ordered modules, prerequisite references, activities, required evidence kinds, rubric version, estimated effort, source URLs and review date. Activity IDs remain stable; published versions are immutable. A manifest references existing foundation topics and coding tasks without duplicating them or adding `fde` to `Track`, `CodingTrack` or `RoadmapTopic`.

Separate the public index (titles, prerequisites, estimates, rubric descriptions) from server task payloads and hidden assertions. Public responses may expose assessment criteria, never solutions, answer indices or hidden fixtures. Reuse `shared/coding-api.ts` DTO conventions and generated-summary pattern where appropriate.

New content validator must verify unique IDs, valid topic/task/competency links, acyclic dependencies, complete translations, at least one valid route to completion, versioned rubrics and source review metadata. Authoring remains code-reviewed; `/dev` shows quality/readiness/reporting, not a second CMS.

## Data and migration design

Use additive storage; choose the next available migration at implementation time (025 was latest when inspected). Generate the migration through the applicable Supabase workflow and reconcile with the repository's numbered release procedure. Do not overwrite an applied schema file. Recheck current Supabase changelog/docs before implementation.

| Table | Essential columns and constraints | Access |
|---|---|---|
| `learning_path_enrollments` | id; user_id matching existing text owner type; subject constrained to webdev; path_id; curriculum_version; nullable base_track_at_enrollment (DSA needs no selected track); status active/paused/completed; timestamps; unique(user_id,path_id,curriculum_version) | Authenticated owner reads; server writes |
| `learning_path_attempts` | id; enrollment_id; user_id; activity_id; purpose diagnostic/exercise/project; curriculum/rubric versions; expiry; state; accepted_result; idempotency key + request hash | Service-only if containing grading/session material; safe result exposed through DTO |
| `learning_path_evidence` | id; attempt_id; enrollment_id; user_id; activity_id; revision; bounded JSON artifact; verification_kind; criterion results; timestamp; unique(attempt_id,revision) | Owner-safe fields only; server writes; raw grading key absent |
| `learning_path_progress` | user_id; enrollment_id; module_id; curriculum_version; required/evidence states; completed_at; unique(enrollment_id,module_id) | Owner reads; server-written projection |
| `learning_path_drafts` | user_id; enrollment_id; activity_id; revision; bounded JSON; updated_at; unique(enrollment_id,activity_id) | Owner reads; API saves with revision check |

Index owner/enrollment lookups, attempt expiry, and the exact unique keys used for idempotent acceptance. Use FKs/cascades consistently with existing account deletion; extend `delete_user_data` for this data. Purge expired unsubmitted attempts after 30 days, delete inactive drafts after 90 days with a clear UX notice, retain accepted evidence until user deletion or explicit path-data deletion. These are initial product retention choices to document and test, not externally mandated rules.

Enable RLS on every exposed table. Revoke anon/authenticated writes to authoritative tables. Owner SELECT needs both table grants and `user_id = auth.uid()::text`; role membership alone is insufficient. Never expose grading state merely because the requester owns its attempt. [Supabase RLS reference](https://supabase.com/docs/guides/database/postgres/row-level-security).

Illustrative owner-read policy, not a runnable migration:

```sql
ALTER TABLE public.learning_path_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_path_progress FROM anon, authenticated;
CREATE POLICY learning_path_progress_select_own
  ON public.learning_path_progress FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);
GRANT SELECT ON public.learning_path_progress TO authenticated;
```

Use one transaction to accept a result, write evidence, and update module completion. Lock/check the attempt once; the same key and request hash returns the same accepted result, while the same key with a different payload returns conflict. Service-only RPC execution, if used, must be explicitly revoked from PUBLIC/anon/authenticated; fix search_path and validate ownership in the API. No user metadata or client scores grant mastery. DSA and FDE enrollments can coexist. Completion, drafts, capabilities and queue entries are scoped by path/version; disabling one path leaves the other available. FDE adds **no XP in v1**, avoiding reward inflation and duplicate awards for reused tasks.

Curriculum upgrades create a new enrollment/version only through explicit choice. Show previous completion and new requirements separately; do not erase historical completion. Explicit compatibility mappings may carry verified evidence forward when the author certifies that requirements are unchanged. No default blanket transfer.

## Preference compatibility

Preserve `user_metadata.devquiz_track` and existing `trackPref.ts` behavior for old clients. Add `devquiz_learning_preference_v1` as a non-security preference; derive the old track field from each new save for compatibility. Account preference takes precedence over local cache; missing specialization means null. Validate all enum fields and recover malformed records without blocking existing learning.

New device caches are scoped by product and authenticated user (or a separate guest key). Sign-out clears in-memory account state. Do not apply the prior user's cached preference or progress to the next user. Guests may preview and draft a selection; sign-in never silently replaces an existing account choice or trusts guest mastery. A guest choice can be applied through an explicit “Use this path” action.

Changing track updates recommendations but never deletes evidence. Selecting null pauses FDE enrollment/queue contribution while preserving its data. Preference save and enrollment are separate retryable operations: the UI must show when a preference saved but enrollment failed, then safely retry. Do not claim successful sync merely because local state changed; `trackPref.ts` currently uses best-effort saving and needs explicit error handling for this flow.

## API contract

Proposed endpoints reuse `[op].ts` and `resource=` dispatch. Helper implementations live under `lib/`, keeping the twelve-handler budget. There is **no Express mirror** in this baseline; verify the same endpoints using `vercel dev` and preview.

| Method/path | Request | Response/auth |
|---|---|---|
| GET `/api/quiz/roadmap?resource=learning-path-catalog` | optional locale; fixed server-allowed scope | Public-safe published manifest, capability/version; guest allowed |
| GET/PUT `/api/user/learning-preferences` | PUT LearningPreference | Saved preference; authenticated |
| GET/POST `/api/user/learning-path-enrollment` | POST pathId, curriculumVersion | Owned pinned enrollment; idempotent create; authenticated |
| GET `/api/user/learning-path-progress` | enrollmentId | Modules, evidence provenance, diagnostics, nextActivity; authenticated |
| POST `/api/quiz/roadmap?resource=learning-path-start` | enrollmentId, activityId | attemptId, expiry, opaque session and safe task payload; authenticated |
| POST `/api/quiz/roadmap?resource=learning-path-submit` | attemptId, session, submission, idempotencyKey | Stored result, criterion feedback, evidence state and updated progress; authenticated |
| GET/PUT `/api/user/learning-path-draft` | enrollmentId, activityId; PUT expectedRevision and artifact | Draft and revision; authenticated; conflict on stale update |
| GET `/api/settings` | Existing request | Add specialization enabled/version capability |

Use current `jsonError` envelope. Statuses: 400 invalid data; 401 missing auth; 403 wrong product/subject; 404 unknown or non-owned record (avoid existence leaks); 409 draft/key conflict; 410 expired attempt; 413 oversized payload; 429 rate limit; 503 unavailable/migration missing. Prefer existing error codes where semantically equivalent; document exact codes in shared API types. Do not let the existing generic roadmap PUT progress branch swallow specialization requests.

Server validates owner, deployment, enrollment, activity, version, purpose, allowed task kind and submitted schema. Sessions bind these fields plus expiry. Reject attempts with tampered version or user binding, client completion flags and out-of-scope activity IDs. Activity purpose is derived from the manifest, not trusted from the request.

Initial limits to validate against existing limits: 64 KiB serialized draft/submission, code at the stricter existing runtime limit, 20 saved drafts per enrollment; submission throttling per account/IP with Retry-After. No arbitrary URL fetch, uploaded archive extraction, shell, network-enabled code or npm install during assessment. Reuse the 2.5-second execution deadline; measure total request against the current 10-second Vercel function configuration. Split the capstone into bounded submissions rather than one long request. Authenticated progress/drafts use private no-store caching; manifests cache by published version and locale.

## Client and integration map

| Files | Work |
|---|---|
| `client/src/lib/tracks.ts`, `trackPref.ts`, `App.tsx` | devShark-only requested ordering, preference compatibility, account lifecycle and guarded routes |
| `PathPickerDialog.tsx`, `Home.tsx`, `Profile.tsx` | Track then optional role, reversible settings, honest save/error states; existing users optional invitation |
| `RoadmapTree.tsx`, `CareerRoadmap.tsx`, `client/src/lib/roadmap.ts` | Keep foundation progress; add FDE panel and bridge references without copying the existing level model |
| Proposed `components/specializations/` | Lazy-loaded overview/workspace/progress; reuse existing coding workspace and UI primitives |
| `shared/coding-catalog.ts`, `lib/coding/handlers.ts`, `grade.ts` | Existing runtime adapter with enrollment-scoped authorization for assigned tasks; ordinary coding tier locks remain unchanged |
| `Today.tsx`, `client/src/lib/today.ts`, `queries.ts`, `queryClient.ts` | One resume item and due reviews; deduplicate shared tasks; invalidate only affected account/version queries |
| `components/dev/DevQuality.tsx`, `DevReports.tsx` | Manifest readiness, sources/translation/grader failures, activity-linked reports; server admin authorization preserved |
| `client/product-catalog.ts`, translations, landing primitives | Developer-wide promise and honest completion language, devShark only |

Routes: `/roadmap/specializations/fde` and `/roadmap/specializations/fde/:moduleId`; preserve current `/learn`, `/roadmap` and `/coding`. Overview is previewable without auth; persistence/grading requires sign-in. The specialization branch of the chooser uses explicit Continue/Back actions rather than auto-closing on first base-track activation.

Workspace: brief and constraints, editable task/artifact, authored hints, public rubric, then criterion feedback. Desktop may use two columns; narrow screens stack brief/editor/feedback with controls reachable without covering the editor. Preserve code overflow locally, never across the whole page. Draft autosave has saved/saving/error/conflict states. Offline allows viewing cached material and retaining a local draft, never authoritative grading; reconnect reconciles revisions without overwriting newer work.

Every changed surface must cover loading, empty, error, offline, permission, disabled, success, stale/expired, long text and narrow layout. Reuse Astryx dialogs, radio cards, toast and query conventions. Validate keyboard/focus, non-color feedback, live save status, reduced motion, touch targets, zoom/reflow, light/dark, EN/CS and widths 360–1440. No new illustration-generation dependency is necessary.

## Vertical slice and rollout

1. Shared contracts and static content validator; additive schema/RLS and hidden API.
2. Two-step preference flow, overview and M01/M02 sample tasks. Prove sign-in, save, start, grade, resume, review and no duplicate result before authoring the full path.
3. Competency diagnostics, bridges and remaining modules; staged capstone; Today/Profile integration.
4. Content operations, bilingual product copy, regression and accessibility checks; pilot with the proposed experienced-engineer cohort.
5. Enable the server capability only after migration and complete content readiness pass. Client reads this capability; a client-only environment flag never authorizes writes.

Missing migration or disabled capability must leave all existing learning working. Rollback disables FDE and keeps additive tables/history; previous application versions ignore the new preference. Do not roll back security grants or drop learner evidence. Preserve account export/deletion even while learning capability is off.

## Verification and definition of done

Contract/security coverage: wrong deployment, wrong owner, altered client score, expired/wrong-purpose attempt, key reuse with changed payload, concurrent submissions, stale drafts, oversized payloads, disabled/missing-schema behavior, private answer leakage and account deletion. Content coverage: valid alternative solutions, flawed reference variants, all critical edge fixtures, acyclic modules, task links and EN/CS parity. Compatibility: legacy track and XP snapshots unchanged, ordinary coding gates unchanged, guest/account switch isolation, switching tracks and curriculum versions, duplicate Today entries.

Run repository release commands during implementation: `npm run typecheck:api`, `npm run test:launch`, `npm run build`, `npm run check:responsive`, `npm audit --omit=dev`, `npm audit --omit=dev --prefix client`, `git diff --check`; also `npm run test:coding` and `npm run test:harness` when grading/content changes. Record actual outcomes and any pre-existing failures. Verify the complete flow in `vercel dev` and a preview with representative accounts. Count physical handlers and inspect bundle/DTO output for answer leakage.

This planning PR changes documentation only. No application, migration, deployment or runtime tests are claimed. Verify Markdown links, issue dependencies, real repository paths and clean diff for this PR.

## Work packages

The accompanying GitHub epic is the implementation entry point. Each child issue includes affected files, scope, dependencies, acceptance criteria and verification. Suggested order: contracts → storage/APIs and exercise adapter → onboarding/hub/diagnostics → content/capstone → integration/operations/copy → release verification. Dependencies are blockers, not a requirement for one commit or deployment per issue. Batch coherent changes to avoid unnecessary deployments.
