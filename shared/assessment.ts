import { SUBJECT_SCOPE_CATALOG, type ScopeSubjectId } from './subject-catalog';

export const ASSESSMENT_QUESTION_COUNT = 20;

// ── Adaptive placement ───────────────────────────────────────────────────────
// The placement skill-check is delivered as short adaptive rounds whose
// difficulty steps up on a strong round and down on a weak one. The rounds are
// sized so the whole run always totals exactly ASSESSMENT_QUESTION_COUNT
// questions, which lets the final result reuse the existing verified
// 20-question skill-check receipt + `assessmentUnlocks` unchanged (the unlocks
// stay server-authoritative and idempotent). Shared so client and server agree
// on the round protocol without duplicating the numbers.
export const PLACEMENT_ROUND_SIZE = 5;
export const PLACEMENT_TOTAL = ASSESSMENT_QUESTION_COUNT; // must match the verified receipt total
export const PLACEMENT_ROUNDS = PLACEMENT_TOTAL / PLACEMENT_ROUND_SIZE; // 4 rounds of 5
export const PLACEMENT_START_DIFFICULTY = 3; // mid difficulty (1..5) for round 1
/** Round accuracy at/above this steps difficulty up; at/below `PLACEMENT_STEP_DOWN` steps down. */
export const PLACEMENT_STEP_UP = 0.8;
export const PLACEMENT_STEP_DOWN = 0.4;

const DEV_TIERS: { minCorrect: number; unlocks: string[] }[] = [
  {
    minCorrect: 18,
    unlocks: [
      'typescript', 'abbreviations', 'general', 'git', 'dsa', 'algorithms',
      'nodejs', 'testing', 'ai', 'security', 'react', 'nextjs', 'rhf-zod',
      'databases', 'system-design', 'devops',
    ],
  },
  {
    minCorrect: 14,
    unlocks: [
      'typescript', 'abbreviations', 'general', 'git', 'dsa', 'algorithms',
      'nodejs', 'testing', 'ai', 'react',
    ],
  },
  { minCorrect: 10, unlocks: ['typescript', 'abbreviations', 'general', 'git'] },
];

/** Deterministic, subject-local skill-check unlocks shared by client and API. */
export function assessmentUnlocks(
  subject: ScopeSubjectId,
  correct: number,
  total = ASSESSMENT_QUESTION_COUNT,
): string[] {
  if (!Number.isInteger(correct) || !Number.isInteger(total) || total <= 0 || correct < 0 || correct > total) return [];
  if (subject === 'webdev' && total === ASSESSMENT_QUESTION_COUNT) {
    return DEV_TIERS.find((tier) => correct >= tier.minCorrect)?.unlocks ?? [];
  }

  const ratio = correct / total;
  const share = ratio >= 0.9 ? 0.8 : ratio >= 0.7 ? 0.6 : ratio >= 0.5 ? 0.3 : 0;
  if (share === 0) return [];
  const topics = [...SUBJECT_SCOPE_CATALOG[subject].topics];
  return topics.slice(0, Math.max(1, Math.ceil(topics.length * share)));
}
