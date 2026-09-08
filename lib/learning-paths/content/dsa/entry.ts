/** DSA Foundations — the optional entry check.
 *
 * Six questions on the JavaScript the path assumes. It is skippable, gates
 * nothing, and its only job is to point a learner at the right foundations
 * lesson before they meet a growth class. Because it is a diagnostic, the
 * validator refuses to let it become a module requirement. */

import type { ModuleSource } from '../../types';

export const DSA_ENTRY: ModuleSource = {
  id: 'dsa-v1-entry',
  title: 'Before you start',
  outcomes: [
    'Know whether the JavaScript this path assumes — loops, arrays, functions, objects — is comfortable enough to build on.',
  ],
  competencies: ['arrays-strings', 'recursion'],
  dependsOn: [],
  optional: true,
  estimatedMinutes: 10,
  lessons: [],
  requires: [],
  activities: [
    {
      id: 'dsa-v1-entry-check',
      kind: 'check',
      purpose: 'diagnostic',
      verification: 'machine_verified',
      title: 'Entry check',
      summary:
        'Six questions on the JavaScript the modules assume. Skip it if you like — it recommends reading, it never blocks anything.',
      competencies: ['arrays-strings', 'recursion'],
      estimatedMinutes: 10,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-entry-q1',
          prompt: 'What does this log?',
          context: {
            language: 'javascript',
            code: 'const values = [3, 1, 4];\nlet total = 0;\nfor (const value of values) total += value;\nconsole.log(total);',
          },
          options: ['8', '3', '[3, 1, 4]', 'undefined'],
          correct: 0,
          explanation:
            'A `for…of` loop binds each element in turn, so `total` accumulates 3, then 4, then 8. If the loop body or the accumulator felt unfamiliar, the JavaScript foundations bridge covers both.',
          competencies: ['arrays-strings'],
        },
        {
          id: 'dsa-v1-entry-q2',
          prompt: 'After this runs, what is `values`?',
          context: {
            language: 'javascript',
            code: 'const values = [1, 2, 3];\nvalues.push(4);\nvalues.shift();',
          },
          options: ['[2, 3, 4]', '[1, 2, 3, 4]', '[1, 2, 3]', '[4, 1, 2, 3]'],
          correct: 0,
          explanation:
            '`push` appends 4 and `shift` removes the first element, leaving `[2, 3, 4]`. Both mutate the array in place rather than returning a new one — a distinction the array and queue modules lean on.',
          competencies: ['arrays-strings'],
        },
        {
          id: 'dsa-v1-entry-q3',
          prompt: 'Which expression reads the last element of a non-empty array `values`?',
          options: ['values[values.length - 1]', 'values[values.length]', 'values.last', 'values[-1]'],
          correct: 0,
          explanation:
            'Indices run from 0 to `length - 1`, so the last element sits one below the length. `values[values.length]` is past the end and gives `undefined`, and JavaScript arrays have no `last` property and no negative indexing.',
          competencies: ['arrays-strings'],
        },
        {
          id: 'dsa-v1-entry-q4',
          prompt: 'What does `describe(4)` return?',
          context: {
            language: 'javascript',
            code: 'const describe = n => {\n  if (n <= 0) return "done";\n  return describe(n - 1);\n};',
          },
          options: ['"done"', 'undefined', '4', 'It never returns — the calls do not stop.'],
          correct: 0,
          explanation:
            'Each call passes a smaller `n` until the guard `n <= 0` returns `"done"`, and that value travels back up the call chain. That guard is the base case; the recursion module spends a lesson on what happens without one.',
          competencies: ['recursion'],
        },
        {
          id: 'dsa-v1-entry-q5',
          prompt: 'What does `counts.get("a")` give after this runs?',
          context: {
            language: 'javascript',
            code: 'const counts = new Map();\ncounts.set("a", 1);\ncounts.set("a", counts.get("a") + 1);',
          },
          options: ['2', '1', '[1, 2]', 'undefined'],
          correct: 0,
          explanation:
            '`set` on an existing key replaces its value, so the second call stores 1 + 1. Maps are the whole subject of the third module; this only checks that `get` and `set` are familiar.',
          competencies: ['arrays-strings'],
        },
        {
          id: 'dsa-v1-entry-q6',
          prompt: 'What is `node.next.value` here?',
          context: {
            language: 'javascript',
            code: 'const node = { value: 1, next: { value: 2, next: null } };',
          },
          options: ['2', '1', 'null', 'An error — `next` is not an array.'],
          correct: 0,
          explanation:
            '`node.next` is the second object and `.value` reads its field. Objects holding a reference to the next object are exactly how the linked-list module builds a list.',
          competencies: ['arrays-strings'],
        },
      ],
    },
  ],
};
