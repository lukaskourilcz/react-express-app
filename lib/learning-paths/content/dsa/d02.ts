import { DSA_D02_LESSONS } from '../../../learn-lessons/dsa/d02';
/** D02 — Arrays and strings.
 *
 * Indexing and traversal, the difference between changing an array and
 * building a new one, what each array operation actually costs, and the two
 * shapes of the two-pointer walk. Two lessons, four objective checks, three
 * coding exercises.
 *
 * Two of the exercises are graded on method as well as answer. They hand the
 * learner a plain array wrapped in a Proxy that counts index writes, so the
 * grade can say "this routine stayed inside the stated write budget on these
 * inputs" without matching source text. That is a bounded contract, never a
 * proof about arbitrary code. */

import type { ModuleSource } from '../../types';

/** Counts index writes on a plain array by proxying it, and reports whether
 * the learner handed back the very object they were given. Private helper state cannot be shadowed, and it counts with the built-ins
 * taken before that code ran (`__probe`, shared/coding-evaluate.ts), so
 * replacing `Proxy` changes nothing. */
const WRITE_PROBE = `
var __countWrites = function (values, run) {
  var writes = 0;
  var proxy = new __probe.Proxy(values, {
    set: function (target, prop, value) {
      if (typeof prop === 'string' && __probe.isIndex(prop)) writes += 1;
      target[prop] = value;
      return true;
    },
    defineProperty: function (target, prop, descriptor) {
      if (typeof prop === 'string' && __probe.isIndex(prop)) writes += 1;
      __probe.defineProperty(target, prop, descriptor);
      return true;
    },
    deleteProperty: function (target, prop) {
      if (typeof prop === 'string' && __probe.isIndex(prop)) writes += 1;
      return __probe.deleteProperty(target, prop);
    },
  });
  var result = run(proxy);
  return { writes: writes, same: result === proxy, values: values.slice(), result: result };
};
`.trim();

