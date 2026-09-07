import type { Question, QuestionTranslation } from './quiz-data';

/** Shared by quiz delivery and the BoardlessAI marketing snapshot importer.
 * Keep this module free of deployment configuration and credentials.
 */
export async function loadWebdevQuestions(): Promise<Question[]> {
  const [core, fixTheTest] = await Promise.all([
    import('./quiz-data'),
    import('./roadmap-questions-fix-the-test'),
  ]);
  return [...core.questions, ...fixTheTest.fixTheTestQuestions];
}

export async function loadWebdevTranslations(): Promise<Record<string, QuestionTranslation>> {
  const [core, fixTheTest] = await Promise.all([
    import('./quiz-data.cs'),
    import('./roadmap-questions-fix-the-test.cs'),
  ]);
  return { ...core.questionTranslationsCs, ...fixTheTest.fixTheTestTranslationsCs };
}
