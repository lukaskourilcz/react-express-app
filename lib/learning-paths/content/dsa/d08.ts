import { DSA_D08_LESSONS } from '../../../learn-lessons/dsa/d08';
/** D08 — Basic sorting.
 *
 * Three sorts the learner writes and one the learner only watches. Selection
 * and insertion sort share a growth class and disagree about almost
 * everything else; merge sort buys a better class with a linear buffer.
 * Bubble sort appears as a trace and is never implemented. Two lessons, four
 * objective checks, three coding exercises.
 *
 * Every exercise takes a caller-supplied comparator, and the harness hands
 * the graded runs a comparator that counts its own calls. Counting
 * comparisons is what makes the method assessable: selection sort on eight
 * elements spends exactly 28, insertion sort spends 7 on sorted input and 28
 * on reversed input, and a merge sort stays between 12 and 24 and spends
 * exactly 12 when the input already arrives sorted. That last number is what
 * separates a real merge sort from a built-in sort called on a copy, which
 * lands inside the wider window. All of it is a bounded contract — this
 * routine made this many comparisons on these inputs — and never a proof
 * about arbitrary code. */

import type { ModuleSource } from '../../types';

/** Wraps the caller comparator so the grade can see how many comparisons a
 * submission made. Appended after the learner's code, so it cannot be
 * shadowed. `__range` and `__reversed` build the two eight-element fixtures
 * the method criteria are stated against. */
const COMPARE_PROBE = `
var __numeric = function (a, b) { return a - b; };
var __countCompares = function (values, run, compare) {
  var compares = 0;
  var base = compare || __numeric;
  var counted = function (a, b) { compares += 1; return base(a, b); };
  var result = run(values, counted);
  return { result: result, compares: compares };
};
var __range = function (n) {
  var values = [];
  for (var i = 1; i <= n; i += 1) values.push(i);
  return values;
};
var __reversed = function (n) {
  var values = [];
  for (var i = n; i >= 1; i -= 1) values.push(i);
  return values;
};
`.trim();

/** The comparison counter plus a fixture of tagged records with repeated
 * keys. Sorting it by key and reading the tags back shows whether equal
 * elements kept the order they arrived in, which is what stability means. */
const MERGE_PROBE = `${COMPARE_PROBE}
var __byKey = function (a, b) { return a.key - b.key; };
var __tagged = function () {
  return [
    { key: 2, tag: 'a' },
    { key: 1, tag: 'b' },
    { key: 2, tag: 'c' },
    { key: 1, tag: 'd' },
    { key: 2, tag: 'e' },
    { key: 1, tag: 'f' },
  ];
};
var __tags = function (items) {
  return items.map(function (item) { return item.tag; }).join('');
};`;

