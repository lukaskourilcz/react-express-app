/** DSA Foundations: the standalone skill path.
 *
 * A focused course on growth rates, the everyday data structures and the
 * foundational searches, sorts and tree operations. It is entered directly —
 * no base track, no role specialization, no XP rank — and it can run
 * alongside a learner's career path.
 *
 * This file carries the path metadata and assembles the modules. Module
 * bodies live one file per module under `./dsa/`; Czech copy lives in the
 * `.cs` siblings; reference solutions and hidden assertions live under
 * `lib/learning-paths/solutions/` and are loaded only by the grader. */

import type { PathSource } from '../types';
import { DSA_ENTRY } from './dsa/entry';
import { DSA_D01 } from './dsa/d01';
import { DSA_D02 } from './dsa/d02';
import { DSA_D03 } from './dsa/d03';
import { DSA_D04 } from './dsa/d04';
import { DSA_D05 } from './dsa/d05';
import { DSA_D06 } from './dsa/d06';
import { DSA_D07 } from './dsa/d07';
import { DSA_D08 } from './dsa/d08';
import { DSA_D09 } from './dsa/d09';
import { DSA_D10 } from './dsa/d10';

export const DSA_PATH: PathSource = {
  id: 'dsa-foundations',
  kind: 'skill_path',
  version: 1,
  title: 'DSA Foundations',
  summary:
    'Nine modules on how algorithms cost, the data structures you reach for daily, and the searches, sorts and tree operations underneath them. Every module asks for working code and for the reasoning behind it, because either one alone leaves the other unproven.',
  outcomes: [
    'Name the growth class of code you have just read, and say what you assumed about the machine to get there.',
    'Pick between an array, a map, a set, a stack, a queue and a linked list for a stated access pattern, and defend the choice.',
    'Implement linear search, binary search, selection sort, insertion sort, merge sort and the basic binary-tree operations from scratch.',
    'Separate the time a routine takes from the extra space it needs, including the memory a recursion stack quietly borrows.',
  ],
  nonGoals: [
    'Graph algorithms — Dijkstra, A*, shortest paths, topological sort and union-find are all out of scope here.',
    'Balanced trees: no AVL or red-black rotations, no B-trees, and no advanced BST deletion cases.',
    'Heaps, tries, advanced dynamic programming, greedy proofs and competitive-programming technique.',
    'A guarantee that finishing the path fixes this knowledge permanently. Spaced practice afterwards is what keeps it.',
  ],
  entryRequirement:
    'You need variables, functions, conditionals, loops and arrays in JavaScript. Nothing else: no HTML or CSS, no framework, no chosen career track, no XP rank. The optional entry check below points you at the right foundations lesson if a topic feels thin.',
  competencies: [
    {
      id: 'complexity',
      title: 'Growth and cost',
      summary: 'Read code and name the tightest growth class it supports, for both running time and extra space.',
    },
    {
      id: 'arrays-strings',
      title: 'Arrays and strings',
      summary: 'Traverse, mutate and two-pointer your way through sequences, knowing what copying costs.',
    },
    {
      id: 'maps-sets',
      title: 'Hash maps and sets',
      summary: 'Trade memory for lookup speed, and tell the expected case apart from the adversarial one.',
    },
    {
      id: 'stacks-queues',
      title: 'Stacks and queues',
      summary: 'Model last-in-first-out and first-in-first-out access, and account for the cost of the representation you chose.',
    },
    {
      id: 'linked-lists',
      title: 'Linked lists',
      summary: 'Follow and rewire node references without losing the list, and see where a pointer beats an index.',
    },
    {
      id: 'recursion',
      title: 'Recursion',
      summary: 'Write a base case that terminates, and account for the stack depth the call chain borrows.',
    },
    {
      id: 'searching',
      title: 'Searching',
      summary: 'Scan when you must and halve when you can, holding the interval invariant that makes it correct.',
    },
    {
      id: 'sorting',
      title: 'Sorting',
      summary: 'Implement the three foundational sorts and say which is stable, which is in place, and what each costs.',
    },
    {
      id: 'trees',
      title: 'Trees and BSTs',
      summary: 'Walk a binary tree in every order, and use the search-tree property without assuming it stays balanced.',
    },
  ],
  modules: [DSA_ENTRY, DSA_D01, DSA_D02, DSA_D03, DSA_D04, DSA_D05, DSA_D06, DSA_D07, DSA_D08, DSA_D09, DSA_D10],
  bridges: [
    {
      id: 'dsa-js-foundations',
      title: 'JavaScript foundations refresher',
      summary:
        'Loops, array methods, functions and objects, from the existing devShark JavaScript path. Worth a detour if the entry check showed gaps; the DSA modules assume all four.',
      suggestedFor: ['fullstack', 'frontend', 'backend'],
      competencies: ['arrays-strings', 'recursion'],
      references: [
        { kind: 'roadmap-topic', ref: 'javascript', label: 'JavaScript Learn levels 1–10' },
        { kind: 'coding-task', ref: 'js-digit-sum', label: 'Digit sum — a while loop over arithmetic' },
        { kind: 'coding-task', ref: 'js-count-multiples', label: 'Count multiples — a counted for loop' },
        {
          kind: 'doc',
          ref: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration',
          label: 'MDN — Loops and iteration',
        },
      ],
      estimatedMinutes: 90,
    },
    {
      id: 'dsa-array-methods',
      title: 'Array methods and their costs',
      summary:
        'push, pop, shift, unshift, slice and splice, and what each one does to the elements it moves. The performance lessons in D02 and D04 lean on this.',
      suggestedFor: ['fullstack', 'frontend', 'backend'],
      competencies: ['arrays-strings', 'stacks-queues'],
      references: [
        { kind: 'coding-task', ref: 'js-queue-with-shift', label: 'Queue with push and shift — FIFO behaviour' },
        { kind: 'coding-task', ref: 'js-swap-stack-top', label: 'Swap the top of a stack — LIFO behaviour' },
        {
          kind: 'doc',
          ref: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
          label: 'MDN — Array reference',
        },
      ],
      estimatedMinutes: 45,
    },
  ],
  rubric: {
    version: 1,
    dimensions: [
      {
        id: 'correctness',
        title: 'Correctness',
        levels: {
          missing: 'The routine does not run, or fails the stated behaviour on ordinary input.',
          partial: 'Ordinary input works; at least one stated edge case — empty, single element, duplicate, absent target — does not.',
          adequate: 'Every stated case passes, including the edge cases named in the prompt.',
          strong: 'Every case passes and the implementation stays within the operation contract the task set out.',
        },
      },
      {
        id: 'cost-reasoning',
        title: 'Cost reasoning',
        levels: {
          missing: 'No growth class given, or one that contradicts the code.',
          partial: 'The right family for time, but space or the assumed cost model is missing.',
          adequate: 'The tightest supported class for both time and extra space, with the assumption stated.',
          strong: 'As adequate, plus the case analysis — best, average, worst — where the input shape changes the answer.',
        },
      },
      {
        id: 'structure-choice',
        title: 'Structure choice',
        levels: {
          missing: 'A structure that cannot support the stated access pattern.',
          partial: 'A workable structure, chosen without a reason that survives questioning.',
          adequate: 'A structure suited to the access pattern, justified by the operations it makes cheap.',
          strong: 'As adequate, plus the tradeoff accepted in exchange — extra memory, a worse worst case, a lost ordering.',
        },
      },
    ],
  },
  diagnosticActivityId: 'dsa-v1-entry-check',
  estimatedHours: { min: 25, max: 40 },
  sources: [
    {
      label: "Harvard CS50x — Algorithms",
      url: 'https://cs50.harvard.edu/x/weeks/3/',
      reviewedOn: '2026-09-08',
    },
    {
      label: 'Harvard CS50x — Data structures notes',
      url: 'https://cs50.harvard.edu/x/notes/5/',
      reviewedOn: '2026-09-08',
    },
    {
      label: 'MIT 6.006 — Binary trees, part 1',
      url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/lecture-6-binary-trees-part-1/',
      reviewedOn: '2026-09-08',
    },
  ],
  reviewedOn: '2026-09-08',
  completionLabel: 'DSA Foundations completed',
};
