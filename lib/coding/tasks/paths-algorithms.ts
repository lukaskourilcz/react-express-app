/** The Algorithms section's short paths. Five levels each; every level adds
 * one function to the same file and keeps the earlier ones.
 *
 * The problems are ones the section's single challenges do not already ask:
 * two pointers and sliding windows first, then stacks and queues. Every
 * prompt names the cost an interviewer listens for, like the rest of the
 * section.
 *
 * Task bodies only. Solutions live in `lib/coding/solutions/paths-algorithms.ts`. */

import type { Spec } from './evolving';
import { check, mdn } from './path-helpers';

const starter = (title: string, first: string, scratch: string) => `// ${title}. Every level adds one function to this file.
// Keep the earlier functions: their checks run again at every level.

${first} {

}

// Scratch pad — change this and press Run.
console.log(${scratch});
`;

export const ALGORITHM_PATHS: Record<string, Spec> = {
  'alg-path-pointers': {
    starter: starter('Two pointers and windows', 'function pairWithSum(sorted, target)', 'pairWithSum([1, 2, 4, 7, 11], 9)'),
    focus: ['two-pointer', 'while'],
    prompts: [
      "Write `pairWithSum(sorted, target)`. `sorted` holds distinct numbers in ascending order. Return the indices `[i, j]` (i < j) of two values that add up to `target`, or `[]` when no pair does; if several pairs work, return the one with the smallest `i`. `pairWithSum([1, 2, 4, 7, 11], 9)` gives `[1, 3]`. Put one pointer at each end: when the sum is too small, move the left one right; when it is too big, move the right one left. Target: O(n) time and O(1) extra space. Input is a dense ordinary array of at most 20,000 distinct primitive integers in [-1000000000000,1000000000000], strictly increasing numerically; zero signs compare equal. target is a primitive integer in [-2000000000000,2000000000000]. These bounds keep every pair sum exact. The input may be frozen and must keep all values/order, including source zero signs. n is sorted.length. Return a fresh index array on every call, including no-match results.",
      "Add `removeDuplicates(sorted)`. `sorted` is in ascending order and may repeat values. Compact it in place so its first `k` slots hold each value once, in order, and return `k`. After `const a = [1, 1, 2, 3, 3]`, `removeDuplicates(a)` returns `3` and `a.slice(0, 3)` is `[1, 2, 3]`. Keep a slow pointer at the next free slot and a fast one that reads ahead. Whatever stays after the first `k` slots does not matter. Target: O(n) time and O(1) extra space. Input is a mutable dense ordinary array of at most 20,000 primitive Number values sorted numerically in nondecreasing order. Fractions and infinities are valid; NaN is outside this task. Equality means ===, so both zero signs form one value; keep the first exact representative, including its zero sign. n is the original length. Return an integer k in 0..n and leave at least k slots containing the required prefix. Values after that prefix are irrelevant; trimming the array to k is valid too. No rounding or coercion.",
      "Add `isSubsequence(small, big)`: `true` when the characters of `small` appear in `big` in the same order, not necessarily next to each other. `isSubsequence(\"ace\", \"abcde\")` is `true`; `isSubsequence(\"aec\", \"abcde\")` is `false`. Walk `big` with one pointer and move a second pointer through `small` each time the characters match. The empty string is a subsequence of every string. Target: O(n) time and O(m) extra space, where n is small.length + big.length in UTF-16 code units and m is the number of code points in small. Both inputs are primitive strings of at most 20,000 UTF-16 code units each. Treat the values produced by a string's for...of iterator as characters: an emoji such as 😀 is one item. Do not split its surrogate pair. Lone surrogates are valid single items. Combining marks remain separate; compare exactly, with no normalization. A streaming iterator can also use O(1) extra space.",
      "Add `minWindowSum(numbers, target)`: the length of the shortest run of neighbouring numbers whose sum is at least `target`, or `0` when no run reaches it. All numbers are positive. `minWindowSum([2, 3, 1, 2, 4, 3], 7)` gives `2`, for `[4, 3]`. Grow a window by moving its right edge; while its sum reaches `target`, record its length and shrink it from the left. Target: O(n) time and O(1) extra space, because each edge only moves forward. Input is a dense ordinary array of at most 20,000 primitive positive integers in 1..1000000000. target is a primitive positive integer in 1..100000000000000; zero, negative and fractional inputs are outside this task. These bounds keep every subtotal and comparison exact. n is numbers.length. The array may be frozen and must remain unchanged. Only nonempty windows count; a target above the full sum gives 0.",
      "Add `longestOnes(bits, k)`: `bits` holds only 0s and 1s, and you may flip at most `k` zeros to ones. Return the length of the longest run of ones you can make. `longestOnes([1, 1, 0, 0, 1, 1, 1, 0, 1], 1)` gives `5`. Keep a window and the number of zeros inside it: move the right edge, and while the window holds more than `k` zeros, move the left edge. Target: O(n) time and O(1) extra space. Input is a dense ordinary array of at most 20,000 primitive 0 or 1 values; either zero sign counts as 0. k is a primitive integer in 0..1000000000000, including equivalent zero signs. A budget greater than the number of zeros is valid and permits the whole array. Flips are conceptual: preserve every input value/order and source zero sign. The array may be frozen. n is bits.length; return an integer length.",
    ],
    hints: [
      '`let left = 0, right = sorted.length - 1; while (left < right) { ... }`. The array is sorted, so moving `left` right can only raise the sum and moving `right` left can only lower it.',
      '`let slow = 0;` then `for (let fast = 0; fast < sorted.length; fast++)`: when `sorted[fast]` differs from the last value you kept, write it to `sorted[slow]` and move `slow` on. `slow` is the answer.',
      "Use [...small] to keep the wanted code points, then iterate big with for...of. Compare the next wanted item, not small[i], which reads a UTF-16 code unit.",
      'Keep `left`, a running `sum` and `best = Infinity`. After adding `numbers[right]`, loop `while (sum >= target)`: record `right - left + 1`, then subtract `numbers[left]` and move `left` on. Return `0` if `best` is still `Infinity`.',
      'The window is valid while it holds at most `k` zeros. Count a zero as it enters on the right; while the count is over `k`, move `left` on, and uncount a zero as it leaves. The answer is the widest valid window.',
    ],
    approaches: [
      ["Start with `left` at 0 and `right` at the last index.", "While `left < right`, compare `sorted[left] + sorted[right]` with the target.", "Return the pair on a match; otherwise move the pointer that brings the sum closer. Return `[]` when they meet."],
      ["Return 0 for an empty array.", "Keep `slow` at the next free slot; walk `fast` over every index.", "Copy each new value to `sorted[slow]`, move `slow` on, and return `slow` at the end."],
      ["Convert small to an array of code points and keep i at its next unmatched position.", "Iterate big by code point; advance i when that item matches the next wanted item.", "Return whether i reached the wanted array length. A streaming small iterator avoids storing the array."],
      ["Keep `left`, `sum` and `best`.", "Add each number on the right; while the sum reaches the target, record the length and shrink from the left.", "Return `best`, or `0` if no window reached the target."],
      ["Keep `left`, a zero count and `best`.", "Add each bit on the right; while there are more than `k` zeros, move the left edge on.", "Record the window width after every step and return the widest."],
    ],
    tests: [
      [
        check("pairWithSum([0,4294967296],0)", [], "pair sums do not wrap at 32 bits"),
        check('pairWithSum([1, 2, 4, 7, 11], 9)', [1, 3]),
        check('pairWithSum([1, 2, 4, 7, 11], 15)', [2, 4]),
        check('pairWithSum([1, 2, 3, 4, 5], 6)', [0, 4], 'several pairs: the smallest i wins'),
        check('pairWithSum([-5, -1, 0, 3, 8], 3)', [0, 4], 'negative values'),
        check('pairWithSum([1, 3], 4)', [0, 1], 'the only two values'),
        check('pairWithSum([10, 20, 30, 40], 70)', [2, 3]),
        check('pairWithSum([1, 2, 3], 10)', [], 'no pair adds up', true),
        check('pairWithSum([5], 10)', [], 'one value cannot pair with itself', true),
        check('pairWithSum([], 0)', [], 'empty input', true),
        check('pairWithSum([0, 1, 2], 0)', [], 'a sum of zero needs two values', true),
      ],
      [
        check("(() => {const values=[.25,.25,.5];const k=removeDuplicates(values);return [k,values.slice(0,k)];})()", [2, [0.25, 0.5]], "keep fractional representatives"),
        check('(() => { const a = [1, 1, 2, 3, 3]; const k = removeDuplicates(a); return [k, a.slice(0, k)]; })()', [3, [1, 2, 3]]),
        check('(() => { const a = [0, 0, 0, 1, 1, 2]; const k = removeDuplicates(a); return [k, a.slice(0, k)]; })()', [3, [0, 1, 2]]),
        check('(() => { const a = [-2, -2, 0, 5, 5, 5, 9]; const k = removeDuplicates(a); return [k, a.slice(0, k)]; })()', [4, [-2, 0, 5, 9]]),
        check('(() => { const a = [1, 2, 2, 2, 3, 4, 4]; const k = removeDuplicates(a); return [k, a.slice(0, k)]; })()', [4, [1, 2, 3, 4]]),
        check('removeDuplicates([1, 2, 3])', 3, 'nothing repeats'),
        check('(() => { const a = [4, 4, 4]; const k = removeDuplicates(a); return [k, a.slice(0, k)]; })()', [1, [4]], 'one value, many times', true),
        check('(() => { const a = [7]; const k = removeDuplicates(a); return [k, a.slice(0, k)]; })()', [1, [7]], 'a single value', true),
        check('removeDuplicates([])', 0, 'empty input', true),
      ],
      [
        check("isSubsequence(\"😀\",\"x😀y\")", true, "an emoji is one code point"),
        check('isSubsequence("ace", "abcde")', true),
        check('isSubsequence("aec", "abcde")', false, 'order matters'),
        check('isSubsequence("abc", "abc")', true),
        check('isSubsequence("hlo", "hello")', true),
        check('isSubsequence("", "abc")', true, 'the empty string', true),
        check('isSubsequence("", "")', true, 'both empty', true),
        check('isSubsequence("a", "")', false, 'nothing to match against', true),
        check('isSubsequence("aa", "a")', false, 'each character of big is used once', true),
        check('isSubsequence("Ab", "ab")', false, 'case matters', true),
      ],
      [
        check("minWindowSum([1000000000,1000000000,1000000000],3000000000)", 3, "targets can exceed 32 bits"),
        check('minWindowSum([2, 3, 1, 2, 4, 3], 7)', 2),
        check('minWindowSum([1, 4, 4], 4)', 1, 'one number can be enough'),
        check('minWindowSum([1, 2, 3, 4, 5], 15)', 5, 'the whole array'),
        check('minWindowSum([1, 2, 3, 4, 5], 11)', 3),
        check('minWindowSum([1, 1, 1, 7], 7)', 1),
        check('minWindowSum([2, 2, 2], 1)', 1),
        check('minWindowSum([1, 1, 1, 1], 5)', 0, 'nothing reaches the target', true),
        check('minWindowSum([5], 5)', 1, 'exactly the target counts', true),
        check('minWindowSum([], 3)', 0, 'empty input', true),
      ],
      [
        check("(() => {const bits=Object.freeze([0,1,0]);return longestOnes(bits,1);})()", 2, "flips leave the original unchanged"),
        check('longestOnes([1, 1, 0, 0, 1, 1, 1, 0, 1], 1)', 5),
        check('longestOnes([1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2)', 6),
        check('longestOnes([0, 1, 0, 1, 0], 1)', 3),
        check('longestOnes([1, 0, 1, 1, 0, 1], 1)', 4),
        check('longestOnes([0, 1, 1, 0, 1, 1, 1], 0)', 3, 'no flips: the longest run as it is'),
        check('longestOnes([1, 1, 1], 0)', 3, 'already all ones'),
        check('longestOnes([0, 0, 0], 0)', 0, 'no flips and no ones', true),
        check('longestOnes([0, 0, 0], 5)', 3, 'more flips than zeros', true),
        check('longestOnes([], 2)', 0, 'empty input', true),
      ],
    ],
    references: [
      [mdn('while', 'Statements/while'), mdn('Array: length', 'Global_Objects/Array/length')],
      [mdn('for', 'Statements/for'), mdn('Array.prototype.slice()', 'Global_Objects/Array/slice')],
      [mdn('for...of', 'Statements/for...of'), mdn('String: length', 'Global_Objects/String/length')],
      [mdn('while', 'Statements/while'), mdn('Infinity', 'Global_Objects/Infinity')],
      [mdn('for', 'Statements/for'), mdn('Math.max()', 'Global_Objects/Math/max')],
    ],
  },

  'alg-path-stacks': {
    starter: starter('Stacks and queues', 'function simplifyPath(path)', 'simplifyPath("/a/./b/../../c/")'),
    focus: ['push', 'pop', 'strings'],
    prompts: [
      "Write `simplifyPath(path)`: turn an absolute Unix-style path into its shortest form. `.` means the current folder and is dropped, `..` goes up one folder (at the root it stays at the root), and repeated slashes count as one. The result starts with `/`, has no trailing slash, and the root is `\"/\"`. `simplifyPath(\"/a/./b/../../c/\")` gives `\"/c\"`. Split on `/` and keep the folders on a stack: push a name, pop on `..`. Target: O(n) time and O(n) extra space, where n is path.length in UTF-16 code units. path is a primitive absolute Unix-style string of 1..20,000 UTF-16 code units, with no NUL. Only exact . and .. segments are special. Preserve every other name literally, including spaces, backslashes, percent signs, Unicode and lone surrogates. This is text normalization: do not resolve symlinks, access a filesystem, decode escapes or change case.",
      "Add `evalRPN(tokens)`: evaluate an expression in reverse Polish notation, where each operator follows its two operands. `evalRPN([\"2\", \"1\", \"+\", \"3\", \"*\"])` is `(2 + 1) * 3`, which gives `9`. Tokens are integers (negative ones look like `\"-4\"`) and the operators `+`, `-`, `*` and `/`. Division truncates toward zero: `Math.trunc(a / b)`. Push numbers onto a stack; for an operator, pop the right operand first, then the left. The input is always valid and never divides by zero. Target: O(n) time and O(n) extra space, where n is tokens.length. Input is a dense ordinary array of 1..20,000 primitive strings, and may be frozen; preserve its contents and order. A number token is the canonical decimal form of a safe integer, or -0. Each operator has two earlier operands and the whole expression leaves exactly one value. Every operand and computed intermediate integer is within Number.MAX_SAFE_INTEGER in magnitude, after truncation for division. Zero signs are equivalent in the result. Invalid expressions are outside this task.",
      "Add `nextGreater(numbers)`: for each value, the first value to its right that is larger, or `-1` when there is none. `nextGreater([2, 1, 2, 4, 3])` gives `[4, 2, 4, -1, -1]`. Keep a stack of the indices still waiting for an answer: at each new value, pop every waiting index whose value is smaller, answer it with the new value, then push the new index. The waiting values never increase from bottom to top, which is why this is called a monotonic stack. Target: O(n) time and O(n) extra space, where n is numbers.length. Input is a dense ordinary array of at most 20,000 primitive Number values: finite values in [-1000000000000,1000000000000], including fractions, and either infinity are valid; NaN is outside this task. The array may be frozen; preserve its values/order and source zero signs. Compare values numerically without rounding. Return a fresh mutable array on every call, including empty results; either zero sign is accepted in the result.",
      "Add `decodeString(text)`: expand `k[part]` into part repeated k times, allowing nested groups. `decodeString(\"3[a2[c]]\")` gives `\"accaccacc\"`; `decodeString(\"2[ab]c\")` gives `\"ababc\"`. text is a primitive well-formed string, possibly empty. Each count is a canonical ASCII decimal integer in 1..1000 followed by a bracketed body, which may be empty. Literal text is any sequence of non-ASCII-digit, non-bracket UTF-16 units, including spaces, Unicode and lone surrogates; preserve it exactly. There are no escapes. Input length n and expanded output length L are each at most 20,000 UTF-16 units; nesting depth is at most 64. Collect chunks per group, join them once when closing it, then repeat that joined body. Avoid repeatedly copying a growing prefix. Target: O(n + L) time and O(n + L) total auxiliary/output space. Even empty groups take input-reading work. With the fixed depth cap, each output unit is copied at most 64 group levels; without that cap the depth would enter the bound.",
      "Add `slidingMax(numbers, k)`: the largest value in every window of `k` neighbouring numbers, from left to right. `slidingMax([1, 3, -1, -3, 5, 3, 6, 7], 3)` gives `[3, 3, 5, 5, 6, 7]`. Keep a queue of indices whose values fall from front to back: drop the front when it slides out of the window, and before you add a new index, remove from the back every index whose value is not larger than the new one. The front is then always the window's largest value. When `k` is larger than the array, return `[]`; `k` is at least 1. Use an array with a front index instead of shifting all remaining entries. Target: O(n) time and O(n) extra space, where n is numbers.length; an O(k)-space deque is valid too. Input is a dense ordinary array of at most 20,000 primitive Number values: finite values in [-1000000000000,1000000000000], including fractions, and either infinity are valid; NaN is outside this task. k is a primitive integer in 1..1000000000000. The array may be frozen; preserve all values/order and source zero signs. Return a fresh mutable result on every call, including when k > n. Either zero sign is accepted in the result; do not round values or narrow k to 32 bits.",
    ],
    hints: [
      "`path.split(\"/\")` gives empty strings for repeated slashes and the ends. Skip `\"\"` and `\".\"`, pop on `\"..\"` (popping an empty stack does nothing), push everything else, then `\"/\" + stack.join(\"/\")`.",
      "Test for an operator with `\"+-*/\".includes(token)` and a length of 1, so `\"-4\"` is read as a number. `const right = stack.pop(); const left = stack.pop();` keeps `5 2 -` as `5 - 2`.",
      "`const answer = numbers.map(() => -1)` starts every answer at -1. In the loop, `while (stack.length && numbers[stack[stack.length - 1]] < value) answer[stack.pop()] = value;`, then push the index.",
      "Collect literal chunks in an array. On [, save that array and the count, then start a fresh array. On ], join the child once, repeat it, and push that single chunk into the parent. Join the root once at the end.",
      "Keep a front index into the queue. Expire queue[front] by advancing front; pop from the back only while queue.length > front. Once i >= k - 1, numbers[queue[front]] is the answer.",
    ],
    approaches: [
      ["Split the path on `/`.", "Skip empty parts and `.`; pop on `..`; push every other name.", "Join the stack with `/` behind a leading `/`."],
      ["Start with an empty stack.", "Push each number; for an operator, pop the right operand, then the left.", "Push the result of the operation. The last value on the stack is the answer."],
      ["Start every answer at `-1` and keep an empty stack of indices.", "For each value, pop the waiting indices with a smaller value and give them this value as their answer.", "Push the current index and move on."],
      ["Keep a list of chunks, the count being read and a stack of parent lists/counts.", "A bracket opens a child list; closing it joins and repeats that body once, then pushes it into its parent.", "Push literal text as chunks; join the root at the end. Bounded nesting limits repeated copying of each output unit."],
      ["Keep an array of candidate indices, a front index and an empty result.", "Advance front when its index expires; pop active back indices with values no larger than the incoming value, then push the new index.", "Once a window is full, read numbers[queue[front]]. Each index is pushed and removed at most once; stale front slots use at most O(n) storage."],
    ],
    tests: [
      [
        check("simplifyPath(\"/ a /.. /\")", "/ a /.. ", "spaces belong to the folder name"),
        check('simplifyPath("/home/")', '/home'),
        check('simplifyPath("/a/./b/../../c/")', '/c'),
        check('simplifyPath("/home//foo/")', '/home/foo', 'repeated slashes count as one'),
        check('simplifyPath("/a/b/c/../..")', '/a'),
        check('simplifyPath("/a/../../b")', '/b'),
        check('simplifyPath("/a/./././b")', '/a/b'),
        check('simplifyPath("/x/y/../z/.")', '/x/z'),
        check('simplifyPath("/../")', '/', 'above the root stays at the root', true),
        check('simplifyPath("/")', '/', 'the root', true),
        check('simplifyPath("/...")', '/...', 'three dots is an ordinary name', true),
      ],
      [
        check("evalRPN([\"4294967296\",\"1\",\"+\"])", 4294967297, "arithmetic does not wrap at 32 bits"),
        check('evalRPN(["2", "1", "+", "3", "*"])', 9),
        check('evalRPN(["4", "13", "5", "/", "+"])', 6),
        check('evalRPN(["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"])', 22),
        check('evalRPN(["5", "2", "-"])', 3, 'the right operand is popped first'),
        check('evalRPN(["3", "4", "*", "2", "-"])', 10),
        check('evalRPN(["7"])', 7, 'a single number', true),
        check('evalRPN(["-7", "2", "/"])', -3, 'division truncates toward zero', true),
        check('evalRPN(["7", "-2", "/"])', -3, 'a negative divisor', true),
        check('evalRPN(["0", "3", "/"])', 0, 'zero divided', true),
      ],
      [
        check("nextGreater([.1,.2])", [0.2, -1], "preserve fractional answers"),
        check('nextGreater([2, 1, 2, 4, 3])', [4, 2, 4, -1, -1]),
        check('nextGreater([1, 2, 3])', [2, 3, -1]),
        check('nextGreater([1, 3, 2, 4])', [3, 4, 4, -1]),
        check('nextGreater([4, 1, 2, 3, 5])', [5, 2, 3, 5, -1]),
        check('nextGreater([-1, -3, 0])', [0, 0, -1], 'negative values'),
        check('nextGreater([3, 2, 1])', [-1, -1, -1], 'falling values never find a larger one', true),
        check('nextGreater([5, 5, 5])', [-1, -1, -1], 'equal is not larger', true),
        check('nextGreater([7])', [-1], 'a single value', true),
        check('nextGreater([])', [], 'empty input', true),
      ],
      [
        check("decodeString(\"2[ a ]\")", " a  a ", "preserve literal spaces"),
        check('decodeString("3[a]2[bc]")', 'aaabcbc'),
        check('decodeString("3[a2[c]]")', 'accaccacc'),
        check('decodeString("2[abc]3[cd]ef")', 'abcabccdcdcdef'),
        check('decodeString("2[ab]c")', 'ababc'),
        check('decodeString("x2[y]z")', 'xyyz'),
        check('decodeString("1[a1[b1[c]]]")', 'abc', 'deep nesting'),
        check('decodeString("10[x]")', 'xxxxxxxxxx', 'a count with two digits', true),
        check('decodeString("abc")', 'abc', 'no brackets', true),
        check('decodeString("")', '', 'empty input', true),
      ],
      [
        check("slidingMax([1,2],1099511627776)", [], "a large window does not wrap to zero"),
        check('slidingMax([1, 3, -1, -3, 5, 3, 6, 7], 3)', [3, 3, 5, 5, 6, 7]),
        check('slidingMax([4, 2, 12, 3], 1)', [4, 2, 12, 3], 'a window of one'),
        check('slidingMax([9, 8, 7, 6], 2)', [9, 8, 7], 'falling values'),
        check('slidingMax([1, 2, 3, 4], 2)', [2, 3, 4], 'rising values'),
        check('slidingMax([1, 3, 1, 2, 0, 5], 3)', [3, 3, 2, 5]),
        check('slidingMax([5, 5, 5], 2)', [5, 5], 'equal values', true),
        check('slidingMax([1], 1)', [1], 'one value', true),
        check('slidingMax([2, 7], 3)', [], 'k larger than the array', true),
        check('slidingMax([], 1)', [], 'empty input', true),
      ],
    ],
    references: [
      [mdn('String.prototype.split()', 'Global_Objects/String/split'), mdn('Array.prototype.pop()', 'Global_Objects/Array/pop')],
      [mdn('Array.prototype.push()', 'Global_Objects/Array/push'), mdn('Math.trunc()', 'Global_Objects/Math/trunc')],
      [mdn('Array.prototype.map()', 'Global_Objects/Array/map'), mdn('while', 'Statements/while')],
      [mdn('String.prototype.repeat()', 'Global_Objects/String/repeat'), mdn('Array.prototype.pop()', 'Global_Objects/Array/pop')],
      [mdn('Array.prototype.pop()', 'Global_Objects/Array/pop'), mdn('Array.prototype.push()', 'Global_Objects/Array/push')],
    ],
  },
};
