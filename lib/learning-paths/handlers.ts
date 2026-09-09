/** Learning-path API resources.
 *
 * Mounted on the existing handlers so the twelve-function budget is unchanged:
 * `api/quiz/roadmap.ts` serves learning-path-catalog, learning-path-start and
 * learning-path-submit; `api/user/[op].ts` serves learning-preference,
 * learning-path-enrollment, learning-path-progress and learning-path-draft;
 * `api/settings.ts` publishes the per-path capability.
 *
 * Everything authoritative is derived here, never taken from the request: the
 * owner from the verified token, the deployment scope from the environment,
 * the activity and its purpose from the manifest, and the answer key from the
 * sealed attempt session. A client-supplied score, completion flag or purpose
 * is ignored rather than validated. */

import type { VercelRequest, VercelResponse } from '../vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { AuthError, tryAuth } from '../auth';
import { createLogger, isRpcMissing, jsonError, requireAuthSub, withTimeout } from '../http';
import { enforceRateLimit, RATE_LIMITS } from '../rate-limit';
import { deploymentSubjectIds } from '../product-scope';
import { secureShuffle } from '../quiz-runtime';
import { shuffleWithOrder } from '../coding/grade';
import { codingTaskById } from '../coding/catalog';
import { decodeLearningPathSession, encodeLearningPathSession } from '../quiz-tokens';
import {
  activityIn,
  activitySummary,
  availabilityFor,
  LEARNING_PATHS,
  manifestFor,
  moduleSummary,
  pathById,
  inventoryFor,
  pathEnabledInEnv,
  publicManifest,
} from './catalog';
import {
  codeFeedback,
  codeFromReusedTask,
  gradeArtifact,
  gradeCheck,
  gradePathCode,
  pathCodeTooLarge,
  requestHash,
} from './grade';
import type { MergedActivity, MergedPath } from './types';
import {
  isLearningPathId,
  isBaseTrack,
  moduleComplete,
  nextActivityId as computeNextActivity,
  pathGuidedComplete,
  pathInventory,
  artifactTally,
  type BaseTrack,
  type EvidenceState,
  type LearningPathId,
  type ModuleProgress,
} from '../../shared/learning-paths';
import type {
  CompetencyResult,
  DraftGetResponse,
  DraftSaveRequest,
  DraftSaveResponse,
  EnrollmentCreateRequest,
  EnrollmentListResponse,
  LearningPathCatalogResponse,
  LearningPathCapability,
  LearningPreferenceRequest,
  LearningPreferenceResponse,
  PathAvailability,
  PathCatalogEntry,
  PathDraft,
  PathEnrollment,
  PathProgressResponse,
  StartActivityRequest,
  StartActivityResponse,
  SubmitActivityRequest,
  SubmitActivityResponse,
} from '../../shared/learning-path-api';
import { PATH_LIMITS } from '../../shared/learning-path-api';

const logEvent = createLogger('learning-paths');

const pathsAvailable = () => deploymentSubjectIds().includes('webdev');
const notAvailable = (res: VercelResponse) =>
  jsonError(res, 404, 'not_available', 'Learning paths are not part of this product');

const ID = /^[A-Za-z0-9_-]{16,64}$/;
const newId = () => randomBytes(18).toString('base64url');

/** Storage readiness is discovered, not configured: the first call that hits a
 * missing RPC reports it, and everything else keeps working meanwhile. */
let storageInstalled: boolean | null = null;
export const markStorageMissing = () => { storageInstalled = false; };
export const markStorageInstalled = () => { storageInstalled = true; };

function availability(path: MergedPath): PathAvailability {
  return availabilityFor({
    path,
    enabled: pathEnabledInEnv(path.id),
    storageInstalled: storageInstalled !== false,
  });
}

/** The capability `api/settings.ts` publishes. The client reads it to decide
 * what to show; it never authorizes a write, which is checked here. */
export function learningPathCapability(): LearningPathCapability {
  if (!pathsAvailable()) return { paths: {} };
  const paths: LearningPathCapability['paths'] = {};
  for (const path of LEARNING_PATHS) {
    const state = availability(path);
    paths[path.id] = { enabled: state === 'available', version: path.version, availability: state };
  }
  return { paths };
}

/* ── catalog ───────────────────────────────────────────────────────────── */

