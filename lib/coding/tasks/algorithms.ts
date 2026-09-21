// The Algorithms track: JavaScript challenges for an algorithm-focused
// live-coding interview, authored for devShark. Twenty-five problems in one arc
// — hash maps and sets, strings and arrays, two pointers and sliding windows,
// stacks and sorting, recursion and traversal, and two async problems of the
// shape a crawling and scraping team actually asks about.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.
// English is the source of truth; Czech copy lives in algorithms.cs.ts.
//
// These are practice rather than a curriculum: the track carries no Learn
// level of its own and no tier gate, so every challenge is open from the start.
//
// Every prompt ends with the cost the interviewer is listening for, because
// "it works" and "it works in linear time" are different answers.

import type { CodingTaskSource } from '../types';

export const ALGORITHM_TASKS: CodingTaskSource[] = [
  /* ── hash maps and sets ───────────────────────────────────────────────── */
  {
    id: 'alg-two-sum',
    track: 'algorithms',
    topic: 'algorithms',
    level: 1,
    tier: 2,
    focus: ['map-set', 'objects'],
    title: 'Two sum',
    prompt: 'Write `twoSum(numbers, target)`, returning the indices of the two values that add up to `target`, smaller index first. `twoSum([2, 7, 11, 15], 9)` gives `[0, 1]`; `twoSum([3, 2, 4], 6)` gives `[1, 2]`. An index is never paired with itself, and an array with no such pair — an empty one included — gives `[]`. Target: O(n) time and O(n) space, so one pass that remembers what it has seen rather than two nested loops.',
    starter: `const twoSum = (numbers, target) => {

};

// Scratch pad — change this and press Run.
console.log(twoSum([2, 7, 11, 15], 9));
`,
    skeleton: `const twoSum = (numbers, target) => {
  const seen = new Map(); // value -> index

  for (let index = 0; index < numbers.length; index += 1) {
    // has the partner for this value already gone by?
  }

  return [];
};`,
    hints: ['For each value you only need to ask one question: has the number that completes the target already gone past? A Map from value to index answers it without a second loop.'],
    approach: [
      'Walk the array once, keeping a Map from each value you have passed to the index it sat at.',
      'At every value, work out what its partner would have to be — the target minus this value — and look that partner up in the Map.',
      'A hit means the partner came earlier, so its stored index is the smaller one and goes first.',
      'Only store the current value after the lookup, or a value whose double is the target would match itself.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'twoSum([2, 7, 11, 15], 9)', expected: [0, 1] },
      { call: 'twoSum([3, 2, 4], 6)', expected: [1, 2] },
      { call: 'twoSum([], 5)', expected: [], label: 'empty input', edge: true },
      { call: 'twoSum([1, 2, 3], 100)', expected: [], label: 'no pair adds up', edge: true },
      { call: 'twoSum([3, 3], 6)', expected: [0, 1], label: 'two equal values are a valid pair', edge: true },
      { call: 'twoSum([0, 4, 0], 0)', expected: [0, 2], label: 'zeros pair with each other, not with themselves', edge: true },
    ],
  },
  {
    id: 'alg-group-anagrams',
    track: 'algorithms',
    topic: 'algorithms',
    level: 2,
    tier: 2,
    focus: ['map-set', 'sort', 'strings'],
    title: 'Group anagrams',
    prompt: 'Write `groupAnagrams(words)`, gathering words that are rearrangements of one another. `groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"])` gives `[["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]`. Two words belong together when their sorted letters match, so build that key once per word and use it in a Map. Groups come out in the order their first word appeared and each group keeps its words in input order, so the answer is never ambiguous. An empty list gives `[]`. Target: O(n · k log k) time for n words of length k, and O(n · k) space.',
    starter: `const groupAnagrams = words => {

};

// Scratch pad — change this and press Run.
console.log(groupAnagrams(["eat", "tea", "tan"]));
`,
    skeleton: `const groupAnagrams = words => {
  const groups = new Map(); // sorted letters -> words

  for (const word of words) {
    const key = /* the word's letters in sorted order */;
    // start the group if it is new, then add the word to it
  }

  return [...groups.values()];
};`,
    hints: ['Anagrams differ only in order, so anything that erases order — sorting the letters — turns every member of a group into the same key.'],
    approach: [
      'Split a word into characters, sort them and join them back: every anagram of that word produces the same string.',
      'Keep a Map from that key to the list of words that produced it.',
      'A Map remembers insertion order, so reading its values back gives the groups in the order their first word appeared, and pushing keeps each group in input order.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"])', expected: [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']] },
      { call: 'groupAnagrams(["abc", "cba"])', expected: [['abc', 'cba']] },
      { call: 'groupAnagrams([])', expected: [], label: 'empty input', edge: true },
      { call: 'groupAnagrams([""])', expected: [['']], label: 'the empty word is its own group', edge: true },
      { call: 'groupAnagrams(["a", "b", "a"])', expected: [['a', 'a'], ['b']], label: 'a repeated word joins its own group', edge: true },
    ],
  },
  {
    id: 'alg-first-unique-char',
    track: 'algorithms',
    topic: 'algorithms',
    level: 3,
    tier: 2,
    focus: ['map-set', 'strings'],
    title: 'First non-repeating character',
    prompt: 'Write `firstUniqueChar(text)`, returning the first character that appears exactly once, or `null` when every character repeats. `firstUniqueChar("swiss")` gives `"w"`; `firstUniqueChar("aabb")` gives `null`. Count every character first, then walk the string a second time in order — the first character whose count is one is the answer, and only a second pass can know that. Characters compare exactly, so case and spaces count, and an empty string gives `null`. Target: O(n) time and O(k) space for k distinct characters.',
    starter: `const firstUniqueChar = text => {

};

// Scratch pad — change this and press Run.
console.log(firstUniqueChar("swiss"));
`,
    skeleton: `const firstUniqueChar = text => {
  const counts = new Map(); // character -> how many times it appears

  // first pass: count
  // second pass: the first character counted once

  return null;
};`,
    hints: ['You cannot know a character is unique until you have seen the whole string, so count everything first and only then look for the first count of one.'],
    approach: [
      'Walk the string once and build a Map from each character to how many times it occurs.',
      'Walk the string a second time in its original order and return the first character whose count is one.',
      'Falling out of the second loop means nothing occurred once, which is the null case.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'firstUniqueChar("swiss")', expected: 'w' },
      { call: 'firstUniqueChar("leetcode")', expected: 'l' },
      { call: 'firstUniqueChar("")', expected: null, label: 'empty input', edge: true },
      { call: 'firstUniqueChar("aabb")', expected: null, label: 'every character repeats', edge: true },
      { call: 'firstUniqueChar("aabbc")', expected: 'c', label: 'the only unique character is the last one', edge: true },
      { call: 'firstUniqueChar("Aa")', expected: 'A', label: 'case is not folded', edge: true },
    ],
  },
  {
    id: 'alg-top-k-frequent',
    track: 'algorithms',
    topic: 'algorithms',
    level: 4,
    tier: 3,
    focus: ['map-set', 'sort'],
    title: 'Top K frequent elements',
    prompt: 'Write `topKFrequent(numbers, k)`, returning the `k` most frequent values, most frequent first. `topKFrequent([1, 1, 1, 2, 2, 3], 2)` gives `[1, 2]`. Values that tie on count keep the order in which they first appeared, so there is exactly one right answer. A `k` of zero gives `[]`, a `k` past the number of distinct values gives all of them, and an empty array gives `[]`. Target: O(n log n) time with a count map and a sort — bucketing by count reaches O(n) if you want it.',
    starter: `const topKFrequent = (numbers, k) => {

};

// Scratch pad — change this and press Run.
console.log(topKFrequent([1, 1, 1, 2, 2, 3], 2));
`,
    skeleton: `const topKFrequent = (numbers, k) => {
  const counts = new Map(); // value -> how often it occurs

  // count, then order by count, then take k
  return [];
};`,
    hints: ['A Map keeps its keys in first-seen order, so if your sort is stable the ties come out in the order they first appeared without any extra bookkeeping.'],
    approach: [
      'Build a Map from each value to how many times it appears.',
      'Turn the Map into an array of entries — already in first-seen order — and sort it by count, descending.',
      'JavaScript array sort is stable, so entries with equal counts stay in first-seen order.',
      'Take the first k values, which handles a k of zero and a k past the number of distinct values without a special case.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'topKFrequent([1, 1, 1, 2, 2, 3], 2)', expected: [1, 2] },
      { call: 'topKFrequent([1, 2, 2, 3, 3], 2)', expected: [2, 3] },
      { call: 'topKFrequent([], 3)', expected: [], label: 'empty input', edge: true },
      { call: 'topKFrequent([7, 8], 0)', expected: [], label: 'k of zero asks for nothing', edge: true },
      { call: 'topKFrequent([9, 9], 5)', expected: [9], label: 'k past the distinct count gives all of them', edge: true },
      { call: 'topKFrequent([4, 4, 5, 5, 6], 1)', expected: [4], label: 'a tie is broken by first appearance', edge: true },
    ],
  },
  {
    id: 'alg-longest-consecutive',
    track: 'algorithms',
    topic: 'algorithms',
    level: 5,
    tier: 3,
    focus: ['map-set'],
    title: 'Longest consecutive sequence',
    prompt: 'Write `longestConsecutive(numbers)`, returning the length of the longest run of consecutive whole numbers the array contains, in any order. `longestConsecutive([100, 4, 200, 1, 3, 2])` gives 4, for 1, 2, 3, 4. Sorting would be O(n log n); put the values in a `Set` instead and start counting only from a value whose predecessor is missing, which makes every run walked exactly once. Duplicates count once and an empty array gives 0. Target: O(n) time and O(n) space.',
    starter: `const longestConsecutive = numbers => {

};

// Scratch pad — change this and press Run.
console.log(longestConsecutive([100, 4, 200, 1, 3, 2]));
`,
    skeleton: `const longestConsecutive = numbers => {
  const values = new Set(numbers);
  let longest = 0;

  for (const value of values) {
    // only a value with no predecessor starts a run
  }

  return longest;
};`,
    hints: ['Walking up from every value would re-walk the same run over and over. A value is the start of a run only when the value one below it is absent — check that first, and each run is counted once.'],
    approach: [
      'Put every value in a Set, which removes duplicates and makes membership a constant-time question.',
      'For each value, ask whether the value one below it is in the Set; if it is, this value is in the middle of a run someone else will count.',
      'From a genuine start, count upwards while the next value is present, and keep the longest count you have seen.',
      'The whole scan touches each run once, which is what keeps it linear despite the nested loop.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'longestConsecutive([100, 4, 200, 1, 3, 2])', expected: 4 },
      { call: 'longestConsecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])', expected: 9 },
      { call: 'longestConsecutive([])', expected: 0, label: 'empty input', edge: true },
      { call: 'longestConsecutive([5, 5, 5])', expected: 1, label: 'duplicates count once', edge: true },
      { call: 'longestConsecutive([10, 30, 20])', expected: 1, label: 'no two values are neighbours', edge: true },
      { call: 'longestConsecutive([-2, -1, 0, 1])', expected: 4, label: 'runs cross zero', edge: true },
    ],
  },

  /* ── strings and arrays ───────────────────────────────────────────────── */
  {
    id: 'alg-valid-palindrome',
    track: 'algorithms',
    topic: 'algorithms',
    level: 6,
    tier: 1,
    focus: ['two-pointer', 'strings'],
    title: 'Valid palindrome',
    prompt: 'Write `isPalindrome(text)`, deciding whether the text reads the same both ways once everything that is not a letter or a digit is ignored and case is set aside. `isPalindrome("A man, a plan, a canal: Panama")` gives `true`; `isPalindrome("race a car")` gives `false`. Digits count as content, so `"0P"` is not a palindrome. An empty string, and a string of punctuation alone, both are. Target: O(n) time, and O(1) extra space if you walk a pointer in from each end instead of building a cleaned copy.',
    starter: `const isPalindrome = text => {

};

// Scratch pad — change this and press Run.
console.log(isPalindrome("A man, a plan, a canal: Panama"));
`,
    skeleton: `const isPalindrome = text => {
  let left = 0;
  let right = text.length - 1;

  while (left < right) {
    // skip anything that is not a letter or digit at either end, then compare
  }

  return true;
};`,
    hints: ['Lowercase both characters before comparing, and move each pointer past anything that is not a letter or a digit before you compare at all.'],
    approach: [
      'Start one pointer at each end and move them towards each other.',
      'Before comparing, walk each pointer past any character that is not a letter or a digit — a regular expression test or a character-code check both do it.',
      'Compare the two characters with their case folded; a mismatch settles it immediately.',
      'The pointers meeting means every pair matched, which is also why an empty or punctuation-only string comes out true.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'isPalindrome("A man, a plan, a canal: Panama")', expected: true },
      { call: 'isPalindrome("race a car")', expected: false },
      { call: 'isPalindrome("")', expected: true, label: 'empty input is a palindrome', edge: true },
      { call: 'isPalindrome(".,!")', expected: true, label: 'punctuation alone leaves nothing to compare', edge: true },
      { call: 'isPalindrome("0P")', expected: false, label: 'a digit never matches a letter', edge: true },
      { call: 'isPalindrome("Ab1bA")', expected: true, label: 'mixed case around a digit', edge: true },
    ],
  },
  {
    id: 'alg-reverse-words',
    track: 'algorithms',
    topic: 'algorithms',
    level: 7,
    tier: 2,
    focus: ['strings', 'split', 'join'],
    title: 'Reverse words in a string',
    prompt: 'Write `reverseWords(text)`, returning the words in reverse order separated by exactly one space. `reverseWords("  the sky   is blue ")` gives `"blue is sky the"`. Leading, trailing and repeated spaces all disappear, so splitting on a single space is not enough — trim first and split on runs of whitespace, or filter the empty pieces out. The letters inside a word are not touched, and a string of spaces alone gives `""`. Target: O(n) time and O(n) space.',
    starter: `const reverseWords = text => {

};

// Scratch pad — change this and press Run.
console.log(reverseWords("  the sky   is blue "));
`,
    skeleton: `const reverseWords = text => {
  const words = /* the non-empty words, in order */;

  return words.reverse().join(" ");
};`,
    hints: ['Splitting "a  b" on a single space leaves an empty string between the words. Split on a run of whitespace instead, or drop the empty pieces before joining.'],
    approach: [
      'Trim the ends so a leading or trailing space cannot become an empty word.',
      'Split on one-or-more whitespace characters rather than on a single space, which collapses the runs between words.',
      'Reverse the list of words and join it with a single space.',
      'A string that is only whitespace trims to nothing and gives an empty list, which joins to the empty string.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'reverseWords("  the sky   is blue ")', expected: 'blue is sky the' },
      { call: 'reverseWords("hello world")', expected: 'world hello' },
      { call: 'reverseWords("")', expected: '', label: 'empty input', edge: true },
      { call: 'reverseWords("   ")', expected: '', label: 'whitespace alone holds no words', edge: true },
      { call: 'reverseWords("single")', expected: 'single', label: 'one word comes back unchanged', edge: true },
      { call: 'reverseWords(" a  b ")', expected: 'b a', label: 'padding and a double space at once', edge: true },
    ],
  },
  {
    id: 'alg-chunk-array',
    track: 'algorithms',
    topic: 'algorithms',
    level: 8,
    tier: 1,
    focus: ['slice', 'for'],
    title: 'Chunk an array',
    prompt: 'Write `chunk(items, size)`, splitting the array into consecutive pieces of at most `size` items, in order. `chunk([1, 2, 3, 4, 5], 2)` gives `[[1, 2], [3, 4], [5]]` — the last piece holds whatever is left, so it may be shorter. An empty array gives `[]`, a `size` that is not a positive whole number gives `[]` rather than looping for ever, and the array passed in is never changed. Target: O(n) time and O(n) space.',
    starter: `const chunk = (items, size) => {

};

// Scratch pad — change this and press Run.
console.log(chunk([1, 2, 3, 4, 5], 2));
`,
    skeleton: `const chunk = (items, size) => {
  if (/* size is not a positive whole number */) return [];
  const pieces = [];

  for (let start = 0; start < items.length; start += size) {
    // take the piece that begins here
  }

  return pieces;
};`,
    hints: ['Step the loop by the chunk size rather than by one, and let slice clamp the final piece — it never reads past the end of the array.'],
    approach: [
      'Reject a size that is not a positive whole number before the loop, because stepping by zero or a negative number never terminates.',
      'Run the index from zero to the length, stepping by the size rather than by one.',
      'Take each piece with slice from the index to the index plus the size; slice stops at the end of the array by itself, which is what makes the last piece short instead of padded.',
      'Slice copies, so the input array is left exactly as it was.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'chunk([1, 2, 3, 4, 5], 2)', expected: [[1, 2], [3, 4], [5]] },
      { call: 'chunk([1, 2, 3, 4], 2)', expected: [[1, 2], [3, 4]] },
      { call: 'chunk([], 3)', expected: [], label: 'empty input', edge: true },
      { call: 'chunk([1, 2], 0)', expected: [], label: 'a size of zero would never terminate', edge: true },
      { call: 'chunk([1, 2], 5)', expected: [[1, 2]], label: 'a size past the length gives one short piece', edge: true },
      { call: 'chunk([1, 2, 3], 1)', expected: [[1], [2], [3]], label: 'a size of one splits every item out', edge: true },
    ],
  },
  {
    id: 'alg-merge-sorted',
    track: 'algorithms',
    topic: 'algorithms',
    level: 9,
    tier: 2,
    focus: ['two-pointer', 'while'],
    title: 'Merge two sorted arrays',
    prompt: 'Write `mergeSorted(a, b)`, merging two arrays that are already sorted ascending into one sorted array, without calling `sort`. `mergeSorted([1, 3, 5], [2, 4])` gives `[1, 2, 3, 4, 5]`. Walk both arrays with a pointer each and always take the smaller head, then append whatever is left over when one side runs out. Duplicates are kept, either array may be empty, and neither input is changed. Target: O(n + m) time and O(n + m) space — sorting the concatenation would be O((n + m) log (n + m)) and throws away what you already know.',
    starter: `const mergeSorted = (a, b) => {

};

// Scratch pad — change this and press Run.
console.log(mergeSorted([1, 3, 5], [2, 4]));
`,
    skeleton: `const mergeSorted = (a, b) => {
  const merged = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    // take the smaller head and advance only that pointer
  }

  // one side is spent; append the rest of the other
  return merged;
};`,
    hints: ['The loop that compares both heads can only run while both sides still have one. When it ends, exactly one array has values left — append them as they are, since they are already in order.'],
    approach: [
      'Keep an index into each array and build a third array to write into.',
      'While both indices are still inside their array, compare the two heads and push the smaller one, advancing only the pointer you took from.',
      'Taking the left value when the two are equal keeps duplicates in a predictable order.',
      'When the loop ends, one array is spent: append the remainder of the other, which is already sorted.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'mergeSorted([1, 3, 5], [2, 4])', expected: [1, 2, 3, 4, 5] },
      { call: 'mergeSorted([1, 2], [3, 4])', expected: [1, 2, 3, 4] },
      { call: 'mergeSorted([], [])', expected: [], label: 'empty input on both sides', edge: true },
      { call: 'mergeSorted([], [1, 2])', expected: [1, 2], label: 'one side empty', edge: true },
      { call: 'mergeSorted([1, 1], [1])', expected: [1, 1, 1], label: 'duplicates are all kept', edge: true },
      { call: 'mergeSorted([-5, 0], [-1, 2])', expected: [-5, -1, 0, 2], label: 'negatives, which a default sort would order as text', edge: true },
    ],
  },

  /* ── two pointers, sliding windows, stacks and sorting ──────────────── */
  {
    id: 'alg-rotate-array',
    track: 'algorithms',
    topic: 'algorithms',
    level: 10,
    tier: 3,
    focus: ['two-pointer', 'for'],
    title: 'Rotate an array in place',
    prompt: 'Write `rotate(numbers, k)`, moving every value `k` places to the right in the array that was passed in — not a copy — and returning that same array. `rotate([1, 2, 3, 4, 5], 2)` gives `[4, 5, 1, 2, 3]`. A `k` larger than the length wraps around, a `k` of zero leaves the array alone, and an empty array stays empty. Target: O(n) time and O(1) extra space, which the three-reversal trick gives you: reverse the whole array, then reverse the first `k` and the rest separately.',
    starter: `const rotate = (numbers, k) => {

};

// Scratch pad — change this and press Run.
const values = [1, 2, 3, 4, 5];
rotate(values, 2);
console.log(values);
`,
    skeleton: `const rotate = (numbers, k) => {
  const reverse = (from, to) => {
    // swap the ends and walk inwards
  };

  const steps = /* k, wrapped to the length */;
  // reverse everything, then each of the two pieces
  return numbers;
};`,
    hints: ['Reversing the whole array puts the last k values at the front, but backwards. Reversing each of the two pieces separately then puts them the right way round.'],
    approach: [
      'Take k modulo the length first, so a k past the end wraps and an empty array never divides by zero.',
      'Write a helper that reverses a stretch of the array in place by swapping the two ends and walking inwards.',
      'Reverse the whole array, which brings the last k values to the front in reverse order.',
      'Reverse the first k values, then reverse the rest; both pieces come out in their original order, now rotated.',
      'Return the same array object, since the caller asked for the rotation to happen in place.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: '(() => { const values = [1, 2, 3, 4, 5]; const returned = rotate(values, 2); return [values, returned === values]; })()', expected: [[4, 5, 1, 2, 3], true], label: 'it rotates in place and returns the same array' },
      { call: '(() => { const values = [1, 2]; rotate(values, 3); return values; })()', expected: [2, 1] },
      { call: '(() => { const values = []; rotate(values, 2); return values; })()', expected: [], label: 'empty input', edge: true },
      { call: '(() => { const values = [1, 2, 3]; rotate(values, 0); return values; })()', expected: [1, 2, 3], label: 'a k of zero changes nothing', edge: true },
      { call: '(() => { const values = [1, 2, 3]; rotate(values, 3); return values; })()', expected: [1, 2, 3], label: 'a k equal to the length is a full turn', edge: true },
    ],
  },
  {
    id: 'alg-missing-number',
    track: 'algorithms',
    topic: 'algorithms',
    level: 11,
    tier: 1,
    focus: ['reduce', 'for'],
    title: 'Missing number',
    prompt: 'Write `missingNumber(numbers)`, returning the one value missing from `0` through `n`, where the array holds `n` distinct numbers out of that range. `missingNumber([3, 0, 1])` gives 2, and `missingNumber([0, 1])` gives 2 — the missing value may be `n` itself, which is the case a loop over the array alone will miss. An empty array gives 0. Compare the total the full range should have with the total the array actually has. Target: O(n) time and O(1) space.',
    starter: `const missingNumber = numbers => {

};

// Scratch pad — change this and press Run.
console.log(missingNumber([3, 0, 1]));
`,
    skeleton: `const missingNumber = numbers => {
  const n = numbers.length;
  const expected = /* the sum of 0 through n */;
  const actual = /* the sum of the array */;

  return expected - actual;
};`,
    hints: ['The numbers 0 through n add up to n × (n + 1) / 2 whatever order they are in, so the gap between that and the array total is exactly the missing value.'],
    approach: [
      'The array holds n values, so the full range runs from 0 to n and has n + 1 members.',
      'Add up 0 through n with the closed form n × (n + 1) / 2 rather than a second loop.',
      'Add up the array itself, then subtract; the difference is the only value the array does not contain.',
      'An empty array has n of zero, an expected total of zero and an actual total of zero, so it answers 0 without a special case.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'missingNumber([3, 0, 1])', expected: 2 },
      { call: 'missingNumber([9, 6, 4, 2, 3, 5, 7, 0, 1])', expected: 8 },
      { call: 'missingNumber([])', expected: 0, label: 'empty input', edge: true },
      { call: 'missingNumber([1])', expected: 0, label: 'zero is the one missing', edge: true },
      { call: 'missingNumber([0])', expected: 1, label: 'the top of the range is missing', edge: true },
      { call: 'missingNumber([0, 1])', expected: 2, label: 'n itself is missing, which no lookup in the array would find', edge: true },
    ],
  },
  {
    id: 'alg-longest-unique-substring',
    track: 'algorithms',
    topic: 'algorithms',
    level: 12,
    tier: 3,
    focus: ['two-pointer', 'map-set', 'strings'],
    title: 'Longest substring without repeating characters',
    prompt: 'Write `lengthOfLongestSubstring(text)`, returning the length of the longest stretch of neighbouring characters with no repeat. `lengthOfLongestSubstring("abcabcbb")` gives 3, for `"abc"`; `lengthOfLongestSubstring("bbbbb")` gives 1. Slide a window and remember where each character last sat; when one repeats, move the window start past that position — but never backwards, which is what `"abba"` is there to catch. An empty string gives 0 and spaces count as characters. Target: O(n) time and O(k) space for k distinct characters.',
    starter: `const lengthOfLongestSubstring = text => {

};

// Scratch pad — change this and press Run.
console.log(lengthOfLongestSubstring("abcabcbb"));
`,
    skeleton: `const lengthOfLongestSubstring = text => {
  const lastSeen = new Map(); // character -> the index it last sat at
  let start = 0;
  let longest = 0;

  for (let end = 0; end < text.length; end += 1) {
    // move start past a repeat, then measure the window
  }

  return longest;
};`,
    hints: ['In "abba", by the time the second "a" arrives the window has already moved past the first one. Only move the start forward — take the larger of where it is and just past the repeat.'],
    approach: [
      'Keep a Map from each character to the index it was last seen at, and an index where the current window starts.',
      'Walk the end of the window through the string one character at a time.',
      'When the character has been seen at or after the window start, move the start to just past that earlier position — using the larger of the two values, so the start never slides backwards.',
      'Record the character at its new index and measure the window; keep the longest measurement.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: 'lengthOfLongestSubstring("abcabcbb")', expected: 3 },
      { call: 'lengthOfLongestSubstring("bbbbb")', expected: 1 },
      { call: 'lengthOfLongestSubstring("")', expected: 0, label: 'empty input', edge: true },
      { call: 'lengthOfLongestSubstring("pwwkew")', expected: 3 },
      { call: 'lengthOfLongestSubstring("abba")', expected: 2, label: 'the window start must never move backwards', edge: true },
      { call: 'lengthOfLongestSubstring("a b")', expected: 3, label: 'a space is a character like any other', edge: true },
    ],
  },
  {
    id: 'alg-max-sum-subarray',
    track: 'algorithms',
    topic: 'algorithms',
    level: 13,
    tier: 2,
    focus: ['two-pointer', 'for'],
    title: 'Max sum subarray of size K',
    prompt: 'Write `maxSumSubarray(numbers, k)`, returning the largest sum of any `k` neighbouring values. `maxSumSubarray([2, 1, 5, 1, 3, 2], 3)` gives 9, for `5 + 1 + 3`. Add the first window once, then slide it: add the value coming in and subtract the one going out, so each value is touched twice rather than `k` times. When the array is shorter than `k`, or `k` is not a positive whole number, give `null`. Target: O(n) time and O(1) space; re-adding every window would be O(n · k).',
    starter: `const maxSumSubarray = (numbers, k) => {

};

// Scratch pad — change this and press Run.
console.log(maxSumSubarray([2, 1, 5, 1, 3, 2], 3));
`,
    skeleton: `const maxSumSubarray = (numbers, k) => {
  if (/* k is unusable or the array is too short */) return null;

  let windowSum = /* the sum of the first k values */;
  let best = windowSum;

  for (let end = k; end < numbers.length; end += 1) {
    // slide: one value in, one value out
  }

  return best;
};`,
    hints: ['Start the best answer at the first window rather than at zero, or an array of negative numbers will wrongly answer 0.'],
    approach: [
      'Reject a k that is not a positive whole number, and an array shorter than k, before touching any values.',
      'Add the first k values once to get the opening window, and make that the best so far.',
      'Slide the window one step at a time: add the value entering at the end and subtract the value leaving the front.',
      'Keep the larger of the running best and the new window sum — starting from the first window rather than zero is what makes an all-negative array come out right.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'maxSumSubarray([2, 1, 5, 1, 3, 2], 3)', expected: 9 },
      { call: 'maxSumSubarray([1, 2, 3], 3)', expected: 6 },
      { call: 'maxSumSubarray([], 2)', expected: null, label: 'empty input', edge: true },
      { call: 'maxSumSubarray([1, 2], 5)', expected: null, label: 'the array is shorter than the window', edge: true },
      { call: 'maxSumSubarray([1, 2, 3], 0)', expected: null, label: 'a window of zero is not a window', edge: true },
      { call: 'maxSumSubarray([-1, -2, -3], 2)', expected: -3, label: 'every value is negative, so the answer is too', edge: true },
    ],
  },
  {
    id: 'alg-container-with-most-water',
    track: 'algorithms',
    topic: 'algorithms',
    level: 14,
    tier: 3,
    focus: ['two-pointer', 'while'],
    title: 'Container with most water',
    prompt: 'Write `maxArea(heights)`, returning the most water two of the lines can hold between them: the distance between their positions times the shorter of the two heights. `maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])` gives 49. Start with a pointer at each end and always move the shorter one inwards — moving the taller one can only lose width without ever gaining height, which is why one pass is enough. Fewer than two lines hold nothing, so give 0. Target: O(n) time and O(1) space; every pair would be O(n²).',
    starter: `const maxArea = heights => {

};

// Scratch pad — change this and press Run.
console.log(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]));
`,
    skeleton: `const maxArea = heights => {
  let left = 0;
  let right = heights.length - 1;
  let best = 0;

  while (left < right) {
    // measure this pair, then move the shorter side inwards
  }

  return best;
};`,
    hints: ['The water is capped by the shorter line, so moving the taller one inwards can never help — it loses a unit of width and the height stays capped where it was.'],
    approach: [
      'Put a pointer at each end, which is the widest pair there is.',
      'Measure the pair: the distance between the pointers times the smaller of the two heights.',
      'Move whichever pointer stands at the shorter line one step inwards; the shorter line is what limits this pair, so it is the only one worth replacing.',
      'Stop when the pointers meet, and return the largest measurement seen — an array of fewer than two lines never enters the loop and gives 0.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: 'maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])', expected: 49 },
      { call: 'maxArea([1, 2, 4, 3])', expected: 4 },
      { call: 'maxArea([])', expected: 0, label: 'empty input', edge: true },
      { call: 'maxArea([5])', expected: 0, label: 'one line has nothing to pair with', edge: true },
      { call: 'maxArea([0, 0])', expected: 0, label: 'two lines of no height hold nothing', edge: true },
      { call: 'maxArea([1, 1])', expected: 1, label: 'the narrowest pair there is', edge: true },
    ],
  },
  {
    id: 'alg-move-zeroes',
    track: 'algorithms',
    topic: 'algorithms',
    level: 15,
    tier: 2,
    focus: ['two-pointer', 'for'],
    title: 'Move zeroes to the end',
    prompt: 'Write `moveZeroes(numbers)`, moving every zero to the end of the array that was passed in while the other values keep their order, and returning that same array. `moveZeroes([0, 1, 0, 3, 12])` gives `[1, 3, 12, 0, 0]`. Keep a write position, copy each non-zero value into it, then fill whatever is left with zeros. An array of zeros alone, and an empty array, both come back unchanged. Target: O(n) time and O(1) extra space — building a filtered copy and reassigning would not change the caller\'s array at all.',
    starter: `const moveZeroes = numbers => {

};

// Scratch pad — change this and press Run.
const values = [0, 1, 0, 3, 12];
moveZeroes(values);
console.log(values);
`,
    skeleton: `const moveZeroes = numbers => {
  let write = 0;

  for (const value of numbers) {
    // keep the non-zero values, packed to the front
  }

  // everything from write onwards is a zero now
  return numbers;
};`,
    hints: ['Two indices, one array: the read position runs ahead through every value, the write position only advances when something non-zero is kept.'],
    approach: [
      'Keep a write position starting at zero.',
      'Read through the array; every time the value is not zero, store it at the write position and move that position on by one.',
      'When the read is finished, every non-zero value sits packed at the front in its original order.',
      'Fill from the write position to the end with zeros, and return the same array object rather than a copy.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: '(() => { const values = [0, 1, 0, 3, 12]; const returned = moveZeroes(values); return [values, returned === values]; })()', expected: [[1, 3, 12, 0, 0], true], label: 'it moves them in place and returns the same array' },
      { call: '(() => { const values = [1, 2, 3]; moveZeroes(values); return values; })()', expected: [1, 2, 3] },
      { call: '(() => { const values = []; moveZeroes(values); return values; })()', expected: [], label: 'empty input', edge: true },
      { call: '(() => { const values = [0, 0]; moveZeroes(values); return values; })()', expected: [0, 0], label: 'nothing but zeros', edge: true },
      { call: '(() => { const values = [0, -1, 0, 2]; moveZeroes(values); return values; })()', expected: [-1, 2, 0, 0], label: 'negatives are values like any other', edge: true },
    ],
  },
  {
    id: 'alg-valid-parentheses',
    track: 'algorithms',
    topic: 'algorithms',
    level: 16,
    tier: 2,
    focus: ['push', 'pop', 'map-set'],
    title: 'Valid parentheses',
    prompt: 'Write `isValid(text)`, deciding whether every bracket is closed by the matching kind in the right order, across `()`, `[]` and `{}`. `isValid("{[]()}")` gives `true`; `isValid("([)]")` gives `false`, because the brackets close out of order even though the counts match — which is why counting cannot do this job. Push each opening bracket onto a stack, and on a closing one check the top matches before popping it; anything still on the stack at the end means something was never closed. An empty string is valid, and the string holds nothing but brackets. Target: O(n) time and O(n) space.',
    starter: `const isValid = text => {

};

// Scratch pad — change this and press Run.
console.log(isValid("{[]()}"));
`,
    skeleton: `const isValid = text => {
  const closes = { ")": "(", "]": "[", "}": "{" };
  const stack = [];

  for (const character of text) {
    // push an opener; on a closer, check the top before popping
  }

  return stack.length === 0;
};`,
    hints: ['A closing bracket has to match the most recent unclosed opener, which is exactly the value on top of the stack. Checking that top before popping is what rejects "([)]".'],
    approach: [
      'Keep a lookup from each closing bracket to the opening bracket it belongs to.',
      'Walk the string: an opening bracket is pushed onto a stack.',
      'A closing bracket has to match what the stack currently has on top — pop it and compare; a mismatch, or an empty stack, settles it as false.',
      'At the end, an empty stack means everything opened was also closed; anything left over means it was not.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'isValid("{[]()}")', expected: true },
      { call: 'isValid("([)]")', expected: false, label: 'the counts match but the order does not' },
      { call: 'isValid("")', expected: true, label: 'empty input is balanced', edge: true },
      { call: 'isValid("(")', expected: false, label: 'opened and never closed', edge: true },
      { call: 'isValid(")")', expected: false, label: 'a closer with nothing to close', edge: true },
      { call: 'isValid("(((())))")', expected: true, label: 'deep nesting of one kind', edge: true },
    ],
  },
  {
    id: 'alg-merge-intervals',
    track: 'algorithms',
    topic: 'algorithms',
    level: 17,
    tier: 3,
    focus: ['sort', 'for'],
    title: 'Merge intervals',
    prompt: 'Write `mergeIntervals(intervals)`, merging every group of `[start, end]` ranges that overlap or touch and returning the result ordered by start. `mergeIntervals([[1, 3], [2, 6], [8, 10], [15, 18]])` gives `[[1, 6], [8, 10], [15, 18]]`, and `[[1, 4], [4, 5]]` merges into `[[1, 5]]` because touching counts. Sort by start first, then walk once, extending the last range whenever the next one begins at or before its end. `sort` reorders in place, so copy before sorting — the array passed in is never changed. An empty list gives `[]`. Target: O(n log n) time and O(n) space.',
    starter: `const mergeIntervals = intervals => {

};

// Scratch pad — change this and press Run.
console.log(mergeIntervals([[1, 3], [2, 6], [8, 10], [15, 18]]));
`,
    skeleton: `const mergeIntervals = intervals => {
  const ordered = /* a copy, sorted by start */;
  const merged = [];

  for (const [start, end] of ordered) {
    // extend the last range, or start a new one
  }

  return merged;
};`,
    hints: ['Once the ranges are sorted by start, the next one can only overlap the range you are currently holding — never an earlier one — so a single pass is enough.'],
    approach: [
      'Copy the array before sorting, because sort reorders the array it is given and the caller keeps theirs.',
      'Sort the copy by start, ascending, with a numeric comparator.',
      'Walk the sorted ranges, holding the last range you put in the result.',
      'When the next range starts at or before that range ends, they overlap or touch: extend the held end to the larger of the two ends. Otherwise push the next range as a new one.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: 'mergeIntervals([[1, 3], [2, 6], [8, 10], [15, 18]])', expected: [[1, 6], [8, 10], [15, 18]] },
      { call: 'mergeIntervals([[1, 4], [4, 5]])', expected: [[1, 5]], label: 'ranges that only touch still merge' },
      { call: 'mergeIntervals([])', expected: [], label: 'empty input', edge: true },
      { call: 'mergeIntervals([[5, 6]])', expected: [[5, 6]], label: 'a single range has nothing to merge with', edge: true },
      { call: 'mergeIntervals([[3, 4], [1, 2]])', expected: [[1, 2], [3, 4]], label: 'the input is not sorted to begin with', edge: true },
      { call: 'mergeIntervals([[1, 10], [2, 3]])', expected: [[1, 10]], label: 'one range swallowed by another', edge: true },
    ],
  },
  {
    id: 'alg-sort-by-keys',
    track: 'algorithms',
    topic: 'algorithms',
    level: 18,
    tier: 3,
    focus: ['sort', 'objects'],
    title: 'Sort by several keys',
    prompt: 'Write `sortTasks(tasks)`, returning a new array of `{ name, priority }` objects ordered by `priority` from high to low and, where two share a priority, by `name` from A to Z. `sortTasks([{ name: "b", priority: 2 }, { name: "a", priority: 10 }])` puts the priority-10 task first. Pass a comparator: the default `sort` compares values as text, which orders 100, 10, 2 as 10, 100, 2. Return the difference for the numbers and fall through to the names only when it is zero. `sort` reorders in place, so copy first — the array passed in is never changed. An empty list gives `[]`. Target: O(n log n) time and O(n) space.',
    starter: `const sortTasks = tasks => {

};

// Scratch pad — change this and press Run.
console.log(sortTasks([{ name: "b", priority: 2 }, { name: "a", priority: 10 }]));
`,
    skeleton: `const sortTasks = tasks => {
  return [...tasks].sort((left, right) => {
    // priority first, high to low; names only break a tie
  });
};`,
    hints: ['A comparator returns a negative number, zero or a positive one. Subtracting the priorities the other way round gives high-to-low, and only a zero there should let the name comparison speak.'],
    approach: [
      'Copy the array with a spread before sorting, since sort reorders the array it is given.',
      'In the comparator, compare the priorities first: right minus left puts the larger priority earlier.',
      'When that difference is zero the two tie, so compare the names instead — returning a negative number when the left name comes first alphabetically.',
      'Returning the raw subtraction rather than a hand-rolled -1 / 0 / 1 keeps the comparator honest about equality, which is what preserves the tie for the name to settle.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'sortTasks([{ name: "b", priority: 2 }, { name: "a", priority: 10 }])', expected: [{ name: 'a', priority: 10 }, { name: 'b', priority: 2 }] },
      { call: 'sortTasks([{ name: "crawl", priority: 2 }, { name: "parse", priority: 100 }, { name: "store", priority: 10 }])', expected: [{ name: 'parse', priority: 100 }, { name: 'store', priority: 10 }, { name: 'crawl', priority: 2 }], label: 'the default text sort would order these 10, 100, 2' },
      { call: 'sortTasks([])', expected: [], label: 'empty input', edge: true },
      { call: 'sortTasks([{ name: "zeta", priority: 5 }, { name: "alpha", priority: 5 }])', expected: [{ name: 'alpha', priority: 5 }, { name: 'zeta', priority: 5 }], label: 'a tie on priority is settled by name', edge: true },
      { call: '(() => { const source = [{ name: "b", priority: 1 }, { name: "a", priority: 2 }]; sortTasks(source); return source.map(task => task.name); })()', expected: ['b', 'a'], label: 'the array passed in is left as it was', edge: true },
    ],
  },

  /* ── recursion, trees and graphs ────────────────────────────────────── */
  {
    id: 'alg-deep-flatten',
    track: 'algorithms',
    topic: 'algorithms',
    level: 19,
    tier: 3,
    focus: ['recursion', 'for-of'],
    title: 'Deep flatten',
    prompt: 'Write `deepFlatten(items)`, returning every value from an array nested to any depth, in order, without calling `flat` or `flatMap`. `deepFlatten([1, [2, [3, [4]], 5]])` gives `[1, 2, 3, 4, 5]`. Recurse into anything `Array.isArray` accepts and keep everything else as it is — `null`, `false` and `0` are values, not empties, so none of them may be dropped. Empty arrays at any depth simply add nothing. Target: O(n) time in the total number of values and O(d) stack space for depth d.',
    starter: `const deepFlatten = items => {

};

// Scratch pad — change this and press Run.
console.log(deepFlatten([1, [2, [3, [4]], 5]]));
`,
    skeleton: `const deepFlatten = items => {
  const flat = [];

  for (const item of items) {
    // an array is walked into; anything else is kept
  }

  return flat;
};`,
    hints: ['Array.isArray is the only test that matters — typeof calls an array an object, and a truthiness check would quietly drop 0, false and null.'],
    approach: [
      'Build a result array and walk the input one item at a time.',
      'When the item is an array, flatten it the same way and append everything that comes back.',
      'When it is not, push it unchanged — decide that with Array.isArray, so a falsy value is still a value.',
      'An empty array at any depth contributes nothing, which needs no special case at all.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'deepFlatten([1, [2, [3, [4]], 5]])', expected: [1, 2, 3, 4, 5] },
      { call: 'deepFlatten([[1], [2], [3]])', expected: [1, 2, 3] },
      { call: 'deepFlatten([])', expected: [], label: 'empty input', edge: true },
      { call: 'deepFlatten([[], [[]]])', expected: [], label: 'empty arrays at depth add nothing', edge: true },
      { call: 'deepFlatten([1, [null, [2]]])', expected: [1, null, 2], label: 'null is a value, not an empty', edge: true },
      { call: 'deepFlatten([0, [false, [""]]])', expected: [0, false, ''], label: 'falsy values all survive', edge: true },
    ],
  },
  {
    id: 'alg-deep-clone',
    track: 'algorithms',
    topic: 'algorithms',
    level: 20,
    tier: 3,
    focus: ['recursion', 'objects'],
    title: 'Deep clone',
    prompt: 'Write `deepClone(value)`, returning a copy that shares no array or object with the original, without `JSON.parse(JSON.stringify(...))` and without `structuredClone`. Arrays clone into arrays, plain objects into objects, and everything else — numbers, strings, booleans, `null`, `undefined` — comes back as it is, since there is nothing to copy. Changing a nested value on the copy must leave the original alone. Mind that `typeof null` is `"object"`, so a null check has to come first. Target: O(n) time and O(n) space in the number of values.',
    starter: `const deepClone = value => {

};

// Scratch pad — change this and press Run.
const source = { a: [1, { b: 2 }] };
const copy = deepClone(source);
copy.a[1].b = 99;
console.log(source.a[1].b, copy.a[1].b);
`,
    skeleton: `const deepClone = value => {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    // a new array of cloned items
  }
  // a new object of cloned values, key by key
};`,
    hints: ['Anything that is not an object needs no copying at all — return it. That single early exit is also the base case that stops the recursion.'],
    approach: [
      'Return the value untouched when it is null or not an object; that covers every primitive and ends the recursion.',
      'Check Array.isArray next, and build a new array whose items are clones of the originals.',
      'Otherwise build a new object and clone each own value under the same key.',
      'Because every branch makes a fresh container, no array or object is ever shared with the original.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: '(() => { const source = { a: [1, { b: 2 }] }; const copy = deepClone(source); copy.a[1].b = 99; return [source.a[1].b, copy.a[1].b]; })()', expected: [2, 99], label: 'changing the copy leaves the original alone' },
      { call: '(() => { const source = { a: 1 }; const copy = deepClone(source); return [copy, copy === source]; })()', expected: [{ a: 1 }, false], label: 'equal in value, not the same object' },
      { call: 'deepClone(null)', expected: null, label: 'null is not an object to walk into', edge: true },
      { call: 'deepClone(5)', expected: 5, label: 'a primitive is returned as it is', edge: true },
      { call: '(() => { const source = []; const copy = deepClone(source); return [copy, copy === source]; })()', expected: [[], false], label: 'an empty array still clones to a new array', edge: true },
      { call: 'deepClone([1, [2, [3]]])', expected: [1, [2, [3]]], label: 'nesting is followed all the way down', edge: true },
    ],
  },
  {
    id: 'alg-sum-nested-values',
    track: 'algorithms',
    topic: 'algorithms',
    level: 21,
    tier: 3,
    focus: ['recursion', 'objects'],
    title: 'Sum the numbers in a nested object',
    prompt: 'Write `sumValues(value)`, adding up every number anywhere inside a structure of nested objects and arrays. `sumValues({ a: 1, b: { c: 2, d: [3, 4] } })` gives 10. Walk arrays and objects, add numbers, and ignore strings, booleans, `null` and `undefined` rather than coercing them — `"5"` contributes nothing. `NaN` is a number as far as `typeof` is concerned, so leave it out explicitly or one bad value poisons the total. An empty object or array totals 0. Target: O(n) time and O(d) stack space for depth d.',
    starter: `const sumValues = value => {

};

// Scratch pad — change this and press Run.
console.log(sumValues({ a: 1, b: { c: 2, d: [3, 4] } }));
`,
    skeleton: `const sumValues = value => {
  if (typeof value === "number") return /* the number, unless it is NaN */;
  if (value === null || typeof value !== "object") return 0;

  // add up what every child contributes
};`,
    hints: ['Object.values gives you the children of an object and the items of an array alike, so one loop handles both once you have dealt with the primitives.'],
    approach: [
      'Deal with a number first: it contributes itself, except NaN, which Number.isNaN rules out.',
      'Anything else that is not an object — a string, a boolean, null, undefined — contributes zero.',
      'For an object or an array, add up what each child contributes by asking the same function.',
      'Object.values works for both arrays and plain objects, so the two cases need no separate branch, and an empty one gives an empty list and a total of zero.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'sumValues({ a: 1, b: { c: 2, d: [3, 4] } })', expected: 10 },
      { call: 'sumValues([1, [2, [3]]])', expected: 6 },
      { call: 'sumValues({})', expected: 0, label: 'empty input', edge: true },
      { call: 'sumValues({ a: "5", b: true, c: null })', expected: 0, label: 'non-numbers are ignored, not coerced', edge: true },
      { call: 'sumValues(7)', expected: 7, label: 'a bare number is its own total', edge: true },
      { call: 'sumValues({ a: -1, b: [1.5], c: NaN })', expected: 0.5, label: 'negatives and decimals count, NaN does not', edge: true },
    ],
  },
  {
    id: 'alg-bfs-shortest-path',
    track: 'algorithms',
    topic: 'algorithms',
    level: 22,
    tier: 4,
    focus: ['map-set', 'while', 'shift'],
    title: 'Shortest path in a crawl graph',
    prompt: 'Write `shortestPath(graph, start, goal)` for an unweighted graph given as an adjacency list — `{ a: ["b", "c"], b: ["d"] }` — returning one shortest route from `start` to `goal` as an array of nodes, or `null` when none exists. `shortestPath({ a: ["b"], b: ["c"], c: [] }, "a", "c")` gives `["a", "b", "c"]`. Go breadth first with a queue of routes and a `visited` set, marking a node when it is queued rather than when it is taken, so a link cycle cannot send the crawl round for ever. Breadth first is what makes the first route that reaches the goal a shortest one. `start` equal to `goal` gives `[start]`, and a node with no entry in the graph has no neighbours. Target: O(V + E) time and O(V) space.',
    starter: `const shortestPath = (graph, start, goal) => {

};

// Scratch pad — change this and press Run.
console.log(shortestPath({ a: ["b"], b: ["c"], c: [] }, "a", "c"));
`,
    skeleton: `const shortestPath = (graph, start, goal) => {
  const visited = new Set([start]);
  const queue = [[start]];

  while (queue.length > 0) {
    const route = queue.shift();
    // the goal ends it; otherwise queue each unvisited neighbour
  }

  return null;
};`,
    hints: ['Mark a node as visited the moment you queue it, not when you take it off. Marking late lets the same node be queued several times before any of them is examined.'],
    approach: [
      'Seed a queue with the one-node route that is just the start, and a visited set holding the start.',
      'Take the first route off the queue; if its last node is the goal, that route is a shortest one, because breadth first reaches every node by its shortest route first.',
      'Otherwise look up that node\'s neighbours, treating a node missing from the graph as having none.',
      'Queue each unvisited neighbour as the current route plus that neighbour, and mark it visited as you queue it, which is what keeps a cycle finite.',
      'An empty queue means the goal was never reachable.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    tests: [
      { call: 'shortestPath({ a: ["b"], b: ["c"], c: [] }, "a", "c")', expected: ['a', 'b', 'c'] },
      { call: 'shortestPath({ a: ["b", "c"], b: ["d"], c: ["d"], d: [] }, "a", "d")', expected: ['a', 'b', 'd'], label: 'the first of two equally short routes' },
      { call: 'shortestPath({}, "a", "b")', expected: null, label: 'empty input', edge: true },
      { call: 'shortestPath({ a: [] }, "a", "a")', expected: ['a'], label: 'the start is already the goal', edge: true },
      { call: 'shortestPath({ a: ["b"], b: ["a"] }, "a", "z")', expected: null, label: 'a cycle must not loop for ever', edge: true },
      { call: 'shortestPath({ a: ["b", "c"], b: [], c: ["d"], d: [] }, "a", "d")', expected: ['a', 'c', 'd'], label: 'the shorter branch is not the first one tried', edge: true },
    ],
  },
  {
    id: 'alg-level-order',
    track: 'algorithms',
    topic: 'algorithms',
    level: 23,
    tier: 4,
    focus: ['while', 'shift', 'objects'],
    title: 'Binary tree level-order traversal',
    prompt: 'Write `levelOrder(root)` for a binary tree of `{ value, left, right }` nodes, returning one array of values per depth, top to bottom and left to right within a level. A root of 3 with children 9 and 20 gives `[[3], [9, 20]]`. The trick is knowing where a level ends: record how many nodes the queue holds before you start the level, and take exactly that many. A `null` root gives `[]`, and a missing child is `null` rather than absent. Target: O(n) time and O(n) space.',
    starter: `const levelOrder = root => {

};

// Scratch pad — change this and press Run.
const node = (value, left = null, right = null) => ({ value, left, right });
console.log(levelOrder(node(3, node(9), node(20))));
`,
    skeleton: `const levelOrder = root => {
  if (!root) return [];
  const levels = [];
  const queue = [root];

  while (queue.length > 0) {
    const width = queue.length; // how many nodes this level holds
    // take exactly that many, collecting values and queueing children
  }

  return levels;
};`,
    hints: ['Everything in the queue when a level begins belongs to that level. Read the length into a variable first — the queue grows as you add children, so reading it inside the loop would run the levels together.'],
    approach: [
      'A missing root has no levels at all, so answer with an empty array before anything else.',
      'Seed a queue with the root, and loop while the queue still holds nodes.',
      'At the top of each pass, record the queue length: those nodes, and only those, are the current level.',
      'Take that many nodes off the front, collect their values into one array, and push each non-null child onto the back for the next level.',
      'Push the collected values as one level and let the loop carry on with whatever the children left behind.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: '(() => { const node = (value, left = null, right = null) => ({ value, left, right }); return levelOrder(node(3, node(9), node(20, node(15), node(7)))); })()', expected: [[3], [9, 20], [15, 7]] },
      { call: '(() => { const node = (value, left = null, right = null) => ({ value, left, right }); return levelOrder(node(1)); })()', expected: [[1]], label: 'a root with no children is one level' },
      { call: 'levelOrder(null)', expected: [], label: 'empty input', edge: true },
      { call: '(() => { const node = (value, left = null, right = null) => ({ value, left, right }); return levelOrder(node(1, node(2, node(4)))); })()', expected: [[1], [2], [4]], label: 'a tree that only leans left', edge: true },
      { call: '(() => { const node = (value, left = null, right = null) => ({ value, left, right }); return levelOrder(node(1, null, node(3, null, node(5)))); })()', expected: [[1], [3], [5]], label: 'a tree that only leans right', edge: true },
    ],
  },

  /* ── async: the two questions a crawling team actually asks ───────────── */
  {
    id: 'alg-promise-pool',
    track: 'algorithms',
    topic: 'algorithms',
    level: 24,
    tier: 4,
    focus: ['promises', 'async-await'],
    title: 'Promise pool with a concurrency limit',
    prompt: 'Write `promisePool(tasks, limit)`, running an array of functions that each return a promise, with at most `limit` of them in flight at once, and resolving to their results in the order the tasks were given — not the order they finished. `promisePool([() => Promise.resolve(1), () => Promise.resolve(2)], 1)` resolves to `[1, 2]`. Start `limit` workers that each pull the next index off a shared counter and write their result into the slot that index owns; handing the whole batch to `Promise.all` would start everything at once and defeat the point. An empty task list resolves to `[]`, and a `limit` past the number of tasks simply runs them all. Target: O(n) time in the number of tasks and O(n) space for the results.',
    starter: `const promisePool = (tasks, limit) => {

};

// Scratch pad — change this and press Run.
promisePool([() => Promise.resolve(1), () => Promise.resolve(2)], 1).then(results => console.log(results));
`,
    skeleton: `const promisePool = async (tasks, limit) => {
  const results = new Array(tasks.length);
  let next = 0; // the next task nobody has claimed

  const worker = async () => {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      // run this task and store it in the slot it owns
    }
  };

  // start at most limit workers, and wait for the workers themselves
  return results;
};`,
    hints: ['Writing each result into results[index] rather than pushing it is what keeps the output in task order however the timings fall out.'],
    approach: [
      'Make a results array the same length as the task list, so each task has a slot waiting for it.',
      'Keep one shared counter naming the next unclaimed task.',
      'A worker loops: claim the current index, advance the counter before awaiting anything so no two workers claim the same task, run that task and store the value at that index.',
      'Start as many workers as the limit allows — never more than there are tasks — and await the workers, not the tasks; only limit of them are ever in flight.',
      'An empty task list gives workers that exit immediately and an empty results array.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: 'promisePool([() => Promise.resolve(1), () => Promise.resolve(2)], 1)', expected: [1, 2], async: true },
      { call: '(async () => { const wait = ms => new Promise(done => setTimeout(done, ms)); const tasks = [async () => { await wait(30); return "slow"; }, async () => { await wait(5); return "fast"; }]; return promisePool(tasks, 2); })()', expected: ['slow', 'fast'], label: 'results keep task order, not finishing order', async: true },
      { call: 'promisePool([], 3)', expected: [], label: 'empty input', async: true, edge: true },
      { call: '(async () => { const wait = ms => new Promise(done => setTimeout(done, ms)); let running = 0; let peak = 0; const make = () => async () => { running += 1; if (running > peak) peak = running; await wait(10); running -= 1; return 1; }; await promisePool([make(), make(), make(), make(), make()], 2); return peak; })()', expected: 2, label: 'never more than the limit in flight at once', async: true, edge: true },
      { call: 'promisePool([() => Promise.resolve("only")], 5)', expected: ['only'], label: 'a limit past the task count runs them all', async: true, edge: true },
    ],
  },
  {
    id: 'alg-retry-backoff',
    track: 'algorithms',
    topic: 'algorithms',
    level: 25,
    tier: 4,
    focus: ['promises', 'timers', 'async-await'],
    title: 'Retry with exponential backoff',
    prompt: 'Write `retryWithBackoff(fn, attempts)`, calling the async `fn` until it resolves or the attempt budget runs out, waiting 100 ms before the second attempt, 200 ms before the third, 400 ms before the fourth, and so on — each wait twice the one before. Resolve with the first success; when every attempt fails, reject with the error from the last one rather than the first. There is no wait before the first attempt and none after the final failure, so a run that succeeds on the third attempt has waited 300 ms in total. An `attempts` below one means no call at all and a rejection. Target: O(attempts) calls and O(1) space.',
    starter: `const retryWithBackoff = (fn, attempts) => {

};

// Scratch pad — change this and press Run.
retryWithBackoff(async () => "ok", 3).then(result => console.log(result));
`,
    skeleton: `const retryWithBackoff = async (fn, attempts) => {
  const wait = ms => new Promise(done => setTimeout(done, ms));
  let lastError = new Error("no attempts were made");

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    // wait before every attempt except the first, then try
  }

  throw lastError;
};`,
    hints: ['The delay before attempt number i is 100 × 2^(i - 1) for i counting from one, so the first attempt waits nothing and each later one doubles.'],
    approach: [
      'Write a wait helper that resolves a promise from a setTimeout.',
      'Loop over the attempt budget, keeping the last error you saw so a total failure can report it.',
      'Wait before every attempt except the first — the delay doubles each round, starting at 100 ms.',
      'Return the moment an attempt resolves; that leaves the loop and skips both the remaining attempts and their waits.',
      'Falling out of the loop means the budget is spent, so throw the last error — and a budget below one never enters the loop, which is the rejection with no call at all.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: 'retryWithBackoff(async () => "ok", 3)', expected: 'ok', async: true },
      { call: '(() => { let runs = 0; return retryWithBackoff(async () => { runs += 1; if (runs < 3) throw new Error("flaky"); return "ok on " + runs; }, 5); })()', expected: 'ok on 3', label: 'it stops retrying the moment one succeeds', async: true },
      { call: '(async () => { const started = Date.now(); let runs = 0; await retryWithBackoff(async () => { runs += 1; if (runs < 3) throw new Error("flaky"); return runs; }, 5); const elapsed = Date.now() - started; return elapsed >= 300 && elapsed < 1500; })()', expected: true, label: 'the waits double: 100 ms, then 200 ms', async: true, edge: true },
      { call: '(async () => { const started = Date.now(); await retryWithBackoff(async () => "ok", 3); return Date.now() - started < 60; })()', expected: true, label: 'nothing waits before the first attempt', async: true, edge: true },
      { call: '(() => { let runs = 0; return retryWithBackoff(async () => { runs += 1; throw new Error("attempt " + runs); }, 3).catch(error => error.message); })()', expected: 'attempt 3', label: 'a total failure reports the last error, not the first', async: true, edge: true },
      { call: 'retryWithBackoff(async () => "never", 0).then(() => "resolved", () => "rejected")', expected: 'rejected', label: 'a budget of zero calls nothing and rejects', async: true, edge: true },
    ],
  },
];
