// Typed calls against the roadmap ("Learn") endpoint. The same Vercel API powers
// web and mobile, so the learning paths, levels and checkpoints are identical.
import { apiFetch } from './api';
import type { CategoryType } from '../types';

export type RoadmapTopic = 'javascript' | 'typescript' | 'react' | 'html' | 'css' | 'git';

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

export function fetchRoadmapStructure() {
  return apiFetch<RoadmapStructure>('/api/quiz/roadmap');
}

export function fetchRoadmapLevel(topic: RoadmapTopic, level: number, lang = 'en') {
  const params = new URLSearchParams({ topic, level: String(level), lang });
  return apiFetch<RoadmapPlayable>(`/api/quiz/roadmap?${params}`);
}

export function fetchRoadmapCheckpoint(topic: RoadmapTopic, checkpoint: number, lang = 'en') {
  const params = new URLSearchParams({ topic, checkpoint: String(checkpoint), lang });
  return apiFetch<RoadmapPlayable>(`/api/quiz/roadmap?${params}`);
}
