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
 * the learner handed back the very object they were given. Appended after the
 * learner's code, so it cannot be shadowed. */
const WRITE_PROBE = `
var __countWrites = function (values, run) {
  var writes = 0;
  var proxy = new Proxy(values, {
    set: function (target, prop, value) {
      if (typeof prop === 'string' && /^[0-9]+$/.test(prop)) writes += 1;
      target[prop] = value;
      return true;
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
  lessons: [
    {
      id: 'dsa-v1-d02-l1',
      title: 'Indexing, traversal and what a change costs',
      summary: 'Reading by position, walking the whole array, changing it in place against building a new one, and the real price of push, pop, shift, unshift, slice and splice.',
      estimatedMinutes: 20,
      sources: [
        {
          label: 'MDN — Array',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'MDN — Array.prototype.splice',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'An array is a numbered row of slots, and the number is the address. `values[3]` goes straight to the fourth slot without looking at the three in front of it, so reading or writing one element counts as a single step under this path’s cost model. Every technique in this module leans on that one property.',
        },
        {
          kind: 'prose',
          body:
            'Traversal is the other half. `for…of` binds each element in turn, an index loop gives you the position as well, and both visit n elements in n steps. Take the index loop whenever the position matters: comparing neighbours, writing back into the array, or walking in from both ends.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// Element only.\nfor (const value of values) total += value;\n\n// Element and position, so you can look at the neighbour.\nfor (let i = 1; i < values.length; i += 1) {\n  if (values[i] > values[i - 1]) rises += 1;\n}\n\n// Back to front, so removing an element does not skip the next one.\nfor (let i = values.length - 1; i >= 0; i -= 1) {\n  if (values[i] === 0) values.splice(i, 1);\n}',
          caption: 'Three traversals of the same array: element only, element with position, and back to front.',
        },
        {
          kind: 'prose',
          body:
            'There are two ways to change an array, and they promise the caller different things. Writing `values[i] = next` changes the array the caller is still holding. `map`, `filter`, `slice` and spreading leave that array alone and hand back a second one. After the first kind of call the caller’s variable points at different data; after the second kind it does not.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// In place: the caller\'s array changes, and the same array comes back.\nconst doubleInPlace = values => {\n  for (let i = 0; i < values.length; i += 1) values[i] = values[i] * 2;\n  return values;\n};\n\n// Copying: the input is untouched and a second array of the same length appears.\nconst doubled = values => values.map(value => value * 2);',
          caption: 'Two routines that print the same numbers and make opposite promises about the input.',
        },
        {
          kind: 'example',
          language: 'javascript',
          code: `const source = [1, 2, 3];

const doubleInPlace = values => {
  for (let i = 0; i < values.length; i += 1) values[i] = values[i] * 2;
  return values;
};
const doubled = values => values.map(value => value * 2);

const copy = doubled(source);
console.log("after copying, source is", source);

