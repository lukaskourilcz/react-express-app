/** Hidden checks for React challenges (#226).
 *
 * A JavaScript or TypeScript challenge hides extra calls on the server
 * (`hiddenTests`). A React challenge hides extra Testing Library cases
 * instead: `hiddenSuite` on its solution record, next to the reference
 * solution, so it never reaches the browser. The Run button in the browser
 * runs the visible suite alone; Submit runs both.
 *
 * The hidden cases are test blocks only. They are appended to the visible
 * suite inside one `describe`, so they share its imports (`render`, `screen`,
 * `fireEvent`, `waitFor`, `App` and any named export) and its top-level
 * helpers, and every case they register carries HIDDEN_CASE_PREFIX in its
 * name. The grader uses that prefix to split the run: visible cases go back
 * with their names and errors, hidden ones only as a count.
 *
 * The cases run in the same VM as the learner's component, so this keeps them
 * out of the page, not away from a component written to go looking for them.
 * The grading operations note says the same of the whole React boundary. */

export const HIDDEN_CASE_PREFIX = '[hidden]';

/** The suite the server runs: the visible suite, then the hidden cases. */
export function withHiddenCases(suite: string, hiddenSuite: string | undefined): string {
  if (!hiddenSuite?.trim()) return suite;
  return `${suite}\ndescribe(${JSON.stringify(HIDDEN_CASE_PREFIX)}, () => {\n${hiddenSuite}\n});\n`;
}

/** Split a run's cases into the visible ones, in order, and the hidden ones. */
export function splitHiddenCases<T extends { name: string }>(cases: readonly T[]): { visible: T[]; hidden: T[] } {
  const hidden = (one: T) => one.name.startsWith(`${HIDDEN_CASE_PREFIX} `);
  return { visible: cases.filter((one) => !hidden(one)), hidden: cases.filter(hidden) };
}
