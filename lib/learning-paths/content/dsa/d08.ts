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
  lessons: [
    {
      id: 'dsa-v1-d08-l1',
      title: 'Two quadratic sorts, and what stable means',
      summary: 'Selection sort against insertion sort: the same growth class, a very different comparison count, and only one of them stable.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Algorithms', url: 'https://cs50.harvard.edu/x/weeks/3/', reviewedOn: '2026-09-08' },
        {
          label: 'MDN — Array.prototype.sort',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A sort rearranges a collection so that a comparison function agrees with the order it ends up in. Every sort in this module takes that function as an argument: `compare(a, b)` returns a negative number when `a` belongs before `b`, zero when the two are interchangeable, and a positive number when `a` belongs after `b`. That is the same contract `Array.prototype.sort` uses, and routing every comparison through it is what lets you sort numbers, strings and records with one routine.',
        },
        {
          kind: 'prose',
          body:
            'Selection sort works the way most people sort a hand of cards they cannot fan out: look through everything that is left, find the smallest, put it at the front, repeat on what remains. After k passes the first k positions hold the k smallest elements and never move again.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const selectionSort = (values, compare) => {\n  for (let start = 0; start < values.length - 1; start += 1) {\n    let smallest = start;\n\n    for (let index = start + 1; index < values.length; index += 1) {\n      if (compare(values[index], values[smallest]) < 0) smallest = index;\n    }\n\n    if (smallest !== start) {\n      [values[start], values[smallest]] = [values[smallest], values[start]];\n    }\n  }\n\n  return values;\n};',
          caption: 'Selection sort: one scan per position, tracking the index of the smallest element seen so far.',
        },
        {
          kind: 'trace',
          caption: 'Selection sort on four elements: six comparisons, which is 4 × 3 / 2.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['4', '2', '7', '1'],
                note: 'The array before the first pass. No position is settled yet.',
                counter: { label: 'Comparisons', value: 0 },
              },
              {
                cells: ['4', '2', '7', '1'],
                marks: [
                  { index: 0, role: 'active' },
                  { index: 1, role: 'compare' },
                  { index: 2, role: 'compare' },
                  { index: 3, role: 'compare' },
                ],
                note: 'Pass one fills position 0. It compares every one of the three elements to its right against the smallest found so far and settles on 1. Three comparisons.',
                counter: { label: 'Comparisons', value: 3 },
              },
              {
                cells: ['1', '2', '7', '4'],
                marks: [{ index: 0, role: 'settled' }],
                note: '1 swaps into position 0, and 4 takes the place 1 came from. Position 0 is settled and never moves again.',
                counter: { label: 'Comparisons', value: 3 },
              },
              {
                cells: ['1', '2', '7', '4'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'active' },
                  { index: 2, role: 'compare' },
                  { index: 3, role: 'compare' },
                ],
                note: 'Pass two fills position 1. It compares 7 and then 4 against 2 and keeps 2. Two comparisons, and no swap is needed.',
                counter: { label: 'Comparisons', value: 5 },
              },
              {
                cells: ['1', '2', '7', '4'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'active' },
                  { index: 3, role: 'compare' },
                ],
                note: 'Pass three fills position 2. It compares 4 against 7 and finds 4 smaller. One comparison.',
                counter: { label: 'Comparisons', value: 6 },
              },
              {
                cells: ['1', '2', '4', '7'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'settled' },
                ],
                note: '4 and 7 swap, which leaves the last position correct without a pass of its own. Six comparisons for four elements: 3 + 2 + 1.',
                counter: { label: 'Comparisons', value: 6 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Count those passes for a general n and you get (n-1) + (n-2) + … + 1, which is n(n-1)/2. For eight elements that is 28. The number never changes, because neither loop bound depends on a comparator result: the inner loop always runs to the end of the array, and no comparison can cut a pass short. Selection sort spends 28 comparisons on an already-sorted array of eight, on a reversed one, and on eight copies of the same value. Moves are a separate cost, and selection sort is lopsided about the two: n(n-1)/2 comparisons but at most n-1 swaps, one per pass. When moving an element is expensive and comparing two is cheap, that trade is the reason to reach for it.',
        },
        {
          kind: 'prose',
          body:
            'Insertion sort grows a sorted prefix instead. Positions 0 through i-1 are already in order; take the element at i, walk left past everything greater than it, and drop it into the gap. The elements it walks past each shift one place right to make room.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const insertionSort = (values, compare) => {\n  for (let i = 1; i < values.length; i += 1) {\n    const current = values[i];\n    let j = i - 1;\n\n    while (j >= 0 && compare(values[j], current) > 0) {\n      values[j + 1] = values[j];\n      j -= 1;\n    }\n\n    values[j + 1] = current;\n  }\n\n  return values;\n};',
          caption: 'Insertion sort: the `j >= 0` guard comes first, so the comparator is never asked about an element that is not there.',
        },
        {
          kind: 'prose',
          body:
            'Here the comparator result does control the loop. On an already-sorted array the very first comparison of each pass fails, the shift loop never runs, and the whole sort costs n-1 comparisons — 7 for eight elements. On a reversed array every pass walks the entire prefix, giving 1 + 2 + … + (n-1) = n(n-1)/2, back to 28. Same growth class as selection sort in the worst case, linear in the best.',
        },
        {
          kind: 'table',
          caption: 'Comparisons on eight elements, counted by hand rather than timed.',
          headers: ['Input', 'Selection sort', 'Insertion sort', 'Bubble sort with an early exit'],
          rows: [
            ['Already sorted', '28', '7', '7'],
            ['Reversed', '28', '28', '28'],
            ['Random order', '28', 'Between 7 and 28', 'Between 7 and 28'],
          ],
        },
        {
          kind: 'prose',
          body:
            'A sort is stable when elements the comparator calls equal come out in the order they went in. Sort a list of orders by customer, then sort the result by date, and a stable second sort leaves each date grouped by customer. An unstable one scrambles that grouping, and you have to sort by a compound key instead.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "const scores = [\n  { name: 'Ada', points: 7 },\n  { name: 'Ben', points: 5 },\n  { name: 'Cleo', points: 7 },\n];\n\n// compare only looks at points, so Ada and Cleo are equal to it.\nconst byPoints = (a, b) => a.points - b.points;\n\n// A stable sort gives Ben, Ada, Cleo. An unstable one may give Ben, Cleo, Ada.",
          caption: 'Stability is only visible when the comparator reports a tie.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Insertion sort is stable as written above, because `compare(values[j], current) > 0` stops at the first element that is not strictly greater, so an equal element is never walked past. Change that `> 0` to `>= 0` and the sort still returns the right values in the right order but is no longer stable. Selection sort is unstable for a different reason: its swap throws a distant element into the gap, over the top of equal elements in between.',
        },
        {
          kind: 'trace',
          caption: 'Bubble sort on the same four elements: neighbours only, and the largest element settles at the end of each pass.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['4', '2', '7', '1'],
                note: 'The array before the first pass. Bubble sort only ever compares neighbours.',
                counter: { label: 'Comparisons', value: 0 },
              },
              {
                cells: ['4', '2', '7', '1'],
                marks: [
                  { index: 0, role: 'compare' },
                  { index: 1, role: 'compare' },
                ],
                note: 'Compare the neighbours at positions 0 and 1. 4 is greater than 2, so the pair swaps.',
                counter: { label: 'Comparisons', value: 1 },
              },
              {
                cells: ['2', '4', '7', '1'],
                marks: [
                  { index: 1, role: 'compare' },
                  { index: 2, role: 'compare' },
                ],
                note: 'After the swap, compare 4 and 7. They are already in order, so nothing moves.',
                counter: { label: 'Comparisons', value: 2 },
              },
              {
                cells: ['2', '4', '7', '1'],
                marks: [
                  { index: 2, role: 'compare' },
                  { index: 3, role: 'compare' },
                ],
                note: 'Compare 7 and 1. 7 is greater, so they swap and 7 reaches the last position.',
                counter: { label: 'Comparisons', value: 3 },
              },
              {
                cells: ['2', '4', '1', '7'],
                marks: [{ index: 3, role: 'settled' }],
                note: 'The first pass is over after three comparisons. The largest element has reached the end, so the next pass can stop one place earlier.',
                counter: { label: 'Comparisons', value: 3 },
              },
              {
                cells: ['2', '1', '4', '7'],
                marks: [
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'settled' },
                ],
                note: 'The second pass compares 2 with 4 and leaves them alone, then compares 4 with 1 and swaps. Two more comparisons, and 4 settles beside 7.',
                counter: { label: 'Comparisons', value: 5 },
              },
              {
                cells: ['1', '2', '4', '7'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'settled' },
                ],
                note: 'The third pass compares 2 with 1 and swaps them. Six comparisons in total, the same 4 × 3 / 2 that selection sort spent on this array.',
                counter: { label: 'Comparisons', value: 6 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Bubble sort is here to be read, not written. It is stable and it works in place, but it moves data more than insertion sort does: both perform one operation per inverted pair, and bubble sort makes that operation a swap where insertion sort makes it a single shift. Nothing in this path asks you to implement it. The two you will write are selection sort and insertion sort, both O(n²) in the worst case and both using O(1) auxiliary space.',
        },
      ],
    },
    {
      id: 'dsa-v1-d08-l2',
      title: 'Merge sort: divide, merge, and the cost of the buffer',
      summary: 'Why splitting to single elements and merging back costs O(n log n), and what the linear buffer buys.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Algorithms', url: 'https://cs50.harvard.edu/x/weeks/3/', reviewedOn: '2026-09-08' },
        {
          label: 'MDN — Array.prototype.slice',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'Merge sort rests on one observation: two arrays that are each already sorted can be combined into one sorted array in a single pass, without ever looking backwards. So split the input in half, sort each half the same way, and merge the two results. An array of one element is sorted already, which ends the recursion.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const mergeSort = (values, compare) => {\n  if (values.length < 2) return values.slice();\n\n  const middle = Math.floor(values.length / 2);\n  const left = mergeSort(values.slice(0, middle), compare);\n  const right = mergeSort(values.slice(middle), compare);\n\n  return merge(left, right, compare);\n};',
          caption: 'The divide half. `slice` copies, which is where the extra space comes from.',
        },
        {
          kind: 'prose',
          body:
            'The merge is the part that does the work. Keep an index into each sorted run. Compare the two front elements, move the smaller one to the output, advance that index, and repeat. When one run empties, everything left in the other run is already in order and gets appended without a single further comparison.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const merge = (left, right, compare) => {\n  const out = [];\n  let i = 0;\n  let j = 0;\n\n  while (i < left.length && j < right.length) {\n    if (compare(left[i], right[j]) <= 0) out.push(left[i++]);\n    else out.push(right[j++]);\n  }\n\n  while (i < left.length) out.push(left[i++]);\n  while (j < right.length) out.push(right[j++]);\n\n  return out;\n};',
          caption: 'One comparison per element moved out of the contested region, and none after a run empties.',
        },
        {
          kind: 'trace',
          caption: 'Merging two sorted runs of three: five comparisons, and the last element crosses for free.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['2', '5', '8', '1', '4', '9'],
                marks: [
                  { index: 0, role: 'active' },
                  { index: 3, role: 'active' },
                ],
                note: 'Two runs that are each already sorted: positions 0 to 2 hold 2, 5, 8 and positions 3 to 5 hold 1, 4, 9. The output starts empty and both fronts are ready.',
                counter: { label: 'Comparisons', value: 0 },
              },
              {
                cells: ['2', '5', '8', '1', '4', '9'],
                marks: [
                  { index: 0, role: 'compare' },
                  { index: 3, role: 'settled' },
                  { index: 4, role: 'compare' },
                ],
                note: 'Compare the fronts 2 and 1. The right one is smaller, so 1 moves to the output and the right run advances. Output so far: 1.',
                counter: { label: 'Comparisons', value: 1 },
              },
              {
                cells: ['2', '5', '8', '1', '4', '9'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'compare' },
                  { index: 3, role: 'settled' },
                  { index: 4, role: 'compare' },
                ],
                note: 'Compare 2 and 4. The left one is smaller, so 2 moves out and the left run advances. Output so far: 1, 2.',
                counter: { label: 'Comparisons', value: 2 },
              },
              {
                cells: ['2', '5', '8', '1', '4', '9'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'compare' },
                  { index: 3, role: 'settled' },
                  { index: 4, role: 'settled' },
                  { index: 5, role: 'compare' },
                ],
                note: 'Compare 5 and 4. The right one wins this time. Output so far: 1, 2, 4.',
                counter: { label: 'Comparisons', value: 3 },
              },
              {
                cells: ['2', '5', '8', '1', '4', '9'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'compare' },
                  { index: 3, role: 'settled' },
                  { index: 4, role: 'settled' },
                  { index: 5, role: 'compare' },
                ],
                note: 'Compare 5 and 9. The left one wins. Output so far: 1, 2, 4, 5.',
                counter: { label: 'Comparisons', value: 4 },
              },
              {
                cells: ['2', '5', '8', '1', '4', '9'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'settled' },
                  { index: 4, role: 'settled' },
                  { index: 5, role: 'compare' },
                ],
                note: 'Compare 8 and 9. The left one wins and the left run is now empty. Output so far: 1, 2, 4, 5, 8.',
                counter: { label: 'Comparisons', value: 5 },
              },
              {
                cells: ['1', '2', '4', '5', '8', '9'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'settled' },
                  { index: 4, role: 'settled' },
                  { index: 5, role: 'settled' },
                ],
                note: 'With the left run empty, 9 is appended without another comparison. Six elements merged in five comparisons, which is the most a merge of two runs of three can cost.',
                counter: { label: 'Comparisons', value: 5 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'A merge of two runs holding n elements between them costs at most n-1 comparisons, because every comparison sends exactly one element to the output and the last one arrives for free. That bound is what makes the level argument work.',
        },
        {
          kind: 'prose',
          body:
            'Lay the recursion out by level instead of by call. Level one merges pairs of single elements, level two merges pairs of runs of two, level three merges the two halves. Every level touches all eight elements once, so every level costs O(n). The only question left is how many levels there are.',
        },
        {
          kind: 'table',
          caption: 'Merge sort on eight elements, counted level by level.',
          headers: ['Level', 'Merges performed', 'Elements touched', 'Comparisons at most'],
          rows: [
            ['1', 'Four merges of 1 + 1', '8', '4'],
            ['2', 'Two merges of 2 + 2', '8', '6'],
            ['3', 'One merge of 4 + 4', '8', '7'],
            ['Total', 'Three levels', '24', '17'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Eight halves to four, four to two, two to one: three halvings, so three levels of merging. That is log₂ 8. Each level costs at most n comparisons and there are log₂ n of them, giving O(n log n). Doubling the input to sixteen adds one level, not a second copy of the whole cost, which is why merge sort keeps working on inputs where a quadratic sort stops finishing.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'The 17 in that table is an upper bound, not a fixed count. On an already-sorted array of eight the same merge sort spends only 12 comparisons, because each merge exhausts one run early and appends the rest for free. Selection sort has no equivalent: its 28 is the same number on every input.',
        },
        {
          kind: 'prose',
          body:
            'The buffer is the bill. Each merge writes into a fresh array, so a merge sort holds O(n) elements of auxiliary space beyond the input — the version above allocates it through `slice` and `push`. The recursion also borrows O(log n) stack frames, which the linear buffer swallows. Selection sort and insertion sort need O(1) auxiliary space, and that is the trade you are making.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Stability lives in one character. `compare(left[i], right[j]) <= 0` takes from the left run when the comparator reports a tie, which keeps equal elements in their original relative order because everything in the left run came first. Write `< 0` instead and the right element wins ties, so equal elements come back reversed.',
        },
        {
          kind: 'prose',
          body:
            'Quicksort reaches the same average O(n log n) while sorting in place, but it partitions instead of merging, degrades to O(n²) on a bad pivot choice and is not stable in its usual form; this path traces and implements merge sort only.',
        },
        {
          kind: 'prose',
          body:
            'Which to reach for, then. Insertion sort wins on short arrays and on arrays that are nearly sorted already, which is why production sorts switch to it for small runs. Merge sort wins when n grows and the extra array is affordable. Selection sort is mostly here to be understood: its one real advantage is the small number of writes it makes.',
        },
      ],
    },
  ],
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
            'A report is sorted by customer name, then sorted again by order date. Rows sharing a date must stay grouped by customer. Which of the three sorts in this module can perform that second sort on their own and preserve the grouping?',
          options: [
            'Insertion sort and merge sort, provided the merge takes from the left run when the comparator reports a tie',
            'Selection sort and merge sort, because both compare every pair of elements exactly once',
            'Selection sort only, because it performs the fewest swaps of the three',
            'None of the three, because a comparator that returns zero leaves the resulting order undefined',
          ],
          correct: 0,
          explanation:
            'Insertion sort stops shifting at the first element that is not strictly greater, so it never walks past an equal element, and merge sort keeps ties in order as long as `<= 0` sends the left run first. Selection sort is the unstable one, which rules out the second and third options: its swap drops a distant element into the gap and jumps over any equal elements in between. The second option also misdescribes the work, since selection sort checks each remaining element against a running minimum rather than each element against every other. Swap count says nothing about stability, and a comparator returning zero is the case a stable sort defines rather than leaves open.',
          competencies: ['sorting'],
        },
        {
          id: 'dsa-v1-d08-q2',
          prompt: 'For an input of n elements, what auxiliary space — the memory used beyond the input array itself — do selection sort, insertion sort and the merge sort from this lesson need?',
          options: [
            'Selection O(1), insertion O(1), merge O(n)',
            'Selection O(1), insertion O(n), merge O(n)',
            'All three O(1), because a comparison sort only ever moves elements around',
            'Selection O(n), insertion O(n), merge O(n log n)',
          ],
          correct: 0,
          explanation:
            'Selection sort and insertion sort both rearrange the array in place and hold a fixed number of indices and one saved element, so their auxiliary space is constant. Insertion sort shifts elements inside the same array rather than building a second one, which rules out the second option. Merge sort writes each merge into a fresh array, so it holds O(n) elements beyond the input; that dominates the O(log n) recursion stack it also borrows, which is why the answer is O(n) and not O(n log n).',
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
            'The inner loop runs from `start + 1` to the end whatever the comparator says; the result only ever updates `smallest`. So the count is (n-1) + (n-2) + … + 1 = n(n-1)/2 on every input. The second option reaches that same number through a mechanism selection sort does not use: it checks each remaining element against a running minimum, never one element against every other, so the count by itself is not what makes the input irrelevant — the fixed loop bounds are. Swaps are skipped when `smallest === start`, so they are neither fixed at n-1 nor a source of comparisons. And the remainder is not partly ordered; selection sort learns nothing about it between passes.',
          competencies: ['sorting', 'complexity'],
        },
        {
          id: 'dsa-v1-d08-q4',
          prompt: 'A merge sort runs on 8 elements. Which description of its cost is right, and why?',
          context: {
            language: 'javascript',
            code: 'const mergeSort = (values, compare) => {\n  if (values.length < 2) return values.slice();\n  const middle = Math.floor(values.length / 2);\n  return merge(\n    mergeSort(values.slice(0, middle), compare),\n    mergeSort(values.slice(middle), compare),\n    compare,\n  );\n};',
          },
          options: [
            'Three levels of merging, each doing O(n) work across its merges, so O(n log n) in total',
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
          'Write `selectionSort(values, compare)`. The caller supplies `compare(a, b)`, which returns a negative number when `a` belongs before `b`, zero when the two are interchangeable, and a positive number when `a` belongs after `b`. Sort `values` in place in the order `compare` describes, and return the same array object you were handed.\n\nEvery comparison between two elements must go through `compare`, and the grade counts the calls. Selection sort on eight elements makes exactly 28 of them — 8 × 7 / 2 — whatever order the elements arrived in, because no comparator result can shorten a pass. A built-in sort, an insertion sort, or a pass that exits early will produce a different number and fail the method criterion even when the values come back in the right order.\n\nAn empty array and a single-element array come back unchanged and cost zero comparisons. Duplicates and negative numbers are ordinary input.',
        contract: [
          'Compare two elements only by calling `compare(a, b)`; the grade counts every call.',
          'Sort in place and return the same array object, not a sorted copy.',
          'On eight elements the count must be exactly 28, so no pass may stop early and no built-in sort may do the work.',
          'An empty array and a single-element array are returned unchanged with zero comparisons.',
        ],
        starter: `const selectionSort = (values, compare) => {

};

// Scratch pad — change this and press Run.
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
              'Selection sort scans the whole unsorted remainder on every pass, which is 8 × 7 / 2 = 28 calls to `compare` on any eight-element input. A different number means something else produced the answer: a built-in sort, an insertion sort, or a pass that stopped early.',
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
          'Write `insertionSort(values, compare)`. The caller supplies `compare(a, b)`, which returns a negative number when `a` belongs before `b`, zero when the two are interchangeable, and a positive number when `a` belongs after `b`. Sort `values` in place in the order `compare` describes, and return the same array object you were handed.\n\nEvery comparison between two elements must go through `compare`, and the grade counts the calls. Two counts identify insertion sort together: on an already-sorted array of eight it must make exactly 7 comparisons — n-1, one failed comparison per pass — and on a reversed array of eight exactly 28. Getting 7 on both means an early exit that never sorted; getting 28 on both means the pass kept comparing after the element had landed.\n\nEqual elements must keep the order they arrived in. An empty array and a single-element array come back unchanged and cost zero comparisons. Duplicates and negative numbers are ordinary input.',
        contract: [
          'Compare two elements only by calling `compare(a, b)`; the grade counts every call.',
          'Sort in place and return the same array object, not a sorted copy.',
          'Stop the inner shift at the first element the comparator does not report as greater, and check the index is still in range before comparing — an already-sorted array of eight must cost exactly 7 comparisons and a reversed one exactly 28.',
          'Leave equal elements in the order they arrived: the sort must be stable.',
          'An empty array and a single-element array are returned unchanged with zero comparisons.',
        ],
        starter: `const insertionSort = (values, compare) => {

};

// Scratch pad — change this and press Run.
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
              'Insertion sort stops shifting at the first element already in place, so eight sorted elements cost 7 comparisons and eight reversed elements cost 28. Any other pair of numbers means a different algorithm ran, the inner loop kept comparing after the element landed, or the index guard came after the comparison.',
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
          'Write `mergeSort(values, compare)`. The caller supplies `compare(a, b)`, which returns a negative number when `a` belongs before `b`, zero when the two are interchangeable, and a positive number when `a` belongs after `b`. Return a **new** array holding the same elements in the order `compare` describes. The array you were handed must still hold its original elements in their original order when you return.\n\nEvery comparison between two elements must go through `compare`, and the grade counts the calls. Splitting eight elements down to singles and merging back costs between 12 and 24 comparisons — never more than 8 × log₂ 8 = 24 — and exactly 12 on an array that is already sorted, because every merge there exhausts its left run and appends the rest of the right run without comparing. A built-in sort called on a copy lands outside those numbers.\n\nThe sort must be stable: when the comparator reports a tie, the element that came first in the input must come first in the output. The grade checks that by sorting records with repeated keys and reading their tags back.\n\nAn empty array and a single-element array come back as new arrays with the same contents. Duplicates and negative numbers are ordinary input.',
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

// Scratch pad — change this and press Run.
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
              'Splitting eight elements to singles and merging back costs between 12 and 24 calls to `compare`, and exactly 12 on an already-sorted array, where every merge exhausts its left run and appends the rest for free. The merge must also take from the left run on a tie. A count outside those numbers, or equal elements coming back in a different order, means something other than a merge sort produced the answer.',
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