/** GET /api/quiz/roadmap?resource=learning-path-catalog — public. */
export async function handleLearningPathCatalog(req: VercelRequest, res: VercelResponse) {
  if (!pathsAvailable()) return notAvailable(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const paths: PathCatalogEntry[] = LEARNING_PATHS.map((path) => {
    const manifest = publicManifest(path);
    return { manifest, availability: availability(path), inventory: pathInventory(manifest) };
  });
  const versions = Object.fromEntries(LEARNING_PATHS.map((path) => [path.id, path.version]));
  // The manifest changes only when a published version changes, so it caches
  // by version rather than per request.
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
  const body: LearningPathCatalogResponse = { paths, versions };
  logEvent({ status: 200, kind: 'catalog', paths: paths.length });
  return res.json(body);
}

/* ── shared lookups ───────────────────────────────────────────────────── */

interface EnrollmentRow {
  enrollment_id: string;
  user_id: string;
  path_id: string;
  curriculum_version: number;
  base_track_at_enrollment: string | null;
  status: string;
  started_at: string;
  updated_at: string;
}
const ENROLLMENT_FIELDS =
  'enrollment_id,user_id,path_id,curriculum_version,base_track_at_enrollment,status,started_at,updated_at';

const toEnrollment = (row: EnrollmentRow): PathEnrollment => ({
  enrollmentId: row.enrollment_id,
  pathId: row.path_id as LearningPathId,
  curriculumVersion: Number(row.curriculum_version),
  status: (row.status as PathEnrollment['status']) ?? 'active',
  baseTrackAtEnrollment: isBaseTrack(row.base_track_at_enrollment) ? row.base_track_at_enrollment : null,
  startedAt: row.started_at,
  updatedAt: row.updated_at,
});

/** A Supabase failure that means migration 026 has not been applied yet. The
 * caller turns it into a 503 and every other feature carries on. */
function migrationMissing(res: VercelResponse, error: { message?: string } | null): boolean {
  if (!isRpcMissing(error) && !/relation .*learning_path_.* does not exist/i.test(error?.message ?? '')) return false;
  markStorageMissing();
  jsonError(res, 503, 'migration_required', 'Learning-path migration 026 is not installed');
  return true;
}

async function loadEnrollments(supabase: SupabaseClient, userId: string): Promise<EnrollmentRow[]> {
  const { data, error } = await withTimeout(
    supabase.from('learning_path_enrollments').select(ENROLLMENT_FIELDS).eq('user_id', userId),
  );
  if (error) throw Object.assign(new Error('db_error'), { supabase: error });
  markStorageInstalled();
  return (data ?? []) as EnrollmentRow[];
}

async function loadEnrollment(
  supabase: SupabaseClient,
  userId: string,
  enrollmentId: string,
): Promise<EnrollmentRow | null> {
  const { data, error } = await withTimeout(
    supabase.from('learning_path_enrollments').select(ENROLLMENT_FIELDS)
      .eq('enrollment_id', enrollmentId).eq('user_id', userId).maybeSingle(),
  );
  if (error) throw Object.assign(new Error('db_error'), { supabase: error });
  markStorageInstalled();
  return (data as EnrollmentRow | null) ?? null;
}

interface ProgressRow {
  module_id: string;
  activity_states: Record<string, {
    state?: string;
    score?: number | null;
    verification?: string | null;
    domainScores?: Record<string, number> | null;
    attempts?: number;
    updatedAt?: string | null;
  }> | null;
  completed_at: string | null;
}

async function loadProgressRows(supabase: SupabaseClient, enrollmentId: string): Promise<ProgressRow[]> {
  const { data, error } = await withTimeout(
    supabase.from('learning_path_progress').select('module_id,activity_states,completed_at').eq('enrollment_id', enrollmentId),
  );
  if (error) throw Object.assign(new Error('db_error'), { supabase: error });
  markStorageInstalled();
  return (data ?? []) as ProgressRow[];
}

/** activity id → recorded state, the shape the shared completion helpers want. */
function stateMap(rows: ProgressRow[]): Map<string, EvidenceState> {
  const states = new Map<string, EvidenceState>();
  for (const row of rows) {
    for (const [activityId, value] of Object.entries(row.activity_states ?? {})) {
      const state = value?.state;
      if (typeof state === 'string') states.set(activityId, state as EvidenceState);
    }
  }
  return states;
}

function moduleProgressFor(path: MergedPath, rows: ProgressRow[]): ModuleProgress[] {
  const byModule = new Map(rows.map((row) => [row.module_id, row]));
  const states = stateMap(rows);
  return path.modules.map((module) => {
    const row = byModule.get(module.id);
    const recorded = row?.activity_states ?? {};
    return {
      moduleId: module.id,
      completed: !module.optional && moduleComplete(module, states),
      completedAt: row?.completed_at ?? null,
      activities: module.activities.map((activity) => {
        const value = recorded[activity.id];
        return {
          activityId: activity.id,
          state: (value?.state as EvidenceState) ?? 'not_started',
          verification: (value?.verification as ModuleProgress['activities'][number]['verification']) ?? null,
          score: typeof value?.score === 'number' ? value.score : null,
          ...(value?.domainScores ? { domainScores: value.domainScores } : {}),
          attempts: Number(value?.attempts ?? 0),
          updatedAt: value?.updatedAt ?? null,
        };
      }),
    };
  });
}

/**
 * Per-competency results from the diagnostic, with an explicit not-assessed
 * state. An aggregate score is never turned into mastery: a competency the
 * learner did not answer for reports as not assessed, not as a zero.
 */
function competencyResults(path: MergedPath, rows: ProgressRow[]): CompetencyResult[] {
  const diagnosticId = path.diagnosticActivityId;
  const recorded = diagnosticId
    ? rows.map((row) => row.activity_states?.[diagnosticId]).find(Boolean)
    : undefined;
  const found = diagnosticId ? activityIn(path, diagnosticId) : null;
  const questions = found?.activity.questions ?? [];
  const score = typeof recorded?.score === 'number' ? recorded.score : null;

  return path.competencies.map((competency) => {
    const items = questions.filter((question) => question.competencies.includes(competency.id)).length;
    if (!recorded || items === 0 || score === null) {
      return { competencyId: competency.id, state: 'not_assessed', score: null, assessedItems: items };
    }
    // The diagnostic records one overall score; per-competency confidence is
    // only as good as the number of items that touched the competency, so the
    // state stays coarse and the item count travels with it.
    return {
      competencyId: competency.id,
      state: score >= (found?.activity.passThreshold ?? 0.8) ? 'demonstrated' : 'gap',
      score,
      assessedItems: items,
    };
  });
}

function recommendedBridges(path: MergedPath, competencies: CompetencyResult[], baseTrack: BaseTrack | null): string[] {
  const gaps = new Set(competencies.filter((one) => one.state === 'gap').map((one) => one.competencyId));
  const unassessed = new Set(competencies.filter((one) => one.state === 'not_assessed').map((one) => one.competencyId));
  const scored = path.bridges.map((bridge) => {
    const gapHits = bridge.competencies.filter((one) => gaps.has(one)).length;
    const unknownHits = bridge.competencies.filter((one) => unassessed.has(one)).length;
    const trackHit = baseTrack && bridge.suggestedFor.includes(baseTrack) ? 1 : 0;
    return { id: bridge.id, weight: gapHits * 4 + unknownHits + trackHit };
  });
  return scored.filter((one) => one.weight > 0).sort((a, b) => b.weight - a.weight).map((one) => one.id);
}

/* ── preference ───────────────────────────────────────────────────────── */

/** GET/PUT /api/user/[op]?op=learning-preference */
export async function handleLearningPreference(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!pathsAvailable()) return notAvailable(res);
  const auth = await tryAuth(req).catch((error) => {
    if (error instanceof AuthError) return null;
    throw error;
  });
  if (!auth?.sub) return jsonError(res, 401, 'unauthorized', 'Sign in to read or change your learning preference');
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');

  if (req.method === 'GET') {
    const { data, error } = await withTimeout(supabase.auth.admin.getUserById(auth.sub));
    if (error) return jsonError(res, 500, 'db_error', 'Could not read the account preference');
    const metadata = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    const {
      parseLearningPreference, parseLearnerProfile, profileFromPreference, missingProfileFields,
      LEARNING_PREFERENCE_META_KEY, LEGACY_TRACK_META_KEY, LEARNER_PROFILE_META_KEY,
    } = await import('../../shared/learning-paths');
    const legacy = metadata[LEGACY_TRACK_META_KEY];
    const preference = parseLearningPreference(metadata[LEARNING_PREFERENCE_META_KEY]);
    // An account that only ever saved a v1 preference reads back as the plan it
    // already chose with its required answers still outstanding, so onboarding
    // asks for what is missing instead of starting again from nothing.
    const profile = parseLearnerProfile(metadata[LEARNER_PROFILE_META_KEY]) ?? profileFromPreference(preference);
    res.setHeader('Cache-Control', 'private, no-store');
    const body: LearningPreferenceResponse = {
      preference,
      legacyTrack: isBaseTrack(legacy) ? legacy : null,
      profile,
      missingProfileFields: missingProfileFields(profile),
    };
    return res.json(body);
  }

  if (req.method === 'PUT') {
    if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;
    const body = (req.body || {}) as Partial<LearningPreferenceRequest>;
    if (!isBaseTrack(body.baseTrack)) return jsonError(res, 400, 'bad_request', 'baseTrack must be fullstack, frontend or backend');
    const specialization = body.specialization === null || body.specialization === undefined ? null : body.specialization;
    if (specialization !== null && specialization !== 'fde') {
      return jsonError(res, 400, 'bad_request', 'specialization must be fde or null');
    }
    const {
      LEARNING_PREFERENCE_META_KEY, LEGACY_TRACK_META_KEY, LEARNER_PROFILE_META_KEY,
      MAX_LEARNER_GOALS, isLearnerGoal, isExperienceLevel, isStudyTime, isSkillPathId,
      parseLearnerProfile, profileFromPreference, parseLearningPreference, missingProfileFields,
    } = await import('../../shared/learning-paths');

    // Validate every field the request actually carries. An answer the server
    // does not recognise is rejected rather than dropped: a learner who thinks
    // they answered should not silently be asked again.
    if (body.goals !== undefined) {
      if (!Array.isArray(body.goals) || body.goals.length === 0 || body.goals.length > MAX_LEARNER_GOALS
          || !body.goals.every(isLearnerGoal)) {
        return jsonError(res, 400, 'bad_request', `goals must be 1 to ${MAX_LEARNER_GOALS} known goals`);
      }
    }
    if (body.experience !== undefined && !isExperienceLevel(body.experience)) {
      return jsonError(res, 400, 'bad_request', 'experience must be one of the published levels');
    }
    if (body.studyTime !== undefined && !isStudyTime(body.studyTime)) {
      return jsonError(res, 400, 'bad_request', 'studyTime must be one of the published bands');
    }
    if (body.skillPaths !== undefined
        && (!Array.isArray(body.skillPaths) || !body.skillPaths.every(isSkillPathId))) {
      return jsonError(res, 400, 'bad_request', 'skillPaths must be known skill paths');
    }

    // Read what the account already holds so a partial save — the Profile's
    // track toggle, which sends no profile answers — keeps the rest.
    const existingRead = await withTimeout(supabase.auth.admin.getUserById(auth.sub));
    const existingMeta = (existingRead.data?.user?.user_metadata ?? {}) as Record<string, unknown>;
    const existing = parseLearnerProfile(existingMeta[LEARNER_PROFILE_META_KEY])
      ?? profileFromPreference(parseLearningPreference(existingMeta[LEARNING_PREFERENCE_META_KEY]));

    const profile = {
      schemaVersion: 2 as const,
      baseTrack: body.baseTrack,
      specialization,
      skillPaths: body.skillPaths ?? existing?.skillPaths ?? [],
      goals: body.goals ?? existing?.goals ?? [],
      experience: body.experience ?? existing?.experience ?? ('' as never),
      studyTime: body.studyTime ?? existing?.studyTime ?? ('' as never),
      updatedAt: new Date().toISOString(),
    };

    // One write, three derived records: the profile, the v1 preference and the
    // legacy field, so nothing that reads an older shape has to change.
    const { error } = await withTimeout(supabase.auth.admin.updateUserById(auth.sub, {
      user_metadata: {
        [LEARNER_PROFILE_META_KEY]: profile,
        [LEARNING_PREFERENCE_META_KEY]: { schemaVersion: 1, baseTrack: body.baseTrack, specialization },
        [LEGACY_TRACK_META_KEY]: body.baseTrack,
      },
    }));
    if (error) return jsonError(res, 500, 'db_error', 'Could not save the learning preference');
    logEvent({
      status: 200,
      kind: 'preference_saved',
      specialization: specialization ?? 'none',
      complete: missingProfileFields(profile).length === 0,
    });
    res.setHeader('Cache-Control', 'private, no-store');
    const saved: LearningPreferenceResponse = {
      preference: { schemaVersion: 1, baseTrack: body.baseTrack, specialization },
      legacyTrack: body.baseTrack,
      profile,
      missingProfileFields: missingProfileFields(profile),
    };
    return res.json(saved);
  }

  res.setHeader('Allow', 'GET, PUT');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}

