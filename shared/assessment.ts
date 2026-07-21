import { SUBJECT_SCOPE_CATALOG, type ScopeSubjectId } from './subject-catalog';

export const ASSESSMENT_QUESTION_COUNT = 20;

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
