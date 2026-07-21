import type { Question, QuestionTranslation } from './quiz-data';
import { deploymentSubjectIds } from './product-scope';
import type { ScopeSubjectId } from '../shared/subject-catalog';

type BankBundle = { questions: Question[]; translations: Record<string, QuestionTranslation> };

const loaders: Record<ScopeSubjectId, () => Promise<BankBundle>> = {
  webdev: async () => {
    const [bank, translations] = await Promise.all([import('./quiz-data'), import('./quiz-data.cs')]);
    return { questions: bank.questions, translations: translations.questionTranslationsCs };
  },
  geography: async () => {
    const [bank, translations] = await Promise.all([import('./roadmap-questions.geography'), import('./roadmap-questions.geography.cs')]);
    return { questions: bank.allRoadmapGeographyQuestions, translations: translations.geographyTranslationsCs };
  },
  math: async () => {
    const [bank, translations] = await Promise.all([import('./roadmap-questions.math'), import('./roadmap-questions.math.cs')]);
    return { questions: bank.allRoadmapMathQuestions, translations: translations.mathTranslationsCs };
  },
  history: async () => {
    const [bank, translations] = await Promise.all([import('./roadmap-questions.history'), import('./roadmap-questions.history.cs')]);
    return { questions: bank.allRoadmapHistoryQuestions, translations: translations.historyTranslationsCs };
  },
  biology: async () => {
    const [bank, translations] = await Promise.all([import('./roadmap-questions.biology'), import('./roadmap-questions.biology.cs')]);
    return { questions: bank.allRoadmapBiologyQuestions, translations: translations.biologyTranslationsCs };
  },
  chess: async () => {
    const [bank, translations] = await Promise.all([import('./roadmap-questions.chess'), import('./roadmap-questions.chess.cs')]);
    return { questions: bank.allRoadmapChessQuestions, translations: translations.chessTranslationsCs };
  },
  poker: async () => {
    const [bank, translations] = await Promise.all([import('./roadmap-questions.poker'), import('./roadmap-questions.poker.cs')]);
    return { questions: bank.allRoadmapPokerQuestions, translations: translations.pokerTranslationsCs };
  },
};

let deploymentBank: Promise<BankBundle> | null = null;

/** Lazy-load only the question/translation chunks allowed on this deployment. */
export function loadDeploymentQuestionBank(): Promise<BankBundle> {
  if (!deploymentBank) {
    deploymentBank = Promise.all(deploymentSubjectIds().map((subject) => loaders[subject]())).then((bundles) => ({
      questions: bundles.flatMap((bundle) => bundle.questions),
      translations: Object.assign({}, ...bundles.map((bundle) => bundle.translations)),
    }));
  }
  return deploymentBank;
}
