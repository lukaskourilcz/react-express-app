/** D10 — Foundation assessment.
 *
 * The last module, and the only one that teaches nothing. It has no lessons
 * and no reading activities: ten fresh questions and three exercises, all
 * carrying purpose `project`, are the whole of it.
 *
 * The check is gated per domain. Complexity, structures, searching, sorting
 * and trees each have two questions and each has to reach the same threshold
 * on its own, so a learner who answered every sorting question and no tree
 * question does not pass on the average.
 *
 * The questions are new material rather than a replay of D01–D09: new
 * snippets, new numbers, new framing for the same invariants. Two of the three
 * exercises are graded on method through counted probes declared in their
 * harness, which is a bounded contract about these inputs and never a proof
 * about arbitrary code.
 *
 * What a pass records is what the learner did here. It is evidence from these
 * exercises on this day, not a claim that the material stays learned. */

import type { ModuleSource } from '../../types';

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

/** Sixty-four records with ascending ids, plus two counters: one for the reads
 * a learner's `buildIndex` makes while it is being built, and one for the
 * reads its `lookup` makes afterwards. Counting is off during the build in
 * `__lookupReads`, so the two budgets stay separate: a build that walks the
 * array fails the first assertion, a lookup that scans fails the second. */
const RECORD_PROBE = `
var __records64 = function () {
  var out = [];
  for (var i = 0; i < 64; i += 1) {
    out.push({ id: 100 + i * 4, name: 'rec-' + (i < 10 ? '0' + i : String(i)) });
  }
  return out;
};
var __buildReads = function (records, build) {
  var reads = 0;
  var proxy = new Proxy(records, {
    get: function (target, prop) {
      if (typeof prop === 'string' && /^[0-9]+$/.test(prop)) reads += 1;
      return target[prop];
    },
  });
  build(proxy);
  return reads;
};
var __lookupReads = function (records, build, ids) {
  var reads = 0;
  var counting = false;
  var proxy = new Proxy(records, {
    get: function (target, prop) {
      if (counting && typeof prop === 'string' && /^[0-9]+$/.test(prop)) reads += 1;
      return target[prop];
    },
  });
  var index = build(proxy);
  counting = true;
  var names = ids.map(function (id) {
    var found = index.lookup(id);
    return found ? found.name : null;
  });
  counting = false;
  return { names: names, reads: reads };
};
`.trim();

/** Tree builders for the traversal repair. `__build` takes a level-order array
 * in which every slot is counted, so index i has its children at 2i+1 and
 * 2i+2 and a missing node is written `null`. */
const TREE_PROBE = `
var __leaf = function (value) { return { value: value, left: null, right: null }; };
var __build = function (levels) {
  var nodes = levels.map(function (value) {
    return value === null ? null : { value: value, left: null, right: null };
  });
  for (var i = 0; i < nodes.length; i += 1) {
    if (!nodes[i]) continue;
    nodes[i].left = nodes[2 * i + 1] || null;
    nodes[i].right = nodes[2 * i + 2] || null;
  }
  return nodes.length === 0 ? null : nodes[0];
};
var __chain = function (values, side) {
  var head = null;
  for (var i = values.length - 1; i >= 0; i -= 1) {
    var node = { value: values[i], left: null, right: null };
    node[side] = head;
    head = node;
  }
  return head;
};
`.trim();

/** The read counter plus the graded input for the frequency exercise: fifty
 * values drawn from seven distinct ones, and forty queries drawn from ten. A
 * scan per query reads 2000 elements; one pass reads 50. */
const FREQUENCY_PROBE = `${READ_PROBE}
var __pool50 = function () {
  var out = [];
  for (var i = 0; i < 50; i += 1) out.push('v' + (i % 7));
  return out;
};
var __queries40 = function () {
  var out = [];
  for (var i = 0; i < 40; i += 1) out.push('v' + (i % 10));
  return out;
};`;

