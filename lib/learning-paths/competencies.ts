/** Server-derived diagnostic evidence, stored in the existing numeric JSON map.
 * Counts are namespaced away from gated domain scores. Aggregate-only legacy
 * evidence never implies an assessment of every competency. */
import type { CheckQuestionVerdict, CompetencyResult } from '../../shared/learning-path-api';
import type { MergedActivity, MergedPath } from './types';
import { DEFAULT_CRITERION_THRESHOLD } from './grade';

const key = (id: string, count: 'correct' | 'items') => `diagnostic:v1:${id}:${count}`;

/** Only call with gradeCheck's trusted verdicts, never learner-supplied scores. */
export function diagnosticEvidence(activity: MergedActivity, verdicts: CheckQuestionVerdict[]): Record<string, number> {
  const byId = new Map(verdicts.map(verdict => [verdict.questionId, verdict]));
  const questions = activity.questions ?? [];
  if (byId.size !== questions.length || verdicts.length !== questions.length
      || questions.some(question => typeof byId.get(question.id)?.correct !== 'boolean')) {
    throw new Error('Incomplete diagnostic grading evidence');
  }
  const counts: Record<string, number> = Object.create(null);
  for (const question of questions) {
    for (const competency of new Set(question.competencies)) {
      const items = key(competency, 'items'), correct = key(competency, 'correct');
      counts[items] = (counts[items] ?? 0) + 1;
      counts[correct] = (counts[correct] ?? 0) + Number(byId.get(question.id)!.correct);
    }
  }
  return counts;
}

/** Latest accepted diagnostic attempt, not the monotonic module-completion row.
 * Older aggregate-only attempts require a retake for a precise report. */
export function diagnosticCompetencies(path: MergedPath, evidence: Record<string, number> | null): CompetencyResult[] {
  const activity = path.modules.flatMap(module => module.activities).find(one => one.id === path.diagnosticActivityId);
  const threshold = activity?.passThreshold ?? DEFAULT_CRITERION_THRESHOLD;
  return path.competencies.map(competency => {
    const items = evidence?.[key(competency.id, 'items')];
    const correct = evidence?.[key(competency.id, 'correct')];
    if (typeof items !== 'number' || typeof correct !== 'number'
        || !Number.isSafeInteger(items) || !Number.isSafeInteger(correct)
        || items <= 0 || correct < 0 || correct > items) {
      return { competencyId: competency.id, state: 'not_assessed', score: null, assessedItems: 0 };
    }
    const share = correct / items;
    return { competencyId: competency.id, state: share >= threshold ? 'demonstrated' : 'gap',
      score: Number(share.toFixed(4)), assessedItems: items };
  });
}

/** Internal diagnostic counts are not public domain labels or pass gates. */
export function activityDomainScores(activity: MergedActivity, scores: Record<string, number> | null | undefined): Record<string, number> | null {
  if (!scores || !activity.domains?.length) return null;
  const entries = activity.domains.filter(domain => Number.isFinite(scores[domain]))
    .map(domain => [domain, scores[domain]] as const);
  return entries.length ? Object.fromEntries(entries) : null;
}
