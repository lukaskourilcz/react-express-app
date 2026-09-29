import { getSupabaseSession, hasStoredSession, mayHaveSession } from './supabaseClient';
import { getStoredLang, translateStatic } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { openUpgradeSheet } from './upgradeSheet';
import { PREMIUM_REQUIRED, type GatedKind } from '../../../shared/tiers';

const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Options = RequestInit & { timeoutMs?: number; signal?: AbortSignal };

// Attach the current user's Supabase access token to API requests so the
// server can verify identity. Read directly from the Supabase session, which
// is refreshed and persisted by the supabase-js client. A visitor without a
// session sends no token and never downloads that client
// (lib/supabaseClient.ts); for a returning visitor whose download is still
// running, the same four-second limit covers it.
//
// A session stored in this browser whose token cannot be read (a refresh
// slower than the limit, a refresh that failed offline, a download that
// failed) is still a signed-in learner, not a guest. Sent without the token,
// the request would be answered as a guest's: a quiz graded under nobody's
// name with its one-time claim spent, a Learn step refused as someone else's,
// Premium content locked. So nothing is sent, and the caller gets a retryable
// `auth_unavailable`. Only a browser with no stored session sends no token.
const TOKEN_READ_LIMIT_MS = 4_000;

async function getAccessToken(): Promise<string | null> {
  if (!mayHaveSession()) return null;
  let timer: number | undefined;
  let session: Awaited<ReturnType<typeof getSupabaseSession>> = null;
  try {
    session = await Promise.race([
      getSupabaseSession(),
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error('auth_timeout')), TOKEN_READ_LIMIT_MS);
      }),
    ]);
  } catch {
    session = null;
  } finally {
    window.clearTimeout(timer);
  }
  if (session?.access_token) return session.access_token;
  // supabase-js removes a session it can no longer refresh; one it keeps is
  // waiting for the network.
  if (hasStoredSession()) {
    throw new ApiError(translateStatic('error.authUnavailable'), 0, 'auth_unavailable');
  }
  return null;
}

/** The server refused locked content; the upgrade sheet is already open. */
export const isPremiumRequired = (err: unknown): boolean =>
  err instanceof ApiError && err.status === 402 && err.code === PREMIUM_REQUIRED;

export async function apiFetch<T>(url: string, opts: Options = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = opts;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);

  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', forwardAbort, { once: true });
  }

  try {
    // Inside the try, so a token that cannot be read settles like any other
    // failure: the timer and the abort listener are released below.
    const token = await getAccessToken();
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
    });

    if (!res.ok) {
      let body: { error?: { code?: string; message?: string; kind?: GatedKind; ref?: string } } = {};
      try {
        body = await res.json();
      } catch {
        // non-JSON body, keep default
      }
      // Locked content, in one place: whatever asked, the learner sees the
      // upgrade sheet rather than an error, even from a stale client.
      if (res.status === 402 && body?.error?.code === PREMIUM_REQUIRED) {
        openUpgradeSheet({ kind: body.error.kind, ref: body.error.ref, fromResponse: true });
      }
      // Without a server message (an HTML 404 page, a proxy error) the learner
      // gets the generic copy, never a bare status text such as "Not Found".
      throw new ApiError(
        body?.error?.message || translateStatic('error.generic'),
        res.status,
        body?.error?.code,
      );
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      const timedOut = reason instanceof Error && reason.message === 'timeout';
      throw new ApiError(
        timedOut ? 'Request timed out. Try again.' : 'Request was cancelled.',
        0,
        timedOut ? 'timeout' : 'cancelled',
      );
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Network error',
      0,
      'network',
    );
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

// Error codes with dedicated user-facing copy in the i18n dictionaries.
// timeout/cancelled are minted client-side in apiFetch above; the play codes
// have a single, unambiguous meaning so the dictionary copy fits every caller.
const CODE_KEYS: Partial<Record<string, TranslationKey>> = {
  timeout: 'error.timeout',
  cancelled: 'error.cancelled',
  // Minted in getAccessToken above, and the server's answer when it cannot
  // reach the sign-in service: either way nothing was recorded.
  auth_unavailable: 'error.authUnavailable',
  too_few_questions: 'error.tooFewQuestions',
  finished: 'error.matchFinished',
  rate_limited: 'error.rateLimited',
  not_configured: 'error.serviceUnavailable',
  migration_required: 'error.serviceUnavailable',
  step_unavailable: 'error.stepUnavailable',
  task_retired: 'error.taskRetired',
  premium_required: 'error.premiumRequired',
  entitlement_unavailable: 'error.entitlementUnavailable',
  billing_unavailable: 'error.billingUnavailable',
  billing_disabled: 'error.billingDisabled',
  already_premium: 'error.alreadyPremium',
  no_billing_account: 'error.noBillingAccount',
  bad_email: 'error.badEmail',
  billing_conflict: 'error.billingConflict',
  // Learning paths. One attempt takes one result, and a sealed session
  // expires; either way a new attempt is the way on.
  idempotency_conflict: 'error.pathAttemptUsed',
  session_expired: 'error.pathAttemptExpired',
  attempt_expired: 'error.pathAttemptExpired',
  enrollment_paused: 'error.pathPaused',
  path_unavailable: 'error.pathUnavailable',
  // Learn refusals for a signed-in learner (403, and 409 at completion). Left
  // to the status fallback they read "You need to sign in to do that."
  not_in_plan: 'roadmap.notInPlanHint',
  topic_locked: 'error.topicLocked',
  prerequisite_not_met: 'error.prerequisiteNotMet',
};

// not_found spans several endpoints whose English server messages are more
// specific than any one dictionary string — keep those for English and only
// swap in the translated generic for Czech.
const CS_ONLY_CODE_KEYS: Partial<Record<string, TranslationKey>> = {
  not_found: 'error.notFound',
};

// friendlyError runs in the api layer (no React context), so it resolves the
// shared dictionaries via translateStatic. Server messages for unmapped error
// codes fall through as-is (English).
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    const codeKey =
      (err.code && CODE_KEYS[err.code]) ||
      (getStoredLang() === 'cs' && err.code ? CS_ONLY_CODE_KEYS[err.code] : undefined);
    if (codeKey) return translateStatic(codeKey);
    if (err.status === 0) return translateStatic('error.network');
    if (err.status >= 500) return translateStatic('error.server');
    if (err.status === 401 || err.status === 403) return translateStatic('error.signIn');
    return err.message;
  }
  return translateStatic('error.generic');
}
