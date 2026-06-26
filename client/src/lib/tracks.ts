// The roadmap "track" the learner is following — Frontend, Backend or
// Fullstack. This is the single source of truth shared by the roadmap map
// (RoadmapTree) and the pillar breakdown (CareerRoadmap), so one choice drives
// the whole /roadmap page. The selection is persisted to localStorage and
// exposed through a tiny observable store so both surfaces re-render together.

import type { RoadmapTopic } from '../types/quiz';
import type { Specialization } from './leveling';
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';

export type Track = 'frontend' | 'backend' | 'fullstack';
export const TRACK_ORDER: Track[] = ['frontend', 'backend', 'fullstack'];

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
  'rhf-zod': 'Forms & validation with React Hook Form + Zod.',
  nodejs: 'Modules, async, HTTP, Express, streams.',
  general: 'How the web works: HTTP, caching, auth.',
  internet: 'How the internet works: IP, DNS, TCP/IP.',
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
export const TRACKS: Record<Track, TrackDef> = {
  frontend: {
    label: 'Frontend',
    blurb: 'Build the interfaces people actually touch — markup, styling, and the React stack.',
    stages: [
      { title: 'Foundations', topics: ['html', 'css', 'javascript'] },
      { title: 'Level up the language', topics: ['typescript', 'git'] },
      { title: 'The React stack', topics: ['react', 'nextjs', 'rhf-zod'] },
      { title: 'Ship with confidence', topics: ['testing', 'dsa'] },
    ],
  },
  backend: {
    label: 'Backend',
    blurb: 'Build and run the server — APIs, data, and systems that hold up under load.',
    stages: [
      { title: 'Foundations', topics: ['javascript', 'typescript', 'git'] },
      { title: 'The server & the web', topics: ['nodejs', 'general', 'internet'] },
      { title: 'Data & computer science', topics: ['databases', 'dsa', 'algorithms'] },
      { title: 'Production & scale', topics: ['testing', 'system-design', 'devops', 'security'] },
    ],
  },
  fullstack: {
    label: 'Fullstack',
    blurb: 'The whole picture — frontend, backend, and everything that ties them together.',
    stages: [
      { title: 'Foundations', topics: ['html', 'css', 'javascript'] },
      { title: 'Level up the language', topics: ['typescript', 'git'] },
      { title: 'Frontend', topics: ['react', 'nextjs', 'rhf-zod'] },
      { title: 'Backend', topics: ['nodejs', 'general', 'internet', 'databases'] },
      { title: 'Computer science', topics: ['dsa', 'algorithms'] },
      { title: 'Production & scale', topics: ['testing', 'system-design', 'devops', 'security'] },
    ],
  },
};

// The set of topics a track covers = the union of its stages. Used to filter
// the pillar breakdown so it shows exactly what the map shows.
const topicsOf = (track: Track): Set<RoadmapTopic> =>
  new Set(TRACKS[track].stages.flatMap((s) => s.topics));

export const TRACK_TOPICS: Record<Track, Set<RoadmapTopic>> = {
  frontend: topicsOf('frontend'),
  backend: topicsOf('backend'),
  fullstack: topicsOf('fullstack'),
};

export const isTopicInTrack = (track: Track, topic: RoadmapTopic): boolean =>
  TRACK_TOPICS[track].has(topic);

/**
 * The learning sections unlocked when a learner commits to a track in their
 * profile: the track's first two stages (its foundations plus the first
 * specialise tier). Enough to dive straight in on the chosen path; the rest of
 * the path keeps unlocking through the normal prerequisite progression.
 */
export function trackStarterTopics(track: Track): RoadmapTopic[] {
  const stages = TRACKS[track].stages.slice(0, 2);
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

/** Live, persisted roadmap track plus a setter. Shared across the page. */
export function useTrack(): [Track, (next: Track) => void] {
  const track = useStore(trackStore);
  const setTrack = (next: Track) => {
    writeJSON(TRACK_KEY, next);
    trackStore.emit();
  };
  return [track, setTrack];
}
