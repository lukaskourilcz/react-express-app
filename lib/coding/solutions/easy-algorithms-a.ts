// Server-only reference solutions and hidden tests for lib/coding/tasks/easy-algorithms-a.ts.
// Never import from client code. The hidden tests aim at the shortcut each
// visible set leaves open: a hard-coded answer, an input the prompt protects,
// a plain object where a Map keeps keys apart, a text sort where numbers were
// asked for, and the slow version the technique exists to replace.

import type { CodingSolution } from '../types';
import { tree, withList, withTree } from '../tasks/easy-algorithms-a';

export const EASY_ALGORITHMS_A_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── hash maps, sets and plain objects ─────────────────────────────── */
  'alg-easy2-count-jewels': {
    solution: `const countJewels = (jewels, stones) => {
  // One Set lookup per stone, where includes would rescan the jewels each time.
  const kinds = new Set(jewels);
  let count = 0;
  for (const stone of stones) {
    if (kinds.has(stone)) count += 1;
  }
  return count;
};`,
    junior: `const countJewels = (jewels, stones) => {
  const kinds = new Set();
  for (const jewel of jewels) {
    kinds.add(jewel);
  }
  let count = 0;
  for (const stone of stones) {
    if (kinds.has(stone)) {
      count = count + 1;
    }
  }
  return count;
};`,
    senior: `const countJewels = (jewels, stones) => {
  const kinds = new Set(jewels);
  return [...stones].filter((stone) => kinds.has(stone)).length;
};`,
    hiddenTests: [
      { call: 'countJewels("aa", "a")', expected: 1 },
      { call: 'countJewels("xyz", "xyzxyz")', expected: 6 },
      { call: 'countJewels("!1 ", "a 1!b")', expected: 3 },
      { call: 'countJewels("b", "abcabc")', expected: 2 },
    ],
  },
  'alg-easy2-letters-for-a-note': {
    solution: `const canWrite = (note, magazine) => {
  // How many of each character the magazine still has to give.
  const counts = {};
  for (const char of magazine) {
    counts[char] = (counts[char] || 0) + 1;
  }
  for (const char of note) {
    if (!counts[char]) return false; // missing, or all used up
    counts[char] -= 1;
  }
  return true;
};`,
    junior: `const canWrite = (note, magazine) => {
  const counts = {};
  for (const char of magazine) {
    if (counts[char] === undefined) {
      counts[char] = 0;
    }
    counts[char] = counts[char] + 1;
  }
  for (const char of note) {
    if (counts[char] === undefined || counts[char] === 0) {
      return false;
    }
    counts[char] = counts[char] - 1;
  }
  return true;
};`,
    senior: `const canWrite = (note, magazine) => {
  const counts = {};
  for (const char of magazine) counts[char] = (counts[char] ?? 0) + 1;
  return [...note].every((char) => counts[char]-- > 0);
};`,
    hiddenTests: [
      { call: 'canWrite("hello world", "dlrow olleh")', expected: true },
      { call: 'canWrite("a b", "ab")', expected: false },
      { call: 'canWrite("abcabc", "aabbc")', expected: false },
      { call: 'canWrite("zzz", "zzzz")', expected: true },
    ],
  },
  'alg-easy2-majority-value': {
    solution: `const majority = values => {
  const counts = new Map();
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    // The first value past half is the only one that can get there.
    if (count > values.length / 2) return value;
  }
  return null;
};`,
    junior: `const majority = values => {
  const counts = new Map();
  for (const value of values) {
    if (!counts.has(value)) {
      counts.set(value, 0);
    }
    counts.set(value, counts.get(value) + 1);
  }
  for (const [value, count] of counts) {
    if (count > values.length / 2) {
      return value;
    }
  }
  return null;
};`,
    // Boyer-Moore voting: a majority outlasts every other value put together,
    // so one candidate and a lead are enough. The second pass confirms it.
    senior: `const majority = (values) => {
  let candidate = null;
  let lead = 0;
  for (const value of values) {
    if (lead === 0) candidate = value;
    lead += value === candidate ? 1 : -1;
  }
  let count = 0;
  for (const value of values) if (value === candidate) count += 1;
  return count > values.length / 2 ? candidate : null;
};`,
    hiddenTests: [
      { call: 'majority([1, "1", 1])', expected: 1 },
      { call: 'majority([0, 0, 1])', expected: 0 },
      { call: 'majority([2, 2, 1, 1, 1, 2, 2])', expected: 2 },
      { call: 'majority([5, 5, 6, 6, 7])', expected: null },
    ],
  },
  'alg-easy2-happy-number': {
    solution: `const isHappy = n => {
  const seen = new Set();
  while (n !== 1) {
    // A number met before means the sequence is going round a cycle.
    if (seen.has(n)) return false;
    seen.add(n);
    let next = 0;
    while (n > 0) {
      const digit = n % 10;
      next += digit * digit;
      n = Math.floor(n / 10);
    }
    n = next;
  }
  return true;
};`,
    junior: `const isHappy = n => {
  const seen = new Set();
  let current = n;
  while (current !== 1) {
    if (seen.has(current)) {
      return false;
    }
    seen.add(current);
    const digits = String(current).split("");
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum = sum + Number(digits[i]) * Number(digits[i]);
    }
    current = sum;
  }
  return true;
};`,
    senior: `const squareDigits = (n) => [...String(n)].reduce((sum, digit) => sum + Number(digit) ** 2, 0);

const isHappy = (n) => {
  const seen = new Set();
  while (n !== 1 && !seen.has(n)) {
    seen.add(n);
    n = squareDigits(n);
  }
  return n === 1;
};`,
    hiddenTests: [
      { call: 'isHappy(100)', expected: true },
      { call: 'isHappy(20)', expected: false },
      { call: 'isHappy(1111111)', expected: true },
      { call: 'isHappy(89)', expected: false },
    ],
  },

  /* ── strings and one-pass scans ────────────────────────────────────── */
  'alg-easy2-common-prefix': {
    solution: `const commonPrefix = words => {
  if (words.length === 0) return "";
  const first = words[0];
  for (let i = 0; i < first.length; i++) {
    for (const word of words) {
      // A shorter word reads undefined here, which also ends the prefix.
      if (word[i] !== first[i]) return first.slice(0, i);
    }
  }
  return first;
};`,
    junior: `const commonPrefix = words => {
  if (words.length === 0) {
    return "";
  }
  let prefix = "";
  for (let i = 0; i < words[0].length; i++) {
    const char = words[0][i];
    for (let j = 1; j < words.length; j++) {
      if (words[j][i] !== char) {
        return prefix;
      }
    }
    prefix = prefix + char;
  }
  return prefix;
};`,
    senior: `const commonPrefix = (words) => {
  if (words.length === 0) return "";
  let prefix = words[0];
  for (const word of words) {
    while (!word.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
};`,
    hiddenTests: [
      { call: 'commonPrefix(["interview", "internet", "interval", "in"])', expected: 'in' },
      { call: 'commonPrefix(["abc", "abd", "xbc"])', expected: '' },
      { call: 'commonPrefix(["", "abc"])', expected: '' },
      { call: 'commonPrefix(["prefix", "prefixes", "pre"])', expected: 'pre' },
    ],
  },
  'alg-easy2-roman-numerals': {
    solution: `const VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

const fromRoman = numeral => {
  let total = 0;
  for (let i = 0; i < numeral.length; i++) {
    const value = VALUES[numeral[i]];
    // Past the end there is no next letter, so the last one is always added.
    const next = VALUES[numeral[i + 1]] ?? 0;
    total += value < next ? -value : value;
  }
  return total;
};`,
    junior: `const fromRoman = numeral => {
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < numeral.length; i++) {
    const value = values[numeral[i]];
    if (i + 1 < numeral.length && value < values[numeral[i + 1]]) {
      total = total - value;
    } else {
      total = total + value;
    }
  }
  return total;
};`,
    senior: `const VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

const fromRoman = (numeral) => {
  let total = 0;
  let previous = 0;
  for (let i = numeral.length - 1; i >= 0; i--) {
    const value = VALUES[numeral[i]];
    total += value < previous ? -value : value;
    previous = value;
  }
  return total;
};`,
    hiddenTests: [
      { call: 'fromRoman("XL")', expected: 40 },
      { call: 'fromRoman("CDXLIV")', expected: 444 },
      { call: 'fromRoman("MMXXVI")', expected: 2026 },
      { call: 'fromRoman("III")', expected: 3 },
    ],
  },
  'alg-easy2-second-largest': {
    solution: `const secondLargest = numbers => {
  let largest = -Infinity;
  let second = -Infinity;
  for (const n of numbers) {
    if (n > largest) {
      second = largest; // the old maximum is now the runner-up
      largest = n;
    } else if (n < largest && n > second) {
      second = n; // a tie with the maximum changes nothing
    }
  }
  return second === -Infinity ? null : second;
};`,
    junior: `const secondLargest = numbers => {
  let largest = null;
  let second = null;
  for (const n of numbers) {
    if (largest === null || n > largest) {
      second = largest;
      largest = n;
    } else if (n !== largest && (second === null || n > second)) {
      second = n;
    }
  }
  return second;
};`,
    senior: `const secondLargest = (numbers) => {
  let [largest, second] = [-Infinity, -Infinity];
  for (const n of numbers) {
    if (n > largest) [largest, second] = [n, largest];
    else if (n < largest && n > second) second = n;
  }
  return second === -Infinity ? null : second;
};`,
    hiddenTests: [
      { call: 'secondLargest([1, 2, 3, 4, 5])', expected: 4 },
      { call: 'secondLargest([10])', expected: null },
      { call: 'secondLargest([3, 10, 10, 9, 1])', expected: 9 },
      { call: 'secondLargest([0, -1])', expected: -1 },
    ],
  },
  'alg-easy2-best-trade': {
    solution: `const bestTrade = prices => {
  let lowest = Infinity;
  let best = 0;
  for (const price of prices) {
    // Selling today earns the most after buying on the cheapest day before it.
    if (price - lowest > best) best = price - lowest;
    if (price < lowest) lowest = price;
  }
  return best;
};`,
    junior: `const bestTrade = prices => {
  if (prices.length < 2) {
    return 0;
  }
  let lowest = prices[0];
  let best = 0;
  for (const price of prices) {
    if (price < lowest) {
      lowest = price;
    }
    const profit = price - lowest;
    if (profit > best) {
      best = profit;
    }
  }
  return best;
};`,
    senior: `const bestTrade = (prices) => {
  let lowest = Infinity;
  let best = 0;
  for (const price of prices) {
    lowest = Math.min(lowest, price);
    best = Math.max(best, price - lowest);
  }
  return best;
};`,
    hiddenTests: [
      { call: 'bestTrade([3, 8, 1, 4])', expected: 5 },
      { call: 'bestTrade([1, 2, 3, 4, 5])', expected: 4 },
      { call: 'bestTrade([4, 4, 4])', expected: 0 },
      { call: 'bestTrade([9, 2, 5, 1, 7])', expected: 6 },
    ],
  },
  'alg-easy2-fewest-coins': {
    solution: `const COINS = [50, 20, 10, 5, 2, 1];

const makeChange = cents => {
  const change = {};
  for (const coin of COINS) {
    // Largest first: take this coin for as long as it fits.
    while (cents >= coin) {
      change[coin] = (change[coin] || 0) + 1;
      cents -= coin;
    }
  }
  return change;
};`,
    junior: `const makeChange = cents => {
  const coins = [50, 20, 10, 5, 2, 1];
  const change = {};
  let left = cents;
  let i = 0;
  while (left > 0) {
    const coin = coins[i];
    if (left >= coin) {
      if (change[coin] === undefined) {
        change[coin] = 0;
      }
      change[coin] = change[coin] + 1;
      left = left - coin;
    } else {
      i = i + 1;
    }
  }
  return change;
};`,
    senior: `const COINS = [50, 20, 10, 5, 2, 1];

const makeChange = (cents) => {
  const change = {};
  for (const coin of COINS) {
    const count = Math.floor(cents / coin);
    if (count > 0) change[coin] = count;
    cents %= coin;
  }
  return change;
};`,
    hiddenTests: [
      { call: 'makeChange(1)', expected: { 1: 1 } },
      { call: 'makeChange(99)', expected: { 50: 1, 20: 2, 5: 1, 2: 2 } },
      { call: 'makeChange(500)', expected: { 50: 10 } },
      { call: 'makeChange(8)', expected: { 5: 1, 2: 1, 1: 1 } },
    ],
  },

  /* ── two pointers and halving ──────────────────────────────────────── */
  'alg-easy2-first-broken-build': {
    solution: `const firstBroken = (n, isBroken) => {
  let low = 1;
  let high = n;
  let found = null;
  // Every build in low..high is still a candidate; each check halves the range.
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (isBroken(mid)) {
      found = mid; // it could be the first, so keep looking to its left
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return found;
};`,
    junior: `const firstBroken = (n, isBroken) => {
  let low = 1;
  let high = n;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (isBroken(mid)) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  if (n >= 1 && isBroken(low)) {
    return low;
  }
  return null;
};`,
    senior: `const firstBroken = (n, isBroken) => {
  let [low, high] = [1, n + 1];
  while (low < high) {
    const mid = low + ((high - low) >> 1);
    if (isBroken(mid)) high = mid;
    else low = mid + 1;
  }
  return low <= n ? low : null;
};`,
    hiddenTests: [
      { call: '(() => { let checks = 0; const first = firstBroken(1000000, build => { checks += 1; return build >= 999999; }); return [first, checks <= 21]; })()', expected: [999999, true] },
      { call: '(() => { let checks = 0; const first = firstBroken(64, () => { checks += 1; return false; }); return [first, checks <= 7]; })()', expected: [null, true] },
      { call: 'firstBroken(2, build => build >= 2)', expected: 2 },
      { call: '(() => { const asked = []; firstBroken(100, build => { asked.push(build); return build >= 50; }); return asked.every(build => Number.isInteger(build) && build >= 1 && build <= 100); })()', expected: true },
    ],
  },
  'alg-easy2-middle-of-list': {
    solution: `const middle = head => {
  let slow = head;
  let fast = head;
  // fast moves twice as far, so it reaches the end when slow is halfway.
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
};`,
    junior: `const middle = head => {
  let length = 0;
  let node = head;
  while (node !== null) {
    length = length + 1;
    node = node.next;
  }
  let steps = Math.floor(length / 2);
  node = head;
  while (steps > 0) {
    node = node.next;
    steps = steps - 1;
  }
  return node;
};`,
    senior: `const middle = (head) => {
  let slow = head;
  let fast = head;
  while (fast?.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
};`,
    hiddenTests: [
      { call: withList('return middle(list(1, 2)).value;'), expected: 2 },
      { call: withList('return middle(list(1, 2, 3, 4, 5, 6, 7)).value;'), expected: 4 },
      { call: withList('const head = list(5, 5, 5, 5); return middle(head) === head.next.next;'), expected: true },
      { call: withList('const head = list(1, 2, 3, 4); middle(head); const values = []; for (let node = head; node !== null; node = node.next) values.push(node.value); return values;'), expected: [1, 2, 3, 4] },
    ],
  },

  /* ── sorting first ─────────────────────────────────────────────────── */
  'alg-easy2-meetings-clash': {
    solution: `const hasClash = meetings => {
  // Sort a copy: sort reorders the array it is called on.
  const sorted = [...meetings].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) {
    // In start order, a clash always shows up between neighbours.
    if (sorted[i][0] < sorted[i - 1][1]) return true;
  }
  return false;
};`,
    junior: `const hasClash = meetings => {
  const sorted = meetings.slice();
  sorted.sort(function (a, b) {
    return a[0] - b[0];
  });
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (next[0] < current[1]) {
      return true;
    }
  }
  return false;
};`,
    senior: `const hasClash = (meetings) =>
  [...meetings]
    .sort(([a], [b]) => a - b)
    .some(([start], i, sorted) => i > 0 && start < sorted[i - 1][1]);`,
    hiddenTests: [
      { call: '(() => { const meetings = [[5, 6], [1, 2]]; hasClash(meetings); return meetings; })()', expected: [[5, 6], [1, 2]] },
      { call: 'hasClash([[1, 10], [2, 3], [11, 12]])', expected: true },
      { call: 'hasClash([[10, 20], [2, 9], [100, 200], [20, 30]])', expected: false },
      { call: 'hasClash([[4, 8], [4, 5]])', expected: true },
    ],
  },
  'alg-easy2-median': {
    solution: `const median = numbers => {
  if (numbers.length === 0) return null;
  // Copy first, and compare as numbers: the default sort compares text.
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
};`,
    junior: `const median = numbers => {
  if (numbers.length === 0) {
    return null;
  }
  const sorted = numbers.slice();
  sorted.sort(function (a, b) {
    return a - b;
  });
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const sum = sorted[mid - 1] + sorted[mid];
    return sum / 2;
  }
  return sorted[mid];
};`,
    senior: `const median = (numbers) => {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};`,
    hiddenTests: [
      { call: '(() => { const numbers = [3, 1, 2]; median(numbers); return numbers; })()', expected: [3, 1, 2] },
      { call: 'median([-5, -1, -3, -2])', expected: -2.5 },
      { call: 'median([2, 2, 2, 9])', expected: 2 },
      { call: 'median([1, 1000, 25, 3, 7])', expected: 7 },
    ],
  },
  'alg-easy2-product-of-three': {
    solution: `const maxProductOfThree = numbers => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const n = sorted.length;
  // The winner uses the three largest, or the two most negative with the largest.
  const threeLargest = sorted[n - 1] * sorted[n - 2] * sorted[n - 3];
  const twoSmallestAndLargest = sorted[0] * sorted[1] * sorted[n - 1];
  return Math.max(threeLargest, twoSmallestAndLargest);
};`,
    junior: `const maxProductOfThree = numbers => {
  const sorted = numbers.slice();
  sorted.sort(function (a, b) {
    return a - b;
  });
  const last = sorted.length - 1;
  const a = sorted[last] * sorted[last - 1] * sorted[last - 2];
  const b = sorted[0] * sorted[1] * sorted[last];
  if (a > b) {
    return a;
  }
  return b;
};`,
    senior: `const maxProductOfThree = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const [smallest, nextSmallest] = sorted;
  const [third, second, largest] = sorted.slice(-3);
  return Math.max(largest * second * third, smallest * nextSmallest * largest);
};`,
    hiddenTests: [
      { call: 'maxProductOfThree([-5, -4, 1, 2, 3])', expected: 60 },
      { call: 'maxProductOfThree([-100, 1, 2, 3])', expected: 6 },
      { call: 'maxProductOfThree([100, 20, 9, 8, 7, 1000])', expected: 2000000 },
      { call: '(() => { const numbers = [3, 1, 2]; maxProductOfThree(numbers); return numbers; })()', expected: [3, 1, 2] },
    ],
  },
  'alg-easy2-hand-out-snacks': {
    solution: `const happyChildren = (appetites, snacks) => {
  const children = [...appetites].sort((a, b) => a - b);
  const sizes = [...snacks].sort((a, b) => a - b);
  let child = 0;
  for (let snack = 0; snack < sizes.length && child < children.length; snack++) {
    // A snack too small for the least hungry child fits nobody: skip it.
    if (sizes[snack] >= children[child]) child++;
  }
  return child;
};`,
    junior: `const happyChildren = (appetites, snacks) => {
  const children = appetites.slice().sort(function (a, b) {
    return a - b;
  });
  const sizes = snacks.slice().sort(function (a, b) {
    return a - b;
  });
  let child = 0;
  let snack = 0;
  let happy = 0;
  while (child < children.length && snack < sizes.length) {
    if (sizes[snack] >= children[child]) {
      happy = happy + 1;
      child = child + 1;
    }
    snack = snack + 1;
  }
  return happy;
};`,
    senior: `const byNumber = (a, b) => a - b;

const happyChildren = (appetites, snacks) => {
  const children = [...appetites].sort(byNumber);
  let happy = 0;
  for (const size of [...snacks].sort(byNumber)) {
    if (happy < children.length && size >= children[happy]) happy += 1;
  }
  return happy;
};`,
    hiddenTests: [
      { call: 'happyChildren([3, 1], [1, 100])', expected: 2 },
      { call: 'happyChildren([5, 10, 20], [9, 1, 100, 30])', expected: 3 },
      { call: 'happyChildren([2, 2, 2], [2, 2])', expected: 2 },
      { call: '(() => { const appetites = [3, 1, 2]; const snacks = [2, 3, 1]; happyChildren(appetites, snacks); return [appetites, snacks]; })()', expected: [[3, 1, 2], [2, 3, 1]] },
    ],
  },

  /* ── recursion ─────────────────────────────────────────────────────── */
  'alg-easy2-greatest-common-divisor': {
    solution: `const gcd = (a, b) => {
  // Base case: nothing left to divide by, so a is the answer.
  if (b === 0) return a;
  // a % b is smaller than b, so each call moves closer to the base case.
  return gcd(b, a % b);
};`,
    junior: `const gcd = (a, b) => {
  if (b === 0) {
    return a;
  }
  const remainder = a % b;
  return gcd(b, remainder);
};`,
    senior: `const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));`,
    hiddenTests: [
      { call: 'gcd(0, 9)', expected: 9 },
      { call: 'gcd(1071, 462)', expected: 21 },
      { call: 'gcd(270, 192)', expected: 6 },
      { call: 'gcd(12, 12)', expected: 12 },
    ],
  },
  'alg-easy2-fibonacci-memo': {
    solution: `const fib = (n, memo = new Map()) => {
  if (n < 2) return n;
  // Each n is worked out once; every later call reads the stored answer.
  if (memo.has(n)) return memo.get(n);
  const answer = fib(n - 1, memo) + fib(n - 2, memo);
  memo.set(n, answer);
  return answer;
};`,
    junior: `const fib = (n, memo = new Map()) => {
  if (n === 0) {
    return 0;
  }
  if (n === 1) {
    return 1;
  }
  if (memo.has(n)) {
    return memo.get(n);
  }
  const previous = fib(n - 1, memo);
  const beforeThat = fib(n - 2, memo);
  memo.set(n, previous + beforeThat);
  return memo.get(n);
};`,
    senior: `const fib = (n, memo = new Map()) => {
  if (n < 2) return n;
  if (!memo.has(n)) memo.set(n, fib(n - 1, memo) + fib(n - 2, memo));
  return memo.get(n);
};`,
    hiddenTests: [
      { call: 'fib(70)', expected: 190392490709135 },
      { call: 'fib(78)', expected: 8944394323791464 },
      { call: 'fib(2)', expected: 1 },
      { call: '(() => { const memo = new Map([[5, 100]]); return fib(6, memo); })()', expected: 103 },
    ],
  },
  'alg-easy2-binary-strings': {
    solution: `const binaryStrings = n => {
  // One string has length 0: the empty string.
  if (n === 0) return [""];
  const shorter = binaryStrings(n - 1);
  // The "0" strings first keeps the list in counting order.
  return [...shorter.map((rest) => "0" + rest), ...shorter.map((rest) => "1" + rest)];
};`,
    junior: `const binaryStrings = n => {
  if (n === 0) {
    return [""];
  }
  const shorter = binaryStrings(n - 1);
  const result = [];
  for (let i = 0; i < shorter.length; i++) {
    result.push("0" + shorter[i]);
  }
  for (let i = 0; i < shorter.length; i++) {
    result.push("1" + shorter[i]);
  }
  return result;
};`,
    senior: `const binaryStrings = (n, prefix = "") =>
  prefix.length === n
    ? [prefix]
    : [...binaryStrings(n, prefix + "0"), ...binaryStrings(n, prefix + "1")];`,
    hiddenTests: [
      { call: 'binaryStrings(4)', expected: ['0000', '0001', '0010', '0011', '0100', '0101', '0110', '0111', '1000', '1001', '1010', '1011', '1100', '1101', '1110', '1111'] },
      { call: 'binaryStrings(5)[21]', expected: '10101' },
      { call: 'binaryStrings(10).length', expected: 1024 },
      { call: 'binaryStrings(6).every(text => text.length === 6 && /^[01]+$/.test(text))', expected: true },
    ],
  },
  'alg-easy2-mirror-tree': {
    solution: `const mirror = root => {
  // An empty subtree mirrors to an empty subtree; this ends each branch.
  if (root === null) return null;
  // A new node, so the caller's tree stays as it was.
  return {
    value: root.value,
    left: mirror(root.right),
    right: mirror(root.left),
  };
};`,
    junior: `const mirror = root => {
  if (root === null) {
    return null;
  }
  const newLeft = mirror(root.right);
  const newRight = mirror(root.left);
  const copy = { value: root.value, left: newLeft, right: newRight };
  return copy;
};`,
    senior: `const mirror = (root) =>
  root && { value: root.value, left: mirror(root.right), right: mirror(root.left) };`,
    hiddenTests: [
      { call: withTree('(() => { const original = node(1, node(2, node(4)), node(3)); mirror(original); return original; })()'), expected: tree(1, tree(2, tree(4)), tree(3)) },
      { call: withTree('(() => { const original = node(1, node(2), node(3)); const copy = mirror(original); return copy !== original && copy.left !== original.right && copy.right !== original.left; })()'), expected: true },
      { call: withTree('mirror(mirror(node(8, node(3, null, node(6)), node(10, node(9)))))'), expected: tree(8, tree(3, null, tree(6)), tree(10, tree(9))) },
      { call: withTree('mirror(node(0, node(0)))'), expected: tree(0, null, tree(0)) },
    ],
  },
  'alg-easy2-path-sum': {
    solution: `const hasPathSum = (root, target) => {
  if (root === null) return false;
  const rest = target - root.value;
  // Decide at a leaf; a null child would end a path halfway down.
  if (root.left === null && root.right === null) return rest === 0;
  return hasPathSum(root.left, rest) || hasPathSum(root.right, rest);
};`,
    junior: `const hasPathSum = (root, target) => {
  if (root === null) {
    return false;
  }
  const isLeaf = root.left === null && root.right === null;
  if (isLeaf) {
    return root.value === target;
  }
  const rest = target - root.value;
  if (hasPathSum(root.left, rest)) {
    return true;
  }
  if (hasPathSum(root.right, rest)) {
    return true;
  }
  return false;
};`,
    senior: `const hasPathSum = (root, target) => {
  if (!root) return false;
  const rest = target - root.value;
  return !root.left && !root.right
    ? rest === 0
    : hasPathSum(root.left, rest) || hasPathSum(root.right, rest);
};`,
    hiddenTests: [
      { call: withTree('hasPathSum(node(-2, null, node(-3)), -5)'), expected: true },
      { call: withTree('hasPathSum(node(7), 7)'), expected: true },
      { call: withTree('hasPathSum(node(1, node(2), node(3)), 6)'), expected: false },
      { call: withTree('hasPathSum(node(1, node(2), node(3)), 4)'), expected: true },
      { call: withTree('hasPathSum(node(0, node(1), node(1)), 1)'), expected: true },
    ],
  },
};
