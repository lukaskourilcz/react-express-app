/** Curated approach comparisons, shown only after a verified pass.
 *
 * Two or three original solutions to the same task, written for this product,
 * each with what it costs in time and space, what it assumes, and what it
 * trades away. The point is the comparison: the fastest is rarely the clearest,
 * and a learner who has just made something work is exactly ready to see why
 * someone would write it differently.
 *
 * Server-only, like the reference solutions, and gated the same way but more
 * strictly: the API hands these over only when the learner's own recorded
 * evidence says they passed the task. Reading a solution after giving up is a
 * different thing and stays separate — it does not open the comparison, and it
 * ends the attempt exactly as it did before.
 *
 * COVERAGE. This file is the manifest: `approachCoverage()` reports which task
 * ids are covered, and the coding-content test asserts every covered id is a
 * real task and that no task advertises a comparison it does not have. A task
 * with nothing authored shows no tab, rather than an empty one. */


export interface CuratedApproach {
  /** What this way of solving it is called, in the learner's language. */
  name: string;
  /** The code, written for this product. */
  code: string;
  /** Why it reads the way it does. */
  readability: string;
  /** Big-O in time and space, with the assumption that makes it true. */
  time: string;
  space: string;
  /** What has to be true for this to be a fair comparison. */
  assumptions: string;
  /** What you give up by choosing it. */
  tradeoffs: string;
}

const APPROACHES: Record<string, CuratedApproach[]> = {
  'js-double-numbers': [
    {
      name: 'map',
      code: 'const double = numbers => numbers.map(number => number * 2);',
      readability: 'Says what it produces rather than how it walks: one new array, one result per element.',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: 'Every element is a number, and a new array is wanted rather than a change in place.',
      tradeoffs: 'Allocates a second array. On a very large list that memory is real, though it is rarely the thing that matters.',
    },
    {
      name: 'An indexed loop',
      code: 'function double(numbers) {\n  const out = new Array(numbers.length);\n  for (let i = 0; i < numbers.length; i++) out[i] = numbers[i] * 2;\n  return out;\n}',
      readability: 'More lines, and the mechanics are visible. Useful when the loop body grows beyond one expression.',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: 'Every input element is a number. The output length is known before the loop starts; runtime performance depends on the engine and input.',
      tradeoffs: 'The index is one more thing to get wrong, and the intent is no longer stated in the first word.',
    },
  ],
  'js-sum-array': [
    {
      name: 'reduce',
      code: 'const sum = numbers => numbers.reduce((total, number) => total + number, 0);',
      readability: 'One expression, and the initial value is written down — which is what makes the empty list answer 0 rather than throw.',
      time: 'O(n)',
      space: 'O(1)',
      assumptions: 'Every element is a number. Without the initial value the empty case throws, so it is not optional here.',
      tradeoffs: 'Readers who meet reduce rarely have to stop and work out what the accumulator is.',
    },
    {
      name: 'A running total',
      code: 'function sum(numbers) {\n  let total = 0;\n  for (const number of numbers) total += number;\n  return total;\n}',
      readability: 'Plain, and hard to misread. The empty case answers 0 for the same reason: the total starts there.',
      time: 'O(n)',
      space: 'O(1)',
      assumptions: 'The same as above.',
      tradeoffs: 'Three lines instead of one, and a mutable variable in scope.',
    },
  ],
  'js-reverse-string': [
    {
      name: 'Spread, reverse, join',
      code: 'const reverse = text => [...text].reverse().join("");',
      readability: 'Reads as the three steps it is. The spread splits by code point, so characters outside the basic plane survive.',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: 'This task reverses code points. Combining marks and joined emoji contain several points; preserving visual clusters is a different contract.',
      tradeoffs: 'The code-point array and the returned string both need memory proportional to the input.',
    },
    {
      name: 'Building from the end',
      code: 'function reverse(text) {\n  const points = Array.from(text);\n  const out = [];\n  for (let i = points.length - 1; i >= 0; i--) out.push(points[i]);\n  return out.join("");\n}',
      readability: 'The loop makes the reverse traversal explicit. Its index belongs to a code-point array, not the original UTF-16 string.',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: 'Array.from collects complete code points before the loop indexes them. Joined emoji and combining marks follow the same rule as the first approach.',
      tradeoffs: 'Uses an additional array to make the traversal explicit. Push and join avoid repeatedly copying a growing output string.',
    },
  ],
  'js-palindrome': [
    {
      name: 'Compare with the reverse',
      code: 'const isPalindrome = text => {\n  return text === [...text].reverse().join("");\n};',
      readability: 'States the definition directly: compare the word with its reverse.',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: 'The task accepts only lowercase ASCII letters. n is the number of letters; no cleaning or case conversion is required.',
      tradeoffs: 'Allocates a character array and a reversed string. It processes the whole word even when its ends already differ.',
    },
    {
      name: 'Two pointers',
      code: 'function isPalindrome(text) {\n  let left = 0;\n  let right = text.length - 1;\n  while (left < right) {\n    if (text[left] !== text[right]) return false;\n    left++;\n    right--;\n  }\n  return true;\n}',
      readability: 'Longer, but it says why it stops: the first disagreement is the answer.',
      time: 'O(n)',
      space: 'O(1)',
      assumptions: 'The same lowercase ASCII input. The comparison uses constant-time indexing and a fixed number of counters.',
      tradeoffs: 'Can stop at the first mismatched pair. In the worst case it compares all opposite pairs without allocating a copy.',
    },
  ],
  'js-word-count': [
    {
      name: 'Count whitespace-separated runs',
      code: 'const wordCount = text => (text.match(/\\S+/g) ?? []).length;',
      readability: 'The pattern matches each non-whitespace run. No matches become an empty array, whose length is zero.',
      time: 'O(n)',
      space: 'O(n)',
      assumptions: 'JavaScript whitespace separates words; n is the number of string positions. This counts tokens rather than performing natural-language segmentation.',
      tradeoffs: 'Short and direct, but the array of matches allocates memory even though only its length is needed.',
    },
    {
      name: 'Count transitions into a word',
      code: 'function wordCount(text) {\n  let count = 0;\n  let inside = false;\n  for (const character of text) {\n    const whitespace = /\\s/.test(character);\n    if (!whitespace && !inside) count++;\n    inside = !whitespace;\n  }\n  return count;\n}',
      readability: 'The state records whether the previous character belonged to a word. Count only the transition from whitespace into a non-whitespace run.',
      time: 'O(n)',
      space: 'O(1)',
      assumptions: 'The same JavaScript whitespace rule applies. Each character is examined once, and the output is a single count.',
      tradeoffs: 'Uses constant extra memory, with more state to explain and maintain than the matching expression.',
    },
  ],
};

/** The approaches authored for a task, or an empty list. */
export const approachesFor = (taskId: string): CuratedApproach[] => APPROACHES[taskId] ?? [];

/** Task ids with an authored comparison. The content test reads this. */
export const approachCoverage = (): string[] => Object.keys(APPROACHES);
