// Server-only reference solutions and hidden tests for lib/coding/tasks/algorithms.ts.
// Never import from client code. Hidden tests target the obvious shortcut: a
// hard-coded return, mutating an input the prompt protects, a built-in the task
// asks the learner to write by hand, or a value the visible tests never used.
//
// Each task carries three: `solution` is the reference a learner can give up
// to, `junior` is the same answer written the long way, and `senior` is the
// one an experienced engineer would leave in a review. All three are proven
// against the visible and hidden checks by the content contract.

import type { CodingSolution } from '../types';

export const ALGORITHM_SOLUTIONS: Record<string, CodingSolution> = {
  'alg-two-sum': {
    solution: `const twoSum = (numbers, target) => {
  const seen = new Map();
  for (let index = 0; index < numbers.length; index += 1) {
    const partner = target - numbers[index];
    if (seen.has(partner)) return [seen.get(partner), index];
    seen.set(numbers[index], index);
  }
  return [];
};`,
    junior: `const twoSum = (numbers, target) => {
  for (let left = 0; left < numbers.length; left += 1) {
    for (let right = left + 1; right < numbers.length; right += 1) {
      const total = numbers[left] + numbers[right];
      if (total === target) {
        return [left, right];
      }
    }
  }
  return [];
};`,
    senior: `const twoSum = (numbers, target) => {
  // Value -> index, written only after the lookup so a value never pairs with itself.
  const seen = new Map();
  for (const [index, value] of numbers.entries()) {
    const partner = seen.get(target - value);
    if (partner !== undefined) return [partner, index];
    seen.set(value, index);
  }
  return [];
};`,
    hiddenTests: [
      { call: 'twoSum([-3, 4, 3, 90], 0)', expected: [0, 2] },
      { call: 'twoSum([5], 5)', expected: [] },
      { call: 'twoSum([1, -1], 0)', expected: [0, 1] },
      { call: 'twoSum([1, 5, 1], 2)', expected: [0, 2] },
    ],
  },

  'alg-group-anagrams': {
    solution: `const groupAnagrams = words => {
  const groups = new Map();
  for (const word of words) {
    const key = [...word].sort().join("");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
};`,
    junior: `const groupAnagrams = words => {
  const groups = new Map();
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const letters = word.split("");
    letters.sort();
    const key = letters.join("");
    const existing = groups.get(key);
    if (existing === undefined) {
      groups.set(key, [word]);
    } else {
      existing.push(word);
    }
  }
  const result = [];
  groups.forEach(group => result.push(group));
  return result;
};`,
    senior: `const groupAnagrams = words => {
  // A Map keeps insertion order, so the groups come out in first-seen order
  // and each group in input order without any extra bookkeeping.
  const key = word => [...word].sort().join("");
  const groups = words.reduce((acc, word) => acc.set(key(word), [...(acc.get(key(word)) ?? []), word]), new Map());
  return [...groups.values()];
};`,
    hiddenTests: [
      { call: 'groupAnagrams(["listen", "silent", "enlist", "google", "gooegl"])', expected: [['listen', 'silent', 'enlist'], ['google', 'gooegl']] },
      { call: 'groupAnagrams(["ab", "ba", "abc"])', expected: [['ab', 'ba'], ['abc']] },
      { call: 'groupAnagrams(["zz"])', expected: [['zz']] },
    ],
  },

  'alg-first-unique-char': {
    solution: `const firstUniqueChar = text => {
  const counts = new Map();
  for (const character of text) counts.set(character, (counts.get(character) ?? 0) + 1);
  for (const character of text) if (counts.get(character) === 1) return character;
  return null;
};`,
    junior: `const firstUniqueChar = text => {
  const counts = {};
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (counts[character] === undefined) {
      counts[character] = 1;
    } else {
      counts[character] = counts[character] + 1;
    }
  }
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (counts[character] === 1) {
      return character;
    }
  }
  return null;
};`,
    senior: `const firstUniqueChar = text => {
  const counts = new Map();
  for (const character of text) counts.set(character, (counts.get(character) ?? 0) + 1);
  // find gives undefined when nothing is unique; the prompt asks for null.
  return [...text].find(character => counts.get(character) === 1) ?? null;
};`,
    hiddenTests: [
      { call: 'firstUniqueChar("loveleetcode")', expected: 'v' },
      { call: 'firstUniqueChar("x")', expected: 'x' },
      { call: 'firstUniqueChar("aa b")', expected: ' ' },
      { call: 'firstUniqueChar("aabbcc")', expected: null },
    ],
  },

  'alg-top-k-frequent': {
    solution: `const topKFrequent = (numbers, k) => {
  if (!(k > 0)) return [];
  const counts = new Map();
  for (const value of numbers) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, k)
    .map(entry => entry[0]);
};`,
    junior: `const topKFrequent = (numbers, k) => {
  if (k <= 0) {
    return [];
  }
  const counts = new Map();
  for (let index = 0; index < numbers.length; index += 1) {
    const value = numbers[index];
    const seenSoFar = counts.get(value);
    counts.set(value, seenSoFar === undefined ? 1 : seenSoFar + 1);
  }
  const pairs = [];
  counts.forEach((count, value) => pairs.push({ value, count }));
  pairs.sort((left, right) => right.count - left.count);
  const result = [];
  for (let index = 0; index < pairs.length && index < k; index += 1) {
    result.push(pairs[index].value);
  }
  return result;
};`,
    senior: `const topKFrequent = (numbers, k) => {
  if (!(k > 0)) return [];
  const counts = new Map();
  for (const value of numbers) counts.set(value, (counts.get(value) ?? 0) + 1);
  // Bucket by count instead of sorting: O(n), and walking the buckets from the
  // top down keeps ties in the Map's first-seen order.
  const buckets = [];
  for (const [value, count] of counts) {
    if (!buckets[count]) buckets[count] = [];
    buckets[count].push(value);
  }
  const result = [];
  for (let count = buckets.length - 1; count > 0 && result.length < k; count -= 1) {
    for (const value of buckets[count] ?? []) {
      if (result.length < k) result.push(value);
    }
  }
  return result;
};`,
    hiddenTests: [
      { call: 'topKFrequent([1], 1)', expected: [1] },
      { call: 'topKFrequent([5, 5, 4, 4, 3, 3], 3)', expected: [5, 4, 3] },
      { call: 'topKFrequent([0, -1, -1], 2)', expected: [-1, 0] },
      { call: 'topKFrequent([2, 2, 2], 1)', expected: [2] },
    ],
  },

  'alg-longest-consecutive': {
    solution: `const longestConsecutive = numbers => {
  const values = new Set(numbers);
  let longest = 0;
  for (const value of values) {
    if (values.has(value - 1)) continue;
    let length = 1;
    while (values.has(value + length)) length += 1;
    if (length > longest) longest = length;
  }
  return longest;
};`,
    junior: `const longestConsecutive = numbers => {
  const values = new Set();
  for (let index = 0; index < numbers.length; index += 1) {
    values.add(numbers[index]);
  }
  const unique = Array.from(values);
  let longest = 0;
  for (let index = 0; index < unique.length; index += 1) {
    const value = unique[index];
    const hasPredecessor = values.has(value - 1);
    if (hasPredecessor === false) {
      let current = value;
      let length = 1;
      while (values.has(current + 1)) {
        current = current + 1;
        length = length + 1;
      }
      if (length > longest) {
        longest = length;
      }
    }
  }
  return longest;
};`,
    senior: `const longestConsecutive = numbers => {
  const values = new Set(numbers);
  // Only a value with no predecessor starts a run, so every run is walked once
  // and the whole scan stays linear despite the inner loop.
  const runFrom = start => {
    let length = 1;
    while (values.has(start + length)) length += 1;
    return length;
  };
  return [...values].reduce((longest, value) => (values.has(value - 1) ? longest : Math.max(longest, runFrom(value))), 0);
};`,
    hiddenTests: [
      { call: 'longestConsecutive([1, 2, 0, 1])', expected: 3 },
      { call: 'longestConsecutive([9])', expected: 1 },
      { call: 'longestConsecutive([4, 2, 1, 6, 5])', expected: 3 },
      { call: 'longestConsecutive([1, 3, 5, 2, 4])', expected: 5 },
    ],
  },

  'alg-valid-palindrome': {
    solution: `const isPalindrome = text => {
  const keep = /[a-z0-9]/i;
  let left = 0;
  let right = text.length - 1;
  while (left < right) {
    if (!keep.test(text[left])) { left += 1; continue; }
    if (!keep.test(text[right])) { right -= 1; continue; }
    if (text[left].toLowerCase() !== text[right].toLowerCase()) return false;
    left += 1;
    right -= 1;
  }
  return true;
};`,
    junior: `const isPalindrome = text => {
  const lower = text.toLowerCase();
  const letters = [];
  for (let index = 0; index < lower.length; index += 1) {
    const character = lower[index];
    const isLetter = character >= "a" && character <= "z";
    const isDigit = character >= "0" && character <= "9";
    if (isLetter || isDigit) {
      letters.push(character);
    }
  }
  const reversed = letters.slice().reverse();
  for (let index = 0; index < letters.length; index += 1) {
    if (letters[index] !== reversed[index]) {
      return false;
    }
  }
  return true;
};`,
    senior: `const isPalindrome = text => {
  // Cleaning first costs O(n) space but reads plainly; the two-pointer walk in
  // the reference is the O(1)-space version of exactly this comparison.
  const cleaned = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned === [...cleaned].reverse().join("");
};`,
    hiddenTests: [
      { call: 'isPalindrome("a")', expected: true },
      { call: 'isPalindrome("ab")', expected: false },
      { call: 'isPalindrome("12 21")', expected: true },
      { call: 'isPalindrome("Madam, I\'m Adam")', expected: true },
      { call: 'isPalindrome("1a2")', expected: false },
    ],
  },

  'alg-reverse-words': {
    solution: `const reverseWords = text => text.trim().split(/\\s+/).reverse().join(" ");`,
    junior: `const reverseWords = text => {
  const pieces = text.split(/\\s+/);
  const words = [];
  for (let index = 0; index < pieces.length; index += 1) {
    if (pieces[index] !== "") {
      words.push(pieces[index]);
    }
  }
  const reversed = [];
  for (let index = words.length - 1; index >= 0; index -= 1) {
    reversed.push(words[index]);
  }
  return reversed.join(" ");
};`,
    senior: `const reverseWords = text =>
  // filter(Boolean) drops the empty pieces a run of spaces leaves behind, so
  // no trim is needed and a whitespace-only string falls out as "".
  text.split(/\\s+/).filter(Boolean).reverse().join(" ");`,
    hiddenTests: [
      { call: 'reverseWords("a good   example")', expected: 'example good a' },
      { call: 'reverseWords("  x  ")', expected: 'x' },
      { call: 'reverseWords("one two three four")', expected: 'four three two one' },
    ],
  },

  'alg-chunk-array': {
    solution: `const chunk = (items, size) => {
  if (!Number.isInteger(size) || size < 1) return [];
  const pieces = [];
  for (let start = 0; start < items.length; start += size) {
    pieces.push(items.slice(start, start + size));
  }
  return pieces;
};`,
    junior: `const chunk = (items, size) => {
  if (Number.isInteger(size) === false || size < 1) {
    return [];
  }
  const pieces = [];
  let current = [];
  for (let index = 0; index < items.length; index += 1) {
    current.push(items[index]);
    if (current.length === size) {
      pieces.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    pieces.push(current);
  }
  return pieces;
};`,
    senior: `const chunk = (items, size) =>
  // slice clamps the final piece to the end of the array, so the short last
  // chunk needs no special case.
  Number.isInteger(size) && size > 0
    ? Array.from({ length: Math.ceil(items.length / size) }, (_, piece) => items.slice(piece * size, piece * size + size))
    : [];`,
    hiddenTests: [
      { call: 'chunk([1, 2, 3], -1)', expected: [] },
      { call: 'chunk([1, 2, 3], 1.5)', expected: [] },
      { call: 'chunk(["a", "b", "c"], 2)', expected: [['a', 'b'], ['c']] },
      { call: '(() => { const source = [1, 2, 3]; chunk(source, 2); return source; })()', expected: [1, 2, 3] },
    ],
  },

  'alg-merge-sorted': {
    solution: `const mergeSorted = (a, b) => {
  const merged = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) { merged.push(a[i]); i += 1; }
    else { merged.push(b[j]); j += 1; }
  }
  while (i < a.length) { merged.push(a[i]); i += 1; }
  while (j < b.length) { merged.push(b[j]); j += 1; }
  return merged;
};`,
    junior: `const mergeSorted = (a, b) => {
  const merged = [];
  let indexA = 0;
  let indexB = 0;
  while (indexA < a.length && indexB < b.length) {
    const left = a[indexA];
    const right = b[indexB];
    if (left <= right) {
      merged.push(left);
      indexA = indexA + 1;
    } else {
      merged.push(right);
      indexB = indexB + 1;
    }
  }
  for (let index = indexA; index < a.length; index += 1) {
    merged.push(a[index]);
  }
  for (let index = indexB; index < b.length; index += 1) {
    merged.push(b[index]);
  }
  return merged;
};`,
    senior: `const mergeSorted = (a, b) => {
  const merged = [];
  let i = 0;
  let j = 0;
  // One loop over the combined length: whichever side is spent loses its
  // comparison and the other drains, so no tail loop is needed.
  while (i < a.length || j < b.length) {
    const takeLeft = j >= b.length || (i < a.length && a[i] <= b[j]);
    merged.push(takeLeft ? a[i++] : b[j++]);
  }
  return merged;
};`,
    hiddenTests: [
      { call: 'mergeSorted([5], [])', expected: [5] },
      { call: 'mergeSorted([1, 4, 7], [2, 3, 8, 9])', expected: [1, 2, 3, 4, 7, 8, 9] },
      { call: '(() => { const left = [1, 3]; const right = [2]; mergeSorted(left, right); return [left, right]; })()', expected: [[1, 3], [2]] },
    ],
  },
  'alg-rotate-array': {
    solution: `const rotate = (numbers, k) => {
  const length = numbers.length;
  if (length === 0) return numbers;
  const steps = ((k % length) + length) % length;
  const reverse = (from, to) => {
    while (from < to) {
      const hold = numbers[from];
      numbers[from] = numbers[to];
      numbers[to] = hold;
      from += 1;
      to -= 1;
    }
  };
  reverse(0, length - 1);
  reverse(0, steps - 1);
  reverse(steps, length - 1);
  return numbers;
};`,
    junior: `const rotate = (numbers, k) => {
  const length = numbers.length;
  if (length === 0) {
    return numbers;
  }
  const steps = ((k % length) + length) % length;
  const rotated = [];
  for (let index = 0; index < length; index += 1) {
    const source = (index - steps + length) % length;
    rotated.push(numbers[source]);
  }
  for (let index = 0; index < length; index += 1) {
    numbers[index] = rotated[index];
  }
  return numbers;
};`,
    senior: `const rotate = (numbers, k) => {
  const length = numbers.length;
  if (length === 0) return numbers;
  const steps = ((k % length) + length) % length;
  // splice lifts the tail out in place; unshift puts it back at the front.
  numbers.unshift(...numbers.splice(length - steps, steps));
  return numbers;
};`,
    hiddenTests: [
      { call: '(() => { const values = [1, 2, 3, 4, 5, 6, 7]; rotate(values, 3); return values; })()', expected: [5, 6, 7, 1, 2, 3, 4] },
      { call: '(() => { const values = [9]; rotate(values, 5); return values; })()', expected: [9] },
      { call: '(() => { const values = [1, 2, 3]; return rotate(values, 1) === values; })()', expected: true },
      { call: '(() => { const values = [1, 2, 3, 4]; rotate(values, 6); return values; })()', expected: [3, 4, 1, 2] },
    ],
  },

  'alg-missing-number': {
    solution: `const missingNumber = numbers => {
  const n = numbers.length;
  const expected = (n * (n + 1)) / 2;
  let actual = 0;
  for (const value of numbers) actual += value;
  return expected - actual;
};`,
    junior: `const missingNumber = numbers => {
  const n = numbers.length;
  let expected = 0;
  for (let value = 0; value <= n; value += 1) {
    expected = expected + value;
  }
  let actual = 0;
  for (let index = 0; index < numbers.length; index += 1) {
    actual = actual + numbers[index];
  }
  return expected - actual;
};`,
    senior: `const missingNumber = numbers =>
  // Start at n (the value no index can contribute) and fold index minus value:
  // one pass, no separate sums, nothing that can overflow before the subtraction.
  numbers.reduce((missing, value, index) => missing + index - value, numbers.length);`,
    hiddenTests: [
      { call: 'missingNumber([0, 2])', expected: 1 },
      { call: 'missingNumber([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])', expected: 0 },
      { call: 'missingNumber([0, 1, 2, 3, 5])', expected: 4 },
      { call: 'missingNumber([2, 0])', expected: 1 },
    ],
  },

  'alg-longest-unique-substring': {
    solution: `const lengthOfLongestSubstring = text => {
  const lastSeen = new Map();
  let start = 0;
  let longest = 0;
  for (let end = 0; end < text.length; end += 1) {
    const character = text[end];
    const seenAt = lastSeen.get(character);
    if (seenAt !== undefined && seenAt >= start) start = seenAt + 1;
    lastSeen.set(character, end);
    const width = end - start + 1;
    if (width > longest) longest = width;
  }
  return longest;
};`,
    junior: `const lengthOfLongestSubstring = text => {
  const window = new Set();
  let start = 0;
  let longest = 0;
  for (let end = 0; end < text.length; end += 1) {
    const character = text[end];
    while (window.has(character)) {
      window.delete(text[start]);
      start = start + 1;
    }
    window.add(character);
    const width = end - start + 1;
    if (width > longest) {
      longest = width;
    }
  }
  return longest;
};`,
    senior: `const lengthOfLongestSubstring = text => {
  const lastSeen = new Map();
  let start = 0;
  let longest = 0;
  for (const [end, character] of [...text].entries()) {
    // Math.max is the guard: the window start must never slide backwards.
    start = Math.max(start, (lastSeen.get(character) ?? -1) + 1);
    lastSeen.set(character, end);
    longest = Math.max(longest, end - start + 1);
  }
  return longest;
};`,
    hiddenTests: [
      { call: 'lengthOfLongestSubstring("dvdf")', expected: 3 },
      { call: 'lengthOfLongestSubstring("x")', expected: 1 },
      { call: 'lengthOfLongestSubstring("abcdefg")', expected: 7 },
      { call: 'lengthOfLongestSubstring("tmmzuxt")', expected: 5 },
    ],
  },

  'alg-max-sum-subarray': {
    solution: `const maxSumSubarray = (numbers, k) => {
  if (!Number.isInteger(k) || k < 1 || numbers.length < k) return null;
  let windowSum = 0;
  for (let index = 0; index < k; index += 1) windowSum += numbers[index];
  let best = windowSum;
  for (let end = k; end < numbers.length; end += 1) {
    windowSum += numbers[end] - numbers[end - k];
    if (windowSum > best) best = windowSum;
  }
  return best;
};`,
    junior: `const maxSumSubarray = (numbers, k) => {
  if (Number.isInteger(k) === false || k < 1 || numbers.length < k) {
    return null;
  }
  let best = null;
  for (let start = 0; start + k <= numbers.length; start += 1) {
    let total = 0;
    for (let offset = 0; offset < k; offset += 1) {
      total = total + numbers[start + offset];
    }
    if (best === null || total > best) {
      best = total;
    }
  }
  return best;
};`,
    senior: `const maxSumSubarray = (numbers, k) => {
  if (!Number.isInteger(k) || k < 1 || numbers.length < k) return null;
  // Seed the best with the first window, never with 0 — an all-negative array
  // has a negative answer and 0 is not one of its windows.
  let windowSum = numbers.slice(0, k).reduce((total, value) => total + value, 0);
  let best = windowSum;
  for (let end = k; end < numbers.length; end += 1) {
    windowSum += numbers[end] - numbers[end - k];
    best = Math.max(best, windowSum);
  }
  return best;
};`,
    hiddenTests: [
      { call: 'maxSumSubarray([5], 1)', expected: 5 },
      { call: 'maxSumSubarray([1, 1, 1, 1], 2)', expected: 2 },
      { call: 'maxSumSubarray([4, -1, 2, 1], 2)', expected: 3 },
      { call: 'maxSumSubarray([1, 2, 3], -2)', expected: null },
      { call: 'maxSumSubarray([-5, -1, -9], 1)', expected: -1 },
    ],
  },

  'alg-container-with-most-water': {
    solution: `const maxArea = heights => {
  let left = 0;
  let right = heights.length - 1;
  let best = 0;
  while (left < right) {
    const area = (right - left) * Math.min(heights[left], heights[right]);
    if (area > best) best = area;
    if (heights[left] < heights[right]) left += 1;
    else right -= 1;
  }
  return best;
};`,
    junior: `const maxArea = heights => {
  let best = 0;
  for (let left = 0; left < heights.length; left += 1) {
    for (let right = left + 1; right < heights.length; right += 1) {
      const width = right - left;
      const height = Math.min(heights[left], heights[right]);
      const area = width * height;
      if (area > best) {
        best = area;
      }
    }
  }
  return best;
};`,
    senior: `const maxArea = heights => {
  let [left, right, best] = [0, heights.length - 1, 0];
  while (left < right) {
    // The shorter line caps this pair, so it is the only one worth replacing:
    // moving the taller one inwards loses width and can never gain height.
    best = Math.max(best, (right - left) * Math.min(heights[left], heights[right]));
    heights[left] < heights[right] ? (left += 1) : (right -= 1);
  }
  return best;
};`,
    hiddenTests: [
      { call: 'maxArea([2, 3, 4, 5, 18, 17, 6])', expected: 17 },
      { call: 'maxArea([1, 2, 1])', expected: 2 },
      { call: 'maxArea([3, 9, 3, 4, 7, 2, 12, 6])', expected: 45 },
      { call: 'maxArea([0])', expected: 0 },
    ],
  },

  'alg-move-zeroes': {
    solution: `const moveZeroes = numbers => {
  let write = 0;
  for (const value of numbers) {
    if (value !== 0) {
      numbers[write] = value;
      write += 1;
    }
  }
  for (let index = write; index < numbers.length; index += 1) numbers[index] = 0;
  return numbers;
};`,
    junior: `const moveZeroes = numbers => {
  const kept = [];
  let zeroCount = 0;
  for (let index = 0; index < numbers.length; index += 1) {
    if (numbers[index] === 0) {
      zeroCount = zeroCount + 1;
    } else {
      kept.push(numbers[index]);
    }
  }
  for (let index = 0; index < kept.length; index += 1) {
    numbers[index] = kept[index];
  }
  for (let index = 0; index < zeroCount; index += 1) {
    numbers[kept.length + index] = 0;
  }
  return numbers;
};`,
    senior: `const moveZeroes = numbers => {
  let write = 0;
  for (let read = 0; read < numbers.length; read += 1) {
    // Swapping rather than overwriting carries the zeros backwards as it goes,
    // so the second pass that fills them in is not needed.
    if (numbers[read] !== 0) {
      [numbers[write], numbers[read]] = [numbers[read], numbers[write]];
      write += 1;
    }
  }
  return numbers;
};`,
    hiddenTests: [
      { call: '(() => { const values = [4, 0, 5, 0, 0, 6]; moveZeroes(values); return values; })()', expected: [4, 5, 6, 0, 0, 0] },
      { call: '(() => { const values = [0]; return [moveZeroes(values) === values, values]; })()', expected: [true, [0]] },
      { call: '(() => { const values = [0, 0, 1]; moveZeroes(values); return values; })()', expected: [1, 0, 0] },
    ],
  },

  'alg-valid-parentheses': {
    solution: `const isValid = text => {
  const closes = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const character of text) {
    if (character === "(" || character === "[" || character === "{") stack.push(character);
    else if (stack.pop() !== closes[character]) return false;
  }
  return stack.length === 0;
};`,
    junior: `const isValid = text => {
  const stack = [];
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "(" || character === "[" || character === "{") {
      stack.push(character);
    } else {
      const top = stack.pop();
      if (character === ")" && top !== "(") {
        return false;
      }
      if (character === "]" && top !== "[") {
        return false;
      }
      if (character === "}" && top !== "{") {
        return false;
      }
    }
  }
  return stack.length === 0;
};`,
    senior: `const isValid = text => {
  // A closer must match the most recent unclosed opener — the top of the stack.
  // Popping an empty stack gives undefined, which matches no opener, so a lone
  // closer is rejected by the same comparison.
  const closes = new Map([[")", "("], ["]", "["], ["}", "{"]]);
  const stack = [];
  for (const character of text) {
    if (!closes.has(character)) stack.push(character);
    else if (stack.pop() !== closes.get(character)) return false;
  }
  return stack.length === 0;
};`,
    hiddenTests: [
      { call: 'isValid("()[]{}")', expected: true },
      { call: 'isValid("([]")', expected: false },
      { call: 'isValid("]}")', expected: false },
      { call: 'isValid("{[()]}")', expected: true },
      { call: 'isValid("([{}])")', expected: true },
    ],
  },

  'alg-merge-intervals': {
    solution: `const mergeIntervals = intervals => {
  const ordered = [...intervals].sort((left, right) => left[0] - right[0]);
  const merged = [];
  for (const [start, end] of ordered) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
};`,
    junior: `const mergeIntervals = intervals => {
  const ordered = intervals.slice();
  ordered.sort(function (left, right) {
    return left[0] - right[0];
  });
  const merged = [];
  for (let index = 0; index < ordered.length; index += 1) {
    const start = ordered[index][0];
    const end = ordered[index][1];
    if (merged.length === 0) {
      merged.push([start, end]);
    } else {
      const last = merged[merged.length - 1];
      if (start <= last[1]) {
        if (end > last[1]) {
          last[1] = end;
        }
      } else {
        merged.push([start, end]);
      }
    }
  }
  return merged;
};`,
    senior: `const mergeIntervals = intervals =>
  // Sorting a copy matters: sort reorders in place and the caller keeps theirs.
  // Once sorted by start, the next range can only overlap the one being held.
  [...intervals]
    .sort(([a], [b]) => a - b)
    .reduce((merged, [start, end]) => {
      const last = merged[merged.length - 1];
      if (last && start <= last[1]) last[1] = Math.max(last[1], end);
      else merged.push([start, end]);
      return merged;
    }, []);`,
    hiddenTests: [
      { call: 'mergeIntervals([[2, 3], [2, 3]])', expected: [[2, 3]] },
      { call: 'mergeIntervals([[1, 4], [0, 4]])', expected: [[0, 4]] },
      { call: '(() => { const source = [[3, 4], [1, 2]]; mergeIntervals(source); return source; })()', expected: [[3, 4], [1, 2]] },
      { call: 'mergeIntervals([[1, 4], [2, 3]])', expected: [[1, 4]] },
    ],
  },

  'alg-sort-by-keys': {
    solution: `const sortTasks = tasks => [...tasks].sort((left, right) => {
  if (right.priority !== left.priority) return right.priority - left.priority;
  if (left.name < right.name) return -1;
  if (left.name > right.name) return 1;
  return 0;
});`,
    junior: `const sortTasks = tasks => {
  const copy = tasks.slice();
  const compare = function (left, right) {
    if (left.priority > right.priority) {
      return -1;
    }
    if (left.priority < right.priority) {
      return 1;
    }
    if (left.name < right.name) {
      return -1;
    }
    if (left.name > right.name) {
      return 1;
    }
    return 0;
  };
  copy.sort(compare);
  return copy;
};`,
    senior: `const byName = (left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
// The default comparator sorts as text, which orders 100, 10, 2 as 10, 100, 2.
// A zero from the first comparison is what lets the second one speak.
const sortTasks = tasks => [...tasks].sort((left, right) => right.priority - left.priority || byName(left, right));`,
    hiddenTests: [
      { call: 'sortTasks([{ name: "a", priority: 1 }])', expected: [{ name: 'a', priority: 1 }] },
      { call: 'sortTasks([{ name: "b", priority: 0 }, { name: "a", priority: 0 }, { name: "c", priority: 9 }])', expected: [{ name: 'c', priority: 9 }, { name: 'a', priority: 0 }, { name: 'b', priority: 0 }] },
      { call: 'sortTasks([{ name: "x", priority: 2 }, { name: "y", priority: 20 }, { name: "z", priority: 3 }]).map(task => task.priority)', expected: [20, 3, 2] },
    ],
  },
  'alg-deep-flatten': {
    solution: `const deepFlatten = items => {
  const flat = [];
  for (const item of items) {
    if (Array.isArray(item)) flat.push(...deepFlatten(item));
    else flat.push(item);
  }
  return flat;
};`,
    junior: `const deepFlatten = items => {
  let flat = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (Array.isArray(item) === true) {
      const inner = deepFlatten(item);
      flat = flat.concat(inner);
    } else {
      flat.push(item);
    }
  }
  return flat;
};`,
    senior: `const deepFlatten = items =>
  // Array.isArray is the only test that works here: typeof calls an array an
  // object, and a truthiness check would quietly swallow 0, false and null.
  items.reduce((flat, item) => (Array.isArray(item) ? [...flat, ...deepFlatten(item)] : [...flat, item]), []);`,
    hiddenTests: [
      { call: 'deepFlatten([[[[[1]]]]])', expected: [1] },
      { call: 'deepFlatten([1, 2, 3])', expected: [1, 2, 3] },
      { call: 'deepFlatten([[1, [2]], [[3], 4], 5])', expected: [1, 2, 3, 4, 5] },
      { call: 'deepFlatten([undefined, [undefined]])', expected: [undefined, undefined] },
    ],
  },

  'alg-deep-clone': {
    solution: `const deepClone = value => {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(item => deepClone(item));
  const copy = {};
  for (const key of Object.keys(value)) copy[key] = deepClone(value[key]);
  return copy;
};`,
    junior: `const deepClone = value => {
  if (value === null) {
    return null;
  }
  if (typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value) === true) {
    const items = [];
    for (let index = 0; index < value.length; index += 1) {
      items.push(deepClone(value[index]));
    }
    return items;
  }
  const copy = {};
  const keys = Object.keys(value);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    copy[key] = deepClone(value[key]);
  }
  return copy;
};`,
    senior: `const deepClone = value => {
  // typeof null is "object", so the null check has to come first or the
  // recursion walks into it and comes back with {}.
  if (value === null || typeof value !== "object") return value;
  return Array.isArray(value)
    ? value.map(deepClone)
    : Object.fromEntries(Object.entries(value).map(([key, child]) => [key, deepClone(child)]));
};`,
    hiddenTests: [
      { call: '(() => { const source = { x: { y: { z: 1 } } }; const copy = deepClone(source); copy.x.y.z = 2; return [source.x.y.z, copy.x.y.z]; })()', expected: [1, 2] },
      { call: 'deepClone("text")', expected: 'text' },
      { call: '(() => { const source = { list: [1, 2] }; const copy = deepClone(source); return copy.list === source.list; })()', expected: false },
      { call: 'deepClone({ a: null })', expected: { a: null } },
      { call: '(() => { const source = [[1], [2]]; const copy = deepClone(source); copy[0].push(9); return [source[0], copy[0]]; })()', expected: [[1], [1, 9]] },
    ],
  },

  'alg-sum-nested-values': {
    solution: `const sumValues = value => {
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  if (value === null || typeof value !== "object") return 0;
  let total = 0;
  for (const child of Object.values(value)) total += sumValues(child);
  return total;
};`,
    junior: `const sumValues = value => {
  if (typeof value === "number") {
    if (Number.isNaN(value) === true) {
      return 0;
    }
    return value;
  }
  if (value === null) {
    return 0;
  }
  if (typeof value !== "object") {
    return 0;
  }
  let total = 0;
  const children = Object.values(value);
  for (let index = 0; index < children.length; index += 1) {
    total = total + sumValues(children[index]);
  }
  return total;
};`,
    senior: `const sumValues = value => {
  // Number.isNaN, not the global isNaN: the global coerces, so it would call
  // the string "abc" a NaN and never reach the typeof check at all.
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  if (value === null || typeof value !== "object") return 0;
  // Object.values covers arrays and plain objects alike, so there is one case.
  return Object.values(value).reduce((total, child) => total + sumValues(child), 0);
};`,
    hiddenTests: [
      { call: 'sumValues([])', expected: 0 },
      { call: 'sumValues(null)', expected: 0 },
      { call: 'sumValues({ a: { b: { c: { d: 10 } } } })', expected: 10 },
      { call: 'sumValues([1, "2", 3])', expected: 4 },
      { call: 'sumValues({ a: [1, { b: 2 }], c: "x" })', expected: 3 },
    ],
  },

  'alg-bfs-shortest-path': {
    solution: `const shortestPath = (graph, start, goal) => {
  const visited = new Set([start]);
  const queue = [[start]];
  while (queue.length > 0) {
    const route = queue.shift();
    const node = route[route.length - 1];
    if (node === goal) return route;
    for (const neighbour of graph[node] ?? []) {
      if (visited.has(neighbour)) continue;
      visited.add(neighbour);
      queue.push([...route, neighbour]);
    }
  }
  return null;
};`,
    junior: `const shortestPath = (graph, start, goal) => {
  const visited = new Set();
  visited.add(start);
  const queue = [[start]];
  let head = 0;
  while (head < queue.length) {
    const route = queue[head];
    head = head + 1;
    const node = route[route.length - 1];
    if (node === goal) {
      return route;
    }
    const neighbours = graph[node];
    if (neighbours !== undefined) {
      for (let index = 0; index < neighbours.length; index += 1) {
        const neighbour = neighbours[index];
        if (visited.has(neighbour) === false) {
          visited.add(neighbour);
          const longer = route.slice();
          longer.push(neighbour);
          queue.push(longer);
        }
      }
    }
  }
  return null;
};`,
    senior: `const shortestPath = (graph, start, goal) => {
  if (start === goal) return [start];
  // One parent per node instead of a whole route on the queue: O(V) memory
  // rather than O(V) routes. Marking on the way in is what keeps a cycle finite.
  const cameFrom = new Map([[start, null]]);
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    for (const neighbour of graph[queue[head]] ?? []) {
      if (cameFrom.has(neighbour)) continue;
      cameFrom.set(neighbour, queue[head]);
      if (neighbour === goal) {
        const route = [];
        for (let step = goal; step !== null && step !== undefined; step = cameFrom.get(step)) route.unshift(step);
        return route;
      }
      queue.push(neighbour);
    }
  }
  return null;
};`,
    hiddenTests: [
      { call: 'shortestPath({ a: ["a"] }, "a", "a")', expected: ['a'] },
      { call: 'shortestPath({ x: ["y"], y: ["z"], z: ["x"] }, "x", "z")', expected: ['x', 'y', 'z'] },
      { call: 'shortestPath({ a: ["b"] }, "b", "a")', expected: null },
      { call: 'shortestPath({ a: ["b", "c"], b: ["e"], c: ["d"], d: ["e"], e: [] }, "a", "e")', expected: ['a', 'b', 'e'] },
    ],
  },

  'alg-level-order': {
    solution: `const levelOrder = root => {
  if (!root) return [];
  const levels = [];
  const queue = [root];
  while (queue.length > 0) {
    const width = queue.length;
    const values = [];
    for (let taken = 0; taken < width; taken += 1) {
      const node = queue.shift();
      values.push(node.value);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    levels.push(values);
  }
  return levels;
};`,
    junior: `const levelOrder = root => {
  if (root === null || root === undefined) {
    return [];
  }
  const levels = [];
  let current = [root];
  while (current.length > 0) {
    const values = [];
    const next = [];
    for (let index = 0; index < current.length; index += 1) {
      const node = current[index];
      values.push(node.value);
      if (node.left !== null && node.left !== undefined) {
        next.push(node.left);
      }
      if (node.right !== null && node.right !== undefined) {
        next.push(node.right);
      }
    }
    levels.push(values);
    current = next;
  }
  return levels;
};`,
    senior: `const levelOrder = root => {
  const levels = [];
  // Hold one whole level at a time. The next level is every child of this one,
  // which answers "where does the level end?" without counting the queue.
  let level = root ? [root] : [];
  while (level.length > 0) {
    levels.push(level.map(node => node.value));
    level = level.reduce((children, node) => {
      if (node.left) children.push(node.left);
      if (node.right) children.push(node.right);
      return children;
    }, []);
  }
  return levels;
};`,
    hiddenTests: [
      { call: 'levelOrder(undefined)', expected: [] },
      { call: '(() => { const node = (value, left = null, right = null) => ({ value, left, right }); return levelOrder(node(1, node(2, node(4), node(5)), node(3, null, node(6)))); })()', expected: [[1], [2, 3], [4, 5, 6]] },
      { call: '(() => { const node = (value, left = null, right = null) => ({ value, left, right }); return levelOrder(node(0, node(-1), node(-2))); })()', expected: [[0], [-1, -2]] },
    ],
  },

  'alg-promise-pool': {
    solution: `const promisePool = async (tasks, limit) => {
  const results = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
    }
  };
  const workers = [];
  for (let count = 0; count < Math.min(limit, tasks.length); count += 1) workers.push(worker());
  await Promise.all(workers);
  return results;
};`,
    junior: `const promisePool = async (tasks, limit) => {
  const results = [];
  const size = limit < 1 ? 1 : limit;
  for (let start = 0; start < tasks.length; start += size) {
    const batch = [];
    for (let offset = 0; offset < size && start + offset < tasks.length; offset += 1) {
      batch.push(tasks[start + offset]());
    }
    const settled = await Promise.all(batch);
    for (let index = 0; index < settled.length; index += 1) {
      results.push(settled[index]);
    }
  }
  return results;
};`,
    senior: `const promisePool = async (tasks, limit) => {
  const results = new Array(tasks.length);
  // One shared iterator: every worker pulls the next unclaimed task from it, so
  // no two ever take the same one and a freed slot refills immediately —
  // unlike fixed batches, which idle until the slowest task in a batch lands.
  const pending = tasks.entries();
  const worker = async () => {
    for (const [index, task] of pending) results[index] = await task();
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
};`,
    hiddenTests: [
      { call: '(async () => { const wait = ms => new Promise(done => setTimeout(done, ms)); const tasks = [0, 1, 2, 3].map(i => async () => { await wait(20 - i * 5); return i; }); return promisePool(tasks, 2); })()', expected: [0, 1, 2, 3] },
      { call: '(async () => { let running = 0; let peak = 0; const wait = ms => new Promise(done => setTimeout(done, ms)); const tasks = Array.from({ length: 6 }, () => async () => { running += 1; if (running > peak) peak = running; await wait(5); running -= 1; return 1; }); await promisePool(tasks, 3); return peak; })()', expected: 3 },
      { call: 'promisePool([() => Promise.resolve(1)], 1)', expected: [1] },
      { call: '(async () => { const results = await promisePool([() => Promise.resolve("a"), () => Promise.resolve("b"), () => Promise.resolve("c")], 2); return results.join(""); })()', expected: 'abc' },
    ],
  },

  'alg-retry-backoff': {
    solution: `const retryWithBackoff = async (fn, attempts) => {
  const wait = ms => new Promise(done => setTimeout(done, ms));
  let lastError = new Error("no attempts were made");
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await wait(100 * Math.pow(2, attempt - 1));
    try {
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};`,
    junior: `const retryWithBackoff = (fn, attempts) => {
  const wait = ms => new Promise(done => setTimeout(done, ms));
  return new Promise(function (resolve, reject) {
    let attempt = 0;
    let delay = 100;
    const tryOnce = function () {
      if (attempt >= attempts) {
        reject(new Error("no attempts were made"));
        return;
      }
      attempt = attempt + 1;
      fn().then(resolve, function (error) {
        if (attempt >= attempts) {
          reject(error);
          return;
        }
        const thisDelay = delay;
        delay = delay * 2;
        wait(thisDelay).then(tryOnce);
      });
    };
    tryOnce();
  });
};`,
    senior: `const retryWithBackoff = async (fn, attempts) => {
  const wait = ms => new Promise(done => setTimeout(done, ms));
  // The delay before attempt i (counting from one) is 100 × 2^(i-1): nothing
  // before the first, and nothing after the last failure either — waiting to
  // announce a defeat you have already suffered helps no caller.
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await wait(100 * 2 ** (attempt - 1));
    }
  }
  throw new Error("retryWithBackoff needs at least one attempt");
};`,
    hiddenTests: [
      { call: '(() => { let runs = 0; return retryWithBackoff(async () => { runs += 1; if (runs < 2) throw new Error("once"); return runs; }, 4); })()', expected: 2 },
      { call: '(async () => { const started = Date.now(); let runs = 0; await retryWithBackoff(async () => { runs += 1; if (runs < 2) throw new Error("once"); return runs; }, 4); const elapsed = Date.now() - started; return elapsed >= 80 && elapsed < 250; })()', expected: true },
      { call: '(async () => { const started = Date.now(); await retryWithBackoff(async () => { throw new Error("down"); }, 2).catch(() => "failed"); const elapsed = Date.now() - started; return elapsed >= 80 && elapsed < 250; })()', expected: true },
      { call: 'retryWithBackoff(async () => 0, 1)', expected: 0 },
    ],
  },
};
