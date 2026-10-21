import type { Question } from './quiz-data';
import { deploymentSubjectIds } from './product-scope';
import type { ScopeSubjectId } from '../shared/subject-catalog';

const questionLoaders: Record<ScopeSubjectId, () => Promise<Question[]>> = {
  webdev: async () => (await import('./webdev-bank')).loadWebdevQuestions(),
};

const questionPromises = new Map<ScopeSubjectId, Promise<Question[]>>();

/** Load one validated subject's question bank. */
export async function loadSubjectQuestionBank(subject: ScopeSubjectId): Promise<Question[]> {
  let questions = questionPromises.get(subject);
  if (!questions) {
    questions = questionLoaders[subject]();
    questionPromises.set(subject, questions);
  }
  return questions;
}

/** Lazy-load only the question chunks allowed on this deployment. */
export async function loadDeploymentQuestionBank(): Promise<Question[]> {
  const banks = await Promise.all(deploymentSubjectIds().map((subject) => loadSubjectQuestionBank(subject)));
  return banks.flat();
}
