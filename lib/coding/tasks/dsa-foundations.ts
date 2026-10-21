// DSA Foundations (#493): the DSA path's code exercises as coding tasks.
//
// Each task is one exercise of the dsa-foundations learning path
// (`lib/learning-paths/content/dsa/d01.ts` to `d10.ts`), on the algorithms
// track with topic `dsa` and the DSA Learn level that teaches it
// (docs/learn-sections-fde-flagship-plan.md, section 12.2). The path's binary
// search stays a reuse of `js-binary-search` and has no task here.
//
// The path graded method through harnesses appended after the learner's code.
// Here each counter is a self-contained check built by `./dsa-probes`, so the
// grader, the Run button and the content contract run them unchanged. Two
// signatures differ from the path: `createQueue(newBuffer)` takes the buffer
// factory the path's harness used to declare, and the repair task is a
// `debug` task.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.
// Solutions and hidden checks live in `../solutions/dsa-foundations.ts`.

import type { CodingTaskSource } from '../types';
import {
  ascending,
  buildReads,
  countCalls,
  countCompares,
  countReads,
  countWrites,
  descending,
  LIST_FIXTURES,
  lookupReads,
  measureQueue,
  POOL_50,
  QUERIES_40,
  RECORDS_64,
  searchVisits,
  withLinkedList,
  withListChecks,
  withTagged,
  withTree,
  withTreeChecks,
} from './dsa-probes';

const SCRATCH = '// Scratch pad. Change this and press Run.';

const LIST_NODES = 'A node is a plain object `{ value, next }`. `next` holds the node after it, and the last node\'s `next` is `null`. A list is its head node, or `null` when the list is empty.';
const TREE_NODES = 'A node is a plain object `{ value, left, right }`. `left` and `right` hold the child nodes, and an absent child is `null`. A tree is its root node, or `null` when the tree is empty.';
const COMPARE_CONTRACT = 'The caller supplies `compare(a, b)`, which returns a negative number when `a` belongs before `b`, zero when the two are interchangeable, and a positive number when `a` belongs after `b`.';
const SORT_DOMAIN = 'Every comparison between two elements goes through `compare`, and the checks count the calls. The input is an ordinary dense array of at most 128 elements. The comparator orders them consistently, returns finite Numbers and does not change elements. Keep every element reference and its multiplicity; do not clone items, change their fields, or add array properties.';