export const DSA_D08: ModuleSource = {
  id: 'dsa-v1-d08',
  title: 'Basic sorting',
  outcomes: [
    'Write selection sort, insertion sort and merge sort against a caller-supplied comparator, and say what each one costs in comparisons.',
    'Explain why selection sort spends n(n-1)/2 comparisons on every input while insertion sort spends n-1 on an already-sorted one.',
    'Separate stable from unstable and in-place from buffered, and name the auxiliary space each of the three sorts needs.',
  ],
  competencies: ['sorting', 'complexity', 'arrays-strings'],
  dependsOn: ['dsa-v1-d07'],
  estimatedMinutes: 130,
  lessons: DSA_D08_LESSONS,
  activities: [
    {
      id: 'dsa-v1-d08-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: two quadratic sorts, and what stable means',
      summary: 'Selection sort, insertion sort and a traced bubble sort: comparison counts, swap counts and stability.',
      competencies: ['sorting', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d08-l1',
    },
    {
      id: 'dsa-v1-d08-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: merge sort, divide, merge and the cost of the buffer',
      summary: 'The merge step, the level argument for O(n log n), the linear buffer and where stability comes from.',
      competencies: ['sorting', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d08-l2',
    },
    {
      id: 'dsa-v1-d08-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Sorting checks',
      summary: 'Four questions on stability, auxiliary space, why selection sort ignores its input, and the merge-sort level argument.',
      competencies: ['sorting', 'complexity'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-d08-q1',
          prompt:
            'A report is already ordered by customer name. Sort it by order date only, keeping the existing customer-name order among equal dates. Which of the implementations in this module preserves that earlier order?',
          options: [
            'Insertion sort, and merge sort that takes the left item first on comparator ties',
            'Selection sort and merge sort, because both compare every pair of elements exactly once',
            'Selection sort only, because it performs the fewest swaps of the three',
            'None of the three, because a comparator that returns zero leaves the resulting order undefined',
          ],
          correct: 0,
          explanation:
            'Insertion sort stops shifting at the first element that is not strictly greater, so it never walks past an equal element, and merge sort keeps ties in order as long as `<= 0` sends the left run first. The shown selection sort is unstable: its swap drops a distant element into the gap and jumps over any equal elements in between. The claim that both sorts compare every pair once also misdescribes the work, since selection sort checks each remaining element against a running minimum rather than each element against every other. Swap count says nothing about stability, and a comparator returning zero is the case a stable sort defines rather than leaves open.',
          competencies: ['sorting'],
        },
        {
          id: 'dsa-v1-d08-q2',
          prompt: 'For the implementations in this module on n elements, what is the peak live space beyond the input array, including returned arrays, temporary slices and recursive frames? Treat element references as constant-size.',
          options: [
            'Selection O(1), insertion O(1), merge O(n)',
            'Selection O(1), insertion O(n), merge O(n)',
            'All three O(1), because a comparison sort only ever moves elements around',
            'Selection O(n), insertion O(n), merge O(n log n)',
          ],
          correct: 0,
          explanation:
            'Selection sort and insertion sort both rearrange the array in place and hold a fixed number of indices and one saved element, so their auxiliary space is constant. Insertion sort shifts elements inside the same array rather than building a second one, so insertion does not need a second n-element buffer. Merge sort writes each merge into a fresh array, so it holds O(n) elements beyond the input; that dominates the O(log n) recursion stack it also borrows, which is why the answer is O(n) and not O(n log n).',
          competencies: ['sorting', 'complexity'],
        },
        {
          id: 'dsa-v1-d08-q3',
          prompt: 'Why does `selectionSort` call `compare` exactly the same number of times on a sorted array, a reversed array and an array of identical values?',
          context: {
            language: 'javascript',
            code: 'const selectionSort = (values, compare) => {\n  for (let start = 0; start < values.length - 1; start += 1) {\n    let smallest = start;\n    for (let index = start + 1; index < values.length; index += 1) {\n      if (compare(values[index], values[smallest]) < 0) smallest = index;\n    }\n    if (smallest !== start) {\n      [values[start], values[smallest]] = [values[smallest], values[start]];\n    }\n  }\n  return values;\n};',
          },
          options: [
            'Both loop bounds come from the array length, and no comparator result can end a pass early',
            'It compares every pair of elements once, and the number of pairs depends only on the length',
            'Each swap triggers exactly one comparison, and the number of swaps is fixed at n-1',
            'The unsorted remainder is already partly ordered after each pass, so the remaining work is constant',
          ],
          correct: 0,
          explanation:
            'The inner loop runs from `start + 1` to the end whatever the comparator says; the result only ever updates `smallest`. So the count is (n-1) + (n-2) + … + 1 = n(n-1)/2 on every input. The every-pair-once claim confuses the count with the compared identities. The running minimum changes: on [3,2,1], the comparisons are (2,3), (1,2), then (3,2). The pair 2/3 is repeated while 1/3 is never compared. Fixed loop bounds, not unique element pairs, make the count input-independent. Swaps are skipped when `smallest === start`, so they are neither fixed at n-1 nor a source of comparisons. The remainder may happen to be ordered, but this implementation does not use that to shorten its next scan.',
          competencies: ['sorting', 'complexity'],
        },
        {
          id: 'dsa-v1-d08-q4',
          prompt: 'Assume merge does linear work in the combined run length, using constant-cost comparisons and writes. For powers-of-two input sizes n, illustrated here with 8 elements, which level argument gives the growth of this merge sort?',
          context: {
            language: 'javascript',
            code: 'const mergeSort = (values, compare) => {\n  if (values.length < 2) return values.slice();\n  const middle = Math.floor(values.length / 2);\n  return merge(\n    mergeSort(values.slice(0, middle), compare),\n    mergeSort(values.slice(middle), compare),\n    compare,\n  );\n};',
          },
          options: [
            'Three merge levels for 8; O(n) across each level gives O(n log n) for variable n',
            'Eight levels of merging, one per element, each doing constant work, so O(n) in total',
            'Three levels of merging, each doing O(log n) work, so O(log² n) in total',
            'Three levels of merging, but the final merge dominates the rest, so O(n) in total',
          ],
          correct: 0,
          explanation:
            'Halving 8 down to 1 takes three halvings, so there are three levels of merging, and every level touches all 8 elements once across its merges — 4 merges of 1 + 1, then 2 merges of 2 + 2, then 1 merge of 4 + 4. Three levels of n work each is 3n, and for a general n it is n log n. The level count is log₂ n, not n, which rules out the eight-level option. A level costs O(n), not O(log n), because each level moves every element. And the levels add rather than being dominated by the last one: the final merge is O(n), but so are the two below it.',
          competencies: ['sorting', 'complexity'],
        },
      ],
    },
    {
      id: 'dsa-v1-d08-selection-sort',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Selection sort, counted',
      summary: 'Sort in place by repeatedly selecting the smallest remaining element, and hit the 28 comparisons eight elements demand.',
      competencies: ['sorting', 'complexity', 'arrays-strings'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          'Write `selectionSort(values, compare)`. The caller supplies `compare(a, b)`, which returns a negative number when `a` belongs before `b`, zero when the two are interchangeable, and a positive number when `a` belongs after `b`. Sort `values` in place in the order `compare` describes, and return the same array object you were handed.\n\nEvery comparison between two elements must go through `compare`, and the grade counts the calls. The input is an ordinary dense array of at most 128 elements. The comparator consistently orders them, returns finite Numbers and does not change elements. Preserve every element reference and its multiplicity; do not clone items, change their fields, or add or alter unrelated array properties. The array is mutable. Target: O(n²) time and O(1) extra space in the usual array-length model; n is values.length and comparator calls/reference moves count as unit operations. These are finite fixture checks, not a proof of the algorithm or complexity of arbitrary source. Selection sort on eight elements makes exactly 28 of them — 8 × 7 / 2 — whatever order the elements arrived in, because no comparator result can shorten a pass. Use the shown selection method. A different count fails the fixture contract even when the result is sorted; the count alone cannot uniquely identify an arbitrary algorithm.\n\nAn empty array and a single-element array come back unchanged and cost zero comparisons. Duplicates and negative numbers are ordinary input.',
        contract: [
          'Compare two elements only by calling `compare(a, b)`; the grade counts every call.',
          'Sort in place and return the same array object, not a sorted copy.',
          'On eight elements the count must be exactly 28, so no pass may stop early and no built-in sort may do the work.',
          'An empty array and a single-element array are returned unchanged with zero comparisons.',
        ],
        starter: `const selectionSort = (values, compare) => {

};

// Scratch pad — change this before submitting.
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
          'Two loops. The outer one walks the position you are filling; the inner one scans everything to its right looking for the element that belongs there.',
          'Track the index of the smallest element you have seen, not its value. `compare(values[index], values[smallest]) < 0` means you found a new smallest.',
          'Swap with `[values[start], values[smallest]] = [values[smallest], values[start]]`. Skipping the swap when the two indices match saves a write, not a comparison, so the count stays at 28 either way.',
        ],
        approach: [
          'Walk a start position from 0 up to the second-to-last index; the last position is correct once everything before it is.',
          'Assume the element already at `start` is the smallest of what remains.',
          'Scan every later index and call `compare` against the current smallest, keeping the new index whenever the comparator returns a negative number.',
          'Swap the smallest element into `start`.',
          'Return the same array you were handed, now sorted.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct order, in place, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check the empty array, a single element, duplicates, negative values and a comparator that is not `a - b`.',
          },
          {
            id: 'selection-method',
            label: 'Exactly 28 comparisons on eight elements',
            critical: true,
            weight: 2,
            detail:
              'Selection sort scans the whole unsorted remainder on every pass, which is 8 × 7 / 2 = 28 calls to `compare` on any eight-element input. A different number fails this stated fixture contract. Matching a finite count is not proof that arbitrary source uses selection sort.',
          },
        ],
        tests: [
          { call: 'selectionSort([5, 2, 9, 1], (a, b) => a - b)', expected: [1, 2, 5, 9] },
          { call: 'selectionSort([], (a, b) => a - b)', expected: [], label: 'an empty array sorts to itself', edge: true },
          { call: 'selectionSort([7], (a, b) => a - b)', expected: [7], label: 'one element needs no comparison', edge: true },
          {
            call: 'selectionSort([4, -2, 0, -9, 3], (a, b) => a - b)',
            expected: [-9, -2, 0, 3, 4],
            label: 'negative values and zero',
            edge: true,
          },
          { call: 'selectionSort([2, 2, 1, 2], (a, b) => a - b)', expected: [1, 2, 2, 2], label: 'duplicates', edge: true },
          {
            call: '(() => { const input = [3, 1, 2]; return selectionSort(input, (a, b) => a - b) === input; })()',
            expected: true,
            label: 'the array you were handed is the array you return',
          },
          {
            call: '__countCompares([8, 3, 5, 1, 7, 2, 6, 4], function (values, compare) { return selectionSort(values, compare); }).compares',
            expected: 28,
            label: 'eight elements cost exactly twenty-eight comparisons',
            criterion: 'selection-method',
          },
        ],
        harness: COMPARE_PROBE,
      },
    },
    {
      id: 'dsa-v1-d08-insertion-sort',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Insertion sort, counted',
      summary: 'Grow a sorted prefix in place, and let the comparator end each pass: seven comparisons on sorted input, twenty-eight on reversed.',
      competencies: ['sorting', 'complexity', 'arrays-strings'],
      estimatedMinutes: 25,
      code: {
        language: 'javascript',
        prompt:
          'Write `insertionSort(values, compare)`. The caller supplies `compare(a, b)`, which returns a negative number when `a` belongs before `b`, zero when the two are interchangeable, and a positive number when `a` belongs after `b`. Sort `values` in place in the order `compare` describes, and return the same array object you were handed.\n\nEvery comparison between two elements must go through `compare`, and the grade counts the calls. The input is an ordinary dense array of at most 128 elements. The comparator consistently orders them, returns finite Numbers and does not change elements. Preserve every element reference and its multiplicity; do not clone items, change their fields, or add or alter unrelated array properties. The array is mutable. Target: O(n²) time in the worst case and O(1) extra space, where n is values.length under unit comparator/reference operations. Already sorted input is linear. These are finite fixture checks, not a proof of the algorithm or complexity of arbitrary source. Two sampled counts check the taught insertion form: on an already-sorted array of eight it must make exactly 7 comparisons — n-1, one failed comparison per pass — and on a reversed array of eight exactly 28. Getting 7 on both means an early exit that never sorted; getting 28 on both means the pass kept comparing after the element had landed.\n\nEqual elements must keep the order they arrived in. An empty array and a single-element array come back unchanged and cost zero comparisons. Duplicates and negative numbers are ordinary input.',
        contract: [
          'Compare two elements only by calling `compare(a, b)`; the grade counts every call.',
          'Sort in place and return the same array object, not a sorted copy.',
          'Stop the inner shift at the first element the comparator does not report as greater, and check the index is still in range before comparing — an already-sorted array of eight must cost exactly 7 comparisons and a reversed one exactly 28.',
          'Leave equal elements in the order they arrived: the sort must be stable.',
          'An empty array and a single-element array are returned unchanged with zero comparisons.',
        ],
        starter: `const insertionSort = (values, compare) => {

};

// Scratch pad — change this before submitting.
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
          'Positions 0 through i-1 are already sorted when pass i starts. Lift `values[i]` into a variable first, so the shifting has somewhere to write.',
          'Order the two halves of the while condition carefully: `j >= 0 && compare(values[j], current) > 0`. Testing the index first keeps the comparator from ever being asked about `values[-1]`, which would add a comparison the count does not allow.',
          'A strict `> 0` is what makes the sort stable. It stops at the first element that is not greater than `current`, so an element the comparator calls equal is never walked past.',
        ],
        approach: [
          'Walk `i` from 1 to the end; everything before `i` is already sorted.',
          'Save `values[i]` in `current`, because the shifting is about to overwrite that slot.',
          'While `j` is still a real index and `compare(values[j], current)` is positive, copy `values[j]` one place right and step `j` left.',
          'Write `current` into `values[j + 1]`, the gap the shifting left behind.',
          'Return the same array you were handed, now sorted.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct order, in place and stable, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check the empty array, a single element, duplicates, negative values, a comparator that is not `a - b`, and that equal elements keep their original order.',
          },
          {
            id: 'insertion-method',
            label: 'Seven comparisons on sorted input, twenty-eight on reversed',
            critical: true,
            weight: 2,
            detail:
              'Insertion sort stops shifting at the first element already in place, so eight sorted elements cost 7 comparisons and eight reversed elements cost 28. Another pair fails this fixture contract; it can result from extra comparisons or a misplaced index guard. Matching these samples does not uniquely identify arbitrary source.',
          },
        ],
        tests: [
          { call: 'insertionSort([5, 2, 9, 1], (a, b) => a - b)', expected: [1, 2, 5, 9] },
          { call: 'insertionSort([], (a, b) => a - b)', expected: [], label: 'an empty array sorts to itself', edge: true },
          { call: 'insertionSort([7], (a, b) => a - b)', expected: [7], label: 'one element needs no comparison', edge: true },
          {
            call: 'insertionSort([4, -2, 0, -9, 3], (a, b) => a - b)',
            expected: [-9, -2, 0, 3, 4],
            label: 'negative values and zero',
            edge: true,
          },
          { call: 'insertionSort([2, 2, 1, 2], (a, b) => a - b)', expected: [1, 2, 2, 2], label: 'duplicates', edge: true },
          {
            call: '__countCompares(__range(8), function (values, compare) { return insertionSort(values, compare); }).compares',
            expected: 7,
            label: 'eight sorted elements cost seven comparisons',
            criterion: 'insertion-method',
          },
          {
            call: '__countCompares(__reversed(8), function (values, compare) { return insertionSort(values, compare); }).compares',
            expected: 28,
            label: 'eight reversed elements cost twenty-eight',
            criterion: 'insertion-method',
          },
        ],
        harness: COMPARE_PROBE,
      },
    },
    {
      id: 'dsa-v1-d08-merge-sort',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Merge sort, stable and counted',
      summary: 'Split to single elements, merge back into a new array, and keep equal elements in the order they arrived.',
      competencies: ['sorting', 'complexity', 'arrays-strings'],
      estimatedMinutes: 30,
      code: {
        language: 'javascript',
        prompt:
          'Write `mergeSort(values, compare)`. The caller supplies `compare(a, b)`, which returns a negative number when `a` belongs before `b`, zero when the two are interchangeable, and a positive number when `a` belongs after `b`. Return a **new** array holding the same elements in the order `compare` describes. The array you were handed must still hold its original elements in their original order when you return.\n\nEvery comparison between two elements must go through `compare`, and the grade counts the calls. The input is an ordinary dense array of at most 128 elements. The comparator consistently orders them, returns finite Numbers and does not change elements. Preserve every element reference and its multiplicity; do not clone items, change their fields, or add or alter unrelated array properties. The input may be frozen. Target: O(n log n) time and O(n) extra space as peak additional live references, where n is values.length under unit comparator/reference operations; cumulative allocations and physical heap timing are different measures. These are finite fixture checks, not a proof of the algorithm or complexity of arbitrary source. Splitting eight elements down to singles and merging back costs between 12 and 24 comparisons — never more than 8 × log₂ 8 = 24 — and exactly 12 on an array that is already sorted, because every merge there exhausts its left run and appends the rest of the right run without comparing. Use recursive splitting and merging; the sampled counts are not a universal test of which algorithm arbitrary source uses.\n\nThe sort must be stable: when the comparator reports a tie, the element that came first in the input must come first in the output. The grade checks that by sorting records with repeated keys and reading their tags back.\n\nAn empty array and a single-element array come back as new arrays with the same contents. Duplicates and negative numbers are ordinary input.',
        contract: [
          'Compare two elements only by calling `compare(a, b)`; the grade counts every call.',
          'Return a new array. The input array must be unchanged — same length, same elements, same order — when you return.',
          'Split in half, sort each half by recursion, and merge. On eight elements that costs between 12 and 24 comparisons, and on an already-sorted array of eight it costs exactly 12.',
          'Append the rest of a run without comparing once the other run empties; those elements are already in order relative to each other.',
          'Take from the left run when the comparator reports a tie, so equal elements keep the order they arrived in.',
          'An empty array and a single-element array come back as new arrays with the same contents.',
        ],
        starter: `const mergeSort = (values, compare) => {

};

// Scratch pad — change this before submitting.
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
          'An array of 0 or 1 elements is already sorted, so return `values.slice()` and stop. Everything longer splits at the middle with two more `slice` calls.',
          'The merge walks two sorted arrays with one index each. Call `compare(left[i], right[j])` once per step and push the winner; a result of 0 or less means the left element goes first, which is what keeps the sort stable.',
          'When one run runs out, append the rest of the other without comparing anything — those elements are already in order relative to each other, and the free appends are why a sorted input costs only 12 comparisons.',
        ],
        approach: [
          'Return a copy when the array holds fewer than two elements; returning the input itself would fail the new-array requirement.',
          'Split at the middle index into a left half and a right half.',
          'Call `mergeSort` on each half, which hands you back two sorted arrays.',
          'Merge them: while both still have elements, compare the two fronts once and move the smaller across, preferring the left one on a tie.',
          'Append whatever remains of the run that did not empty, and return the merged array.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct order in a new array, with the input left untouched',
            critical: true,
            weight: 3,
            detail: 'Check the empty array, a single element, an odd length, duplicates, negative values, a comparator that is not `a - b`, and that the input array still reads the way it did.',
          },
          {
            id: 'merge-method',
            label: 'Twelve to twenty-four comparisons on eight elements, twelve when sorted, and stable',
            critical: true,
            weight: 2,
            detail:
              'Splitting eight elements to singles and merging back costs between 12 and 24 calls to `compare`, and exactly 12 on an already-sorted array, where every merge exhausts its left run and appends the rest for free. The merge must also take from the left run on a tie. Counts outside this fixture budget or changed tie order fail the stated contract. Matching finite counts does not prove arbitrary source is merge sort.',
          },
        ],
        tests: [
          { call: 'mergeSort([5, 2, 9, 1], (a, b) => a - b)', expected: [1, 2, 5, 9] },
          { call: 'mergeSort([], (a, b) => a - b)', expected: [], label: 'an empty array sorts to a new empty array', edge: true },
          { call: 'mergeSort([7], (a, b) => a - b)', expected: [7], label: 'one element needs no comparison', edge: true },
          {
            call: 'mergeSort([4, -2, 0, -9, 3, -2, 4], (a, b) => a - b)',
            expected: [-9, -2, -2, 0, 3, 4, 4],
            label: 'negative values, duplicates and an odd length',
            edge: true,
          },
          {
            call: '(() => { const input = [3, 1, 2]; const out = mergeSort(input, (a, b) => a - b); return out !== input && input.join() === "3,1,2"; })()',
            expected: true,
            label: 'a new array comes back and the input is left as it was',
          },
          {
            call: '(() => { const mixed = __countCompares([8, 3, 5, 1, 7, 2, 6, 4], function (values, compare) { return mergeSort(values, compare); }); const sorted = __countCompares(__range(8), function (values, compare) { return mergeSort(values, compare); }); return mixed.compares >= 12 && mixed.compares <= 24 && sorted.compares === 12; })()',
            expected: true,
            label: 'twelve to twenty-four comparisons on eight elements, and exactly twelve when they arrive sorted',
            criterion: 'merge-method',
          },
          {
            call: '__tags(mergeSort(__tagged(), __byKey))',
            expected: 'bdface',
            label: 'records with equal keys keep the order they arrived in',
            criterion: 'merge-method',
          },
        ],
        harness: MERGE_PROBE,
      },
    },
  ],
  requires: [
    { activityId: 'dsa-v1-d08-checks', state: 'verified_pass' },
    { activityId: 'dsa-v1-d08-selection-sort', state: 'verified_pass' },
    { activityId: 'dsa-v1-d08-insertion-sort', state: 'verified_pass' },
    { activityId: 'dsa-v1-d08-merge-sort', state: 'verified_pass' },
  ],
};
