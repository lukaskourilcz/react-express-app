// Typed calls against the roadmap ("Learn") endpoint. The same Vercel API powers
// web and mobile, so the learning paths, levels and checkpoints are identical.
// Each call falls back to the bundled offline dataset on a connectivity error,
// so the learning path is fully usable with no network.
import { apiFetch, isOfflineError } from './api';
import {
  offlineRoadmapStructure,
  offlineRoadmapLevel,
  offlineRoadmapCheckpoint,
  offlineRoadmapPartTest,
} from '../data/offline';
import type { CategoryType } from '../types';

// Mirrors ROADMAP_TOPICS in lib/roadmap.ts (server source of truth). Keep the
// order identical so pickers and the offline structure line up with web.
export type RoadmapTopic =
  | 'javascript' | 'typescript' | 'react' | 'nextjs' | 'nodejs'
  | 'html' | 'css' | 'git' | 'dsa' | 'algorithms'
  | 'abbreviations' | 'general' | 'internet' | 'ai' | 'rhf-zod' | 'cool-stuff'
  | 'databases' | 'system-design' | 'testing' | 'devops' | 'security';

export const ROADMAP_TOPICS: RoadmapTopic[] = [
  'javascript', 'typescript', 'react', 'nextjs', 'nodejs',
  'html', 'css', 'git', 'dsa', 'algorithms',
  'abbreviations', 'general', 'internet', 'ai', 'rhf-zod', 'cool-stuff',
  'databases', 'system-design', 'testing', 'devops', 'security',
];

export interface RoadmapLevelMeta {
  level: number;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  questionCount: number;
}

export interface RoadmapCheckpointMeta {
  checkpoint: number;
  title: string;
  afterLevel: number;
  questionCount: number;
  passPct: number;
}

export interface RoadmapTopicStructure {
  levels: RoadmapLevelMeta[];
  checkpoints: RoadmapCheckpointMeta[];
}

export interface RoadmapStructure {
  topics: RoadmapTopic[];
  structure: Record<RoadmapTopic, RoadmapTopicStructure>;
}

// A playable roadmap question ships its correct answer + explanation (the
// learning mode is unscored and graded on-device).
export interface RoadmapQuestion {
  id: string;
  tags: string[];
  introduction: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: CategoryType;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface RoadmapPlayable {
  kind: 'level' | 'checkpoint';
  topic: RoadmapTopic;
  ref: number;
  title: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  passPct: number;
  questions: RoadmapQuestion[];
}

export async function fetchRoadmapStructure() {
  try {
    return await apiFetch<RoadmapStructure>('/api/quiz/roadmap');
  } catch (err) {
    if (isOfflineError(err)) return offlineRoadmapStructure();
    throw err;
  }
}

export async function fetchRoadmapLevel(topic: RoadmapTopic, level: number, lang = 'en') {
  const params = new URLSearchParams({ topic, level: String(level), lang });
  try {
    return await apiFetch<RoadmapPlayable>(`/api/quiz/roadmap?${params}`);
  } catch (err) {
    if (isOfflineError(err)) return offlineRoadmapLevel(topic, level);
    throw err;
  }
}

export async function fetchRoadmapCheckpoint(topic: RoadmapTopic, checkpoint: number, lang = 'en') {
  const params = new URLSearchParams({ topic, checkpoint: String(checkpoint), lang });
  try {
    return await apiFetch<RoadmapPlayable>(`/api/quiz/roadmap?${params}`);
  } catch (err) {
    if (isOfflineError(err)) return offlineRoadmapCheckpoint(topic, checkpoint);
    throw err;
  }
}

// A part's end-of-part test: a focused exam sampled across the part's levels,
// graded at 85%. Result is stored in the topic's checkpoints map keyed by part
// number (matches the web client). Falls back to the offline bundle.
export async function fetchRoadmapPartTest(topic: RoadmapTopic, part: number, lang = 'en') {
  const params = new URLSearchParams({ topic, test: String(part), lang });
  try {
    return await apiFetch<RoadmapPlayable>(`/api/quiz/roadmap?${params}`);
  } catch (err) {
    if (isOfflineError(err)) return offlineRoadmapPartTest(topic, part);
    throw err;
  }
}
