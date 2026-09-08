/** D01 — Big O, growth and space.
 *
 * The module the rest of the path leans on: what a growth class actually
 * claims, which cost model it claims it under, and why extra space deserves
 * its own answer. Two lessons, four objective checks, three coding exercises.
 *
 * The two probe-graded exercises hand the learner an ordinary array and count
 * element reads through a Proxy declared in the task harness. That is a
 * bounded contract — it proves this routine stayed inside the stated read
 * budget on these inputs — and never a proof about arbitrary code. */

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

export const DSA_D01: ModuleSource = {
  id: 'dsa-v1-d01',
  title: 'Big O, growth and space',
  outcomes: [
    'Give the tightest growth class a piece of code supports, for time and for extra space separately.',
    'Say which cost model you assumed — what counts as one step — before quoting a class.',
    'Tell an upper bound apart from a worst case, and a dominant term apart from a constant factor.',
  ],
  competencies: ['complexity'],
  dependsOn: [],
  estimatedMinutes: 150,
  lessons: [
    {
      id: 'dsa-v1-d01-l1',
      title: 'Counting work, not seconds',
      summary: 'What a growth class claims, why the tightest one is the useful answer, and where best, average and worst fit in.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Algorithms', url: 'https://cs50.harvard.edu/x/weeks/3/', reviewedOn: '2026-09-08' },
        {
          label: 'MDN — Loops and iteration',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'Timing a function tells you about your laptop. Counting its steps tells you about the function. Big O is the second thing: a claim about how the number of steps grows as the input gets larger, with the machine deliberately left out of it.',
        },
        {
          kind: 'prose',
          body:
            'Write O(f(n)) and you are claiming that beyond some input size, the real cost stays below a constant multiple of f(n). It is an upper bound, and it is a bound on the cost function you chose to analyse. That second half is the part people drop, and it is why "O(n²) is the worst case" is a sentence with two different ideas glued together.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Best, average and worst name *which* cost function you are describing — the cheapest input of that size, the typical one, the most expensive one. Big O then bounds whichever of those you picked. You can write an upper bound on the best case perfectly happily; it just says less.',
        },
        {
          kind: 'prose',
          body:
            'Because O is an upper bound, O(n²) is technically true of a routine that runs in a single pass. It is also useless. So when a question asks for the growth class, it is asking for the tightest class the code supports: the smallest family you can honestly claim.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const sumAndMax = values => {\n  let total = 0;\n  for (const value of values) total += value;\n\n  let largest = values[0];\n  for (const value of values) if (value > largest) largest = value;\n\n  return { total, largest };\n};',
          caption: 'Two loops, one after the other: 2n steps, which is still the linear family.',
        },
        {
          kind: 'prose',
          body:
            'Two sequential passes cost 2n steps, and 2n is a constant multiple of n, so the class is O(n). Constants and lower-order terms fall away because they stop mattering as n grows: n² + 500n + 9000 is O(n²), and for a large enough n the 500n is a rounding error next to the n².',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Dropping constants is a statement about growth, not about speed. A 2n routine really does take about twice as long as an n routine on the same input. Big O says they scale the same way, not that they cost the same.',
        },
        {
          kind: 'prose',
          body:
            'Nesting is where the families change. A loop inside a loop over the same n-sized input visits about n² pairs. But nesting alone does not make something quadratic — what matters is how many times the inner body actually runs.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const crossPairs = (rows, columns) => {\n  const out = [];\n  for (const row of rows) {\n    for (const column of columns) out.push(row + column);\n  }\n  return out;\n};',
          caption: 'Two independent inputs: the cost is O(nm), and calling that O(n²) hides which input to shrink.',
        },
        {
          kind: 'prose',
          body:
            'Two nested loops over two *different* collections cost O(nm). Two loops one after the other over two different collections cost O(n + m). Collapsing either into O(n²) throws away the thing you would act on — which of the two inputs is the expensive one.',
        },
        {
          kind: 'table',
          caption: 'The eight families this path asks you to recognise, with the shape that produces each.',
          headers: ['Class', 'What produces it', 'Example'],
          rows: [
            ['O(1)', 'A fixed number of steps, whatever the input size', 'Reading `values[0]`'],
            ['O(log n)', 'Repeated halving or doubling', 'Binary search on a sorted array'],
            ['O(n)', 'One traversal of the input', 'Summing every element'],
            ['O(n log n)', 'Logarithmically many levels, linear work per level', 'Merge sort'],
            ['O(n²)', 'Every pair of an n-sized input', 'Selection sort'],
            ['O(n³)', 'Three n-sized nested dimensions', 'Naive matrix multiplication'],
            ['O(2ⁿ)', 'A two-way choice at every one of n steps', 'Enumerating every subset'],
            ['O(n!)', 'Every ordering of n items', 'Enumerating every permutation'],
          ],
        },
        {
          kind: 'prose',
          body:
            'The last two are recognition targets, not implementation targets. You should be able to look at a routine that branches twice per step and say "this doubles with every extra element, so 40 elements is already out of reach" — without writing a subset enumerator to prove it.',
        },
        {
          kind: 'trace',
          caption: 'Halving 16 down to 1: four steps, which is why repeated halving is the logarithmic family.',
          trace: {
            shape: 'counter',
            frames: [
              { cells: ['16'], note: 'Start at 16. No halving has happened yet.', counter: { label: 'Halvings', value: 0 } },
              { cells: ['8'], note: '16 halves to 8. One step.', counter: { label: 'Halvings', value: 1 } },
              { cells: ['4'], note: '8 halves to 4. Two steps.', counter: { label: 'Halvings', value: 2 } },
              { cells: ['2'], note: '4 halves to 2. Three steps.', counter: { label: 'Halvings', value: 3 } },
              { cells: ['1'], note: '2 halves to 1, and the halving stops. Four steps for sixteen elements — that is log₂ 16.', counter: { label: 'Halvings', value: 4 } },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Doubling the input adds one step, not twice as many. That is the whole appeal of the logarithmic family, and why sorting once so you can binary search repeatedly is often worth it.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Log bases differ by a constant factor, so O(log₂ n) and O(log₁₀ n) are the same class and both are written O(log n). This path counts halvings, so its traces use base 2.',
        },
        {
          kind: 'prose',
          body:
            'Two neighbours are worth naming once. Θ (Theta) is a tight bound — an upper *and* a lower bound of the same family, so the cost really does grow like that. Ω (Omega) is a lower bound: the cost is at least this. This path asks for O throughout and asks for the tightest one, which is close enough to Θ for the code you will meet here.',
        },
      ],
    },
    {
      id: 'dsa-v1-d01-l2',
      title: 'Space, and the cost model you assumed',
      summary: 'Auxiliary space against total space, the memory a recursion stack borrows, and what "one step" was taken to mean.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Data structures notes', url: 'https://cs50.harvard.edu/x/notes/5/', reviewedOn: '2026-09-08' },
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
            'Time is one answer; space is a second, separate one. Two routines that both run in O(n) can differ completely in what they allocate, and on a large input that difference is the one that fails.',
        },
        {
          kind: 'prose',
          body:
            'Total space counts the input too. Auxiliary space counts only what the routine allocates on top of it. Both are legitimate answers, so the useful habit is saying which you mean: "linear time, constant auxiliary space" leaves nothing to guess.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// Constant auxiliary space: one accumulator, whatever the input size.\nconst total = values => {\n  let sum = 0;\n  for (const value of values) sum += value;\n  return sum;\n};\n\n// Linear auxiliary space: a second array as long as the first.\nconst doubled = values => values.map(value => value * 2);',
          caption: 'Same linear time, different auxiliary space.',
        },
        {
          kind: 'prose',
          body:
            'Copying is the usual source of the difference, and in JavaScript it is easy to do by accident. `slice`, `map`, `filter`, `concat` and spreading all build a new array. Inside a loop, an innocent-looking `values.slice(1)` turns a linear routine into a quadratic one, because each copy is itself linear.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'The same trap applies to `shift` and `unshift`. Removing the first element of an array means every later element moves down one place, so it is linear in the array length — not the constant-time operation the one-word call suggests.',
        },
        {
          kind: 'prose',
          body:
            'Recursion borrows space without allocating anything you can see. Every call in flight keeps a frame on the call stack, so a chain n calls deep needs O(n) stack space even if the function body allocates nothing at all. A loop doing the same work needs none of it.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const countDown = n => {\n  if (n <= 0) return 0;\n  return 1 + countDown(n - 1);\n};',
          caption: 'Linear time and linear stack space: n frames are open before the first one returns.',
        },
        {
          kind: 'prose',
          body:
            'Preprocessing is the other side of the ledger. Sorting an array costs O(n log n) once. If that buys you binary search for every later lookup, a thousand lookups drop from a thousand linear scans to a thousand logarithmic ones, and the sort pays for itself many times over. One lookup, and it never does.',
        },
        {
          kind: 'prose',
          body:
            'All of this rests on a cost model: an assumption about what counts as one step. This path uses the usual teaching model — reading or writing one array slot, comparing two numbers, doing one arithmetic operation are each one step. Say so when you quote a class, because the model is what makes the number meaningful.',
        },
        {
          kind: 'table',
          caption: 'The assumptions this path makes, and what they are not promising.',
          headers: ['Assumption', 'What it means here', 'What it does not claim'],
          rows: [
            [
              'Array indexing is one step',
              'Reading `values[i]` counts as a single operation',
              'That a JavaScript array is a contiguous C array; engines use several representations',
            ],
            [
              'Appending amortises to one step',
              'A long run of `push` calls averages out to constant work each',
              'That any individual `push` is constant — the occasional resize is not',
            ],
            [
              'Map and Set operations are expected constant',
              '`get`, `set` and `has` average out to a fixed number of steps',
              'A worst-case guarantee; heavy collisions degrade toward linear',
            ],
            [
              'A basic BST costs O(h)',
              'Search and insert follow one root-to-leaf path of height h',
              'That h is log n — an unbalanced tree can be a chain, making h equal n',
            ],
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Numeric input has a second trap. A loop that runs `n` times is linear in the *value* of n, but n is written in about log n digits, so measured against its input size the routine is exponential. This path stays with the unit-cost model and small inputs, and says so where it matters.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'dsa-v1-d01-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: counting work, not seconds',
      summary: 'Growth classes, the tightest supported answer, and where best, average and worst fit in.',
      competencies: ['complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d01-l1',
    },
    {
      id: 'dsa-v1-d01-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: space, and the cost model you assumed',
      summary: 'Auxiliary against total space, recursion stack depth, copying cost and the stated assumptions.',
      competencies: ['complexity'],
      estimatedMinutes: 20,
      lessonId: 'dsa-v1-d01-l2',
    },
    {
      id: 'dsa-v1-d01-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Growth and space checks',
      summary: 'Four questions on fresh snippets: the tightest class, two independent inputs, auxiliary space, and what Big O actually claims.',
      competencies: ['complexity'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'dsa-v1-d01-q1',
          prompt: 'What is the tightest growth class for the running time of `summarise`, in terms of the length n of `values`?',
          context: {
            language: 'javascript',
            code: 'const summarise = values => {\n  let total = 0;\n  for (const value of values) total += value;\n\n  let smallest = values[0];\n  for (const value of values) if (value < smallest) smallest = value;\n\n  return { total, smallest, first: values[0] };\n};',
          },
          options: ['O(n)', 'O(n²)', 'O(1)', 'O(n log n)'],
          correct: 0,
          explanation:
            'Two loops run one after the other, so the work is 2n plus a couple of constant-time reads. Constant factors and lower-order terms drop, leaving O(n). Sequential loops add; only nesting multiplies. O(n²) would be a true upper bound but not the tightest one, and the question asks for the tightest.',
          competencies: ['complexity'],
        },
        {
          id: 'dsa-v1-d01-q2',
          prompt: '`labels` has n entries and `sizes` has m entries, and the two lengths are unrelated. What is the tightest growth class for `combine`?',
          context: {
            language: 'javascript',
            code: 'const combine = (labels, sizes) => {\n  const out = [];\n  for (const label of labels) {\n    for (const size of sizes) out.push(`${label}-${size}`);\n  }\n  return out;\n};',
          },
          options: ['O(nm)', 'O(n²)', 'O(n + m)', 'O(n log m)'],
          correct: 0,
          explanation:
            'The inner loop runs m times for each of the n outer iterations, so the body runs nm times. Calling it O(n²) would assume the two inputs grow together, and it hides the useful fact: shrinking whichever list is longer is what helps. O(n + m) would be the answer if the loops were sequential rather than nested.',
          competencies: ['complexity'],
        },
        {
          id: 'dsa-v1-d01-q3',
          prompt: 'What is the auxiliary space — the memory used beyond the input itself — of `runningTotals`, for an input of length n?',
          context: {
            language: 'javascript',
            code: 'const runningTotals = values => {\n  const out = [];\n  let sum = 0;\n  for (const value of values) {\n    sum += value;\n    out.push(sum);\n  }\n  return out;\n};',
          },
          options: [
            'O(n) — the returned array grows to the length of the input',
            'O(1) — only `sum` is allocated',
            'O(n²) — one array entry per pair of inputs',
            'O(log n) — the array doubles as it grows',
          ],
          correct: 0,
          explanation:
            '`out` ends up with one entry per input element, so it is linear in n. The single `sum` accumulator is constant and does not change the class. The doubling that a growable array does internally affects how often it resizes, not how much it ends up holding.',
          competencies: ['complexity'],
        },
        {
          id: 'dsa-v1-d01-q4',
          prompt: 'A colleague says: "This lookup is O(n), so n steps is its worst case." What is wrong with that sentence?',
          options: [
            'O(n) is an upper bound on whichever case is being analysed; it does not by itself mean the worst case.',
            'Nothing — O(n) and "worst case" mean the same thing.',
            'O(n) describes memory, so it cannot say anything about steps.',
            'O(n) means exactly n steps, so "worst case" is redundant.',
          ],
          correct: 0,
          explanation:
            'Best, average and worst say which input of size n you are costing; Big O bounds the cost function you picked. You can bound the best case just as legitimately. And O(n) does not mean exactly n steps — it means the growth stays within a constant multiple of n, so 3n + 12 is O(n) too.',
          competencies: ['complexity'],
        },
      ],
    },
    {
      id: 'dsa-v1-d01-linear-accumulator',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'One pass, counted',
      summary: 'Sum the even numbers in a single traversal, and prove it by staying inside a read budget of one read per element.',
      competencies: ['complexity', 'arrays-strings'],
      estimatedMinutes: 15,
      code: {
        language: 'javascript',
        prompt:
          'Write `sumOfEvens(values)`, returning the sum of the even numbers in an array of whole numbers. `sumOfEvens([1, 2, 3, 4])` gives 6, and an empty array gives 0. Negative even numbers count, and zero is even.\n\nThe grade counts how many times you read an element by index. One traversal is allowed: at most one read per element. Reading the same element twice, or scanning the array a second time, goes over budget even when the answer is right.',
        contract: [
          'Read each element at most once — the graded budget is one read per element.',
          'Do not sort, copy or slice the input; a copy reads every element again.',
          'Return a number, and return 0 for an empty array.',
        ],
        starter: `const sumOfEvens = values => {

};

// Scratch pad — change this and press Run.
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
          'A single `for…of` loop visits each element exactly once, which is the whole budget — inside it, decide whether the value is even and add it or skip it.',
          'A number is even when the remainder after dividing by two is zero. That test works for negatives too: -4 % 2 is 0.',
        ],
        approach: [
          'Start a running total at zero.',
          'Walk the array once, binding each element as you go.',
          'Add the element to the total when its remainder after dividing by two is zero.',
          'Return the total; an empty array never enters the loop and gives zero.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct sum, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check the empty array, an array with no even numbers, negative even numbers and zero.',
          },
          {
            id: 'single-pass',
            label: 'At most one read per element',
            critical: true,
            weight: 2,
            detail: 'The read counter went over one per element. A second traversal, a copy, or re-reading an element inside the loop all show up here.',
          },
        ],
        tests: [
          { call: 'sumOfEvens([1, 2, 3, 4])', expected: 6 },
          { call: 'sumOfEvens([])', expected: 0, label: 'an empty array sums to zero', edge: true },
          { call: 'sumOfEvens([1, 3, 5])', expected: 0, label: 'no even numbers gives zero', edge: true },
          { call: 'sumOfEvens([-4, -3, 0, 7])', expected: -4, label: 'negatives and zero are even too', edge: true },
          {
            call: '__countReads([1, 2, 3, 4, 5, 6], function (view) { return sumOfEvens(view); }).reads <= 6',
            expected: true,
            label: 'six elements are read at most six times',
            criterion: 'single-pass',
          },
        ],
        harness: READ_PROBE,
      },
    },
    {
      id: 'dsa-v1-d01-halving-counter',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Halving counter',
      summary: 'Count the halvings it takes to reach 1, the shape behind every logarithmic routine.',
      competencies: ['complexity'],
      estimatedMinutes: 15,
      code: {
        language: 'javascript',
        prompt:
          'Write `halvingSteps(n)`, returning how many times a whole number of 1 or more can be halved — rounding down each time — before it reaches 1. `halvingSteps(1)` gives 0, `halvingSteps(8)` gives 3, and `halvingSteps(10)` gives 3, because 10 goes to 5, then 2, then 1.\n\nThis is the count a binary search makes on an array of n elements, and it is why doubling the input adds one step rather than doubling the work.',
        contract: [
          'Halve by dividing by two and rounding down, not by dividing exactly.',
          'Count the halvings, not the values visited: reaching 1 from 1 is zero steps.',
          'The input is a whole number of 1 or more.',
        ],
        starter: `const halvingSteps = n => {

};

// Scratch pad — change this and press Run.
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
          'Keep a counter and a working value. While the value is above 1, halve it with `Math.floor(value / 2)` and add one to the counter.',
          'Starting at 1 means the loop body never runs, so the answer is 0. That is the base of the logarithm, not a special case to hard-code.',
        ],
        approach: [
          'Start the step counter at zero and copy the input into a working value.',
          'While the working value is greater than 1, replace it with half of itself rounded down.',
          'Add one to the counter on every halving.',
          'Return the counter once the value has reached 1.',
        ],
        tests: [
          { call: 'halvingSteps(1)', expected: 0, label: 'one is already there', edge: true },
          { call: 'halvingSteps(8)', expected: 3 },
          { call: 'halvingSteps(10)', expected: 3, label: 'rounding down: 10, 5, 2, 1' },
          { call: 'halvingSteps(2)', expected: 1, label: 'the smallest halving', edge: true },
          { call: 'halvingSteps(1024)', expected: 10, label: 'a thousand elements in ten steps' },
        ],
      },
    },
    {
      id: 'dsa-v1-d01-pair-versus-pass',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'A pass instead of every pair',
      summary: 'The widest gap in an array, under a read budget that rules out comparing every pair.',
      competencies: ['complexity', 'arrays-strings'],
      estimatedMinutes: 25,
      code: {
        language: 'javascript',
        prompt:
          'Write `maxGap(values)`, returning the difference between the largest and the smallest number in the array. `maxGap([3, 9, 1])` gives 8. An array with one element gives 0, and an empty array gives 0.\n\nComparing every pair would answer this too, and it would read the array about n²/2 times. The grade allows at most two reads per element, which a single pass tracking the smallest and largest values so far comfortably fits inside — and which a pairwise scan cannot.',
        contract: [
          'Read each element at most twice — the graded budget is 2n reads for n elements.',
          'Do not sort the array: sorting reads and writes far more than the budget allows.',
          'An empty array and a single-element array both give 0.',
        ],
        starter: `const maxGap = values => {

};

// Scratch pad — change this and press Run.
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
          'You do not need the pairs. The widest gap is always between the smallest and the largest element, so one pass that remembers both is enough.',
          'Seed both the smallest and the largest with the first element, then compare each later element against them.',
        ],
        approach: [
          'Return 0 immediately when the array holds fewer than two elements.',
          'Seed a smallest and a largest with the first element.',
          'Walk the array once, lowering the smallest or raising the largest when an element falls outside the pair.',
          'Return the largest minus the smallest.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct gap, including the edge cases',
            critical: true,
            weight: 3,
            detail: 'Check empty, single-element, all-equal and negative-value arrays.',
          },
          {
            id: 'linear-budget',
            label: 'At most two reads per element',
            critical: true,
            weight: 2,
            detail: 'The read counter went over 2n. Comparing every pair, or sorting first, both land here — the answer can be right and still miss the point of the exercise.',
          },
        ],
        tests: [
          { call: 'maxGap([3, 9, 1])', expected: 8 },
          { call: 'maxGap([])', expected: 0, label: 'an empty array has no gap', edge: true },
          { call: 'maxGap([5])', expected: 0, label: 'one element has no gap', edge: true },
          { call: 'maxGap([-4, -1, -9])', expected: 8, label: 'negative values', edge: true },
          { call: 'maxGap([7, 7, 7])', expected: 0, label: 'all equal', edge: true },
          {
            call: '__countReads([4, 8, 15, 16, 23, 42], function (view) { return maxGap(view); }).reads <= 12',
            expected: true,
            label: 'six elements are read at most twelve times',
            criterion: 'linear-budget',
          },
        ],
        harness: READ_PROBE,
      },
    },
  ],
  requires: [
    { activityId: 'dsa-v1-d01-checks', state: 'verified_pass' },
    { activityId: 'dsa-v1-d01-linear-accumulator', state: 'verified_pass' },
    { activityId: 'dsa-v1-d01-halving-counter', state: 'verified_pass' },
    { activityId: 'dsa-v1-d01-pair-versus-pass', state: 'verified_pass' },
  ],
};
