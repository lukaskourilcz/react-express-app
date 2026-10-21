/** TEMPORARY: C4 (#514) dry run of the learning-path-module-authoring skill.
 * One lesson, one check. Removed before any commit. */

import type { ModuleSource } from '../../types';

export const FDE_DRYRUN: ModuleSource = {
  id: 'fde-v1-dryrun',
  title: 'Dry run: reading a request',
  outcomes: ['Tell the job a customer needs done from the mechanism their request names.'],
  competencies: ['discovery'],
  dependsOn: ['fde-v1-m01'],
  estimatedMinutes: 25,
  lessons: [
    {
      id: 'fde-v1-dryrun-l1',
      title: 'The request and the job',
      summary: 'Separate the mechanism a request names from the job the customer needs done.',
      estimatedMinutes: 10,
      sources: [
        {
          label: 'NIST AI Risk Management Framework',
          url: 'https://www.nist.gov/itl/ai-risk-management-framework',
          reviewedOn: '2026-10-22',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body: 'A request often names a mechanism. Ask what the operator cannot do today, and write that down before you pick a design.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body: 'Every company and number in this module is a fixture written for it.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'fde-v1-dryrun-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: the request and the job',
      summary: 'Mechanism versus job to be done.',
      competencies: ['discovery'],
      estimatedMinutes: 10,
      lessonId: 'fde-v1-dryrun-l1',
    },
    {
      id: 'fde-v1-dryrun-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Request or job',
      summary: 'Three questions on one fixture request.',
      competencies: ['discovery'],
      estimatedMinutes: 10,
      passThreshold: 0.8,
      scenario:
        'Halden Freight asks for “a chatbot on the returns page”. Returns staff spend most of each morning matching return labels to orders by hand.',
      questions: [
        {
          id: 'fde-v1-dryrun-q1',
          prompt: 'Which part of the Halden request names a mechanism?',
          options: ['A chatbot on the returns page', 'Matching labels to orders', 'The morning workload of returns staff', 'The returns page traffic'],
          correct: 0,
          explanation: 'A chatbot is a mechanism. Matching labels is the job, the morning workload is its cost, and page traffic is a number nobody asked for.',
          competencies: ['discovery'],
        },
        {
          id: 'fde-v1-dryrun-q2',
          prompt: 'What do you ask the returns staff first?',
          options: ['Show me three labels you matched this morning', 'Which chatbot vendor do you prefer', 'How many visitors open the returns page', 'Who should write the chatbot greeting'],
          correct: 0,
          explanation: 'Watching three real matches shows the job and its cost. Vendor, traffic and greeting questions all assume the chatbot is the answer.',
          competencies: ['discovery'],
        },
        {
          id: 'fde-v1-dryrun-q3',
          prompt: 'Which line is a baseline you could measure again?',
          options: ['Median minutes per matched label, October, all returns staff, from the shift log', 'Returns are slow', 'Staff say mornings feel long', 'The chatbot will halve the work'],
          correct: 0,
          explanation: 'Only the first line has a quantity, a population, a window and a method. The others are a complaint, an impression and a target.',
          competencies: ['discovery'],
        },
      ],
    },
  ],
  requires: [{ activityId: 'fde-v1-dryrun-checks', state: 'verified_pass' }],
};
