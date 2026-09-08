// Search and combined filters over the eligible coding challenges (issue #161).
//
// The filter state lives in the URL, so a filtered list is a link a learner can
// send themselves, and Back returns to the previous filter rather than to the
// previous page. Everything is a real button or input: the whole strip works
// from the keyboard, and the reset is one control, not a per-filter hunt.
//
// What can be found is bounded by the plan and the progression policy — search
// never surfaces a task the learner could not start.

import { useMemo } from 'react';
import type { CodingTaskSummary, CodingTier, CodingVerify } from '../../../../shared/coding-catalog';
import type { Lang } from '../../i18n/LanguageContext';

export type CodingStatusFilter = 'all' | 'open' | 'passed' | 'due' | 'saved';
export type CodingDurationFilter = 'short' | 'medium' | 'long';
export type CodingFormatFilter = CodingVerify | 'debug';

export interface CodingFilterState {
  q: string;
  group: string | null;
  status: CodingStatusFilter;
  tier: CodingTier | null;
  duration: CodingDurationFilter | null;
  format: CodingFormatFilter | null;
  topic: string | null;
  collection: string | null;
}

export const EMPTY_FILTERS: CodingFilterState = {
  q: '', group: null, status: 'all', tier: null, duration: null, format: null, topic: null, collection: null,
};

export const DURATIONS: readonly CodingDurationFilter[] = ['short', 'medium', 'long'];
export const TIERS: readonly CodingTier[] = [1, 2, 3, 4, 5];

/** Czech and English are searched with the same keystrokes: accents are folded
 * so "reseni" finds "řešení" and "map" finds "Map". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function readFilters(params: URLSearchParams): CodingFilterState {
  const tier = Number.parseInt(params.get('tier') ?? '', 10);
  const status = params.get('status');
  const duration = params.get('duration');
  const format = params.get('format');
  return {
    q: (params.get('q') ?? '').slice(0, 80),
    group: params.get('group'),
    status: status === 'open' || status === 'passed' || status === 'due' || status === 'saved' ? status : 'all',
    tier: tier >= 1 && tier <= 5 ? (tier as CodingTier) : null,
    duration: duration === 'short' || duration === 'medium' || duration === 'long' ? duration : null,
    format: format === 'tests' || format === 'checklist' || format === 'guided' || format === 'drill' || format === 'debug' ? format : null,
    topic: params.get('topic'),
    collection: params.get('collection'),
  };
}

export function writeFilters(previous: URLSearchParams, next: CodingFilterState): URLSearchParams {
  const params = new URLSearchParams(previous);
  const set = (key: string, value: string | null) => {
    if (value === null || value === '' || value === 'all') params.delete(key);
    else params.set(key, value);
  };
  set('q', next.q.trim());
  set('group', next.group);
  set('status', next.status);
  set('tier', next.tier === null ? null : String(next.tier));
  set('duration', next.duration);
  set('format', next.format);
  set('topic', next.topic);
  set('collection', next.collection);
  return params;
}

export const hasActiveFilters = (state: CodingFilterState): boolean =>
  state.q.trim() !== '' || state.group !== null || state.status !== 'all' || state.tier !== null ||
  state.duration !== null || state.format !== null || state.topic !== null || state.collection !== null;

const durationOf = (minutes: number): CodingDurationFilter =>
  minutes <= 10 ? 'short' : minutes <= 20 ? 'medium' : 'long';

export interface CodingFilterInputs {
  tasks: readonly CodingTaskSummary[];
  state: CodingFilterState;
  lang: Lang;
  /** Technique tags of the selected group, when one is chosen. */
  groupTags: readonly string[] | null;
  /** Task ids the learner saved, for the `saved` filter. */
  savedIds: ReadonlySet<string>;
  /** Task ids in the selected collection, when one is chosen. */
  collectionIds: ReadonlySet<string> | null;
  /** Debug-format task ids (issue #163). */
  debugIds: ReadonlySet<string>;
  statusOf: (task: CodingTaskSummary) => string;
}

/**
 * Apply every active filter. A locked task never survives a search or a filter:
 * the catalogue behind the ladder is not something to browse around it.
 */
export function applyCodingFilters(input: CodingFilterInputs): CodingTaskSummary[] {
  const { state, lang, groupTags, savedIds, collectionIds, debugIds, statusOf } = input;
  const needle = fold(state.q.trim());
  const searching = needle !== '' || hasActiveFilters(state);
  return input.tasks.filter((task) => {
    const status = statusOf(task);
    if (searching && status === 'locked') return false;
    if (groupTags && !task.focus.some((tag) => groupTags.includes(tag))) return false;
    if (state.tier !== null && task.tier !== state.tier) return false;
    if (state.topic !== null && task.track !== state.topic) return false;
    if (state.duration !== null && durationOf(task.estimatedMinutes) !== state.duration) return false;
    if (state.format !== null) {
      if (state.format === 'debug' ? !debugIds.has(task.id) : task.verify !== state.format) return false;
    }
    if (state.collection !== null && !(collectionIds?.has(task.id) ?? false)) return false;
    switch (state.status) {
      case 'passed': if (status !== 'passed') return false; break;
      case 'due': if (status !== 'due') return false; break;
      case 'saved': if (!savedIds.has(task.id)) return false; break;
      case 'open': if (!(status === 'open' || status === 'in_progress' || status === 'revealed')) return false; break;
      default: break;
    }
    if (needle === '') return true;
    const haystack = [task.title[lang] ?? '', task.title.en, task.id, ...task.focus].map(fold);
    return haystack.some((one) => one.includes(needle));
  });
}

/** Which technique groups are worth offering for this list. */
export function useVisibleGroups(
  tasks: readonly CodingTaskSummary[],
  groups: Record<string, readonly string[]>,
): string[] {
  return useMemo(
    () => Object.keys(groups).filter((group) => tasks.some((task) => task.focus.some((tag) => groups[group].includes(tag)))),
    [tasks, groups],
  );
}
