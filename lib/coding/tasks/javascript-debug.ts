// Repair exercises: the starter is broken on purpose and the learner fixes it
// (issue #163). Authored for devShark; the same graders decide the verdict, so a
// repair has to work rather than merely look plausible. English is the source of
// truth; Czech copy lives in the sibling *.cs.ts overlay.

import type { CodingTaskSource } from '../types';

export const JAVASCRIPT_DEBUG_TASKS: CodingTaskSource[] = [
  {
    id: "js-fix-average",
    track: "javascript",
    topic: "javascript",
    level: 3,
    tier: 1,
    focus: ["reduce"],
    title: "Fix the average",
    prompt: "`average(numbers)` should return the mean of the numbers, and `0` for an empty array. It works for a normal list and falls apart on the empty one. Find the reason and repair it.",
    starter: `const average = numbers =>
  numbers.reduce((total, number) => total + number, 0) / numbers.length;

// Scratch pad \u2014 change this and press Run.
console.log(average([]));
`,
    hints: ["Run the empty case and read the value it produces, then work out which operation produced it."],
    approach: [
      "Dividing by the length is fine until the length is zero.",
      "Decide what the empty case should return before you touch the arithmetic, then guard it.",
    ],
    verify: "tests",
    debug: true,
    estimatedMinutes: 10,
    tests: [
      { call: "average([1,2,3])", expected: 2 },
      { call: "average([4])", expected: 4 },
      { call: "average([2,4,6,8])", expected: 5 },
      { call: "average([])", expected: 0, label: "the empty array", edge: true },
    ],
  },
  {
    id: "js-fix-last-index",
    track: "javascript",
    topic: "javascript",
    level: 4,
    tier: 1,
    focus: ["for"],
    title: "Fix the last index",
    prompt: "`lastIndex(values, target)` should return the index of the LAST time `target` appears, or `-1` when it never does. It currently answers with the first one. Repair the search.",
    starter: `const lastIndex = (values, target) => {
  for (let index = 0; index < values.length; index++) {
    if (values[index] === target) return index;
  }
  return -1;
};

// Scratch pad \u2014 change this and press Run.
console.log(lastIndex([1,2,1], 1));
`,
    hints: ["The loop returns the moment it finds a match, so the direction it walks in decides which match wins."],
    approach: [
      "Walk the array from the end towards the start, and the first match you meet is the last one in the array.",
      "Keep returning -1 when the loop finishes without a match.",
    ],
    verify: "tests",
    debug: true,
    estimatedMinutes: 10,
    tests: [
      { call: "lastIndex([1,2,1], 1)", expected: 2 },
      { call: "lastIndex([\"a\",\"b\",\"a\",\"c\"], \"a\")", expected: 2 },
      { call: "lastIndex([1,2,3], 3)", expected: 2, label: "the match is already last" },
      { call: "lastIndex([1,2,3], 9)", expected: -1, label: "no match at all", edge: true },
      { call: "lastIndex([], 1)", expected: -1, label: "the empty array", edge: true },
    ],
  },
  {
    id: "js-fix-drop-blank",
    track: "javascript",
    topic: "javascript",
    level: 5,
    tier: 1,
    focus: ["filter", "strings"],
    title: "Fix the blank filter",
    prompt: "`dropBlank(values)` should drop every string that is empty or contains only spaces, keeping the rest in order. It only catches the truly empty ones. Repair the test it applies.",
    starter: `const dropBlank = values => values.filter(value => value !== "");

// Scratch pad \u2014 change this and press Run.
console.log(dropBlank(["a", "", "  ", "b"]));
`,
    hints: ["A string of spaces is not the empty string, even though it looks like nothing on screen."],
    approach: [
      "Trim the value before you compare it, so padding stops counting as content.",
      "Trim only for the decision \u2014 the values you keep should come back unchanged.",
    ],
    verify: "tests",
    debug: true,
    estimatedMinutes: 10,
    tests: [
      { call: "dropBlank([\"a\", \"\", \"  \", \"b\"])", expected: ["a", "b"] },
      { call: "dropBlank([\"  hello  \"])", expected: ["  hello  "], label: "padding is kept on the value" },
      { call: "dropBlank([\"\\t\", \"\\n\"])", expected: [], label: "tabs and newlines are blank too", edge: true },
      { call: "dropBlank([])", expected: [], label: "the empty array", edge: true },
    ],
  },
  {
    id: "js-fix-sorted-copy",
    track: "javascript",
    topic: "javascript",
    level: 8,
    tier: 2,
    focus: ["sort", "spread"],
    title: "Fix the sorted copy",
    prompt: "`sortedCopy(numbers)` should return a NEW array sorted from smallest to largest, leaving the argument untouched. It does neither. Repair both problems.",
    starter: `const sortedCopy = numbers => numbers.sort();

// Scratch pad \u2014 change this and press Run.
const input = [10, 2, 33];
console.log(sortedCopy(input), input);
`,
    hints: ["Two separate things are wrong here: which array is sorted, and how two numbers are compared."],
    approach: [
      "sort rewrites the array it is called on, so copy first and sort the copy.",
      "Without a comparator, sort compares values as text, which puts 10 before 2. Pass one that subtracts.",
    ],
    verify: "tests",
    debug: true,
    estimatedMinutes: 15,
    tests: [
      { call: "sortedCopy([10,2,33])", expected: [2, 10, 33], label: "numbers, not text" },
      { call: "sortedCopy([3,1,2])", expected: [1, 2, 3] },
      {
        call: "(() => { const input = [10,2,33]; sortedCopy(input); return input; })()",
        expected: [10, 2, 33],
        label: "the argument is left alone",
        edge: true,
      },
      { call: "sortedCopy([])", expected: [], label: "the empty array", edge: true },
    ],
  },
];