/* ── enrollment ───────────────────────────────────────────────────────── */

/** GET/POST /api/user/[op]?op=learning-path-enrollment */
export async function handleEnrollment(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!pathsAvailable()) return notAvailable(res);
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Learning-path storage is not configured');

  if (req.method === 'GET') {
    try {
      const rows = await loadEnrollments(supabase, userId);
      res.setHeader('Cache-Control', 'private, no-store');
      const body: EnrollmentListResponse = { enrollments: rows.map(toEnrollment) };
      return res.json(body);
    } catch (error) {
      if (migrationMissing(res, (error as { supabase?: { message?: string } }).supabase ?? null)) return;
      return jsonError(res, 500, 'db_error', 'Could not load enrollments');
    }
  }

  if (req.method === 'POST') {
    if (!(await enforceRateLimit(req, res, RATE_LIMITS.learningPathEnroll))) return;
    const body = (req.body || {}) as Partial<EnrollmentCreateRequest>;
    if (!isLearningPathId(body.pathId)) return jsonError(res, 400, 'bad_request', 'Unknown learning path');
    const path = pathById(body.pathId);
    if (!path) return jsonError(res, 404, 'not_found', 'Unknown learning path');
    if (body.curriculumVersion !== path.version) {
      return jsonError(res, 409, 'version_conflict', 'That curriculum version is not the published one');
    }
    const action = body.action ?? 'enroll';
    if (!['enroll', 'pause', 'resume'].includes(action)) {
      return jsonError(res, 400, 'bad_request', 'action must be enroll, pause or resume');
    }
    if (action === 'enroll' && availability(path) !== 'available') {
      return jsonError(res, 503, 'path_unavailable', 'That learning path is not open for enrollment yet');
    }
    // A skill path records no career context; a role specialization records the
    // base track it sat above, for recommendations only.
    const baseTrack = path.kind === 'role_specialization' && isBaseTrack(body.baseTrack) ? body.baseTrack : null;

    const saved = await withTimeout(supabase.rpc('upsert_learning_path_enrollment', {
      p_user_id: userId,
      p_enrollment_id: newId(),
      p_path_id: path.id,
      p_curriculum_version: path.version,
      p_base_track: baseTrack,
      p_action: action,
    }));
    if (saved.error) {
      if (migrationMissing(res, saved.error)) return;
      return jsonError(res, 500, 'db_error', 'Could not record the enrollment');
    }
    markStorageInstalled();
    const result = (saved.data ?? {}) as { found?: boolean; created?: boolean; enrollment?: EnrollmentRow };
    if (!result.found || !result.enrollment) return jsonError(res, 404, 'not_found', 'No enrollment to change');
    logEvent({ status: 200, kind: 'enrollment', path: path.id, action, created: result.created === true });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({ enrollments: [toEnrollment(result.enrollment)] } satisfies EnrollmentListResponse);
  }

  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}

