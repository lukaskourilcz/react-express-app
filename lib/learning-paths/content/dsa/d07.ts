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
 * input. Appended after the learner's code, so it cannot be shadowed, and it
 * counts with the built-ins taken before that code ran (`__probe`,
 * shared/coding-evaluate.ts), so replacing `Proxy` changes nothing. */
const READ_PROBE = `
var __countReads = function (values, run) {
  var reads = 0;
  var proxy = new __probe.Proxy(values, {
    get: function (target, prop) {
      if (typeof prop === 'string' && __probe.isIndex(prop)) reads += 1;
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
            'A linear search walks the collection from one end and stops at the first element that matches. It needs no sorted order or prepared lookup index. The examples here use dense, stable arrays and constant-cost strict-equality comparisons. That is its whole appeal, and it is why every other search in this path is measured against it.',
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
  let probes = 0;
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    probes += 1;
    const value = values[mid];
    if (value === target) return { index: mid, probes };
    if (value < target) low = mid + 1;
    else high = mid - 1;
  }
  return { index: -1, probes };
};

console.log("found 44:", binarySearch(sorted, 44));
console.log("missing 43:", binarySearch(sorted, 43));`,
          caption: 'Binary search over ten sorted values, counting one midpoint probe per iteration, not individual equality/order comparisons.',
          note: 'Double the length of the list and see how little the midpoint-probe count moves. Then unsort it and watch the answer stop being trustworthy.',
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
            'Those are three different cost functions on the same routine. The best case is 1 read, the worst case is n reads, and a target that is present at a uniformly random position averages about n/2. For a nonempty array and a uniformly distributed successful target, the mean is exactly (n + 1) / 2 reads. Best-case cost is O(1); both this average and the worst case have tight O(n) growth.',
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
            'Nothing in that walk depended on the values ascending. Move the 7 anywhere and the routine still finds it, at a cost that changes but never breaks. Binary search on unsorted data can miss an existing target, which is the trade the next lesson spells out.',
        },
        {
          kind: 'prose',
          body:
            'A linear scan is the right answer more often than its reputation suggests. Unsorted data with one lookup coming: sorting first costs more than the scan you were trying to avoid. A handful of elements: constant factors can dominate, so measure before assuming preparation pays off. A predicate rather than an equality test: "the first order over 500 CZK" has no sorted key to bisect on unless you built one.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const orders = [{ total: 200 }, { total: 750 }, { total: 900 }];\n\nconst findFirst = (values, matches) => {\n  for (let index = 0; index < values.length; index += 1) {\n    if (matches(values[index])) return index;\n  }\n  return -1;\n};\n\nfindFirst(orders, order => order.total > 500);',
          caption: 'The same walk with a predicate. Binary search has no way in here: the array is not ordered by the thing being tested.',
        },
        {
          kind: 'prose',
          body:
            'Structure matters too. A singly linked list has no index to bisect on, so reaching the middle node already costs a walk of half the list. Without an auxiliary index, a general equality search has a linear worst-case walk, which is why D05 pairs cheap insertion at a known position with expensive lookup.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Recursive "scan the rest" implementations often hide a copy. `search(values.slice(1), target)` reads and allocates the whole tail on every step, so an unsuccessful walk copies (n - 1) + (n - 2) + ... + 1 elements: O(n²) copying work. With ordinary waiting frames retaining those tails, peak auxiliary storage can also be O(n²), plus the call stack. An index avoids the tail copies; a loop also avoids the growing stack.',
        },
        {
          kind: 'table',
          caption: 'Three ways to answer the same lookup, with the preparation each one needs first.',
          headers: ['Approach', 'Preparation', 'Cost per lookup', 'Where it wins'],
          rows: [
            ['Linear scan', 'None', 'O(n) worst case', 'Unsorted data, few lookups, small arrays, predicate tests'],
            ['Sort once, then binary search', 'O(n log n) sort', 'O(log n)', 'Many lookups on stable data, and range or nearest-value queries'],
            ['Build a Set, then test membership', 'O(n) insertions', 'Expected O(1) in a hash-table model; no fixed ECMAScript time guarantee', 'Many equality lookups where order is irrelevant'],
          ],
        },
        {
          kind: 'prose',
          body:
            '`indexOf` and `findIndex` are this scan, written for you. On the dense arrays used here they inspect up to n positions, so they retain linear worst-case scan work when the comparison or predicate has constant cost. indexOf uses strict equality and cannot find NaN. Set uses SameValueZero and can contain NaN, so membership and an indexOf scan are not interchangeable for every value. The exercise below asks you to write the loop because the next lesson takes it apart.',
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
            'Binary search trades a requirement for a rate. Use a dense, stable array of finite Numbers in nondecreasing order, and a finite Number target, with constant-cost comparisons. Each midpoint probe rules out about half of what remains unless it finds a match. Sixteen elements need at most five probes and a million at most twenty; doubling the maximum length adds about one probe.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'This implementation trusts the sorted-input precondition. It could validate it, but a fresh validation takes a full pass, losing the logarithmic total cost for that call. On unsorted data the search can silently miss an existing value; it may also happen to find one. There is no reliable answer without the precondition.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const binarySearch = (sorted, target) => {\n  let low = 0;\n  let high = sorted.length - 1;\n\n  while (low <= high) {\n    const middle = Math.floor((low + high) / 2);\n    const value = sorted[middle];\n    if (value === target) return middle;\n    if (value < target) low = middle + 1;\n    else high = middle - 1;\n  }\n\n  return -1;\n};',
          caption: 'The inclusive form: `low` and `high` name a closed interval, and the loop runs while that interval holds at least one element.',
        },
        {
          kind: 'prose',
          body:
            'One sentence makes the whole routine correct: if the target occurs, at least one matching index remains between `low` and `high` inclusive. That claim holds before the first iteration, because the interval is the whole array. Each branch keeps it true. `sorted[middle] < target` means everything at `middle` and below is too small, so moving `low` to `middle + 1` discards indices the target cannot occupy. The mirror case moves `high` to `middle - 1`.',
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
            'Count midpoint probes, not individual equality/order comparisons. The cached midpoint value is read once per iteration. For n > 0 there are at most ⌊log₂ n⌋ + 1 probes; an empty array takes none. That is 5 for sixteen elements and 20 for a million, and the class is O(log n) for time with O(1) auxiliary space. A recursive version with one retained frame per call uses O(log n) auxiliary stack; tail-call behavior depends on the runtime.',
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
            'The fix is to stop returning on the first match. Use a half-open interval [low, high), starting with low = 0 and high = length, and loop while low < high. If the middle value is below the target, set low = middle + 1; otherwise set high = middle. This interval strictly shrinks and ends at the first position whose element is not below the target, or at length. Check that the resulting index is below length and holds the target before reporting a match. That variant is the third exercise below.',
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
            'Preprocessing decides which search you should be writing. In the comparison-sort model, preparation takes O(n log n) work before the first binary lookup, while a full scan takes O(n). Across k lookups on stable data the model compares O(n log n + k log n) with O(kn). Ignoring constants and assuming full scans, the crossover is around log n lookups for large n. Big O alone does not predict a measured winner or an exact threshold. Changed data needs its own update or re-sorting strategy; preparation is not automatically free on later queries.',
        },
        {
          kind: 'prose',
          body:
            'For plain equality lookups a Set or Map often beats both, at expected constant lookup time in a hash-table model, not a fixed ECMAScript or worst-case guarantee. Binary search earns its keep when the order itself is the question: the first record on or after a date, the nearest price below a bid, everything between two keys. A hash table answers none of those.',
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
            'It returns -1: trusting sorted order discards index 1, even though that position holds the target.',
            'It returns 1: narrowing always preserves the matching position, even if the initial array is unsorted.',
            'It returns -1: it validates order first and rejects the array before reading a midpoint.',
            'It throws a range error: moving an interval end past the array necessarily reads an invalid index.',
          ],
          correct: 0,
          explanation:
            'The search reads index 2 (value 5), decides 3 must lie to the left, and sets `high` to 1. It then reads index 0 (value 8), decides 3 must lie further left again, and sets `high` to -1. The loop ends and the answer is -1, even though 3 is at index 1. This implementation does not validate order. A wrapper could check it with a full pass, but that would add linear work before this search. And `low` and `high` only ever move inward, so the indexing stays in range and no error is thrown.',
          competencies: ['searching'],
        },
        {
          id: 'dsa-v1-d07-q2',
          prompt: 'For the inclusive iterative binary search on a dense, nondecreasing array of finite Numbers with a finite Number target, which statement is the loop invariant?',
          options: [
            'If the target occurs, at least one matching index remains in the live interval from low through high.',
            '`sorted[low]` is always at most the target and `sorted[high]` is always at least the target.',
            'The count of elements between `low` and `high` halves exactly on every iteration.',
            '`low` never decreases and `high` never increases, which on its own guarantees the target is found.',
          ],
          correct: 0,
          explanation:
            'The existence of a matching index in the interval is what every branch preserves and what makes an empty interval mean "absent". The bracketing claim about `sorted[low]` and `sorted[high]` can fail when the target is absent or outside the stored value range, and it is never needed. The interval does not halve exactly: integer rounding leaves one side one element larger, and the middle element is discarded as well, so the continuing interval has at most floor(m / 2) elements when it previously had m. Monotonic movement is true but says nothing about correctness, since a routine that moved the ends the wrong way would also satisfy it.',
          competencies: ['searching'],
        },
        {
          id: 'dsa-v1-d07-q3',
          prompt: 'On `[2, 4, 4, 4, 4, 7]`, binary search starts with low = 0 and high = 5, takes floor((low + high) / 2), and returns on a match. What index does it return for 4?',
          options: [
            '2, because the initial lower-middle index is 2 and it already holds the target.',
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
          prompt: 'For stable unsorted records, compare one O(n log n) comparison sort plus k binary lookups with k full linear scans. Which statement accounts for preparation correctly?',
          options: [
            'Count the sort once as well as every lookup; enough repeated lookups can amortize that preparation cost.',
            'Ignore the preparation: O(log n) per lookup guarantees lower total work even for a single query on unsorted data.',
            'Pay the sort again for every query, so its larger growth class prevents it from ever repaying the linear scans.',
            'The initial disorder makes preparation dominate any number of later lookups, even if the data stays unchanged.',
          ],
          correct: 0,
          explanation:
            'k lookups cost O(n log n + k log n) after sorting against O(kn) without, so the sort is an investment that k has to repay. For k = 1 the comparison-sort model adds asymptotically more work than one full scan; constants still matter for particular inputs. The per-lookup class does not settle it, because the sort is paid once and outside the comparison. And "never" mistakes a one-off cost for a per-lookup cost: a fixed O(n log n) charge is amortised across every later lookup, however unsorted the input started. These growth bounds describe a cost model, not an exact measured break-even threshold.',
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
          'Write `linearSearch(values, target)`, returning the index of the first element strictly equal to `target`, or -1 when nothing matches. The input is an ordinary dense array of at most 10000 JavaScript values, in any order. Match objects by reference, do not coerce values, and do not change the array or its elements. An actual undefined entry is allowed; sparse holes are outside this exercise. `linearSearch([4, 9, 1, 9], 9)` gives 1, and an empty array gives -1.\n\nThe grade counts how many times you read an element by index. Use one left-to-right walk and stop at the first match. The bounded fixtures allow at most n indexed reads for n elements, one read for a match at index 0, and a matching-prefix budget in other early-hit cases. The counter totals reads; it does not prove that arbitrary code visits every position only once.',
        contract: [
          'Use at most one indexed read per visited element; the fixtures enforce aggregate and early-hit budgets, not a proof over every possible input.',
          'Return as soon as an element matches; running to the end anyway breaks the budget on an early match.',
          'Compare with strict equality: 0 differs from false, NaN never matches itself, both signs of zero match, and objects match only the same reference.',
          'Leave the input as you found it: no sorting, no copying, no slicing.',
        ],
        starter: `const linearSearch = (values, target) => {

};

// Scratch pad — change this before submitting.
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
            detail: 'The fixture exceeded its indexed-read budget. Copying, a second walk or continuing after a match can exceed it. These sampled aggregate counts are not a universal per-position or complexity proof.',
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
          'Write `firstOccurrence(sorted, target)`, returning the index of the first element equal to `target` in a dense, nondecreasing array of finite Numbers that may hold duplicates, or -1 when the target is absent. `firstOccurrence([1, 2, 2, 2, 3], 2)` gives 1, because index 1 is where the run of twos starts. An empty array gives -1. The target is a finite Number; fractional values count without rounding. The array has at most 10000 elements and may be frozen.\n\nUse the lower-bound variant of binary search. The grader records bounded indexed-read evidence: on a sorted array of 64 elements the routine may read at most 20 elements. A linear scan reads up to 64. Finding any match first and then walking left along the run reads up to 32 more than the search itself. Those strategies exceed at least one fixture budget. Passing finite checks is not a proof of logarithmic behavior on every input.',
        contract: [
          'The input is dense, nondecreasing and contains at most 10000 finite Numbers; the finite Number target may be fractional. You may rely on the order.',
          'Read at most 20 elements of a 64-element array — the sampled budget rejects the included linear-scan and walk-left counterexamples, without proving arbitrary code logarithmic.',
          'Return the index where the run of equal values starts, not an arbitrary index inside it.',
          'Leave the input as you found it: no sorting, no copying, no slicing.',
        ],
        starter: `const firstOccurrence = (sorted, target) => {

};

// Scratch pad — change this before submitting.
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
              'The read counter went over 20 on a 64-element array. A linear scan reads up to 64, and finding any match then walking left along the run reads up to 32 more; the included fixtures reject both even if the returned index is right. Other inputs or programs are not proven by this finite budget.',
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
