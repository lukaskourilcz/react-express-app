/** The learner-profile and eligibility resources (issues #151, #152, #153).
 *
 * Mounted on the existing `api/user/[op].ts` dispatcher so the deployment keeps
 * exactly twelve physical functions:
 *   GET  ?op=learner-profile  → the stored profile, its draft and what is missing
 *   PUT  ?op=learner-profile  → propose answers; the server validates and owns the clock
 *   GET  ?op=eligibility      → the one eligibility response every surface reads
 */

import type { VercelRequest, VercelResponse } from './vercel-types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger, jsonError, requireAuthSub } from './http';
import { enforceRateLimit, RATE_LIMITS } from './rate-limit';
import { ProfileMigrationMissing, loadLearnerProfile, saveLearnerProfile } from './learner-profile-store';
import { eligibilityFor } from './progression';
import type { LearnerProfileResponse } from '../shared/learner-profile';

const logEvent = createLogger('user/learning-plan');

const MAX_BODY_KEYS = 12;

function migrationError(res: VercelResponse) {
  return jsonError(res, 503, 'migration_required', 'Learner profile migration 027 is not installed');
}

export async function handleLearnerProfile(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  const userId = await requireAuthSub(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    try {
      const state = await loadLearnerProfile(supabase, userId);
      res.setHeader('Cache-Control', 'private, no-store');
      const body: LearnerProfileResponse = state;
      return res.json(body);
    } catch (error) {
      if (error instanceof ProfileMigrationMissing) return migrationError(res);
      return jsonError(res, 500, 'db_error', 'Could not load the learner profile');
    }
  }

  if (req.method === 'PUT') {
    if (!(await enforceRateLimit(req, res, RATE_LIMITS.userMutation))) return;
    const body = (req.body || {}) as { profile?: unknown };
    const proposed = body.profile;
    if (!proposed || typeof proposed !== 'object' || Array.isArray(proposed) ||
        Object.keys(proposed as Record<string, unknown>).length > MAX_BODY_KEYS) {
      return jsonError(res, 400, 'bad_request', 'A profile object is required');
    }
    try {
      const saved = await saveLearnerProfile(supabase, userId, proposed, new Date().toISOString());
      if (saved.errors.length > 0) {
        return res.status(400).json({ error: { code: 'invalid_profile', message: 'Some answers were not accepted', fields: saved.errors } });
      }
      logEvent({ status: 200, kind: 'profile_saved', complete: saved.state.complete, planChanged: saved.planChanged });
      res.setHeader('Cache-Control', 'private, no-store');
      return res.json({ ...saved.state, planChanged: saved.planChanged });
    } catch (error) {
      if (error instanceof ProfileMigrationMissing) return migrationError(res);
      return jsonError(res, 500, 'db_error', 'Could not save the learner profile');
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
}

export async function handleEligibility(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  try {
    const eligibility = await eligibilityFor(supabase, userId);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(eligibility);
  } catch (error) {
    if (error instanceof ProfileMigrationMissing) return migrationError(res);
    return jsonError(res, 500, 'db_error', 'Could not load learning eligibility');
  }
}