/* ── progress ─────────────────────────────────────────────────────────── */

/** GET /api/user/[op]?op=learning-path-progress&enrollmentId=… */
export async function handlePathProgress(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!pathsAvailable()) return notAvailable(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Learning-path storage is not configured');

  const enrollmentId = req.query.enrollmentId;
  if (typeof enrollmentId !== 'string' || !ID.test(enrollmentId)) {
    return jsonError(res, 400, 'bad_request', 'An enrollmentId is required');
  }
  try {
    const row = await loadEnrollment(supabase, userId, enrollmentId);
    // A record that exists but is not theirs answers the same as one that does
    // not exist, so the response never confirms another learner's enrollment.
    if (!row) return jsonError(res, 404, 'not_found', 'Unknown enrollment');
    const path = pathById(row.path_id);
    if (!path) return jsonError(res, 404, 'not_found', 'Unknown learning path');

    const rows = await loadProgressRows(supabase, enrollmentId);
    const manifest = publicManifest(path);
    const states = stateMap(rows);
    const competencies = competencyResults(path, rows);
    const enrollment = toEnrollment(row);
    const body: PathProgressResponse = {
      enrollment,
      modules: moduleProgressFor(path, rows),
      competencies,
      recommendedBridges: recommendedBridges(path, competencies, enrollment.baseTrackAtEnrollment),
      nextActivityId: computeNextActivity(manifest, states),
      guidedComplete: pathGuidedComplete(manifest, states),
      artifacts: artifactTally(manifest, states),
      dueActivityIds: [],
    };
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(body);
  } catch (error) {
    if (migrationMissing(res, (error as { supabase?: { message?: string } }).supabase ?? null)) return;
    return jsonError(res, 500, 'db_error', 'Could not load learning-path progress');
  }
}

/* ── starting an activity ─────────────────────────────────────────────── */

/** POST /api/quiz/roadmap?resource=learning-path-start */
export async function handleActivityStart(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!pathsAvailable()) return notAvailable(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.learningPathStart))) return;
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Learning-path storage is not configured');

  const body = (req.body || {}) as Partial<StartActivityRequest>;
  if (typeof body.enrollmentId !== 'string' || !ID.test(body.enrollmentId)) {
    return jsonError(res, 400, 'bad_request', 'An enrollmentId is required');
  }
  if (typeof body.activityId !== 'string' || !/^[a-z0-9-]{3,96}$/.test(body.activityId)) {
    return jsonError(res, 400, 'bad_request', 'An activityId is required');
  }

  let row: EnrollmentRow | null;
  try {
    row = await loadEnrollment(supabase, userId, body.enrollmentId);
  } catch (error) {
    if (migrationMissing(res, (error as { supabase?: { message?: string } }).supabase ?? null)) return;
    return jsonError(res, 500, 'db_error', 'Could not load the enrollment');
  }
  if (!row) return jsonError(res, 404, 'not_found', 'Unknown enrollment');
  const path = pathById(row.path_id);
  if (!path) return jsonError(res, 404, 'not_found', 'Unknown learning path');
  if (availability(path) !== 'available') {
    return jsonError(res, 503, 'path_unavailable', 'That learning path is not open right now');
  }
  if (Number(row.curriculum_version) !== path.version) {
    return jsonError(res, 409, 'version_conflict', 'This enrollment follows an older curriculum version');
  }

  const found = activityIn(path, body.activityId);
  if (!found) return jsonError(res, 404, 'not_found', 'Unknown activity');
  const { module, activity } = found;

  const attemptId = newId();
  // Purpose comes from the manifest, never from the request: it decides
  // whether a result can count as placement evidence or as core completion.
  const opened = await withTimeout(supabase.rpc('open_learning_path_attempt', {
    p_user_id: userId,
    p_attempt_id: attemptId,
    p_enrollment_id: row.enrollment_id,
    p_activity_id: activity.id,
    p_purpose: activity.purpose,
    p_curriculum_version: path.version,
    p_rubric_version: path.rubric.version,
    p_ttl_minutes: 180,
  }));
  if (opened.error) {
    if (migrationMissing(res, opened.error)) return;
    return jsonError(res, 500, 'db_error', 'Could not start the activity');
  }
  const openedResult = (opened.data ?? {}) as { ok?: boolean; reason?: string; expiresAt?: string };
  if (!openedResult.ok) {
    if (openedResult.reason === 'paused') return jsonError(res, 409, 'enrollment_paused', 'Resume this path before starting an activity');
    return jsonError(res, 404, 'not_found', 'Unknown enrollment');
  }

  const payload = await buildActivityPayload(path, activity, supabase, row.enrollment_id);
  if ('error' in payload) return jsonError(res, payload.status, payload.code, payload.message);

  const session = encodeLearningPathSession({
    attemptId,
    enrollmentId: row.enrollment_id,
    userId,
    pathId: path.id,
    activityId: activity.id,
    activityKind: activity.kind,
    purpose: activity.purpose,
    curriculumVersion: path.version,
    rubricVersion: path.rubric.version,
    ...(payload.answerKey ? { answerKey: payload.answerKey } : {}),
  });

  let previous: StartActivityResponse['previous'] = null;
  try {
    const rows = await loadProgressRows(supabase, row.enrollment_id);
    const recorded = rows.find((one) => one.module_id === module.id)?.activity_states?.[activity.id];
    if (recorded) {
      previous = {
        state: (recorded.state as EvidenceState) ?? 'not_started',
        score: typeof recorded.score === 'number' ? recorded.score : null,
        attempts: Number(recorded.attempts ?? 0),
      };
    }
  } catch {
    // Prior state is context, not a precondition: a workspace still opens.
  }

  res.setHeader('Cache-Control', 'private, no-store');
  const out: StartActivityResponse = {
    attemptId,
    session: session.token,
    expiresAt: new Date(session.expiresAt).toISOString(),
    activity: activitySummary(activity),
    purpose: activity.purpose,
    ...(payload.lesson ? { lesson: payload.lesson } : {}),
    ...(payload.check ? { check: payload.check } : {}),
    ...(payload.code ? { code: payload.code } : {}),
    ...(payload.artifact ? { artifact: payload.artifact } : {}),
    draft: payload.draft,
    previous,
  };
  logEvent({ status: 200, kind: 'start', path: path.id, activityKind: activity.kind, purpose: activity.purpose });
  return res.json(out);
}

