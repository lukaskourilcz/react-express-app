import { apiFetch } from './api';
import { type FlashCard, getCards, mergeFromServer, onCardsMutated } from './cards';

const DEBOUNCE_MS = 1500;

let pushTimer: number | null = null;
let initialised = false;
let lastPushedAuth0Id: string | null = null;

interface ServerCard {
  question_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  category: string;
  added_at: string;
  right_streak: number;
  wrong_count: number;
  due_at: string;
  last_reviewed_at: string | null;
  updated_at: string;
}

const toLocal = (s: ServerCard): FlashCard => ({
  id: s.question_id,
  question: s.question,
  options: s.options,
  correctIndex: s.correct_index,
  explanation: s.explanation ?? '',
  category: s.category,
  addedAt: s.added_at,
  rightStreak: s.right_streak,
  wrongCount: s.wrong_count,
  dueAt: s.due_at,
  lastReviewedAt: s.last_reviewed_at ?? undefined,
  updatedAt: s.updated_at,
});

const toServer = (c: FlashCard) => ({
  question_id: c.id,
  question: c.question,
  options: c.options,
  correct_index: c.correctIndex,
  explanation: c.explanation,
  category: c.category,
  added_at: c.addedAt,
  right_streak: c.rightStreak,
  wrong_count: c.wrongCount,
  due_at: c.dueAt,
  last_reviewed_at: c.lastReviewedAt ?? null,
  updated_at: c.updatedAt,
});

async function pushNow(auth0Id: string) {
  const cards = getCards();
  try {
    await apiFetch<{ ok: true }>('/api/user/cards', {
      method: 'POST',
      body: JSON.stringify({ auth0_id: auth0Id, cards: cards.map(toServer) }),
    });
  } catch {
    /* offline / unauthenticated — local store still works */
  }
}

function schedulePush(auth0Id: string) {
  if (pushTimer != null) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => pushNow(auth0Id), DEBOUNCE_MS);
}

/**
 * Initialise card sync for the given user. Pulls server state, merges with
 * local, pushes the merged result, then debounces pushes on every local
 * mutation. Idempotent — safe to call repeatedly on auth state changes.
 */
export async function initCardSync(auth0Id: string): Promise<void> {
  if (initialised && lastPushedAuth0Id === auth0Id) return;
  initialised = true;
  lastPushedAuth0Id = auth0Id;

  try {
    const res = await apiFetch<{ data: ServerCard[] | null }>(
      `/api/user/cards?auth0_id=${encodeURIComponent(auth0Id)}`,
    );
    const server = (res.data ?? []).map(toLocal);
    mergeFromServer(server);
    await pushNow(auth0Id);
  } catch {
    /* never fail the app if sync errors — local-first */
  }

  onCardsMutated(() => {
    if (lastPushedAuth0Id) schedulePush(lastPushedAuth0Id);
  });
}

/** Reset internal sync state (e.g. on sign-out) so the next sign-in re-initialises. */
export function resetCardSync(): void {
  if (pushTimer != null) {
    window.clearTimeout(pushTimer);
    pushTimer = null;
  }
  initialised = false;
  lastPushedAuth0Id = null;
}
