// Sharkira — the optional Socratic AI hint on quiz questions. This thin wrapper
// calls the server hint endpoint (S1) and never throws into render: any error,
// offline state, or missing migration collapses to a safe "unavailable" result
// so the calling component can simply hide or gently disable the affordance.
//
// The server owns the guardrail: for placement / daily / challenge sessions it
// answers `{ available: false, disabled: true }` and the hint must stay hidden.
// A curated fallback is always available on plain-quiz and Learn sessions, so a
// `source: 'curated'` result is the normal AI-off path, not an error.

import { apiFetch, ApiError } from './api';
import { getStoredLang, type Lang } from '../i18n/LanguageContext';

/** S1 response union, plus an optional client-only `error` discriminator the
 * component uses to choose retry vs. hide copy. `available: false` with no
 * `disabled` and no `error` simply means "no hint to show". */
export interface HintResponse {
  available: boolean;
  /** True only when the session scope forbids hints (placement/daily/challenge). */
  disabled?: boolean;
  source?: 'ai' | 'curated';
  cached?: boolean;
  hint?: string;
  nudge?: string;
  /** Client-only: how the request failed, so the UI can offer retry vs. hide. */
  error?: 'offline' | 'unavailable';
}

const HINT_URL = '/api/quiz/submit?resource=hint';

/**
 * Ask Sharkira for a guiding question + nudge for one quiz question.
 * Resolves (never rejects). `lang` defaults to the persisted UI language so a
 * Czech learner gets a Czech hint.
 */
export async function requestHint(
  sessionId: string,
  questionId: string,
  lang: Lang = getStoredLang(),
  signal?: AbortSignal,
): Promise<HintResponse> {
  if (!sessionId || !questionId) return { available: false };
  try {
    const res = await apiFetch<HintResponse>(HINT_URL, {
      method: 'POST',
      body: JSON.stringify({ sessionId, questionId, lang }),
      signal,
    });
    // Trust the server's shape; guarantee `available` is a real boolean.
    return { ...res, available: res.available === true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === 'cancelled') return { available: false };
      if (err.code === 'network' || err.code === 'timeout') {
        return { available: false, error: 'offline' };
      }
    }
    return { available: false, error: 'unavailable' };
  }
}