type ActivityPayload =
  | { error: true; status: number; code: string; message: string }
  | {
      answerKey?: number[];
      lesson?: StartActivityResponse['lesson'];
      check?: StartActivityResponse['check'];
      code?: StartActivityResponse['code'];
      artifact?: StartActivityResponse['artifact'];
      draft: PathDraft | null;
    };

/** Builds the learner-facing payload. Options are shuffled per attempt and the
 * correct index is returned separately, for the sealed session only. */
async function buildActivityPayload(
  path: MergedPath,
  activity: MergedActivity,
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<ActivityPayload> {
  let draft: PathDraft | null = null;
  if (activity.kind === 'code' || activity.kind === 'artifact') {
    const { data } = await withTimeout(
      supabase.from('learning_path_drafts').select('activity_id,revision,content,updated_at')
        .eq('enrollment_id', enrollmentId).eq('activity_id', activity.id).maybeSingle(),
    );
    if (data) {
      draft = {
        activityId: activity.id,
        revision: Number(data.revision ?? 1),
        content: (data.content ?? {}) as PathDraft['content'],
        updatedAt: data.updated_at as string,
      };
    }
  }

  switch (activity.kind) {
    case 'lesson': {
      const lesson = activity.lessonId
        ? path.modules.flatMap((one) => one.lessons).find((one) => one.id === activity.lessonId)
        : undefined;
      if (!lesson) return { error: true, status: 404, code: 'not_found', message: 'Unknown lesson' };
      return {
        lesson: { id: lesson.id, title: lesson.title, sections: lesson.sections, sources: lesson.sources },
        draft: null,
      };
    }
    case 'check': {
      const answerKey: number[] = [];
      const questions = (activity.questions ?? []).map((question) => {
        const { shuffled, order } = shuffleWithOrder(question.options, secureShuffle);
        answerKey.push(order.indexOf(question.correct));
        return {
          id: question.id,
          prompt: question.prompt,
          ...(question.context ? { context: question.context } : {}),
          options: shuffled,
          ...(question.domain ? { domain: question.domain } : {}),
          competencies: question.competencies,
        };
      });
      return {
        answerKey,
        check: {
          questions,
          passThreshold: activity.passThreshold ?? 0.8,
          ...(activity.domains ? { domainThreshold: activity.passThreshold ?? 0.8 } : {}),
        },
        draft: null,
      };
    }
    case 'code': {
      const code = activity.code ?? reusedCode(activity);
      if (!code) return { error: true, status: 404, code: 'not_found', message: 'Unknown task' };
      return {
        code: {
          language: code.language,
          prompt: code.prompt,
          starter: code.starter,
          ...(code.skeleton ? { skeleton: code.skeleton } : {}),
          hints: code.hints,
          ...(code.approach ? { approach: code.approach } : {}),
          ...(code.contract ? { contract: code.contract } : {}),
          ...(code.tests.length ? { tests: code.tests.map(({ criterion: _criterion, ...test }) => test) } : {}),
          ...(code.typeTests.length ? { typeTests: code.typeTests } : {}),
          ...(code.suite ? { suite: code.suite } : {}),
        },
        draft,
      };
    }
    case 'artifact': {
      if (!activity.artifact) return { error: true, status: 404, code: 'not_found', message: 'Unknown artifact' };
      return {
        artifact: {
          brief: activity.artifact.brief,
          fields: activity.artifact.fields,
          rubricDimensions: activity.artifact.rubricDimensions,
        },
        draft,
      };
    }
  }
}

/** A code activity that reuses an ordinary coding task. Reaching it here needs
 * the enrollment, not the ordinary tier ladder, and the grade it produces is
 * path evidence only. */
function reusedCode(activity: MergedActivity) {
  if (!activity.reuseTaskId) return null;
  const task = codingTaskById(activity.reuseTaskId);
  return task ? codeFromReusedTask(task) : null;
}

/* ── submitting ───────────────────────────────────────────────────────── */

/** POST /api/quiz/roadmap?resource=learning-path-submit */
export async function handleActivitySubmit(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!pathsAvailable()) return notAvailable(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.learningPathSubmit))) return;
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Learning-path storage is not configured');

  const body = (req.body || {}) as Partial<SubmitActivityRequest>;
  if (typeof body.session !== 'string' || body.session.length > 16_384) {
    return jsonError(res, 400, 'invalid_session', 'The activity session is missing');
  }
  const session = decodeLearningPathSession(body.session);
  if (!session) return jsonError(res, 410, 'session_expired', 'This attempt expired or is no longer valid. Start it again.');
  // Token binding: a session minted for another account is not this caller's.
  if (session.userId !== userId) return jsonError(res, 403, 'forbidden', 'This attempt belongs to another account');
  if (typeof body.idempotencyKey !== 'string' || !PATH_LIMITS.idempotencyKeyPattern.test(body.idempotencyKey)) {
    return jsonError(res, 400, 'bad_request', 'An idempotencyKey is required');
  }

  const path = pathById(session.pathId);
  if (!path) return jsonError(res, 404, 'not_found', 'Unknown learning path');
  if (session.curriculumVersion !== path.version) {
    return jsonError(res, 409, 'version_conflict', 'The curriculum changed while this attempt was open. Start it again.');
  }
  const found = activityIn(path, session.activityId);
  if (!found) return jsonError(res, 404, 'not_found', 'Unknown activity');
  const { module, activity } = found;
  if (activity.kind !== session.activityKind || activity.purpose !== session.purpose) {
    return jsonError(res, 409, 'session_mismatch', 'This attempt no longer matches the activity');
  }

  let state: EvidenceState = 'in_progress';
  let score: number | null = null;
  let domainScores: Record<string, number> | null = null;
  let failedDomains: string[] = [];
  let criteria: SubmitActivityResponse['criteria'] = [];
  let questions: SubmitActivityResponse['questions'] = null;
  let code: SubmitActivityResponse['code'] = null;
  let feedback: SubmitActivityResponse['feedback'] = [];
  let artifact: Record<string, string | string[]> | null = null;

  switch (activity.kind) {
    case 'lesson': {
      if (body.acknowledged !== true) return jsonError(res, 400, 'bad_request', 'acknowledged must be true');
      state = 'self_reviewed';
      feedback = [{
        en: 'Marked as read. Reading is recorded for your own overview; it is not a verified check and never gates a module.',
        cs: 'Označeno jako přečtené. Čtení se eviduje pro tvůj přehled; není to ověřená kontrola a nikdy nic neblokuje.',
      }];
      break;
    }
    case 'check': {
      const answers = body.answers;
      const expected = activity.questions?.length ?? 0;
      if (!Array.isArray(answers) || answers.length !== expected ||
          !answers.every((one) => Number.isInteger(one) && one >= 0 && one <= 25)) {
        return jsonError(res, 400, 'bad_request', `answers must hold ${expected} option indexes`);
      }
      const graded = gradeCheck(activity, session.answerKey, answers);
      state = graded.state;
      score = graded.score;
      domainScores = graded.domainScores;
      failedDomains = graded.failedDomains;
      questions = graded.verdicts;
      if (graded.failedDomains.length > 0) {
        feedback = [{
          en: 'Every area has to clear the threshold on its own, so a strong area cannot cover a thin one. Revisit the areas listed above and try the check again.',
          cs: 'Každá oblast musí projít prahem sama, takže silná oblast nemůže zakrýt slabou. Vrať se k oblastem uvedeným výše a zkus kontrolu znovu.',
        }];
      } else if (state !== 'verified_pass') {
        feedback = [{
          en: 'Read the explanation under each miss before retrying — every question says why the other options fail here, not only why the right one works.',
          cs: 'Než to zkusíš znovu, přečti si vysvětlení u každé chyby — každá otázka říká, proč tu ostatní možnosti selhávají, ne jen proč ta správná funguje.',
        }];
      }
      break;
    }
    case 'code': {
      if (typeof body.code !== 'string' || body.code.length === 0) {
        return jsonError(res, 400, 'bad_request', 'code is required');
      }
      if (pathCodeTooLarge(body.code)) return jsonError(res, 413, 'too_large', 'Code is limited to 20 kB');
      const merged = activity.code ?? reusedCode(activity);
      if (!merged) return jsonError(res, 404, 'not_found', 'Unknown task');
      const graded = await gradePathCode(activity, merged, body.code);
      // Infrastructure failure is retryable, never a recorded learner failure.
      if (graded.code.outcome === 'error' && graded.state === 'in_progress') {
        return jsonError(res, 503, 'runner_unavailable', graded.code.codeError ?? 'The runner could not start. Try again in a moment.');
      }
      state = graded.state;
      score = graded.score;
      criteria = graded.criteria;
      code = graded.code;
      feedback = codeFeedback(graded);
      break;
    }
    case 'artifact': {
      const submitted = body.artifact;
      if (submitted !== undefined && (typeof submitted !== 'object' || submitted === null || Array.isArray(submitted))) {
        return jsonError(res, 400, 'bad_request', 'artifact must be an object of field values');
      }
      if (submitted && Buffer.byteLength(JSON.stringify(submitted), 'utf8') > PATH_LIMITS.payloadBytes) {
        return jsonError(res, 413, 'too_large', 'The submission is limited to 64 kB');
      }
      const graded = gradeArtifact(activity, submitted as Record<string, string | string[]> | undefined);
      state = graded.state;
      criteria = graded.criteria;
      feedback = graded.feedback;
      artifact = graded.cleaned;
      break;
    }
  }

  // Module completion is decided from the manifest plus the states already on
  // record, with this result folded in — the client never asserts it.
  let rows: ProgressRow[] = [];
  try {
    rows = await loadProgressRows(supabase, session.enrollmentId);
  } catch (error) {
    if (migrationMissing(res, (error as { supabase?: { message?: string } }).supabase ?? null)) return;
    return jsonError(res, 500, 'db_error', 'Could not load learning-path progress');
  }
  // A verified pass is never demoted by a later weaker attempt: the learner
  // keeps what they proved. The RPC applies the same rule, so this projection
  // matches what the write is about to store.
  const states = stateMap(rows);
  const priorState = states.get(activity.id);
  const effectiveState: EvidenceState =
    priorState === 'verified_pass' && state !== 'verified_pass' ? 'verified_pass' : state;
  states.set(activity.id, effectiveState);
  const moduleWillComplete = !module.optional && moduleComplete(module, states);

  const manifest = publicManifest(path);
  const projected = projectModuleProgress(module, rows, activity, effectiveState, score, domainScores);

  // The whole response is stored with the accepted result, so replaying the
  // same key returns exactly what the learner saw the first time rather than a
  // second grading that could disagree with it.
  const out: SubmitActivityResponse = {
    activityId: activity.id,
    state,
    verification: activity.verification,
    score,
    ...(domainScores ? { domainScores } : {}),
    ...(failedDomains.length ? { failedDomains } : {}),
    criteria,
    questions,
    code,
    feedback,
    module: projected,
    guidedComplete: pathGuidedComplete(manifest, states),
    nextActivityId: computeNextActivity(manifest, states),
    replayed: false,
    xpAwarded: 0,
  };

  const accepted = await withTimeout(supabase.rpc('accept_learning_path_result', {
    p_user_id: userId,
    p_attempt_id: session.attemptId,
    p_idempotency_key: body.idempotencyKey,
    p_request_hash: requestHash({
      answers: body.answers ?? null,
      code: body.code ?? null,
      artifact: artifact ?? null,
      acknowledged: body.acknowledged ?? null,
    }),
    p_module_id: module.id,
    p_state: state,
    p_verification_kind: activity.verification,
    p_score: score,
    p_domain_scores: domainScores,
    p_criteria: criteria.map((criterion) => ({ id: criterion.id, critical: criterion.critical, passed: criterion.passed })),
    p_artifact: artifact,
    p_module_complete: moduleWillComplete,
    p_result: out,
  }));
  if (accepted.error) {
    if (migrationMissing(res, accepted.error)) return;
    return jsonError(res, 500, 'db_error', 'Could not record the result');
  }
  markStorageInstalled();
  const outcome = (accepted.data ?? {}) as { ok?: boolean; reason?: string; replayed?: boolean; result?: unknown };
  if (!outcome.ok) {
    if (outcome.reason === 'expired') return jsonError(res, 410, 'attempt_expired', 'This attempt expired. Start it again.');
    if (outcome.reason === 'conflict') {
      return jsonError(res, 409, 'idempotency_conflict', 'That submission key was already used with different work');
    }
    return jsonError(res, 404, 'not_found', 'Unknown attempt');
  }

  res.setHeader('Cache-Control', 'private, no-store');
  logEvent({
    status: 200, kind: 'submit', path: path.id, activityKind: activity.kind,
    state, replayed: outcome.replayed === true,
  });
  if (outcome.replayed === true) {
    const stored = (outcome.result ?? out) as SubmitActivityResponse;
    return res.json({ ...stored, replayed: true });
  }
  return res.json(out);
}