export const DSA_D10: ModuleSource = {
  id: 'dsa-v1-d10',
  title: 'Foundation assessment',
  outcomes: [
    'Answer growth, structure, searching, sorting and tree questions you have not seen before, with none of the teaching modules open in front of you.',
    'Build a logarithmic lookup over a sorted record array, repair a broken level-order traversal, and index once instead of scanning per query.',
    'Read the result for what it is: evidence of what you demonstrated on these exercises, and not a claim that the material stays learned without practice.',
  ],
  competencies: ['complexity', 'arrays-strings', 'maps-sets', 'searching', 'sorting', 'trees'],
  dependsOn: [
    'dsa-v1-d01',
    'dsa-v1-d02',
    'dsa-v1-d03',
    'dsa-v1-d04',
    'dsa-v1-d05',
    'dsa-v1-d06',
    'dsa-v1-d07',
    'dsa-v1-d08',
    'dsa-v1-d09',
  ],
  estimatedMinutes: 115,
  lessons: [],
  activities: [
    {
      id: 'dsa-v1-d10-final-checks',
      kind: 'check',
      purpose: 'project',
      verification: 'machine_verified',
      title: 'Final checks across five domains',
      summary:
        'Ten questions you have not seen: two on growth and space, two on structures, two on searching, two on sorting and two on trees. Each domain is scored on its own and each has to reach 80% on its own, so a strong sorting score cannot cover a missing tree answer. Retry as often as you like.',
      competencies: ['complexity', 'arrays-strings', 'maps-sets', 'searching', 'sorting', 'trees'],
      estimatedMinutes: 30,
      passThreshold: 0.8,
      domains: ['complexity', 'structures', 'searching', 'sorting', 'trees'],
      questions: [
        {
          id: 'dsa-v1-d10-q1',
          prompt: 'The two inputs are unrelated: `spans` has n entries and `notes` has m. What is the tightest growth class for the running time of `report`?',
          context: {
            language: 'javascript',
            code: 'const report = (spans, notes) => {\n  const out = [];\n\n  for (let i = 0; i < spans.length; i += 1) {\n    for (let j = i + 1; j < spans.length; j += 1) {\n      if (spans[i].end > spans[j].start) out.push([i, j]);\n    }\n  }\n\n  for (const note of notes) out.push(note);\n\n  return out;\n};',
          },
          options: ['O(n² + m)', 'O(n²)', 'O(n²m)', 'O(nm)'],
          correct: 0,
          explanation:
            'The inner loop starts at `i + 1`, so the pair loop runs n(n-1)/2 times. Half of n² is a constant multiple of n², so a triangular loop is still the quadratic family. The notes loop is separate and runs m times, and a sequential loop over an unrelated input adds instead of multiplying, which gives O(n² + m). Dropping the m assumes m never outgrows n², and nothing in the question says that. O(n²m) would be the answer if the notes loop sat inside the pair loop. O(nm) misreads the inner bound, which walks spans rather than notes.',
          domain: 'complexity',
          competencies: ['complexity'],
        },
        {
          id: 'dsa-v1-d10-q2',
          prompt: 'For an input of length n, what is the auxiliary space — the memory used beyond the input itself — of `buildRuns`?',
          context: {
            language: 'javascript',
            code: 'const buildRuns = values => {\n  const runs = [];\n  let current = [];\n\n  for (const value of values) {\n    if (current.length > 0 && current[current.length - 1] !== value) {\n      runs.push(current);\n      current = [];\n    }\n    current.push(value);\n  }\n\n  if (current.length > 0) runs.push(current);\n  return runs;\n};',
          },
          options: [
            'O(n) — the run arrays hold one entry per input element between them',
            'O(1) — `runs` and `current` are the only two things declared, whatever the input size',
            'O(n²) — a run array is created for every element and each one can grow to the length of the input',
            'O(k), where k is the number of distinct values, which does not depend on n',
          ],
          correct: 0,
          explanation:
            'Every element is pushed into exactly one run array, so the run arrays hold n entries between them, and there are at most n of them. Counting declarations is not counting memory: `runs` and `current` are two names for structures that both grow with the input. Nothing copies the input once per element, so the total never reaches n². And the distinct-value count does not bound it either: `[1, 2, 1, 2, 1, 2]` has two distinct values and six runs.',
          domain: 'complexity',
          competencies: ['complexity', 'arrays-strings'],
        },
        {
          id: 'dsa-v1-d10-q3',
          prompt:
            'Handlers are stored under request ids that arrive as strings, some of them plain digit strings like `"12"` and `"305"`. The code looks a handler up by id on every request, and once a minute walks every entry in the order the handlers were registered. Which structure fits, and why?',
          options: [
            'A `Map`: `get` is expected constant, keys iterate in insertion order whatever they look like, and an id like `"toString"` is an ordinary key.',
            'A plain object: property access is expected constant and the keys come back in the order they were assigned.',
            'A `Set` of ids: membership is expected constant and iteration follows insertion order.',
            'An array of `[id, handler]` pairs: it preserves registration order exactly and a lookup is one indexed read.',
          ],
          correct: 0,
          explanation:
            'A Map answers both requirements: expected constant lookup, and insertion-order iteration for keys of any shape. A plain object reorders keys that look like array indices, so `"12"` and `"305"` iterate first and in ascending numeric order, ahead of everything registered before them. Its prototype also already answers to names like `"toString"`, so a lookup can hand back a function nobody registered. A Set stores membership only, and there is nowhere in it to put the handler. An array of pairs keeps the order, but a lookup has to walk it, which is O(n) per request rather than expected constant.',
          domain: 'structures',
          competencies: ['maps-sets'],
        },
        {
          id: 'dsa-v1-d10-q4',
          prompt: 'This checker uses an array as a stack, and it is meant to return `true` only when the parentheses balance. Which input makes it return `true` when it should not?',
          context: {
            language: 'javascript',
            code: "const balanced = text => {\n  const open = [];\n\n  for (const ch of text) {\n    if (ch === '(') open.push(ch);\n    else if (ch === ')') open.pop();\n  }\n\n  return open.length === 0;\n};",
          },
          options: [
            '`"())"` — the third character pops an already empty array, which does nothing, so the stack ends empty and the check passes.',
            '`")("` — the leading `)` pops an empty array, leaving only the `(` uncounted, so the stack ends empty.',
            '`"(()"` — the last iteration pops the unmatched `(`, so the stack ends empty.',
            '`"()()"` — two separate pairs cancel out, and the checker cannot tell them apart from a single nested pair.',
          ],
          correct: 0,
          explanation:
            'On `"())"` the stack holds one `(`, the first `)` empties it, and the second `)` pops an empty array. `Array.prototype.pop` returns `undefined` and leaves the length at 0, so the function reports balance for text that has none. `")("` ends with the `(` still on the stack, so it returns false, which happens to be the right answer. `"(()"` never pops that first `(` at all, because nothing in the loop removes it without a `)`, so the length is 1 and the answer is false. `"()()"` really is balanced, so `true` is correct there. The repair is to return false the moment a `)` arrives with the stack empty.',
          domain: 'structures',
          competencies: ['arrays-strings'],
        },
        {
          id: 'dsa-v1-d10-q5',
          prompt: 'This search returns -1 for some targets that are in the array. Which description of the defect is right?',
          context: {
            language: 'javascript',
            code: 'const search = (sorted, target) => {\n  let low = 0;\n  let high = sorted.length - 1;\n\n  while (low < high) {\n    const middle = Math.floor((low + high) / 2);\n    if (sorted[middle] === target) return middle;\n    if (sorted[middle] < target) low = middle + 1;\n    else high = middle - 1;\n  }\n\n  return -1;\n};',
          },
          options: [
            'The loop condition leaves a one-element interval unexamined: the loop ends as soon as `low` reaches `high`, and that index is never probed.',
            '`Math.floor` rounds the middle index down, so the last index of an even-length array is never probed.',
            '`high` starts at `sorted.length - 1`, which is one short: the interval has to run up to `sorted.length`.',
            'The equality test runs before the ordering test, so the search returns whichever match it meets first rather than the leftmost one.',
          ],
          correct: 0,
          explanation:
            'With `low < high` the loop exits while `low === high`, and that surviving index is never read. `search([2], 2)` never enters the loop and returns -1; `search([1, 3, 5, 7], 7)` narrows to index 3 and then quits. Changing the condition to `low <= high` fixes it. Rounding down is correct for a closed interval, because the middle only has to land inside `[low, high]`, and it always does. `high = sorted.length - 1` is right for a closed interval; `sorted.length` belongs to the half-open variant, which pairs with `low < high` and `high = middle`. The last option describes real behaviour on runs of equal values, but it returns an index inside the run rather than -1, so it is not this defect.',
          domain: 'searching',
          competencies: ['searching'],
        },
        {
          id: 'dsa-v1-d10-q6',
          prompt: 'An ascending array holds 1,000,000 elements. In the worst case, how many of them does an iterative binary search read before it can report that a target is absent?',
          options: ['20', '1,000,000', '1,000', '6'],
          correct: 0,
          explanation:
            'Each probe discards the middle element and at least half of what is left, so after k probes at most n / 2ᵏ candidates remain. 2¹⁹ = 524,288 is below a million and 2²⁰ = 1,048,576 is above it, so 20 probes are enough and 19 are not. 1,000,000 is what a linear scan reads. 1,000 is the square root of a million, and nothing in a binary search shrinks an interval that way. 6 is log₁₀ 1,000,000, which counts divisions by ten: changing the base only changes a constant factor in the growth class, but the probe count itself comes from halving, so it is base 2.',
          domain: 'searching',
          competencies: ['searching', 'complexity'],
        },
        {
          id: 'dsa-v1-d10-q7',
          prompt: 'A routine is partway through sorting `[5, 3, 8, 1, 9, 2]`, and the array currently holds `[1, 3, 5, 8, 9, 2]`. Which algorithm is running, and what gives it away?',
          options: [
            'Insertion sort: the first five elements are sorted and are exactly the first five of the original, while the tail sits where it started.',
            'Selection sort: the smallest values have already been moved to the front.',
            'Merge sort: two sorted halves have been merged back into the array.',
            'Bubble sort: the largest element has been carried to the end of the array.',
          ],
          correct: 0,
          explanation:
            'Insertion sort grows a sorted prefix out of the elements it has already passed and never looks ahead. `[1, 3, 5, 8, 9]` is exactly `{5, 3, 8, 1, 9}` reordered, and the 2 is still in the position it started in. Selection sort places globally smallest values from the front, so after two passes the array would begin `1, 2`; the 2 has not moved, so it is not that. The merge sort in this path builds new arrays and returns them rather than writing back into the input, and `[1, 3, 5, 8, 9]` is not a merge of the sorted halves `[3, 5, 8]` and `[1, 2, 9]` either. Bubble sort ends each pass with the largest remaining element at the far right, and here the 9 sits at index 4 with the 2 behind it.',
          domain: 'sorting',
          competencies: ['sorting'],
        },
        {
          id: 'dsa-v1-d10-q8',
          prompt: 'A team replaces a hand-written `mergeSort(rows, byName)` with the built-in `rows.sort(byName)`. What actually changes?',
          context: {
            language: 'javascript',
            code: 'const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);\n\n// before: returns a new array and leaves rows alone\nconst sorted = mergeSort(rows, byName);\n\n// after\nconst sorted = rows.sort(byName);',
          },
          options: [
            '`rows` is reordered in place and `sorted` is that same array object, where the merge sort left `rows` untouched and returned a new one.',
            'Ties can now come out in a different order, because `Array.prototype.sort` makes no stability guarantee.',
            'The comparison count drops below n log n, because the engine sorts without comparing elements.',
            'Auxiliary space falls to O(1), because a built-in sort is required to sort in place.',
          ],
          correct: 0,
          explanation:
            '`Array.prototype.sort` sorts the array it is called on and returns that same array, so every other reference to `rows` sees the new order. That is the change that breaks callers. Stability is not it: the language has required `sort` to be stable since ES2019, so rows with equal names keep their relative order, exactly as the merge sort did. A comparison sort cannot get below n log n comparisons in general, and the engine calls `byName` for its comparisons like any other comparator. And nothing requires constant auxiliary space: engines commonly use a merge sort variant that allocates O(n).',
          domain: 'sorting',
          competencies: ['sorting', 'complexity'],
        },
        {
          id: 'dsa-v1-d10-q9',
          prompt:
            'A binary tree is written as a level-order listing in which every slot is counted and a missing node is `null`, so the children of index i sit at 2i + 1 and 2i + 2. The listing is `[5, 3, 8, null, 4, 7, null]`. What does an inorder traversal return?',
          options: ['[3, 4, 5, 7, 8]', '[5, 3, 8, 4, 7]', '[5, 3, 4, 8, 7]', '[4, 3, 7, 8, 5]'],
          correct: 0,
          explanation:
            'The listing describes 5 at the root, 3 on the left with a right child 4, and 8 on the right with a left child 7. Inorder visits the whole left subtree, then the node, then the whole right subtree: 3, 4, then 5, then 7, 8. This tree also satisfies the search property, so the ascending result is the confirmation. `[5, 3, 8, 4, 7]` is the listing itself with the nulls removed, which is the level-order walk. `[5, 3, 4, 8, 7]` is the preorder walk, which starts at the root. `[4, 3, 7, 8, 5]` is the postorder walk, which ends at it.',
          domain: 'trees',
          competencies: ['trees'],
        },
        {
          id: 'dsa-v1-d10-q10',
          prompt:
            'Two functions look for a value. One walks a binary search tree and uses the ordering rule; the other walks an arbitrary binary tree that carries no ordering rule. For a tree of n nodes and height h, how many nodes does each read in the worst case?',
          options: [
            'The search tree walk reads at most h + 1; the arbitrary walk may read all n, because with no ordering rule neither subtree can be ruled out.',
            'Both read at most h + 1, because any search descends a single root-to-leaf path.',
            'The search tree walk reads at most log₂ n + 1; the arbitrary walk reads all n.',
            'Both read all n in the worst case, because neither can confirm a value is absent until it has seen every node.',
          ],
          correct: 0,
          explanation:
            'In a search tree every comparison discards a whole subtree, so the walk follows one root-to-leaf path and reads at most h + 1 nodes, whether it finds the value or runs off the bottom. With no ordering rule there is nothing to discard, and absence is only settled once every node has been checked. The second option hands the arbitrary tree a guarantee it has not earned. The third swaps h for log₂ n: a plain BST never rebalances, and inserting ascending values builds a chain where h is n - 1. The fourth ignores what the search property buys, which is exactly that absence is settled in h + 1 reads.',
          domain: 'trees',
          competencies: ['trees', 'complexity'],
        },
      ],
    },
    {
      id: 'dsa-v1-d10-record-index',
      kind: 'code',
      purpose: 'project',
      verification: 'machine_verified',
      title: 'A searchable record index',
      summary: 'Wrap a sorted record array in a lookup that stays logarithmic, under two counted read budgets that rule out both a scan and a prebuilt copy.',
      competencies: ['searching', 'complexity', 'arrays-strings'],
      estimatedMinutes: 30,
      code: {
        language: 'javascript',
        prompt:
          '`buildIndex(records)` takes an array of `{ id, name }` objects already sorted ascending by `id`, and returns an object with one method: `lookup(id)`, which gives back the matching record object, or `null` when no record carries that id.\n\nThe index keeps the array it was handed and searches it; it does not build a second structure. The grade holds two budgets on a 64-record array. `buildIndex` itself may read at most 2 elements, so a copy or a `Map` built up front fails, because building one reads all 64. Each `lookup` may then read at most 20 elements, which a binary search meets with 7 and a linear scan cannot meet at all.\n\n`buildIndex([])` still returns a working index, and every lookup on it gives `null`. An id below the smallest, above the largest, or between two neighbours all give `null` as well.',
        contract: [
          'Return an object with a `lookup(id)` method; `lookup` gives back the record object, not its name and not its index.',
          '`buildIndex` reads at most 2 elements of the array: hold the reference, do not copy it and do not index it into a Map.',
          'Each `lookup` reads at most 20 elements of a 64-element array, which rules out a scan.',
          'A missing id gives `null`, including on an index built from an empty array.',
          'Leave the records array as you found it: no sorting, no rewriting, no removing.',
        ],
        starter: `const buildIndex = records => {

};

// Scratch pad — change this and press Run.
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
          'Keep the records array in a closure and write `lookup` as a binary search over it. Nothing has to be built when the index is created, which is what the build budget is checking.',
          'A closed interval works here: `low` at 0, `high` at `records.length - 1`, and loop while `low <= high`. Compare `records[middle].id` against the id you are looking for.',
          'Read `records[middle]` into a local variable once per iteration. Reading it twice still fits inside 20, but one variable makes the three-way comparison easier to follow.',
        ],
        approach: [
          'Return an object whose `lookup` closes over the `records` array, and do not touch the array while building that object.',
          'Inside `lookup`, set `low` to 0 and `high` to the last index.',
          'While `low` is at or below `high`, take the middle index rounding down and read that record.',
          'Return the record when its id matches; otherwise move `low` past the middle for a smaller id, or pull `high` below the middle for a larger one.',
          'Return `null` once the interval is empty, which also covers the index built from an empty array.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'The right record or null, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check an index built from an empty array, a single record, an id below the smallest, an id above the largest, and an id that falls between two neighbours.',
          },
          {
            id: 'logarithmic-lookup',
            label: 'Logarithmic lookup, with nothing built up front',
            critical: true,
            weight: 2,
            detail:
              'One of the two read budgets was exceeded. Scanning the array inside `lookup` goes over the per-lookup budget of 20; copying the records or indexing them into a Map inside `buildIndex` goes over the build budget of 2.',
          },
        ],
        tests: [
          {
            call: "(() => { const index = buildIndex([{ id: 1, name: 'ada' }, { id: 4, name: 'bo' }, { id: 9, name: 'cy' }]); return index.lookup(4); })()",
            expected: { id: 4, name: 'bo' },
          },
          {
            call: "(() => { const index = buildIndex([{ id: 1, name: 'ada' }, { id: 4, name: 'bo' }, { id: 9, name: 'cy' }]); return [index.lookup(0), index.lookup(5), index.lookup(10)]; })()",
            expected: [null, null, null],
            label: 'below, between and above all give null',
            edge: true,
          },
          {
            call: '(() => { const index = buildIndex([]); return index.lookup(1); })()',
            expected: null,
            label: 'an index built from an empty array finds nothing',
            edge: true,
          },
          {
            call: "(() => { const index = buildIndex([{ id: 7, name: 'only' }]); return [index.lookup(7).name, index.lookup(6)]; })()",
            expected: ['only', null],
            label: 'a single record',
            edge: true,
          },
          {
            call: '__lookupReads(__records64(), buildIndex, [100, 200, 352, 999]).names',
            expected: ['rec-00', 'rec-25', 'rec-63', null],
            label: 'four lookups across 64 records, one of them absent',
          },
          {
            call: '__lookupReads(__records64(), buildIndex, [100, 200, 352, 999]).reads <= 80',
            expected: true,
            label: 'four lookups read at most twenty records each',
            criterion: 'logarithmic-lookup',
          },
          {
            call: '__buildReads(__records64(), buildIndex) <= 2',
            expected: true,
            label: 'building the index reads almost nothing',
            criterion: 'logarithmic-lookup',
          },
        ],
        harness: RECORD_PROBE,
      },
    },
    {
      id: 'dsa-v1-d10-repair-traversal',
      kind: 'code',
      purpose: 'project',
      verification: 'machine_verified',
      title: 'Repair a level-order traversal',
      summary: 'The starter walks the tree depth-first and throws on a missing child. Fix all three defects so it comes back level by level.',
      competencies: ['trees', 'arrays-strings'],
      estimatedMinutes: 25,
      code: {
        language: 'javascript',
        prompt:
          'The `levelOrder` in the starter is broken on purpose, and the task is to repair it. When it works, `levelOrder(root)` returns the values of a binary tree level by level, and left to right inside each level.\n\nA node is a plain object `{ value, left, right }`, a missing child is `null`, and a tree is its root node or `null` when empty. `levelOrder(null)` returns `[]`, and a single node returns a one-element array.\n\nThere are three defects. The pending list is read from the back with `pop`, which produces a depth-first order rather than a level-by-level one. Missing children are pushed onto the list, so a later iteration reads `value` off `null` and throws. And an empty tree puts `null` into the list before the loop even starts. Fix all three; rewriting the function completely is fine.',
        contract: [
          'Return an array of values, level by level, and left to right inside each level.',
          'Take the next node from the front of the pending list rather than the back: reading from the back is what makes it depth-first.',
          'Push only children that are not `null`, and return `[]` for an empty tree.',
          'Leave the tree unchanged, and return a fresh array on every call.',
        ],
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

// Scratch pad — change this and press Run.
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
          'A queue is read from the front. Keep a `head` index into `queue`, read `queue[head]`, then step `head` forward. That avoids `shift`, which moves every remaining element down one place on each call.',
          'Guard each child with a `!== null` test before pushing it, and the loop never meets a missing node.',
          'Handle the empty tree before the loop. Returning `[]` straight away is simpler than teaching the loop to skip a `null` root.',
        ],
        approach: [
          'Return `[]` immediately when the root is `null`.',
          'Seed a queue with the root and keep a `head` index starting at 0.',
          'While `head` is below `queue.length`, read `queue[head]` and step `head` forward.',
          'Record that node\'s value, then push its left child and its right child, each only when it is not `null`.',
          'Return the collected values once the head has passed the end of the queue.',
        ],
        tests: [
          {
            call: '(() => { const tree = __build([1, 2, 3, 4, 5, 6, 7]); return levelOrder(tree); })()',
            expected: [1, 2, 3, 4, 5, 6, 7],
            label: 'a full three-level tree',
          },
          {
            call: '(() => { const tree = __build([4, 2, 7, 1, 3, null, 9]); return levelOrder(tree); })()',
            expected: [4, 2, 7, 1, 3, 9],
            label: 'a missing child does not shift the rest of the level',
          },
          {
            call: 'levelOrder(null)',
            expected: [],
            label: 'an empty tree gives an empty array',
            edge: true,
          },
          {
            call: '(() => levelOrder(__leaf(7)))()',
            expected: [7],
            label: 'a single node',
            edge: true,
          },
          {
            call: "(() => { const tree = __chain([1, 2, 3, 4], 'left'); return levelOrder(tree); })()",
            expected: [1, 2, 3, 4],
            label: 'a left-leaning chain, one node per level',
            edge: true,
          },
          {
            call: '(() => { const tree = __build([10, 5, null, null, 8]); return levelOrder(tree); })()',
            expected: [10, 5, 8],
            label: 'a node whose only child is on the right',
            edge: true,
          },
          {
            call: '(() => { const tree = __build([1, 2, 3]); const before = JSON.stringify(tree); levelOrder(tree); return JSON.stringify(tree) === before; })()',
            expected: true,
            label: 'the tree comes back unchanged',
          },
        ],
        harness: TREE_PROBE,
      },
    },
    {
      id: 'dsa-v1-d10-frequency-index',
      kind: 'code',
      purpose: 'project',
      verification: 'machine_verified',
      title: 'Count once, answer many',
      summary: 'Answer forty queries against fifty values inside a read budget that a scan per query cannot meet.',
      competencies: ['maps-sets', 'complexity', 'arrays-strings'],
      estimatedMinutes: 30,
      code: {
        language: 'javascript',
        prompt:
          '`mostFrequent(values, queries)` takes an array of values and an array of query values, and returns an array of counts: one per query, in the same order, saying how many times that query value appears in `values`.\n\n`mostFrequent(["a", "b", "a", "c", "a"], ["a", "c", "z"])` gives `[3, 1, 0]`. A query value that never appears gives 0. An empty `queries` array gives `[]`, an empty `values` array gives a zero for every query, and a repeated query gets its own count each time. Values keep their type: the number `1` and the string `"1"` are different values and are counted separately.\n\nAnswering each query with its own scan works, and on the graded input it reads 40 × 50 = 2000 elements. Counting every value once first and then answering each query from that count reads 50. The grade counts element reads of `values` across the whole call and allows at most 200 for 40 queries against 50 values.',
        contract: [
          'Return a new array with one count per query, in the order the queries arrived.',
          'Count each value by its own identity: `1` and `"1"` are two different values.',
          'Read at most 200 elements of `values` across the whole call; the graded input is 40 queries against 50 values, so a scan per query cannot fit.',
          'Leave both input arrays as you found them.',
        ],
        starter: `const mostFrequent = (values, queries) => {

};

// Scratch pad — change this and press Run.
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
          'Walk `values` once and build a Map from each value to its count. After that the queries never touch `values` again, which is the whole point of the read budget.',
          'A Map keeps `1` and `"1"` apart. A plain object turns both keys into the string `"1"` and merges the two counts.',
          '`counts.get(query)` is `undefined` for a value that never appeared, so fall back to 0 before putting it in the result.',
        ],
        approach: [
          'Create an empty Map for the counts.',
          'Walk `values` once, and for each one store its current count plus one, treating a missing entry as zero.',
          'Walk `queries` in order and read each query out of the Map.',
          'Use 0 when the Map holds nothing for that query.',
          'Return the array of counts, which is as long as `queries`.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'The right counts, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check an empty values array, an empty queries array, a query that never appears, a repeated query, and values whose types differ but whose text looks the same.',
          },
          {
            id: 'preprocessed',
            label: 'One pass over the values, whatever the query count',
            critical: true,
            weight: 2,
            detail: 'The read counter went over 200 for 40 queries against 50 values. Scanning `values` inside the query loop lands here even when every count is right.',
          },
        ],
        tests: [
          { call: "mostFrequent(['a', 'b', 'a', 'c', 'a'], ['a', 'c', 'z'])", expected: [3, 1, 0] },
          { call: "mostFrequent([], ['a', 'b'])", expected: [0, 0], label: 'no values gives a zero per query', edge: true },
          { call: "mostFrequent(['a', 'a'], [])", expected: [], label: 'no queries gives an empty array', edge: true },
          { call: 'mostFrequent([1, 2, 2, 3], [2, 2])', expected: [2, 2], label: 'a repeated query is answered twice', edge: true },
          {
            call: "mostFrequent([1, '1', 1], [1, '1'])",
            expected: [2, 1],
            label: 'the number 1 and the string "1" are separate values',
            edge: true,
          },
          { call: 'mostFrequent([0, 0, 0], [0])', expected: [3], label: 'zero is an ordinary value, not a missing one', edge: true },
          {
            call: '__countReads(__pool50(), function (view) { return mostFrequent(view, __queries40()); }).reads <= 200',
            expected: true,
            label: 'forty queries against fifty values read at most two hundred elements',
            criterion: 'preprocessed',
          },
        ],
        harness: FREQUENCY_PROBE,
      },
    },
  ],
  requires: [
    { activityId: 'dsa-v1-d10-final-checks', state: 'verified_pass' },
    { activityId: 'dsa-v1-d10-record-index', state: 'verified_pass' },
    { activityId: 'dsa-v1-d10-repair-traversal', state: 'verified_pass' },
    { activityId: 'dsa-v1-d10-frequency-index', state: 'verified_pass' },
  ],
};
