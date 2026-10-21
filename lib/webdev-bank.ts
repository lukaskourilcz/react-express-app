import type { Question } from './quiz-data';

/** Shared by quiz delivery and the marketingShark snapshot importer in
 * lukaskourilcz/quorum. Keep this module free of deployment configuration
 * and credentials.
 */
export async function loadWebdevQuestions(): Promise<Question[]> {
  const [core, fixTheTest] = await Promise.all([
    import('./quiz-data'),
    import('./roadmap-questions-fix-the-test'),
  ]);
  return [...core.questions, ...fixTheTest.fixTheTestQuestions];
}

/** devShark ships English only (#485), so there is no second-language overlay.
 * The marketingShark adapter still imports this loader by name, so it stays as
 * an empty record until that adapter stops asking for it. */
export async function loadWebdevTranslations(): Promise<Record<string, never>> {
  return {};
}
