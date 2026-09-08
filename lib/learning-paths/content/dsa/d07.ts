/** D07 — Linear and binary search.
 *
 * The module where a precondition starts paying for itself. A linear scan
 * asks nothing of the data and costs a visit per element; a binary search
 * asks for ascending order and buys back a halving per comparison. Two
 * lessons, four objective checks, three coding exercises.
 *
 * The middle exercise authors no body: it reuses the ordinary JavaScript task
 * `js-binary-search`, reachable here through path enrollment rather than the
 * tier ladder, and its pass records path evidence only.
 *
 * The two exercises that do carry a body are graded on read counts through a
 * Proxy declared in the task harness. That is a bounded contract — this
 * routine stayed inside the stated budget on these inputs — and never a proof
 * about arbitrary code. */

import type { ModuleSource } from '../../types';
import type { TraceFrame } from '../../../../shared/learning-path-api';

/** Counts index reads on a plain array by proxying it, so a learner writes
 * ordinary JavaScript and the grade still sees how often they touched the
 * input. Appended after the learner's code, so it cannot be shadowed. */
const READ_PROBE = `
var __countReads = function (values, run) {
  var reads = 0;
  var proxy = new Proxy(values, {
    get: function (target, prop) {
      if (typeof prop === 'string' && /^[0-9]+$/.test(prop)) reads += 1;
      return target[prop];
    },
  });
  var result = run(proxy);
  return { result: result, reads: reads };
};
`.trim();

/** The read counter plus two 64-element sorted fixtures. `__blocks64` holds
 * eight runs of eight, so a first-occurrence answer sits well inside a run;
 * `__same64` is one run of sixty-four, which is where finding any match and
 * then walking left blows the budget. */
const SORTED_PROBE = `${READ_PROBE}
var __blocks64 = function () {
  var values = [];
  for (var i = 0; i < 64; i += 1) values.push(Math.floor(i / 8) * 10);
  return values;
};
var __same64 = function () {
  var values = [];
  for (var i = 0; i < 64; i += 1) values.push(5);
  return values;
};`;

/** Marks for one frame of the binary-search trace over sixteen cells: every
 * index outside the live interval is ruled out, and `focus` is the middle
 * element this step reads. Written once because sixteen cells make a long
 * literal repeated five times. */
const intervalMarks = (low: number, high: number, focus: number, role: 'compare' | 'settled'): NonNullable<TraceFrame['marks']> => {
  const marks: NonNullable<TraceFrame['marks']> = [];
  for (let index = 0; index < 16; index += 1) {
    if (index < low || index > high) marks.push({ index, role: 'excluded' });
  }
  marks.push({ index: focus, role });
  return marks;
};

const SIXTEEN = ['2', '5', '8', '12', '16', '23', '28', '31', '35', '42', '47', '53', '58', '61', '67', '70'];

