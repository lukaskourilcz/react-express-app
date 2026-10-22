// A small FDE-shaped path that uses every content shape B1 (#497) added: a
// check with a scenario, a code activity with a fixture note, and a module on
// the interview-prep shelf. The schema contracts (`npm run test:paths`) and
// tests/browser/path-content-shapes.spec.ts build from it, so both test the
// same manifest. Pure: types and the merge only, no catalogue, no grader.

import { mergePath, type PathSource } from '../lib/learning-paths/types';

const SOURCE = { label: 'MDN: HTTP overview', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', reviewedOn: '2026-10-21' };

export const SCHEMA_FIXTURE_SCENARIO = [
  'The operations team at a logistics customer stopped trusting the weekly delivery dashboard. Their lead says the numbers "jump around" after every Monday import.',
  'You have one call with the lead and read access to the `deliveries` export. Answer the questions in order: each one builds on the case above.',
].join('\n\n');

export const SCHEMA_FIXTURE_NOTE = [
  'The starter is a trimmed copy of a customer script, and its names are not yours to change. Read it before you write anything.',
  'You are done when `dedupe` keeps the first record for each `id` and the visible tests pass.',
].join('\n\n');

export function schemaFixtureSource(): PathSource {
  return {
    id: 'fde',
    kind: 'role_specialization',
    version: 1,
    title: 'Forward Deployed Engineer',
    summary: 'Scope, integrate and ship software inside a customer environment.',
    outcomes: ['Scope an ambiguous customer request into a deliverable'],
    nonGoals: ['No certification and no hiring claim'],
    entryRequirement: 'Comfort with JavaScript and HTTP.',
    competencies: [
      { id: 'scoping', title: 'Scoping', summary: 'Turn a vague request into a bounded deliverable.' },
      { id: 'integration', title: 'Integration', summary: 'Join customer data without losing records.' },
    ],
    modules: [
      {
        id: 'fde-v1-x01', deliveryPhase: 'discover-scope',
        title: 'Decomposition cases',
        outcomes: ['Ask the first question that narrows a vague complaint'],
        competencies: ['scoping', 'integration'],
        dependsOn: [],
        lessons: [{
          id: 'fde-v1-x01-l1',
          title: 'Reading a vague complaint',
          summary: 'Find the measurable claim inside a complaint.',
          estimatedMinutes: 10,
          sources: [SOURCE],
          sections: [{ kind: 'prose', body: 'A complaint names a symptom. Your first question finds the measurement behind it.' }],
        }],
        activities: [
          {
            id: 'fde-v1-x01-read',
            kind: 'lesson',
            purpose: 'exercise',
            verification: 'self_reviewed',
            title: 'Reading a vague complaint',
            summary: 'Read the lesson.',
            competencies: ['scoping'],
            estimatedMinutes: 10,
            lessonId: 'fde-v1-x01-l1',
          },
          {
            id: 'fde-v1-x01-case',
            kind: 'check',
            purpose: 'exercise',
            verification: 'machine_verified',
            title: 'The dashboard nobody trusts',
            summary: 'Work one decomposition case from first question to trade-off.',
            competencies: ['scoping'],
            estimatedMinutes: 15,
            passThreshold: 0.8,
            scenario: SCHEMA_FIXTURE_SCENARIO,
            questions: [
              {
                id: 'fde-v1-x01-case-q1',
                prompt: 'What do you ask the lead first?',
                options: [
                  'Which number moved, and what did they expect it to be',
                  'Which charting library the dashboard uses today',
                  'Whether the team would accept a full rebuild of the pipeline',
                ],
                correct: 0,
                explanation: 'A concrete number and its expected value turn the complaint into something you can check against the export.',
                competencies: ['scoping'],
              },
              {
                id: 'fde-v1-x01-case-q2',
                prompt: 'The Monday import appends rows that share an id with older ones. What do you check next?',
                options: [
                  'Whether the dashboard counts every row or every distinct delivery',
                  'Whether the import runs fast enough to finish before nine',
                  'Whether the export file uses a comma or a semicolon',
                ],
                correct: 0,
                explanation: 'Repeated ids inflate a row count, which would explain totals that rise after each import.',
                competencies: ['integration'],
              },
              {
                id: 'fde-v1-x01-case-q3',
                prompt: 'You have two days. What do you cut from the first delivery?',
                options: [
                  'A redesign of the dashboard layout',
                  'A count of distinct deliveries per week',
                  'A short note to the lead on what changed and why',
                ],
                correct: 0,
                explanation: 'The layout does not affect trust in the numbers; the corrected count and the note do.',
                competencies: ['scoping'],
              },
            ],
          },
          {
            id: 'fde-v1-x01-drill',
            kind: 'code',
            purpose: 'exercise',
            verification: 'machine_verified',
            title: 'Deduplicate the import',
            summary: 'Keep the first delivery record for each id.',
            competencies: ['integration'],
            estimatedMinutes: 20,
            fixtureNote: SCHEMA_FIXTURE_NOTE,
            code: {
              language: 'javascript',
              prompt: 'Write `dedupe(records)`, which keeps the first record for each `id` in input order.',
              starter: 'function dedupe(records) {\n  // keep the first record for each id\n}\n',
              hints: ['A Set of the ids you have already kept answers "seen before?" in one step.'],
              tests: [
                { call: 'dedupe([{ id: 1 }, { id: 1 }, { id: 2 }]).length', expected: 2, label: 'drops a repeated id' },
              ],
            },
          },
        ],
        requires: [
          { activityId: 'fde-v1-x01-case', state: 'verified_pass' },
          { activityId: 'fde-v1-x01-drill', state: 'verified_pass' },
        ],
        estimatedMinutes: 45,
      },
      {
        id: 'fde-v1-ip01',
        title: 'Learning round',
        outcomes: ['Extend an unfamiliar codebase under time pressure'],
        competencies: ['integration'],
        dependsOn: [],
        optional: true,
        shelf: 'interview-prep',
        lessons: [{
          id: 'fde-v1-ip01-l1',
          title: 'How a learning round runs',
          summary: 'What the interviewer watches for in a learning round.',
          estimatedMinutes: 10,
          sources: [SOURCE],
          sections: [{ kind: 'prose', body: 'You read code you have never seen and extend it while you explain each step.' }],
        }],
        activities: [
          {
            id: 'fde-v1-ip01-read',
            kind: 'lesson',
            purpose: 'exercise',
            verification: 'self_reviewed',
            title: 'How a learning round runs',
            summary: 'Read the lesson.',
            competencies: ['integration'],
            estimatedMinutes: 10,
            lessonId: 'fde-v1-ip01-l1',
          },
          {
            id: 'fde-v1-ip01-check',
            kind: 'check',
            purpose: 'exercise',
            verification: 'machine_verified',
            title: 'Reading foreign code',
            summary: 'Pick the first step in an unfamiliar codebase.',
            competencies: ['integration'],
            estimatedMinutes: 5,
            passThreshold: 0.8,
            questions: [{
              id: 'fde-v1-ip01-check-q1',
              prompt: 'You open a codebase you have never seen. What do you do first?',
              options: [
                'Run the tests and read the entry point',
                'Rename the variables you find unclear',
                'Rewrite the module you will extend',
              ],
              correct: 0,
              explanation: 'Running the tests shows what already works before you change anything.',
              competencies: ['integration'],
            }],
          },
        ],
        requires: [],
        estimatedMinutes: 15,
      },
    ],
    bridges: [],
    rubric: {
      version: 1,
      dimensions: [{
        id: 'clarity',
        title: 'Clarity',
        levels: { missing: 'No reader could act on it.', partial: 'A reader must ask follow-ups.', adequate: 'A reader can act on it.', strong: 'A reader can act on it and knows what was left out.' },
      }],
    },
    diagnosticActivityId: null,
    estimatedHours: { min: 1, max: 2 },
    sources: [SOURCE],
    reviewedOn: '2026-10-21',
    completionLabel: 'FDE guided path completed',
  };
}

export const schemaFixture = () => mergePath(schemaFixtureSource());
