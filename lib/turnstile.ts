// Cloudflare Turnstile attestation for the score-bearing endpoints.
//
// The leaderboards in this product rank correct answers and accuracy, and the
// server already owns both of those numbers: answers never reach the client
// before submission, grading happens here, and every attempt is claimed once.
// What none of that establishes is whether a browser was involved at all. A
// script that solves nothing and simply replays the session/answer protocol
// produces arithmetically honest rows. Attestation is the missing half: it says
// a real client fetched the page, not that the answers were good.
//
// ── Three states, and why the middle one exists ────────────────────────────
//
//   off      — no secret key configured. Nothing is fetched, nothing is
//              refused, and the endpoints behave exactly as they did before
//              this module existed. This is the default and the state the
//              repository ships in: enabling Turnstile needs a Cloudflare
//              account, a site key and a secret key, and none of those can be
//              invented here.
//   observe  — a secret is configured but enforcement is not. Tokens that
//              arrive are verified and the outcome is logged; a request with no
//              token is served normally. This is the state to sit in for a few
//              days after switching the widget on, because it answers "would
//              enforcing have locked out real learners?" without locking any
//              of them out.
//   enforce  — a missing or rejected token refuses the write.
//
// ── What a failure is allowed to cost ──────────────────────────────────────
//
// A learner is refused only for a problem on their side of the wire: no token,
// a token Cloudflare rejected, a replayed token. Everything else — siteverify
// unreachable, a timeout, a malformed response, a wrong or missing secret in
// our own configuration — resolves to `unavailable` and never refuses anything,
// in either mode. The alternative is a Cloudflare incident or one typo in an
// environment variable taking every submission in the product down with it, and
// a bot getting through during an outage is much cheaper than that.
//
// Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

import type { VercelRequest, VercelResponse } from './vercel-types.js';
import { jsonError, logEvent } from './http';
import { clientIp } from './rate-limit';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 3000;
// Cloudflare documents the response token as at most 2048 characters.
const MAX_TOKEN = 2048;
const TOKEN_SHAPE = /^[A-Za-z0-9._~+/=-]+$/;

/** The surfaces that may ask for an attestation. Kept closed so a typo in a
 *  call site becomes a compile error rather than a silently ungated write. */
export const TURNSTILE_ACTIONS = ['signup', 'quiz-submit', 'challenge-score'] as const;
export type TurnstileAction = (typeof TURNSTILE_ACTIONS)[number];

export type TurnstileMode = 'off' | 'observe' | 'enforce';

export type AttestationOutcome =
  /** No secret configured — the feature is switched off. */
  | 'not-configured'
  /** Cloudflare confirmed the token. */
  | 'passed'
  /** The caller sent no token. */
  | 'missing'
  /** Cloudflare rejected the caller's token. */
  | 'failed'
  /** Our side could not get an answer: network, timeout, or our own misconfiguration. */
  | 'unavailable';

export interface Attestation {
  mode: TurnstileMode;
  outcome: AttestationOutcome;
  /** Cloudflare's `error-codes`, capped and kept for the log line. */
  errorCodes: string[];
}

/** Error codes that mean the *caller* failed, as opposed to our configuration
 *  or Cloudflare itself. Only these may refuse a request. */
const CLIENT_SIDE_CODES = new Set([
  'missing-input-response',
  'invalid-input-response',
  'timeout-or-duplicate',
  'invalid-widget-id',
  'invalid-parsed-secret',
]);

function secret(): string {
  return (process.env.TURNSTILE_SECRET_KEY ?? '').trim();
}

export function turnstileMode(): TurnstileMode {
  if (!secret()) return 'off';
  return process.env.TURNSTILE_ENFORCE === 'true' ? 'enforce' : 'observe';
}

/** True once a secret key exists, whatever the enforcement setting. */
export function isTurnstileConfigured(): boolean {
  return turnstileMode() !== 'off';
}

/** Read the response token from the body or the header the widget conventionally
 *  posts, and validate its shape before it is ever sent upstream. */
export function readTurnstileToken(req: VercelRequest): string | null {
  const body = (req.body ?? {}) as { turnstileToken?: unknown };
  const header = req.headers['cf-turnstile-response'];
  const raw =
    typeof body.turnstileToken === 'string'
      ? body.turnstileToken
      : typeof header === 'string'
        ? header
        : Array.isArray(header)
          ? header[0]
          : undefined;
  if (typeof raw !== 'string') return null;
  const token = raw.trim();
  if (token.length === 0 || token.length > MAX_TOKEN) return null;
  return TOKEN_SHAPE.test(token) ? token : null;
}

/** Classify a siteverify answer. Exported for the contract tests: the split
 *  between "the caller failed" and "we failed" is the whole safety property. */
export function classifySiteverify(payload: unknown): { outcome: 'passed' | 'failed' | 'unavailable'; errorCodes: string[] } {
  if (!payload || typeof payload !== 'object') return { outcome: 'unavailable', errorCodes: [] };
  const record = payload as { success?: unknown; 'error-codes'?: unknown };
  const errorCodes = Array.isArray(record['error-codes'])
    ? record['error-codes'].filter((code): code is string => typeof code === 'string').slice(0, 8)
    : [];
  if (record.success === true) return { outcome: 'passed', errorCodes };
  if (record.success !== false) return { outcome: 'unavailable', errorCodes };
  const callerFailed = errorCodes.length > 0 && errorCodes.every((code) => CLIENT_SIDE_CODES.has(code));
  return { outcome: callerFailed ? 'failed' : 'unavailable', errorCodes };
}

async function siteverify(token: string, remoteIp: string | null): Promise<{ outcome: 'passed' | 'failed' | 'unavailable'; errorCodes: string[] }> {
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secret(),
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) return { outcome: 'unavailable', errorCodes: [`http_${response.status}`] };
    return classifySiteverify(await response.json());
  } catch {
    return { outcome: 'unavailable', errorCodes: ['siteverify_unreachable'] };
  }
}

/**
 * Verify whatever token the request carries. Never throws and never writes a
 * response — the caller decides what an outcome is worth.
 */
export async function attest(req: VercelRequest, action: TurnstileAction): Promise<Attestation> {
  const mode = turnstileMode();
  if (mode === 'off') return { mode, outcome: 'not-configured', errorCodes: [] };

  const token = readTurnstileToken(req);
  if (!token) return { mode, outcome: 'missing', errorCodes: [] };

  const { outcome, errorCodes } = await siteverify(token, clientIp(req));
  logEvent('turnstile', { action, mode, outcome, ...(errorCodes.length > 0 ? { error_codes: errorCodes } : {}) });
  return { mode, outcome, errorCodes };
}

/** True when this attestation must refuse the write. */
export function refusesRequest(attestation: Attestation): boolean {
  return attestation.mode === 'enforce' && (attestation.outcome === 'missing' || attestation.outcome === 'failed');
}

/**
 * Attest and, when enforcing, send the refusal itself:
 *
 *   const attestation = await requireAttestation(req, res, 'quiz-submit');
 *   if (!attestation) return;
 *
 * Returns the attestation when the request may proceed, or null after a 403 has
 * been written.
 */
export async function requireAttestation(
  req: VercelRequest,
  res: VercelResponse,
  action: TurnstileAction,
): Promise<Attestation | null> {
  const attestation = await attest(req, action);
  if (!refusesRequest(attestation)) return attestation;
  jsonError(
    res,
    403,
    attestation.outcome === 'missing' ? 'attestation_required' : 'attestation_failed',
    'This submission could not be verified as coming from a browser. Reload the page and try again.',
  );
  return null;
}
