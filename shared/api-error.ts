// API error type + friendly-message mapper shared by the web client and the
// mobile app. The platform-specific `apiFetch` wrappers (different base URL and
// token source) throw `ApiError` and render failures via `friendlyError`.

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    // Timeouts / cancellations carry their own user-facing message.
    if (err.code === 'aborted' || err.code === 'timeout') return err.message;
    if (err.status === 0) return 'Network error. Check your connection and try again.';
    if (err.status >= 500) return 'Server error. Please try again in a moment.';
    if (err.status === 401 || err.status === 403) return 'You need to sign in to do that.';
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
