import type { CodingTrack, Localized } from './coding-catalog';

export interface EvolvingChallenge {
  id: string;
  track: CodingTrack;
  category?: 'fullstack';
  title: Localized;
  stages: readonly string[];
  /** Each stage stands alone with its own starter and its own tests, so the
   * previous stage's code never seeds the next editor. A project without
   * this flag grows one codebase across its stages. */
  standalone?: true;
}

const challenge = (id: string, track: CodingTrack, en: string, cs: string): EvolvingChallenge => ({
  id, track, title: { en, cs }, stages: [1, 2, 3, 4, 5].flatMap(stage => [`${id}-${stage}-start`, `${id}-${stage}`]),
});

const fullstack = (slug: string, en: string, cs: string): EvolvingChallenge => ({
  id: `fullstack-${slug}`, category: 'fullstack', track: 'react', title: {en,cs},
  stages: Array.from({length:8},(_,i)=>`${i===0?'js':i<4?'ts':'react'}-fullstack-${slug}-${i+1}`)
    .flatMap((id, i) => [1,4,5,7].includes(i) ? [`${id}-start`, id] : [id]),
});

export function evolvingTaskTrack(id: string): CodingTrack {
  return id.startsWith('js-') ? 'javascript' : id.startsWith('ts-') ? 'typescript' : 'react';
}

/** A stage is an ordinary server-graded task. Stable task IDs give every stage
 * its own existing account draft, completion record and idempotent XP receipt. */
/** The debugging course: fifteen standalone stages, one console technique
 * each, authored in `lib/coding/tasks/evolving-debugging.ts`. */
export const DEBUGGING_COURSE_ID = 'js-evolving-debugging';
export const DEBUGGING_COURSE_STAGES = 15;

export const EVOLVING_CHALLENGES: readonly EvolvingChallenge[] = [
  fullstack('planner', 'Team task planner', 'Týmový plánovač úkolů'),
  fullstack('stockroom', 'Stockroom manager', 'Správa skladu'),
  fullstack('workshops', 'Workshop booking', 'Rezervace workshopů'),
  {
    id: DEBUGGING_COURSE_ID, track: 'javascript', standalone: true,
    title: { en: 'Debugging with the console', cs: 'Ladění s konzolí' },
    stages: Array.from({ length: DEBUGGING_COURSE_STAGES }, (_, index) => `${DEBUGGING_COURSE_ID}-${index + 1}`),
  },
  challenge('js-evolving-calculator', 'javascript', 'Expression engine', 'Výrazový engine'),
  challenge('js-evolving-query', 'javascript', 'Query pipeline', 'Dotazovací pipeline'),
  challenge('js-evolving-events', 'javascript', 'Event bus', 'Sběrnice událostí'),
  challenge('js-evolving-graph', 'javascript', 'Dependency planner', 'Plánovač závislostí'),
  challenge('ts-evolving-result', 'typescript', 'Result pipeline', 'Pipeline výsledků'),
  challenge('ts-evolving-store', 'typescript', 'Typed state store', 'Typovaný stavový store'),
  challenge('ts-evolving-schema', 'typescript', 'Schema validator', 'Validátor schémat'),
  challenge('react-evolving-board', 'react', 'Task board', 'Nástěnka úkolů'),
  challenge('react-evolving-catalog', 'react', 'Product explorer', 'Průzkumník produktů'),
  challenge('react-evolving-form', 'react', 'Form wizard', 'Průvodce formulářem'),
];

export function evolvingStage(id: string) {
  const challenge = EVOLVING_CHALLENGES.find(item => item.stages.includes(id));
  if (!challenge) return null;
  const index = challenge.stages.indexOf(id);
  return { challenge, index, previous: challenge.stages[index - 1] ?? null, next: challenge.stages[index + 1] ?? null };
}

export function evolvingResume(challenge: EvolvingChallenge, passed: ReadonlySet<string>): string {
  return challenge.stages.find(id => !evolvingPassed(id, passed)) ?? challenge.stages[challenge.stages.length - 1];
}

/** Existing milestone passes cover their newly separated prerequisite.
 * This preserves earned progress without inventing XP receipts or database rows. */
export function evolvingPassed(id: string, passed: ReadonlySet<string>): boolean {
  return passed.has(id) || (id.endsWith('-start') && passed.has(id.slice(0, -6)));
}

export function evolvingUnlocked(id: string, passed: ReadonlySet<string>): boolean {
  const stage = evolvingStage(id);
  return !stage || stage.challenge.stages.slice(0, stage.index).every(id => evolvingPassed(id, passed));
}
