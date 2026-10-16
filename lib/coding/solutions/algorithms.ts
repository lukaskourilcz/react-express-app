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
    solution: "const twoSum = (numbers, target) => {\n  const seen = new Map();\n  for (let index = 0; index < numbers.length; index += 1) {\n    const partner = target - numbers[index];\n    if (seen.has(partner)) return [seen.get(partner), index];\n    if (!seen.has(numbers[index])) seen.set(numbers[index], index);\n  }\n  return [];\n};",
    junior: "const twoSum = (numbers, target) => {\n  const firstIndex = new Map();\n  for (let right = 0; right < numbers.length; right += 1) {\n    const value = numbers[right];\n    const needed = target - value;\n    if (firstIndex.has(needed)) {\n      return [firstIndex.get(needed), right];\n    }\n    if (!firstIndex.has(value)) {\n      firstIndex.set(value, right);\n    }\n  }\n  return [];\n};",
    senior: "const twoSum = (numbers, target) => {\n  const seen = new Map();\n  for (const [index, value] of numbers.entries()) {\n    const partner = seen.get(target - value);\n    if (partner !== undefined) return [partner, index];\n    if (!seen.has(value)) seen.set(value, index);\n  }\n  return [];\n};",
    hiddenTests: [
      { call: "[twoSum(Object.freeze([1,1,2]),3),twoSum(Object.freeze([1,2,3,4]),5),twoSum(Object.freeze([-0,0,0]),0),twoSum([1000000000,-1000000000],0)]", expected: [[0, 2], [1, 2], [0, 1], [0, 1]] },
      { call: "(() => {const input=[2,7,11];const a=twoSum(input,9),b=twoSum(input,9);const empty=twoSum([],1),empty2=twoSum([],1);a.push(99);empty.push(1);return [input,a!==b,b,empty!==empty2,empty2];})()", expected: [[2, 7, 11], true, [0, 1], true, []] },
      { call: "(() => {const input=Object.freeze(Array.from({length:1000},(_,i)=>i));return [twoSum(input,1997),twoSum(input,3000),input[0],input[999]];})()", expected: [[998, 999], [], 0, 999] },

      { call: 'twoSum([-3, 4, 3, 90], 0)', expected: [0, 2] },
      { call: 'twoSum([5], 5)', expected: [] },
      { call: 'twoSum([1, -1], 0)', expected: [0, 1] },
      { call: 'twoSum([1, 5, 1], 2)', expected: [0, 2] },
    ],
  },

  'alg-group-anagrams': {
    solution: "const groupAnagrams = words => {\n  const groups = new Map();\n  for (const word of words) {\n    const key = [...word].sort().join(\"\");\n    if (!groups.has(key)) groups.set(key, []);\n    groups.get(key).push(word);\n  }\n  return [...groups.values()];\n};",
    junior: "const groupAnagrams = words => {\n  const groups = new Map();\n  for (let index = 0; index < words.length; index += 1) {\n    const word = words[index];\n    const letters = Array.from(word);\n    letters.sort();\n    const key = letters.join(\"\");\n    const existing = groups.get(key);\n    if (existing === undefined) {\n      groups.set(key, [word]);\n    } else {\n      existing.push(word);\n    }\n  }\n  const result = [];\n  groups.forEach(group => result.push(group));\n  return result;\n};",
    senior: "const groupAnagrams = words => {\n  const groups = words.reduce((groups, word) => {\n    const key = [...word].sort().join(\"\");\n    const group = groups.get(key);\n    if (group) group.push(word);\n    else groups.set(key, [word]);\n    return groups;\n  }, new Map());\n  return [...groups.values()];\n};",
    hiddenTests: [
      { call: "(() => {const a=String.fromCodePoint(0x1f600,0x1d11e),b=String.fromCodePoint(0x1f51e,0x1d200),reverse=[...a].reverse().join(\"\");const groups=groupAnagrams(Object.freeze([a,b,reverse]));return [groups.length,groups[0][0]===a,groups[0][1]===reverse,groups[1][0]===b,groupAnagrams([\"\u00e9\",\"e\\u0301\",\"\\u0301e\"])];})()", expected: [2, true, true, true, [["\u00e9"], ["e\u0301", "\u0301e"]]] },
      { call: "(() => {const input=[\"ab\",\"ba\",\"x\"];const a=groupAnagrams(input),b=groupAnagrams(input);const e=groupAnagrams([]),f=groupAnagrams([]);a[0].push(\"ab\");a.push([]);return [input,a!==b,a[0]!==b[0],a[0]!==a[1],b,e!==f,groupAnagrams([\"A\",\"a\",\" \",\"\",\" \"])];})()", expected: [["ab", "ba", "x"], true, true, true, [["ab", "ba"], ["x"]], true, [["A"], ["a"], [" ", " "], [""]]] },
      { call: "(() => {const word=\"a\".repeat(100);const input=Object.freeze(Array.from({length:1000},()=>word));const out=groupAnagrams(input);return [out.length,out[0].length,out[0][999]===word,input.length];})()", expected: [1, 1000, true, 1000] },

      { call: 'groupAnagrams(["listen", "silent", "enlist", "google", "gooegl"])', expected: [['listen', 'silent', 'enlist'], ['google', 'gooegl']] },
      { call: 'groupAnagrams(["ab", "ba", "abc"])', expected: [['ab', 'ba'], ['abc']] },
      { call: 'groupAnagrams(["zz"])', expected: [['zz']] },
    ],
  },

  'alg-first-unique-char': {
    solution: "const firstUniqueChar = text => {\n  const counts = new Map();\n  for (const character of text) counts.set(character, (counts.get(character) ?? 0) + 1);\n  for (const character of text) if (counts.get(character) === 1) return character;\n  return null;\n};",
    junior: "const firstUniqueChar = text => {\n  const counts = Object.create(null);\n  for (const character of text) {\n    if (counts[character] === undefined) counts[character] = 1;\n    else counts[character] += 1;\n  }\n  for (const character of text) {\n    if (counts[character] === 1) return character;\n  }\n  return null;\n};",
    senior: "const firstUniqueChar = text => {\n  const counts = new Map();\n  for (const character of text) counts.set(character, (counts.get(character) ?? 0) + 1);\n  for (const [character, count] of counts) if (count === 1) return character;\n  return null;\n};",
    hiddenTests: [
      { call: "[firstUniqueChar(\"\ud83d\ude00\ud83d\ude03\ud83d\ude00\"),firstUniqueChar(\"\ud83d\ude00\"),firstUniqueChar(\"e\\u0301e\"),firstUniqueChar(\"\\ud800x\\ud800\")]", expected: ["\ud83d\ude03", "\ud83d\ude00", "\u0301", "x"] },
      { call: "[firstUniqueChar(\"b2a1b\"),firstUniqueChar(\"\\n a\\n\"),firstUniqueChar(\"\ud83d\ude00\ud83d\ude00\"),firstUniqueChar(\"0a0b\"),firstUniqueChar(\"a\"),firstUniqueChar(\"aa\")]", expected: ["2", " ", null, "a", "a", null] },
      { call: "[firstUniqueChar(\"a\".repeat(999)+\"b\"),firstUniqueChar(\"a\".repeat(1000)),firstUniqueChar(\"\ud83d\ude00\".repeat(499)+\"\ud83d\ude03\")]", expected: ["b", null, "\ud83d\ude03"] },

      { call: 'firstUniqueChar("loveleetcode")', expected: 'v' },
      { call: 'firstUniqueChar("x")', expected: 'x' },
      { call: 'firstUniqueChar("aa b")', expected: ' ' },
      { call: 'firstUniqueChar("aabbcc")', expected: null },
    ],
  },

  'alg-top-k-frequent': {
    solution: "const topKFrequent = (numbers, k) => {\n  if (!(k > 0)) return [];\n  const counts = new Map();\n  for (const value of numbers) counts.set(value, (counts.get(value) ?? 0) + 1);\n  return [...counts.entries()]\n    .sort((left, right) => right[1] - left[1])\n    .slice(0, k)\n    .map(entry => entry[0]);\n};",
    junior: "const topKFrequent = (numbers, k) => {\n  if (k <= 0) {\n    return [];\n  }\n  const counts = new Map();\n  for (let index = 0; index < numbers.length; index += 1) {\n    const value = numbers[index];\n    const seenSoFar = counts.get(value);\n    counts.set(value, seenSoFar === undefined ? 1 : seenSoFar + 1);\n  }\n  const pairs = [];\n  counts.forEach((count, value) => pairs.push({ value, count }));\n  pairs.sort((left, right) => right.count - left.count);\n  const result = [];\n  for (let index = 0; index < pairs.length && index < k; index += 1) {\n    result.push(pairs[index].value);\n  }\n  return result;\n};",
    senior: "const topKFrequent = (numbers, k) => {\n  if (!(k > 0)) return [];\n  const counts = new Map();\n  for (const value of numbers) counts.set(value, (counts.get(value) ?? 0) + 1);\n  const buckets = [];\n  for (const [value, count] of counts) {\n    if (!buckets[count]) buckets[count] = [];\n    buckets[count].push(value);\n  }\n  const result = [];\n  for (let count = buckets.length - 1; count > 0 && result.length < k; count -= 1) {\n    for (const value of buckets[count] ?? []) {\n      if (result.length < k) result.push(value);\n    }\n  }\n  return result;\n};",
    hiddenTests: [
      { call: "(() => {const input=Object.freeze([NaN,Infinity,-0,NaN,-Infinity,0,Infinity,1.5,1.5]);const out=topKFrequent(input,20);return [out.length,Number.isNaN(out[0]),out[1]===Infinity,Object.is(out[2],0),out[3]===1.5,out[4]===-Infinity,input.length];})()", expected: [5, true, true, true, true, true, 9] },
      { call: "(() => {const input=[9,2,9,2,5];const a=topKFrequent(input,2),b=topKFrequent(input,2);const zero=topKFrequent(input,0),zero2=topKFrequent(input,0);const empty=topKFrequent([],3),empty2=topKFrequent([],3);a.push(99);zero.push(1);return [input,a!==b,b,zero!==zero2,zero2,empty!==empty2,empty2];})()", expected: [[9, 2, 9, 2, 5], true, [9, 2], true, [], true, []] },
      { call: "(() => {const input=Object.freeze(Array.from({length:1000},(_,i)=>999-i));const all=topKFrequent(input,2000);return [all.length,all[0],all[999],topKFrequent(input,1),topKFrequent(input,0).length,input[0]];})()", expected: [1000, 999, 0, [999], 0, 999] },

      { call: 'topKFrequent([1], 1)', expected: [1] },
      { call: 'topKFrequent([5, 5, 4, 4, 3, 3], 3)', expected: [5, 4, 3] },
      { call: 'topKFrequent([0, -1, -1], 2)', expected: [-1, 0] },
      { call: 'topKFrequent([2, 2, 2], 1)', expected: [2] },
    ],
  },

  'alg-longest-consecutive': {
    solution: "const longestConsecutive = numbers => {\n  const values = new Set(numbers);\n  let longest = 0;\n  for (const value of values) {\n    if (values.has(value - 1)) continue;\n    let length = 1;\n    while (values.has(value + length)) length += 1;\n    if (length > longest) longest = length;\n  }\n  return longest;\n};",
    junior: "const longestConsecutive = numbers => {\n  const values = new Set();\n  for (let index = 0; index < numbers.length; index += 1) {\n    values.add(numbers[index]);\n  }\n  const unique = Array.from(values);\n  let longest = 0;\n  for (let index = 0; index < unique.length; index += 1) {\n    const value = unique[index];\n    const hasPredecessor = values.has(value - 1);\n    if (hasPredecessor === false) {\n      let current = value;\n      let length = 1;\n      while (values.has(current + 1)) {\n        current = current + 1;\n        length = length + 1;\n      }\n      if (length > longest) {\n        longest = length;\n      }\n    }\n  }\n  return longest;\n};",
    senior: "const longestConsecutive = numbers => {\n  const values = new Set(numbers);\n  const runFrom = start => {\n    let length = 1;\n    while (values.has(start + length)) length += 1;\n    return length;\n  };\n  return [...values].reduce((longest, value) => (values.has(value - 1) ? longest : Math.max(longest, runFrom(value))), 0);\n};",
    hiddenTests: [
      { call: "[longestConsecutive(Object.freeze([1000000000,999999999,-1000000000,-999999999,-999999998])),longestConsecutive(Object.freeze([-0,0,1,2,2])),longestConsecutive([8,6,7,1,2,3]),longestConsecutive([])]", expected: [3, 3, 3, 0] },
      { call: "(() => {const input=[3,1,2,2];const result=longestConsecutive(input);return [result,input,longestConsecutive(Object.freeze([5])),longestConsecutive(Object.freeze([5,5]))];})()", expected: [3, [3, 1, 2, 2], 1, 1] },
      { call: "[longestConsecutive(Object.freeze(Array.from({length:1000},(_,i)=>999-i))),longestConsecutive(Object.freeze(Array.from({length:1000},()=>7))),longestConsecutive(Object.freeze(Array.from({length:1000},(_,i)=>i*2)))]", expected: [1000, 1, 1] },

      { call: 'longestConsecutive([1, 2, 0, 1])', expected: 3 },
      { call: 'longestConsecutive([9])', expected: 1 },
      { call: 'longestConsecutive([4, 2, 1, 6, 5])', expected: 3 },
      { call: 'longestConsecutive([1, 3, 5, 2, 4])', expected: 5 },
    ],
  },

  'alg-valid-palindrome': {
    solution: "const isPalindrome = text => {\n  const keep = /[a-z0-9]/i;\n  let left = 0;\n  let right = text.length - 1;\n  while (left < right) {\n    if (!keep.test(text[left])) { left += 1; continue; }\n    if (!keep.test(text[right])) { right -= 1; continue; }\n    if (text[left].toLowerCase() !== text[right].toLowerCase()) return false;\n    left += 1;\n    right -= 1;\n  }\n  return true;\n};",
    junior: "const isPalindrome = text => {\n  const letters = [];\n  for (let index = 0; index < text.length; index += 1) {\n    const character = text[index];\n    const code = character.charCodeAt(0);\n    const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);\n    const isDigit = code >= 48 && code <= 57;\n    if (isLetter || isDigit) letters.push(character.toLowerCase());\n  }\n  const reversed = letters.slice().reverse();\n  for (let index = 0; index < letters.length; index += 1) {\n    if (letters[index] !== reversed[index]) return false;\n  }\n  return true;\n};",
    senior: "const isPalindrome = text => {\n  // Filter original ASCII characters first; Unicode lowercasing can add ASCII content.\n  const cleaned = text.replace(/[^A-Za-z0-9]/g, \"\").toLowerCase();\n  return cleaned === [...cleaned].reverse().join(\"\");\n};",
    hiddenTests: [
      { call: "[isPalindrome(\"\u212aa\"),isPalindrome(\"\u0130a\"),isPalindrome(\"\u00e9A\"),isPalindrome(\"\u03b1\u03b2\"),isPalindrome(\"\uff112\"),isPalindrome(\"\ud83d\ude00A\ud83d\ude03a\"),isPalindrome(\"a\\u0301B\")]", expected: [true, true, true, true, true, true, false] },
      { call: "[isPalindrome(\"a0A\"),isPalindrome(\"0P\"),isPalindrome(\"1@2@1\"),isPalindrome(\"1@2@3\"),isPalindrome(\"_\\n\\t\"),isPalindrome(\"z\"),isPalindrome(\"ab\"),isPalindrome(\"aba\"),typeof isPalindrome(\"x\")]", expected: [true, false, true, false, true, true, false, true, "boolean"] },
      { call: "[isPalindrome(\"A\".repeat(500)+\"a\".repeat(500)),isPalindrome(\"a\".repeat(999)+\"b\"),isPalindrome(\"!\".repeat(1000)),isPalindrome(\"\u212a\".repeat(500)),isPalindrome(\"\u0130\".repeat(500))]", expected: [true, false, true, true, true] },

      { call: 'isPalindrome("a")', expected: true },
      { call: 'isPalindrome("ab")', expected: false },
      { call: 'isPalindrome("12 21")', expected: true },
      { call: 'isPalindrome("Madam, I\'m Adam")', expected: true },
      { call: 'isPalindrome("1a2")', expected: false },
    ],
  },

  'alg-reverse-words': {
    solution: "const reverseWords = text => text.trim().split(/\\s+/).reverse().join(\" \");",
    junior: "const reverseWords = text => {\n  const pieces = text.split(/\\s+/);\n  const words = [];\n  for (let index = 0; index < pieces.length; index += 1) {\n    if (pieces[index] !== \"\") {\n      words.push(pieces[index]);\n    }\n  }\n  const reversed = [];\n  for (let index = words.length - 1; index >= 0; index -= 1) {\n    reversed.push(words[index]);\n  }\n  return reversed.join(\" \");\n};",
    senior: "const reverseWords = text =>\n  text.split(/\\s+/).filter(Boolean).reverse().join(\" \");",
    hiddenTests: [
      { call: "[reverseWords(\"one\\ntwo\\r\\nthree\"),reverseWords(\"\\ufeffa\\u00a0b\\ufeff\"),reverseWords(\"a\\u200bb c\"),reverseWords(\"a\\u0085b c\"),reverseWords(\"\\t\\n\\r\\u00a0\\ufeff\")]", expected: ["three two one", "b a", "c a\u200bb", "c a\u0085b", ""] },
      { call: "[reverseWords(\"\ud83d\ude00a e\\u0301\"),reverseWords(\"\\ud800x y\\udc00\"),reverseWords(\"  AbC!\\tX.Y  \"),reverseWords(\"one\"),reverseWords(\"\"),reverseWords(\"one two\")]", expected: ["e\u0301 \ud83d\ude00a", "y\udc00 \ud800x", "X.Y AbC!", "one", "", "two one"] },
      { call: "(() => {const input=\"a \".repeat(499)+\"bc\";const result=reverseWords(input);return [input.length,result.startsWith(\"bc a\"),result.split(\" \").length,reverseWords(\" \".repeat(1000))];})()", expected: [1000, true, 500, ""] },

      { call: 'reverseWords("a good   example")', expected: 'example good a' },
      { call: 'reverseWords("  x  ")', expected: 'x' },
      { call: 'reverseWords("one two three four")', expected: 'four three two one' },
    ],
  },

  'alg-chunk-array': {
    solution: "const chunk = (items, size) => {\n  if (!Number.isInteger(size) || size < 1) return [];\n  const pieces = [];\n  for (let start = 0; start < items.length; start += size) {\n    pieces.push(items.slice(start, start + size));\n  }\n  return pieces;\n};",
    junior: "const chunk = (items, size) => {\n  if (Number.isInteger(size) === false || size < 1) {\n    return [];\n  }\n  const pieces = [];\n  let current = [];\n  for (let index = 0; index < items.length; index += 1) {\n    current.push(items[index]);\n    if (current.length === size) {\n      pieces.push(current);\n      current = [];\n    }\n  }\n  if (current.length > 0) {\n    pieces.push(current);\n  }\n  return pieces;\n};",
    senior: "const chunk = (items, size) =>\n  Number.isInteger(size) && size > 0\n    ? Array.from({ length: Math.ceil(items.length / size) }, (_, piece) => items.slice(piece * size, piece * size + size))\n    : [];",
    hiddenTests: [
      { call: "(() => {const object=Object.freeze({x:1}),symbol=Symbol(\"s\"),fn=()=>0;const input=Object.freeze([object,undefined,symbol,fn,null,-0]);const a=chunk(input,2),b=chunk(input,2);a[0].push(9);return [a.length,a[0][0]===object,a[0][1]===undefined,a[1][0]===symbol,a[1][1]===fn,a[2][0]===null,Object.is(a[2][1],-0),a!==b,a[0]!==b[0],a[0]!==a[1],b[0].length,input.length];})()", expected: [3, true, true, true, true, true, true, true, true, true, 2, 6] },
      { call: "(() => {const input=[1,2];const a=chunk(input,5),b=chunk(input,Number.MAX_VALUE);a[0].push(3);const empty=chunk([],1),empty2=chunk([],1),bad=chunk(input,\"2\"),bad2=chunk(input,\"2\");bad.push([]);const invalid=[NaN,Infinity,-Infinity,0,-0,-1,1.5,\"2\",true,null,undefined,2n,Symbol(\"s\"),new Number(2),{valueOf(){throw Error(\"no coercion\");}}].map(size=>chunk(input,size).length);return [input,a[0]!==input,b[0]!==input,b,empty!==empty2,bad!==bad2,bad2.length,invalid];})()", expected: [[1, 2], true, true, [[1, 2]], true, true, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]] },
      { call: "(() => {const input=Object.freeze(Array.from({length:1000},(_,i)=>i));const ones=chunk(input,1),parts=chunk(input,333);return [ones.length,ones[0][0],ones[999][0],parts.map(part=>part.length),parts[3][0],input.length];})()", expected: [1000, 0, 999, [333, 333, 333, 1], 999, 1000] },

      { call: 'chunk([1, 2, 3], -1)', expected: [] },
      { call: 'chunk([1, 2, 3], 1.5)', expected: [] },
      { call: 'chunk(["a", "b", "c"], 2)', expected: [['a', 'b'], ['c']] },
      { call: '(() => { const source = [1, 2, 3]; chunk(source, 2); return source; })()', expected: [1, 2, 3] },
    ],
  },

  'alg-merge-sorted': {
    solution: "const mergeSorted = (a, b) => {\n  const merged = [];\n  let i = 0;\n  let j = 0;\n  while (i < a.length && j < b.length) {\n    if (a[i] <= b[j]) { merged.push(a[i]); i += 1; }\n    else { merged.push(b[j]); j += 1; }\n  }\n  while (i < a.length) { merged.push(a[i]); i += 1; }\n  while (j < b.length) { merged.push(b[j]); j += 1; }\n  return merged;\n};",
    junior: "const mergeSorted = (a, b) => {\n  const merged = [];\n  let indexA = 0;\n  let indexB = 0;\n  while (indexA < a.length && indexB < b.length) {\n    const left = a[indexA];\n    const right = b[indexB];\n    if (left <= right) {\n      merged.push(left);\n      indexA = indexA + 1;\n    } else {\n      merged.push(right);\n      indexB = indexB + 1;\n    }\n  }\n  for (let index = indexA; index < a.length; index += 1) {\n    merged.push(a[index]);\n  }\n  for (let index = indexB; index < b.length; index += 1) {\n    merged.push(b[index]);\n  }\n  return merged;\n};",
    senior: "const mergeSorted = (a, b) => {\n  const merged = [];\n  let i = 0;\n  let j = 0;\n  while (i < a.length || j < b.length) {\n    const takeLeft = j >= b.length || (i < a.length && a[i] <= b[j]);\n    merged.push(takeLeft ? a[i++] : b[j++]);\n  }\n  return merged;\n};",
    hiddenTests: [
      { call: "(() => {const a=Object.freeze([-0,0.5,2]),b=Object.freeze([0,0.5,1]);const out=mergeSorted(a,b);return [out.length,Object.is(out[0],-0),Object.is(out[1],0),out.slice(2),a.length,b.length,mergeSorted(a,a).slice(2)];})()", expected: [6, true, true, [0.5, 0.5, 1, 2], 3, 3, [0.5, 0.5, 2, 2]] },
      { call: "(() => {const a=[1,3],b=[2];const out=mergeSorted(a,b),again=mergeSorted(a,b);out.push(4);const empty=mergeSorted([],[]),empty2=mergeSorted([],[]),left=[],right=[1,2];const single=mergeSorted(left,right);single.push(3);return [a,b,out!==again,again,empty!==empty2,left,right,single!==right,mergeSorted(Object.freeze([1,2]),Object.freeze([]))];})()", expected: [[1, 3], [2], true, [1, 2, 3], true, [], [1, 2], true, [1, 2]] },
      { call: "(() => {const a=Object.freeze(Array.from({length:1000},(_,i)=>i*2)),b=Object.freeze(Array.from({length:1000},(_,i)=>i*2+1));const out=mergeSorted(a,b);return [out.length,out[0],out[1999],out.every((value,index)=>value===index),a.length,b.length];})()", expected: [2000, 0, 1999, true, 1000, 1000] },

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
  if (length === 0) return numbers;
  const steps = ((k % length) + length) % length;
  const reverse = (first, last) => {
    while (first < last) {
      const held = numbers[first];
      numbers[first] = numbers[last];
      numbers[last] = held;
      first += 1;
      last -= 1;
    }
  };
  reverse(0, length - 1);
  reverse(0, steps - 1);
  reverse(steps, length - 1);
  return numbers;
};`,
    senior: `const rotate = (numbers, k) => {
  const length = numbers.length;
  if (length === 0) return numbers;
  const steps = ((k % length) + length) % length;
  let moved = 0;
  for (let start = 0; moved < length; start += 1) {
    let index = start;
    let carried = numbers[index];
    do {
      const next = (index + steps) % length;
      const held = numbers[next];
      numbers[next] = carried;
      carried = held;
      index = next;
      moved += 1;
    } while (index !== start);
  }
  return numbers;
};`,
    hiddenTests: [
      { call: "(() => {const object=Object.freeze({id:1}),symbol=Symbol(\"s\"),fn=()=>0;const a=[object,undefined,symbol,fn,-0];const result=rotate(a,-2);return [result===a,a.length,a[0]===symbol,a[1]===fn,Object.is(a[2],-0),a[3]===object,a[4]===undefined];})()", expected: [true, 5, true, true, true, true, true] },
      { call: "(() => {for(let n=0;n<=9;n++){for(const k of [-Number.MAX_SAFE_INTEGER,-100,-12,-3,-1,-0,0,1,3,12,100,Number.MAX_SAFE_INTEGER]){const a=Array.from({length:n},(_,i)=>i),original=a.slice();const step=n?((k%n)+n)%n:0;const wanted=step?original.slice(n-step).concat(original.slice(0,n-step)):original;if(rotate(a,k)!==a||a.length!==n||!a.every((value,index)=>Object.is(value,wanted[index])))return false;}}return true;})()", expected: true },
      { call: "(() => {const values=Array.from({length:2000},(_,i)=>i);const first=rotate(values,1000)===values&&values.every((v,i)=>v===(i+1000)%2000);const second=rotate(values,-1000)===values&&values.every((v,i)=>v===i);const empty=[];return [first,second,rotate(empty,-1)===empty];})()", expected: [true, true, true] },

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
  numbers.reduce((missing, value, index) => missing + index - value, numbers.length);`,
    hiddenTests: [
      { call: "(() => {const input=[2,0];const original=input.slice();return [missingNumber(input),input.every((n,i)=>n===original[i]),missingNumber(Object.freeze([0,1,3])),missingNumber(Object.freeze([]))];})()", expected: [1, true, 2, 0] },
      { call: "(() => {for(let n=0;n<=24;n++){for(let missing=0;missing<=n;missing++){const values=Object.freeze(Array.from({length:n+1},(_,i)=>i).filter(i=>i!==missing).reverse());if(missingNumber(values)!==missing)return false;}}return true;})()", expected: true },
      { call: "[missingNumber(Object.freeze(Array.from({length:2000},(_,i)=>2000-i))),missingNumber(Object.freeze(Array.from({length:2000},(_,i)=>i))),missingNumber(Object.freeze(Array.from({length:2001},(_,i)=>i).filter(i=>i!==1337)))]", expected: [0, 2000, 1337] },

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
  let end = 0;
  let longest = 0;
  for (const character of text) {
    const seenAt = lastSeen.get(character);
    if (seenAt !== undefined && seenAt >= start) start = seenAt + 1;
    lastSeen.set(character, end);
    const width = end - start + 1;
    if (width > longest) longest = width;
    end += 1;
  }
  return longest;
};`,
    junior: `const lengthOfLongestSubstring = text => {
  const window = new Set();
  const leaving = text[Symbol.iterator]();
  let start = 0;
  let end = 0;
  let longest = 0;
  for (const character of text) {
    while (window.has(character)) {
      window.delete(leaving.next().value);
      start += 1;
    }
    window.add(character);
    end += 1;
    const width = end - start;
    if (width > longest) longest = width;
  }
  return longest;
};`,
    senior: `const lengthOfLongestSubstring = text => {
  const lastSeen = new Map();
  let start = 0, end = 0, longest = 0;
  for (const character of text) {
    start = Math.max(start, (lastSeen.get(character) ?? -1) + 1);
    lastSeen.set(character, end);
    longest = Math.max(longest, ++end - start);
  }
  return longest;
};`,
    hiddenTests: [
      { call: "[lengthOfLongestSubstring(\"\ud83d\ude00\ud83d\ude03\"),lengthOfLongestSubstring(\"\ud83d\ude00a\ud83d\ude00b\"),lengthOfLongestSubstring(\"e\\u0301\u00e9\"),lengthOfLongestSubstring(\"Aa \"),lengthOfLongestSubstring(\"\\ud800a\\ud800b\"),lengthOfLongestSubstring(\"\ud83d\udc69\\u200d\ud83d\udcbb\"),lengthOfLongestSubstring(\"a\\u0000b\\u0000\")]", expected: [2, 3, 3, 3, 3, 3, 3] },
      { call: "(() => {const alphabet=[\"a\",\"b\",\"\ud83d\ude00\",\"\\u0301\"];for(let n=0;n<=5;n++){for(let code=0;code<Math.pow(4,n);code++){let digits=code;const units=[];for(let i=0;i<n;i++){units.push(alphabet[digits%4]);digits=Math.floor(digits/4);}let wanted=0;for(let start=0;start<n;start++){const seen=new Set();for(let end=start;end<n&&!seen.has(units[end]);end++){seen.add(units[end]);wanted=Math.max(wanted,end-start+1);}}if(lengthOfLongestSubstring(units.join(\"\"))!==wanted)return false;}}return true;})()", expected: true },
      { call: "[lengthOfLongestSubstring(\"\ud83d\ude00\".repeat(2000)),lengthOfLongestSubstring(Array.from({length:2000},(_,i)=>String.fromCodePoint(0x10000+i)).join(\"\")),lengthOfLongestSubstring(\"ab\".repeat(2000)),lengthOfLongestSubstring(\"abba\"),lengthOfLongestSubstring(\"\")]", expected: [1, 2000, 2, 2, 0] },

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
  if (!Number.isInteger(k) || k < 1 || numbers.length < k) return null;
  let total = 0;
  let best = null;
  for (let end = 0; end < numbers.length; end += 1) {
    total += numbers[end];
    if (end >= k) total -= numbers[end - k];
    if (end >= k - 1 && (best === null || total > best)) best = total;
  }
  return best;
};`,
    senior: `const maxSumSubarray = (numbers, k) => {
  if (!Number.isInteger(k) || k < 1 || numbers.length < k) return null;
  let windowSum = 0;
  for (let index = 0; index < k; index += 1) windowSum += numbers[index];
  let best = windowSum;
  for (let end = k; end < numbers.length; end += 1) {
    windowSum += numbers[end] - numbers[end - k];
    best = Math.max(best, windowSum);
  }
  return best;
};`,
    hiddenTests: [
      { call: "(() => {const input=[4,-2,3],before=input.slice();const value=maxSumSubarray(input,2);return [value,input.every((v,i)=>v===before[i]),maxSumSubarray(Object.freeze([-1000000,-1000000,1000000]),2),maxSumSubarray(Object.freeze([3,2,1]),3)];})()", expected: [2, true, 0, 6] },
      { call: "(() => {const invalid=[0,-0,-1,1.5,NaN,Infinity,-Infinity,\"2\",true,null,undefined,2n,Symbol(\"s\"),new Number(2),{valueOf(){throw Error(\"coercion\");}}];const input=[1,2,3];const trap=[];Object.defineProperty(trap,0,{get(){throw Error(\"element read\");}});return [invalid.every(k=>maxSumSubarray(input,k)===null),invalid.every(k=>maxSumSubarray(trap,k)===null),maxSumSubarray([],1),maxSumSubarray(input,Number.MAX_VALUE)];})()", expected: [true, true, null, null] },
      { call: "(() => {for(let n=0;n<=5;n++){for(let code=0;code<Math.pow(3,n);code++){let digits=code;const values=[];for(let i=0;i<n;i++){values.push(digits%3-1);digits=Math.floor(digits/3);}for(let k=1;k<=n+1;k++){let wanted=null;for(let start=0;start+k<=n;start++){let total=0;for(let i=start;i<start+k;i++)total+=values[i];if(wanted===null||total>wanted)wanted=total;}if(maxSumSubarray(Object.freeze(values),k)!==wanted)return false;}}}return maxSumSubarray(Object.freeze(Array(2000).fill(1000000)),2000)===2000000000;})()", expected: true },

      { call: 'maxSumSubarray([5], 1)', expected: 5 },
      { call: 'maxSumSubarray([1, 1, 1, 1], 2)', expected: 2 },
      { call: 'maxSumSubarray([4, -1, 2, 1], 2)', expected: 3 },
      { call: 'maxSumSubarray([1, 2, 3], -2)', expected: null },
      { call: 'maxSumSubarray([-5, -1, -9], 1)', expected: -1 },
      { call: 'maxSumSubarray([1, 2, 3, 4], 1.5)', expected: null },
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
  let left = 0;
  let right = heights.length - 1;
  let best = 0;
  while (left < right) {
    const leftHeight = heights[left];
    const rightHeight = heights[right];
    const area = (right - left) * Math.min(leftHeight, rightHeight);
    if (area > best) best = area;
    if (leftHeight <= rightHeight) left += 1;
    else right -= 1;
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
      { call: "(() => {const input=[1,4,2],copy=input.slice();return [maxArea(input),input.every((v,i)=>Object.is(v,copy[i])),maxArea(Object.freeze([.5,3,.5])),maxArea(Object.freeze([-0,0])),maxArea(Object.freeze([]))];})()", expected: [2, true, 1, 0, 0] },
      { call: "(() => {const alphabet=[0,.5,1,3];for(let n=0;n<=5;n++){for(let code=0;code<Math.pow(4,n);code++){let digits=code;const heights=[];for(let i=0;i<n;i++){heights.push(alphabet[digits%4]);digits=Math.floor(digits/4);}let wanted=0;for(let left=0;left<n;left++)for(let right=left+1;right<n;right++)wanted=Math.max(wanted,(right-left)*Math.min(heights[left],heights[right]));if(maxArea(Object.freeze(heights))!==wanted)return false;}}return true;})()", expected: true },
      { call: "[maxArea(Object.freeze(Array(2000).fill(1000000))),maxArea(Object.freeze(Array(2000).fill(0))),maxArea(Object.freeze([1,1000000,1])),maxArea(Object.freeze([1000000,1,1000000]))]", expected: [1999000000, 0, 2, 2000000] },

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
  let write = 0;
  for (let read = 0; read < numbers.length; read += 1) {
    if (numbers[read] !== 0) {
      numbers[write] = numbers[read];
      write += 1;
    }
  }
  while (write < numbers.length) {
    numbers[write] = 0;
    write += 1;
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
      { call: "(() => {const values=[NaN,-0,0,Infinity,-Infinity,Number.MIN_VALUE,-2,2.5];const returned=moveZeroes(values);return [returned===values,values.length,Number.isNaN(values[0]),values[1]===Infinity,values[2]===-Infinity,values[3]===Number.MIN_VALUE,values[4]===-2,values[5]===2.5,values[6]===0,values[7]===0];})()", expected: [true, 8, true, true, true, true, true, true, true, true] },
      { call: "(() => {const alphabet=[0,-0,NaN,-2,Infinity];for(let n=0;n<=4;n++){for(let code=0;code<Math.pow(5,n);code++){let digits=code;const values=[];for(let i=0;i<n;i++){values.push(alphabet[digits%5]);digits=Math.floor(digits/5);}const kept=values.filter(value=>value!==0),wanted=kept.concat(Array(n-kept.length).fill(0));if(moveZeroes(values)!==values||values.length!==n||Object.keys(values).length!==n||!values.every((value,i)=>value===wanted[i]||(Number.isNaN(value)&&Number.isNaN(wanted[i]))))return false;}}return true;})()", expected: true },
      { call: "(() => {const values=Array.from({length:2000},(_,i)=>i%2?i:0);const result=moveZeroes(values);const zeros=[-0,0,-0],empty=[];return [result===values,values.length,values.slice(0,1000).every((v,i)=>v===i*2+1),values.slice(1000).every(v=>v===0),moveZeroes(zeros)===zeros,zeros.every(v=>v===0),moveZeroes(empty)===empty];})()", expected: [true, 2000, true, true, true, true, true] },

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
      { call: "[isValid(\"(\".repeat(10000)+\")\".repeat(10000)),isValid(\"[\".repeat(10000)+\"]\".repeat(9999)),isValid(\"{\".repeat(9999)+\"[\"+\")\"+\"}\".repeat(9999))]", expected: [true, false, false] },
      { call: "(() => {const chars=\"()[]{}\";for(let n=0;n<=4;n++)for(let code=0;code<6**n;code++){let x=code,text=\"\";for(let i=0;i<n;i++){text+=chars[x%6];x=Math.floor(x/6);}let reduced=text,previous;do{previous=reduced;reduced=reduced.replace(/[(][)]|[\\[][\\]]|[{][}]/g,\"\");}while(reduced!==previous);if(isValid(text)!==(reduced.length===0))return false;}return true;})()", expected: true },
      { call: "[isValid(\"{[(\".repeat(100)+\")]}\".repeat(100)),isValid(\"()[]{}\".repeat(3000)),isValid(\"([)]\"),isValid(\"\"),isValid(\"[]\")]", expected: [true, true, false, true, true] },

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
      { call: "(() => {const source=[[0,.5],[.5,1],[2,2]],copy=source.map(p=>p.slice()),out=mergeIntervals(source);if(out===source||out.some(pair=>source.includes(pair))||new Set(out).size!==out.length)return false;out[0][1]=99;const frozen=Object.freeze(source.map(pair=>Object.freeze(pair.slice())));return source.every((pair,i)=>pair.every((v,j)=>Object.is(v,copy[i][j])))&&JSON.stringify(mergeIntervals(frozen))===\"[[0,1],[2,2]]\";})()", expected: true },
      { call: "(() => {const choices=[[0,0],[0,.5],[.5,.5],[.5,1],[1,1],[2,3]];for(let n=0;n<=4;n++)for(let code=0;code<6**n;code++){let digits=code;const input=[];for(let i=0;i<n;i++){input.push(Object.freeze(choices[digits%6].slice()));digits=Math.floor(digits/6);}const visited=new Set(),wanted=[];for(let i=0;i<n;i++){if(visited.has(i))continue;const stack=[i];visited.add(i);let low=input[i][0],high=input[i][1];while(stack.length){const at=stack.pop();low=Math.min(low,input[at][0]);high=Math.max(high,input[at][1]);for(let j=0;j<n;j++)if(!visited.has(j)&&Math.max(input[at][0],input[j][0])<=Math.min(input[at][1],input[j][1])){visited.add(j);stack.push(j);}}wanted.push([low,high]);}wanted.sort((a,b)=>a[0]-b[0]);if(JSON.stringify(mergeIntervals(Object.freeze(input)))!==JSON.stringify(wanted))return false;}return true;})()", expected: true },
      { call: "(() => {const input=Object.freeze(Array.from({length:2000},(_,i)=>Object.freeze([i/2,(i+1)/2]))),points=Object.freeze(Array.from({length:2000},(_,i)=>Object.freeze([i*2,i*2]))),a=mergeIntervals(input),b=mergeIntervals(points),empty=[];return [a,b.length,b.every((pair,i)=>pair!==points[i]&&pair[0]===i*2&&pair[1]===i*2),mergeIntervals(empty)!==empty,mergeIntervals(empty)!==mergeIntervals(empty)];})()", expected: [[[0, 1000]], 2000, true, true, true] },

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
      { call: "(() => {const payload=Symbol(\"payload\"),a=Object.freeze(Object.assign(Object.create(null),{name:\"a\",priority:.5,payload})),b=Object.freeze({name:\"Z\",priority:.5}),source=Object.freeze([a,b]),out=sortTasks(source);out.push(a);return [out!==source,out[0]===b,out[1]===a,out[1].payload===payload,source[0]===a,sortTasks(Object.freeze([]))!==sortTasks(Object.freeze([])),sortTasks(Object.freeze([{name:\"x\",priority:-0},{name:\"x\",priority:0}])).map(x=>Object.is(x.priority,-0))];})()", expected: [true, true, true, true, true, true, [true, false]] },
      { call: "(() => {const choices=[{name:\"\",priority:0},{name:\"a\",priority:.5},{name:\"Z\",priority:.5},{name:\"\u00e4\",priority:-1},{name:\"\ud83d\ude00\",priority:.5},{name:\"a\",priority:.5}];for(let n=0;n<=4;n++)for(let code=0;code<6**n;code++){let digits=code;const input=[];for(let i=0;i<n;i++){input.push(Object.freeze({...choices[digits%6],index:i}));digits=Math.floor(digits/6);}const wanted=input.slice();const before=(a,b)=>a.priority>b.priority||(a.priority===b.priority&&(a.name<b.name||(a.name===b.name&&a.index<b.index)));for(let i=0;i<n;i++){let at=i;for(let j=i+1;j<n;j++)if(before(wanted[j],wanted[at]))at=j;const value=wanted.splice(at,1)[0];wanted.splice(i,0,value);}const got=sortTasks(Object.freeze(input));if(got===input||got.length!==n||got.some((value,i)=>value!==wanted[i]))return false;}return true;})()", expected: true },
      { call: "(() => {const input=Object.freeze(Array.from({length:2000},(_,i)=>Object.freeze({name:\"same\",priority:1,index:i}))),out=sortTasks(input),names=[\"a\",\"Z\",\"\u00e4\",\"\ud83d\ude00\",\"\\ud800\\udc00\",\"\\ud800\",\"\\udfff\",\"\"];const records=Object.freeze(names.map(name=>Object.freeze({name,priority:0}))),sorted=sortTasks(records);return [out!==input,out.every((record,i)=>record===input[i]),sorted.map(record=>record.name),sorted.every(record=>records.includes(record))];})()", expected: [true, true, ["", "Z", "a", "\u00e4", "\ud800", "\ud800\udc00", "\ud83d\ude00", "\udfff"], true] },

      { call: 'sortTasks([{ name: "a", priority: 1 }])', expected: [{ name: 'a', priority: 1 }] },
      { call: 'sortTasks([{ name: "b", priority: 0 }, { name: "a", priority: 0 }, { name: "c", priority: 9 }])', expected: [{ name: 'c', priority: 9 }, { name: 'a', priority: 0 }, { name: 'b', priority: 0 }] },
      { call: 'sortTasks([{ name: "x", priority: 2 }, { name: "y", priority: 20 }, { name: "z", priority: 3 }]).map(task => task.priority)', expected: [20, 3, 2] },
    ],
  },
  'alg-deep-flatten': {
    solution: `const deepFlatten = items => {
  const flat = [];
  const visit = values => {
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (Array.isArray(value)) visit(value);
      else flat.push(value);
    }
  };
  visit(items);
  return flat;
};`,
    junior: `const deepFlatten = items => {
  const output = [];
  const walk = values => {
    let index = 0;
    while (index < values.length) {
      const value = values[index];
      if (Array.isArray(value)) {
        walk(value);
      } else {
        output.push(value);
      }
      index += 1;
    }
  };
  walk(items);
  return output;
};`,
    senior: `const deepFlatten = items => {
  const output = [];
  const frames = [{ values: items, next: 0 }];
  while (frames.length) {
    const current = frames[frames.length - 1];
    if (current.next === current.values.length) {
      frames.pop();
      continue;
    }
    const value = current.values[current.next++];
    if (Array.isArray(value)) frames.push({ values: value, next: 0 });
    else output.push(value);
  }
  return output;
};`,
    hiddenTests: [
      { call: "(() => {const token=Symbol(\"leaf\"),payload={};payload.self=payload;Object.freeze(payload);let calls=0;const fn=()=>{calls++;},date=new Date(0),nested=Object.freeze([null,false,0,-0,NaN,Infinity,token,3n,payload,fn,date]),source=Object.freeze([undefined,nested]),out=deepFlatten(source);const ok=Array.isArray(out)&&out!==source&&out.length===12&&Object.hasOwn(out,0)&&out[0]===undefined&&out[1]===null&&out[2]===false&&Object.is(out[3],0)&&Object.is(out[4],-0)&&Number.isNaN(out[5])&&out[6]===Infinity&&out[7]===token&&out[8]===3n&&out[9]===payload&&out[10]===fn&&out[11]===date&&calls===0&&date.getTime()===0;out[0]=\"changed\";return ok&&source[0]===undefined&&source[1]===nested&&payload.self===payload;})()", expected: true },
      { call: "(() => {const marker=Object.freeze({leaf:1}),choices=[{value:null,want:[null]},{value:undefined,want:[undefined]},{value:Object.freeze([]),want:[]},{value:Object.freeze([0,false]),want:[0,false]},{value:Object.freeze([Object.freeze([marker]),-0]),want:[marker,-0]},{value:Object.freeze([Object.freeze([undefined]),\"\"]),want:[undefined,\"\"]}];for(let n=0;n<=4;n++)for(let code=0;code<6**n;code++){let digits=code;const input=[],wanted=[];for(let i=0;i<n;i++){const chosen=choices[digits%6];digits=Math.floor(digits/6);input.push(chosen.value);for(const value of chosen.want)wanted.push(value);}const out=deepFlatten(Object.freeze(input));if(out===input||out.length!==wanted.length||out.some((value,i)=>!Object.is(value,wanted[i])))return false;}return true;})()", expected: true },
      { call: "(() => {const marker=Object.freeze({id:1});let nested=Object.freeze([marker]);for(let i=1;i<64;i++)nested=Object.freeze([nested]);const deep=deepFlatten(nested),wide=deepFlatten(Object.freeze(Array.from({length:20000},(_,i)=>i))),shared=Object.freeze([marker]),repeated=deepFlatten(Object.freeze([shared,shared])),nullProto=Object.freeze(Object.setPrototypeOf([1,Object.freeze([2])],null)),empty=Object.freeze([]),a=deepFlatten(empty),b=deepFlatten(empty);a.push(marker);return [deep.length,deep[0]===marker,wide.length,wide.every((value,i)=>value===i),repeated.length,repeated[0]===marker&&repeated[1]===marker,deepFlatten(nullProto),a!==b,b.length];})()", expected: [1, true, 20000, true, 2, true, [1, 2], true, 0] },

      { call: 'deepFlatten([[[[[1]]]]])', expected: [1] },
      { call: 'deepFlatten([1, 2, 3])', expected: [1, 2, 3] },
      { call: 'deepFlatten([[1, [2]], [[3], 4], 5])', expected: [1, 2, 3, 4, 5] },
      { call: 'deepFlatten([undefined, [undefined]])', expected: [undefined, undefined] },
    ],
  },

  'alg-deep-clone': {
    solution: `const deepClone = value => {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return Array.from({ length: value.length }, (_, index) => deepClone(value[index]));
  const copy = Object.create(null);
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
  const copy = Object.create(null);
  const keys = Object.keys(value);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    copy[key] = deepClone(value[key]);
  }
  return copy;
};`,
    senior: `const deepClone = value => {
  if (value === null || typeof value !== "object") return value;
  return Array.isArray(value)
    ? Array.from({ length: value.length }, (_, index) => deepClone(value[index]))
    : Object.fromEntries(Object.entries(value).map(([key, child]) => [key, deepClone(child)]));
};`,
    hiddenTests: [
      { call: "(() => {const hidden=Symbol(\"hidden\"),source=Object.defineProperty({constructor:{data:1},prototype:[2]},\"__proto__\",{value:{safe:3},enumerable:true,writable:true,configurable:true});Object.defineProperty(source,\"secret\",{value:{ignore:1},enumerable:false});source[hidden]={ignore:2};Object.freeze(source.constructor);Object.freeze(source.prototype);Object.freeze(source.__proto__);Object.freeze(source);const out=deepClone(source),descriptor=Object.getOwnPropertyDescriptor(out,\"__proto__\");if(!descriptor||descriptor.value===source.__proto__||descriptor.value.safe!==3||!descriptor.writable||!descriptor.enumerable||!descriptor.configurable||Object.hasOwn(out,\"secret\")||Object.getOwnPropertySymbols(out).length||out.constructor===source.constructor||out.prototype===source.prototype||![Object.prototype,null].includes(Object.getPrototypeOf(out)))return false;out.__proto__.safe=9;return source.__proto__.safe===3&&Object.getPrototypeOf(source)===Object.prototype;})()", expected: true },
      { call: "(() => {const token=Symbol(\"leaf\");let calls=0;const fn=()=>{calls++;},array=(()=>{const values=Object.setPrototypeOf([undefined,-0,NaN,Infinity,3n,token,fn],null);values.extra=Object.freeze({ignored:1});values[Symbol.iterator]=()=>{calls++;throw Error(\"ignored iterator invoked\");};return Object.freeze(values);})(),shared=Object.freeze({x:1}),source=Object.freeze(Object.assign(Object.create(null),{array,a:shared,b:shared})),out=deepClone(source),again=deepClone(source);const distinct=deepClone({a:{x:1},b:{x:1}});if(distinct.a===distinct.b||Object.hasOwn(out.array,\"extra\")||Object.getOwnPropertySymbols(out.array).length||out===source||out===again||out.array===array||out.array===again.array||out.a===shared||out.b===shared||out.a===again.a||out.b===again.b||!Array.isArray(out.array)||out.array.length!==7)return false;for(let i=0;i<7;i++)if(!Object.hasOwn(out.array,i)||!Object.is(out.array[i],array[i]))return false;out.array[0]=9;out.a.x=7;return array[0]===undefined&&shared.x===1&&again.a.x===1&&calls===0&&deepClone(fn)===fn&&deepClone(token)===token&&Object.is(deepClone(-0),-0);})()", expected: true },
      { call: "(() => {const choices=[null,undefined,-0,Object.freeze({a:Object.freeze([1,2])}),Object.freeze([NaN,3n]),Symbol(\"leaf\")],verify=(source,out,originals)=>{if(source===null||typeof source!==\"object\")return Object.is(source,out);if(out===null||typeof out!==\"object\"||originals.has(out)||Array.isArray(source)!==Array.isArray(out))return false;const keys=Array.isArray(source)?Array.from({length:source.length},(_,i)=>String(i)):Object.keys(source);if(Array.isArray(source)&&out.length!==source.length||Object.keys(out).length!==keys.length)return false;return keys.every(key=>Object.hasOwn(out,key)&&verify(source[key],out[key],originals));};for(let n=0;n<=4;n++)for(let code=0;code<6**n;code++){let digits=code;const source=[];for(let i=0;i<n;i++){source.push(choices[digits%6]);digits=Math.floor(digits/6);}Object.freeze(source);const originals=new Set([source]);const collect=value=>{if(value!==null&&typeof value===\"object\"&&!originals.has(value)){originals.add(value);for(const child of Object.values(value))collect(child);}};for(const child of source)collect(child);if(!verify(source,deepClone(source),originals))return false;}let nested=Object.freeze({leaf:1});for(let i=1;i<64;i++)nested=Object.freeze({child:nested});let out=deepClone(nested),input=nested;for(let i=1;i<64;i++){if(out===input)return false;out=out.child;input=input.child;}if(out===input||out.leaf!==1)return false;const wide=Object.freeze(Array.from({length:20000},(_,i)=>i)),copy=deepClone(wide);return copy!==wide&&copy.length===20000&&copy.every((v,i)=>v===i)&&deepClone(Object.freeze([]))!==deepClone(Object.freeze([]));})()", expected: true },

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
      { call: "(() => {const hidden=Symbol(\"ignored\"),bag=Object.assign(Object.create({inherited:100}),{own:2,missing:undefined});bag[hidden]=1000;Object.defineProperty(bag,\"secret\",{value:1000,enumerable:false});Object.freeze(bag);const array=Array(3);array[1]=2;array.extra=4;Object.freeze(array);let calls=0;const fn=()=>{calls++;};fn.ignored=99;Object.freeze(fn);return [sumValues(bag),sumValues(array),sumValues(fn),calls,sumValues({a:1e9,b:[-1e9,1e-8]}),Number.isNaN(sumValues({a:[Infinity,-Infinity]})),sumValues([NaN,Infinity])===Infinity,sumValues(-0)===0,sumValues(3n),sumValues(Symbol(\"leaf\"))];})()", expected: [2, 6, 0, 0, 0, true, true, true, 0, 0] },
      { call: "(() => {let calls=0;const fn=()=>{calls++;};fn.notVisited=999;Object.freeze(fn);const object=Object.freeze(Object.assign(Object.create(null),{x:3,ignore:\"4\"})),choices=[{value:1,sum:1},{value:NaN,sum:0},{value:Object.freeze([-2,.5]),sum:-1.5},{value:object,sum:3},{value:Object.freeze({x:Object.freeze([1,-1]),ignore:undefined}),sum:0},{value:fn,sum:0}];for(let n=0;n<=4;n++)for(let code=0;code<6**n;code++){let digits=code,wanted=0;const input=[];for(let i=0;i<n;i++){const chosen=choices[digits%6];digits=Math.floor(digits/6);input.push(chosen.value);wanted+=chosen.sum;}if(sumValues(Object.freeze(input))!==wanted)return false;}return calls===0;})()", expected: true },
      { call: "(() => {let nested=7;for(let i=0;i<64;i++)nested=Object.freeze({child:nested});const array=Object.freeze(Array(20000).fill(1)),object=Object.freeze(Object.fromEntries(Array.from({length:20000},(_,i)=>[\"k\"+i,1]))),shared=Object.freeze({a:3}),source=Object.freeze({a:shared,b:shared});return [sumValues(nested),sumValues(array),sumValues(object),sumValues(source),source.a===shared,source.b===shared,shared.a];})()", expected: [7, 20000, 20000, 6, true, true, 3] },

      { call: 'sumValues([])', expected: 0 },
      { call: 'sumValues(null)', expected: 0 },
      { call: 'sumValues({ a: { b: { c: { d: 10 } } } })', expected: 10 },
      { call: 'sumValues([1, "2", 3])', expected: 4 },
      { call: 'sumValues({ a: [1, { b: 2 }], c: "x" })', expected: 3 },
    ],
  },

  'alg-bfs-shortest-path': {
    solution: `const shortestPath = (graph, start, goal) => {
  const previous = new Map([[start, null]]);
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const node = queue[head];
    if (node === goal) {
      const route = [];
      for (let at = goal; at !== null; at = previous.get(at)) route.push(at);
      return route.reverse();
    }
    const neighbours = Object.hasOwn(graph, node) ? graph[node] : [];
    for (const neighbour of neighbours) {
      if (previous.has(neighbour)) continue;
      previous.set(neighbour, node);
      queue.push(neighbour);
    }
  }
  return null;
};`,
    junior: `const shortestPath = (graph, start, goal) => {
  const parent = new Map();
  parent.set(start, null);
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (current === goal) {
      const route = [];
      let at = goal;
      while (at !== null) {
        route.push(at);
        at = parent.get(at);
      }
      route.reverse();
      return route;
    }
    const neighbours = Object.hasOwn(graph, current) ? graph[current] : [];
    for (let index = 0; index < neighbours.length; index += 1) {
      const next = neighbours[index];
      if (!parent.has(next)) {
        parent.set(next, current);
        queue.push(next);
      }
    }
  }
  return null;
};`,
    senior: `const shortestPath = (graph, start, goal) => {
  if (start === goal) return [start];
  const cameFrom = new Map([[start, null]]);
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    for (const neighbour of (Object.hasOwn(graph, queue[head]) ? graph[queue[head]] : [])) {
      if (cameFrom.has(neighbour)) continue;
      cameFrom.set(neighbour, queue[head]);
      if (neighbour === goal) {
        const route = [];
        for (let step = goal; step !== null && step !== undefined; step = cameFrom.get(step)) route.push(step);
        return route.reverse();
      }
      queue.push(neighbour);
    }
  }
  return null;
};`,
    hiddenTests: [
      { call: "(() => {const names=[\"\",\"__proto__\",\"x\"];for(let mask=0;mask<512;mask++){const graph=Object.create(null),dist=names.map((_,i)=>names.map((_,j)=>i===j?0:Infinity));for(let i=0;i<3;i++){const list=[];for(let j=0;j<3;j++)if(mask&(1<<(i*3+j))){list.push(names[j]);dist[i][j]=Math.min(dist[i][j],1);}graph[names[i]]=Object.freeze(list);}Object.freeze(graph);for(let k=0;k<3;k++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)dist[i][j]=Math.min(dist[i][j],dist[i][k]+dist[k][j]);for(let s=0;s<3;s++)for(let g=0;g<3;g++){const route=shortestPath(graph,names[s],names[g]),wanted=dist[s][g];if(wanted===Infinity){if(route!==null)return false;}else if(!Array.isArray(route)||route.length!==wanted+1||route[0]!==names[s]||route[route.length-1]!==names[g]||!route.slice(1).every((name,i)=>graph[route[i]].includes(name)))return false;}}return true;})()", expected: true },
      { call: "(() => {const graph=Object.freeze(Object.assign(Object.create({constructor:[\"goal\"]}),{\"\":Object.freeze([\"constructor\"])}));if(shortestPath(graph,\"\",\"goal\")!==null)return false;const own=Object.freeze(Object.assign(Object.create(null),{\"\":Object.freeze([\"__proto__\",\"__proto__\"]),[\"__proto__\"]:Object.freeze([\"goal\"])}));const a=shortestPath(own,\"\",\"goal\"),b=shortestPath(own,\"\",\"goal\");if(!a||a.join(\"|\")!==\"|__proto__|goal\"||a===b)return false;a[0]=\"changed\";return b[0]===\"\"&&own[\"\"][0]===\"__proto__\"&&shortestPath({},\"\",\" \")===null&&shortestPath({},\"\",\"\")[0]===\"\";})()", expected: true },
      { call: "(() => {const graph=Object.create(null);for(let i=0;i<2000;i++)graph[\"n\"+i]=Object.freeze(i<1999?[\"n\"+(i+1)]:[]);Object.freeze(graph);const out=shortestPath(graph,\"n0\",\"n1999\"),wide=Object.freeze({s:Object.freeze(Array(10000).fill(\"t\")),t:Object.freeze([])});return [out.length,out.every((v,i)=>v===\"n\"+i),shortestPath(wide,\"s\",\"t\")];})()", expected: [2000, true, ["s", "t"]] },

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
  let head = 0;
  while (head < queue.length) {
    const width = queue.length - head;
    const values = [];
    for (let taken = 0; taken < width; taken += 1) {
      const node = queue[head++];
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
      { call: "(() => {const memo=[[null]],shapes=n=>{if(memo[n])return memo[n];const out=[];for(let k=0;k<n;k++)for(const a of shapes(k))for(const b of shapes(n-k-1))out.push([a,b]);return memo[n]=out;};for(let n=0;n<=5;n++)for(const shape of shapes(n)){const expected=[],make=(s,depth,path)=>{if(s===null)return null;const value=Object.freeze({path});(expected[depth]??=[]).push(value);return Object.freeze(Object.assign(Object.create(null),{value,left:make(s[0],depth+1,path+\"L\"),right:make(s[1],depth+1,path+\"R\")}));},root=make(shape,0,\"\"),actual=levelOrder(root);if(actual.length!==expected.length||!actual.every((row,d)=>row.length===expected[d].length&&row.every((v,i)=>v===expected[d][i])))return false;}return true;})()", expected: true },
      { call: "(() => {let calls=0;const fn=()=>{calls++;},cycle={};cycle.self=cycle;const values=[fn,Symbol(\"payload\"),3n,undefined,-0,cycle];let root=null;for(let i=511;i>=0;i--)root=Object.freeze({value:values[i%6],left:root,right:null});const a=levelOrder(root),b=levelOrder(root);if(a===b||a.length!==512||!a.every((row,i)=>row!==b[i]&&row.length===1&&Object.is(row[0],values[i%6])))return false;a[0][0]=99;a.push([]);return calls===0&&b.length===512&&b[0][0]===fn&&levelOrder(null)!==levelOrder(undefined);})()", expected: true },
      { call: "(() => {const nodes=Array.from({length:20000},(_,i)=>({value:i,left:null,right:null}));for(let i=nodes.length-1;i>=0;i--){nodes[i].left=nodes[2*i+1]??null;nodes[i].right=nodes[2*i+2]??null;Object.freeze(nodes[i]);}const out=levelOrder(nodes[0]);let offset=0;for(let depth=0;offset<20000;depth++){const width=Math.min(2**depth,20000-offset);if(out[depth].length!==width||!out[depth].every((v,i)=>v===offset+i))return false;offset+=width;}return out.length===15&&nodes[0].left===nodes[1];})()", expected: true },

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
      const task = tasks[index];
      results[index] = await task();
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
      const task = tasks[start + offset];
      batch.push(task());
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
  const pending = tasks.entries();
  const worker = async () => {
    for (const [index, task] of pending) results[index] = await task();
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
};`,
    hiddenTests: [{"call": "(async () => {for(let n=0;n<=8;n++)for(const limit of [1,2,3,1099511627776]){let running=0,peak=0;const count=Array(n).fill(0),tasks=Object.freeze(Array.from({length:n},(_,i)=>function(){'use strict';if(this!==undefined||arguments.length)throw Error('call shape');count[i]++;running++;peak=Math.max(peak,running);return new Promise(resolve=>setTimeout(()=>{running--;resolve(i);},(n-i)%4));}));const result=await promisePool(tasks,limit);if(result.length!==n||!result.every((value,i)=>value===i)||count.some(value=>value!==1)||running!==0||peak>Math.min(limit,n))return false;}return true;})()", "expected": true}, {"call": "(async () => {const object=Object.freeze({value:1}),symbol=Symbol('value'),values=[undefined,object,symbol,NaN,-0,Infinity],tasks=Object.freeze(values.map(value=>()=>Promise.resolve(value))),a=await promisePool(tasks,2),b=await promisePool(tasks,1099511627776);if(a===b||a.length!==values.length||!values.every((value,i)=>Object.hasOwn(a,i)&&Object.is(a[i],value)&&Object.is(b[i],value)))return false;a[0]='changed';if(a[0]!=='changed'||b[0]!==undefined)return false;for(const reason of [undefined,0,symbol,object]){let count=0;try{await promisePool(Object.freeze([()=>{count++;return Promise.reject(reason);}]),1);return false;}catch(error){if(!Object.is(error,reason)||count!==1)return false;}}return true;})()", "expected": true}, {"call": "(async () => {const tasks=Object.freeze(Array.from({length:2000},(_,i)=>()=>Promise.resolve(i)));for(const limit of [1,31,1099511627776]){const result=await promisePool(tasks,limit);if(result.length!==2000||!result.every((value,i)=>value===i))return false;}const a=await promisePool([],1),b=await promisePool([],1);return a!==b;})()", "expected": true}, {"call": "(async () => { const wait = ms => new Promise(done => setTimeout(done, ms)); const tasks = [0, 1, 2, 3].map(i => async () => { await wait(20 - i * 5); return i; }); return promisePool(tasks, 2); })()", "expected": [0, 1, 2, 3]}, {"call": "(async () => { let running = 0; let peak = 0; const wait = ms => new Promise(done => setTimeout(done, ms)); const tasks = Array.from({ length: 6 }, () => async () => { running += 1; if (running > peak) peak = running; await wait(5); running -= 1; return 1; }); await promisePool(tasks, 3); return peak; })()", "expected": 3}, {"call": "promisePool([() => Promise.resolve(1)], 1)", "expected": [1]}, {"call": "(async () => { const results = await promisePool([() => Promise.resolve(\"a\"), () => Promise.resolve(\"b\"), () => Promise.resolve(\"c\")], 2); return results.join(\"\"); })()", "expected": "abc"}],
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
    junior: `const retryWithBackoff = async (fn, attempts) => {
  let lastError = new Error("no attempts were made");
  let delay = 100;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }
  throw lastError;
};`,
    senior: `const retryWithBackoff = async (fn, attempts) => {
  const wait = ms => new Promise(done => setTimeout(done, ms));
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
    hiddenTests: [{"call": "(async () => {for(let budget=1;budget<=5;budget++){const start=Date.now(),times=[],reason={};let calls=0;try{await retryWithBackoff(function(){'use strict';if(this!==undefined||arguments.length)throw Error('call shape');times.push(Date.now()-start);calls++;return Promise.reject(reason);},budget);return false;}catch(error){if(error!==reason)return false;}if(calls!==budget||times.length!==budget)return false;for(let i=1;i<times.length;i++){const gap=times[i]-times[i-1],delay=100*2**(i-1);if(gap<delay-10||gap>delay+500)return false;}const expected=100*(2**(budget-1)-1),elapsed=Date.now()-start;if(elapsed<expected-50||elapsed>expected+1000)return false;}return true;})()", "expected": true}, {"call": "(async () => {for(const attempts of [-1000000000000,-1,-0,0]){let calls=0;const start=Date.now();try{await retryWithBackoff(()=>{calls++;return Promise.resolve(1);},attempts);return false;}catch(error){if(!(error instanceof Error)||calls!==0||Date.now()-start>1000)return false;}}const object={},symbol=Symbol('same');for(const value of [undefined,0,false,-0,symbol,object])if(!Object.is(await retryWithBackoff(()=>Promise.resolve(value),5),value))return false;for(const reason of [undefined,0,symbol,object]){try{await retryWithBackoff(()=>Promise.reject(reason),2);return false;}catch(error){if(!Object.is(error,reason))return false;}}return true;})()", "expected": true}, {"call": "(async () => {const start=Date.now(),times=[];let calls=0,running=0,peak=0;const result=await retryWithBackoff(()=>{calls++;times.push(Date.now()-start);running++;peak=Math.max(peak,running);return new Promise((resolve,reject)=>setTimeout(()=>{running--;calls===5?resolve('done'):reject('again');},7));},5);const elapsed=Date.now()-start;if(result!=='done'||calls!==5||running!==0||peak!==1||elapsed<1485||elapsed>2535)return false;for(let i=1;i<times.length;i++){const gap=times[i]-times[i-1],expected=7+100*2**(i-1);if(gap<expected-10||gap>expected+500)return false;}return true;})()", "expected": true}, {"call": "(() => { let runs = 0; return retryWithBackoff(async () => { runs += 1; if (runs < 2) throw new Error(\"once\"); return runs; }, 4); })()", "expected": 2}, {"call": "(async () => { const started = Date.now(); let runs = 0; await retryWithBackoff(async () => { runs += 1; if (runs < 2) throw new Error(\"once\"); return runs; }, 4); const elapsed = Date.now() - started; return elapsed >= 80 && elapsed < 250; })()", "expected": true}, {"call": "(async () => { const started = Date.now(); await retryWithBackoff(async () => { throw new Error(\"down\"); }, 2).catch(() => \"failed\"); const elapsed = Date.now() - started; return elapsed >= 80 && elapsed < 250; })()", "expected": true}, {"call": "retryWithBackoff(async () => 0, 1)", "expected": 0}, {"call": "(async () => { const started = Date.now(); let runs = 0; await retryWithBackoff(async () => { runs += 1; if (runs < 4) throw new Error(\"flaky\"); return runs; }, 5); const elapsed = Date.now() - started; return elapsed >= 650 && elapsed < 1200; })()", "expected": true}],
  },
};
