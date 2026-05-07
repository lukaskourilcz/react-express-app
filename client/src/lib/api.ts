const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Optional access-token provider. When set (typically by SyncBoot once
 * Auth0 is loaded), every apiFetch call gets an `Authorization: Bearer <jwt>`
 * header — which the API uses to verify the user's identity instead of
 * trusting body fields. Falsy returns are silently ignored (e.g. guest mode).
 */
let tokenProvider: (() => Promise<string | null | undefined>) | null = null;

export function setAccessTokenProvider(
  provider: (() => Promise<string | null | undefined>) | null,
): void {
  tokenProvider = provider;
}

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

export async function apiFetch<T>(url: string, opts: Options = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = opts;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(rest.headers as Record<string, string> | undefined),
    };
    if (tokenProvider) {
      try {
        const token = await tokenProvider();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch {
        // ignore — request still goes through, server will 401 if it needs the token
      }
    }
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers,
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

export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'aborted') return err.message;
    if (err.status === 0) return 'Network error. Check your connection and try again.';
    if (err.status >= 500) return 'Server error. Please try again in a moment.';
    if (err.status === 401 || err.status === 403) return 'You need to sign in to do that.';
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
