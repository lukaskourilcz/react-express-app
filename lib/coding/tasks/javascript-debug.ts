// Debugging tasks for the JavaScript track (authored for devShark).
//
// A debugging task starts from code that is there and wrong. That is a
// different skill from writing code that is not there yet: reading someone
// else's intent, forming a theory about why the behaviour differs, and making
// the smallest change that fixes it. Most working days contain more of this
// than of the other kind, and until now the catalogue had none of it.
//
// Each one carries an original broken starter, a statement of what the code is
// meant to do, tests that pin that behaviour down, and a failure hint written
// for the misconception the bug comes from — not for the line number.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.
// English is the source of truth; Czech copy lives in javascript-debug.cs.ts.

import type { CodingTaskSource } from '../types';

export const JAVASCRIPT_DEBUG_TASKS: CodingTaskSource[] = [
  {
    id: 'js-debug-average',
    track: 'javascript',
    topic: 'javascript',
    level: 3,
    tier: 1,
    format: 'debug',
    focus: ['reduce', 'functions'],
    title: 'The average that divides by nothing',
    prompt: '`average(numbers)` should return the mean of a list of numbers, and `0` for an empty list. It returns the right answer for ordinary lists and something strange for an empty one. Find the bug and make the smallest change that fixes it.',
    starter: `const average = numbers => {
  const total = numbers.reduce((sum, number) => sum + number, 0);
  return total / numbers.length;
};

// Scratch pad — change this and press Run.
console.log(average([]));
`,
    hints: [
      'Run it on an empty list and read the answer out loud. What is the length of an empty array, and what does dividing by it give you?',
    ],
    approach: [
      'Reproduce it first: call the function with an empty array and look at what comes back.',
      'Ask what the last line computes when the list is empty — zero divided by zero is not zero.',
      'Handle the empty list before the division rather than trying to repair the result afterwards.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    pitfall: 'boundary',
    failureHints: {
      boundary: {
        en: 'The ordinary lists already work — the bug only shows at the edge. Ask what the last line computes when there is nothing to average.',
        cs: 'Běžné seznamy fungují — chyba se ukáže až na kraji. Zeptej se, co poslední řádek spočítá, když není co průměrovat.',
      },
    },
    tests: [
      { call: 'average([1, 2, 3])', expected: 2 },
      { call: 'average([10])', expected: 10 },
      { call: 'average([])', expected: 0, label: 'an empty list averages to zero', edge: true },
      { call: 'average([2, 4])', expected: 3 },
      { call: 'average([-2, 2])', expected: 0, label: 'values that cancel out still average to zero' },
    ],
  },
  {
    id: 'js-debug-tally',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 2,
    format: 'debug',
    focus: ['map-set', 'objects'],
    title: 'The tally that counts nothing twice',
    prompt: '`tally(words)` should return a Map from each word to how many times it appears. Every count comes back as 1, however many times a word occurs. Find the bug and fix it.',
    starter: `const tally = words => {
  const counts = new Map();
  for (const word of words) {
    counts.set(word, 1);
  }
  return counts;
};

// Scratch pad — change this and press Run.
console.log(tally(["a", "b", "a"]));
`,
    hints: [
      'The loop writes the same number every time. What should it write instead — and where would it read the previous value from?',
    ],
    approach: [
      'Read the loop body and say what it does for a word that has already been seen.',
      'The new count is the old one plus one, so the old one has to be read back out of the map.',
      'Decide what to use when the word is new, and remember that a missing key reads as undefined, not zero.',
    ],
    verify: 'tests',
    estimatedMinutes: 7,
    failureHints: {
      'output-shape': {
        en: 'The container is right and the numbers in it are not. Look at what the loop writes for a word it has already seen.',
        cs: 'Nádoba je správná, čísla v ní ne. Podívej se, co cyklus zapíše pro slovo, které už jednou viděl.',
      },
    },
    tests: [
      { call: '[...tally(["a", "b", "a"]).entries()]', expected: [['a', 2], ['b', 1]] },
      { call: '[...tally([]).entries()]', expected: [], label: 'no words, no counts', edge: true },
      { call: '[...tally(["x"]).entries()]', expected: [['x', 1]] },
      { call: '[...tally(["a", "a", "a"]).entries()]', expected: [['a', 3]] },
    ],
  },
  {
    id: 'js-debug-remove-item',
    track: 'javascript',
    topic: 'javascript',
    level: 8,
    tier: 2,
    format: 'debug',
    focus: ['filter', 'splice'],
    title: 'The removal that changes the caller’s list',
    prompt: '`without(items, unwanted)` should return a new list with every copy of `unwanted` removed, leaving the list it was given untouched. The returned list is right, but the caller finds their own list has changed. Fix it.',
    starter: `const without = (items, unwanted) => {
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i] === unwanted) items.splice(i, 1);
  }
  return items;
};

// Scratch pad — change this and press Run.
const original = ["a", "b", "a"];
console.log(without(original, "a"), original);
`,
    hints: [
      'Look at what the function does to `items` itself, then at what it returns. Which of the two is the caller looking at afterwards?',
    ],
    approach: [
      'Reproduce it: keep a reference to the list you passed in and print it after the call.',
      'Notice that splice edits the array in place, and that the function returns that same array.',
      'Build a new list from the ones you want to keep instead of removing from the one you were given.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    pitfall: 'mutation',
    failureHints: {
      mutation: {
        en: 'The answer is right and the side effect is not. Ask which array the function returns, and whether the caller is still holding it.',
        cs: 'Odpověď je správná, vedlejší efekt ne. Zeptej se, které pole funkce vrací a jestli ho volající pořád drží.',
      },
    },
    tests: [
      { call: 'without(["a", "b", "a"], "a")', expected: ['b'] },
      { call: 'without(["a"], "b")', expected: ['a'], label: 'nothing to remove leaves the list as it was' },
      { call: 'without([], "a")', expected: [], label: 'an empty list stays empty', edge: true },
      {
        call: '(() => { const source = ["a", "b"]; without(source, "a"); return source; })()',
        expected: ['a', 'b'],
        label: 'the list that was passed in is not changed',
        edge: true,
      },
    ],
  },
  {
    id: 'js-debug-first-match',
    track: 'javascript',
    topic: 'javascript',
    level: 10,
    tier: 2,
    format: 'debug',
    focus: ['find', 'closures'],
    title: 'The search that never finds the first one',
    prompt: '`firstLongerThan(words, length)` should return the first word longer than `length`, or `null` when there is none. It returns the last matching word instead of the first. Fix it.',
    starter: `const firstLongerThan = (words, length) => {
  let found = null;
  for (const word of words) {
    if (word.length > length) found = word;
  }
  return found;
};

// Scratch pad — change this and press Run.
console.log(firstLongerThan(["ox", "cat", "horse"], 2));
`,
    hints: [
      'The loop keeps going after it has an answer. What should happen the moment the first match is found?',
    ],
    approach: [
      'Trace the loop on a list with two matches and watch what `found` holds after each step.',
      'The first match is the answer, so there is nothing left to look at once you have one.',
      'Return it straight away, and let the end of the function handle the no-match case.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    failureHints: {
      tests: {
        en: 'It finds a match, just not the one that was asked for. Trace the loop on a list with two matches and watch what the variable holds after each step.',
        cs: 'Shodu najde, jen ne tu, o kterou šlo. Projdi cyklus na seznamu se dvěma shodami a sleduj, co proměnná drží po každém kroku.',
      },
    },
    tests: [
      { call: 'firstLongerThan(["ox", "cat", "horse"], 2)', expected: 'cat' },
      { call: 'firstLongerThan(["ox", "cat"], 5)', expected: null, label: 'no match gives null', edge: true },
      { call: 'firstLongerThan([], 1)', expected: null, label: 'an empty list gives null', edge: true },
      { call: 'firstLongerThan(["alpha", "beta"], 3)', expected: 'alpha' },
    ],
  },
];
