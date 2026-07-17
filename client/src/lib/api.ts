import { supabase } from './supabaseClient';
import { getStoredLang } from '../i18n/LanguageContext';

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
    const { data } = await supabase.auth.getSession();
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
      const message =
        reason instanceof Error && reason.message === 'timeout'
          ? 'Request timed out. Please try again.'
          : 'Request was cancelled.';
      throw new ApiError(message, 0, 'aborted');
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

// friendlyError runs in the api layer (no React context), so it localizes via
// the persisted-language snapshot. Server messages for unmapped error codes
// fall through in English.
const FRIENDLY_CS: Record<string, string> = {
  timeout: 'Požadavek vypršel. Zkus to prosím znovu.',
  cancelled: 'Požadavek byl zrušen.',
  network: 'Chyba sítě. Zkontroluj připojení a zkus to znovu.',
  server: 'Chyba serveru. Zkus to prosím za chvíli.',
  signin: 'Nejdřív se musíš přihlásit.',
  generic: 'Něco se pokazilo. Zkus to prosím znovu.',
  // User-facing API error codes worth translating (play flow).
  too_few_questions: 'Pro tento výběr není dost otázek.',
  not_found: 'Nic takového jsme nenašli. Zkontroluj kód a zkus to znovu.',
  finished: 'Tenhle zápas už skončil.',
};

export function friendlyError(err: unknown): string {
  const cs = getStoredLang() === 'cs';
  if (err instanceof ApiError) {
    if (err.code === 'aborted') {
      if (!cs) return err.message;
      return err.message.startsWith('Request timed out') ? FRIENDLY_CS.timeout : FRIENDLY_CS.cancelled;
    }
    if (cs && err.code && FRIENDLY_CS[err.code]) return FRIENDLY_CS[err.code];
    if (err.status === 0)
      return cs ? FRIENDLY_CS.network : 'Network error. Check your connection and try again.';
    if (err.status >= 500) return cs ? FRIENDLY_CS.server : 'Server error. Please try again in a moment.';
    if (err.status === 401 || err.status === 403)
      return cs ? FRIENDLY_CS.signin : 'You need to sign in to do that.';
    return err.message;
  }
  return cs ? FRIENDLY_CS.generic : 'Something went wrong. Please try again.';
}
