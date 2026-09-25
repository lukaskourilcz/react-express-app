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
import { check, en, mdn } from './path-helpers';

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
      en('Write `pairWithSum(sorted, target)`. `sorted` holds distinct numbers in ascending order. Return the indices `[i, j]` (i < j) of two values that add up to `target`, or `[]` when no pair does; if several pairs work, return the one with the smallest `i`. `pairWithSum([1, 2, 4, 7, 11], 9)` gives `[1, 3]`. Put one pointer at each end: when the sum is too small, move the left one right; when it is too big, move the right one left. Target: O(n) time and O(1) extra space.'),
      en('Add `removeDuplicates(sorted)`. `sorted` is in ascending order and may repeat values. Compact it in place so its first `k` slots hold each value once, in order, and return `k`. After `const a = [1, 1, 2, 3, 3]`, `removeDuplicates(a)` returns `3` and `a.slice(0, 3)` is `[1, 2, 3]`. Keep a slow pointer at the next free slot and a fast one that reads ahead. Whatever stays after the first `k` slots does not matter. Target: O(n) time and O(1) extra space.'),
      en('Add `isSubsequence(small, big)`: `true` when the characters of `small` appear in `big` in the same order, not necessarily next to each other. `isSubsequence("ace", "abcde")` is `true`; `isSubsequence("aec", "abcde")` is `false`. Walk `big` with one pointer and move a second pointer through `small` each time the characters match. The empty string is a subsequence of every string. Target: O(n).'),
      en('Add `minWindowSum(numbers, target)`: the length of the shortest run of neighbouring numbers whose sum is at least `target`, or `0` when no run reaches it. All numbers are positive. `minWindowSum([2, 3, 1, 2, 4, 3], 7)` gives `2`, for `[4, 3]`. Grow a window by moving its right edge; while its sum reaches `target`, record its length and shrink it from the left. Target: O(n), because each edge only moves forward.'),
      en('Add `longestOnes(bits, k)`: `bits` holds only 0s and 1s, and you may flip at most `k` zeros to ones. Return the length of the longest run of ones you can make. `longestOnes([1, 1, 0, 0, 1, 1, 1, 0, 1], 1)` gives `5`. Keep a window and the number of zeros inside it: move the right edge, and while the window holds more than `k` zeros, move the left edge. Target: O(n).'),
    ],
    hints: [
      en('`let left = 0, right = sorted.length - 1; while (left < right) { ... }`. The array is sorted, so moving `left` right can only raise the sum and moving `right` left can only lower it.'),
      en('`let slow = 0;` then `for (let fast = 0; fast < sorted.length; fast++)`: when `sorted[fast]` differs from the last value you kept, write it to `sorted[slow]` and move `slow` on. `slow` is the answer.'),
      en('`let i = 0; for (const char of big) if (i < small.length && char === small[i]) i++;`. At the end, `small` is a subsequence when `i === small.length`.'),
      en('Keep `left`, a running `sum` and `best = Infinity`. After adding `numbers[right]`, loop `while (sum >= target)`: record `right - left + 1`, then subtract `numbers[left]` and move `left` on. Return `0` if `best` is still `Infinity`.'),
      en('The window is valid while it holds at most `k` zeros. Count a zero as it enters on the right; while the count is over `k`, move `left` on, and uncount a zero as it leaves. The answer is the widest valid window.'),
    ],
    approaches: [
      [en('Start with `left` at 0 and `right` at the last index.'), en('While `left < right`, compare `sorted[left] + sorted[right]` with the target.'), en('Return the pair on a match; otherwise move the pointer that brings the sum closer. Return `[]` when they meet.')],
      [en('Return 0 for an empty array.'), en('Keep `slow` at the next free slot; walk `fast` over every index.'), en('Copy each new value to `sorted[slow]`, move `slow` on, and return `slow` at the end.')],
      [en('Keep `i`, the position in `small`.'), en('Walk `big`; move `i` on each time the character matches `small[i]`.'), en('Return whether `i` reached `small.length`.')],
      [en('Keep `left`, `sum` and `best`.'), en('Add each number on the right; while the sum reaches the target, record the length and shrink from the left.'), en('Return `best`, or `0` if no window reached the target.')],
      [en('Keep `left`, a zero count and `best`.'), en('Add each bit on the right; while there are more than `k` zeros, move the left edge on.'), en('Record the window width after every step and return the widest.')],
    ],
    tests: [
      [
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
      en('Write `simplifyPath(path)`: turn an absolute Unix-style path into its shortest form. `.` means the current folder and is dropped, `..` goes up one folder (at the root it stays at the root), and repeated slashes count as one. The result starts with `/`, has no trailing slash, and the root is `"/"`. `simplifyPath("/a/./b/../../c/")` gives `"/c"`. Split on `/` and keep the folders on a stack: push a name, pop on `..`. Target: O(n).'),
      en('Add `evalRPN(tokens)`: evaluate an expression in reverse Polish notation, where each operator follows its two operands. `evalRPN(["2", "1", "+", "3", "*"])` is `(2 + 1) * 3`, which gives `9`. Tokens are integers (negative ones look like `"-4"`) and the operators `+`, `-`, `*` and `/`. Division truncates toward zero: `Math.trunc(a / b)`. Push numbers onto a stack; for an operator, pop the right operand first, then the left. The input is always valid and never divides by zero. Target: O(n).'),
      en('Add `nextGreater(numbers)`: for each value, the first value to its right that is larger, or `-1` when there is none. `nextGreater([2, 1, 2, 4, 3])` gives `[4, 2, 4, -1, -1]`. Keep a stack of the indices still waiting for an answer: at each new value, pop every waiting index whose value is smaller, answer it with the new value, then push the new index. The waiting values never increase from bottom to top, which is why this is called a monotonic stack. Target: O(n).'),
      en('Add `decodeString(text)`: expand `k[part]` into `part` repeated `k` times, where `part` can hold more of the same. `decodeString("3[a2[c]]")` gives `"accaccacc"`, and `decodeString("2[ab]c")` gives `"ababc"`. `k` is a positive whole number and may have more than one digit, and the input is always well formed. Keep a stack: on `[`, push the text so far and the count, then start fresh; on `]`, pop them and append the fresh part `count` times. Target: O(length of the output).'),
      en('Add `slidingMax(numbers, k)`: the largest value in every window of `k` neighbouring numbers, from left to right. `slidingMax([1, 3, -1, -3, 5, 3, 6, 7], 3)` gives `[3, 3, 5, 5, 6, 7]`. Keep a queue of indices whose values fall from front to back: drop the front when it slides out of the window, and before you add a new index, remove from the back every index whose value is not larger than the new one. The front is then always the window\'s largest value. When `k` is larger than the array, return `[]`; `k` is at least 1. Target: O(n).'),
    ],
    hints: [
      en('`path.split("/")` gives empty strings for repeated slashes and the ends. Skip `""` and `"."`, pop on `".."` (popping an empty stack does nothing), push everything else, then `"/" + stack.join("/")`.'),
      en('Test for an operator with `"+-*/".includes(token)` and a length of 1, so `"-4"` is read as a number. `const right = stack.pop(); const left = stack.pop();` keeps `5 2 -` as `5 - 2`.'),
      en('`const answer = numbers.map(() => -1)` starts every answer at -1. In the loop, `while (stack.length && numbers[stack[stack.length - 1]] < value) answer[stack.pop()] = value;`, then push the index.'),
      en('Keep `current` (the text being built) and `count` (the number being read, digit by digit: `count = count * 10 + Number(char)`). On `[`, push `[current, count]` and reset both; on `]`, pop `[before, times]` and set `current = before + current.repeat(times)`.'),
      en('Store indices, not values, so you can tell when the front has left the window: it has when `queue[0] <= i - k`. Once `i >= k - 1`, the window is full and `numbers[queue[0]]` is its answer.'),
    ],
    approaches: [
      [en('Split the path on `/`.'), en('Skip empty parts and `.`; pop on `..`; push every other name.'), en('Join the stack with `/` behind a leading `/`.')],
      [en('Start with an empty stack.'), en('Push each number; for an operator, pop the right operand, then the left.'), en('Push the result of the operation. The last value on the stack is the answer.')],
      [en('Start every answer at `-1` and keep an empty stack of indices.'), en('For each value, pop the waiting indices with a smaller value and give them this value as their answer.'), en('Push the current index and move on.')],
      [en('Keep `current`, `count` and an empty stack.'), en('Digits build `count`; `[` saves `[current, count]` and starts fresh; `]` restores and repeats.'), en('Any other character is appended to `current`. Return `current` at the end.')],
      [en('Keep a queue of indices and an empty result.'), en('For each index: drop the front if it left the window, then drop from the back while those values are not larger, then add the index.'), en('Once the first window is full, push the front\'s value for every step.')],
    ],
    tests: [
      [
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
      [mdn('Array.prototype.shift()', 'Global_Objects/Array/shift'), mdn('Array.prototype.pop()', 'Global_Objects/Array/pop')],
    ],
  },
};
