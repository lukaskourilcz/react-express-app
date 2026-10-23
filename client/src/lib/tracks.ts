// The roadmap "track" the learner is following — Frontend, Backend or
// Fullstack. This is the single source of truth shared by the roadmap map
// (RoadmapTree) and the pillar breakdown (CareerRoadmap), so one choice drives
// the whole /roadmap page. The selection is persisted to localStorage and
// exposed through a tiny observable store so both surfaces re-render together.

import type { RoadmapTopic } from '../types/quiz';
import type { TranslationKey } from '../i18n/translations';
import type { Specialization, CareerRank } from './leveling';
import { rankTitleKey, RANK_TITLES } from './leveling';
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import type { SubjectId } from './subjects';
import { getSubject } from './subjects';
import { WEBDEV_PLAN_STAGES } from '../../../shared/progression';

export type Track = 'frontend' | 'backend' | 'fullstack';
export const TRACK_ORDER: Track[] = ['frontend', 'backend', 'fullstack'];

/*
 * Translation keys for track/topic copy. User-visible surfaces render
 * t(trackLabelKey(...)) etc., so the copy lives in translations.ts only (same
 * pattern as subjectNameKey in subjects.ts). The app shell imports this module,
 * so English copies kept here as fallbacks rode in the initial chunk unread.
 */
export const trackLabelKey = (subject: SubjectId, track: Track): TranslationKey =>
  `track.${subject}.${track}.label` as TranslationKey;
export const trackBlurbKey = (subject: SubjectId, track: Track): TranslationKey =>
  `track.${subject}.${track}.blurb` as TranslationKey;
/** Key for a stage title by its 0-based position within the track. */
export const stageTitleKey = (subject: SubjectId, track: Track, stageIdx: number): TranslationKey =>
  `track.${subject}.${track}.stage${stageIdx + 1}` as TranslationKey;
/** Key for a topic's one-line "what you'll learn" detail. */
export const topicDetailKey = (topic: string): TranslationKey =>
  `topicDetail.${topic}` as TranslationKey;

export interface Stage {
  title: string;
  topics: RoadmapTopic[];
}
export interface TrackDef {
  stages: Stage[];
}

// The topics that show a one-line "what you'll learn" detail on their topic
// node (topicDetail.* in translations.ts).
const TOPICS_WITH_DETAIL: ReadonlySet<string> = new Set([
  'html', 'css', 'javascript', 'typescript', 'git', 'react', 'nextjs', 'nodejs', 'general', 'databases',
  'dsa', 'dsa-advanced', 'algorithms', 'testing', 'system-design', 'devops', 'security',
]);

// Curated tracks. Each is a top-to-bottom story: foundations → specialise →
// production. Fullstack is the union; Frontend and Backend share the core
// (JS/TS/Git/Testing) and branch into their own concerns. Non-essential topics
// (Cool Stuff, AI, Abbreviations) are intentionally left off.
// The topics of each devShark stage come from shared/progression.ts, which is
// the same plan the server reads when it decides whether a level may be served.
// Only the stage titles live here (the map keys its stages by them; it draws
// stageTitleKey), so the map a learner sees and the map the API enforces cannot
// drift apart.
const WEBDEV_STAGE_TITLES: Record<Track, string[]> = {
  frontend: ['Foundations', 'Version control', 'The React stack', 'Types on top', 'How the web works'],
  backend: ['Foundations', 'The server & the web', 'Data & computer science', 'Types on top', 'Production & scale'],
  fullstack: ['Foundations', 'Version control', 'Frontend', 'Backend', 'Types on top', 'Computer science', 'Production & scale'],
};

const webdevStages = (track: Track): Stage[] =>
  WEBDEV_PLAN_STAGES[track].map((topics, index) => ({
    title: WEBDEV_STAGE_TITLES[track][index] ?? '',
    topics: [...topics] as RoadmapTopic[],
  }));

const WEBDEV_TRACKS: Record<Track, TrackDef> = {
  frontend: { stages: webdevStages('frontend') },
  backend: { stages: webdevStages('backend') },
  fullstack: { stages: webdevStages('fullstack') },
};

export const TRACKS_BY_SUBJECT: Record<SubjectId, Record<Track, TrackDef>> = {
  webdev: WEBDEV_TRACKS,
};

/** The track map for the active subject (imperative). */
export const tracksForActiveSubject = (): Record<Track, TrackDef> => TRACKS_BY_SUBJECT[getSubject()];

/**
 * A topic's localized one-line detail, or undefined for topics that have none
 * (TOPICS_WITH_DETAIL decides coverage; the dictionaries carry the text).
 */
export function localizedTopicDetail(
  t: (key: TranslationKey) => string,
  topic: RoadmapTopic,
): string | undefined {
  return TOPICS_WITH_DETAIL.has(topic) ? t(topicDetailKey(topic)) : undefined;
}

// The set of topics a track covers = the union of its stages. Used to filter
// the pillar breakdown so it shows exactly what the map shows.
const topicsOf = (tracks: Record<Track, TrackDef>, track: Track): Set<RoadmapTopic> =>
  new Set(tracks[track].stages.flatMap((s) => s.topics));

/** The topics a track covers, within the active subject. */
export const trackTopics = (track: Track): Set<RoadmapTopic> =>
  topicsOf(tracksForActiveSubject(), track);

// The career-title flavor each track maps to (drives "Junior Frontend
// Developer", "Senior Backend Engineer", etc.).
const TRACK_SPECIALIZATION: Record<Track, Specialization> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Full-Stack',
};

/** The career-rank specialization label for a track. */
export const specializationForTrack = (track: Track): Specialization => TRACK_SPECIALIZATION[track];

/**
 * The learner-rank label as an i18n key + interpolation vars: components
 * render `t(key, vars)` so rank titles localize. The developer ladder takes
 * the track specialization through the {spec} var ("Junior Full-Stack
 * Developer"). Shared by the profile, avatar menu and toaster.
 */
export function rankLabelKeyFor(
  rank: CareerRank,
  track: Track,
): { key: TranslationKey; vars: Record<string, string> } {
  const subject = getSubject();
  const rawIdx = RANK_TITLES.indexOf(rank.title);
  const idx = rawIdx >= 0 ? rawIdx : 0;
  return {
    key: rankTitleKey(subject, idx),
    vars: { spec: specializationForTrack(track) },
  };
}

/* ──── Persisted, shared selection ──────────────────────────────────────── */

const TRACK_KEY = 'devquiz:roadmap:track';
const isTrack = (v: unknown): v is Track =>
  v === 'frontend' || v === 'backend' || v === 'fullstack';

const readTrack = (): Track => {
  const saved = readJSON<string>(TRACK_KEY, 'fullstack');
  return isTrack(saved) ? saved : 'fullstack';
};

const trackStore = createStore<Track>(readTrack);

/** Imperative snapshot of the current track (for non-React callers, e.g. the toaster). */
export const getTrack = (): Track => trackStore.get();

/**
 * Set the roadmap track. Shared by the hook, the profile/roadmap pickers, and
 * cross-device sign-in sync. Writes localStorage and notifies the store so
 * every surface re-renders.
 */
export function setTrackValue(next: Track): void {
  writeJSON(TRACK_KEY, next);
  trackStore.emit();
}

/** Live, persisted roadmap track plus a setter. Shared across the page. The
 * setter is the same function every render, so a callback that lists it in
 * its dependencies (LearningPathsCard's apply) is not rebuilt each time. */
export function useTrack(): [Track, (next: Track) => void] {
  return [useStore(trackStore), setTrackValue];
}
