// The Easy band of the Algorithms track, first wave (#226).
//
// Before this wave the track had eleven Easy challenges, and five tags on its
// Medium challenges sat below three Easy ones: recursion and for...of had
// none, objects, sort and while had one each. Twenty warm-ups bring all five
// to five or more: recursion through Euclid, a memo, binary strings and two
// tree walks; for...of through one-pass scans; sort through median, meeting
// clashes and two greedy picks; while through a bisect, slow and fast
// pointers, a cycle check and making change. Map and Set, two pointers, for
// and strings each gain a little on the way.
//
// Same rules as the other waves: one technique per challenge (two focus tags
// at most), ten minutes or less, and a starter that fails its own checks. The
// first focus tag names the documentation page that ends the hint ladder. Every
// prompt ends with the cost an interviewer listens for, like the rest of the
// track. Solutions live in `../solutions/easy-algorithms-a.ts`, and
// `EASY_BAND` in `../catalog.ts` lists this file. English only: there is no
// Czech overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';

/** Test calls that build a binary tree of `{ value, left, right }` nodes. */
export const TREE_NODE = 'const node = (value, left = null, right = null) => ({ value, left, right });';
export const withTree = (body: string): string => `(() => { ${TREE_NODE} return ${body}; })()`;

/** Test calls that build a linked list of `{ value, next }` nodes. */
export const LIST_OF = 'const list = (...values) => values.reduceRight((next, value) => ({ value, next }), null);';
export const withList = (body: string): string => `(() => { ${LIST_OF} ${body} })()`;

/** Expected trees, written as the plain objects a solution returns. */
type TreeNode = { value: number; left: TreeNode | null; right: TreeNode | null };
export const tree = (value: number, left: TreeNode | null = null, right: TreeNode | null = null): TreeNode => ({ value, left, right });

// The classic path-sum tree: 5 → 4 → 11 → (7, 2) on the left, 5 → 8 → (13, 4 → 1) on the right.
const PATH_TREE = 'node(5, node(4, node(11, node(7), node(2))), node(8, node(13), node(4, null, node(1))))';

