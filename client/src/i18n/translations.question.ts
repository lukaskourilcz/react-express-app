// The shared question parts (components/question/, UX audit U2). English only,
// like translations.ts. Only the question screens' lazy chunks read these
// words, and the app shell has no budget to spare for them
// (docs/quality/bundle-budget.json), as the Learn words live in
// translations.learn.ts. client/tests/question-copy.test.ts keeps these keys
// out of translations.ts.

export const questionEn = {
  'question.correctAnswer': 'Correct answer',
  'question.yourPick': 'Your pick',
  'question.difficultyLevel': 'Difficulty {level}',
  'question.keysHint': 'Press 1–{max} to {verb} · Enter to {next}',
  'question.keysHintShort': 'Press 1–{max} to {verb}',
  'question.keysAnswer': 'answer',
  'question.keysSelect': 'select',
  'question.keysContinue': 'continue',
  'question.keysSubmit': 'submit',
} as const;

export type QuestionKey = keyof typeof questionEn;

/** Resolve a question key and fill its `{name}` placeholders, as `t()` does.
 * A copy of the interpolation in LanguageContext.tsx: exporting that one would
 * add an export to a module the shell ships. */
export function questionText(key: QuestionKey, vars?: Record<string, string | number>): string {
  const template: string = questionEn[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}