/**
 * What the module projection will hold once this result is written.
 *
 * Computed rather than re-read, so the response the learner sees and the
 * response stored for a replay are the same object. The arithmetic mirrors
 * `accept_learning_path_result`: attempts increment, the best score is kept,
 * and a verified pass is never demoted.
 */
function projectModuleProgress(
  module: MergedPath['modules'][number],
  rows: ProgressRow[],
  activity: MergedActivity,
  state: EvidenceState,
  score: number | null,
  domainScores: Record<string, number> | null,
): ModuleProgress {
  const row = rows.find((one) => one.module_id === module.id);
  const recorded = row?.activity_states ?? {};
  const now = new Date().toISOString();
  const states = new Map<string, EvidenceState>();
  for (const one of rows) {
    for (const [id, value] of Object.entries(one.activity_states ?? {})) {
      if (typeof value?.state === 'string') states.set(id, value.state as EvidenceState);
    }
  }
  states.set(activity.id, state);
  return {
    moduleId: module.id,
    completed: !module.optional && moduleComplete(module, states),
    completedAt: row?.completed_at ?? (moduleComplete(module, states) && !module.optional ? now : null),
    activities: module.activities.map((one) => {
      const value = recorded[one.id];
      if (one.id !== activity.id) {
        return {
          activityId: one.id,
          state: (value?.state as EvidenceState) ?? 'not_started',
          verification: (value?.verification as ModuleProgress['activities'][number]['verification']) ?? null,
          score: typeof value?.score === 'number' ? value.score : null,
          ...(value?.domainScores ? { domainScores: value.domainScores } : {}),
          attempts: Number(value?.attempts ?? 0),
          updatedAt: value?.updatedAt ?? null,
        };
      }
      const bestScore = Math.max(typeof value?.score === 'number' ? value.score : 0, score ?? 0);
      return {
        activityId: one.id,
        state,
        verification: activity.verification,
        score: score === null && typeof value?.score !== 'number' ? null : bestScore,
        ...(domainScores ? { domainScores } : {}),
        attempts: Number(value?.attempts ?? 0) + 1,
        updatedAt: now,
      };
    }),
  };
}

