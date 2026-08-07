import { eligibleHooks } from './evaluate';
import type { Hook, HookEvalContext } from './types';

/**
 * Per-user hook state.
 *
 * `lastShownOn` is per user per hook, which is why it cannot live in the studio: the studio cools
 * a hook per *channel*, because every follower sees every post. Here every reader has their own
 * rotation, so the state has to be where the reader is.
 */
export interface HookUserState {
  /** hook id → ISO date (YYYY-MM-DD) it was last shown to this user. */
  readonly lastShownOn: Readonly<Record<string, string>>;
  /** Hook ids already shown in the current session, oldest first. */
  readonly sessionShown: readonly string[];
}

export const EMPTY_HOOK_STATE: HookUserState = { lastShownOn: {}, sessionShown: [] };

/**
 * Why the selector returned what it did. Logged with the impression so a readout can tell a
 * healthy rotation from one that is quietly running on fallbacks.
 */
export type HookPickReason =
  | 'fresh'          // gates held, off cooldown, unseen this session — the normal path
  | 'lru-cooldown'   // everything eligible was cooling; least-recently-shown wins
  | 'lru-session';   // the session consumed every eligible hook; earliest-in-session repeats

export interface HookSelection {
  readonly hook: Hook;
  readonly reason: HookPickReason;
  /** How many hooks the question's own metadata licensed, before any rotation filter. */
  readonly eligibleCount: number;
}

/** Days between two ISO dates, positive when `later` is after `earlier`. */
export function daysBetween(earlier: string, later: string): number {
  return Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000);
}

/** Least-recently-shown first; never-shown sorts first of all, ties broken by id for stability. */
function byLeastRecentlyShown(state: HookUserState) {
  return (left: Hook, right: Hook): number => {
    const leftShown = state.lastShownOn[left.id] ?? '';
    const rightShown = state.lastShownOn[right.id] ?? '';
    if (leftShown !== rightShown) return leftShown < rightShown ? -1 : 1;
    return left.id < right.id ? -1 : 1;
  };
}

/**
 * Which hook fronts this question for this reader, right now.
 *
 * Order is not interchangeable. Truth first: a hook whose gates do not hold is not eligible at any
 * price and no fallback reaches it — the gates are what license the claim, so serving one outside
 * them would be lying to the reader about their own question. Then the per-user cooldown, then
 * what this session has already shown, then a random pick over what survives.
 *
 * The fallbacks below only ever reorder the *eligible* set; they never widen it.
 *
 * `random` is injected so a test can pin the pick. Production passes `Math.random`.
 */
export function selectHook(input: {
  readonly hooks: readonly Hook[];
  readonly context: HookEvalContext;
  readonly state: HookUserState;
  readonly today: string;
  readonly random?: () => number;
}): HookSelection | null {
  const random = input.random ?? Math.random;
  const eligible = eligibleHooks(input.hooks, input.context);
  // The always pool alone is twelve hooks, so this is unreachable with the shipped library. It is
  // still handled rather than asserted: the caller renders no hook and the card is fine without
  // one, which is a better failure than an exception on a reader's question card.
  if (eligible.length === 0) return null;

  const session = new Set(input.state.sessionShown);
  const offCooldown = eligible.filter((hook) => {
    const shown = input.state.lastShownOn[hook.id];
    return shown === undefined || daysBetween(shown, input.today) >= hook.cooldownDays;
  });

  const fresh = offCooldown.filter((hook) => !session.has(hook.id));
  if (fresh.length > 0) {
    return { hook: fresh[Math.floor(random() * fresh.length)]!, reason: 'fresh', eligibleCount: eligible.length };
  }

  // Everything eligible is cooling. Serve the least-recently-shown that this session has not
  // already used — a slightly early repeat costs less than a card with no hook on it.
  const unseenThisSession = eligible.filter((hook) => !session.has(hook.id));
  if (unseenThisSession.length > 0) {
    return {
      hook: [...unseenThisSession].sort(byLeastRecentlyShown(input.state))[0]!,
      reason: 'lru-cooldown',
      eligibleCount: eligible.length,
    };
  }

  // The session has now shown every hook this question licenses, so a repeat is arithmetic rather
  // than a choice — it takes more questions in one sitting than the question's own gate pool has
  // hooks. The one shown longest ago in this session comes round again, which is the furthest
  // apart two showings can be placed. With the shipped library the smallest pool is twelve, so a
  // session reaches this only past twelve questions on gate-poor content.
  const earliestInSession = input.state.sessionShown.find((id) => eligible.some((hook) => hook.id === id));
  const repeat = eligible.find((hook) => hook.id === earliestInSession) ?? eligible[0]!;
  return { hook: repeat, reason: 'lru-session', eligibleCount: eligible.length };
}

/** The state after a hook was shown. Pure, so the caller decides when to persist. */
export function recordShown(state: HookUserState, hookId: string, today: string): HookUserState {
  return {
    lastShownOn: { ...state.lastShownOn, [hookId]: today },
    // Move a repeat to the back: `sessionShown` is an oldest-first queue and the lru-session
    // fallback reads its head, so leaving a repeat in place would serve it twice running.
    sessionShown: [...state.sessionShown.filter((id) => id !== hookId), hookId],
  };
}
