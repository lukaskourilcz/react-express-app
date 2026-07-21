import { createHash } from 'node:crypto';
import type { AdminQuestion } from './questions-store';

export type QualityIssueKind =
  | 'missing_translation'
  | 'translation_parity'
  | 'weak_distractor'
  | 'duplicate'
  | 'ambiguous_wording'
  | 'freshness_review'
  | 'importance_mismatch';

export interface QualityIssue {
  questionId: string;
  questionHash: string;
  kind: QualityIssueKind;
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

const normalize = (value: string): string =>
  value.toLowerCase().replace(/```[\s\S]*?```/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

const hashQuestion = (question: AdminQuestion): string => createHash('sha256').update(JSON.stringify({
  question: question.question,
  options: question.options,
  correctAnswer: question.correctAnswer,
  explanation: question.explanation,
  cs: question.cs,
})).digest('hex');

/** Deterministic first-pass content and EN/CS parity checks. Never edits data. */
export function inspectQuestionQuality(questions: AdminQuestion[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const duplicates = new Map<string, string[]>();
  for (const question of questions.filter((item) => !item.deleted)) {
    const normalized = normalize(question.question);
    if (normalized) duplicates.set(normalized, [...(duplicates.get(normalized) ?? []), question.id]);
  }

  for (const question of questions.filter((item) => !item.deleted)) {
    const questionHash = hashQuestion(question);
    const add = (
      kind: QualityIssueKind,
      severity: QualityIssue['severity'],
      message: string,
      suggestion: string,
    ) => issues.push({ questionId: question.id, questionHash, kind, severity, message, suggestion });

    const duplicateIds = duplicates.get(normalize(question.question)) ?? [];
    if (duplicateIds.length > 1 && duplicateIds[0] !== question.id) {
      add('duplicate', 'high', `Matches ${duplicateIds[0]} after normalization.`, 'Compare both items and keep the clearest, most current version.');
    }

    const normalizedOptions = question.options.map(normalize);
    if (new Set(normalizedOptions).size !== normalizedOptions.length || question.options.some((option) => option.trim().length < 2)) {
      add('weak_distractor', 'high', 'One or more distractors are empty, duplicated, or too short.', 'Replace distractors with plausible misconceptions at a similar level of specificity.');
    } else if (question.options.some((option, index) => index !== question.correctAnswer && normalize(option).includes(normalize(question.options[question.correctAnswer])))) {
      add('weak_distractor', 'medium', 'A distractor substantially contains the accepted answer.', 'Make every option mutually exclusive and comparable in scope.');
    }

    if (/\b(always|never|obviously|all of the above|none of the above)\b/i.test(question.question)) {
      add('ambiguous_wording', 'medium', 'Absolute or test-taking language may make the answer guessable or context-dependent.', 'State the relevant runtime, standard, or conditions explicitly.');
    }
    if (/\b(latest|currently|today|now|deprecated|no longer)\b/i.test(`${question.question} ${question.explanation}`)) {
      add('freshness_review', 'medium', 'The wording depends on a time-sensitive technical or factual claim.', 'Verify against a primary source and add a version or date when useful.');
    }
    if ((question.importance ?? 5) <= 3 && question.difficulty >= 4) {
      add('importance_mismatch', 'low', 'A difficult question has low curriculum importance.', 'Confirm it belongs in scored rotation or reserve it for optional advanced practice.');
    }

    const csMissing = !question.cs.question.trim() || !question.cs.explanation.trim() ||
      question.cs.options.length !== question.options.length || question.cs.options.some((option) => !option.trim());
    if (csMissing) {
      add('missing_translation', 'high', 'Czech question, explanation, or parallel options are incomplete.', 'Complete all Czech fields while preserving option order and code identifiers.');
    } else {
      const englishCode = [...question.question.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
      const missingCode = englishCode.filter((token) => !question.cs.question.includes(token));
      if (missingCode.length > 0) {
        add('translation_parity', 'medium', `Czech text may have changed code identifiers: ${missingCode.slice(0, 3).join(', ')}.`, 'Keep code, API, and identifier tokens unchanged in the translation.');
      }
      if (!question.cs.options[question.correctAnswer]?.trim()) {
        add('translation_parity', 'high', 'The accepted-answer slot is missing in Czech.', 'Restore a parallel Czech option at the same accepted index.');
      }
    }
  }

  const severityRank = { high: 0, medium: 1, low: 2 } as const;
  return issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.questionId.localeCompare(b.questionId) || a.kind.localeCompare(b.kind));
}
