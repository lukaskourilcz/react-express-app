// The hook line above the question, and the per-user rotation behind it.
//
// Hook copy is delivered from the quorum monorepo (Carousel Studio / Hook Brain) and is never
// edited here — see docs/hooks/README.md in that repo. What this file owns is selection
// mechanics and per-user state, which is the half that can only live where the reader is.

import delivered from '../../../lib/hooks/quiz.hooks.json';
import { HOOK_LIBRARY_VERSION, parseHookLibrary } from '../../../shared/hooks/library';
import { renderHookText } from '../../../shared/hooks/evaluate';
import {
  EMPTY_HOOK_STATE,
  recordShown,
  selectHook,
  type HookSelection,
  type HookUserState,
} from '../../../shared/hooks/select';
import type { HookCategoryLists, HookQuestionContext, HookVertical } from '../../../shared/hooks/types';
import { CURRENT_PRODUCT } from './products';
import { readJSON, writeJSON } from './storage';

export { HOOK_LIBRARY_VERSION };
export type { HookSelection };

/**
 * Which vertical's copy this deployment renders.
 *
 * devShark is `dev`; every other shark reads the `geo` variant, which is the library's
 * non-developer voice. The split is what makes two variants worth having — the same gate carries
 * compiler imagery on one and map imagery on the other.
 */
export const HOOK_VERTICAL: HookVertical = CURRENT_PRODUCT.id === 'devshark' ? 'dev' : 'geo';

/**
 * Validated once, at module load.
 *
 * A malformed delivery throws here rather than at render time on one unlucky question — the
 * failure a bounded, hash-receipted delivery is supposed to make loud.
 */
export const HOOK_LIBRARY = parseHookLibrary(delivered);

const COOLDOWN_KEY = 'hookCooldownV2';

/**
 * The category lists a `categoryIn` gate resolves against, per vertical.
 *
 * These mirror the brand's own lists in quorum's `config/marketingshark.json`. They are
 * duplicated rather than delivered because they are a fact about this product's taxonomy, not
 * about the hook copy — and the gate is only honest if the list actually describes this app's
 * categories. If a category is added to the app, add it here or the gate silently stops matching.
 */
export const HOOK_CATEGORY_LISTS: Readonly<Record<HookVertical, HookCategoryLists>> = {
  dev: {
    commonUse: ['javascript', 'typescript', 'git', 'css', 'html', 'react', 'nodejs'],
    interview: ['dsa', 'algorithms', 'system-design', 'databases', 'javascript', 'typescript'],
    core: ['internet', 'git', 'security', 'databases', 'testing'],
  },
  geo: {
    commonUse: ['capitals', 'flags', 'continents', 'earth'],
    interview: ['capitals', 'flags', 'political', 'geopolitics'],
    core: ['cartography', 'earth', 'climate', 'landforms'],
  },
};

/** Per-user cooldown survives reloads; session memory deliberately does not. */
interface StoredCooldown {
  readonly lastShownOn: Record<string, string>;
}

let sessionShown: string[] = [];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readHookState(): HookUserState {
  const stored = readJSON<StoredCooldown>(COOLDOWN_KEY, { lastShownOn: {} });
  const lastShownOn = stored && typeof stored === 'object' && stored.lastShownOn && typeof stored.lastShownOn === 'object'
    ? stored.lastShownOn
    : {};
  return { lastShownOn, sessionShown };
}

function persist(state: HookUserState): void {
  sessionShown = [...state.sessionShown];
  writeJSON(COOLDOWN_KEY, { lastShownOn: state.lastShownOn });
}

/** A new quiz run. Session memory is what stops a hook repeating inside one sitting. */
export function startHookSession(): void {
  sessionShown = [];
}

export interface HookRenderInput {
  readonly subject: HookQuestionContext;
  readonly vertical: HookVertical;
  readonly lang: 'en' | 'cs';
  /** Fills `{topic}`. The question's own category, in display register. */
  readonly topic: string;
}

export interface RenderedHook {
  readonly id: string;
  readonly text: string;
  readonly reason: HookSelection['reason'];
  readonly eligibleCount: number;
}

/**
 * Pick and render the hook for one question, and remember that it was shown.
 *
 * Returns null only when the question licenses no hook at all — unreachable with the shipped
 * library, whose always pool is twelve, but handled rather than asserted: a card without a hook
 * reads fine, and an exception on a reader's question does not.
 */
export function pickHookFor(input: HookRenderInput): RenderedHook | null {
  const state = readHookState();
  const selection = selectHook({
    hooks: HOOK_LIBRARY,
    context: { subject: input.subject, categoryLists: HOOK_CATEGORY_LISTS[input.vertical] },
    state,
    today: today(),
  });
  if (!selection) return null;

  let text: string;
  try {
    text = renderHookText({ hook: selection.hook, vertical: input.vertical, lang: input.lang, topic: input.topic });
  } catch {
    // An unrenderable hook is a delivery defect to report upstream, not a reason to break a
    // reader's card. It is skipped for this question and recorded as shown so the rotation
    // moves past it rather than retrying it on every question.
    persist(recordShown(state, selection.hook.id, today()));
    return null;
  }

  persist(recordShown(state, selection.hook.id, today()));
  return {
    id: selection.hook.id,
    text,
    reason: selection.reason,
    eligibleCount: selection.eligibleCount,
  };
}

/** Category slug → the register `{topic}` is written in. Unknown slugs capitalise. */
const TOPIC_LABELS: Readonly<Record<string, string>> = {
  javascript: 'JavaScript', typescript: 'TypeScript', nodejs: 'Node.js', nextjs: 'Next.js',
  css: 'CSS', html: 'HTML', dsa: 'DSA', react: 'React', git: 'Git', ai: 'AI',
  'system-design': 'system design', devops: 'DevOps', internet: 'the internet', gis: 'GIS',
};

export function topicLabel(category: string): string {
  return TOPIC_LABELS[category] ?? `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}

const DAY_KEY = 'hookLastDayV2';

/**
 * The next-day-return guardrail, in the only form a client can honestly produce.
 *
 * `03-metrics-and-testing.md` makes next-day return a veto player, not a tie-breaker: a hook that
 * lifts engagement while denting the habit is net-negative. Measuring it needs a per-reader
 * "when did I last see a hook" mark, which is what this keeps. It returns the gap in days on the
 * first call of a new day and null otherwise, so the caller emits one event per reader per day
 * rather than one per question.
 */
export function noteHookDay(): { readonly daysSinceLastHookDay: number | null } | null {
  const now = today();
  const previous = readJSON<{ day?: string }>(DAY_KEY, {});
  const last = typeof previous?.day === 'string' ? previous.day : null;
  if (last === now) return null;
  writeJSON(DAY_KEY, { day: now });
  if (!last) return { daysSinceLastHookDay: null };
  const gap = Math.round((Date.parse(`${now}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / 86_400_000);
  return { daysSinceLastHookDay: gap };
}

/** Test seam: reset module state between cases. */
export function __resetHookSessionForTests(): void {
  sessionShown = [];
}

export { EMPTY_HOOK_STATE };