export const DSA_FOUNDATIONS_TASKS: CodingTaskSource[] = [
  /* ── Level 1-2: Big O, growth and space (d01) ─────────────────────── */
  {
    id: 'alg-dsa-sum-of-evens',
    track: 'algorithms',
    topic: 'dsa',
    level: 1,
    tier: 1,
    focus: ['for-of'],
    title: 'Sum the evens in one pass',
    prompt: "Write `sumOfEvens(values)` for an array of integers, without changing it. Return the sum of its even values: `[1, 2, 3, 4]` gives 6 and empty input gives 0. Negative even integers and zero count as even. Target: O(n) time, where n is the number of input elements.\n\nThe checks count indexed reads of the original input and allow at most n reads in total, so read each element once and keep it in a variable. This is a bounded input-access check: it does not measure work on copies or prove your program's memory use. Return a number, and 0 for an empty array.",
    starter: `const sumOfEvens = values => {

};

${SCRATCH}
console.log(sumOfEvens([1, 2, 3, 4]));
`,
    skeleton: `const sumOfEvens = values => {
  let total = /* nothing counted yet */;

  for (/* each element, once */) {
    // add it to total when it divides by two with no remainder
  }

  return total;
};`,
    hints: [
      'Separate reading a value from deciding whether to include it. Reading the same array index again spends another read from the budget.',
      'Check your condition with negative integers and zero as well as positive even numbers.',
    ],
    approach: [
      'Start a running total at zero.',
      'Walk the array once, binding each element as you go.',
      'Add the element to the total when its remainder after dividing by two is zero.',
      'Return the total; an empty array never enters the loop and gives zero.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'sumOfEvens([1, 2, 3, 4])', expected: 6 },
      { call: 'sumOfEvens([])', expected: 0, label: 'an empty array sums to zero', edge: true },
      { call: 'sumOfEvens([1, 3, 5])', expected: 0, label: 'no even numbers gives zero', edge: true },
      { call: 'sumOfEvens([-4, -3, 0, 7])', expected: -4, label: 'negatives and zero are even too', edge: true },
      { call: `${countReads('[1, 2, 3, 4, 5, 6]', 'view => sumOfEvens(view)')}.reads <= 6`, expected: true, label: 'six elements are read at most six times' },
    ],
  },
  {
    id: 'alg-dsa-halving-steps',
    track: 'algorithms',
    topic: 'dsa',
    level: 2,
    tier: 1,
    focus: ['while'],
    title: 'Halving counter',
    prompt: 'Write `halvingSteps(n)` for an integer n of 1 or more. Count how many times it can be halved, rounding down each time, before it reaches 1. `halvingSteps(1)` gives 0, `halvingSteps(8)` gives 3 and `halvingSteps(10)` gives 3: 10, 5, 2, 1. Target: O(log n) time, where n is the starting numeric value.\n\nThis is the repeated-halving shape behind binary search. Halve by dividing by two and rounding down, not by dividing exactly, and count the halvings, not the values visited: reaching 1 from 1 is zero steps.',
    starter: `const halvingSteps = n => {

};

${SCRATCH}
console.log(halvingSteps(10));
`,
    skeleton: `const halvingSteps = n => {
  let steps = /* none yet */;
  let value = n;

  while (/* the value is still above 1 */) {
    // halve it, rounding down, and count the step
  }

  return steps;
};`,
    hints: [
      'Track how many changes you make and the value after each change. Decide whether the starting value already meets the stopping rule.',
      'Try an odd value such as 7. Check that each value along the way stays a whole number.',
    ],
    approach: [
      'Start the step counter at zero and copy the input into a working value.',
      'While the working value is greater than 1, replace it with half of itself rounded down.',
      'Add one to the counter on every halving.',
      'Return the counter once the value has reached 1.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'halvingSteps(1)', expected: 0, label: 'one is already there', edge: true },
      { call: 'halvingSteps(8)', expected: 3 },
      { call: 'halvingSteps(10)', expected: 3, label: 'rounding down: 10, 5, 2, 1' },
      { call: 'halvingSteps(2)', expected: 1, label: 'the smallest halving', edge: true },
      { call: 'halvingSteps(1024)', expected: 10, label: 'a thousand elements in ten steps' },
    ],
  },
  {
    id: 'alg-dsa-max-gap',
    track: 'algorithms',
    topic: 'dsa',
    level: 2,
    tier: 2,
    focus: ['for-of'],
    title: 'A pass instead of every pair',
    prompt: 'Write `maxGap(values)` for an array of finite numbers, without changing it. Return the largest minus the smallest value; `[3, 9, 1]` gives 8. Empty or single-element input gives 0. Target: O(n) time, where n is the input length.\n\nThe checks allow at most 2n indexed reads of the original input in total on their inputs. A scan of every input pair goes over that budget. Work you do on a copy is not counted by this check.',
    starter: `const maxGap = values => {

};

${SCRATCH}
console.log(maxGap([3, 9, 1]));
`,
    skeleton: `const maxGap = values => {
  if (/* fewer than two elements */) return 0;

  let smallest = /* the first element */;
  let largest = /* the first element */;

  for (/* each element, once */) {
    // widen smallest or largest when this element falls outside them
  }

  return largest - smallest;
};`,
    hints: [
      'Think about which two values decide the widest gap. You need not store a result for each possible pair.',
      'Try an array of negative numbers only before you choose the starting values to compare against.',
    ],
    approach: [
      'Return 0 straight away when the array holds fewer than two elements.',
      'Seed a smallest and a largest with the first element.',
      'Walk the array once, lowering the smallest or raising the largest when an element falls outside the pair.',
      'Return the largest minus the smallest.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: 'maxGap([3, 9, 1])', expected: 8 },
      { call: 'maxGap([])', expected: 0, label: 'an empty array has no gap', edge: true },
      { call: 'maxGap([5])', expected: 0, label: 'one element has no gap', edge: true },
      { call: 'maxGap([-4, -1, -9])', expected: 8, label: 'negative values', edge: true },
      { call: 'maxGap([7, 7, 7])', expected: 0, label: 'all equal', edge: true },
      { call: `${countReads('[4, 8, 15, 16, 23, 42]', 'view => maxGap(view)')}.reads <= 12`, expected: true, label: 'six elements are read at most twelve times' },
    ],
  },

  /* ── Level 3-4: arrays and strings (d02) ──────────────────────────── */
  {
    id: 'alg-dsa-reverse-in-place',
    track: 'algorithms',
    topic: 'dsa',
    level: 3,
    tier: 1,
    focus: ['two-pointer'],
    title: 'Reverse in place',
    prompt: 'Write `reverseInPlace(values)` for a dense ordinary array. Reverse its entries in place and return the same array object, so `reverseInPlace(values) === values` holds. Empty and one-element arrays come back unchanged, as the same object.\n\nThe checks look at the array you were given: it must hold the reversed order, and at most n indexed changes are allowed on it. Assignments, property definitions and deletions count; length updates do not. A reversed copy returned on its own fails. Practise an ends-inward swap loop.\n\nTarget: O(n) time and O(1) extra space, where n is the input length. These checks do not measure total running time or temporary allocations.',
    starter: `const reverseInPlace = values => {

};

${SCRATCH}
console.log(reverseInPlace([1, 2, 3, 4]));
`,
    skeleton: `const reverseInPlace = values => {
  let left = /* the first index */;
  let right = /* the last index */;

  while (/* the pointers have not met or crossed */) {
    // hold one value, overwrite it with the other, put the held one back
    // then move left inward and right inward
  }

  return /* the array you were given */;
};`,
    hints: [
      'Name the two positions whose values trade places first. Which positions need no more attention after that swap?',
      'What keeps the first value from being lost when you overwrite its slot?',
      'Check whether an empty or one-element input needs any writes, and which array object the caller expects back.',
    ],
    approach: [
      'Start `left` at 0 and `right` at `values.length - 1`.',
      'While `left` is below `right`, swap `values[left]` with `values[right]` using one temporary variable.',
      'Move `left` up by one and `right` down by one after each swap.',
      'Return `values` itself, so the caller gets back the array it passed in.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    failureHints: {
      mutation: 'The checks read the array they passed in. A reversed copy leaves that array as it was; swap the entries of `values` itself and return `values`.',
    },
    tests: [
      { call: 'reverseInPlace([1, 2, 3, 4])', expected: [4, 3, 2, 1] },
      { call: 'reverseInPlace([1, 2, 3])', expected: [3, 2, 1], label: 'an odd length leaves the middle element where it is' },
      { call: 'reverseInPlace([])', expected: [], label: 'an empty array comes back empty', edge: true },
      { call: 'reverseInPlace([7])', expected: [7], label: 'a single element is its own reverse', edge: true },
      { call: '(() => { const values = [1, 2, 3]; reverseInPlace(values); return values; })()', expected: [3, 2, 1], label: 'the array the caller passed in is the one that changed' },
      { call: '(() => { const values = [1, 2, 3]; return reverseInPlace(values) === values; })()', expected: true, label: 'the returned value is the same array, not a copy' },
      { call: `${countWrites('[1, 2, 3, 4, 5, 6]', 'view => reverseInPlace(view)')}.writes <= 6`, expected: true, label: 'six elements take at most six index writes' },
    ],
  },
  {
    id: 'alg-dsa-dedupe-sorted',
    track: 'algorithms',
    topic: 'dsa',
    level: 3,
    tier: 2,
    focus: ['two-pointer', 'for'],
    title: 'Compact a sorted array',
    prompt: 'Write `removeDuplicatesSorted(sorted)` for a dense ascending array of finite Numbers. Put its distinct values into the front of that same array, in ascending order, and return how many there are. Values equal with `===` are duplicates. For `[1, 1, 2, 3, 3, 4]`, return 4 and leave `[1, 2, 3, 4]` in the first four slots. Empty input returns 0.\n\nThe slots after the returned count are yours to leave as they are; no check reads them. At most n indexed changes are allowed: assignments, property definitions and deletions count, length updates do not. Repeated `splice` calls can go over that budget, and a copy that is never written back fails. Practise read and write pointers.\n\nTarget: O(n) time and O(1) extra space, where n is the original array length. The finite checks do not establish time or space complexity for arbitrary code.',
    starter: `const removeDuplicatesSorted = sorted => {

};

${SCRATCH}
const values = [1, 1, 2, 3, 3, 3, 4];
console.log(removeDuplicatesSorted(values), values);
`,
    skeleton: `const removeDuplicatesSorted = sorted => {
  if (/* nothing to compact */) return 0;

  let write = /* the first slot is already distinct */;

  for (let read = 1; read < sorted.length; read += 1) {
    // when this element differs from the last one kept, write it and move on
  }

  return write;
};`,
    hints: [
      'Equal values in a sorted array sit next to each other in runs. Decide which one of each run belongs in the kept prefix.',
      'After a duplicate, the next position to read and the next position to write differ. Keep the two roles in separate variables.',
      'Check empty input before you assume there is a first kept value. Try one long run of equal values and a list with no repeats.',
    ],
    approach: [
      'Return 0 straight away when the array is empty.',
      'Treat the first element as kept, so the write pointer starts at 1.',
      'Walk the read pointer from index 1 to the end.',
      'When the element at the read pointer differs from the last kept value, copy it into the write slot and move the write pointer up by one.',
      'Return the write pointer, which is the number of distinct values now at the front.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: 'removeDuplicatesSorted([1, 1, 2, 3, 3, 3, 4])', expected: 4 },
      { call: 'removeDuplicatesSorted([1, 2, 3])', expected: 3, label: 'no duplicates means no change to the count' },
      { call: 'removeDuplicatesSorted([])', expected: 0, label: 'an empty array has no distinct values', edge: true },
      { call: 'removeDuplicatesSorted([5, 5, 5, 5])', expected: 1, label: 'one value repeated four times collapses to one', edge: true },
      { call: 'removeDuplicatesSorted([-3, -3, 0, 0, 7])', expected: 3, label: 'negatives and zero are ordinary values', edge: true },
      { call: '(() => { const values = [1, 1, 2, 3, 3, 3, 4]; const length = removeDuplicatesSorted(values); return values.slice(0, length); })()', expected: [1, 2, 3, 4], label: "the first four slots of the caller's array hold the distinct values" },
      { call: `${countWrites('[1, 1, 1, 2, 2, 3, 3, 3, 3, 4]', 'view => removeDuplicatesSorted(view)')}.writes <= 10`, expected: true, label: 'ten elements take at most ten index writes' },
    ],
  },
  {
    id: 'alg-dsa-palindrome',
    track: 'algorithms',
    topic: 'dsa',
    level: 4,
    tier: 2,
    focus: ['two-pointer', 'strings'],
    title: 'Palindrome, from both ends',
    prompt: "Write `isPalindrome(text)`, returning `true` or `false` for whether the string reads the same forwards and backwards. The input holds ASCII letters and digits only, so there is nothing to skip; compare case-sensitively. `Racecar` gives `false` because R and r differ. The empty string and any one-character string are palindromes.\n\nPractise two indices moving inward, and stop at the first pair that differs. Other correct ways pass these checks too; the checks do not prove that no copy was made.\n\nTarget: O(n) time and O(1) extra space, where n is the number of ASCII characters. Space is a goal, not something the checks measure.",
    starter: `const isPalindrome = text => {

};

${SCRATCH}
console.log(isPalindrome('racecar'));
`,
    skeleton: `const isPalindrome = text => {
  let left = /* the first index */;
  let right = /* the last index */;

  while (/* the pointers have not met or crossed */) {
    // if the two characters differ, the answer is already false
    // otherwise move both pointers inward
  }

  return /* nothing contradicted it */;
};`,
    hints: [
      'Which position mirrors the first character, and which mirrors the second? Indexing the string is enough for ASCII text.',
      'One pair that differs settles the result. Decide whether a later pair can change it.',
      'When the length is odd, decide whether the middle character needs a comparison of its own.',
    ],
    approach: [
      'Start `left` at 0 and `right` at `text.length - 1`.',
      'While `left` is below `right`, compare `text[left]` with `text[right]`.',
      'Return `false` straight away when they differ.',
      'Otherwise move `left` up by one and `right` down by one.',
      'Return `true` once the pointers meet or cross.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: "isPalindrome('racecar')", expected: true },
      { call: "isPalindrome('abca')", expected: false, label: 'the outer pair matches and the inner pair does not' },
      { call: "isPalindrome('abba')", expected: true, label: 'an even length has no middle character' },
      { call: "isPalindrome('')", expected: true, label: 'the empty string is a palindrome', edge: true },
      { call: "isPalindrome('x')", expected: true, label: 'a single character is a palindrome', edge: true },
      { call: "isPalindrome('Racecar')", expected: false, label: 'case-sensitive: capital R does not match lowercase r', edge: true },
      { call: "isPalindrome('12321')", expected: true, label: 'digits are characters like any other' },
    ],
  },

  /* ── Level 5: hash maps and sets (d03) ────────────────────────────── */
  {
    id: 'alg-dsa-frequency-map',
    track: 'algorithms',
    topic: 'dsa',
    level: 5,
    tier: 1,
    focus: ['map-set', 'for-of'],
    title: 'Frequency map',
    prompt: 'Write `countFrequencies(values)` for a dense array of JavaScript values. Return a new Map from each distinct value to the number of times it appears, with keys in the order each value first appears. Use the Map\'s own equality (SameValueZero): NaN matches NaN, the two signs of zero are equal, and objects and symbols keep their identity. `1` and `"1"` are separate keys. Empty input returns a new empty Map. Leave the input array as it was.\n\nTarget: O(n) time, where n is the number of input entries, assuming bounded key hashing and comparison and average constant Map operations. JavaScript promises only sublinear average Map access; the checks test counts, equality and order, not running time.',
    starter: `const countFrequencies = values => {

};

${SCRATCH}
console.log([...countFrequencies(['a', 'b', 'a']).entries()]);
`,
    skeleton: `const countFrequencies = values => {
  const counts = /* an empty Map */;

  for (/* each value */) {
    // read the count this value already has, or zero, and store one more
  }

  return counts;
};`,
    hints: [
      'A repeated value needs its earlier count, while a new value needs a first count. Avoid turning keys into strings.',
      'Updating a key a Map already holds does not move it. Think about how that keeps the order of first appearance.',
    ],
    approach: [
      'Create an empty Map to hold the counts.',
      'Walk the array once, binding each value.',
      'Read the current count for that value, treating a missing entry as zero.',
      'Store the count plus one under the same key.',
      'Return the Map; an empty input never enters the loop and returns it empty.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    failureHints: {
      'output-shape': 'The keys came out in the wrong order, or two keys merged. A plain object turns every key into a string and lists integer-like keys in ascending order; a Map keeps `1` and `"1"` apart and remembers insertion order.',
    },
    tests: [
      { call: "[...countFrequencies(['a', 'b', 'a']).entries()]", expected: [['a', 2], ['b', 1]] },
      { call: '[...countFrequencies([]).entries()]', expected: [], label: 'an empty array gives an empty Map', edge: true },
      { call: 'countFrequencies([]) instanceof Map', expected: true, label: 'the return value is a Map', edge: true },
      { call: '[...countFrequencies([10, 2, 10, 30, 2, 10]).keys()]', expected: [10, 2, 30], label: 'keys follow first appearance, not numeric order' },
      { call: "[...countFrequencies([1, '1', 1]).entries()]", expected: [[1, 2], ['1', 1]], label: "the number 1 and the string '1' are separate keys", edge: true },
      { call: "countFrequencies(['x', 'x', 'x']).get('x')", expected: 3, label: 'a value that only repeats' },
    ],
  },
  {
    id: 'alg-dsa-first-unique',
    track: 'algorithms',
    topic: 'dsa',
    level: 5,
    tier: 2,
    focus: ['map-set'],
    title: 'First unique value',
    prompt: 'Write `firstUnique(values)` for a dense array of JavaScript values. Return the earliest value that appears exactly once, or `null` when there is none, including for empty input. Compare with SameValueZero, the equality a Map uses: NaN equals NaN, the two signs of zero are equal, and objects and symbols match only themselves. A qualifying `undefined` or `null` comes back as that value; the `null` for "none" need not be told apart from a found `null`. Either sign of zero is fine. Leave the input array as it was.\n\nA counting pass followed by a second pass in input order is one way. Target: O(n) time, where n is the number of input entries, assuming bounded key costs and average constant Map operations.',
    starter: `const firstUnique = values => {

};

${SCRATCH}
console.log(firstUnique(['a', 'b', 'a', 'c']));
`,
    skeleton: `const firstUnique = values => {
  const counts = /* an empty Map */;

  for (/* each value */) {
    // count this value
  }

  for (/* each value again, in order */) {
    // return it as soon as its count is exactly 1
  }

  return /* nothing qualified */;
};`,
    hints: [
      'Seeing a value once does not tell you it stays unique. Decide what you need to remember for when it turns up later.',
      'After counting, find the earliest value that qualifies; the key order of a plain object can differ from the input order.',
      'A falsy value can be the right answer. Tell finding it apart from reaching the end with nothing found.',
    ],
    approach: [
      'Build a Map from each value to the number of times it appears.',
      'Walk the original array a second time, in order.',
      'Return the first value whose stored count is exactly 1.',
      'Return `null` if the second pass finishes without a match.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: "firstUnique(['a', 'b', 'a', 'c'])", expected: 'b' },
      { call: 'firstUnique([])', expected: null, label: 'an empty array has no unique value', edge: true },
      { call: 'firstUnique([2, 2, 3, 3])', expected: null, label: 'every value repeats', edge: true },
      { call: 'firstUnique([7, 3, 7, 3, 9])', expected: 9, label: 'the only unique value is the last one' },
      { call: "firstUnique([0, '0'])", expected: 0, label: "the number 0 and the string '0' are different values", edge: true },
      { call: 'firstUnique([4])', expected: 4, label: 'a single element is unique', edge: true },
    ],
  },
  {
    id: 'alg-dsa-set-intersection',
    track: 'algorithms',
    topic: 'dsa',
    level: 5,
    tier: 2,
    focus: ['map-set', 'for-of'],
    title: 'Intersection with a set',
    prompt: 'Write `intersection(left, right)` for two dense arrays of JavaScript values. Return a new array of the values present in both, each once, in the order they first appear in `left`. Use SameValueZero equality: NaN equals NaN, the two signs of zero are equal, and objects and symbols match only themselves. Values keep their type; use the one from `left`, though either sign of zero is fine. Leave both inputs as they were. Empty input or no overlap returns a new empty array.\n\nBuilding a Set from `right` once and scanning `left` is one way. Target: O(n + m) time, where n and m are the lengths of `left` and `right`, assuming bounded key costs and average constant Set operations. Slower correct answers pass the checks too; they do not prove complexity.',
    starter: `const intersection = (left, right) => {

};

${SCRATCH}
console.log(intersection([1, 2, 3, 4], [3, 4, 5]));
`,
    skeleton: `const intersection = (left, right) => {
  const pool = /* a Set of everything in right */;
  const taken = /* a Set of what you have already added */;
  const out = [];

  for (/* each value in left */) {
    // add it when right holds it and you have not added it yet
  }

  return out;
};`,
    hints: [
      'Membership answers whether `right` holds a value. What else do you need to remember so a shared value is not added twice?',
      'Choose which input sets the output order, and keep the result separate from both inputs.',
      'Check repeated values, mixed types and NaN against the equality rule before you pick a membership test.',
    ],
    approach: [
      'Build a Set from `right`.',
      'Create an empty Set for the values already added, and an empty output array.',
      'Walk `left` in order.',
      'Push a value when the `right` Set holds it and the added Set does not, then record it as added.',
      'Return the output array.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'intersection([1, 2, 3, 4], [3, 4, 5])', expected: [3, 4] },
      { call: 'intersection([], [1, 2])', expected: [], label: 'an empty left side gives an empty array', edge: true },
      { call: 'intersection([1, 2], [])', expected: [], label: 'an empty right side gives an empty array', edge: true },
      { call: 'intersection([1, 2, 3], [4, 5])', expected: [], label: 'nothing in common', edge: true },
      { call: 'intersection([2, 2, 3, 3], [3, 2])', expected: [2, 3], label: 'duplicates in left appear once, in first-appearance order' },
      { call: 'intersection([5, 6], [6, 6, 6])', expected: [6], label: 'duplicates in right do not duplicate the output' },
      { call: "intersection(['b', 'a'], ['a', 'b'])", expected: ['b', 'a'], label: 'the order follows left, not right' },
    ],
  },

  /* ── Level 6-7: stacks and queues (d04) ───────────────────────────── */
  {
    id: 'alg-dsa-stack',
    track: 'algorithms',
    topic: 'dsa',
    level: 6,
    tier: 2,
    focus: ['push', 'pop'],
    title: 'A stack with a stated underflow rule',
    prompt: 'Write `createStack()`, returning an object with four methods:\n\n- `push(value)` puts a value on top. Its return value is never read.\n- `pop()` removes the top value and returns it.\n- `peek()` returns the top value and leaves the stack unchanged.\n- `size()` returns how many values the stack holds.\n\nThe underflow rule: `pop()` and `peek()` on an empty stack return `null` and leave it empty, and `size()` never goes below 0. Two stacks made by two calls to `createStack()` hold their own values and never share.\n\nReturn values unchanged, including object identity, `undefined`, `false`, 0 and the empty string. `null` is a legal value to push, so a `null` from `pop()` cannot on its own mean the stack was empty: `size()` tells the two cases apart.\n\nTarget: O(1) time per operation, where an operation is one call to push, pop, peek or size.',
    starter: `const createStack = () => {

};

${SCRATCH}
const stack = createStack();
stack.push(1);
stack.push(2);
console.log(stack.pop(), stack.size());
`,
    skeleton: `const createStack = () => {
  const items = /* the values, bottom first */;

  return {
    push(value) {
      // put the value on the end that pop reads
    },
    pop() {
      // null when there is nothing to remove
    },
    peek() {
      // what pop would return, without removing it
    },
    size() {
      /* ... */
    },
  };
};`,
    hints: [
      'Compare the end each method uses. Keep the storage inside the factory, so a second stack cannot change the first.',
      'Guard both readers with the same emptiness check. An empty array hands back `undefined`, and the rule asks for `null`.',
    ],
    approach: [
      'Declare an array inside `createStack`, so every call gets its own storage.',
      'Return an object whose four methods close over that array.',
      'Append in `push`, and remove from the same end in `pop`.',
      'Return `null` from `pop` and `peek` when the array is empty.',
      'Report the array length from `size`.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    failureHints: {
      boundary: 'An empty array gives back `undefined`, not `null`, and a counter decremented past zero goes negative. `pop` and `peek` both need the same empty check.',
    },
    tests: [
      { call: "(() => { const s = createStack(); s.push('a'); s.push('b'); return [s.pop(), s.pop()]; })()", expected: ['b', 'a'], label: 'the value pushed most recently comes back first' },
      { call: '(() => { const s = createStack(); s.push(1); s.push(2); s.push(3); return [s.peek(), s.size()]; })()', expected: [3, 3], label: 'peek reports the top without removing it' },
      { call: 'createStack().pop()', expected: null, label: 'popping an empty stack returns null', edge: true },
      { call: 'createStack().peek()', expected: null, label: 'peeking an empty stack returns null', edge: true },
      { call: '(() => { const s = createStack(); s.push(1); s.pop(); s.pop(); return s.size(); })()', expected: 0, label: 'popping past empty leaves the size at zero', edge: true },
      { call: '(() => { const a = createStack(); const b = createStack(); a.push(1); a.push(2); b.push(9); return [a.size(), b.size(), b.pop()]; })()', expected: [2, 1, 9], label: 'two stacks keep their own values' },
      { call: '(() => { const s = createStack(); s.push(4); s.push(5); s.pop(); s.push(6); return [s.pop(), s.pop(), s.size()]; })()', expected: [6, 4, 0], label: 'pushes and pops interleave' },
    ],
  },
  {
    id: 'alg-dsa-balanced-brackets',
    track: 'algorithms',
    topic: 'dsa',
    level: 6,
    tier: 2,
    focus: ['push', 'strings'],
    title: 'Balanced brackets',
    prompt: 'Write `isBalanced(text)`, returning `true` when every bracket in `text` is closed by the matching kind in the right order, and `false` otherwise.\n\n`text` holds only these six characters: `(`, `)`, `[`, `]`, `{`, `}`. No other character appears, so there is nothing to skip and nothing to reject. The empty string is balanced.\n\n`([]{})` is balanced. `(]` is not, because a closer has to match the opener it meets. `([)]` is not, because the pairs overlap instead of nesting. `)(` is not, because a closer arrives with nothing open: counting the characters is not enough. `(` is not, because an opener is still waiting when the string ends.\n\nTarget: O(n) time and O(n) extra space, where n is `text.length`; each allowed character is one ASCII code unit. A stack is the recommended way; the checks test the result, not the target.',
    starter: `const isBalanced = text => {

};

${SCRATCH}
console.log(isBalanced('([]{})'));
`,
    skeleton: `const isBalanced = text => {
  const open = /* the openers still waiting, most recent last */;

  for (const character of text) {
    if (/* it opens */) {
      // remember it
    } else {
      // it closes: the most recent opener has to be its partner
    }
  }

  return /* nothing left waiting */;
};`,
    hints: [
      'When a closer arrives, work out which unmatched opener it belongs to. Try the overlapping example before you choose what to remember.',
      'Two different failures: no opener is waiting, or the waiting opener is the wrong kind.',
      'What is left to check after the last character? Compare the empty input with one that ends before every opener has closed.',
    ],
    approach: [
      'Start with an empty array holding the openers still waiting.',
      'Walk the string one character at a time.',
      'Push every opener.',
      'On a closer, remove the most recent opener and compare it with the one this closer expects; return `false` as soon as they disagree, or when nothing was waiting.',
      'After the loop, return whether the array is empty.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: "isBalanced('([]{})')", expected: true, label: 'nested pairs of all three kinds' },
      { call: "isBalanced('')", expected: true, label: 'the empty string is balanced', edge: true },
      { call: "isBalanced('(')", expected: false, label: 'an opener still waiting at the end', edge: true },
      { call: "isBalanced(')(')", expected: false, label: 'a closer arriving with nothing open', edge: true },
      { call: "isBalanced('(]')", expected: false, label: 'a closer of the wrong kind' },
      { call: "isBalanced('([)]')", expected: false, label: 'overlapping pairs do not nest' },
      { call: "isBalanced('()[]{}')", expected: true, label: 'pairs side by side, none nested' },
    ],
  },
  {
    id: 'alg-dsa-queue',
    track: 'algorithms',
    topic: 'dsa',
    level: 7,
    tier: 3,
    focus: ['push', 'objects'],
    title: 'A queue under a measured buffer budget',
    prompt: 'Write `createQueue(newBuffer)`, returning an object with three methods:\n\n- `enqueue(value)` adds a value at the back. Its return value is never read.\n- `dequeue()` removes the value at the front and returns it, or `null` when the queue is empty.\n- `size()` returns how many values are waiting.\n\n`newBuffer` is a function the caller passes in. Call it once, where you would otherwise write `[]`, and keep the queue\'s values in the buffer it returns. A buffer offers `push(value)`, `length` and index access, and nothing else, so `shift` and `splice` are not there. In the scratch pad, `createQueue(() => [])` gives you a plain array to try things with.\n\nThe checks pass you a counted buffer. It counts indexed reads, assignments, property definitions and deletions, and one `push` counts as one write. Enqueueing 32 values and then dequeuing all 32 must stay within 192 buffer operations, six per value, and must make at least 32. A head index costs three per value: read the slot the head points at, clear it, then add one to the head. Sliding the waiting values down costs over a thousand on that sequence. Return values unchanged, including object identity and `undefined` or falsy values; separate queues keep separate state.\n\nTarget: O(1) time per operation, amortized over a sequence of calls, where an operation is one call to enqueue, dequeue or size. The fixed traces do not prove complexity for arbitrary code.',
    starter: `const createQueue = newBuffer => {
  const items = newBuffer();

};

${SCRATCH}
const queue = createQueue(() => []);
queue.enqueue('a');
queue.enqueue('b');
console.log(queue.dequeue(), queue.size());
`,
    skeleton: `const createQueue = newBuffer => {
  const items = newBuffer();
  let head = /* the index of the value at the front */;

  return {
    enqueue(value) {
      // append at the back
    },
    dequeue() {
      // null when the head has caught up with the end
      // otherwise read the slot, release it, and move the head on
    },
    size() {
      /* ... */
    },
  };
};`,
    hints: [
      'Keep two positions apart: the end values are stored at, and the next value to hand back. Work out when they describe an empty queue.',
      'Read the front value before you move the head. You can clear the slot you read without moving any waiting value.',
      'Write `null` into the slot you just read before moving the head on. The slot stays in the buffer, and the value it held can be collected.',
    ],
    approach: [
      'Create the buffer with `newBuffer()` and start a `head` index at 0.',
      'Append in `enqueue` with `items.push(value)`.',
      'In `dequeue`, return `null` when `head` is not below `items.length`.',
      'Otherwise read `items[head]`, clear that slot, add one to `head`, and return the value you read.',
      'Report `items.length - head` from `size()`.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: "(() => { const q = createQueue(() => []); q.enqueue('a'); q.enqueue('b'); return [q.dequeue(), q.dequeue()]; })()", expected: ['a', 'b'], label: 'the value that waited longest comes back first' },
      { call: '(() => { const q = createQueue(() => []); return [q.size(), q.dequeue()]; })()', expected: [0, null], label: 'an empty queue reports zero and dequeues null', edge: true },
      { call: '(() => { const q = createQueue(() => []); q.enqueue(1); q.enqueue(2); q.dequeue(); q.enqueue(3); return [q.size(), q.dequeue(), q.dequeue(), q.size()]; })()', expected: [2, 2, 3, 0], label: 'enqueues and dequeues interleave' },
      { call: '(() => { const q = createQueue(() => []); q.enqueue(1); q.dequeue(); q.dequeue(); q.enqueue(2); return [q.size(), q.dequeue()]; })()', expected: [1, 2], label: 'a queue drained to empty still accepts new values', edge: true },
      { call: `${measureQueue(6)}.out`, expected: [0, 1, 2, 3, 4, 5], label: 'six values come back in the order they arrived, from a counted buffer' },
      { call: `${measureQueue(32)}.ops <= 192`, expected: true, label: '32 values cost at most 192 buffer operations' },
      { call: `${measureQueue(32)}.ops >= 32`, expected: true, label: 'at least 32 buffer operations are counted, so the values live in the buffer' },
    ],
  },

  /* ── Level 8: singly linked lists (d05) ───────────────────────────── */
  {
    id: 'alg-dsa-prepend-and-find',
    track: 'algorithms',
    topic: 'dsa',
    level: 8,
    tier: 1,
    focus: ['objects', 'while'],
    title: 'Prepend and find',
    prompt: `${LIST_NODES}\n\nWrite two functions.\n\n\`prepend(head, value)\` builds one new node holding \`value\`, points it at the head it was given, and returns it as the new head. \`prepend(null, 5)\` gives a one-node list. The nodes already in the list keep their identity: \`prepend(head, 1).next\` is the same object as \`head\`, not a copy of it.\n\n\`find(head, value)\` walks from the head and returns the first node whose \`value\` is strictly equal (\`===\`) to the one asked for, or \`null\` when no node holds it. \`find(null, 7)\` is \`null\`. It returns the node object itself, never the value or an index. Strict equality means NaN never matches, \`-0\` and \`0\` do, and \`0\` differs from \`false\`.\n\nBoth functions leave existing node values, links and fields unchanged. Inputs are finite chains of plain data nodes ending in \`null\`; values may be primitives or object and symbol references.\n\nTarget: O(n) time for find, with O(1) prepend and O(1) extra space, where n is the number of nodes.`,
    starter: `const prepend = (head, value) => {

};

const find = (head, value) => {

};

${SCRATCH}
const list = prepend(prepend(null, 2), 1);
console.log(find(list, 2));
`,
    skeleton: `const prepend = (head, value) => {
  return /* a new node holding value, pointing at head */;
};

const find = (head, value) => {
  let node = /* start at the head */;

  while (/* there is still a node in hand */) {
    // return it when its value matches
    // otherwise step to the node after it
  }

  return null;
};`,
    hints: [
      'The new node needs two fields: the value and a reference to the old head. Copying the old head would break the identity the checks look at.',
      'Walk with a variable, not a counter. Start it at `head`; while it is not `null`, compare `node.value`, and otherwise set `node = node.next`.',
      'Both functions handle an empty list on their own: `prepend` links the new node to `null`, and `find` never enters its loop, so it reaches `return null`.',
    ],
    approach: [
      'For `prepend`, build one node whose `next` is the head you were given.',
      'Return that node: it is the new head, and the old head is now the second node.',
      'For `find`, start a walking variable at the head.',
      'While the walker is not `null`, return it when its value matches with `===`, and otherwise move it to `node.next`.',
      'Return `null` once the walk falls off the end of the chain.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: withLinkedList('return valuesOf(prepend(null, 5));'), expected: [5], label: 'prepending to an empty list gives a one-node list', edge: true },
      { call: withLinkedList('return valuesOf(prepend(list(2, 3), 1));'), expected: [1, 2, 3] },
      { call: withLinkedList('const head = list(2, 3); return prepend(head, 1).next === head;'), expected: true, label: 'the old head is linked, not copied' },
      { call: withLinkedList('const head = list(1, 2, 3); return find(head, 2) === head.next;'), expected: true, label: 'find returns the node itself' },
      { call: withLinkedList('const head = list(7, 7); return find(head, 7) === head;'), expected: true, label: 'two nodes hold the value, and the first one comes back' },
      { call: withLinkedList('return find(list(4, 5, 6), 9);'), expected: null, label: 'a value that is absent gives null', edge: true },
      { call: 'find(null, 7)', expected: null, label: 'searching an empty list gives null', edge: true },
    ],
  },
  {
    id: 'alg-dsa-delete-first-match',
    track: 'algorithms',
    topic: 'dsa',
    level: 8,
    tier: 2,
    focus: ['while', 'objects'],
    title: 'Delete the first match',
    prompt: `${LIST_NODES}\n\nWrite \`deleteFirst(head, value)\`, which removes the first node whose \`value\` is strictly equal (\`===\`) to the one asked for and returns the head of the resulting list.\n\nFour cases have to work. Removing the head returns the second node, because that node is the new head. Removing a node in the middle or at the end returns the original head. A value that no node holds returns the list unchanged. \`deleteFirst(null, 1)\` returns \`null\`.\n\nOnly the first match goes: \`deleteFirst\` on 4 → 4 → 4 leaves 4 → 4. Remove the node by pointing the \`next\` of the node in front of it past it; the resulting list keeps the surviving original nodes with their original values. Do not move values or change unrelated fields, and leave the removed node as it was. Inputs are finite chains of plain data nodes ending in \`null\`; values may be primitives or object and symbol references. Strict equality means NaN never matches, while \`-0\` and \`0\` do.\n\nTarget: O(n) time and O(1) extra space, where n is the node count.`,
    starter: `const deleteFirst = (head, value) => {

};

${SCRATCH}
const list = { value: 1, next: { value: 2, next: null } };
console.log(deleteFirst(list, 1));
`,
    skeleton: `const deleteFirst = (head, value) => {
  if (/* the list is empty */) return null;
  if (/* the head itself matches */) return /* the second node */;

  let previous = head;
  while (/* there is a node after previous */) {
    if (/* that node holds the value */) {
      // unlink it by pointing previous past it
      return head;
    }
    previous = /* step forward */;
  }

  return head;
};`,
    hints: [
      'The head is the only node with nothing in front of it, so handle it first: when `head.value` matches, the new head is `head.next`.',
      'For every other node you need the one before the match, because links only point forward. Walk a `previous` variable and look at `previous.next`.',
      'Point the node in front at the node after the match. Another caller may still hold the removed node, so leave that node itself alone.',
    ],
    approach: [
      'Return `null` straight away when the head is `null`.',
      'When the head itself holds the value, return `head.next` as the new head.',
      'Otherwise walk a `previous` variable for as long as `previous.next` exists.',
      'When `previous.next` holds the value, set `previous.next = previous.next.next` and return the original head.',
      'Return the original head unchanged when the walk reaches the end without a match.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: withLinkedList('return valuesOf(deleteFirst(list(1, 2, 3), 1));'), expected: [2, 3], label: 'removing the head' },
      { call: withLinkedList('return valuesOf(deleteFirst(list(1, 2, 3), 2));'), expected: [1, 3], label: 'removing a node in the middle' },
      { call: withLinkedList('return valuesOf(deleteFirst(list(1, 2, 3), 3));'), expected: [1, 2], label: 'removing the last node' },
      { call: withLinkedList('return valuesOf(deleteFirst(list(1, 2, 3), 9));'), expected: [1, 2, 3], label: 'a value no node holds leaves the list alone', edge: true },
      { call: 'deleteFirst(null, 1)', expected: null, label: 'an empty list stays empty', edge: true },
      { call: withLinkedList('return valuesOf(deleteFirst(list(4, 4, 4), 4));'), expected: [4, 4], label: 'only the first of three equal values goes' },
      { call: withLinkedList('return valuesOf(deleteFirst(list(7), 7));'), expected: [], label: 'removing the only node leaves an empty list', edge: true },
    ],
  },
  {
    id: 'alg-dsa-reverse-list',
    track: 'algorithms',
    topic: 'dsa',
    level: 8,
    tier: 3,
    focus: ['while', 'objects'],
    title: 'Reverse the links',
    prompt: `${LIST_NODES}\n\nWrite \`reverseList(head)\`, which reverses the links and returns the new head: the node that used to be last. \`reverseList(null)\` returns \`null\`, and a one-node list comes back as that same node with its \`next\` still \`null\`. After reversing 1 → 2 → 3, the old head holds 1 and its \`next\` is \`null\`.\n\nReverse by reassigning \`next\` on the nodes you were given: the returned list must be made of those same node objects, with their values and any other fields. Values may be primitives or object and symbol references. The input is a finite chain of plain data nodes ending in \`null\`.\n\nTarget: O(n) time and O(1) extra space, where n is the node count. Aim for a fixed number of working references rather than an array or a recursion stack that grows with n. The checks look at the identity of the returned nodes, their values and the link order; a fresh list fails them even when its values look right. They do not measure temporary storage.`,
    starter: `const reverseList = head => {

};

${SCRATCH}
const list = { value: 1, next: { value: 2, next: { value: 3, next: null } } };
console.log(reverseList(list));
`,
    skeleton: `const reverseList = head => {
  let previous = /* nothing is reversed yet */;
  let current = head;

  while (/* there is still a node in hand */) {
    const rest = /* keep the forward link before overwriting it */;
    // point current back at previous
    // move previous and current one step along
  }

  return /* the node the walk finished on */;
};`,
    hints: [
      'Three references are enough: the part already reversed, the node in hand, and the rest of the list. Nothing else grows with the length.',
      'Save the rest of the list before you change the current link. Without it, the next step of the walk is lost.',
      'The loop ends when the node in hand is `null`. By then the reversed part is the whole list, and its first node is what you return.',
    ],
    approach: [
      'Start the reversed part at `null` and the node in hand at the head.',
      'While the node in hand is not `null`, save its forward link in a local variable.',
      'Point the node in hand back at the reversed part.',
      'Move the reversed part to the node in hand, and the node in hand to the saved link.',
      'Return the reversed part once the walk ends: it starts at the node that used to be last.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: withLinkedList('return valuesOf(reverseList(list(1, 2, 3)));'), expected: [3, 2, 1] },
      { call: 'reverseList(null)', expected: null, label: 'an empty list reverses to an empty list', edge: true },
      { call: withLinkedList('return valuesOf(reverseList(list(9)));'), expected: [9], label: 'one node is its own reversal', edge: true },
      { call: withLinkedList('return valuesOf(reverseList(list(1, 2)));'), expected: [2, 1], label: 'the smallest real reversal' },
      { call: withLinkedList('return reverseList(list(1, 2, 3)).next.next.next;'), expected: null, label: 'the new tail ends in null', edge: true },
      { call: withListChecks('return reusesNodes([1, 2, 3, 4], head => reverseList(head));'), expected: true, label: 'the reversed list is made of the four nodes handed in' },
      { call: withListChecks('return reusesNodes([8], head => reverseList(head));'), expected: true, label: 'a one-node list returns the node it was given' },
    ],
  },

  /* ── Level 9: recursion (d06) ─────────────────────────────────────── */
  {
    id: 'alg-dsa-recursive-list-sum',
    track: 'algorithms',
    topic: 'dsa',
    level: 9,
    tier: 2,
    focus: ['recursion', 'objects'],
    title: 'Sum a list recursively',
    prompt: `${LIST_NODES}\n\nWrite \`sumList(head)\`, returning the sum of every value in the list. \`sumList(null)\` is 0, a one-node list gives that node's value, and negative values and zeros count like any other number. Leave the list as you found it: no node changes and no node is added or removed. Lists are finite and end in \`null\`, with at most 100 nodes. Values are finite Numbers no larger than 1000000 either way. Add in the recursive order \`head.value + sumList(head.next)\`, without rounding.\n\nDo it recursively, with the empty list as the only base case. The checks swap the \`sumList\` binding for a wrapper that counts every call, including the calls the function makes on itself, and expect one call per node plus one final call that receives \`null\`: four nodes means five calls. A loop makes one call and fails that check; a second base case for the last node makes one call too few. A nested helper that does the walking is not counted.\n\nDeclare \`sumList\` with the \`function\` keyword, as the starter does. A \`const\` binding cannot be swapped, so the call count reads -1.\n\nTarget: O(n) time and O(n) extra space for the waiting calls, where n is the number of list nodes. The call count does not measure memory.`,
    starter: `function sumList(head) {

}

${SCRATCH}
console.log(sumList({ value: 1, next: { value: 2, next: null } }));
`,
    skeleton: `function sumList(head) {
  if (/* the list is empty */) return /* the sum of no values at all */;

  return /* the value in this node */ + /* the sum of the rest, from this same function */;
}`,
    hints: [
      'The empty list is the base case and its sum is 0. Every other list is one value plus a shorter list, and `head.next` is that shorter list.',
      'Assume the recursive call already returns the right sum of everything after `head`. The only decision left is what to add to it.',
      'Resist a second base case for the last node. `head.next` on the last node is `null`, which the empty-list branch already answers, and the extra branch costs a call the check counts.',
    ],
    approach: [
      'Return 0 when `head` is `null`: an empty list has nothing to add.',
      'Otherwise read `head.value` from the node in hand.',
      'Call `sumList` on `head.next`, which is the same list without its first node.',
      'Return `head.value` plus whatever that call gave back.',
      'Check the count: n nodes make n calls holding a node and one final call holding `null`.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: withLinkedList('return sumList(list(1, 2, 3));'), expected: 6 },
      { call: 'sumList(null)', expected: 0, label: 'an empty list sums to zero', edge: true },
      { call: withLinkedList('return sumList(list(7));'), expected: 7, label: 'a single node is its own sum', edge: true },
      { call: withLinkedList('return sumList(list(-4, 4, -2));'), expected: -2, label: 'negative values count', edge: true },
      { call: withLinkedList('return sumList(list(0, 0, 0));'), expected: 0, label: 'three zeros are not an empty list', edge: true },
      { call: countCalls('sumList', 'sumList(list(1, 2, 3, 4))', LIST_FIXTURES), expected: 5, label: 'four nodes take five calls' },
      { call: countCalls('sumList', 'sumList(null)'), expected: 1, label: 'an empty list is one call and no deeper', edge: true },
    ],
  },
  {
    id: 'alg-dsa-factorial',
    track: 'algorithms',
    topic: 'dsa',
    level: 9,
    tier: 1,
    focus: ['recursion'],
    title: 'Factorial with exact results',
    prompt: 'Write `factorial(n)`, returning the product of every whole number from 1 to n. `factorial(5)` is 120, `factorial(1)` is 1, and `factorial(0)` is 1, because the product of no numbers at all is 1.\n\nThe caller passes a whole number from 0 to 20 inclusive, so you do not have to validate it. That bound is about the result, not the method: 18! is 6402373705728000, the last factorial below `Number.MAX_SAFE_INTEGER` (9007199254740991). 19! and 20! are past that mark and still come out exactly, and 23! comes back wrong, so every expected result here is exactly representable. Return a `Number`, not a string or a BigInt.\n\nRecursion or a loop, whichever you prefer. The loop from 2 through n makes n - 1 multiplications for n of 2 or more; the recursive form with a base case at 0 makes n. Both grow linearly with n. Only the number it returns grows factorially, and telling the two apart is the point of this task.\n\nTarget: O(n) time, where n is the numeric input and one multiplication counts as one step.',
    starter: `function factorial(n) {

}

${SCRATCH}
console.log(factorial(5));
`,
    skeleton: `function factorial(n) {
  let product = /* the product of no numbers yet */;

  for (/* every whole number from 2 up to n */) {
    // multiply the running product by it
  }

  return product;
}`,
    hints: [
      'What value should a product have before any factor is in it? It must leave the next factor unchanged, and it must already answer 0 and 1.',
      'Recursively it is `n * factorial(n - 1)` with `n === 0` returning 1. That makes n + 1 calls and opens n + 1 frames, which is fine at n = 20.',
      'Count the operations in the form you chose. A loop from 2 makes n - 1 multiplications for n >= 2; a recursion down to a base case at 0 makes n. Both grow linearly.',
    ],
    approach: [
      'Start a product at 1, which is already the answer for 0 and for 1.',
      'Walk the whole numbers from 2 up to and including n.',
      'Multiply the running product by each of them.',
      'Return the product once the walk ends.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'factorial(0)', expected: 1, label: 'zero factorial is one', edge: true },
      { call: 'factorial(1)', expected: 1, label: 'one is the smallest ordinary case', edge: true },
      { call: 'factorial(5)', expected: 120 },
      { call: 'factorial(10)', expected: 3628800 },
      { call: 'factorial(18)', expected: 6402373705728000, label: 'the last factorial below Number.MAX_SAFE_INTEGER' },
      { call: 'factorial(20)', expected: 2432902008176640000, label: 'the top of the stated range', edge: true },
    ],
  },
  {
    id: 'alg-dsa-iterative-countdown',
    track: 'algorithms',
    topic: 'dsa',
    level: 9,
    tier: 2,
    focus: ['while', 'push'],
    title: 'Countdown without a stack',
    prompt: 'Write `countdownSteps(n)`, returning the array `[n, n - 1, ..., 1, 0]`. `countdownSteps(3)` gives `[3, 2, 1, 0]` and `countdownSteps(0)` gives `[0]`, so the array always holds n + 1 numbers. Return a fresh array on every call.\n\nBuild it with a loop, in a constant number of stack frames. n runs from 0 to 10000, a whole number you do not have to validate. Ordinary recursion can use a frame per step and run out of stack; the depth at which it fails depends on the engine, and there is no safe cutoff to rely on.\n\nThe checks swap the `countdownSteps` binding for a wrapper that counts every call, and expect exactly one call for one invocation. A loop makes one; recursion through `countdownSteps` makes more. The count does not see helpers with other names, so it is evidence about these calls, not proof that any code uses constant stack. Declare `countdownSteps` with the `function` keyword, as the starter does: a `const` binding cannot be swapped, so the count reads -1.\n\nTarget: O(n) time, where n is the starting number. The result takes O(n) space, while the loop itself needs constant extra stack.',
    starter: `function countdownSteps(n) {

}

${SCRATCH}
console.log(countdownSteps(3));
`,
    skeleton: `function countdownSteps(n) {
  const out = /* an empty array to fill */;
  let counter = n;

  while (/* the counter has not gone below 0 */) {
    // append the counter to the array, then take one off it
  }

  return out;
}`,
    hints: [
      'Count down in the loop itself: start at n, stop once the counter goes below 0, and subtract one each time. Appending in that order needs no reversal afterwards.',
      'The loop condition is `>= 0`, not `> 0`. Stopping at 1 leaves out the final 0 and makes the length n instead of n + 1.',
      'No recursive call is needed: one counter and one result array. The result takes O(n) space even though the loop uses constant extra stack.',
    ],
    approach: [
      'Create an empty array to collect the numbers.',
      'Start a counter at n.',
      'While the counter is 0 or more, append it and subtract one.',
      'Return the array, which now holds n + 1 numbers ending in 0.',
      'Check the shape: `countdownSteps(0)` returns `[0]`, not an empty array.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'countdownSteps(3)', expected: [3, 2, 1, 0] },
      { call: 'countdownSteps(0)', expected: [0], label: 'zero still produces one entry', edge: true },
      { call: 'countdownSteps(1)', expected: [1, 0], label: 'the smallest real countdown', edge: true },
      { call: '(() => { const out = countdownSteps(10000); return [out.length, out[0], out[5000], out[10000]]; })()', expected: [10001, 10000, 5000, 0], label: 'ten thousand steps, checked at both ends and in the middle' },
      { call: '(() => { const out = countdownSteps(200); for (let i = 1; i < out.length; i += 1) if (out[i] !== out[i - 1] - 1) return false; return out.length === 201; })()', expected: true, label: 'every entry is one less than the entry before it' },
      { call: countCalls('countdownSteps', 'countdownSteps(5)'), expected: 1, label: 'the whole array comes from a single call' },
      { call: countCalls('countdownSteps', 'countdownSteps(0)'), expected: 1, label: 'n = 0 is one call as well', edge: true },
    ],
  },

  /* ── Level 10: linear and binary search (d07) ─────────────────────── */
  {
    id: 'alg-dsa-linear-search',
    track: 'algorithms',
    topic: 'dsa',
    level: 10,
    tier: 1,
    focus: ['for'],
    title: 'Linear search',
    prompt: 'Write `linearSearch(values, target)`, returning the index of the first element strictly equal to `target`, or -1 when nothing matches. The input is an ordinary dense array of at most 10000 JavaScript values, in any order. Match objects by reference, do not convert values, and do not change the array or its elements. An actual `undefined` entry is allowed. `linearSearch([4, 9, 1, 9], 9)` gives 1, and an empty array gives -1. Strict equality means `0` differs from `false`, NaN never matches, and both signs of zero match.\n\nThe checks count how many times you read an element by index. Use one left-to-right walk and stop at the first match. They allow at most n indexed reads for n elements, one read for a match at index 0, and a matching budget for other early matches. The count is a total; it does not prove that any code visits each position once.\n\nTarget: O(n) time in the worst case and O(1) extra space, where n is the input length.',
    starter: `const linearSearch = (values, target) => {

};

${SCRATCH}
console.log(linearSearch([4, 9, 1, 9], 9));
`,
    skeleton: `const linearSearch = (values, target) => {
  for (/* every index, starting at the first */) {
    // return this index when the element strictly equals the target
  }

  return /* the walk finished without a match */;
};`,
    hints: [
      'A plain `for` loop over the indices gives you the element and the index you have to return. `for...of` hands you the value alone, so you would track the position yourself.',
      'Return from inside the loop the moment an element matches. The `return -1` belongs after the loop, where it means the walk found nothing.',
    ],
    approach: [
      'Walk the indices from 0 up to the last one.',
      'Read the element at the current index and compare it with the target using strict equality.',
      'Return that index straight away on a match.',
      'Return -1 after the loop, which is also what an empty array gives, because the loop never runs.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'linearSearch([4, 9, 1, 9], 9)', expected: 1, label: 'duplicates give the first index' },
      { call: 'linearSearch([], 3)', expected: -1, label: 'an empty array has nothing to find', edge: true },
      { call: 'linearSearch([2, 4, 6], 5)', expected: -1, label: 'a value that is not there', edge: true },
      { call: "linearSearch(['fin', 'reef', 'kelp'], 'kelp')", expected: 2, label: 'strings compare the same way', edge: true },
      { call: 'linearSearch([7], 7)', expected: 0, label: 'a single element', edge: true },
      { call: `${countReads('[5, 3, 8, 1, 9, 2]', 'view => linearSearch(view, 4)')}.reads <= 6`, expected: true, label: 'a missing target reads six elements at most once each' },
      { call: `${countReads('[5, 3, 8, 1, 9, 2]', 'view => linearSearch(view, 5)')}.reads <= 1`, expected: true, label: 'a match at index 0 stops after one read' },
    ],
  },
  {
    id: 'alg-dsa-first-occurrence',
    track: 'algorithms',
    topic: 'dsa',
    level: 10,
    tier: 3,
    focus: ['while', 'two-pointer'],
    title: 'First occurrence in a run',
    prompt: 'Write `firstOccurrence(sorted, target)`, returning the index of the first element equal to `target` in a dense, nondecreasing array of finite Numbers that may hold duplicates, or -1 when the target is absent. `firstOccurrence([1, 2, 2, 2, 3], 2)` gives 1, because index 1 is where the run of twos starts. An empty array gives -1. The target is a finite Number, fractions included. The array has at most 10000 elements and may be frozen; leave it as it is.\n\nUse the lower-bound form of binary search. The checks count indexed reads: on a sorted array of 64 elements you may read at most 20. A linear scan reads up to 64, and finding any match first and then walking left along the run reads up to 32 more than the search itself. Both go over a budget. Passing these finite checks does not prove logarithmic behaviour on every input.\n\nTarget: O(log n) time and O(1) extra space, where n is the array length.',
    starter: `const firstOccurrence = (sorted, target) => {

};

${SCRATCH}
console.log(firstOccurrence([1, 2, 2, 2, 3], 2));
`,
    skeleton: `const firstOccurrence = (sorted, target) => {
  let low = /* the first index */;
  let high = /* one past the last index */;

  while (/* the interval still holds something */) {
    const middle = /* halfway between low and high, rounded down */;
    // below the target: move low past the middle; otherwise pull high down to the middle
  }

  return /* low, when it is inside the array and holds the target */;
};`,
    hints: [
      'Use a half-open interval: `low` at 0, `high` at `sorted.length`, and loop while `low` is below `high`. When the loop ends, `low` is the answer to check.',
      'Do not return from inside the loop on a match. A match means the answer is at the middle or to its left, so pull `high` down to the middle and keep halving.',
      'After the loop, `low` is the first index whose element is not below the target. Check that it is inside the array and that the element equals the target before you return it.',
    ],
    approach: [
      'Set `low` to 0 and `high` to the length of the array, so the live interval runs from `low` up to but not including `high`.',
      'While `low` is below `high`, take the middle index, rounding down.',
      'Move `low` to `middle + 1` when the middle element is below the target; otherwise pull `high` down to `middle`, which keeps a matching middle inside the interval.',
      'Stop when the interval is empty. `low` now points at the first element that is not below the target.',
      'Return `low` when it is inside the array and holds the target, and -1 otherwise.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: 'firstOccurrence([1, 2, 2, 2, 3], 2)', expected: 1, label: 'the run of twos starts at index 1' },
      { call: 'firstOccurrence([1, 2, 3], 4)', expected: -1, label: 'a value that is not there', edge: true },
      { call: 'firstOccurrence([], 5)', expected: -1, label: 'an empty array has nothing to find', edge: true },
      { call: 'firstOccurrence([7, 7, 7], 7)', expected: 0, label: 'every element matches, so the run starts at 0', edge: true },
      { call: 'firstOccurrence([1, 2, 3, 4], 4)', expected: 3, label: 'a match at the last index', edge: true },
      { call: `${countReads('Array.from({ length: 64 }, (_, i) => Math.floor(i / 8) * 10)', 'view => firstOccurrence(view, 30)')}.result`, expected: 24, label: 'sixty-four elements in eight runs: the thirties start at index 24' },
      { call: `${countReads('Array.from({ length: 64 }, (_, i) => Math.floor(i / 8) * 10)', 'view => firstOccurrence(view, 30)')}.reads <= 20`, expected: true, label: 'sixty-four elements are read at most twenty times' },
    ],
  },

  /* ── Level 11: basic sorting (d08) ────────────────────────────────── */
  {
    id: 'alg-dsa-selection-sort',
    track: 'algorithms',
    topic: 'dsa',
    level: 11,
    tier: 2,
    focus: ['nested-loops', 'for'],
    title: 'Selection sort, counted',
    prompt: `Write \`selectionSort(values, compare)\`. ${COMPARE_CONTRACT} Sort \`values\` in place in the order \`compare\` describes, and return the same array object you were handed.\n\n${SORT_DOMAIN} The array is mutable.\n\nSelection sort on eight elements makes exactly 28 comparisons, 8 × 7 / 2, whatever order the elements arrived in, because no comparator result can shorten a pass. Use that method: a different count fails the check even when the result is sorted, and a built-in sort does not make 28. An empty array and a single-element array come back unchanged and cost zero comparisons. Duplicates and negative numbers are ordinary input.\n\nTarget: O(n²) time and O(1) extra space, where n is \`values.length\` and one comparator call or one reference move counts as one step. These are finite checks, not a proof of the algorithm or its complexity.`,
    starter: `const selectionSort = (values, compare) => {

};

${SCRATCH}
console.log(selectionSort([5, 2, 9, 1], (a, b) => a - b));
`,
    skeleton: `const selectionSort = (values, compare) => {
  for (let start = 0; /* every position except the last */; start += 1) {
    let smallest = /* assume the element already sitting at start */;

    for (let index = start + 1; index < values.length; index += 1) {
      // ask compare whether values[index] belongs before values[smallest]
    }

    // swap the winner into position start, unless it is already there
  }

  return values;
};`,
    hints: [
      'Two loops. The outer one walks the position you are filling; the inner one scans everything to its right for the element that belongs there.',
      'Track the index of the smallest element you have seen, not its value. `compare(values[index], values[smallest]) < 0` means you found a new smallest.',
      'Skipping the swap when the two indices match saves a write, not a comparison, so the count stays at 28 either way.',
    ],
    approach: [
      'Walk a start position from 0 up to the second-to-last index; the last position is right once everything before it is.',
      'Assume the element already at `start` is the smallest of what remains.',
      'Scan every later index and call `compare` against the current smallest, keeping the new index whenever the comparator returns a negative number.',
      'Swap the smallest element into `start`.',
      'Return the same array you were handed, now sorted.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'selectionSort([5, 2, 9, 1], (a, b) => a - b)', expected: [1, 2, 5, 9] },
      { call: 'selectionSort([], (a, b) => a - b)', expected: [], label: 'an empty array sorts to itself', edge: true },
      { call: 'selectionSort([7], (a, b) => a - b)', expected: [7], label: 'one element needs no comparison', edge: true },
      { call: 'selectionSort([4, -2, 0, -9, 3], (a, b) => a - b)', expected: [-9, -2, 0, 3, 4], label: 'negative values and zero', edge: true },
      { call: 'selectionSort([2, 2, 1, 2], (a, b) => a - b)', expected: [1, 2, 2, 2], label: 'duplicates', edge: true },
      { call: '(() => { const input = [3, 1, 2]; return selectionSort(input, (a, b) => a - b) === input; })()', expected: true, label: 'the array you were handed is the array you return' },
      { call: `${countCompares('[8, 3, 5, 1, 7, 2, 6, 4]', '(values, compare) => selectionSort(values, compare)')}.compares`, expected: 28, label: 'eight elements cost exactly twenty-eight comparisons' },
    ],
  },
  {
    id: 'alg-dsa-insertion-sort',
    track: 'algorithms',
    topic: 'dsa',
    level: 11,
    tier: 2,
    focus: ['nested-loops', 'while'],
    title: 'Insertion sort, counted',
    prompt: `Write \`insertionSort(values, compare)\`. ${COMPARE_CONTRACT} Sort \`values\` in place in the order \`compare\` describes, and return the same array object you were handed.\n\n${SORT_DOMAIN} The array is mutable.\n\nTwo counts check the insertion method: on an already-sorted array of eight it must make exactly 7 comparisons (n - 1, one per pass), and on a reversed array of eight exactly 28. Getting 7 on both means an early exit that never sorted; getting 28 on both means a pass kept comparing after its element had landed. Stop each pass at the first element the comparator does not report as greater, and check the index is still in range before you compare.\n\nEqual elements must keep the order they arrived in: the sort is stable. An empty array and a single-element array come back unchanged and cost zero comparisons. Duplicates and negative numbers are ordinary input.\n\nTarget: O(n²) time in the worst case and O(1) extra space, where n is \`values.length\` and one comparator call or one reference move counts as one step. Already sorted input takes linear time.`,
    starter: `const insertionSort = (values, compare) => {

};

${SCRATCH}
console.log(insertionSort([5, 2, 9, 1], (a, b) => a - b));
`,
    skeleton: `const insertionSort = (values, compare) => {
  for (let i = 1; i < values.length; i += 1) {
    const current = values[i];
    let j = i - 1;

    while (/* j is still a real index AND values[j] belongs after current */) {
      // shift values[j] one place right, then step j left
    }

    // drop current into the gap the shifting opened
  }

  return values;
};`,
    hints: [
      'Positions 0 to i - 1 are already sorted when pass i starts. Lift `values[i]` into a variable first, so the shifting has somewhere to write.',
      'Order the two halves of the while condition carefully: `j >= 0 && compare(values[j], current) > 0`. Testing the index first keeps the comparator from being asked about `values[-1]`, which would add a comparison the count does not allow.',
      'A strict `> 0` makes the sort stable. It stops at the first element that is not greater than `current`, so an equal element is never walked past.',
    ],
    approach: [
      'Walk `i` from 1 to the end; everything before `i` is already sorted.',
      'Save `values[i]` in `current`, because the shifting is about to overwrite that slot.',
      'While `j` is still a real index and `compare(values[j], current)` is positive, copy `values[j]` one place right and step `j` left.',
      'Write `current` into `values[j + 1]`, the gap the shifting left behind.',
      'Return the same array you were handed, now sorted.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: 'insertionSort([5, 2, 9, 1], (a, b) => a - b)', expected: [1, 2, 5, 9] },
      { call: 'insertionSort([], (a, b) => a - b)', expected: [], label: 'an empty array sorts to itself', edge: true },
      { call: 'insertionSort([7], (a, b) => a - b)', expected: [7], label: 'one element needs no comparison', edge: true },
      { call: 'insertionSort([4, -2, 0, -9, 3], (a, b) => a - b)', expected: [-9, -2, 0, 3, 4], label: 'negative values and zero', edge: true },
      { call: 'insertionSort([2, 2, 1, 2], (a, b) => a - b)', expected: [1, 2, 2, 2], label: 'duplicates', edge: true },
      { call: `${countCompares(ascending(8), '(values, compare) => insertionSort(values, compare)')}.compares`, expected: 7, label: 'eight sorted elements cost seven comparisons' },
      { call: `${countCompares(descending(8), '(values, compare) => insertionSort(values, compare)')}.compares`, expected: 28, label: 'eight reversed elements cost twenty-eight' },
    ],
  },
  {
    id: 'alg-dsa-merge-sort',
    track: 'algorithms',
    topic: 'dsa',
    level: 11,
    tier: 3,
    focus: ['recursion', 'two-pointer'],
    title: 'Merge sort, stable and counted',
    prompt: `Write \`mergeSort(values, compare)\`. ${COMPARE_CONTRACT} Return a fresh array holding the same elements in the order \`compare\` describes. The array you were handed must still hold its original elements in their original order when you return; it may be frozen.\n\n${SORT_DOMAIN}\n\nSplit in half, sort each half by recursion, and merge. Splitting eight elements down to singles and merging back costs between 12 and 24 comparisons, and exactly 12 on an array that is already sorted, because every merge there runs out of its left run and appends the rest of the right run without comparing. Once one run is empty, append the rest of the other without comparing.\n\nThe sort must be stable: when the comparator reports a tie, the element that came first in the input comes first in the output, so take from the left run on a tie. The checks sort records with repeated keys and read their tags back. An empty array and a single-element array come back as fresh arrays with the same contents. Duplicates and negative numbers are ordinary input.\n\nTarget: O(n log n) time and O(n) extra space, where n is \`values.length\` and one comparator call or one reference move counts as one step. These are finite checks, not a proof of the algorithm or its complexity.`,
    starter: `const mergeSort = (values, compare) => {

};

${SCRATCH}
console.log(mergeSort([5, 2, 9, 1], (a, b) => a - b));
`,
    skeleton: `const merge = (left, right, compare) => {
  const out = [];
  let i = 0;
  let j = 0;

  while (/* both runs still have elements */) {
    // one call to compare decides which front moves across
  }

  // append whatever is left of each run, without comparing

  return out;
};

const mergeSort = (values, compare) => {
  if (/* fewer than two elements */) return /* a copy, not the input */;

  const middle = Math.floor(values.length / 2);
  // sort each half by calling mergeSort on it, then merge the two results
};`,
    hints: [
      'An array of 0 or 1 elements is already sorted, so return `values.slice()` and stop. Anything longer splits at the middle with two more `slice` calls.',
      'The merge walks two sorted arrays with one index each. Call `compare(left[i], right[j])` once per step and push the winner; a result of 0 or less means the left element goes first, which keeps the sort stable.',
      'When one run is empty, append the rest of the other without comparing. Those elements are already in order, and the free appends are why a sorted input costs only 12 comparisons.',
    ],
    approach: [
      'Return a copy when the array holds fewer than two elements; returning the input itself fails the fresh-array rule.',
      'Split at the middle index into a left half and a right half.',
      'Call `mergeSort` on each half, which hands you back two sorted arrays.',
      'Merge them: while both still have elements, compare the two fronts once and move the smaller across, preferring the left one on a tie.',
      'Append whatever remains of the run that did not empty, and return the merged array.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    tests: [
      { call: 'mergeSort([5, 2, 9, 1], (a, b) => a - b)', expected: [1, 2, 5, 9] },
      { call: 'mergeSort([], (a, b) => a - b)', expected: [], label: 'an empty array sorts to a fresh empty array', edge: true },
      { call: 'mergeSort([7], (a, b) => a - b)', expected: [7], label: 'one element needs no comparison', edge: true },
      { call: 'mergeSort([4, -2, 0, -9, 3, -2, 4], (a, b) => a - b)', expected: [-9, -2, -2, 0, 3, 4, 4], label: 'negative values, duplicates and an odd length', edge: true },
      { call: '(() => { const input = [3, 1, 2]; const out = mergeSort(input, (a, b) => a - b); return [out !== input, input]; })()', expected: [true, [3, 1, 2]], label: 'a fresh array comes back and the input is left as it was' },
      { call: `(() => { const mixed = ${countCompares('[8, 3, 5, 1, 7, 2, 6, 4]', '(values, compare) => mergeSort(values, compare)')}.compares; const sorted = ${countCompares(ascending(8), '(values, compare) => mergeSort(values, compare)')}.compares; return [mixed >= 12 && mixed <= 24, sorted]; })()`, expected: [true, 12], label: 'twelve to twenty-four comparisons on eight elements, and exactly twelve when they arrive sorted' },
      { call: withTagged('return tagsOf(mergeSort(tagged(), byKey));'), expected: 'bdface', label: 'records with equal keys keep the order they arrived in' },
    ],
  },

  /* ── Level 12-13: trees and binary search trees (d09) ─────────────── */
  {
    id: 'alg-dsa-tree-size-height',
    track: 'algorithms',
    topic: 'dsa',
    level: 12,
    tier: 2,
    focus: ['recursion'],
    title: 'Height and size',
    prompt: `${TREE_NODES}\n\nWrite two functions.\n\n\`treeSize(root)\` returns how many nodes the tree holds. \`treeSize(null)\` is 0.\n\n\`treeHeight(root)\` returns the number of edges on the longest path from the root down to a leaf. A single node has height 0, because there is no edge below it. An empty tree has height -1, which is what makes a leaf come out at \`1 + Math.max(-1, -1)\`. Height counts edges, not nodes.\n\nA tree can also be a chain: a root whose only child has one child, and so on. A chain of five nodes has size 5 and height 4. The taller of the two subtrees decides the height.\n\nInputs are finite binary trees of at most 128 nodes, one parent per node below the root, with ordinary data fields; values are finite Numbers. Leave every node, link and field as it was; the tree may be frozen.\n\nTarget: O(n) time per function, where n is the number of nodes. The recursive way uses extra stack in proportion to the height.`,
    starter: `const treeSize = root => {

};

const treeHeight = root => {

};

${SCRATCH}
const tree = { value: 4, left: { value: 2, left: null, right: null }, right: null };
console.log(treeSize(tree), treeHeight(tree));
`,
    skeleton: `const treeSize = root => {
  if (/* the tree is empty */) return 0;
  return /* this node, plus both subtrees */;
};

const treeHeight = root => {
  if (/* the tree is empty */) return -1;

  const left = /* the height of the left subtree */;
  const right = /* the height of the right subtree */;

  return /* one edge more than the taller of the two */;
};`,
    hints: [
      'Both functions have the same shape: answer for `null` outright, then combine the answers coming back from `left` and `right`. The recursion does the walking; you write the combination.',
      'Height is `1 + Math.max(leftHeight, rightHeight)`. With the empty tree at -1, a leaf comes out at `1 + Math.max(-1, -1)`, which is 0, with no special case.',
      'An absent child is `null`, which is the same thing as an empty tree. That is why one base case covers both.',
    ],
    approach: [
      'Return 0 from `treeSize` when the root is `null`; there is nothing to count.',
      'Otherwise return 1 for this node plus the size of the left subtree plus the size of the right subtree.',
      'Return -1 from `treeHeight` when the root is `null`, so that a leaf lands on 0.',
      'Otherwise take the height of each subtree and return one more than the larger of the two.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: withTree('const t = tree([4, 2, 7, 1, 3, null, 9]); return [treeSize(t), treeHeight(t)];'), expected: [6, 2] },
      { call: 'treeSize(null)', expected: 0, label: 'an empty tree holds no nodes', edge: true },
      { call: 'treeHeight(null)', expected: -1, label: 'an empty tree has height -1', edge: true },
      { call: withTree('const t = leaf(7); return [treeSize(t), treeHeight(t)];'), expected: [1, 0], label: 'a single node has height 0', edge: true },
      { call: withTree("const t = chain([1, 2, 3, 4, 5], 'right'); return [treeSize(t), treeHeight(t)];"), expected: [5, 4], label: 'a five-node chain has height 4', edge: true },
      { call: withTree("const t = chain([9, 8, 7], 'left'); return [treeSize(t), treeHeight(t)];"), expected: [3, 2], label: 'a chain leaning the other way', edge: true },
      { call: withTree('const t = tree([5, 3, 8, null, 4]); return [treeSize(t), treeHeight(t)];'), expected: [4, 2], label: 'the taller subtree decides the height' },
    ],
  },
  {
    id: 'alg-dsa-tree-traversals',
    track: 'algorithms',
    topic: 'dsa',
    level: 12,
    tier: 3,
    focus: ['recursion', 'push'],
    title: 'Four traversals',
    prompt: `${TREE_NODES}\n\nWrite four functions, each returning an array of values in the order it visits them.\n\n\`inorder(root)\`: the whole left subtree, then the node, then the whole right subtree.\n\`preorder(root)\`: the node, then the left subtree, then the right subtree.\n\`postorder(root)\`: the left subtree, then the right subtree, then the node.\n\`levelOrder(root)\`: every node at depth 0, then every node at depth 1, and so on, left to right inside each level.\n\nAll four return \`[]\` for an empty tree and a one-element array for a single node. Record the values, not the nodes. The three depth-first walks fall out of recursion; level order does not. For level order, use a queue: take the node at the front, record it, and put its children on the back.\n\nInputs are finite binary trees of at most 128 nodes, one parent per node below the root, with ordinary data fields; values are finite Numbers. Leave every node, link and field as it was; the tree may be frozen. Every call returns its own array, and does not change arrays returned earlier.\n\nTarget: O(n) time per traversal, where n is the number of nodes. Every result takes O(n) space; the recursive walks use extra stack in proportion to the height, and a head-index queue holds up to n references.`,
    starter: `const inorder = root => {

};

const preorder = root => {

};

const postorder = root => {

};

const levelOrder = root => {

};

${SCRATCH}
const tree = {
  value: 4,
  left: { value: 2, left: null, right: null },
  right: { value: 7, left: null, right: null },
};
console.log(inorder(tree), levelOrder(tree));
`,
    skeleton: `const inorder = root => {
  const out = [];

  const walk = node => {
    if (node === null) return;
    // left subtree, then this node's value, then the right subtree
  };

  walk(root);
  return out;
};

// preorder and postorder are the same function with the push moved.

const levelOrder = root => {
  if (root === null) return [];

  const out = [];
  const queue = [root];
  let head = 0;

  while (/* the queue still has a node waiting */) {
    // take queue[head], step head forward, record the value
    // push whichever children are not null
  }

  return out;
};`,
    hints: [
      'The three depth-first walks are one function with the `push` in a different place. Write `preorder`, then move that line between or after the two recursive calls.',
      'A nested `walk` function that closes over one `out` array keeps the signature clean and makes a single array per call.',
      'For `levelOrder`, seed the queue with the root and keep a `head` index. While `head` is below `queue.length`, read `queue[head]`, step `head` forward, record the value, and push the children that are not `null`.',
    ],
    approach: [
      'Return `[]` straight away when the root is `null`, in all four functions.',
      'Write `preorder` first: record the node, then recurse into `left`, then into `right`.',
      'Get `inorder` and `postorder` by moving the recording line between the two recursive calls, then after them.',
      'For `levelOrder`, hold a queue of nodes still to visit, seeded with the root.',
      'Take a node off the front, record its value, push its children that are not `null` on the back, and stop when the queue runs out.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    tests: [
      { call: withTree('return inorder(tree([4, 2, 7, 1, 3, null, 9]));'), expected: [1, 2, 3, 4, 7, 9], label: 'inorder on the example tree' },
      { call: withTree('return preorder(tree([4, 2, 7, 1, 3, null, 9]));'), expected: [4, 2, 1, 3, 7, 9], label: 'preorder starts at the root' },
      { call: withTree('return postorder(tree([4, 2, 7, 1, 3, null, 9]));'), expected: [1, 3, 2, 9, 7, 4], label: 'postorder ends at the root' },
      { call: withTree('return levelOrder(tree([4, 2, 7, 1, 3, null, 9]));'), expected: [4, 2, 7, 1, 3, 9], label: 'level order goes across before it goes down' },
      { call: '[inorder(null), preorder(null), postorder(null), levelOrder(null)]', expected: [[], [], [], []], label: 'an empty tree gives an empty array from all four', edge: true },
      { call: withTree('const t = leaf(7); return [inorder(t), preorder(t), postorder(t), levelOrder(t)];'), expected: [[7], [7], [7], [7]], label: 'a single node comes out the same way in every order', edge: true },
      { call: withTree("const t = chain([1, 2, 3, 4], 'right'); return [postorder(t), levelOrder(t)];"), expected: [[4, 3, 2, 1], [1, 2, 3, 4]], label: 'a right-leaning chain', edge: true },
    ],
  },
  {
    id: 'alg-dsa-bst-search-insert',
    track: 'algorithms',
    topic: 'dsa',
    level: 13,
    tier: 3,
    focus: ['while', 'recursion'],
    title: 'Search and insert in a BST',
    prompt: `${TREE_NODES} In a binary search tree, every value in a node's left subtree is smaller than that node's value, and every value in its right subtree is not smaller.\n\n\`bstInsert(root, value)\` puts \`value\` where that rule demands and returns the root of the tree: the root you were handed, or the new node when the tree was empty. A value equal to the node you are standing at goes into the right subtree, never the left. Walk down from the root and hang a new leaf where the walk stops; do not rebuild the tree.\n\n\`bstSearch(root, value)\` returns the node object holding \`value\`, not the value itself, or \`null\` when no node holds it. It has to follow the rule: compare, go down into one subtree, and forget the other. The checks rebuild a balanced 15-node tree out of counted nodes and record how many of them your search touches. The budget is 4, the height plus one; reading every node goes over it even when the answer is right.\n\nInputs are finite valid binary search trees with ordinary mutable fields and at most 128 nodes after inserting. Values and queries are finite Numbers, fractions included. Keep existing node identities, values and fields: insert attaches exactly one new leaf at one link that was \`null\`, and search changes nothing and returns the first equal node it meets.\n\nTarget: O(n) time in the worst case for a tree with no balancing, where n is its node count; more precisely O(h + 1) for a tree of height h. The loop uses O(1) extra space apart from the new node.`,
    starter: `const bstInsert = (root, value) => {

};

const bstSearch = (root, value) => {

};

${SCRATCH}
let tree = null;
for (const value of [8, 3, 10, 1, 6]) tree = bstInsert(tree, value);
console.log(bstSearch(tree, 6));
`,
    skeleton: `const bstInsert = (root, value) => {
  if (/* the tree is empty */) return { value, left: null, right: null };

  let node = root;
  while (true) {
    if (/* the value belongs on the left */) {
      if (node.left === null) {
        // hang the new node here and return the root
      }
      node = node.left;
    } else {
      // equal values land on this side too
      if (node.right === null) {
        // hang the new node here and return the root
      }
      node = node.right;
    }
  }
};

const bstSearch = (root, value) => {
  let node = root;

  while (/* there is still a node to look at */) {
    if (/* this node holds the value */) return node;
    node = /* the one subtree that could still hold it */;
  }

  return null;
};`,
    hints: [
      'Insert walks down the way search does. The difference is where it stops: search stops when the values match, insert stops when the child it wants to step into is `null` and hangs the new node there.',
      'The rule for equal values follows from the comparison you pick. `value < node.value` sends smaller values left and everything else, larger and equal alike, right.',
      '`bstSearch` returns the node, not the value: `return node` inside the loop, and `return null` after it, once the walk has run off the bottom of the tree.',
    ],
    approach: [
      'Handle the empty tree in `bstInsert` first: return a new node, since it becomes the root.',
      'Otherwise walk down from the root, going left when the value is smaller and right otherwise.',
      'Stop when the child you would step into is `null`, attach the new node there, and return the original root.',
      'Write `bstSearch` as the same walk: return the node when the values match, and otherwise move into the one subtree that could hold the value.',
      'Return `null` once the walk reaches `null`, which means no node holds the value.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    tests: [
      { call: withTreeChecks('let t = null; for (const v of [8, 3, 10, 1, 6, 14]) t = bstInsert(t, v); return preorderOf(t);'), expected: [8, 3, 1, 6, 10, 14], label: 'six inserts land in the right places' },
      { call: '(() => { const n = bstInsert(null, 5); return [n.value, n.left, n.right]; })()', expected: [5, null, null], label: 'inserting into an empty tree makes the root', edge: true },
      { call: '(() => { let t = null; for (const v of [5, 5]) t = bstInsert(t, v); return [t.left, t.right.value, t.right.left, t.right.right]; })()', expected: [null, 5, null, null], label: 'a duplicate goes into the right subtree', edge: true },
      { call: withTree('return bstSearch(tree([8, 4, 12, 2, 6, 10, 14]), 6).value;'), expected: 6, label: 'search finds a node below the root' },
      { call: withTree('return bstSearch(tree([8, 4, 12, 2, 6, 10, 14]), 7);'), expected: null, label: 'a value that is not there gives null', edge: true },
      { call: 'bstSearch(null, 3)', expected: null, label: 'searching an empty tree gives null', edge: true },
      { call: `${searchVisits('[8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]', '13', '(root, value) => bstSearch(root, value)')}.visits <= 4`, expected: true, label: 'fifteen nodes, at most four touched' },
    ],
  },

  /* ── Level 14: complexity in practice (d10) ───────────────────────── */
  {
    id: 'alg-dsa-record-index',
    track: 'algorithms',
    topic: 'dsa',
    level: 14,
    tier: 3,
    focus: ['while', 'objects'],
    title: 'A searchable record index',
    prompt: '`buildIndex(records)` takes an array of `{ id, name }` objects already sorted ascending by `id`, and returns an object with one method: `lookup(id)`, which gives back the matching record object, not its name or its index, or `null` when no record carries that id.\n\nThe index keeps the array it was handed and searches it; it builds no second structure. The checks hold two budgets on a 64-record array. `buildIndex` itself may read at most 2 elements, so a copy or a `Map` built up front fails, because building one reads all 64. Each lookup on the 64-record fixture may read at most 20 elements. A binary search needs at most 7; a full scan goes over for late or absent ids. These counts do not prove a complexity bound for arbitrary code.\n\n`buildIndex([])` still returns a working index, and every lookup on it gives `null`. An id below the smallest, above the largest, or between two neighbours gives `null` as well.\n\nThe caller passes an ordinary dense array of at most 1024 records with unique, strictly ascending finite Number ids. Query ids are finite Numbers, fractions included. The array and records stay unchanged for the life of the index and may be frozen; leave them as they are. Separate indexes keep separate state.\n\nTarget: O(log n) time per lookup, where n is `records.length`. Building the index takes O(1) time and extra space.',
    starter: `const buildIndex = records => {

};

${SCRATCH}
const index = buildIndex([{ id: 1, name: 'ada' }, { id: 4, name: 'bo' }, { id: 9, name: 'cy' }]);
console.log(index.lookup(4), index.lookup(5));
`,
    skeleton: `const buildIndex = records => {
  const lookup = id => {
    let low = /* the first index */;
    let high = /* the last index */;

    while (/* the interval still holds something */) {
      const middle = /* halfway between low and high, rounded down */;
      // return the record when its id matches
      // otherwise move low past the middle, or pull high below it
    }

    return null;
  };

  return { lookup };
};`,
    hints: [
      'Keep the records array in a closure and write `lookup` as a binary search over it. Nothing has to be built when the index is created, which is what the build budget checks.',
      'A closed interval works here: `low` at 0, `high` at `records.length - 1`, and loop while `low <= high`. Compare `records[middle].id` with the id you are looking for.',
      'Read `records[middle]` into a local variable once per pass. Reading it twice still fits inside 20, but one variable makes the three-way comparison easier to follow.',
    ],
    approach: [
      'Return an object whose `lookup` closes over the `records` array, and do not touch the array while building that object.',
      'Inside `lookup`, set `low` to 0 and `high` to the last index.',
      'While `low` is at or below `high`, take the middle index rounding down and read that record.',
      'Return the record when its id matches; otherwise move `low` past the middle for a smaller id, or pull `high` below the middle for a larger one.',
      'Return `null` once the interval is empty, which also covers the index built from an empty array.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    tests: [
      { call: "buildIndex([{ id: 1, name: 'ada' }, { id: 4, name: 'bo' }, { id: 9, name: 'cy' }]).lookup(4)", expected: { id: 4, name: 'bo' } },
      { call: "(() => { const index = buildIndex([{ id: 1, name: 'ada' }, { id: 4, name: 'bo' }, { id: 9, name: 'cy' }]); return [index.lookup(0), index.lookup(5), index.lookup(10)]; })()", expected: [null, null, null], label: 'below, between and above all give null', edge: true },
      { call: 'buildIndex([]).lookup(1)', expected: null, label: 'an index built from an empty array finds nothing', edge: true },
      { call: "(() => { const index = buildIndex([{ id: 7, name: 'only' }]); return [index.lookup(7).name, index.lookup(6)]; })()", expected: ['only', null], label: 'a single record', edge: true },
      { call: `${lookupReads(RECORDS_64, '[100, 200, 352, 999]')}.names`, expected: ['rec-00', 'rec-25', 'rec-63', null], label: 'four lookups across 64 records, one of them absent' },
      { call: `${lookupReads(RECORDS_64, '[100, 200, 352, 999]')}.reads <= 80`, expected: true, label: 'four lookups use at most eighty record reads in total' },
      { call: `${buildReads(RECORDS_64)} <= 2`, expected: true, label: 'building the index reads almost nothing' },
    ],
  },
  {
    id: 'alg-dsa-repair-level-order',
    track: 'algorithms',
    topic: 'dsa',
    level: 14,
    tier: 2,
    focus: ['while', 'push'],
    title: 'Repair a level-order traversal',
    format: 'debug',
    prompt: `The \`levelOrder\` in the starter is broken on purpose, and the task is to repair it. When it works, \`levelOrder(root)\` returns the values of a binary tree level by level, and left to right inside each level.\n\n${TREE_NODES} \`levelOrder(null)\` returns \`[]\`, and a single node returns a one-element array.\n\nThere are three defects. The pending list is read from the back with \`pop\`, which gives a depth-first order instead of a level-by-level one. Missing children are pushed onto the list, so a later pass reads \`value\` off \`null\` and throws. And an empty tree puts \`null\` into the list before the loop starts. Fix all three; rewriting the function from scratch is fine.\n\nInputs are finite binary trees of at most 128 nodes, one parent per node below the root, with ordinary data fields and finite Number values. Leave every node, link and field as it was; the tree may be frozen. Each call returns its own array and does not change earlier results.\n\nTarget: O(n) time, where n is the node count. The result takes O(n) space, and a head-index queue holds up to n references.`,
    starter: `// Broken on purpose: repair it.
const levelOrder = root => {
  const out = [];
  const pending = [root];

  while (pending.length > 0) {
    const node = pending.pop();
    out.push(node.value);
    pending.push(node.left);
    pending.push(node.right);
  }

  return out;
};

${SCRATCH}
const tree = {
  value: 4,
  left: { value: 2, left: null, right: null },
  right: { value: 7, left: null, right: null },
};
console.log(levelOrder(tree));
`,
    skeleton: `const levelOrder = root => {
  if (/* the tree is empty */) return [];

  const out = [];
  const queue = [root];
  let head = 0;

  while (/* a node is still waiting at or after head */) {
    const node = queue[head];
    head += 1;
    // record the value
    // push the left child when it exists, then the right child when it exists
  }

  return out;
};`,
    hints: [
      'A queue is read from the front. Keep a `head` index into `queue`, read `queue[head]`, then step `head` forward. Repeated `shift` calls move every waiting element, which adds up on a wide tree.',
      'Test each child with `!== null` before you push it, and the loop never meets a missing node.',
      'Handle the empty tree before the loop. Returning `[]` straight away is simpler than teaching the loop to skip a `null` root.',
    ],
    approach: [
      'Return `[]` straight away when the root is `null`.',
      'Seed a queue with the root and keep a `head` index starting at 0.',
      'While `head` is below `queue.length`, read `queue[head]` and step `head` forward.',
      "Record that node's value, then push its left child and its right child, each only when it is not `null`.",
      'Return the collected values once the head has passed the end of the queue.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    pitfall: 'runtime',
    failureHints: {
      runtime: 'A pass read `value` off `null`. Push a child only when it is not `null`, and return `[]` for an empty tree before the loop starts.',
      'output-shape': 'The values came out depth-first. `pop` takes the most recent node; a level-by-level walk takes the oldest one, from the front, with a `head` index.',
    },
    tests: [
      { call: withTree('return levelOrder(tree([1, 2, 3, 4, 5, 6, 7]));'), expected: [1, 2, 3, 4, 5, 6, 7], label: 'a full three-level tree' },
      { call: withTree('return levelOrder(tree([4, 2, 7, 1, 3, null, 9]));'), expected: [4, 2, 7, 1, 3, 9], label: 'a missing child does not shift the rest of the level' },
      { call: 'levelOrder(null)', expected: [], label: 'an empty tree gives an empty array', edge: true },
      { call: withTree('return levelOrder(leaf(7));'), expected: [7], label: 'a single node', edge: true },
      { call: withTree("return levelOrder(chain([1, 2, 3, 4], 'left'));"), expected: [1, 2, 3, 4], label: 'a left-leaning chain, one node per level', edge: true },
      { call: withTree('return levelOrder(tree([10, 5, null, null, 8]));'), expected: [10, 5, 8], label: 'a node whose only child is on the right', edge: true },
      { call: withTreeChecks('const t = tree([1, 2, 3]); const nodes = nodesOfTree(t); const before = fieldsOf(nodes); levelOrder(t); return unchangedSince(nodes, before);'), expected: true, label: 'the tree comes back unchanged' },
    ],
  },
  {
    id: 'alg-dsa-frequency-index',
    track: 'algorithms',
    topic: 'dsa',
    level: 14,
    tier: 3,
    focus: ['map-set', 'for-of'],
    title: 'Count once, answer many',
    prompt: '`mostFrequent(values, queries)` takes an array of values and an array of query values, and returns a new array of counts: one per query, in the same order, saying how many times that query value appears in `values`.\n\n`mostFrequent(["a", "b", "a", "c", "a"], ["a", "c", "z"])` gives `[3, 1, 0]`. A query value that never appears gives 0. An empty `queries` array gives `[]`, an empty `values` array gives a zero for every query, and a repeated query gets its own count each time. Values keep their type: the number `1` and the string `"1"` are different values and are counted separately.\n\nAnswering each query with its own scan works, and on the checked input it reads 40 × 50 = 2000 elements. Counting every value once first and then answering each query from that count reads 50. The checks count reads of `values` across the whole call and allow at most 200 for 40 queries against 50 values.\n\nBoth inputs are ordinary dense arrays of at most 1000 values each and may be frozen; leave them as they are. Values can be any JavaScript value. Use SameValueZero equality, as a Map does: NaN matches NaN, the two signs of zero match, and objects, functions and symbols match only themselves. Return a fresh result every call.\n\nTarget: O(n) time, where n is `values.length + queries.length`, under expected constant-time Map operations. The result takes O(q) space for q queries, and the counts O(k) for k distinct values.',
    starter: `const mostFrequent = (values, queries) => {

};

${SCRATCH}
console.log(mostFrequent(['a', 'b', 'a', 'c', 'a'], ['a', 'c', 'z']));
`,
    skeleton: `const mostFrequent = (values, queries) => {
  const counts = /* an empty Map */;

  for (/* each value, once */) {
    // store one more than the count this value already has, treating a missing entry as zero
  }

  return queries.map(query => /* the stored count, or zero when the value never appeared */);
};`,
    hints: [
      'Walk `values` once and build a Map from each value to its count. After that the queries never touch `values` again, which is the point of the read budget.',
      'A Map keeps `1` and `"1"` apart. A plain object turns both keys into the string `"1"` and merges the two counts.',
      '`counts.get(query)` is `undefined` for a value that never appeared, so fall back to 0 before you put it in the result.',
    ],
    approach: [
      'Create an empty Map for the counts.',
      'Walk `values` once, and for each one store its current count plus one, treating a missing entry as zero.',
      'Walk `queries` in order and read each query out of the Map.',
      'Use 0 when the Map holds nothing for that query.',
      'Return the array of counts, which is as long as `queries`.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    tests: [
      { call: "mostFrequent(['a', 'b', 'a', 'c', 'a'], ['a', 'c', 'z'])", expected: [3, 1, 0] },
      { call: "mostFrequent([], ['a', 'b'])", expected: [0, 0], label: 'no values gives a zero per query', edge: true },
      { call: "mostFrequent(['a', 'a'], [])", expected: [], label: 'no queries gives an empty array', edge: true },
      { call: 'mostFrequent([1, 2, 2, 3], [2, 2])', expected: [2, 2], label: 'a repeated query is answered twice', edge: true },
      { call: "mostFrequent([1, '1', 1], [1, '1'])", expected: [2, 1], label: 'the number 1 and the string "1" are separate values', edge: true },
      { call: 'mostFrequent([0, 0, 0], [0])', expected: [3], label: 'zero is an ordinary value, not a missing one', edge: true },
      { call: `${countReads(POOL_50, `view => mostFrequent(view, ${QUERIES_40})`)}.reads <= 200`, expected: true, label: 'forty queries against fifty values read at most two hundred elements' },
    ],
  },
];