const same = doubleInPlace(source);
console.log("after in place, source is", source);
console.log("and the returned array is the same object:", same === source);`,
          caption: 'The same doubling done both ways, printing what happens to the array that was passed in.',
          note: 'Reorder the two calls and see how the second one starts from what the first left behind.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Name which one you wrote. `sortInPlace` and `sortedCopy` cost nothing to type and save every later reader from opening the body. A function that mutates its argument conventionally returns that same argument, the way `Array.prototype.reverse` and `Array.prototype.sort` do, so the return value is a convenience rather than a copy.',
        },
        {
          kind: 'prose',
          body:
            'Where you change the array decides what the change costs. `push` and `pop` work at the end, where no other element has to move. `shift` and `unshift` work at the front, and every element after the one you touched lands on a different index, so the engine has to write all of them.',
        },
        {
          kind: 'table',
          caption: 'What each operation costs on an array of n elements, under the unit-cost model this path uses.',
          headers: ['Operation', 'Cost', 'Why'],
          rows: [
            ['`push(value)`', 'Amortised O(1)', 'Writes one slot past the end; the occasional resize is spread over many pushes'],
            ['`pop()`', 'O(1)', 'Drops the last slot, so nothing else changes index'],
            ['`shift()`', 'O(n)', 'Every remaining element moves down one index'],
            ['`unshift(value)`', 'O(n)', 'Every existing element moves up one index to free slot 0'],
            ['`slice(from, to)`', 'O(k) for the k elements copied', 'Allocates a new array and copies the range into it'],
            ['`splice(i, count)`', 'O(n − i)', 'Removes in place, then shifts the whole tail down to close the hole'],
            ['`indexOf(value)`', 'O(n)', 'Scans from the front until something matches'],
            ['`concat(other)` and `[...values]`', 'O(n)', 'Both allocate a new array and copy every element into it'],
          ],
        },
        {
          kind: 'prose',
          body:
            'The linear ones deserve a closer look, because the call site hides the work. `queue.shift()` is four keystrokes and up to n − 1 writes. Nothing in the syntax hints at that, which is why it slips into loops that then run in quadratic time.',
        },
        {
          kind: 'trace',
          caption: 'Removing the first element of a five-element array: four elements move so that one can leave.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['a', 'b', 'c', 'd', 'e'],
                marks: [{ index: 0, role: 'active' }],
                note: 'Five elements. `shift` has to remove the one at index 0, which means every later element must end up one index lower.',
                counter: { label: 'Writes', value: 0 },
              },
              {
                cells: ['b', 'b', 'c', 'd', 'e'],
                marks: [{ index: 0, role: 'settled' }, { index: 1, role: 'active' }],
                note: '"b" is copied from index 1 down into index 0. One write, and the copy still sitting at index 1 is now stale.',
                counter: { label: 'Writes', value: 1 },
              },
              {
                cells: ['b', 'c', 'c', 'd', 'e'],
                marks: [{ index: 1, role: 'settled' }, { index: 2, role: 'active' }],
                note: '"c" moves from index 2 into index 1. Two writes.',
                counter: { label: 'Writes', value: 2 },
              },
              {
                cells: ['b', 'c', 'd', 'd', 'e'],
                marks: [{ index: 2, role: 'settled' }, { index: 3, role: 'active' }],
                note: '"d" moves from index 3 into index 2. Three writes.',
                counter: { label: 'Writes', value: 3 },
              },
              {
                cells: ['b', 'c', 'd', 'e', 'e'],
                marks: [{ index: 3, role: 'settled' }, { index: 4, role: 'active' }],
                note: '"e" moves from index 4 into index 3. Four writes, and the tail slot is now a duplicate.',
                counter: { label: 'Writes', value: 4 },
              },
              {
                cells: ['b', 'c', 'd', 'e'],
                marks: [{ index: 0, role: 'settled' }, { index: 1, role: 'settled' }, { index: 2, role: 'settled' }, { index: 3, role: 'settled' }],
                note: 'The duplicate slot is dropped and the length falls to four. One removal cost four moves, so `shift` on an n-element array does about n writes.',
                counter: { label: 'Writes', value: 4 },
              },
            ],
          },
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Draining a queue with `while (queue.length > 0) out.push(queue.shift())` reads well and costs O(n²). The first shift moves n − 1 elements, the next moves n − 2, and the sum of that run is about n²/2. Keep a head index and walk it forward instead, or drain from the end with `pop` when the order does not matter.',
        },
        {
          kind: 'prose',
          body:
            'Strings cannot be changed in place at all. Assigning to `text[0]` throws in strict mode and does nothing in sloppy mode, and every method that looks like an edit — `slice`, `replace`, `toUpperCase` — returns a new string and leaves the original alone. Building a string with `result += character` inside a loop allocates a new string on every pass, so it is quadratic in the total length.',
        },
        {
          kind: 'prose',
          body:
            'Reading a string is cheap, though. `text[i]` and `text.length` are the only two things a two-pointer routine over a string needs, and neither allocates. That is why the palindrome check in the next lesson gets constant auxiliary space without trying.',
        },
        {
          kind: 'prose',
          body:
            'One caveat carries over from D01. A JavaScript array is an object with a length and numeric keys, and engines pick among several internal representations depending on what you put in it. Counting an index read as one step is a teaching model that holds well for the dense numeric arrays this module uses; it is not a promise about memory layout.',
        },
      ],
    },
    {
      id: 'dsa-v1-d02-l2',
      title: 'Two pointers, and where the space goes',
      summary: 'The ends-inward walk, the read-and-write compaction, and the auxiliary-space difference between changing an array and returning a new one.',
      estimatedMinutes: 20,
      sources: [
        { label: 'Harvard CS50x — Algorithms', url: 'https://cs50.harvard.edu/x/weeks/3/', reviewedOn: '2026-09-08' },
        {
          label: 'MDN — Array.prototype.reverse',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'MDN — String',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'Two pointers is one idea wearing two shapes. Keep two indices into the same sequence, move them under a rule that never sends either one backwards, and a question that looks like it needs every pair collapses into a single pass.',
        },
        {
          kind: 'prose',
          body:
            'The first shape starts at the ends and works inward: `left` at 0, `right` at `length - 1`, both moving toward each other until they meet. Reversing an array, checking a palindrome and finding a pair with a given sum in a sorted array all fit it.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// Ends inward on an ascending array: is there a pair adding up to target?\nconst hasPairSum = (sorted, target) => {\n  let left = 0;\n  let right = sorted.length - 1;\n\n  while (left < right) {\n    const sum = sorted[left] + sorted[right];\n    if (sum === target) return true;\n    if (sum < target) left += 1;\n    else right -= 1;\n  }\n\n  return false;\n};',
          caption: 'Each step discards one index for good, so n − 1 steps replace the n²/2 pairs a double loop would visit.',
        },
        {
          kind: 'prose',
          body:
            'The sorted order is what makes that legal. When the sum is too small, the smallest element cannot be part of any pair that reaches the target, so raising `left` throws away nothing useful. When the sum is too large, the same argument applies to `right`. Take the sorting away and the walk stops being correct.',
        },
        {
          kind: 'trace',
          caption: 'Checking "level" from both ends: five characters, two comparisons.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['l', 'e', 'v', 'e', 'l'],
                marks: [{ index: 0, role: 'active' }, { index: 4, role: 'active' }],
                note: '`left` starts at index 0 and `right` at index 4, the two ends of "level". Nothing has been compared yet.',
                counter: { label: 'Comparisons', value: 0 },
              },
              {
                cells: ['l', 'e', 'v', 'e', 'l'],
                marks: [{ index: 0, role: 'compare' }, { index: 4, role: 'compare' }],
                note: 'Compare "l" against "l". They match, so `left` moves to 1 and `right` moves to 3.',
                counter: { label: 'Comparisons', value: 1 },
              },
              {
                cells: ['l', 'e', 'v', 'e', 'l'],
                marks: [{ index: 0, role: 'settled' }, { index: 4, role: 'settled' }, { index: 1, role: 'compare' }, { index: 3, role: 'compare' }],
                note: 'Compare "e" against "e". They match too, so `left` moves to 2 and `right` moves to 2.',
                counter: { label: 'Comparisons', value: 2 },
              },
              {
                cells: ['l', 'e', 'v', 'e', 'l'],
                marks: [{ index: 0, role: 'settled' }, { index: 1, role: 'settled' }, { index: 3, role: 'settled' }, { index: 4, role: 'settled' }, { index: 2, role: 'excluded' }],
                note: '`left` and `right` have met at index 2. A lone middle character has nothing to be compared against, so the loop ends and the answer is true: five characters took two comparisons.',
                counter: { label: 'Comparisons', value: 2 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'The loop body runs about n/2 times, and n/2 is a constant multiple of n, so the growth class is O(n). Halving the iteration count is worth having on a real input and does not move the routine into a smaller family.',
        },
        {
          kind: 'prose',
          body:
            'The second shape puts both pointers at the front and lets one run ahead of the other. The read pointer visits every element; the write pointer only advances when an element has earned a place in the result. Dropping duplicates, dropping zeros, keeping whatever passes a test — that whole group of problems is this one shape.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// Read runs ahead; write lags behind and marks the end of the kept prefix.\nconst removeZeros = values => {\n  let write = 0;\n\n  for (let read = 0; read < values.length; read += 1) {\n    if (values[read] !== 0) {\n      values[write] = values[read];\n      write += 1;\n    }\n  }\n\n  return write;\n};',
          caption: 'Compaction in place: the answer is how far the write pointer got, not a new array.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Only the slots below the returned length mean anything afterwards. `removeZeros([0, 4, 0, 5])` returns 2 and leaves the array holding `[4, 5, 0, 5]`, where the trailing `0` and the second `5` are leftovers nobody cleaned up. Write that into the function’s contract, and never read past the length it handed you.',
        },
        {
          kind: 'table',
          caption: 'The same job done two ways, and what each way costs the caller.',
          headers: ['Question', 'Changed in place', 'Returned as a new array'],
          rows: [
            ['Auxiliary space', 'O(1): a couple of indices and one held value', 'O(n): a second array as long as the input'],
            ['The array the caller passed', 'Holds the new contents', 'Untouched'],
            ['Anyone else holding that array', 'Sees the change, asked for or not', 'Sees nothing'],
            ['What comes back', 'The same array, or a count', 'The new array'],
            ['When to reach for it', 'Large inputs, one clear owner, a documented mutation', 'Shared data, undo, anything read concurrently'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Total space counts the input, so any routine over an n-element array is O(n) in total. Auxiliary space is the number that separates these two columns: the ends-inward reverse allocates two indices and one held value and stays at O(1) whatever n is, while spreading the array into a copy and reversing that allocates a full second array.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'A function that changes its argument has an effect its signature never shows. Give it a name that admits it, document what the array looks like when it returns, and decide on purpose whether to hand back the array, a count, or nothing at all.',
        },
        {
          kind: 'prose',
          body:
            'Strings force the choice for you. You cannot reverse one in place, so an ends-inward walk over a string is read-only: two indices, `text[left]`, `text[right]`, no allocation, O(1) auxiliary space. Reversing a copy and comparing is correct too, and it allocates an array of characters, a reversed array and a new string on the way to the same boolean.',
        },
      ],
    },
  ],
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
          prompt: '`queue` starts with n elements. What is the tightest growth class for the running time of `drain`?',
          context: {
            language: 'javascript',
            code: 'const drain = queue => {\n  const out = [];\n  while (queue.length > 0) out.push(queue.shift());\n  return out;\n};',
          },
          options: ['O(n²)', 'O(n)', 'O(n log n)', 'O(1)'],
          correct: 0,
          explanation:
            'Each `shift` moves every remaining element down one index, so the first costs about n writes, the next about n − 1, and the run adds up to roughly n²/2 — the quadratic family. O(n) would be the answer if removal from the front were constant, which it is not; `push` really is amortised constant, so draining from the end with `pop` would be O(n). Nothing halves anything here, so there is no log factor, and the loop runs n times, so it cannot be constant.',
          competencies: ['arrays-strings', 'complexity'],
        },
        {
          id: 'dsa-v1-d02-q3',
          prompt: 'For an array of length n, what is the auxiliary space — the memory used beyond the input itself — of `reverseSection`?',
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
            'The routine writes into the array it was handed and allocates three local variables, and that count does not grow with n. Returning `values` allocates nothing: it hands back the same array the caller already had, so the return value adds no auxiliary space. A swap needs one held element, not a copy of the array. And the pointers move one step each per iteration, meeting after about n/2 steps — nothing halves, so there is no logarithm.',
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
            'The pairs compared are (0, 6), (1, 5) and (2, 4). After the third match both pointers sit on index 3, `left < right` is false and the loop stops, so three comparisons. 4 would include the middle character against itself, which the `left < right` condition rules out. 6 counts every character except the middle one, which double-counts each pair. 7 is one comparison per character, which is what a copy-and-compare version costs, not the ends-inward walk.',
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
      summary: 'Reverse an array by swapping inward from both ends, and hand back the very array you were given.',
      competencies: ['arrays-strings', 'complexity'],
      estimatedMinutes: 15,
      code: {
        language: 'javascript',
        prompt:
          'Write `reverseInPlace(values)`. It reverses the array in place and returns that same array. `reverseInPlace([1, 2, 3, 4])` gives `[4, 3, 2, 1]`, and the array the caller passed in holds `[4, 3, 2, 1]` afterwards. An empty array and a single-element array both come back unchanged.\n\nThe mutation contract is the exercise. Two graded assertions check it: the caller’s array must hold the reversed order after the call, and the value you return must be that same object, not a reversed copy of it. A third counts index writes and allows at most one per element.\n\n`Array.prototype.reverse` already does all of this. Write the swap loop yourself — the pointer arithmetic and the held value are what this exercise trains.',
        contract: [
          'Reverse the array you were given; do not build a second one.',
          'Return that same array, so `reverseInPlace(values) === values` holds.',
          'The graded write budget is at most one index write per element.',
          'An empty array and a one-element array are returned unchanged, and still as the same object.',
        ],
        starter: `const reverseInPlace = values => {

};

