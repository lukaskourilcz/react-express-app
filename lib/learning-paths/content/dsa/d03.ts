import { DSA_D03_LESSONS } from '../../../learn-lessons/dsa/d03';
/** D03 — Hash maps and sets.
 *
 * What a hash table actually trades: memory and an assumption about the hash
 * for expected constant get, set and has. Two lessons, four objective checks,
 * three coding exercises.
 *
 * The lessons say plainly what the expectation excludes. A JavaScript Map is
 * an implementation abstraction, and the specification asks only for access
 * times that are sublinear on average, so this module never promises a
 * worst-case constant lookup. */

import type { ModuleSource } from '../../types';

export const DSA_D03: ModuleSource = {
  id: 'dsa-v1-d03',
  title: 'Hash maps and sets',
  outcomes: [
    'Replace a nested scan with a Map or a Set and give the growth class of both versions, naming both inputs.',
    'Say what "expected constant" assumes and what an adversarial run of collisions does to it.',
    'Choose between a Map, a Set and an array from the access pattern rather than from habit.',
  ],
  competencies: ['maps-sets', 'complexity'],
  dependsOn: ['dsa-v1-d02'],
  estimatedMinutes: 110,
  lessons: DSA_D03_LESSONS,
  activities: [
    {
      id: 'dsa-v1-d03-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: what a hash map buys',
      summary: 'Hashing a key to its bucket, the memory that pays for it, and where Map and a plain object part ways.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d03-l1',
    },
    {
      id: 'dsa-v1-d03-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: sets, and the honest cost story',
      summary: 'Membership with a Set, O(n + m) against O(nm), and what a run of collisions does to expected constant time.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d03-l2',
    },
    {
      id: 'dsa-v1-d03-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Map and Set checks',
      summary: 'Four questions: what expected constant claims, a nested scan against a Set, how duplicates land, and when an array still wins.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-d03-q1',
          prompt: '`seen` is a JavaScript Map with n entries. What access-time guarantee does the language specification require?',
          options: [
            'Average access must be sublinear in n; constant expected lookup is a hash-table model, not a universal Map guarantee.',
            'Every lookup must be worst-case constant; growing the table or colliding keys cannot increase its operation count.',
            'Every lookup must be logarithmic because Map sorts its keys and repeatedly halves the remaining search range.',
            'Every lookup must be linear because get walks entries in insertion order until it reaches the matching key.',
          ],
          correct: 0,
          explanation:
            'The specification requires sublinear average access. A hash table or another suitable representation can meet it; expected constant lookup needs additional hash-table assumptions. Insertion order describes iteration, not a required get algorithm. Map need not sort keys or scan them in insertion order, and it promises no universal constant worst-case operation count.',
          competencies: ['maps-sets', 'complexity'],
        },
        {
          id: 'dsa-v1-d03-q2',
          prompt: 'Assume bounded key comparisons/hashing and expected constant Set operations. `tags` has n entries and `banned` has m, with n,m ≥ 1 and unrelated lengths. What is the tightest worst-case class for `flagged`, and the expected class after building a Set once?',
          context: {
            language: 'javascript',
            code: 'const flagged = (tags, banned) => {\n  const out = [];\n  for (const tag of tags) {\n    if (banned.includes(tag)) out.push(tag);\n  }\n  return out;\n};',
          },
          options: [
            'O(nm) as written; building a Set of `banned` once makes it expected O(n + m).',
            'O(n + m) as written; a Set changes nothing, because `includes` already stops at the first match.',
            'O(n²) as written; a Set makes it expected O(n).',
            'O(nm) as written; a Set makes it expected O(n), because building the Set costs nothing.',
          ],
          correct: 0,
          explanation:
            '`includes` scans `banned`, so the body costs up to m for each of the n tags: nm. Stopping early on a match does not change the class, because a miss still reads all m. Calling it O(n²) assumes the two inputs grow together and hides which list to shrink. And the Set has to be built, which reads `banned` once, so the m never disappears — it moves from a repeated factor to a one-off term.',
          competencies: ['maps-sets', 'complexity'],
        },
        {
          id: 'dsa-v1-d03-q3',
          prompt: 'After this code runs, what are `seen.size` and `counts.get("a")`?',
          context: {
            language: 'javascript',
            code: "const values = ['a', 'b', 'a', 'c', 'b', 'a', 'd'];\nconst seen = new Set(values);\nconst counts = new Map();\nfor (const value of values) counts.set(value, (counts.get(value) || 0) + 1);",
          },
          options: ['4 and 3', '7 and 3', '4 and 1', '4 and 7'],
          correct: 0,
          explanation:
            "The Set keeps one entry per distinct value, so the seven values collapse to the four distinct ones: 'a', 'b', 'c', 'd'. `counts.set` replaces whatever the key held, but the line reads the old count back with `get` before adding one, so 'a' ends at 3 rather than 1. The counter is per key, not a running total of everything seen, so 7 is the length of the input rather than any entry in the Map.",
          competencies: ['maps-sets'],
        },
        {
          id: 'dsa-v1-d03-q4',
          prompt: 'A component holds twelve configuration entries, walks all of them in a fixed order on every render, and never looks one up by key. Which structure fits, and why?',
          options: [
            'An array: the access is iteration in order, so hashing and the extra table slots buy nothing at twelve entries.',
            'A Map: expected constant lookup makes every access cheaper than an array index would be.',
            'A Set: dropping duplicates is what makes ordered iteration cheap.',
            'A Map: only a Map has a defined iteration order, so a fixed order needs one.',
          ],
          correct: 0,
          explanation:
            'No lookup by key ever happens, so the operation a Map optimises is not in the workload; an array index is already constant, so there is nothing for expected constant to beat. A Set would silently drop entries that repeat, which is a change in the data rather than a speed-up. And an array has had a defined order since the beginning — the Map guarantee is worth citing against a plain object, not against an array.',
          competencies: ['maps-sets', 'complexity'],
        },
      ],
    },
    {
      id: 'dsa-v1-d03-frequency-map',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Frequency map',
      summary: 'Count how often each value appears, keyed by the value itself and ordered by first appearance.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 15,
      code: {
        language: 'javascript',
        prompt:
          "Write `countFrequencies(values)` for a dense array of JavaScript values. Return a Map from each distinct value to its positive occurrence count, with keys in first-appearance order. Use Map's SameValueZero equality: NaN matches NaN, signed zeros are equal, and objects/symbols keep their identity. `1` and `\"1\"` are separate keys. Empty input returns a new empty Map. Preserve the input array.\n\nTarget: O(n) time, where n is input entries, assuming bounded key hashing/comparison and average constant Map operations. JavaScript requires only sublinear average access; the tests check counts, equality and order, not arbitrary runtime growth.",
        contract: ["Return a new Map with counts for every distinct value and leave the input array unchanged.", "Use SameValueZero key equality, with object and symbol identity preserved.", "Iterate keys in first-appearance order, including mixed-type values."],
        starter: `const countFrequencies = values => {

};

// Scratch pad — change this before submitting.
console.log([...countFrequencies(['a', 'b', 'a']).entries()]);
`,
        skeleton: `const countFrequencies = values => {
  const counts = /* an empty Map */;

  for (/* each value */) {
    // read the count this value already has, or zero, and store one more
  }

  return counts;
};`,
        hints: ["A repeated value needs its earlier count, while a new value needs an initial count. Avoid converting keys to strings.", "Updating an existing Map key does not change its insertion position. Consider how that preserves first appearance."],
        approach: [
          'Create an empty Map to hold the counts.',
          'Walk the array once, binding each value.',
          'Read the current count for that value, treating a missing entry as zero.',
          'Store the count plus one under the same key.',
          'Return the Map; an empty input never enters the loop and returns it empty.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct count for every distinct value',
            critical: true,
            weight: 3,
            detail: 'Check an empty array, a value that repeats, and values whose types differ but whose text looks the same.',
          },
          {
            id: 'first-appearance-order',
            label: 'Keys in order of first appearance',
            critical: true,
            weight: 2,
            detail:
              'The keys came out in the wrong order. Counting into a plain object and converting at the end does this: object keys that look like integers iterate in ascending numeric order, whatever order you wrote them in.',
          },
        ],
        tests: [
          { call: "(() => [...countFrequencies(['a', 'b', 'a']).entries()])()", expected: [['a', 2], ['b', 1]] },
          { call: '(() => [...countFrequencies([]).entries()])()', expected: [], label: 'an empty array gives an empty Map', edge: true },
          { call: 'countFrequencies([]) instanceof Map', expected: true, label: 'the return value is a Map', edge: true },
          {
            call: '(() => [...countFrequencies([10, 2, 10, 30, 2, 10]).keys()])()',
            expected: [10, 2, 30],
            label: 'keys follow first appearance, not numeric order',
            criterion: 'first-appearance-order',
          },
          {
            call: "(() => [...countFrequencies([1, '1', 1]).entries()])()",
            expected: [[1, 2], ['1', 1]],
            label: 'the number 1 and the string \'1\' are separate keys',
            edge: true,
          },
          { call: "countFrequencies(['x', 'x', 'x']).get('x')", expected: 3, label: 'a value that only repeats' },
        ],
      },
    },
    {
      id: 'dsa-v1-d03-first-unique',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'First unique value',
      summary: 'Find the first value that appears exactly once, using a counting pass and then an order-preserving one.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          "Write `firstUnique(values)` for a dense array of JavaScript values. Return the earliest input value that appears exactly once, or null when there is none, including empty input. Compare using SameValueZero: NaN equals NaN, signed zeros are equal, and object/symbol identities stay distinct. A qualifying undefined or null value is returned as that value; the null sentinel need not distinguish a found null. Either zero sign is acceptable. Preserve the input array.\n\nA counting pass followed by an input-order or insertion-ordered Map scan is one approach. Target: O(n) time, where n is input entries, under bounded key-cost and average constant Map operations. These are model assumptions, not a universal Map time guarantee.",
        contract: ["Return the earliest qualifying value under SameValueZero equality; object and symbol values keep their identity.", "Return null when none qualifies. A qualifying undefined remains undefined, and either zero sign is acceptable.", "Preserve the input array; iteration over an insertion-ordered Map can preserve first-appearance order."],
        starter: `const firstUnique = values => {

};

// Scratch pad — change this before submitting.
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
        hints: ["Seeing a value once is not enough to know it stays unique. Decide what information survives when it appears later.", "After counting, identify the earliest qualifying value; numeric object-property order can differ from the input order.", "A falsey value may still be the correct result. Distinguish finding it from reaching the end without any qualifying value."],
        approach: [
          'Build a Map from each value to the number of times it appears.',
          'Walk the original array a second time, in order.',
          'Return the first value whose stored count is exactly 1.',
          'Return `null` if the second pass finishes without a match.',
        ],
        tests: [
          { call: "firstUnique(['a', 'b', 'a', 'c'])", expected: 'b' },
          { call: 'firstUnique([])', expected: null, label: 'an empty array has no unique value', edge: true },
          { call: 'firstUnique([2, 2, 3, 3])', expected: null, label: 'every value repeats', edge: true },
          { call: 'firstUnique([7, 3, 7, 3, 9])', expected: 9, label: 'the only unique value is the last one' },
          { call: "firstUnique([0, '0'])", expected: 0, label: 'the number 0 and the string \'0\' are different values', edge: true },
          { call: 'firstUnique([4])', expected: 4, label: 'a single element is unique', edge: true },
        ],
      },
    },
    {
      id: 'dsa-v1-d03-set-intersection',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Intersection with a set',
      summary: 'The values two arrays share, each once, in the order the left array introduced them.',
      competencies: ['maps-sets', 'complexity'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          "Write `intersection(left, right)` for two dense arrays of JavaScript values. Return a new array of values present in both, each once, in their first-appearance order in left. Use SameValueZero equality: NaN equals NaN, signed zeros are equal, and objects/symbols match by identity. Values retain their type; use the representative from left, except either sign of zero is acceptable. Preserve both inputs. Empty input or no overlap returns a new empty array.\n\nBuilding a Set from right once and scanning left is one approach. Target: O(n + m) time, where n and m are the input lengths, assuming bounded key costs and average constant Set operations. Correct slower alternatives can pass semantic checks; the tests do not prove arbitrary complexity.",
        contract: ["Return a fresh output array for every input, including empty cases; preserve both inputs.", "Each shared SameValueZero class appears once, in first-appearance order from left.", "Object/symbol identities and value types are preserved; either zero sign is acceptable."],
        starter: `const intersection = (left, right) => {

};

// Scratch pad — change this before submitting.
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
        hints: ["Membership answers whether right contains a value. What additional information prevents the same shared value from being emitted twice?", "Choose which input controls the output order. Keep the original arrays separate from any result-building state.", "Check repeated values, mixed types and NaN against the equality rule before choosing a membership test."],
        approach: [
          'Build a Set from `right`.',
          'Create an empty Set for the values already added, and an empty output array.',
          'Walk `left` in order.',
          'Push a value when the `right` Set holds it and the added Set does not, then record it as added.',
          'Return the output array.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct shared values, inputs untouched',
            critical: true,
            weight: 3,
            detail: 'Check empty inputs, no overlap, complete overlap, and that neither argument comes back changed.',
          },
          {
            id: 'duplicate-free',
            label: 'Each value once, in the order `left` introduces it',
            critical: true,
            weight: 2,
            detail:
              'A repeated value came out twice, or the order followed `right` instead of `left`. Membership in `right` is only half the test; you also have to remember what you already pushed.',
          },
        ],
        tests: [
          { call: 'intersection([1, 2, 3, 4], [3, 4, 5])', expected: [3, 4] },
          { call: 'intersection([], [1, 2])', expected: [], label: 'an empty left side gives an empty array', edge: true },
          { call: 'intersection([1, 2], [])', expected: [], label: 'an empty right side gives an empty array', edge: true },
          { call: 'intersection([1, 2, 3], [4, 5])', expected: [], label: 'nothing in common', edge: true },
          {
            call: 'intersection([2, 2, 3, 3], [3, 2])',
            expected: [2, 3],
            label: 'duplicates in left appear once, in first-appearance order',
            criterion: 'duplicate-free',
          },
          {
            call: 'intersection([5, 6], [6, 6, 6])',
            expected: [6],
            label: 'duplicates in right do not duplicate the output',
            criterion: 'duplicate-free',
          },
          {
            call: "intersection(['b', 'a'], ['a', 'b'])",
            expected: ['b', 'a'],
            label: 'the order follows left, not right',
            criterion: 'duplicate-free',
          },
        ],
      },
    },
  ],
  requires: [
    { activityId: 'dsa-v1-d03-checks', state: 'verified_pass' },
    { activityId: 'dsa-v1-d03-frequency-map', state: 'verified_pass' },
    { activityId: 'dsa-v1-d03-first-unique', state: 'verified_pass' },
    { activityId: 'dsa-v1-d03-set-intersection', state: 'verified_pass' },
  ],
};
