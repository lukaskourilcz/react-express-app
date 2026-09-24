import type { Question, QuestionTranslation } from './quiz-data';
import { deploymentSubjectIds } from './product-scope';
import type { ScopeSubjectId } from '../shared/subject-catalog';

export type BankBundle = { questions: Question[]; translations: Record<string, QuestionTranslation> };

const questionLoaders: Record<ScopeSubjectId, () => Promise<Question[]>> = {
  webdev: async () => (await import('./webdev-bank')).loadWebdevQuestions(),
};

const translationLoaders: Record<ScopeSubjectId, () => Promise<Record<string, QuestionTranslation>>> = {
  webdev: async () => (await import('./webdev-bank')).loadWebdevTranslations(),
};

const questionPromises = new Map<ScopeSubjectId, Promise<Question[]>>();
const translationPromises = new Map<ScopeSubjectId, Promise<Record<string, QuestionTranslation>>>();

/** Load one validated subject. Czech data is deferred for English requests. */
export async function loadSubjectQuestionBank(
  subject: ScopeSubjectId,
  includeCzech = true,
): Promise<BankBundle> {
  let questions = questionPromises.get(subject);
  if (!questions) {
    questions = questionLoaders[subject]();
    questionPromises.set(subject, questions);
  }
  let translations: Promise<Record<string, QuestionTranslation>> | undefined;
  if (includeCzech) {
    translations = translationPromises.get(subject);
    if (!translations) {
      translations = translationLoaders[subject]();
      translationPromises.set(subject, translations);
    }
  }
  return {
    questions: await questions,
    translations: translations ? await translations : {},
  };
}

/** Lazy-load only the question/translation chunks allowed on this deployment. */
export async function loadDeploymentQuestionBank(includeCzech = true): Promise<BankBundle> {
  const bundles = await Promise.all(
    deploymentSubjectIds().map((subject) => loadSubjectQuestionBank(subject, includeCzech)),
  );
  return {
    questions: bundles.flatMap((bundle) => bundle.questions),
    translations: Object.assign({}, ...bundles.map((bundle) => bundle.translations)),
  };
}
