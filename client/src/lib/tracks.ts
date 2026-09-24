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
 * i18n keys for track/topic copy. The registry fields below stay the English
 * fallbacks; user-visible surfaces render t(trackLabelKey(...)) etc. so Czech
 * users get Czech track names, blurbs, stage titles and topic details (same
 * pattern as subjectNameKey in subjects.ts).
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
  label: string;
  blurb: string;
  stages: Stage[];
}

// A one-line "what you'll learn" detail shown on each topic node / pillar row.
export const TOPIC_DETAIL: Partial<Record<RoadmapTopic, string>> = {
  html: 'Semantic markup, forms, accessibility.',
  css: 'Layout, flexbox & grid, responsive design.',
  javascript: 'Closures, async, and the event loop.',
  typescript: 'Types, generics, and safer refactors.',
  git: 'Branches, merges, pull requests, history.',
  react: 'Components, hooks, state, rendering.',
  nextjs: 'Routing, server components, data fetching.',
  nodejs: 'Modules, async, HTTP, Express, streams.',
  general: 'How the web works: HTTP, caching, auth.',
  databases: 'SQL, schema design, indexing, transactions.',
  dsa: 'Complexity, arrays, trees, graphs, sorting.',
  algorithms: 'Problem-solving: recursion, combinatorics, math.',
  testing: 'Unit, integration, and end-to-end testing.',
  'system-design': 'Caching, queues, sharding, trade-offs.',
  devops: 'CI/CD, containers, observability, the cloud.',
  security: 'Auth, the OWASP Top 10, secure defaults.',
};

// Curated tracks. Each is a top-to-bottom story: foundations → specialise →
// production. Fullstack is the union; Frontend and Backend share the core
// (JS/TS/Git/Testing) and branch into their own concerns. Non-essential topics
// (Cool Stuff, AI, Abbreviations) are intentionally left off.
// The topics of each devShark stage come from shared/progression.ts, which is
// the same plan the server reads when it decides whether a level may be served.
// Only the stage titles live here (as English fallbacks behind the i18n keys),
// so the map a learner sees and the map the API enforces cannot drift apart.
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
  frontend: {
    label: 'Frontend',
    blurb: 'Build the interfaces people actually touch: markup, styling, and the React stack.',
    stages: webdevStages('frontend'),
  },
  backend: {
    label: 'Backend',
    blurb: 'Build and run the server: APIs, data, and systems that hold up under load.',
    stages: webdevStages('backend'),
  },
  fullstack: {
    label: 'Fullstack',
    blurb: 'The whole picture: frontend, backend, and everything that ties them together.',
    stages: webdevStages('fullstack'),
  },
};

export const TRACKS_BY_SUBJECT: Record<SubjectId, Record<Track, TrackDef>> = {
  webdev: WEBDEV_TRACKS,
};

/** The track map for a given subject. */
export const tracksForSubject = (id: SubjectId): Record<Track, TrackDef> => TRACKS_BY_SUBJECT[id];
/** The track map for the active subject (imperative). */
export const tracksForActiveSubject = (): Record<Track, TrackDef> => TRACKS_BY_SUBJECT[getSubject()];

/**
 * A topic's localized one-line detail, or undefined for topics that have none
 * (the TOPIC_DETAIL registry decides coverage; the dictionaries carry the
 * text). Shared by the roadmap tree and the career pillars so both surfaces
 * agree on which topics show a detail line.
 */
export function localizedTopicDetail(
  t: (key: TranslationKey) => string,
  topic: RoadmapTopic,
): string | undefined {
  return TOPIC_DETAIL[topic] ? t(topicDetailKey(topic)) : undefined;
}

// The set of topics a track covers = the union of its stages. Used to filter
// the pillar breakdown so it shows exactly what the map shows.
const topicsOf = (tracks: Record<Track, TrackDef>, track: Track): Set<RoadmapTopic> =>
  new Set(tracks[track].stages.flatMap((s) => s.topics));

/** The topics a track covers, within the active subject. */
export const trackTopics = (track: Track): Set<RoadmapTopic> =>
  topicsOf(tracksForActiveSubject(), track);

export const isTopicInTrack = (track: Track, topic: RoadmapTopic): boolean =>
  trackTopics(track).has(topic);

/**
 * The learning sections unlocked when a learner commits to a track in their
 * profile: the track's first two stages (its foundations plus the first
 * specialise tier). Enough to dive straight in on the chosen path; the rest of
 * the path keeps unlocking through the normal prerequisite progression.
 */
export function trackStarterTopics(track: Track): RoadmapTopic[] {
  const stages = tracksForActiveSubject()[track].stages.slice(0, 2);
  return Array.from(new Set(stages.flatMap((s) => s.topics)));
}

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
// Whether the learner has explicitly committed to a track, as opposed to just
// getting the 'fullstack' default. Drives the landing page: show the picker
// until a path is chosen, then reflect it and nudge the learner to start.
const TRACK_CHOSEN_KEY = 'devquiz:roadmap:track:chosen';
const isTrack = (v: unknown): v is Track =>
  v === 'frontend' || v === 'backend' || v === 'fullstack';

const readTrack = (): Track => {
  const saved = readJSON<string>(TRACK_KEY, 'fullstack');
  return isTrack(saved) ? saved : 'fullstack';
};
const readChosen = (): boolean => readJSON<boolean>(TRACK_CHOSEN_KEY, false) === true;

const trackStore = createStore<Track>(readTrack);
const chosenStore = createStore<boolean>(readChosen);

/** Imperative snapshot of the current track (for non-React callers, e.g. the toaster). */
export const getTrack = (): Track => trackStore.get();

/** Imperative snapshot of whether a track has been explicitly chosen. */
export const getHasChosenTrack = (): boolean => chosenStore.get();

/**
 * Set the roadmap track and (by default) mark it as explicitly chosen. Shared
 * by the hook, the profile/roadmap pickers, and cross-device sign-in sync.
 * Writes localStorage and notifies both stores so every surface re-renders.
 */
export function setTrackValue(next: Track, opts?: { markChosen?: boolean }): void {
  writeJSON(TRACK_KEY, next);
  trackStore.emit();
  if (opts?.markChosen !== false) {
    writeJSON(TRACK_CHOSEN_KEY, true);
    chosenStore.emit();
  }
}

/** Live, persisted roadmap track plus a setter. Shared across the page. */
export function useTrack(): [Track, (next: Track) => void] {
  const track = useStore(trackStore);
  return [track, (next: Track) => setTrackValue(next)];
}

/** Live flag: has the learner explicitly picked a track yet? */
export function useHasChosenTrack(): boolean {
  return useStore(chosenStore);
}
