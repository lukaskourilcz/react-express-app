import { supabase } from './supabaseClient';
import { getStoredLang, translateStatic } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

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
// is refreshed and persisted by the supabase-js client.
async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('auth_timeout')), 4_000)),
    ]);
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(url: string, opts: Options = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = opts;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  const token = await getAccessToken();

  try {
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
      let body: { error?: { code?: string; message?: string } } = {};
      try {
        body = await res.json();
      } catch {
        // non-JSON body, keep default
      }
      throw new ApiError(
        body?.error?.message || res.statusText || 'Request failed',
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
        timedOut ? 'Request timed out. Please try again.' : 'Request was cancelled.',
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
  }
}

// Error codes with dedicated user-facing copy in the i18n dictionaries.
// timeout/cancelled are minted client-side in apiFetch above; the play codes
// have a single, unambiguous meaning so the dictionary copy fits every caller.
const CODE_KEYS: Partial<Record<string, TranslationKey>> = {
  timeout: 'error.timeout',
  cancelled: 'error.cancelled',
  too_few_questions: 'error.tooFewQuestions',
  finished: 'error.matchFinished',
  rate_limited: 'error.rateLimited',
  not_configured: 'error.serviceUnavailable',
  migration_required: 'error.serviceUnavailable',
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