export const EASY_ALGORITHMS_A_TASKS: CodingTaskSource[] = [
  /* ── hash maps, sets and plain objects ─────────────────────────────── */
  {
    id: 'alg-easy2-count-jewels',
    track: 'algorithms',
    topic: 'algorithms',
    level: 1,
    tier: 1,
    focus: ['map-set', 'for-of'],
    title: 'Count the jewels',
    prompt: 'Each character of `jewels` is a kind of stone that counts as a jewel, and each character of `stones` is one stone you hold. Write `countJewels(jewels, stones)`, returning how many of your stones are jewels. `countJewels("aA", "aAAbbbb")` gives 3. Letters are case-sensitive, so `"a"` and `"A"` are different kinds. Put the jewel kinds in a `Set` once, then walk the stones with `for...of` and ask the Set about each one. Target: O(j + s) time for j jewel characters and s stones, and O(j) space.',
    starter: `const countJewels = (jewels, stones) => {

};

// Scratch pad. Change this and press Run.
console.log(countJewels("aA", "aAAbbbb"));
`,
    skeleton: `const countJewels = (jewels, stones) => {
  const kinds = new Set(/* the jewel characters */);
  let count = 0;
  for (const stone of stones) {
    // count the stone when it is a jewel
  }
  return count;
};`,
    hints: ['`new Set("aA")` holds the characters `"a"` and `"A"`, because a string is iterable. `has` answers in constant time, where `jewels.includes(stone)` would scan the jewel string for every stone.'],
    approach: [
      'Build `new Set(jewels)`. The string spreads into its characters, so the Set holds one entry per jewel kind.',
      'Walk `stones` with `for (const stone of stones)`.',
      'Add one to a counter each time `kinds.has(stone)` is true, and return the counter.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'countJewels("aA", "aAAbbbb")', expected: 3 },
      { call: 'countJewels("z", "ZZ")', expected: 0, label: 'case matters' },
      { call: 'countJewels("abc", "aabbccd")', expected: 6 },
      { call: 'countJewels("", "abc")', expected: 0, label: 'no jewel kinds', edge: true },
      { call: 'countJewels("a", "")', expected: 0, label: 'no stones', edge: true },
    ],
  },
  {
    id: 'alg-easy2-letters-for-a-note',
    track: 'algorithms',
    topic: 'algorithms',
    level: 2,
    tier: 2,
    focus: ['objects', 'for-of'],
    title: 'Letters for a note',
    prompt: 'You want to write `note` with letters cut out of `magazine`, and you can use each letter in the magazine once. Write `canWrite(note, magazine)`, returning `true` when the magazine holds enough of every character the note needs. `canWrite("aab", "baa")` is `true`. `canWrite("aa", "ab")` is `false`, because the magazine has one `"a"`. Count the magazine\'s characters in a plain object, then walk the note with `for...of` and spend one from the count for each character. Characters are case-sensitive, and a space counts like any other character. Target: O(n + m) time and O(k) space for k distinct characters.',
    starter: `const canWrite = (note, magazine) => {

};

// Scratch pad. Change this and press Run.
console.log(canWrite("aab", "baa"));
`,
    skeleton: `const canWrite = (note, magazine) => {
  const counts = {}; // character -> how many the magazine still has
  for (const char of magazine) {
    // count it
  }
  for (const char of note) {
    // spend one, or answer false when none are left
  }
  return true;
};`,
    hints: ['`counts[char] = (counts[char] || 0) + 1` counts a character whether or not you have seen it before. When the note asks for a character whose count is missing or 0, the answer is `false` straight away.'],
    approach: [
      'Walk `magazine` with `for...of` and count each character in an object.',
      'Walk `note` the same way. If the count for a character is missing or 0, return `false`.',
      'Otherwise take one off that count. If you reach the end of the note, return `true`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'canWrite("aab", "baa")', expected: true },
      { call: 'canWrite("aa", "ab")', expected: false, label: 'one "a" is not enough' },
      { call: 'canWrite("Hi", "hi")', expected: false, label: 'case matters' },
      { call: 'canWrite("", "abc")', expected: true, label: 'an empty note needs nothing', edge: true },
      { call: 'canWrite("a", "")', expected: false, label: 'an empty magazine', edge: true },
    ],
  },
  {
    id: 'alg-easy2-majority-value',
    track: 'algorithms',
    topic: 'algorithms',
    level: 3,
    tier: 2,
    focus: ['for-of', 'map-set'],
    title: 'The majority value',
    prompt: 'Write `majority(values)`, returning the value that appears more than half the time, or `null` when no value does. `majority([3, 1, 3, 3, 2])` gives 3, which appears three times out of five. `majority([1, 2, 1, 2])` gives `null`: two out of four is exactly half, and a majority needs more. Walk the values with `for...of`, count each one in a `Map`, and return a value as soon as its count passes half the length. A `Map` keeps `1` and `"1"` apart, and a plain object would merge them into one key. Target: O(n) time and O(n) space.',
    starter: `const majority = values => {

};

// Scratch pad. Change this and press Run.
console.log(majority([3, 1, 3, 3, 2]));
`,
    skeleton: `const majority = values => {
  const counts = new Map();
  for (const value of values) {
    // count it, and return it once its count is more than half
  }
  return null;
};`,
    hints: ['More than half means `count > values.length / 2`. Check right after you count a value: the first value to cross that line is the only one that ever can.'],
    approach: [
      'Keep a `Map` from each value to how many times you have seen it.',
      'For each value, add one to its count with `counts.set(value, (counts.get(value) ?? 0) + 1)`.',
      'When the new count is more than `values.length / 2`, return the value. If the loop ends, return `null`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'majority([3, 1, 3, 3, 2])', expected: 3 },
      { call: 'majority(["a", "b", "a"])', expected: 'a' },
      { call: 'majority([7])', expected: 7, label: 'one value is a majority of one' },
      { call: 'majority([1, 2, 1, 2])', expected: null, label: 'exactly half is not a majority', edge: true },
      { call: 'majority([])', expected: null, label: 'empty input', edge: true },
    ],
  },
  {
    id: 'alg-easy2-happy-number',
    track: 'algorithms',
    topic: 'algorithms',
    level: 4,
    tier: 2,
    focus: ['while', 'map-set'],
    title: 'Happy number',
    prompt: 'Take a positive whole number, replace it with the sum of the squares of its digits, and repeat. The number is happy when this reaches 1: 19 gives 1² + 9² = 82, then 68, then 100, then 1. An unhappy number never reaches 1 and goes round a cycle instead; 2 lands in a loop that passes through 4. Write `isHappy(n)`, returning `true` or `false`. Loop `while` the number is not 1, keep every number you have seen in a `Set`, and answer `false` the moment one comes back. Target: O(log n) time per step to read the digits, with a repeat ending the loop.',
    starter: `const isHappy = n => {

};

// Scratch pad. Change this and press Run.
console.log(isHappy(19));
`,
    skeleton: `const isHappy = n => {
  const seen = new Set();
  while (n !== 1) {
    // a number seen before means a cycle: not happy
    // remember n, then replace it with the sum of its digits squared
  }
  return true;
};`,
    hints: ['`n % 10` reads the last digit, and `Math.floor(n / 10)` drops it. A `Set` of the numbers you have visited tells you when the sequence starts to repeat.'],
    approach: [
      'Write the step first: add up the squares of the digits, using `% 10` and `Math.floor(n / 10)`, or by splitting `String(n)`.',
      'Loop `while (n !== 1)`. If `seen.has(n)`, return `false`; otherwise add `n` to the Set and take one step.',
      'Leaving the loop means you reached 1, so return `true`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'isHappy(19)', expected: true },
      { call: 'isHappy(2)', expected: false },
      { call: 'isHappy(7)', expected: true, label: '7, 49, 97, 130, 10, 1' },
      { call: 'isHappy(1)', expected: true, label: 'one is already happy', edge: true },
      { call: 'isHappy(4)', expected: false, label: 'four sits inside the unhappy cycle', edge: true },
    ],
  },

  /* ── strings and one-pass scans ────────────────────────────────────── */
  {
    id: 'alg-easy2-common-prefix',
    track: 'algorithms',
    topic: 'algorithms',
    level: 7,
    tier: 1,
    focus: ['strings', 'for'],
    title: 'Longest common prefix',
    prompt: 'Write `commonPrefix(words)`, returning the longest string that every word starts with. `commonPrefix(["flower", "flow", "flight"])` gives `"fl"`, and `commonPrefix(["dog", "car"])` gives `""`. Take the first word as the candidate and walk its characters with a `for` loop. At each index, check that every other word has the same character there, and stop at the first one that does not. An empty list gives `""`. Target: O(n · k) time for n words of up to k characters, and O(1) extra space.',
    starter: `const commonPrefix = words => {

};

// Scratch pad. Change this and press Run.
console.log(commonPrefix(["flower", "flow", "flight"]));
`,
    skeleton: `const commonPrefix = words => {
  if (words.length === 0) return "";
  const first = words[0];
  for (let i = 0; i < first.length; i++) {
    // does every word have first[i] at index i?
    // if not, the prefix is everything before i
  }
  return first;
};`,
    hints: ['A word shorter than `i + 1` characters has `undefined` at index `i`, which never equals a character. So the check that finds a mismatch also stops you at the end of the shortest word.'],
    approach: [
      'Return `""` for an empty list. Otherwise the first word is the longest possible answer.',
      'For each index `i` of the first word, compare `first[i]` with `word[i]` for every word.',
      'At the first mismatch, return `first.slice(0, i)`. If the loop finishes, the whole first word is the prefix.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'commonPrefix(["flower", "flow", "flight"])', expected: 'fl' },
      { call: 'commonPrefix(["dog", "car"])', expected: '', label: 'nothing in common' },
      { call: 'commonPrefix(["same", "same"])', expected: 'same' },
      { call: 'commonPrefix([])', expected: '', label: 'empty list', edge: true },
      { call: 'commonPrefix(["alone"])', expected: 'alone', label: 'one word is its own prefix', edge: true },
    ],
  },
  {
    id: 'alg-easy2-roman-numerals',
    track: 'algorithms',
    topic: 'algorithms',
    level: 7,
    tier: 2,
    focus: ['objects', 'for'],
    title: 'Roman numerals to a number',
    prompt: 'Write `fromRoman(numeral)`, turning a Roman numeral into a number. The letters are worth `I` 1, `V` 5, `X` 10, `L` 50, `C` 100, `D` 500 and `M` 1000. You add the letters up, so `"VIII"` is 8, except that a letter worth less than the one after it is subtracted: `"IV"` is 4 and `"MCMXCIV"` is 1994. Keep the values in an object used as a lookup table, walk the numeral with a `for` loop, and compare each letter with the next one. Every input is a valid numeral in capital letters, and `""` gives 0. Target: O(n) time and O(1) space.',
    starter: `const fromRoman = numeral => {

};

// Scratch pad. Change this and press Run.
console.log(fromRoman("MCMXCIV"));
`,
    skeleton: `const VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

const fromRoman = numeral => {
  let total = 0;
  for (let i = 0; i < numeral.length; i++) {
    const value = VALUES[numeral[i]];
    const next = /* the value of the letter after it, or 0 */;
    // subtract when value is smaller than next, otherwise add
  }
  return total;
};`,
    hints: ['Look one letter ahead. `VALUES[numeral[i + 1]]` is `undefined` past the end, so `?? 0` gives the last letter a next value of 0 and you always add it.'],
    approach: [
      'Write the seven letter values into an object, so `VALUES["X"]` is 10.',
      'Loop over the indexes of the numeral. Read the value of the letter at `i` and of the letter at `i + 1`.',
      'If the current value is smaller than the next, subtract it from the total; otherwise add it. Return the total.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'fromRoman("VIII")', expected: 8 },
      { call: 'fromRoman("IV")', expected: 4, label: 'a smaller letter before a larger one is subtracted' },
      { call: 'fromRoman("MCMXCIV")', expected: 1994 },
      { call: 'fromRoman("LVIII")', expected: 58 },
      { call: 'fromRoman("")', expected: 0, label: 'no letters', edge: true },
      { call: 'fromRoman("MMMCMXCIX")', expected: 3999, label: 'the largest standard numeral', edge: true },
    ],
  },
  {
    id: 'alg-easy2-second-largest',
    track: 'algorithms',
    topic: 'algorithms',
    level: 10,
    tier: 1,
    focus: ['for-of'],
    title: 'Second largest value',
    prompt: 'Write `secondLargest(numbers)`, returning the largest value that is smaller than the maximum, or `null` when there is none. `secondLargest([4, 9, 7])` gives 7. `secondLargest([5, 5, 3])` gives 3, because the second 5 ties with the maximum. Do it in one `for...of` pass with two variables, the largest and the second largest so far, and leave sorting out of it. An empty array, a single value, or values that are all equal give `null`. Target: O(n) time and O(1) space.',
    starter: `const secondLargest = numbers => {

};

// Scratch pad. Change this and press Run.
console.log(secondLargest([4, 9, 7]));
`,
    skeleton: `const secondLargest = numbers => {
  let largest = -Infinity;
  let second = -Infinity;
  for (const n of numbers) {
    // a new largest pushes the old largest down to second
    // a value between the two becomes the new second
  }
  return /* second, or null when it never changed */;
};`,
    hints: ['Start both variables at `-Infinity`, so any real number beats them. A value equal to `largest` must change nothing, or `[5, 5, 3]` would answer 5.'],
    approach: [
      'Keep `largest` and `second`, both starting at `-Infinity`.',
      'For each number: if it is bigger than `largest`, move `largest` into `second` and store the number as `largest`. Otherwise, if it is below `largest` and above `second`, store it as `second`.',
      'At the end, return `null` if `second` is still `-Infinity`, and `second` otherwise.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'secondLargest([4, 9, 7])', expected: 7 },
      { call: 'secondLargest([5, 5, 3])', expected: 3, label: 'a tie with the maximum does not count' },
      { call: 'secondLargest([-2, -8, -5])', expected: -5, label: 'all negative' },
      { call: 'secondLargest([])', expected: null, label: 'empty input', edge: true },
      { call: 'secondLargest([6, 6])', expected: null, label: 'every value the same', edge: true },
    ],
  },
  {
    id: 'alg-easy2-best-trade',
    track: 'algorithms',
    topic: 'algorithms',
    level: 11,
    tier: 2,
    focus: ['for-of'],
    title: 'Best single trade',
    prompt: 'Each number in `prices` is a share price on one day, in order. Write `bestTrade(prices)`, returning the most you could make by buying on one day and selling on a later day. `bestTrade([7, 1, 5, 3, 6, 4])` gives 5: buy at 1, sell at 6. When prices only fall, no trade makes money and the answer is 0. Walk the prices once with `for...of`, keeping the lowest price so far and the best profit so far. Fewer than two prices also give 0. Target: O(n) time and O(1) space, where trying every pair of days would be O(n²).',
    starter: `const bestTrade = prices => {

};

// Scratch pad. Change this and press Run.
console.log(bestTrade([7, 1, 5, 3, 6, 4]));
`,
    skeleton: `const bestTrade = prices => {
  let lowest = Infinity;
  let best = 0;
  for (const price of prices) {
    // selling today earns price - lowest
    // today might also be the cheapest day so far
  }
  return best;
};`,
    hints: ['The best sale today buys on the cheapest day before it. So you only need to remember one thing about the past: the lowest price so far.'],
    approach: [
      'Start with `lowest` at `Infinity` and `best` at 0.',
      'For each price, work out `price - lowest`, the profit of selling today, and keep it if it beats `best`.',
      'Then lower `lowest` to today\'s price if today is cheaper. Return `best`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'bestTrade([7, 1, 5, 3, 6, 4])', expected: 5 },
      { call: 'bestTrade([7, 6, 4, 3, 1])', expected: 0, label: 'prices only fall' },
      { call: 'bestTrade([2, 4, 1])', expected: 2, label: 'the cheapest day comes too late to use' },
      { call: 'bestTrade([])', expected: 0, label: 'no prices', edge: true },
      { call: 'bestTrade([5])', expected: 0, label: 'one day cannot trade', edge: true },
    ],
  },
  {
    id: 'alg-easy2-fewest-coins',
    track: 'algorithms',
    topic: 'algorithms',
    level: 11,
    tier: 1,
    focus: ['while', 'objects'],
    title: 'Change in the fewest coins',
    prompt: 'A till gives change in coins worth 50, 20, 10, 5, 2 and 1 cents. Write `makeChange(cents)`, returning an object that says how many of each coin to hand over, using the fewest coins. `makeChange(76)` gives `{ 50: 1, 20: 1, 5: 1, 1: 1 }`. For these coins the greedy rule always works: take the largest coin `while` it still fits, then move to the next smaller one. Leave out the coins you do not use, so `makeChange(0)` gives `{}`. Target: O(c + k) time for c kinds of coin and k coins handed over.',
    starter: `const makeChange = cents => {

};

// Scratch pad. Change this and press Run.
console.log(makeChange(76));
`,
    skeleton: `const COINS = [50, 20, 10, 5, 2, 1];

const makeChange = cents => {
  const change = {};
  for (const coin of COINS) {
    while (/* this coin still fits */) {
      // hand it over: count it and take its value off
    }
  }
  return change;
};`,
    hints: ['Inside the `while`, count a coin with `change[coin] = (change[coin] || 0) + 1`. A coin that never fits never gets a key, and that leaves it out of the answer.'],
    approach: [
      'List the coins from largest to smallest.',
      'For each coin, loop `while (cents >= coin)`: subtract the coin from `cents` and add one to `change[coin]`.',
      'When every coin has had its turn, `cents` is 0. Return the object.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'makeChange(76)', expected: { 50: 1, 20: 1, 5: 1, 1: 1 } },
      { call: 'makeChange(40)', expected: { 20: 2 }, label: 'two of the same coin' },
      { call: 'makeChange(3)', expected: { 2: 1, 1: 1 } },
      { call: 'makeChange(188)', expected: { 50: 3, 20: 1, 10: 1, 5: 1, 2: 1, 1: 1 }, label: 'every coin at once' },
      { call: 'makeChange(0)', expected: {}, label: 'nothing to give', edge: true },
    ],
  },

  /* ── two pointers and halving ──────────────────────────────────────── */
  {
    id: 'alg-easy2-first-broken-build',
    track: 'algorithms',
    topic: 'algorithms',
    level: 14,
    tier: 2,
    focus: ['while', 'two-pointer'],
    title: 'First broken build',
    prompt: 'Builds are numbered 1 to `n`. One of them broke the app, and every build after it is broken too. Write `firstBroken(n, isBroken)`, returning the number of the first broken build, or `null` when every build works. `isBroken(build)` checks one build, and each check is slow, so ask as few times as you can, the way `git bisect` does. Keep `low` and `high` ends of the range that can still hold the answer, check the middle build `while` the range is not empty, and move one end past it. For 1,000 builds that takes about ten checks. Target: O(log n) checks and O(1) space.',
    starter: `const firstBroken = (n, isBroken) => {

};

// Scratch pad. Change this and press Run.
console.log(firstBroken(10, build => build >= 7));
`,
    skeleton: `const firstBroken = (n, isBroken) => {
  let low = 1;
  let high = n;
  let found = null;
  while (low <= high) {
    const mid = /* the middle of low and high, a whole number */;
    // broken: remember mid, and look for an earlier one to its left
    // working: the first broken build is to its right
  }
  return found;
};`,
    hints: ['`Math.floor((low + high) / 2)` is always a real build number. When the middle build is broken it might be the first one, so remember it before you move `high` to `mid - 1`.'],
    approach: [
      'Start with `low = 1`, `high = n` and no answer yet.',
      'While `low <= high`, check the middle build. If it is broken, record it and set `high = mid - 1`; otherwise set `low = mid + 1`.',
      'When the range is empty, the last broken build you recorded is the first one. Return it, or `null` if none was broken.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'firstBroken(10, build => build >= 7)', expected: 7 },
      { call: '(() => { let checks = 0; const first = firstBroken(1000, build => { checks += 1; return build >= 377; }); return [first, checks <= 11]; })()', expected: [377, true], label: 'at most 11 checks for 1,000 builds' },
      { call: 'firstBroken(1, () => true)', expected: 1, label: 'one build, and it is broken' },
      { call: 'firstBroken(5, () => true)', expected: 1, label: 'the very first build is broken', edge: true },
      { call: 'firstBroken(4, () => false)', expected: null, label: 'every build works', edge: true },
    ],
  },
  {
    id: 'alg-easy2-middle-of-list',
    track: 'algorithms',
    topic: 'algorithms',
    level: 15,
    tier: 2,
    focus: ['while', 'two-pointer'],
    title: 'Middle of a linked list',
    prompt: 'A linked list is a chain of `{ value, next }` nodes, and the last node\'s `next` is `null`. Write `middle(head)`, returning the middle node. A list with an even number of nodes has two middles; return the second. `middle(null)` gives `null`. Walk two pointers from the head `while` the fast one can still move: `slow` takes one step at a time and `fast` takes two, so `slow` is halfway when `fast` runs out. Return the node object from the list, and leave the list as it was. Target: O(n) time in one pass, and O(1) space.',
    starter: `const middle = head => {

};

// Scratch pad. Change this and press Run.
const list = (...values) => values.reduceRight((next, value) => ({ value, next }), null);
console.log(middle(list(1, 2, 3, 4, 5)));
`,
    skeleton: `const middle = head => {
  let slow = head;
  let fast = head;
  while (/* fast can take two more steps */) {
    // slow moves one node, fast moves two
  }
  return slow;
};`,
    hints: ['Loop while `fast !== null && fast.next !== null`. Checking both keeps `fast` from stepping off the end, and it lands an even list on the second middle.'],
    approach: [
      'Point `slow` and `fast` at the head.',
      'While `fast` and `fast.next` are both nodes, move `slow` to `slow.next` and `fast` to `fast.next.next`.',
      'When the loop stops, `slow` is the middle. For `null` the loop never runs and `slow` is already `null`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: withList('return middle(list(1, 2, 3, 4, 5)).value;'), expected: 3 },
      { call: withList('return middle(list(1, 2, 3, 4, 5, 6)).value;'), expected: 4, label: 'an even length gives the second middle' },
      { call: withList('const head = list(1, 2, 3); return middle(head) === head.next;'), expected: true, label: 'the node from the list, not a copy' },
      { call: withList('return middle(list(9)).value;'), expected: 9, label: 'one node is its own middle', edge: true },
      { call: 'middle(null)', expected: null, label: 'an empty list', edge: true },
    ],
  },

  /* ── sorting first ─────────────────────────────────────────────────── */
  {
    id: 'alg-easy2-meetings-clash',
    track: 'algorithms',
    topic: 'algorithms',
    level: 17,
    tier: 2,
    focus: ['sort', 'for'],
    title: 'Do any meetings clash?',
    prompt: 'Each meeting is a `[start, end]` pair of minutes. Write `hasClash(meetings)`, returning `true` when any two meetings overlap. A meeting that ends at 10 and one that starts at 10 do not clash. `hasClash([[0, 30], [5, 10], [15, 20]])` is `true`, and `hasClash([[7, 10], [2, 4]])` is `false`. Sort a copy by start time, then walk it with a `for` loop: in start order, a clash always shows up between neighbours, so you only compare each meeting with the one before it. Leave the caller\'s array in its order. Target: O(n log n) time for the sort and O(n) space for the copy.',
    starter: `const hasClash = meetings => {

};

// Scratch pad. Change this and press Run.
console.log(hasClash([[0, 30], [5, 10], [15, 20]]));
`,
    skeleton: `const hasClash = meetings => {
  const sorted = [...meetings].sort(/* by start time */);
  for (let i = 1; i < sorted.length; i++) {
    // does sorted[i] start before sorted[i - 1] ends?
  }
  return false;
};`,
    hints: ['`sort((a, b) => a[0] - b[0])` orders pairs by their first number. Copy the array first with `[...meetings]`, because `sort` rearranges the array you call it on.'],
    approach: [
      'Copy the meetings and sort the copy by start time.',
      'Loop from the second meeting. If a meeting starts before the one before it ends, return `true`.',
      'If the loop finishes, nothing overlaps: return `false`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'hasClash([[0, 30], [5, 10], [15, 20]])', expected: true },
      { call: 'hasClash([[7, 10], [2, 4]])', expected: false, label: 'out of order, but apart' },
      { call: 'hasClash([[9, 12], [1, 3], [4, 8]])', expected: false, label: 'three meetings out of order, none overlapping' },
      { call: 'hasClash([[1, 5], [5, 8]])', expected: false, label: 'ending as another starts is not a clash', edge: true },
      { call: 'hasClash([])', expected: false, label: 'no meetings', edge: true },
    ],
  },
  {
    id: 'alg-easy2-median',
    track: 'algorithms',
    topic: 'algorithms',
    level: 17,
    tier: 1,
    focus: ['sort'],
    title: 'Median of a list',
    prompt: 'Write `median(numbers)`, returning the middle value once the numbers are in order. `median([5, 1, 3])` gives 3. With an even count there are two middle values, and the median is their average: `median([4, 1, 3, 2])` gives 2.5. Sort a copy with a compare function, because `sort` on its own compares numbers as text and puts 10 before 9. Leave the caller\'s array as it was, and return `null` for an empty array. Target: O(n log n) time and O(n) space for the copy.',
    starter: `const median = numbers => {

};

// Scratch pad. Change this and press Run.
console.log(median([4, 1, 3, 2]));
`,
    skeleton: `const median = numbers => {
  if (numbers.length === 0) return null;
  const sorted = /* a sorted copy, smallest first */;
  const mid = Math.floor(sorted.length / 2);
  // odd count: the value at mid
  // even count: the average of the values at mid - 1 and mid
};`,
    hints: ['`[...numbers].sort((a, b) => a - b)` sorts a copy from smallest to largest. For an odd count, `Math.floor(length / 2)` is the index of the middle; for an even count it is the second of the two middles.'],
    approach: [
      'Return `null` when there are no numbers.',
      'Copy the array and sort the copy with `(a, b) => a - b`.',
      'Find `mid = Math.floor(length / 2)`. Return `sorted[mid]` for an odd length, and the average of `sorted[mid - 1]` and `sorted[mid]` for an even one.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'median([5, 1, 3])', expected: 3 },
      { call: 'median([4, 1, 3, 2])', expected: 2.5, label: 'an even count averages the two middles' },
      { call: 'median([10, 9, 100])', expected: 10, label: 'compared as numbers, not text' },
      { call: 'median([])', expected: null, label: 'empty input', edge: true },
      { call: 'median([7])', expected: 7, label: 'one number', edge: true },
    ],
  },
  {
    id: 'alg-easy2-product-of-three',
    track: 'algorithms',
    topic: 'algorithms',
    level: 18,
    tier: 2,
    focus: ['sort'],
    title: 'Largest product of three',
    prompt: 'Write `maxProductOfThree(numbers)`, returning the largest product of any three of the numbers. `maxProductOfThree([1, 2, 3, 4])` gives 24. Negative numbers change the answer: in `[-10, -10, 1, 3, 2]` it is 300, from -10 × -10 × 3, because two negatives multiply to a positive. Sort a copy numerically, and the winning three sit at the ends of the sorted array. There are always at least three numbers, and the caller\'s array keeps its order. Target: O(n log n) time for the sort, where trying every triple would be O(n³).',
    starter: `const maxProductOfThree = numbers => {

};

// Scratch pad. Change this and press Run.
console.log(maxProductOfThree([-10, -10, 1, 3, 2]));
`,
    skeleton: `const maxProductOfThree = numbers => {
  const sorted = /* a sorted copy, smallest first */;
  const n = sorted.length;
  const threeLargest = /* the product of the last three */;
  const twoSmallestAndLargest = /* the product of the first two and the last */;
  return /* the bigger of the two */;
};`,
    hints: ['Two products can win: the three largest numbers, or the two most negative numbers with the largest. After a numeric sort both sit at the ends, so you never try every triple.'],
    approach: [
      'Copy the numbers and sort the copy with `(a, b) => a - b`.',
      'Multiply the last three, then multiply the first two by the last one.',
      'Return the larger of the two products with `Math.max`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'maxProductOfThree([1, 2, 3, 4])', expected: 24 },
      { call: 'maxProductOfThree([-10, -10, 1, 3, 2])', expected: 300, label: 'two negatives make a positive' },
      { call: 'maxProductOfThree([10, 3, 5, 6, 20])', expected: 1200, label: 'the input arrives in any order' },
      { call: 'maxProductOfThree([-2, -1, 4, 5])', expected: 10, label: 'the two smallest win again' },
      { call: 'maxProductOfThree([-1, -2, -3])', expected: -6, label: 'exactly three numbers, all negative', edge: true },
    ],
  },
  {
    id: 'alg-easy2-hand-out-snacks',
    track: 'algorithms',
    topic: 'algorithms',
    level: 18,
    tier: 2,
    focus: ['sort', 'two-pointer'],
    title: 'Hand out the snacks',
    prompt: 'Each child has an appetite, and a child is happy with any snack at least that big. Each snack can go to one child. Write `happyChildren(appetites, snacks)`, returning the most children you can make happy. `happyChildren([1, 2, 3], [1, 1])` gives 1, and `happyChildren([1, 2], [1, 2, 3])` gives 2. Sort copies of both lists from smallest to largest, then walk them with two pointers, giving the least hungry waiting child the smallest snack that fits. Leave both arrays in their order. Target: O(n log n + m log m) time for the two sorts.',
    starter: `const happyChildren = (appetites, snacks) => {

};

// Scratch pad. Change this and press Run.
console.log(happyChildren([1, 2, 3], [1, 1]));
`,
    skeleton: `const happyChildren = (appetites, snacks) => {
  const children = /* appetites, sorted smallest first */;
  const sizes = /* snacks, sorted smallest first */;
  let child = 0;
  let snack = 0;
  while (child < children.length && snack < sizes.length) {
    // a snack big enough makes this child happy: move to the next child
    // either way, this snack is now used or too small: move to the next snack
  }
  return child;
};`,
    hints: ['A snack too small for the least hungry child is too small for everyone, so you can skip it for good. Sorting both lists is what lets each pointer move forward only.'],
    approach: [
      'Sort copies of both arrays with `(a, b) => a - b`.',
      'Keep one index into the children and one into the snacks. While both are in range, check whether the current snack is at least the current appetite.',
      'If it is, the child is happy: move both indexes on. If not, move only the snack index. The child index at the end is the answer.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'happyChildren([1, 2, 3], [1, 1])', expected: 1 },
      { call: 'happyChildren([1, 2], [1, 2, 3])', expected: 2 },
      { call: 'happyChildren([10, 9, 8, 7], [5, 6, 7, 8])', expected: 2, label: 'the lists arrive in any order' },
      { call: 'happyChildren([], [1, 2])', expected: 0, label: 'no children', edge: true },
      { call: 'happyChildren([1, 2], [])', expected: 0, label: 'no snacks', edge: true },
    ],
  },

  /* ── recursion ─────────────────────────────────────────────────────── */
  {
    id: 'alg-easy2-greatest-common-divisor',
    track: 'algorithms',
    topic: 'algorithms',
    level: 19,
    tier: 1,
    focus: ['recursion'],
    title: 'Greatest common divisor',
    prompt: 'The greatest common divisor of two whole numbers is the largest number that divides both. Write `gcd(a, b)` with Euclid\'s rule: `gcd(a, 0)` is `a`, and otherwise `gcd(a, b)` equals `gcd(b, a % b)`. `gcd(48, 18)` gives 6. Write it as a function that calls itself, with `b === 0` as the base case that stops the calls. Both numbers are 0 or more, and `gcd(0, 0)` gives 0. Target: O(log min(a, b)) calls.',
    starter: `const gcd = (a, b) => {

};

// Scratch pad. Change this and press Run.
console.log(gcd(48, 18));
`,
    skeleton: `const gcd = (a, b) => {
  if (/* the base case */) return a;
  return gcd(/* the smaller problem */);
};`,
    hints: ['Each call passes on `b` and the remainder `a % b`, which is always smaller than `b`. The second number shrinks until it reaches 0, and then the first number is the answer.'],
    approach: [
      'Write the base case first: when `b` is 0, return `a`.',
      'Otherwise return `gcd(b, a % b)`.',
      'Trace `gcd(48, 18)`: it becomes `gcd(18, 12)`, then `gcd(12, 6)`, then `gcd(6, 0)`, which is 6.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'gcd(48, 18)', expected: 6 },
      { call: 'gcd(18, 48)', expected: 6, label: 'the order of the arguments does not matter' },
      { call: 'gcd(17, 5)', expected: 1, label: 'no common divisor but 1' },
      { call: 'gcd(7, 0)', expected: 7, label: 'the base case', edge: true },
      { call: 'gcd(0, 0)', expected: 0, label: 'both zero', edge: true },
    ],
  },
  {
    id: 'alg-easy2-fibonacci-memo',
    track: 'algorithms',
    topic: 'algorithms',
    level: 19,
    tier: 2,
    focus: ['recursion', 'map-set'],
    title: 'Fibonacci with a memo',
    prompt: 'Fibonacci numbers start 0, 1, and each later one is the sum of the two before it: 0, 1, 1, 2, 3, 5, 8. Write `fib(n, memo = new Map())`, returning number `n` of the sequence, so `fib(0)` is 0 and `fib(10)` is 55. The plain recursive version works out the same `n` again and again, and by `n = 40` it takes seconds. Store each answer in `memo` the first time you work it out, check `memo` before doing any work, and pass the same `memo` to every recursive call. Target: O(n) time and O(n) space.',
    starter: `const fib = (n, memo = new Map()) => {

};

// Scratch pad. Change this and press Run.
console.log(fib(10));
`,
    skeleton: `const fib = (n, memo = new Map()) => {
  if (n < 2) return n;
  if (/* memo already has n */) return /* that answer */;
  const answer = /* fib of the two before, passing memo along */;
  // remember the answer before returning it
  return answer;
};`,
    hints: ['Without a memo, `fib(5)` works out `fib(3)` twice and `fib(2)` three times, and the repeats double with each step up. Check `memo.has(n)` first and each `n` is worked out once.'],
    approach: [
      'Keep the base cases: for `n` below 2, return `n`.',
      'If `memo.has(n)`, return `memo.get(n)` straight away.',
      'Otherwise work out `fib(n - 1, memo) + fib(n - 2, memo)`, store it with `memo.set(n, answer)`, and return it.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'fib(10)', expected: 55 },
      { call: 'fib(20)', expected: 6765 },
      { call: '(() => { const memo = new Map(); fib(10, memo); return [memo.get(10), memo.get(9), memo.get(5)]; })()', expected: [55, 34, 5], label: 'the memo keeps what fib worked out' },
      { call: 'fib(0)', expected: 0, label: 'the first number', edge: true },
      { call: 'fib(1)', expected: 1, label: 'the second number', edge: true },
    ],
  },
  {
    id: 'alg-easy2-binary-strings',
    track: 'algorithms',
    topic: 'algorithms',
    level: 20,
    tier: 2,
    focus: ['recursion', 'strings'],
    title: 'Every binary string of a length',
    prompt: 'Write `binaryStrings(n)`, returning every string of `n` characters made of `"0"` and `"1"`, in counting order. `binaryStrings(2)` gives `["00", "01", "10", "11"]`. Build them with a function that calls itself: a string of length `n` is `"0"` or `"1"` followed by a string of length `n - 1`. The base case is `n` of 0, which has one string, the empty one, so `binaryStrings(0)` gives `[""]`. Target: O(n · 2ⁿ) time, the size of the answer.',
    starter: `const binaryStrings = n => {

};

// Scratch pad. Change this and press Run.
console.log(binaryStrings(2));
`,
    skeleton: `const binaryStrings = n => {
  if (n === 0) return [""];
  const shorter = binaryStrings(/* one character fewer */);
  // "0" in front of every shorter string, then "1" in front of every shorter string
};`,
    hints: ['Each string of length `n` starts with `"0"` or `"1"`, and the rest is a string of length `n - 1`. Get the shorter list once and prefix it twice; putting all the `"0"` strings first keeps counting order.'],
    approach: [
      'Return `[""]` when `n` is 0.',
      'Call `binaryStrings(n - 1)` to get every shorter string.',
      'Return the shorter strings with `"0"` in front, followed by the shorter strings with `"1"` in front.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'binaryStrings(2)', expected: ['00', '01', '10', '11'] },
      { call: 'binaryStrings(1)', expected: ['0', '1'] },
      { call: 'binaryStrings(3)', expected: ['000', '001', '010', '011', '100', '101', '110', '111'] },
      { call: 'binaryStrings(4).length', expected: 16, label: 'twice as many for each extra character' },
      { call: 'binaryStrings(0)', expected: [''], label: 'length 0 has one string, the empty one', edge: true },
    ],
  },
  {
    id: 'alg-easy2-mirror-tree',
    track: 'algorithms',
    topic: 'algorithms',
    level: 20,
    tier: 2,
    focus: ['recursion', 'objects'],
    title: 'Mirror a binary tree',
    prompt: 'A binary tree is made of `{ value, left, right }` nodes, and a missing child is `null`. Write `mirror(root)`, returning a new tree that is the mirror image: each node\'s left and right children swap places, all the way down. A root of 1 with 2 on the left and 3 on the right mirrors to 3 on the left and 2 on the right. Build new node objects and leave the tree you were given as it was. An empty tree gives `null`. Target: O(n) time, and O(h) space for the calls on a tree of height h.',
    starter: `const mirror = root => {

};

// Scratch pad. Change this and press Run.
const node = (value, left = null, right = null) => ({ value, left, right });
console.log(mirror(node(1, node(2), node(3))));
`,
    skeleton: `const mirror = root => {
  if (root === null) return null;
  return {
    value: root.value,
    left: /* the mirror of the right subtree */,
    right: /* the mirror of the left subtree */,
  };
};`,
    hints: ['The mirror of a tree is its root with the mirrored right subtree on the left and the mirrored left subtree on the right. `null` mirrors to `null`, and that base case ends the calls at each missing child.'],
    approach: [
      'Return `null` when `root` is `null`.',
      'Otherwise make a new node with the same `value`.',
      'Set its `left` to `mirror(root.right)` and its `right` to `mirror(root.left)`, and return it.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: withTree('mirror(node(1, node(2), node(3)))'), expected: tree(1, tree(3), tree(2)) },
      { call: withTree('mirror(node(4, node(2, node(1), node(3)), node(7, node(6), node(9))))'), expected: tree(4, tree(7, tree(9), tree(6)), tree(2, tree(3), tree(1))), label: 'three levels' },
      { call: withTree('mirror(node(1, node(2, node(3))))'), expected: tree(1, null, tree(2, null, tree(3))), label: 'a tree that leans left leans right' },
      { call: withTree('mirror(node(5))'), expected: tree(5), label: 'one node', edge: true },
      { call: 'mirror(null)', expected: null, label: 'an empty tree', edge: true },
    ],
  },
  {
    id: 'alg-easy2-path-sum',
    track: 'algorithms',
    topic: 'algorithms',
    level: 21,
    tier: 2,
    focus: ['recursion', 'objects'],
    title: 'A root-to-leaf path with a sum',
    prompt: 'A binary tree is made of `{ value, left, right }` nodes, and a missing child is `null`. Write `hasPathSum(root, target)`, returning `true` when some path from the root down to a leaf adds up to `target`. A leaf is a node with no children at all. Recurse with what is left to find: subtract the node\'s value from `target` and ask each child the same question. An empty tree has no paths, so it gives `false`. Target: O(n) time, and O(h) space for the calls on a tree of height h.',
    starter: `const hasPathSum = (root, target) => {

};

// Scratch pad. Change this and press Run.
const node = (value, left = null, right = null) => ({ value, left, right });
console.log(hasPathSum(node(1, node(2), node(3)), 4));
`,
    skeleton: `const hasPathSum = (root, target) => {
  if (root === null) return false;
  const rest = target - root.value; // what the rest of the path must add up to
  if (/* root is a leaf */) return /* whether nothing is left to find */;
  return /* a path through either child */;
};`,
    hints: ['Decide at the leaf, and not at `null`. A node with one child has `null` on its other side, and checking the sum there would count a path that stops halfway down.'],
    approach: [
      'Return `false` for `null`: no path runs through an empty tree.',
      'Take the node\'s value off `target`. If the node is a leaf, return whether what is left is 0.',
      'Otherwise return `hasPathSum(root.left, rest) || hasPathSum(root.right, rest)`.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: withTree(`hasPathSum(${PATH_TREE}, 22)`), expected: true, label: '5 + 4 + 11 + 2' },
      { call: withTree(`hasPathSum(${PATH_TREE}, 26)`), expected: true, label: '5 + 8 + 13' },
      { call: withTree(`hasPathSum(${PATH_TREE}, 9)`), expected: false, label: 'the path must end at a leaf' },
      { call: withTree('hasPathSum(node(1, node(2)), 1)'), expected: false, label: 'a node with one child is not a leaf', edge: true },
      { call: 'hasPathSum(null, 0)', expected: false, label: 'an empty tree has no paths', edge: true },
    ],
  },
];
