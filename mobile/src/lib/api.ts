// Thin fetch wrapper for the Vercel API. Identical contract to the web client's
// apiFetch, except mobile must use an ABSOLUTE base URL (the deployed domain or
// your LAN dev server) since there's no same-origin to fall back on.
import { supabase } from './supabase';
import { API_BASE_URL } from './config';

const DEFAULT_TIMEOUT_MS = 15_000;

// e.g. https://your-app.vercel.app — set in app.json (expo.extra.apiBaseUrl)
// or overridden via EXPO_PUBLIC_API_BASE_URL in mobile/.env.
export { API_BASE_URL };

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Options = RequestInit & { timeoutMs?: number };

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = opts;
  if (!API_BASE_URL && !path.startsWith('http')) {
    throw new ApiError('API base URL is not configured (EXPO_PUBLIC_API_BASE_URL).', 0, 'no_base_url');
  }
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
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
        // non-JSON body
      }
      throw new ApiError(body?.error?.message || `Request failed (${res.status})`, res.status, body?.error?.code);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (controller.signal.aborted) {
      throw new ApiError('Request timed out. Please try again.', 0, 'timeout');
    }
    throw new ApiError(err instanceof Error ? err.message : 'Network error', 0, 'network');
  } finally {
    clearTimeout(timeoutId);
  }
}

export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return err.message || 'Network error. Check your connection.';
    if (err.status >= 500) return 'Server error. Please try again in a moment.';
    if (err.status === 401 || err.status === 403) return 'You need to sign in to do that.';
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
