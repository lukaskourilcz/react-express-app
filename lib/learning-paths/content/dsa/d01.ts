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
        { label: 'NIST — Big O definition', url: 'https://xlinux.nist.gov/dads/HTML/bigOnotation.html', reviewedOn: '2026-10-14' },
        { label: 'Cornell CS 2110 — Analyzing complexity', url: 'https://courses.cs.cornell.edu/courses/cs2110/2026fa/lectures/lec05/', reviewedOn: '2026-10-14' },
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
            'A linear-time routine also has an O(n²) upper bound, but that bound is looser than the O(n) one we can give. In this path, a question asking for the growth class wants the tightest supported class under the stated cost model.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const sumAndMax = values => {\n  let total = 0;\n  for (const value of values) total += value;\n\n  let largest = values[0];\n  for (const value of values) if (value > largest) largest = value;\n\n  return { total, largest };\n};',
          caption: 'Two loops, one after the other: 2n steps, which is still the linear family.',
        },
        {
          kind: 'example',
          language: 'javascript',
          code: `// Count the steps rather than timing them.
let steps = 0;
const sumAndMax = values => {
  let total = 0;
  for (const value of values) { steps++; total += value; }

  let largest = values[0];
  for (const value of values) { steps++; if (value > largest) largest = value; }

  return { total, largest };
};

sumAndMax([3, 9, 4, 1, 7]);
console.log("n = 5 costs", steps, "steps");

// Change the list below and watch the count follow it.
steps = 0;
sumAndMax([3, 9, 4, 1, 7, 2, 8, 6, 5, 0]);
console.log("n = 10 costs", steps, "steps");`,
          caption: 'Two passes over the same list, with the steps counted rather than timed.',
          note: 'Double the input and the count doubles: that is what linear means. Change the lists and see whether it keeps holding.',
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
            'Dropping constants describes growth, not elapsed time. In the equal-cost-step model, two full passes do about twice the work of one. Actual speed also depends on the operations, input and runtime.',
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
          caption: 'For n rows and m columns, the body runs nm times. With constant-cost addition and append, running time is O(nm).',
        },
        {
          kind: 'prose',
          body:
            'For constant-cost loop bodies, nested traversals over independent collections of sizes n and m take O(nm) work. Sequential traversals take O(n + m). Keep both dimensions when their sizes can vary independently.',
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
            ['O(2ⁿ)', 'A two-way choice at every one of n steps', 'Visiting subset-choice states, excluding the cost of copying each output'],
            ['O(n!)', 'Every ordering of n items', 'Visiting permutation states, excluding the cost of copying each output'],
          ],
        },
        {
          kind: 'prose',
          body:
            'The last two are recognition targets. A binary choice at each of 40 positions creates about a trillion possible combinations. You can recognize that growth without implementing a subset enumerator.',
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
        { label: 'MDN — Array.prototype.sort', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort', reviewedOn: '2026-10-14' },
        { label: 'MDN — Map', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map', reviewedOn: '2026-10-14' },
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
            'Copying can add work and memory. `slice`, `map`, `filter`, `concat` and array spread produce new arrays. Copying a list of roughly n elements on each of n loop iterations takes quadratic copying work; one such copy takes linear work.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'In this path’s array model, `shift` and `unshift` take linear work to change later indexed positions. Count them as linear operations; a short method name does not imply constant work.',
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
            'Preprocessing can pay for later queries. A comparison sort such as merge sort costs O(n log n) in the worst case; later binary searches cost O(log n) each. Compare the sorting cost plus the expected queries with repeated linear scans. JavaScript does not promise one particular complexity for its built-in sort.',
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
              'Hash-table operations use expected constant work',
              'This model assumes `get`, `set` and `has` average out to constant work',
              'A guarantee for every JavaScript engine; Map and Set require average sublinear access, not a particular representation',
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
          prompt: 'For an array of n numbers, what is the tightest running-time growth class for `summarise`? Use constant-cost numeric operations and array access.',
          context: {
            language: 'javascript',
            code: 'const summarise = values => {\n  let total = 0;\n  for (const value of values) total += value;\n\n  let smallest = values[0];\n  for (const value of values) if (value < smallest) smallest = value;\n\n  return { total, smallest, first: values[0] };\n};',
          },
          options: ['O(n)', 'O(n²)', 'O(1)', 'O(n log n)'],
          correct: 0,
          explanation:
            'Two full loops run sequentially, taking linear work in total under the stated cost model. A constant factor of two does not change the O(n) class. O(n²) is a looser upper bound, not the tightest one; nesting would need its own iteration-count analysis.',
          competencies: ['complexity'],
        },
        {
          id: 'dsa-v1-d01-q2',
          prompt: '`labels` has n entries and `sizes` has m entries; the lengths are unrelated. Assume each entry has bounded length, so creating one output string costs constant work. What is the tightest running-time growth class for `combine`?',
          context: {
            language: 'javascript',
            code: 'const combine = (labels, sizes) => {\n  const out = [];\n  for (const label of labels) {\n    for (const size of sizes) out.push(`${label}-${size}`);\n  }\n  return out;\n};',
          },
          options: ['O(nm)', 'O(n²)', 'O(n + m)', 'O(n log m)'],
          correct: 0,
          explanation:
            'The body runs m times for each of the n outer iterations, giving nm constant-cost outputs under the stated length assumption. The two dimensions are independent, so O(n²) does not describe their general cost. Sequential traversals would add to O(n + m); these traversals are nested.',
          competencies: ['complexity'],
        },
        {
          id: 'dsa-v1-d01-q3',
          prompt: 'What is the auxiliary space of `runningTotals` for an array of n numbers? Count the returned array, and treat each number and array slot as fixed-size storage.',
          context: {
            language: 'javascript',
            code: 'const runningTotals = values => {\n  const out = [];\n  let sum = 0;\n  for (const value of values) {\n    sum += value;\n    out.push(sum);\n  }\n  return out;\n};',
          },
          options: [
            'O(n), because the output stores one total for each input element.',
            'O(1), because only the accumulator counts as additional memory.',
            'O(n²), because the loop stores one total for every input pair.',
            'O(log n), because the array needs only logarithmically many resizes.',
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
            'Big O bounds the chosen cost function; it need not describe worst-case cost.',
            'Big O always bounds worst-case cost; saying worst case is simply redundant.',
            'Big O only bounds space usage; it cannot describe the running time.',
            'Big O gives an exact step count; the lookup must take exactly n steps.',
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
      summary: 'Sum even values while keeping original-input reads within an n-read budget.',
      competencies: ['complexity', 'arrays-strings'],
      estimatedMinutes: 15,
      code: {
        language: 'javascript',
        prompt:
          'Write `sumOfEvens(values)` for an array of integers, without changing it. Return the sum of its even values: `[1, 2, 3, 4]` gives 6 and empty input gives 0. Include negative even integers and zero. Target: O(n) time, where n is the number of input elements.\n\nThe grade counts indexed reads of the original input and permits at most n reads in total. This is a bounded input-access check; it does not measure work on copies or prove your program’s memory use.',
        contract: [
          'Use at most n indexed reads of the original input in total.',
          'Do not change the input array.',
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
          'Separate reading a value from deciding whether to include it. Accessing the same array index again uses another part of the read budget.',
          'Check your condition with negative integers and zero as well as positive even numbers.',
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
            label: 'At most n input reads in total',
            critical: true,
            weight: 2,
            detail: 'The total input-read counter exceeded n. Cache a value rather than reading its input slot again; a second input traversal also spends reads.',
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
          'Write `halvingSteps(n)` for an integer n of 1 or more. Count how many times it can be halved, rounding down each time, before it reaches 1. `halvingSteps(1)` gives 0, `halvingSteps(8)` gives 3 and `halvingSteps(10)` gives 3: 10, 5, 2, 1. Target: O(log n) time, where n is the starting numeric value.\n\nThis is the repeated-halving shape behind binary search. An actual search also counts its comparisons; those counts need not equal this exercise’s number of halvings.',
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
          'Track how many changes you make and the value after each change. Decide whether the initial value already meets the stopping rule.',
          'Try an odd value such as 7. Check that each intermediate value remains an integer.',
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
      summary: 'Find the widest gap while keeping original-input reads within a 2n-read budget.',
      competencies: ['complexity', 'arrays-strings'],
      estimatedMinutes: 25,
      code: {
        language: 'javascript',
        prompt:
          'Write `maxGap(values)` for an array of finite numbers, without changing it. Return the largest minus the smallest value; `[3, 9, 1]` gives 8. Empty or single-element input gives 0. Target: O(n) time, where n is the input length.\n\nThe grade permits at most 2n indexed reads of the original input in total on its checked inputs. A scan of every input pair exceeds that budget. Work performed on a copy is not counted by this probe.',
        contract: [
          'Use at most 2n indexed reads of the original input in total.',
          'Do not change the input array.',
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
          'Think about which two values determine the widest gap. You need not store a result for each possible pair.',
          'Try an array containing only negative numbers before choosing initial comparison values.',
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
            label: 'At most 2n input reads in total',
            critical: true,
            weight: 2,
            detail: 'The total input-read counter exceeded 2n. Comparing every input pair repeatedly accesses the original array; a result can be correct while exceeding this budget.',
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