/* ── drafts ───────────────────────────────────────────────────────────── */

/** GET/PUT /api/user/[op]?op=learning-path-draft */
/* ── GET/POST ?op=learning-path-reward ─────────────────────────────────── */

/**
 * The merchandise package a finished learning path earns: a t-shirt, a mug and
 * a sticker set.
 *
 * Completion is the server's own reading of the progress rows the graders
 * wrote — `path_is_complete` counts them against the module count this
 * deployment ships — so a client cannot claim a package for a path it did not
 * finish. The claim is keyed by (learner, path), which is what makes it
 * one-time: completing twice, or two devices reporting the same completion,
 * grants once and the second call reports the first order.
 *
 * A reward *for* learning is not a purchase that affects learning. Nothing here
 * touches XP, scores, streaks, ranks or access; the only thing that changes is
 * that somebody is owed a parcel.
 *
 * The address is part of the claim rather than a later step because
 * `merch_orders` requires one, and a placeholder would put a fake address in
 * the table the owner ships from. And the package is an order, not a parcel:
 * merchandise is still unconfigured — no supplier, no stock, no postage — so
 * what a claim produces is something waiting for the owner to fulfil.
 */
export async function handlePathReward(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Account storage is not configured');
  if (!deploymentSubjectIds().includes('webdev')) {
    return jsonError(res, 404, 'not_available', 'Learning paths are not part of this product');
  }
  res.setHeader('Cache-Control', 'private, no-store');

  const pathId = typeof req.query.pathId === 'string' ? req.query.pathId : String((req.body as { pathId?: unknown })?.pathId ?? '');
  if (!isLearningPathId(pathId)) return jsonError(res, 400, 'bad_request', 'Unknown path');
  const inventory = inventoryFor(pathId);
  if (!inventory) return jsonError(res, 404, 'not_found', 'Unknown path');

  const missing = (error: { message?: string } | null) =>
    /does not exist|schema cache/i.test(error?.message ?? '');

  if (req.method === 'GET') {
    const [claim, complete] = await Promise.all([
      withTimeout(supabase.from('path_reward_claims').select('order_id,claimed_at').eq('user_id', userId).eq('path_id', pathId).maybeSingle()),
      withTimeout(supabase.rpc('path_is_complete', { p_user_id: userId, p_path_id: pathId, p_modules: inventory.modules })),
    ]);
    if (missing(claim.error) || missing(complete.error)) {
      return jsonError(res, 503, 'migration_required', 'Run supabase/supabase-schema-035.sql to enable path rewards');
    }
    if (claim.error || complete.error) return jsonError(res, 500, 'db_error', 'Could not read the reward state');
    return res.json({
      eligible: complete.data === true,
      claimed: Boolean(claim.data),
      orderId: claim.data?.order_id ?? null,
      modules: inventory.modules,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;

  const body = (req.body || {}) as Record<string, unknown>;
  const text = (value: unknown, max: number): string =>
    (typeof value === 'string' ? value.trim() : '').slice(0, max);

  const claimed = await withTimeout(
    supabase.rpc('claim_path_reward', {
      p_user_id: userId,
      p_path_id: pathId,
      p_modules: inventory.modules,
      p_shirt: text(body.shirt, 3).toUpperCase(),
      p_name: text(body.name, 120),
      p_line1: text(body.line1, 160),
      p_line2: text(body.line2, 160) || null,
      p_city: text(body.city, 80),
      p_postal: text(body.postal, 24),
      p_country: text(body.country, 2).toUpperCase(),
    }),
  );
  if (claimed.error) {
    if (missing(claimed.error)) {
      return jsonError(res, 503, 'migration_required', 'Run supabase/supabase-schema-035.sql to enable path rewards');
    }
    if (/path_not_complete/i.test(claimed.error.message ?? '')) {
      return jsonError(res, 409, 'not_complete', 'Finish every module of the path first');
    }
    if (/invalid_address/i.test(claimed.error.message ?? '')) {
      return jsonError(res, 400, 'invalid_address', 'A name, street, town, postcode and two-letter country are all required');
    }
    if (/invalid_variant/i.test(claimed.error.message ?? '')) {
      return jsonError(res, 400, 'bad_request', 'Pick a shirt size');
    }
    return jsonError(res, 500, 'db_error', 'Could not claim the package');
  }
  const row = Array.isArray(claimed.data) ? claimed.data[0] : claimed.data;
  logEvent({ status: 200, kind: 'path_reward_claimed', granted: row?.granted === true });
  return res.json({
    granted: row?.granted === true,
    already: row?.already === true,
    orderId: row?.reward_order_id ?? null,
  });
}

export async function handlePathDraft(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient | null) {
  if (!pathsAvailable()) return notAvailable(res);
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!supabase) return jsonError(res, 503, 'not_configured', 'Learning-path storage is not configured');

  if (req.method === 'GET') {
    const enrollmentId = req.query.enrollmentId;
    const activityId = req.query.activityId;
    if (typeof enrollmentId !== 'string' || !ID.test(enrollmentId)) {
      return jsonError(res, 400, 'bad_request', 'An enrollmentId is required');
    }
    if (typeof activityId !== 'string' || !/^[a-z0-9-]{3,96}$/.test(activityId)) {
      return jsonError(res, 400, 'bad_request', 'An activityId is required');
    }
    try {
      const owned = await loadEnrollment(supabase, userId, enrollmentId);
      if (!owned) return jsonError(res, 404, 'not_found', 'Unknown enrollment');
      const { data, error } = await withTimeout(
        supabase.from('learning_path_drafts').select('activity_id,revision,content,updated_at')
          .eq('enrollment_id', enrollmentId).eq('activity_id', activityId).maybeSingle(),
      );
      if (error) return jsonError(res, 500, 'db_error', 'Could not load the draft');
      res.setHeader('Cache-Control', 'private, no-store');
      const out: DraftGetResponse = {
        draft: data
          ? {
              activityId,
              revision: Number(data.revision ?? 1),
              content: (data.content ?? {}) as PathDraft['content'],
              updatedAt: data.updated_at as string,
            }
          : null,
      };
      return res.json(out);
    } catch (error) {
      if (migrationMissing(res, (error as { supabase?: { message?: string } }).supabase ?? null)) return;
      return jsonError(res, 500, 'db_error', 'Could not load the draft');
    }
  }

  if (req.method === 'PUT') {
    if (!(await enforceRateLimit(req, res, RATE_LIMITS.learningPathDraft))) return;
    const body = (req.body || {}) as Partial<DraftSaveRequest>;
    if (typeof body.enrollmentId !== 'string' || !ID.test(body.enrollmentId)) {
      return jsonError(res, 400, 'bad_request', 'An enrollmentId is required');
    }
    if (typeof body.activityId !== 'string' || !/^[a-z0-9-]{3,96}$/.test(body.activityId)) {
      return jsonError(res, 400, 'bad_request', 'An activityId is required');
    }
    if (!Number.isInteger(body.expectedRevision) || (body.expectedRevision as number) < 0) {
      return jsonError(res, 400, 'bad_request', 'expectedRevision must be a whole number');
    }
    const content = body.content;
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return jsonError(res, 400, 'bad_request', 'content is required');
    }
    const serialized = JSON.stringify(content);
    if (Buffer.byteLength(serialized, 'utf8') > PATH_LIMITS.payloadBytes) {
      return jsonError(res, 413, 'too_large', 'A draft is limited to 64 kB');
    }
    if (typeof content.code === 'string' && pathCodeTooLarge(content.code)) {
      return jsonError(res, 413, 'too_large', 'Code is limited to 20 kB');
    }

    const saved = await withTimeout(supabase.rpc('save_learning_path_draft', {
      p_user_id: userId,
      p_enrollment_id: body.enrollmentId,
      p_activity_id: body.activityId,
      p_expected_revision: body.expectedRevision,
      p_content: content,
      p_max_drafts: PATH_LIMITS.draftsPerEnrollment,
    }));
    if (saved.error) {
      if (migrationMissing(res, saved.error)) return;
      return jsonError(res, 500, 'db_error', 'Could not save the draft');
    }
    markStorageInstalled();
    const result = (saved.data ?? {}) as { ok?: boolean; reason?: string; revision?: number; updatedAt?: string };
    if (!result.ok) {
      if (result.reason === 'conflict') {
        // The other device's copy is newer. Say so with its revision rather
        // than overwriting work the learner has not seen.
        return jsonError(res, 409, 'draft_conflict', 'A newer draft was saved elsewhere. Reload before saving again.');
      }
      if (result.reason === 'too_many_drafts') {
        return jsonError(res, 409, 'too_many_drafts', `A path keeps at most ${PATH_LIMITS.draftsPerEnrollment} drafts at a time`);
      }
      return jsonError(res, 404, 'not_found', 'Unknown enrollment');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    const out: DraftSaveResponse = {
      draft: {
        activityId: body.activityId,
        revision: Number(result.revision ?? 1),
        content: content as PathDraft['content'],
        updatedAt: result.updatedAt ?? new Date().toISOString(),
      },
    };
    return res.json(out);
  }

  res.setHeader('Allow', 'GET, PUT');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}

/* ── module summary, for the dev readiness screen ─────────────────────── */

export { manifestFor, moduleSummary };