export const DSA_D07: ModuleSource = {
  id: 'dsa-v1-d07',
  title: 'Linear and binary search',
  outcomes: [
    'Choose between a linear scan and a binary search from the order of the data and the number of lookups you expect.',
    'State the precondition binary search relies on, the invariant its loop keeps, and what a violated precondition produces.',
    'Implement the lower-bound variant that returns where a run of equal values starts, and give its cost.',
  ],
  competencies: ['searching', 'complexity', 'arrays-strings'],
  dependsOn: ['dsa-v1-d01', 'dsa-v1-d02'],
  estimatedMinutes: 110,
  lessons: [
    {
      id: 'dsa-v1-d07-l1',
      title: 'Linear search, and when it is the right answer',
      summary: 'The search that asks nothing of the data: what it costs, where it stops, and the cases where nothing cheaper applies.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Algorithms', url: 'https://cs50.harvard.edu/x/weeks/3/', reviewedOn: '2026-09-08' },
        {
          label: 'MDN — Array.prototype.indexOf',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A linear search walks the collection from one end and stops at the first element that matches. It asks nothing of the data: no order, no index, no preparation. That is its whole appeal, and it is why every other search in this path is measured against it.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const linearScan = (values, target) => {\n  for (let index = 0; index < values.length; index += 1) {\n    if (values[index] === target) return index;\n  }\n  return -1;\n};',
          caption: 'The whole algorithm: read, compare, return on a match, and -1 when the walk runs out.',
        },
        {
          kind: 'example',
          language: 'javascript',
          code: `const sorted = [1, 4, 7, 9, 12, 15, 21, 30, 44, 51];

const binarySearch = (values, target) => {
  let comparisons = 0;
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    comparisons += 1;
    if (values[mid] === target) return { index: mid, comparisons };
    if (values[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return { index: -1, comparisons };
};

console.log("found 44:", binarySearch(sorted, 44));
console.log("missing 43:", binarySearch(sorted, 43));`,
          caption: 'Binary search over ten sorted values, counting the comparisons it actually makes.',
          note: 'Double the length of the list and see how little the comparison count moves. Then unsort it and watch the answer stop being trustworthy.',
        },
        {
          kind: 'prose',
          body:
            'The `return` inside the loop is doing real work. Without it the scan reads every element on every call, which turns a lucky hit at index 0 into n reads. With it, the cost depends on where the target sits: one read when it is first, n reads when it is last or absent.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Those are three different cost functions on the same routine. The best case is 1 read, the worst case is n reads, and a target that is present at a uniformly random position averages about n/2. All three are O(n) as an upper bound; only the worst case makes O(n) the tightest thing you can say.',
        },
        {
          kind: 'trace',
          caption: 'Scanning six unsorted values for 7, counting each element read.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['12', '5', '9', '5', '7', '3'],
                marks: [{ index: 0, role: 'active' }],
                note: 'The scan starts at index 0. Nothing has been read yet.',
                counter: { label: 'Reads', value: 0 },
              },
              {
                cells: ['12', '5', '9', '5', '7', '3'],
                marks: [{ index: 0, role: 'excluded' }, { index: 1, role: 'active' }],
                note: 'Index 0 holds 12, which is not 7, so the scan moves on. One read.',
                counter: { label: 'Reads', value: 1 },
              },
              {
                cells: ['12', '5', '9', '5', '7', '3'],
                marks: [{ index: 0, role: 'excluded' }, { index: 1, role: 'excluded' }, { index: 2, role: 'active' }],
                note: 'Index 1 holds 5, which is not 7. Two reads.',
                counter: { label: 'Reads', value: 2 },
              },
              {
                cells: ['12', '5', '9', '5', '7', '3'],
                marks: [
                  { index: 0, role: 'excluded' },
                  { index: 1, role: 'excluded' },
                  { index: 2, role: 'excluded' },
                  { index: 3, role: 'active' },
                ],
                note: 'Index 2 holds 9, which is not 7. Three reads.',
                counter: { label: 'Reads', value: 3 },
              },
              {
                cells: ['12', '5', '9', '5', '7', '3'],
                marks: [
                  { index: 0, role: 'excluded' },
                  { index: 1, role: 'excluded' },
                  { index: 2, role: 'excluded' },
                  { index: 3, role: 'excluded' },
                  { index: 4, role: 'active' },
                ],
                note: 'Index 3 holds 5, which is not 7 either. Four reads.',
                counter: { label: 'Reads', value: 4 },
              },
              {
                cells: ['12', '5', '9', '5', '7', '3'],
                marks: [
                  { index: 0, role: 'excluded' },
                  { index: 1, role: 'excluded' },
                  { index: 2, role: 'excluded' },
                  { index: 3, role: 'excluded' },
                  { index: 4, role: 'settled' },
                ],
                note: 'Index 4 holds 7, so the scan returns 4 and never reads index 5. Five reads for a six-element array.',
                counter: { label: 'Reads', value: 5 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Nothing in that walk depended on the values ascending. Move the 7 anywhere and the routine still finds it, at a cost that changes but never breaks. A binary search on the same array would answer wrongly, which is the trade the next lesson spells out.',
        },
        {
          kind: 'prose',
          body:
            'A linear scan is the right answer more often than its reputation suggests. Unsorted data with one lookup coming: sorting first costs more than the scan you were trying to avoid. A handful of elements: the constant factors dominate and the scan wins outright. A predicate rather than an equality test: "the first order over 500 CZK" has no sorted key to bisect on unless you built one.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const findFirst = (values, matches) => {\n  for (let index = 0; index < values.length; index += 1) {\n    if (matches(values[index])) return index;\n  }\n  return -1;\n};\n\nfindFirst(orders, order => order.total > 500);',
          caption: 'The same walk with a predicate. Binary search has no way in here: the array is not ordered by the thing being tested.',
        },
        {
          kind: 'prose',
          body:
            'Structure matters too. A singly linked list has no index to bisect on, so reaching the middle node already costs a walk of half the list. Searching one is linear whatever you do, which is why D05 pairs cheap insertion at a known position with expensive lookup.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Recursive "scan the rest" implementations often hide a copy. `search(values.slice(1), target)` reads and allocates the whole tail on every step, so a linear routine turns quadratic in time and linear in auxiliary space. Pass an index along instead of slicing.',
        },
        {
          kind: 'table',
          caption: 'Three ways to answer the same lookup, with the preparation each one needs first.',
          headers: ['Approach', 'Preparation', 'Cost per lookup', 'Where it wins'],
          rows: [
            ['Linear scan', 'None', 'O(n) worst case', 'Unsorted data, few lookups, small arrays, predicate tests'],
            ['Sort once, then binary search', 'O(n log n) sort', 'O(log n)', 'Many lookups on stable data, and range or nearest-value queries'],
            ['Build a Set, then test membership', 'O(n) insertions', 'Expected O(1), not a worst-case guarantee', 'Many equality lookups where order is irrelevant'],
          ],
        },
        {
          kind: 'prose',
          body:
            '`indexOf` and `findIndex` are this scan, written for you. They still read up to n elements, so reaching for one does not change the growth class of the code around it. The exercise below asks you to write the loop because the next lesson takes it apart.',
        },
      ],
    },
    {
      id: 'dsa-v1-d07-l2',
      title: 'Binary search: precondition, invariant, interval',
      summary: 'What sorted input buys, the claim the loop keeps true, why duplicates land you mid-run, and when sorting first repays its cost.',
      estimatedMinutes: 22,
      sources: [
        { label: 'Harvard CS50x — Algorithms notes', url: 'https://cs50.harvard.edu/x/notes/3/', reviewedOn: '2026-09-08' },
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
            'Binary search trades a requirement for a rate. Give it an array sorted ascending on the key you compare, and one comparison rules out half of what is left. Sixteen elements need at most five comparisons, a million need at most twenty, and doubling the array adds one.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'The precondition is not checked and cannot be. Verifying that an array is sorted costs a full pass, which is the linear scan you were avoiding. Hand unsorted data to a binary search and it returns a wrong answer quietly: no exception, no warning, just -1 for a value that is sitting in the array.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const binarySearch = (sorted, target) => {\n  let low = 0;\n  let high = sorted.length - 1;\n\n  while (low <= high) {\n    const middle = Math.floor((low + high) / 2);\n    if (sorted[middle] === target) return middle;\n    if (sorted[middle] < target) low = middle + 1;\n    else high = middle - 1;\n  }\n\n  return -1;\n};',
          caption: 'The inclusive form: `low` and `high` name a closed interval, and the loop runs while that interval holds at least one element.',
        },
        {
          kind: 'prose',
          body:
            'One sentence makes the whole routine correct: if the target is in the array at all, its index is between `low` and `high` inclusive. That claim holds before the first iteration, because the interval is the whole array. Each branch keeps it true. `sorted[middle] < target` means everything at `middle` and below is too small, so moving `low` to `middle + 1` discards indices the target cannot occupy. The mirror case moves `high` to `middle - 1`.',
        },
        {
          kind: 'trace',
          caption: 'Finding 47 among sixteen sorted values: four reads, and every discarded index shown greyed out.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: SIXTEEN,
                marks: intervalMarks(0, 15, 7, 'compare'),
                note: 'low is 0 and high is 15, so the interval is the whole array. If 47 is present, its index is inside it. The middle index is 7.',
                counter: { label: 'Reads', value: 0 },
              },
              {
                cells: SIXTEEN,
                marks: intervalMarks(8, 15, 11, 'compare'),
                note: 'Index 7 holds 31, which is below 47, so indices 0 to 7 cannot hold it. low becomes 8 and the new middle is index 11. One read.',
                counter: { label: 'Reads', value: 1 },
              },
              {
                cells: SIXTEEN,
                marks: intervalMarks(8, 10, 9, 'compare'),
                note: 'Index 11 holds 53, which is above 47, so indices 11 to 15 are out. high becomes 10 and the new middle is index 9. Two reads.',
                counter: { label: 'Reads', value: 2 },
              },
              {
                cells: SIXTEEN,
                marks: intervalMarks(10, 10, 10, 'compare'),
                note: 'Index 9 holds 42, which is below 47, so index 9 goes too. low becomes 10, high is still 10, and one element is left. Three reads.',
                counter: { label: 'Reads', value: 3 },
              },
              {
                cells: SIXTEEN,
                marks: intervalMarks(10, 10, 10, 'settled'),
                note: 'Index 10 holds 47, so the search returns 10 after four reads. A scan from the left would have read eleven elements.',
                counter: { label: 'Reads', value: 4 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'The loop ends when `low` passes `high`, which means the interval is empty. Combine that with the invariant and the conclusion follows: the target was never in the array, so the routine returns -1. Termination comes free, because every iteration removes the middle element and one of the halves, so the interval strictly shrinks.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'The classic overflow bug in `(low + high) / 2` belongs to fixed-width integer languages, where a large sum wraps around. JavaScript numbers are doubles and stay exact well past any array length the engine allows, so `Math.floor((low + high) / 2)` is safe here. In C or Java you would write `low + (high - low) / 2` instead.',
        },
        {
          kind: 'prose',
          body:
            'Counting comparisons: each iteration at worst removes half the remaining interval, so an array of n elements takes at most ⌊log₂ n⌋ + 1 of them. That is 5 for sixteen elements and 20 for a million, and the class is O(log n) for time with O(1) auxiliary space. A recursive version returns the same answer and borrows O(log n) stack frames for the privilege.',
        },
        {
          kind: 'table',
          caption: 'Worst-case reads under the unit-cost model of D01. These are counted operations, never measured milliseconds.',
          headers: ['Elements', 'Linear scan, worst case', 'Binary search, worst case'],
          rows: [
            ['16', '16', '5'],
            ['100', '100', '7'],
            ['1 000', '1 000', '10'],
            ['1 000 000', '1 000 000', '20'],
            ['1 000 000 000', '1 000 000 000', '30'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Duplicates do not break the search, but they blunt the answer. Given `[2, 4, 4, 4, 4, 7]` and a target of 4, the routine looks at index 2, finds a match and returns it. Index 1 is where the run of fours starts, and index 2 is simply where the halving happened to land. Ask a different array of the same shape and you get a different index inside the run.',
        },
        {
          kind: 'prose',
          body:
            'The fix is to stop returning on the first match. A lower-bound search never exits early: when the middle element is at least the target it pulls `high` down to the middle and keeps going, so the interval collapses onto the leftmost index whose element is not below the target. One check at the end tells you whether that index holds the target or the array simply has no such value. That variant is the third exercise below.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'The sort has to use the same order the search assumes. `[10, 9, 100].sort()` gives `[10, 100, 9]`, because the default comparator compares elements as strings. Numbers need `sort((a, b) => a - b)`, and objects need a comparator on the key you will later search by.',
        },
        {
          kind: 'prose',
          body:
            'Preprocessing decides which search you should be writing. One lookup on unsorted data: the sort costs O(n log n) and the scan you replaced cost O(n), so you lost. k lookups: O(n log n + k log n) against O(kn), and the sort repays itself once k grows past roughly log n. Data that changes between lookups moves the sort back inside the loop, which usually ends the argument.',
        },
        {
          kind: 'prose',
          body:
            'For plain equality lookups a Set or Map often beats both, at expected constant time per lookup rather than a worst-case guarantee. Binary search earns its keep when the order itself is the question: the first record on or after a date, the nearest price below a bid, everything between two keys. A hash table answers none of those.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'dsa-v1-d07-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: linear search, and when it is the right answer',
      summary: 'Best, average and worst reads, the early return, predicate searches, and the copy that turns a scan quadratic.',
      competencies: ['searching', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d07-l1',
    },
    {
      id: 'dsa-v1-d07-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: binary search, precondition, invariant, interval',
      summary: 'The sorted-input requirement, the interval invariant, duplicates landing mid-run, and the break-even point for sorting first.',
      competencies: ['searching', 'complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d07-l2',
    },
    {
      id: 'dsa-v1-d07-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Search checks',
      summary: 'Four questions: unsorted input, the interval invariant, where duplicates leave you, and when sorting first repays its cost.',
      competencies: ['searching', 'complexity'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-d07-q1',
          prompt: 'The array handed to this search is not sorted. What does the call return, and why?',
          context: {
            language: 'javascript',
            code: 'const binarySearch = (sorted, target) => {\n  let low = 0;\n  let high = sorted.length - 1;\n  while (low <= high) {\n    const middle = Math.floor((low + high) / 2);\n    if (sorted[middle] === target) return middle;\n    if (sorted[middle] < target) low = middle + 1;\n    else high = middle - 1;\n  }\n  return -1;\n};\n\nbinarySearch([8, 3, 5, 1, 9], 3);',
          },
          options: [
            '-1, because each comparison discards a half on the assumption that the values ascend, and here that assumption throws away the index holding 3.',
            '1, because the loop keeps narrowing until it reaches the only remaining index, which is where the 3 sits.',
            '-1, because a binary search rejects an unsorted array before it compares anything.',
            'A range error, because `low` runs past the last index of the array.',
          ],
          correct: 0,
          explanation:
            'The search reads index 2 (value 5), decides 3 must lie to the left, and sets `high` to 1. It then reads index 0 (value 8), decides 3 must lie further left again, and sets `high` to -1. The loop ends and the answer is -1, even though 3 is at index 1. Nothing rejects the input: checking that an array is sorted costs a full pass, so no implementation does it. And `low` and `high` only ever move inward, so the indexing stays in range and no error is thrown.',
          competencies: ['searching'],
        },
        {
          id: 'dsa-v1-d07-q2',
          prompt: 'An iterative binary search keeps a `low` and a `high` index. Which statement is the loop invariant that makes the routine correct?',
          options: [
            'If the target is in the array at all, its index is between `low` and `high` inclusive.',
            '`sorted[low]` is always at most the target and `sorted[high]` is always at least the target.',
            'The count of elements between `low` and `high` halves exactly on every iteration.',
            '`low` never decreases and `high` never increases, which on its own guarantees the target is found.',
          ],
          correct: 0,
          explanation:
            'The interval claim is what every branch preserves and what makes an empty interval mean "absent". The bracketing claim about `sorted[low]` and `sorted[high]` fails as soon as the target is missing, and it is never needed. The interval does not halve exactly: integer rounding leaves one side one element larger, and the middle element is discarded as well, so it shrinks by at least about half. Monotonic movement is true but says nothing about correctness, since a routine that moved the ends the wrong way would also satisfy it.',
          competencies: ['searching'],
        },
        {
          id: 'dsa-v1-d07-q3',
          prompt: 'A plain binary search runs over the ascending array `[2, 4, 4, 4, 4, 7]` looking for 4, returning the middle index as soon as it matches. What does it return?',
          options: [
            '2, and on a different array of the same shape it could return any index inside the run of fours.',
            '1, because the search settles on the leftmost element of a run of equal values.',
            '4, because the search settles on the rightmost element of a run of equal values.',
            '-1, because a binary search needs distinct values to divide the array.',
          ],
          correct: 0,
          explanation:
            'The first middle index is ⌊(0 + 5) / 2⌋ = 2, that element is a 4, and the routine returns immediately. Nothing in the algorithm prefers the left or the right end of a run: the index it lands on depends on the length of the array and where the run sits in it. Duplicates do not break the precondition either, since the array is still ascending. Getting index 1 reliably takes the lower-bound variant, which refuses to return early and keeps pulling `high` down to the middle.',
          competencies: ['searching'],
        },
        {
          id: 'dsa-v1-d07-q4',
          prompt: 'A list of 100 000 unsorted records is looked up by key. Under the unit-cost model, when does sorting once at O(n log n) and then binary searching beat scanning linearly each time?',
          options: [
            'Once enough lookups accumulate that the linear scans they replace outweigh the one-off sort; a single lookup never repays it.',
            'Always, because O(log n) per lookup is a smaller class than O(n) per lookup.',
            'Never, because O(n log n) grows faster than the O(n) scan the sort is meant to replace.',
            'Only when the records already arrive nearly sorted, because otherwise the sort dominates any number of lookups.',
          ],
          correct: 0,
          explanation:
            'k lookups cost O(n log n + k log n) after sorting against O(kn) without, so the sort is an investment that k has to repay. For k = 1 the sort alone costs more than the single scan it saves. The per-lookup class does not settle it, because the sort is paid once and outside the comparison. And "never" mistakes a one-off cost for a per-lookup cost: a fixed O(n log n) charge is amortised across every later lookup, however unsorted the input started.',
          competencies: ['searching', 'complexity'],
        },
      ],
    },
    {
      id: 'dsa-v1-d07-linear-search',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Linear search',
      summary: 'The first matching index in an array of any order, under a budget of one read per element.',
      competencies: ['searching', 'arrays-strings', 'complexity'],
      estimatedMinutes: 15,
      code: {
        language: 'javascript',
        prompt:
          'Write `linearSearch(values, target)`, returning the index of the first element strictly equal to `target`, or -1 when nothing matches. The array can be in any order. `linearSearch([4, 9, 1, 9], 9)` gives 1, and an empty array gives -1.\n\nThe grade counts how many times you read an element by index. One walk from the left is the whole budget: at most one read per element, and a match at index 0 must cost a single read, so a scan that keeps going after it has found something goes over.',
        contract: [
          'Read each element at most once — the graded budget is one read per element.',
          'Return as soon as an element matches; running to the end anyway breaks the budget on an early match.',
          'Compare with strict equality, so `0` and `false` are different values.',
          'Leave the input as you found it: no sorting, no copying, no slicing.',
        ],
        starter: `const linearSearch = (values, target) => {

};

// Scratch pad — change this and press Run.
console.log(linearSearch([4, 9, 1, 9], 9));
`,
        skeleton: `const linearSearch = (values, target) => {
  for (/* every index, starting at the first */) {
    // return this index when the element strictly equals the target
  }

  return /* the walk finished without a match */;
};`,
        hints: [
          'A plain `for` loop over the indices gives you the element and the index you have to return. `for…of` hands you the value alone, so you would have to track the position yourself.',
          'Return from inside the loop the moment an element matches. The `return -1` belongs after the loop, where it means the walk finished with nothing found.',
        ],
        approach: [
          'Walk the indices from 0 up to the last one.',
          'Read the element at the current index and compare it with the target using strict equality.',
          'Return that index straight away on a match.',
          'Return -1 after the loop, which is also what an empty array gives because the loop never runs.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct first index, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check an empty array, an absent target, duplicates where the first index is wanted, and a match at the last index.',
          },
          {
            id: 'one-pass',
            label: 'One read per element, and a stop at the first match',
            critical: true,
            weight: 2,
            detail: 'The read counter went over budget. A copy of the input, a second walk, or a scan that runs on after the match all show up here.',
          },
        ],
        tests: [
          { call: 'linearSearch([4, 9, 1, 9], 9)', expected: 1, label: 'duplicates give the first index' },
          { call: 'linearSearch([], 3)', expected: -1, label: 'an empty array has nothing to find', edge: true },
          { call: 'linearSearch([2, 4, 6], 5)', expected: -1, label: 'a value that is not there', edge: true },
          { call: "linearSearch(['fin', 'reef', 'kelp'], 'kelp')", expected: 2, label: 'strings compare the same way', edge: true },
          { call: 'linearSearch([7], 7)', expected: 0, label: 'a single element', edge: true },
          {
            call: '__countReads([5, 3, 8, 1, 9, 2], function (view) { return linearSearch(view, 4); }).reads <= 6',
            expected: true,
            label: 'a missing target reads six elements at most once each',
            criterion: 'one-pass',
          },
          {
            call: '__countReads([5, 3, 8, 1, 9, 2], function (view) { return linearSearch(view, 5); }).reads <= 1',
            expected: true,
            label: 'a match at index 0 stops after one read',
            criterion: 'one-pass',
          },
        ],
        harness: READ_PROBE,
      },
    },
    {
      id: 'dsa-v1-d07-binary-search',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Binary search: the existing coding task',
      summary:
        'The devShark JavaScript task `js-binary-search`, opened here by your path enrollment instead of the ordinary tier 3 gate. Passing it records evidence for this module only: no coding XP, and no coding tier unlocks.',
      competencies: ['searching', 'complexity'],
      estimatedMinutes: 15,
      reuseTaskId: 'js-binary-search',
    },
    {
      id: 'dsa-v1-d07-first-occurrence',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'First occurrence in a run',
      summary: 'The lower-bound variant: where a run of equal values starts, inside a read budget a linear scan cannot meet.',
      competencies: ['searching', 'complexity', 'arrays-strings'],
      estimatedMinutes: 25,
      code: {
        language: 'javascript',
        prompt:
          'Write `firstOccurrence(sorted, target)`, returning the index of the first element equal to `target` in an ascending array that may hold duplicates, or -1 when the target is absent. `firstOccurrence([1, 2, 2, 2, 3], 2)` gives 1, because index 1 is where the run of twos starts. An empty array gives -1.\n\nThis is the lower-bound variant of binary search, and the grade holds you to the method: on a sorted array of 64 elements the routine may read at most 20 elements. A linear scan reads up to 64. Finding any match first and then walking left along the run reads up to 32 more than the search itself. Neither fits.',
        contract: [
          'The input is ascending and may hold duplicates; you may rely on that order.',
          'Read at most 20 elements of a 64-element array — the graded budget rules out both a linear scan and a walk back along a run of equal values.',
          'Return the index where the run of equal values starts, not an arbitrary index inside it.',
          'Leave the input as you found it: no sorting, no copying, no slicing.',
        ],
        starter: `const firstOccurrence = (sorted, target) => {

};

// Scratch pad — change this and press Run.
console.log(firstOccurrence([1, 2, 2, 2, 3], 2));
`,
        skeleton: `const firstOccurrence = (sorted, target) => {
  let low = /* the first index */;
  let high = /* one past the last index */;

  while (/* the interval still holds something */) {
    const middle = /* halfway between low and high, rounded down */;
    // below the target — move low past the middle; otherwise pull high down to the middle
  }

  return /* low, when it is inside the array and holds the target */;
};`,
        hints: [
          'Use a half-open interval: `low` at 0, `high` at `sorted.length`, and loop while `low` is below `high`. When the loop ends, `low` is the answer to check.',
          'Do not return from inside the loop on a match. A match means the answer is at the middle or somewhere to its left, so pull `high` down to the middle and keep halving.',
          'After the loop, `low` is the first index whose element is not below the target. Confirm that the index is inside the array and that the element really equals the target before returning it.',
        ],
        approach: [
          'Set `low` to 0 and `high` to the length of the array, so the live interval runs from `low` up to but not including `high`.',
          'While `low` is below `high`, take the middle index, rounding down.',
          'Move `low` to `middle + 1` when the middle element is below the target; otherwise pull `high` down to `middle`, which keeps a matching middle inside the interval.',
          'Stop when the interval is empty. `low` now points at the first element that is not below the target.',
          'Return `low` when it is inside the array and holds the target, and -1 otherwise.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct first index, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check an empty array, an absent target, a run starting at index 0, a run ending at the last index, and negative values.',
          },
          {
            id: 'logarithmic',
            label: 'At most twenty reads on sixty-four elements',
            critical: true,
            weight: 2,
            detail:
              'The read counter went over 20 on a 64-element array. A linear scan reads up to 64, and finding any match then walking left along the run reads up to 32 more; both land here even when the index they return is right.',
          },
        ],
        tests: [
          { call: 'firstOccurrence([1, 2, 2, 2, 3], 2)', expected: 1, label: 'the run of twos starts at index 1' },
          { call: 'firstOccurrence([1, 2, 3], 4)', expected: -1, label: 'a value that is not there', edge: true },
          { call: 'firstOccurrence([], 5)', expected: -1, label: 'an empty array has nothing to find', edge: true },
          { call: 'firstOccurrence([7, 7, 7], 7)', expected: 0, label: 'every element matches, so the run starts at 0', edge: true },
          { call: 'firstOccurrence([1, 2, 3, 4], 4)', expected: 3, label: 'a match at the last index', edge: true },
          {
            call: '__countReads(__blocks64(), function (view) { return firstOccurrence(view, 30); }).result',
            expected: 24,
            label: 'sixty-four elements in eight runs: the thirties start at index 24',
          },
          {
            call: '__countReads(__blocks64(), function (view) { return firstOccurrence(view, 30); }).reads <= 20',
            expected: true,
            label: 'sixty-four elements are read at most twenty times',
            criterion: 'logarithmic',
          },
        ],
        harness: SORTED_PROBE,
      },
    },
  ],
  requires: [
    { activityId: 'dsa-v1-d07-checks', state: 'verified_pass' },
    { activityId: 'dsa-v1-d07-linear-search', state: 'verified_pass' },
    { activityId: 'dsa-v1-d07-binary-search', state: 'verified_pass' },
    { activityId: 'dsa-v1-d07-first-occurrence', state: 'verified_pass' },
  ],
};