export const DSA_D02: ModuleSource = {
  id: 'dsa-v1-d02',
  title: 'Arrays and strings',
  outcomes: [
    'Say what an array operation costs, and why the front of an array is expensive and the end is not.',
    'Choose deliberately between changing an array in place and returning a new one, and state the contract you chose.',
    'Solve an ends-inward or a read-and-write problem with two pointers in one pass and O(1) auxiliary space.',
  ],
  competencies: ['arrays-strings', 'complexity'],
  dependsOn: ['dsa-v1-d01'],
  estimatedMinutes: 155,
  lessons: DSA_D02_LESSONS,
  activities: [
    {
      id: 'dsa-v1-d02-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: indexing, traversal and what a change costs',
      summary: 'Position as address, the three traversal forms, mutation against copying, and the cost table for the common array operations.',
      competencies: ['arrays-strings', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d02-l1',
    },
    {
      id: 'dsa-v1-d02-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: two pointers, and where the space goes',
      summary: 'Ends-inward and read-and-write pointer walks, the unspecified tail after a compaction, and auxiliary space in place against a copy.',
      competencies: ['arrays-strings', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d02-l2',
    },
    {
      id: 'dsa-v1-d02-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Array cost and mutation checks',
      summary: 'Four questions on fresh snippets: what a call did to the caller’s array, the price of shift in a loop, auxiliary space of an in-place walk, and counting comparisons in a palindrome check.',
      competencies: ['arrays-strings', 'complexity'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-d02-q1',
          prompt: 'After this snippet runs, what does `numbers` hold, and which call changed it?',
          context: {
            language: 'javascript',
            code: 'const trimFirst = values => {\n  values.shift();\n  return values;\n};\n\nconst withoutFirst = values => values.slice(1);\n\nconst numbers = [1, 2, 3];\ntrimFirst(numbers);\nwithoutFirst(numbers);',
          },
          options: [
            '`[2, 3]` — `trimFirst` changed the caller’s array, and `withoutFirst` built a separate one',
            '`[1, 2, 3]` — both functions returned new arrays and left the input alone',
            '`[3]` — both calls removed an element from the caller’s array',
            '`[2, 3]` — `withoutFirst` did the removal, and `trimFirst` had no lasting effect',
          ],
          correct: 0,
          explanation:
            '`shift` removes from the array it is called on, so `trimFirst` leaves `numbers` as `[2, 3]`. `slice` allocates a new array and copies a range into it, so `withoutFirst` returns `[3]` and changes nothing; its result is discarded here. `[1, 2, 3]` would be right only if both calls copied. `[3]` would require both calls to mutate. The last option gets the value right for the wrong reason, and that reason matters when you have to predict what a call does.',
          competencies: ['arrays-strings'],
        },
        {
          id: 'dsa-v1-d02-q2',
          prompt: 'In the dense-array model, removing the front moves every remaining entry; push has amortized constant cost. `queue` starts with n entries. What is the tightest growth class for the running time of `drain`?',
          context: {
            language: 'javascript',
            code: 'const drain = queue => {\n  const out = [];\n  while (queue.length > 0) out.push(queue.shift());\n  return out;\n};',
          },
          options: ['O(n²)', 'O(n)', 'O(n log n)', 'O(1)'],
          correct: 0,
          explanation:
            'Under the stated model, front removals move n − 1, n − 2, down to zero entries: n(n − 1)/2 moves. The n loop iterations and amortized pushes add linear work, so the total is quadratic. Linear time would require constant front removal in a different representation. Draining from the end with pop is linear under this model; no halving or constant-work shortcut occurs here.',
          competencies: ['arrays-strings', 'complexity'],
        },
        {
          id: 'dsa-v1-d02-q3',
          prompt: 'Assume a dense array of n fixed-size entries and valid integer bounds inside it. What is the auxiliary space — memory beyond the stored input — of `reverseSection`?',
          context: {
            language: 'javascript',
            code: 'const reverseSection = (values, from, to) => {\n  let left = from;\n  let right = to;\n\n  while (left < right) {\n    const held = values[left];\n    values[left] = values[right];\n    values[right] = held;\n    left += 1;\n    right -= 1;\n  }\n\n  return values;\n};',
          },
          options: [
            'O(1) — two indices and one held value, whatever n is',
            'O(n) — the array it returns is as long as the input',
            'O(n) — each swap needs a temporary copy of the array',
            'O(log n) — the two pointers meet after about log n steps',
          ],
          correct: 0,
          explanation:
            'The routine writes into the array it was handed and allocates three local variables, and that count does not grow with n. Returning `values` allocates nothing: it hands back the same array the caller already had, so the return value adds no auxiliary space. A swap needs one held element, not a copy of the array. The pointers move one position each through the selected section. Its length changes the number of iterations, not the fixed amount of live auxiliary storage; no recursive stack or copied array is created.',
          competencies: ['arrays-strings', 'complexity'],
        },
        {
          id: 'dsa-v1-d02-q4',
          prompt: 'How many character comparisons does `isPalindrome(\'abcdcba\')` make before it returns?',
          context: {
            language: 'javascript',
            code: 'const isPalindrome = text => {\n  let left = 0;\n  let right = text.length - 1;\n\n  while (left < right) {\n    if (text[left] !== text[right]) return false;\n    left += 1;\n    right -= 1;\n  }\n\n  return true;\n};',
          },
          options: ['3', '4', '6', '7'],
          correct: 0,
          explanation:
            'The pairs compared are (0, 6), (1, 5) and (2, 4). After the third match both pointers sit on index 3, `left < right` is false and the loop stops, so three comparisons. 4 would include the middle character against itself, which the `left < right` condition rules out. 6 counts every character except the middle one, which double-counts each pair. 7 is one comparison per character, which would be the count for a deliberately full position-by-position comparison, not this ends-inward walk. A built-in string comparison does not promise that exact count.',
          competencies: ['arrays-strings', 'complexity'],
        },
      ],
    },
    {
      id: 'dsa-v1-d02-reverse-in-place',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Reverse in place',
      summary: "Reverse the caller's array within a measured indexed-mutation budget; practice an ends-inward swap loop.",
      competencies: ['arrays-strings', 'complexity'],
      estimatedMinutes: 15,
      code: {
        language: 'javascript',
        prompt:
          "Write `reverseInPlace(values)` for a dense ordinary array. Reverse its entries in place and return the same array object. Empty and one-element arrays remain unchanged.\n\nOn measured cases, the original array must contain the reversed order, the returned object must be identical to it, and at most n indexed mutations are allowed. Assignments, property definitions and deletions are counted; length updates are not. A returned reversed copy alone fails, but temporary copying or using a built-in is not detected as forbidden. Practice writing an ends-inward swap loop.\n\nTarget: O(n) time and O(1) extra space, where n is the input length. These finite assertions do not measure total runtime growth or temporary allocations.",
        contract: [
          'Reverse the dense array you were given. Temporary allocation is not measured by these assertions.',
          'Return that same array, so `reverseInPlace(values) === values` holds.',
          'On measured cases, allow at most n indexed mutations: assignments, property definitions and deletions. Length updates are not counted.',
          'An empty array and a one-element array are returned unchanged, and still as the same object.',
        ],
        starter: `const reverseInPlace = values => {

};

// Scratch pad — change this before submitting.
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
        hints: ["Identify the two positions whose values must trade places. Which positions no longer need attention after that swap?", "What protects the first value from being lost when you overwrite its slot?", "Check whether an empty or one-element input needs any writes, and which array object the caller expects back."],
        approach: [
          'Start `left` at 0 and `right` at `values.length - 1`.',
          'While `left` is below `right`, swap `values[left]` with `values[right]` using one temporary variable.',
          'Move `left` up by one and `right` down by one after each swap.',
          'Return `values` itself, so the caller gets back the array it passed in.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct reversed order, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check the empty array, a single element, an even length and an odd length, where the middle element stays put.',
          },
          {
            id: 'in-place',
            label: 'Reversed in place, and the same array returned',
            critical: true,
            weight: 2,
            detail: 'The caller’s array must hold the reversed order, the returned object must be that same array, and counted indexed mutations must stay within n. Returning only a separate copy fails; copying temporarily and writing back can pass. These assertions do not measure auxiliary allocations.',
          },
        ],
        tests: [
          { call: 'reverseInPlace([1, 2, 3, 4])', expected: [4, 3, 2, 1] },
          { call: 'reverseInPlace([1, 2, 3])', expected: [3, 2, 1], label: 'an odd length leaves the middle element where it is' },
          { call: 'reverseInPlace([])', expected: [], label: 'an empty array comes back empty', edge: true },
          { call: 'reverseInPlace([7])', expected: [7], label: 'a single element is its own reverse', edge: true },
          {
            call: '(() => { const values = [1, 2, 3]; reverseInPlace(values); return values; })()',
            expected: [3, 2, 1],
            label: 'the array the caller passed in is the one that changed',
            criterion: 'in-place',
          },
          {
            call: '(() => { const values = [1, 2, 3]; return reverseInPlace(values) === values; })()',
            expected: true,
            label: 'the returned value is the same array, not a copy',
            criterion: 'in-place',
          },
          {
            call: '__countWrites([1, 2, 3, 4, 5, 6], function (view) { return reverseInPlace(view); }).writes <= 6',
            expected: true,
            label: 'six elements take at most six index writes',
            criterion: 'in-place',
          },
        ],
        harness: WRITE_PROBE,
      },
    },
    {
      id: 'dsa-v1-d02-palindrome-two-pointer',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Palindrome, from both ends',
      summary: "Compare case-sensitive ASCII text from opposite ends; practice a two-pointer approach with constant auxiliary space.",
      competencies: ['arrays-strings', 'complexity'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          "Write `isPalindrome(text)`, returning a boolean for whether the string reads the same forwards and backwards. Input contains ASCII letters and digits only; compare case-sensitively. `Racecar` is false because R and r differ. Empty text and any one-character string are palindromes.\n\nPractice two indices moving inward and stop at the first mismatched pair. Other correct implementations can pass these semantic checks; the tests do not prove that no copy was allocated.\n\nTarget: O(n) time and O(1) extra space, where n is the number of ASCII characters. Space is a goal, not a measured claim about arbitrary submitted code.",
        contract: [
          'The input contains only ASCII letters and digits, so there is nothing to skip.',
          'Compare characters with case-sensitive equality; different letter cases are not equivalent.',
          'The empty string and any single character are palindromes.',
          'Return a boolean, not a truthy value.',
        ],
        starter: `const isPalindrome = text => {

};

// Scratch pad — change this before submitting.
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
        hints: ["Which position mirrors the first character, and which mirrors the second? ASCII indexing is enough for this task.", "A mismatched pair settles the result. Decide whether later pairs can change that result.", "When the length is odd, consider whether the middle character needs a separate comparison."],
        approach: [
          'Start `left` at 0 and `right` at `text.length - 1`.',
          'While `left` is below `right`, compare `text[left]` with `text[right]`.',
          'Return `false` immediately when they differ.',
          'Otherwise move `left` up by one and `right` down by one.',
          'Return `true` once the pointers meet or cross.',
        ],
        tests: [
          { call: 'isPalindrome(\'racecar\')', expected: true },
          { call: 'isPalindrome(\'abca\')', expected: false, label: 'the outer pair matches and the inner pair does not' },
          { call: 'isPalindrome(\'abba\')', expected: true, label: 'an even length has no middle character' },
          { call: 'isPalindrome(\'\')', expected: true, label: 'the empty string is a palindrome', edge: true },
          { call: 'isPalindrome(\'x\')', expected: true, label: 'a single character is a palindrome', edge: true },
          { call: 'isPalindrome(\'Racecar\')', expected: false, label: 'case-sensitive: capital R does not match lowercase r', edge: true },
          { call: 'isPalindrome(\'12321\')', expected: true, label: 'digits are characters like any other' },
        ],
      },
    },
    {
      id: 'dsa-v1-d02-dedupe-sorted',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Compact a sorted array',
      summary: "Compact the distinct prefix of a sorted numeric array within a measured mutation budget; practice read and write pointers.",
      competencies: ['arrays-strings', 'complexity'],
      estimatedMinutes: 25,
      code: {
        language: 'javascript',
        prompt:
          "Write `removeDuplicatesSorted(sorted)` for a dense ascending array of finite Numbers. Put its distinct values into the front of that same array, in ascending order, and return their count. Treat values equal with === as duplicates. For `[1, 1, 2, 3, 3, 4]`, return 4 and leave `[1, 2, 3, 4]` in the first four slots. Empty input returns 0.\n\nThe tail after the returned count is unspecified and is not checked. On measured cases, at most n indexed mutations are allowed: assignments, property definitions and deletions count, length updates do not. Repeated splice calls may exceed this budget. Temporary copies are not measured; a copy that is never written back fails the prefix contract. Practice read and write pointers.\n\nTarget: O(n) time and O(1) extra space, where n is the original array length. The finite mutation tests do not establish time or space complexity for arbitrary code.",
        contract: [
          'The input is sorted ascending, so equal values sit next to each other; rely on that.',
          'Write the distinct values into the front of the array you were given, in ascending order.',
          'Return the count of distinct values as a number.',
          'Slots from the returned length onward are unspecified and are never checked.',
          'On measured cases, allow at most n indexed mutations: assignments, property definitions and deletions. Length updates are not counted.',
        ],
        starter: `const removeDuplicatesSorted = sorted => {

};

// Scratch pad — change this before submitting.
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
        hints: ["Sorted equal values form neighboring runs. Decide which representative belongs in the kept prefix.", "The next position to read and the next position to keep may differ after a duplicate. Track their roles separately.", "Check empty input before assuming there is a first kept value. Test one long equal run and a list with no repeats."],
        approach: [
          'Return 0 straight away when the array is empty.',
          'Treat the first element as kept, so the write pointer starts at 1.',
          'Walk the read pointer from index 1 to the end.',
          'When the element at the read pointer differs from the last kept value, copy it into the write slot and move the write pointer up by one.',
          'Return the write pointer, which is the number of distinct values now sitting at the front.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct count of distinct values',
            critical: true,
            weight: 3,
            detail: 'Check the empty array, an array of one repeated value, an array with no duplicates, and negative values.',
          },
          {
            id: 'in-place',
            label: 'Compacted into the caller’s array, within the write budget',
            critical: true,
            weight: 2,
            detail: 'The distinct prefix must be written into the caller’s array within n counted indexed mutations. Computing a separate result without writing it back fails. Temporary copies are not measured; repeated splice removal may exceed the finite budget.',
          },
        ],
        tests: [
          { call: 'removeDuplicatesSorted([1, 1, 2, 3, 3, 3, 4])', expected: 4 },
          { call: 'removeDuplicatesSorted([1, 2, 3])', expected: 3, label: 'no duplicates means no change to the count' },
          { call: 'removeDuplicatesSorted([])', expected: 0, label: 'an empty array has no distinct values', edge: true },
          { call: 'removeDuplicatesSorted([5, 5, 5, 5])', expected: 1, label: 'one value repeated four times collapses to one', edge: true },
          { call: 'removeDuplicatesSorted([-3, -3, 0, 0, 7])', expected: 3, label: 'negatives and zero are ordinary values', edge: true },
          {
            call: '(() => { const values = [1, 1, 2, 3, 3, 3, 4]; const length = removeDuplicatesSorted(values); return values.slice(0, length); })()',
            expected: [1, 2, 3, 4],
            label: 'the first four slots of the caller’s array hold the distinct values',
            criterion: 'in-place',
          },
          {
            call: '__countWrites([1, 1, 1, 2, 2, 3, 3, 3, 3, 4], function (view) { return removeDuplicatesSorted(view); }).writes <= 10',
            expected: true,
            label: 'ten elements take at most ten index writes',
            criterion: 'in-place',
          },
        ],
        harness: WRITE_PROBE,
      },
    },
  ],
  requires: [
    { activityId: 'dsa-v1-d02-checks', state: 'verified_pass' },
    { activityId: 'dsa-v1-d02-reverse-in-place', state: 'verified_pass' },
    { activityId: 'dsa-v1-d02-palindrome-two-pointer', state: 'verified_pass' },
    { activityId: 'dsa-v1-d02-dedupe-sorted', state: 'verified_pass' },
  ],
};
