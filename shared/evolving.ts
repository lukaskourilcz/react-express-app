import type { CodingTrack, Localized } from './coding-catalog';

/** `fullstack` groups the three app builds on their own screen; `debugging`
 * marks the one path that is about finding bugs rather than writing features,
 * listed on its own on the Coding home; `custom` holds the short foundations
 * paths picked for current interview practice, listed first on the Coding
 * home. No category means an ordinary evolving project. */
export type EvolvingCategory = 'fullstack' | 'debugging' | 'custom';

export interface EvolvingChallenge {
  id: string;
  track: CodingTrack;
  category?: EvolvingCategory;
  title: Localized;
  stages: readonly string[];
}

const challenge = (id: string, track: CodingTrack, en: string, cs: string, category?: EvolvingCategory): EvolvingChallenge => ({
  id, track, ...(category ? { category } : {}), title: { en, cs }, stages: [1, 2, 3, 4, 5].flatMap(stage => [`${id}-${stage}-start`, `${id}-${stage}`]),
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
export const EVOLVING_CHALLENGES: readonly EvolvingChallenge[] = [
  fullstack('planner', 'Team task planner', 'Týmový plánovač úkolů'),
  fullstack('stockroom', 'Stockroom manager', 'Správa skladu'),
  fullstack('workshops', 'Workshop booking', 'Rezervace workshopů'),
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
  challenge('js-evolving-debug', 'javascript', 'Debugging path', 'Ladicí cesta', 'debugging'),
  // English only: the Custom paths carry no Czech title.
  challenge('js-custom-mapset', 'javascript', 'Map and Set basics', '', 'custom'),
  challenge('js-custom-catalog', 'javascript', 'Objects and grouping', '', 'custom'),
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