// Scratch pad — change this and press Run.
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
          'Put one index at each end. Swap what they point at, then move `left` up by one and `right` down by one, and stop as soon as they meet or cross.',
          'A swap needs somewhere to put the first value before you overwrite it: `const held = values[left]` first, then the two assignments.',
          'An empty array and a one-element array never enter the loop, because `left` is not below `right` to begin with. Returning `values` still gives the right answer for both.',
        ],
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
            detail: 'The caller’s array must hold the reversed order after the call, the return value must be that same object, and the write counter must stay within one write per element. Building a reversed copy fails here even when its contents are right.',
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
      summary: 'Walk a string inward from both ends and decide whether it reads the same backwards, with no copy and no normalisation.',
      competencies: ['arrays-strings', 'complexity'],
      estimatedMinutes: 20,
      code: {
        language: 'javascript',
        prompt:
          'Write `isPalindrome(text)`, returning `true` when the string reads the same backwards and `false` when it does not.\n\nThe input holds ASCII letters and digits only: no spaces, punctuation, accents or anything else to skip over. The comparison is case-sensitive and there is no normalisation of any kind, so `isPalindrome(\'Racecar\')` is `false` because capital `R` is not lowercase `r`. Do not lowercase, uppercase, strip or otherwise rewrite the input.\n\n`isPalindrome(\'\')` is `true` and `isPalindrome(\'x\')` is `true`: the empty string and a single character have nothing to contradict them. Use two indices walking inward and return as soon as a pair fails to match.',
        contract: [
          'The input contains only ASCII letters and digits, so there is nothing to skip.',
          'Compare characters exactly: no lowercasing, uppercasing or normalising.',
          'The empty string and any single character are palindromes.',
          'Return a boolean, not a truthy value.',
        ],
        starter: `const isPalindrome = text => {

};

// Scratch pad — change this and press Run.
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
          'Index a string the same way you index an array: `text[left]` gives one character, and `text.length` gives the count.',
          'Return `false` from inside the loop the moment a pair differs. If the loop finishes without that happening, every pair matched and the answer is `true`.',
          'When the length is odd the two pointers land on the same middle index and the loop stops there, which is correct: a character always equals itself.',
        ],
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
      summary: 'Drop the duplicates from an ascending array with a read pointer and a write pointer, and return how many distinct values are left.',
      competencies: ['arrays-strings', 'complexity'],
      estimatedMinutes: 25,
      code: {
        language: 'javascript',
        prompt:
          'Write `removeDuplicatesSorted(sorted)`. The argument is an array of numbers in ascending order, possibly with repeats. Move the distinct values into the front of that same array, in order, and return how many there are. `removeDuplicatesSorted([1, 1, 2, 3, 3, 3, 4])` returns 4 and leaves `1, 2, 3, 4` in the first four slots.\n\nEverything from the returned length onward is unspecified. Whatever the leftovers are, no assertion looks at them, and neither should a caller.\n\nAn empty array returns 0. An array whose values are all equal returns 1. Because the input is sorted, equal values are always neighbours, so one read pointer and one write pointer are enough — the graded write budget is at most one index write per element, which rules out deleting duplicates with repeated `splice` calls.',
        contract: [
          'The input is sorted ascending, so equal values sit next to each other; rely on that.',
          'Write the distinct values into the front of the array you were given, in ascending order.',
          'Return the count of distinct values as a number.',
          'Slots from the returned length onward are unspecified and are never checked.',
          'The graded write budget is at most one index write per element.',
        ],
        starter: `const removeDuplicatesSorted = sorted => {

};

// Scratch pad — change this and press Run.
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
          'The first element is always kept, so start the write pointer at 1 and the read pointer at 1.',
          'Compare `sorted[read]` with `sorted[write - 1]`, the last value you kept. When they differ, write `sorted[read]` into `sorted[write]` and move the write pointer up.',
          'An empty array never reaches the loop; return 0 before it. Every other array keeps at least its first element, which is why an all-equal array returns 1.',
        ],
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
            detail: 'The distinct values must end up in the front of the array that was passed in, and the write counter must stay within one write per element. Building a separate array of distinct values, or deleting duplicates with repeated `splice` calls, fails here.',
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
