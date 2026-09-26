// The Medium and Hard band of the Algorithms track, first wave (#226).
//
// Every Easy wave has landed, so each challenge here combines two to four
// techniques the Easy band already taught: the technique-coverage contract
// (`scripts/coding-coverage.ts`) only lets a Medium or Hard challenge carry a
// focus tag that at least three Easy Algorithms challenges carry. That leaves
// nine tags: map-set, two-pointer, for, objects, strings, for-of, sort, while
// and recursion. Tier 3 reads Medium and tier 4 reads Hard, through
// `difficultyOf`; nothing sets an authored difficulty.
//
// Each challenge has a hint ladder that ends in the documentation page of its
// first focus tag, visible checks with at least one edge case, and hidden
// checks aimed at the shortcut the visible ones leave open. Where the point of
// a challenge is its cost, a hidden check is large enough that the brute force
// runs out of the grader's 2.5-second budget while the reference takes a few
// milliseconds, or it counts the reads. Every prompt ends with the cost an
// interviewer listens for, like the rest of the track.
//
// The ids start `alg-mh-`: `isCodingTaskId` only accepts the `alg-` prefix for
// this track. Solutions live in `../solutions/medium-hard-algorithms-a.ts`, and
// `MEDIUM_HARD_BAND` in `../catalog.ts` lists this file, which keeps these
// challenges out of every Learn level's quota. English only: there is no Czech
// overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';
import { tree, withList, withTree } from './easy-algorithms-a';

/** A list's values as an array, for checks on a linked list a solution returns. */
const LIST_VALUES = 'const values = node => { const out = []; for (; node; node = node.next) out.push(node.value); return out; };';

/** A rotated list of `n` multiples of 3 behind a Proxy that counts index reads.
 * The check returns the index found and whether it took at most 200 reads. */
const countedSearch = (n: number, cut: number, target: number): string =>
  `(() => { const base = Array.from({ length: ${n} }, (_, i) => ((i + ${cut}) % ${n}) * 3); let reads = 0; const values = new Proxy(base, { get(list, key, receiver) { if (typeof key === "string" && /^\\d+$/.test(key)) reads++; return Reflect.get(list, key, receiver); } }); return [findRotated(values, ${target}), reads <= 200]; })()`;

const ROUTE_MAP = '[["Dock", "Mill", 7], ["Dock", "Park", 9], ["Dock", "Hill", 14], ["Mill", "Park", 10], ["Mill", "Fort", 15], ["Park", "Fort", 11], ["Park", "Hill", 2], ["Fort", "Gate", 6], ["Hill", "Gate", 9]]';

const WORDS = '["cat", "cats", "and", "sand", "dog"]';

export const MEDIUM_HARD_ALGORITHMS_A_TASKS: CodingTaskSource[] = [
  /* ── Medium: sorting and pointers ─────────────────────────────────── */
  {
    id: 'alg-mh-three-sum',
    track: 'algorithms',
    topic: 'algorithms',
    level: 12,
    tier: 3,
    focus: ['sort', 'two-pointer', 'while'],
    title: 'Three numbers that add up to zero',
    prompt: 'Write `threeSum(numbers)`, returning every different triple of values from `numbers` that adds up to 0. Write each triple smallest first, and list the triples in order of their first value, then their second. `threeSum([-1, 0, 1, 2, -1, -4])` gives `[[-1, -1, 2], [-1, 0, 1]]`. A triple takes three different positions, and the same three values found again at other positions count once. Checking every three positions is O(n³), far too slow for the hidden list of 800 numbers. Sort a copy as numbers, then take each value in turn as the first of the triple and walk two pointers in from both ends of the values after it, `while` they have not met: move the left one right when the sum is too small, and the right one left when it is too big. On a match, record it and move both pointers past every repeat of their values. Skip a first value equal to the one before it. Leave `numbers` unchanged. Target: O(n²) time and O(n) extra space for the sorted copy.',
    starter: `const threeSum = numbers => {

};

// Scratch pad. Change this and press Run.
console.log(threeSum([-1, 0, 1, 2, -1, -4]));
`,
    skeleton: `const threeSum = numbers => {
  const sorted = /* a copy, sorted as numbers */;
  const triples = [];
  for (let first = 0; first < sorted.length - 2; first++) {
    // skip a first value equal to the one before it
    let left = first + 1;
    let right = sorted.length - 1;
    while (left < right) {
      // too small: move left on; too big: move right back
      // a match: record it, then step both pointers past their repeats
    }
  }
  return triples;
};`,
    hints: [
      'Sorting puts equal values next to each other, so a repeat is always the value just before. It also means that moving `left` right can only raise the sum, and moving `right` left can only lower it.',
      'After a match, `while (left < right && sorted[left] === sorted[left + 1]) left++;` and the same for `right`, then move each one a step more.',
    ],
    approach: [
      'Copy and sort: `[...numbers].sort((a, b) => a - b)`. Without the compare function, `sort` compares text and puts -5 after -10 and -2.',
      'For each index `first`, skip it when `sorted[first] === sorted[first - 1]`: every triple that starts with that value has been found already.',
      'Walk `left` and `right` over the values after it with `while (left < right)`, comparing `sorted[first] + sorted[left] + sorted[right]` with 0.',
      'On a match, push `[sorted[first], sorted[left], sorted[right]]` and move both pointers past every repeat of the values they hold.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: 'threeSum([-1, 0, 1, 2, -1, -4])', expected: [[-1, -1, 2], [-1, 0, 1]] },
      { call: 'threeSum([-2, 0, 1, 1, 2])', expected: [[-2, 0, 2], [-2, 1, 1]] },
      { call: 'threeSum([-10, 5, -2, 3, 7, 0, -5])', expected: [[-10, 3, 7], [-5, -2, 7], [-5, 0, 5]], label: 'sorted as numbers, not as text' },
      { call: 'threeSum([0, 0, 0, 0])', expected: [[0, 0, 0]], label: 'the same triple found again counts once', edge: true },
      { call: 'threeSum([1, 2, 3, -1])', expected: [], label: 'no triple adds up to zero' },
      { call: 'threeSum([0, 0])', expected: [], label: 'fewer than three numbers', edge: true },
      { call: '(() => { const numbers = [3, -3, 0]; threeSum(numbers); return numbers; })()', expected: [3, -3, 0], label: 'numbers is not changed', edge: true },
    ],
  },
  {
    id: 'alg-mh-meeting-rooms',
    track: 'algorithms',
    topic: 'algorithms',
    level: 14,
    tier: 3,
    focus: ['sort', 'two-pointer', 'for'],
    title: 'How many meeting rooms?',
    prompt: 'Each meeting is `[start, end]` in minutes from the start of the day. A meeting holds its room from `start` up to but not including `end`, so a meeting that ends at 10 and one that starts at 10 can use the same room. Write `roomsNeeded(meetings)`, returning the fewest rooms that fit every meeting. `roomsNeeded([[0, 30], [5, 10], [15, 20]])` gives 2. Pull the starts and the ends into two lists and sort each as numbers. Walk the starts with a `for` loop and keep a second pointer into the ends. A meeting that starts before the earliest end the pointer has not passed yet needs one more room. Otherwise some meeting has finished: move the end pointer on, and the new meeting takes that room. Leave `meetings` unchanged. Target: O(n log n) time and O(n) space.',
    starter: `const roomsNeeded = meetings => {

};

// Scratch pad. Change this and press Run.
console.log(roomsNeeded([[0, 30], [5, 10], [15, 20]]));
`,
    skeleton: `const roomsNeeded = meetings => {
  const starts = /* every start, sorted as numbers */;
  const ends = /* every end, sorted as numbers */;
  let rooms = 0;
  let ended = 0; // how many of the sorted ends have passed
  for (let i = 0; i < starts.length; i++) {
    // before the earliest end not passed yet: one more room
    // otherwise a meeting has finished: step past its end and reuse its room
  }
  return rooms;
};`,
    hints: [
      'You never need to know which meeting is in which room, only how many are in use at once. Sorted starts and sorted ends tell you that: at each start, every end the pointer has passed is a room that came free.',
      '`starts[i] < ends[ended]` means one more room. When it is not true, `ended++` and the count stays. Using `<` rather than `<=` is what lets a meeting start in the minute another one ends.',
    ],
    approach: [
      '`const starts = meetings.map(([start]) => start).sort((a, b) => a - b);` and the same for the ends. `map` makes new arrays, so `meetings` is left alone.',
      'Walk the starts. If `starts[i] < ends[ended]`, add a room; otherwise move `ended` on by one.',
      'Return the number of rooms.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'roomsNeeded([[0, 30], [5, 10], [15, 20]])', expected: 2 },
      { call: 'roomsNeeded([[7, 10], [2, 4]])', expected: 1 },
      { call: 'roomsNeeded([[1, 5], [2, 6], [3, 7], [4, 8]])', expected: 4, label: 'all at the same time' },
      { call: 'roomsNeeded([[1, 10], [2, 3], [4, 5], [6, 7]])', expected: 2, label: 'one long meeting beside short ones' },
      { call: 'roomsNeeded([[9, 10], [10, 11], [11, 12]])', expected: 1, label: 'a meeting may start as another ends', edge: true },
      { call: 'roomsNeeded([])', expected: 0, label: 'no meetings', edge: true },
      { call: '(() => { const meetings = [[5, 9], [1, 3]]; roomsNeeded(meetings); return meetings; })()', expected: [[5, 9], [1, 3]], label: 'meetings is not changed', edge: true },
    ],
  },
  {
    id: 'alg-mh-rotated-search',
    track: 'algorithms',
    topic: 'algorithms',
    level: 15,
    tier: 3,
    focus: ['while', 'two-pointer'],
    title: 'Search a rotated list',
    prompt: 'A sorted list of different numbers has been rotated: part of its front was cut off and moved to the back, so `[10, 20, 30, 40, 50]` may arrive as `[40, 50, 10, 20, 30]`. Write `findRotated(values, target)`, returning the index of `target`, or -1 when it is not there. Reading every value finds it, but the checks count how many values you read, and a list of 65,536 allows at most 200 reads. A binary search still works. Keep `low` and `high`, and look at the middle `while (low <= high)`. One of the two halves around the middle is always in order: check whether the target lies inside the ordered half, and keep that half if it does and the other half if it does not. The list may not be rotated at all, and it may be empty. Target: O(log n) time and O(1) space.',
    starter: `const findRotated = (values, target) => {

};

// Scratch pad. Change this and press Run.
console.log(findRotated([40, 50, 10, 20, 30], 20));
`,
    skeleton: `const findRotated = (values, target) => {
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    // the middle value is the target?
    // the half from low to middle is in order: is the target inside it?
    // otherwise the half from middle to high is in order: is the target inside that one?
  }
  return -1;
};`,
    hints: [
      'Cutting a sorted list in one place leaves at most one break in it. The side of the middle without the break is in order, and `values[low] <= values[middle]` tells you that it is the left side.',
      'Inside an ordered half you can tell for certain whether the target is there: `values[low] <= target && target < values[middle]` for the left half. If it is not there, it can only be in the other half.',
    ],
    approach: [
      'Loop `while (low <= high)` and read the middle value once into a variable. Return `middle` when it is the target.',
      'If `values[low] <= values[middle]`, the left half is in order: keep it (`high = middle - 1`) when the target lies between `values[low]` and the middle value, and drop it (`low = middle + 1`) otherwise.',
      'Otherwise the right half is in order: keep it when the target lies between the middle value and `values[high]`, and drop it otherwise.',
      'When the loop ends, the target is not in the list: return -1.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'findRotated([40, 50, 10, 20, 30], 20)', expected: 3 },
      { call: 'findRotated([40, 50, 10, 20, 30], 50)', expected: 1, label: 'in the part that was moved' },
      { call: 'findRotated([40, 50, 10, 20, 30], 35)', expected: -1, label: 'not in the list' },
      { call: 'findRotated([1, 2, 3, 4, 5, 6], 5)', expected: 4, label: 'not rotated at all', edge: true },
      { call: 'findRotated([], 3)', expected: -1, label: 'an empty list', edge: true },
      { call: 'findRotated([7], 7)', expected: 0, label: 'one value', edge: true },
      { call: countedSearch(65536, 12345, 2331), expected: [53968, true], label: 'at most 200 reads of 65,536 values' },
    ],
  },
  {
    id: 'alg-mh-nth-from-end',
    track: 'algorithms',
    topic: 'algorithms',
    level: 16,
    tier: 3,
    focus: ['two-pointer', 'while', 'objects'],
    title: 'Remove the nth node from the end',
    prompt: 'Write `removeFromEnd(head, n)` for a linked list of `{ value, next }` nodes, removing the `n`th node counted from the end, where 1 is the last node, and returning the head of the changed list. The list 1, 2, 3, 4, 5 with `n` of 2 becomes 1, 2, 3, 5. You can do it in one pass with two pointers. Move a `lead` pointer `n` nodes ahead, then move `lead` and a `trail` pointer on together `while` `lead` has a next node: `trail` then stops just before the node to remove, and `trail.next = trail.next.next` unlinks it. Removing the head is the case that needs care, because no node comes before it. A placeholder node in front of the head, `{ value: null, next: head }`, makes it the same as every other case. Change the links of the list you were given rather than building a new one. `n` is always between 1 and the length of the list. Target: O(L) time for a list of L nodes and O(1) space: a recursive walk needs a stack frame per node, and the hidden list of 5,000 nodes does not leave room for that.',
    starter: `const removeFromEnd = (head, n) => {

};

// Scratch pad. Change this and press Run.
const list = (...values) => values.reduceRight((next, value) => ({ value, next }), null);
console.log(JSON.stringify(removeFromEnd(list(1, 2, 3, 4, 5), 2)));
`,
    skeleton: `const removeFromEnd = (head, n) => {
  const placeholder = { value: null, next: head };
  let lead = placeholder;
  let trail = placeholder;
  // move lead n nodes ahead
  while (/* lead has a next node */) {
    // move both one step
  }
  // trail.next is the node to remove: unlink it
  return placeholder.next;
};`,
    hints: [
      'If `lead` starts `n` nodes ahead of `trail` and both move one node at a time, then when `lead` is on the last node, `trail` is on the node right before the one to remove.',
      'Start both pointers at a placeholder in front of the head. Removing the head is then `placeholder.next = placeholder.next.next`, like any other node, and the new head is always `placeholder.next`.',
    ],
    approach: [
      'Make `placeholder = { value: null, next: head }` and point `lead` and `trail` at it.',
      'Move `lead` forward `n` times.',
      'Move both on `while (lead.next)`. Then unlink the node after `trail` with `trail.next = trail.next.next`.',
      'Return `placeholder.next`: the old head, unless the head was the node removed.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: withList(`${LIST_VALUES} return values(removeFromEnd(list(1, 2, 3, 4, 5), 2));`), expected: [1, 2, 3, 5] },
      { call: withList(`${LIST_VALUES} return values(removeFromEnd(list(1, 2, 3), 1));`), expected: [1, 2], label: 'the last node' },
      { call: withList(`${LIST_VALUES} return values(removeFromEnd(list(1, 2), 2));`), expected: [2], label: 'the head' },
      { call: withList(`${LIST_VALUES} return values(removeFromEnd(list(1, 2, 3), 3));`), expected: [2, 3], label: 'the head of a longer list', edge: true },
      { call: withList('return removeFromEnd(list(7), 1);'), expected: null, label: 'the only node', edge: true },
      { call: withList('const head = list(1, 2, 3); const third = head.next.next; removeFromEnd(head, 2); return head.next === third;'), expected: true, label: 'the list is relinked, not copied', edge: true },
    ],
  },
  /* ── Medium: hash maps and running totals ─────────────────────────── */
  {
    id: 'alg-mh-subarray-sum',
    track: 'algorithms',
    topic: 'algorithms',
    level: 13,
    tier: 3,
    focus: ['map-set', 'for-of'],
    title: 'Stretches that add up to a target',
    prompt: 'A day of account movements is a list of whole numbers, positive for money in and negative for money out. Write `countStretches(amounts, target)`, returning how many stretches of neighbouring amounts, one or more in a row, add up to exactly `target`. `countStretches([1, 1, 1], 2)` gives 2: the first two amounts, and the last two. The amounts can be negative, so a sliding window does not work: adding the next amount can make the sum smaller. Keep a running total instead. Walk the amounts with `for...of`, and keep a `Map` from each running total to how many times it has come up so far, starting with a total of 0 seen once. A stretch that ends at the current amount adds up to `target` exactly when an earlier running total equals `total - target`, so add that count before you record the new total. Target: O(n) time and O(n) space; the hidden lists hold twenty thousand amounts.',
    starter: `const countStretches = (amounts, target) => {

};

// Scratch pad. Change this and press Run.
console.log(countStretches([1, 1, 1], 2));
`,
    skeleton: `const countStretches = (amounts, target) => {
  const seen = new Map([[0, 1]]); // running total -> how many times so far
  let total = 0;
  let count = 0;
  for (const amount of amounts) {
    // add the amount to the running total
    // count the earlier totals that equal total - target
    // then record this total
  }
  return count;
};`,
    hints: [
      'The stretch that starts just after position i and ends at position j adds up to `total[j] - total[i]`. That equals `target` exactly when `total[i] === total[j] - target`, so the question at each step is how many earlier totals equal `total - target`.',
      'The entry `[0, 1]` stands for the start of the list, before any amount. It is what lets a stretch that starts at the first amount be counted.',
    ],
    approach: [
      'Start with `total = 0`, `count = 0` and `seen = new Map([[0, 1]])`.',
      'For each amount, add it to `total`, then add `seen.get(total - target) ?? 0` to `count`.',
      'Record the new total with `seen.set(total, (seen.get(total) ?? 0) + 1)`. Look it up before you record it: the other way round, a target of 0 would count an empty stretch.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'countStretches([1, 1, 1], 2)', expected: 2 },
      { call: 'countStretches([1, 2, 3], 3)', expected: 2, label: '1 + 2, and 3 alone' },
      { call: 'countStretches([3, -1, 1, 2, -2], 3)', expected: 4, label: 'negative amounts' },
      { call: 'countStretches([1, -1, 1, -1], 0)', expected: 4, label: 'a target of zero' },
      { call: 'countStretches([0, 0, 0], 0)', expected: 6, label: 'zeros make many stretches', edge: true },
      { call: 'countStretches([], 5)', expected: 0, label: 'no amounts', edge: true },
      { call: 'countStretches([5], 5)', expected: 1, label: 'one amount', edge: true },
    ],
  },
  /* ── Medium: recursion ────────────────────────────────────────────── */
  {
    id: 'alg-mh-balanced-brackets',
    track: 'algorithms',
    topic: 'algorithms',
    level: 17,
    tier: 3,
    focus: ['recursion', 'strings'],
    title: 'Every balanced string of brackets',
    prompt: 'Write `balanced(pairs)`, returning every balanced string made of `pairs` opening and `pairs` closing round brackets, in alphabetical order, where `"("` comes before `")"`. `balanced(2)` gives `["(())", "()()"]`. Building every string of `(` and `)` and throwing away the unbalanced ones wastes most of the work: for 11 pairs that is over four million strings for 58,786 answers, and the hidden check asks for 11. Build each string one character at a time instead, with a recursive helper that knows how many of each bracket it has used. Add `(` while fewer than `pairs` have been opened, and add `)` only while it closes something still open. Trying `(` before `)` at every step gives the alphabetical order for free. `balanced(0)` gives `[""]`, the one empty string. Target: time in proportion to the answers, and O(n) stack depth.',
    starter: `const balanced = pairs => {

};

// Scratch pad. Change this and press Run.
console.log(balanced(2));
`,
    skeleton: `const balanced = pairs => {
  const found = [];
  const build = (text, opened, closed) => {
    // a full string: keep it
    // room for another "(": build on with it
    // something open to close: build on with ")"
  };
  build("", 0, 0);
  return found;
};`,
    hints: [
      'A prefix can still become balanced exactly when it has used at most `pairs` opening brackets and never closed more than it opened. Refuse every other step and each string you finish is an answer, so no work is thrown away.',
      'Build with `"("` before `")"` at every step and the answers come out in alphabetical order, because `"("` is the smaller character.',
    ],
    approach: [
      'Write `build(text, opened, closed)`. When `text.length === 2 * pairs`, push `text` and return.',
      'If `opened < pairs`, call `build(text + "(", opened + 1, closed)`.',
      'If `closed < opened`, call `build(text + ")", opened, closed + 1)`.',
      'Start with `build("", 0, 0)` and return what was found.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'balanced(1)', expected: ['()'] },
      { call: 'balanced(2)', expected: ['(())', '()()'] },
      { call: 'balanced(3)', expected: ['((()))', '(()())', '(())()', '()(())', '()()()'] },
      { call: 'balanced(4).length', expected: 14, label: 'fourteen for four pairs' },
      { call: '(() => { const all = balanced(5); return [all.length, all[0], all[all.length - 1]]; })()', expected: [42, '((((()))))', '()()()()()'], label: 'first and last in order' },
      { call: 'balanced(0)', expected: [''], label: 'no pairs: one empty string', edge: true },
    ],
  },
  {
    id: 'alg-mh-check-bst',
    track: 'algorithms',
    topic: 'algorithms',
    level: 18,
    tier: 3,
    focus: ['recursion', 'objects'],
    title: 'Is it a search tree?',
    prompt: 'In a binary search tree, every value in a node’s left subtree is smaller than the node’s value, and every value in its right subtree is larger. Write `isSearchTree(root)` for a tree of `{ value, left, right }` nodes, returning `true` or `false`. Comparing each node only with its own two children is not enough: when the root is 10, a 12 below its left child 5 is larger than 5 and still breaks the rule for 10. Pass the allowed range down instead. A recursive helper takes a node, the value it must be above and the value it must be below, and narrows the range for each child it visits. Equal values are not allowed anywhere. An empty tree, `null`, is a search tree. Target: O(n) time and O(h) space for a tree of height h.',
    starter: `const isSearchTree = root => {

};

// Scratch pad. Change this and press Run.
const node = (value, left = null, right = null) => ({ value, left, right });
console.log(isSearchTree(node(2, node(1), node(3))));
`,
    skeleton: `const isSearchTree = root => {
  const within = (node, low, high) => {
    // an empty subtree breaks no rule
    // the value must be above low and below high
    // the left child gets the range (low, value); the right child (value, high)
  };
  return within(root, -Infinity, Infinity);
};`,
    hints: [
      'Every node sits inside a range that all its ancestors set together: going left lowers the ceiling to the parent’s value, and going right raises the floor. A node’s own children cannot tell you that range.',
      'Start with `-Infinity` and `Infinity`, so the root may hold any number and no special value is needed for "no limit yet". A check like `if (low && value <= low)` skips a floor of 0.',
    ],
    approach: [
      'Write `within(node, low, high)`. A `null` node returns `true`.',
      'If `node.value <= low` or `node.value >= high`, return `false`: equal breaks the rule too.',
      'Return `within(node.left, low, node.value) && within(node.right, node.value, high)`.',
      'Call it on the root with `-Infinity` and `Infinity`.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: withTree('isSearchTree(node(2, node(1), node(3)))'), expected: true },
      { call: withTree('isSearchTree(node(10, node(5, null, node(12)), node(15)))'), expected: false, label: 'a grandchild on the wrong side of the root' },
      { call: withTree('isSearchTree(node(5, node(1), node(4, node(3), node(6))))'), expected: false, label: 'a right child smaller than its parent' },
      { call: withTree('isSearchTree(node(8, node(3, node(1), node(6, node(4), node(7))), node(10, null, node(14, node(13)))))'), expected: true, label: 'a larger search tree' },
      { call: withTree('isSearchTree(node(2, node(2)))'), expected: false, label: 'equal values are not allowed', edge: true },
      { call: 'isSearchTree(null)', expected: true, label: 'an empty tree', edge: true },
    ],
  },
  {
    id: 'alg-mh-fewest-coins',
    track: 'algorithms',
    topic: 'algorithms',
    level: 19,
    tier: 3,
    focus: ['recursion', 'map-set', 'for-of'],
    title: 'Fewest coins when greedy fails',
    prompt: 'Taking the largest coin that fits, again and again, gives the fewest coins for euro coins, but not for every set of coins: with coins of 1, 3 and 4, that way pays 6 as 4 + 1 + 1, and 3 + 3 is one coin fewer. Write `fewestCoins(coins, amount)`, returning the smallest number of coins that add up to `amount`, or -1 when no mix of the coins can. Every coin can be used any number of times. Write a recursive helper `best(left)`: 0 needs no coins, and otherwise try each coin with `for...of` and take one more than the best way to pay what is left. The same `left` comes up again and again, so keep every answer in a `Map`, the amounts that cannot be paid included, and look there first. Without it the hidden amounts of several hundred never finish. Target: O(amount × c) time for c coins, and O(amount) space.',
    starter: `const fewestCoins = (coins, amount) => {

};

// Scratch pad. Change this and press Run.
console.log(fewestCoins([1, 3, 4], 6));
`,
    skeleton: `const fewestCoins = (coins, amount) => {
  const memo = new Map(); // amount left -> fewest coins, or Infinity when it cannot be paid
  const best = left => {
    // 0 needs no coins; below 0 cannot be paid
    // an answer in the memo: use it
    // otherwise try each coin, keep the smallest 1 + best(left - coin), and remember it
  };
  const answer = best(amount);
  return answer === Infinity ? -1 : answer;
};`,
    hints: [
      '`best(6)` with coins 1, 3 and 4 is one more than the smallest of `best(5)`, `best(3)` and `best(2)`. Each of those asks the same question about a smaller amount, down to `best(0)`, which is 0.',
      'Remember the amounts that cannot be paid as well: keep `Infinity` for them in the Map. If you only remember the successes, an amount like 999 with coins of 4 and 6 is worked out again every time it comes up.',
    ],
    approach: [
      'Write `best(left)`: return 0 for 0, and `Infinity` for anything below 0.',
      'Look in the Map first, and return what it holds when `left` is there.',
      'Otherwise start from `Infinity`, and for each coin keep the smaller of that and `1 + best(left - coin)`. Store the result under `left` before you return it.',
      'Call `best(amount)` and turn `Infinity` into -1.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      { call: 'fewestCoins([1, 3, 4], 6)', expected: 2, label: 'where the largest coin first goes wrong' },
      { call: 'fewestCoins([1, 2, 5], 11)', expected: 3 },
      { call: 'fewestCoins([9, 6, 1], 12)', expected: 2, label: '6 + 6, not 9 + 1 + 1 + 1' },
      { call: 'fewestCoins([5, 10], 25)', expected: 3 },
      { call: 'fewestCoins([2], 3)', expected: -1, label: 'no mix of the coins pays it', edge: true },
      { call: 'fewestCoins([7, 3], 0)', expected: 0, label: 'nothing to pay', edge: true },
    ],
  },
  /* ── Hard ─────────────────────────────────────────────────────────── */
  {
    id: 'alg-mh-trapped-rain',
    track: 'algorithms',
    topic: 'algorithms',
    level: 20,
    tier: 4,
    focus: ['two-pointer', 'while'],
    title: 'Rain between the walls',
    prompt: 'A row of walls, each one unit wide, is given by their heights: `[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]`. After rain, water stands above each position up to the lower of two walls: the tallest one at or to its left and the tallest one at or to its right. Write `trappedWater(heights)`, returning how many units of water the row holds; that example holds 6. Looking left and right from every position is O(n²), and the hidden rows of fifty thousand walls need better. Walk two pointers in from both ends `while` they have not met, and keep the tallest wall seen from each side. Move the side whose tallest wall is lower. The water above that position is settled by its own side, because the other side is known to have a wall at least as tall. Target: O(n) time and O(1) space.',
    starter: `const trappedWater = heights => {

};

// Scratch pad. Change this and press Run.
console.log(trappedWater([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]));
`,
    skeleton: `const trappedWater = heights => {
  let left = 0;
  let right = heights.length - 1;
  let tallestLeft = 0;
  let tallestRight = 0;
  let water = 0;
  while (left < right) {
    // raise each side's tallest wall with the wall under its pointer
    // on the side whose tallest wall is lower: add the water above this position and step inward
  }
  return water;
};`,
    hints: [
      'The water above one position is `Math.min(tallestLeft, tallestRight) - height`, where the tallest walls count the position itself. The question is how to know both of them without looking both ways from every position.',
      'If the tallest wall seen from the left is no taller than the tallest seen from the right, the left position’s water is settled: whatever lies between the pointers, its right side has a wall at least that tall. So that side can move.',
    ],
    approach: [
      'Start `left` at 0 and `right` at the last index, with the tallest wall seen from each side at 0.',
      'Each time round, raise `tallestLeft` with `heights[left]` and `tallestRight` with `heights[right]`.',
      'If `tallestLeft <= tallestRight`, add `tallestLeft - heights[left]` and move `left` right; otherwise add `tallestRight - heights[right]` and move `right` left.',
      'Stop when the pointers meet and return the total.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    tests: [
      { call: 'trappedWater([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])', expected: 6 },
      { call: 'trappedWater([4, 2, 0, 3, 2, 5])', expected: 9 },
      { call: 'trappedWater([3, 0, 3])', expected: 3, label: 'one dip' },
      { call: 'trappedWater([1, 2, 3, 4])', expected: 0, label: 'rising all the way holds nothing' },
      { call: 'trappedWater([5, 0, 0, 0, 1])', expected: 3, label: 'the lower wall sets the level', edge: true },
      { call: 'trappedWater([])', expected: 0, label: 'no walls', edge: true },
      { call: 'trappedWater([5])', expected: 0, label: 'one wall', edge: true },
    ],
  },
  {
    id: 'alg-mh-fastest-route',
    track: 'algorithms',
    topic: 'algorithms',
    level: 21,
    tier: 4,
    focus: ['map-set', 'while', 'objects'],
    title: 'The fastest route between stations',
    prompt: 'A rail map lists its tracks as `[from, to, minutes]`, and every track runs both ways. Write `fastestRoute(tracks, start, goal)`, returning `{ minutes, route }` for the quickest journey, where `route` lists the stations from `start` to `goal`, or `null` when `goal` cannot be reached. Every map in the checks has one quickest route. Breadth first finds the route with the fewest tracks, which is not always the quickest one. Use Dijkstra’s method. Build each station’s neighbours in a `Map`, keep the best time found so far to each station in a second `Map` and the station it was reached from in a third, and `while` some station that has been reached is not settled yet, settle the one with the smallest time: try every track out of it, and keep a new time only when it beats the one you had. The goal is done when it is settled, not when it is first reached. Station names can be any text, `"constructor"` included. Scanning for the smallest time is fine for a map this size; a large one would need a heap. Target: O(V² + E) time for V stations and E tracks, and O(V + E) space.',
    starter: `const fastestRoute = (tracks, start, goal) => {

};

// Scratch pad. Change this and press Run.
console.log(fastestRoute([["A", "B", 5], ["B", "C", 5], ["A", "C", 20]], "A", "C"));
`,
    skeleton: `const fastestRoute = (tracks, start, goal) => {
  const neighbours = new Map(); // station -> [[station, minutes], ...]
  // add every track in both directions
  const time = new Map([[start, 0]]); // best time found so far
  const cameFrom = new Map();
  const settled = new Set();
  while (/* some reached station is not settled */) {
    // settle the unsettled station with the smallest time; stop at the goal
    // try each track out of it, keeping a time only when it is better
  }
  // no route: null; otherwise walk cameFrom back from the goal
};`,
    hints: [
      'A station’s time is final once it is the smallest of all the unsettled ones: every other way to it would go through a station that is already at least as far away, and minutes are never negative.',
      'Reaching the goal early does not make that route the fastest. In `[["S", "T", 10], ["S", "A", 1], ["A", "T", 2]]` the goal is first reached in 10 minutes, and only settling it later gives the 3-minute route through A.',
    ],
    approach: [
      'Build `neighbours` as a `Map` of arrays, pushing `[to, minutes]` under `from` and `[from, minutes]` under `to`. A `Map` keeps a station called `"constructor"` apart from what every plain object inherits.',
      'Start with a time of 0 for `start`. Loop: pick the reached, unsettled station with the smallest time, stop if there is none, and settle it.',
      'If it is the goal, walk `cameFrom` back to `start`, reverse the stations, and return them with the goal’s time.',
      'Otherwise, for each neighbour, when `time + minutes` beats the neighbour’s best time or it has none yet, store the new time and set `cameFrom` to the current station. If the loop runs out, return `null`.',
    ],
    verify: 'tests',
    estimatedMinutes: 40,
    tests: [
      { call: 'fastestRoute([["A", "B", 5], ["B", "C", 5], ["A", "C", 20]], "A", "C")', expected: { minutes: 10, route: ['A', 'B', 'C'] }, label: 'two short tracks beat one long one' },
      { call: 'fastestRoute([["A", "B", 1], ["B", "D", 10], ["A", "C", 2], ["C", "D", 2]], "A", "D")', expected: { minutes: 4, route: ['A', 'C', 'D'] }, label: 'the quickest first track is not the way' },
      { call: 'fastestRoute([["A", "B", 4], ["A", "C", 1], ["C", "B", 1]], "B", "A")', expected: { minutes: 2, route: ['B', 'C', 'A'] }, label: 'tracks run both ways' },
      { call: `fastestRoute(${ROUTE_MAP}, "Dock", "Gate")`, expected: { minutes: 20, route: ['Dock', 'Park', 'Hill', 'Gate'] }, label: 'six stations' },
      { call: 'fastestRoute([["S", "T", 10], ["S", "A", 1], ["A", "T", 2]], "S", "T")', expected: { minutes: 3, route: ['S', 'A', 'T'] }, label: 'the first time the goal is reached is not its best', edge: true },
      { call: 'fastestRoute([["A", "B", 3]], "A", "Z")', expected: null, label: 'the goal cannot be reached', edge: true },
      { call: 'fastestRoute([], "A", "A")', expected: { minutes: 0, route: ['A'] }, label: 'already there', edge: true },
    ],
  },
  {
    id: 'alg-mh-longest-rising',
    track: 'algorithms',
    topic: 'algorithms',
    level: 22,
    tier: 4,
    focus: ['while', 'two-pointer', 'for-of'],
    title: 'The longest rising run of scores',
    prompt: 'A player’s scores come in game by game. Write `longestRising(scores)`, returning the length of the longest strictly rising sequence you can pick from them, keeping their order but skipping any games you like. `longestRising([10, 9, 2, 5, 3, 7, 101, 18])` gives 4, for example with 2, 3, 7, 18. Comparing every game with every earlier one is O(n²), too slow for the hidden lists of twenty thousand scores. Keep a list `tails` instead, where `tails[k]` is the smallest score that ends a rising sequence of length k + 1 found so far; it is always sorted. Walk the scores with `for...of`. For each one, find the first tail that is not smaller than it with a binary search that moves `low` and `high` `while` they differ, and replace that tail with the score, or add the score at the end when every tail is smaller. The answer is the length of `tails`. Target: O(n log n) time and O(n) space.',
    starter: `const longestRising = scores => {

};

// Scratch pad. Change this and press Run.
console.log(longestRising([10, 9, 2, 5, 3, 7, 101, 18]));
`,
    skeleton: `const longestRising = scores => {
  const tails = []; // tails[k]: the smallest score that ends a rising run of length k + 1
  for (const score of scores) {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      // halve the range: look for the first tail that is not smaller than score
    }
    // replace that tail; when low === tails.length this adds the score at the end
  }
  return tails.length;
};`,
    hints: [
      'For each length, only the smallest score that ends a rising run of that length matters: any later score that could extend another run of that length can extend this one too. Those smallest endings rise with the length, which is why `tails` stays sorted and can be binary searched.',
      'A new score belongs where the first tail that is not smaller than it sits: it ends a run of that length with a lower score. If every tail is smaller, it makes the longest run one longer.',
    ],
    approach: [
      'Start with an empty `tails` and walk the scores with `for...of`.',
      'Binary search with `low = 0` and `high = tails.length`: `while (low < high)`, take the middle, and if `tails[middle] < score` move `low` to `middle + 1`, otherwise move `high` to `middle`.',
      'Set `tails[low] = score`. When `low` is `tails.length`, that adds it at the end.',
      'Return `tails.length`. The scores left in `tails` are not always a real rising run; only its length is the answer.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: 'longestRising([10, 9, 2, 5, 3, 7, 101, 18])', expected: 4 },
      { call: 'longestRising([0, 1, 0, 3, 2, 3])', expected: 4 },
      { call: 'longestRising([1, 2, 3, 4, 5])', expected: 5, label: 'rising all the way' },
      { call: 'longestRising([5, 4, 3, 2, 1])', expected: 1, label: 'falling all the way' },
      { call: 'longestRising([7, 7, 7, 7])', expected: 1, label: 'equal scores do not rise', edge: true },
      { call: 'longestRising([])', expected: 0, label: 'no scores', edge: true },
    ],
  },
  {
    id: 'alg-mh-tree-to-text',
    track: 'algorithms',
    topic: 'algorithms',
    level: 23,
    tier: 4,
    focus: ['recursion', 'strings', 'objects'],
    title: 'Save a tree as text and read it back',
    prompt: 'Write two functions for binary trees of `{ value, left, right }` nodes holding whole numbers. `serialize(root)` writes the tree as text: the values in preorder, a node and then its left subtree and then its right one, separated by commas, with `#` for every missing child. A root of 1 with children 2 and 3 becomes `"1,2,#,#,3,#,#"`, and an empty tree is `"#"`. `deserialize(text)` reads that text back into a tree equal to the one that was written. Both are recursive. Writing a node is its value, then the writing of its left subtree, then of its right one. Reading takes the next item from a position the whole read shares: `#` gives `null`, and anything else gives a node whose left and right come from the next two reads. Values can be negative or have several digits, so split on commas rather than reading one character at a time. Target: O(n) time and O(n) space for each.',
    starter: `const serialize = root => {

};

const deserialize = text => {

};

// Scratch pad. Change this and press Run.
const node = (value, left = null, right = null) => ({ value, left, right });
console.log(serialize(node(1, node(2), node(3))));
`,
    skeleton: `const serialize = root => {
  const parts = [];
  const write = node => {
    // "#" for a missing node; otherwise the value, then the left subtree, then the right one
  };
  write(root);
  return parts.join(",");
};

const deserialize = text => {
  const parts = text.split(",");
  let next = 0; // the position of the next item to read
  const read = () => {
    // take the next item: "#" is null, anything else a node whose left and right are read next
  };
  return read();
};`,
    hints: [
      'Preorder with a marker for every missing child is enough to rebuild the tree: reading it back, each item is either a whole empty subtree (`#`) or a node followed by exactly its left subtree and then its right one.',
      'Keep the reading position outside the recursive helper but inside `deserialize`. Each call of `deserialize` then starts from the first item, and every recursive read moves the same position on.',
    ],
    approach: [
      '`serialize`: a helper pushes `"#"` for `null`, or `String(node.value)` followed by the writing of its left and right subtrees, into one array. Join the array with commas.',
      '`deserialize`: split on commas and keep an index at 0.',
      'A `read()` helper takes the item at the index and moves the index on. For `"#"` it returns `null`; otherwise it returns `{ value: Number(item), left: read(), right: read() }`, which reads the left subtree before the right one.',
      'Return the first `read()`.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: withTree('serialize(node(1, node(2), node(3)))'), expected: '1,2,#,#,3,#,#' },
      { call: withTree('serialize(node(1, null, node(2, node(3))))'), expected: '1,#,2,3,#,#,#', label: 'a missing left child' },
      { call: 'deserialize("1,2,#,#,3,#,#")', expected: tree(1, tree(2), tree(3)) },
      { call: withTree('deserialize(serialize(node(-7, node(120, node(0)), node(35))))'), expected: tree(-7, tree(120, tree(0)), tree(35)), label: 'negative, zero and several digits survive the trip', edge: true },
      { call: 'serialize(null)', expected: '#', label: 'an empty tree', edge: true },
      { call: 'deserialize("#")', expected: null, label: 'reading an empty tree', edge: true },
    ],
  },
  {
    id: 'alg-mh-smallest-window',
    track: 'algorithms',
    topic: 'algorithms',
    level: 24,
    tier: 4,
    focus: ['two-pointer', 'map-set', 'strings', 'while'],
    title: 'The smallest window that holds every letter',
    prompt: 'Write `smallestWindow(text, letters)`, returning the shortest stretch of `text` that contains every character of `letters`, repeats counted: if `letters` is `"aab"`, the stretch needs two `a`s and a `b`. `smallestWindow("ADOBECODEBANC", "ABC")` gives `"BANC"`. Return `""` when no stretch holds them all or when `letters` is empty, and the leftmost one when two shortest stretches tie. Characters are case-sensitive. Trying every start and end is far too slow for the hidden text of fifty thousand characters. Count what `letters` needs in a `Map`, and keep one number for how many needed characters the window still lacks. Grow the window by moving its right edge; `while` it lacks nothing, record it if it is the shortest so far, then shrink it from the left. Each edge only ever moves forward. Target: O(n + m) time and O(k) space for k distinct letters.',
    starter: `const smallestWindow = (text, letters) => {

};

// Scratch pad. Change this and press Run.
console.log(smallestWindow("ADOBECODEBANC", "ABC"));
`,
    skeleton: `const smallestWindow = (text, letters) => {
  if (letters === "") return "";
  const need = new Map(); // character -> how many more the window needs
  for (const char of letters) need.set(char, (need.get(char) ?? 0) + 1);
  let missing = letters.length;
  let best = "";
  let left = 0;
  for (let right = 0; right < text.length; right++) {
    // take text[right] in; if it was still needed, one fewer is missing
    while (missing === 0) {
      // keep the window if it is the shortest so far
      // give text[left] back; if the window now lacks it, one more is missing
      // move left on
    }
  }
  return best;
};`,
    hints: [
      'Keep a single number, `missing`: how many characters of `letters` the window still lacks, repeats counted. The window holds everything exactly when it is 0, so you never compare two Maps.',
      'Let a count in `need` go below zero when the window holds more of a character than it needs. Giving one back makes something missing only when its count goes from 0 to 1.',
    ],
    approach: [
      'Count what `letters` needs in a `Map`, and set `missing` to the length of `letters`.',
      'Move the right edge along the text. When its character is in the Map, lower its count, and if the count was above 0, lower `missing` too.',
      '`while (missing === 0)`: keep the window if it is shorter than the best so far, then give back the character at the left edge (raise its count, and if the count is now above 0, raise `missing`) and move the left edge on.',
      'Return the best window, or `""` if the window never held everything.',
    ],
    verify: 'tests',
    estimatedMinutes: 40,
    tests: [
      { call: 'smallestWindow("ADOBECODEBANC", "ABC")', expected: 'BANC' },
      { call: 'smallestWindow("cabwefgewcwaefgcf", "cae")', expected: 'cwae' },
      { call: 'smallestWindow("aaflslflsldkalskaaa", "aaa")', expected: 'aaa', label: 'a letter needed three times' },
      { call: 'smallestWindow("a", "aa")', expected: '', label: 'a repeat must be found twice', edge: true },
      { call: 'smallestWindow("AbC", "abc")', expected: '', label: 'case matters', edge: true },
      { call: 'smallestWindow("xyz", "")', expected: '', label: 'no letters', edge: true },
    ],
  },
  {
    id: 'alg-mh-merge-contacts',
    track: 'algorithms',
    topic: 'algorithms',
    level: 24,
    tier: 4,
    focus: ['map-set', 'recursion', 'sort', 'objects'],
    title: 'Merge contacts that share an email',
    prompt: 'An address book holds contacts `{ name, emails }`. Two contacts are the same person when they share an email, and that chains: if contact A shares an email with B, and B shares one with C, all three are one person even though A and C share nothing. Write `mergeContacts(contacts)`, returning one `{ name, emails }` per person, with the name of that person’s first contact in the book and every email they have, once each, sorted with `sort()`. List the people in the order their first contacts appear. Build a `Map` from each email to the contacts that list it. Then walk it with a recursive helper that visits a contact, collects its emails and visits every contact that shares one, keeping the visited contacts in a `Set` so none is visited twice. Leave `contacts` unchanged. Target: O(E log E) time for E emails in all, for the sorting, and O(E) space.',
    starter: `const mergeContacts = contacts => {

};

// Scratch pad. Change this and press Run.
console.log(JSON.stringify(mergeContacts([
  { name: "Ada", emails: ["ada@home.dev", "ada@work.dev"] },
  { name: "Ada L", emails: ["ada@work.dev", "lovelace@work.dev"] },
])));
`,
    skeleton: `const mergeContacts = contacts => {
  const byEmail = new Map(); // email -> the indexes of the contacts that list it
  // fill it
  const visited = new Set();
  const visit = (index, emails) => {
    // mark the contact, add its emails, and visit every unvisited contact on each of them
  };
  const people = [];
  contacts.forEach((contact, index) => {
    // a contact not visited yet starts a new person, named after it
  });
  return people;
};`,
    hints: [
      'Think of each contact as a point, and of each shared email as a line between two points. A person is everything you can reach from one contact by following lines, which is what a depth-first walk collects.',
      'Going through the contacts in book order and starting a new person at each one not visited yet gives both the order of the people and their names: the first contact of each person is the one that starts it.',
    ],
    approach: [
      'Build a `Map` from each email to the indexes of the contacts that list it.',
      'Write a recursive `visit(index, emails)` that adds the index to a `visited` Set, adds the contact’s emails to a Set of emails, and visits every contact listed under each of those emails that is not visited yet.',
      'Go through the contacts in order. Each one not visited yet starts a person: visit it, then push `{ name, emails: [...emails].sort() }`.',
      'Return the people. Sorting a new array leaves each contact’s own `emails` as they were.',
    ],
    verify: 'tests',
    estimatedMinutes: 40,
    tests: [
      {
        call: 'mergeContacts([{ name: "Ada", emails: ["ada@work.dev", "ada@home.dev"] }, { name: "Ada L", emails: ["lovelace@work.dev", "ada@work.dev"] }, { name: "Bo", emails: ["bo@home.dev"] }])',
        expected: [{ name: 'Ada', emails: ['ada@home.dev', 'ada@work.dev', 'lovelace@work.dev'] }, { name: 'Bo', emails: ['bo@home.dev'] }],
      },
      {
        call: 'mergeContacts([{ name: "A", emails: ["a@x.dev"] }, { name: "B", emails: ["b@x.dev"] }, { name: "C", emails: ["b@x.dev", "a@x.dev"] }])',
        expected: [{ name: 'A', emails: ['a@x.dev', 'b@x.dev'] }],
        label: 'a later contact joins two earlier ones',
      },
      {
        call: 'mergeContacts([{ name: "Cy", emails: ["c@x.dev"] }, { name: "Di", emails: ["d@x.dev"] }, { name: "Dee", emails: ["e@x.dev", "d@x.dev"] }, { name: "Cyd", emails: ["f@x.dev", "c@x.dev"] }])',
        expected: [{ name: 'Cy', emails: ['c@x.dev', 'f@x.dev'] }, { name: 'Di', emails: ['d@x.dev', 'e@x.dev'] }],
        label: 'people in the order their first contacts appear',
      },
      {
        call: 'mergeContacts([{ name: "Sam", emails: ["s1@x.dev"] }, { name: "Sam", emails: ["s2@x.dev"] }])',
        expected: [{ name: 'Sam', emails: ['s1@x.dev'] }, { name: 'Sam', emails: ['s2@x.dev'] }],
        label: 'the same name is not the same person',
        edge: true,
      },
      {
        call: 'mergeContacts([{ name: "Lin", emails: ["lin@x.dev", "lin@x.dev"] }])',
        expected: [{ name: 'Lin', emails: ['lin@x.dev'] }],
        label: 'an email listed twice appears once',
        edge: true,
      },
      { call: 'mergeContacts([])', expected: [], label: 'an empty book', edge: true },
    ],
  },
  {
    id: 'alg-mh-split-words',
    track: 'algorithms',
    topic: 'algorithms',
    level: 25,
    tier: 4,
    focus: ['recursion', 'map-set', 'strings'],
    title: 'Split text into dictionary words',
    prompt: 'Hashtags and domain names run words together. Write `splitWords(text, words)`, returning every way to cut `text` into words from the `words` list, each written as its words joined by single spaces, and the whole list sorted with `sort()`. `splitWords("catsanddog", ["cat", "cats", "and", "sand", "dog"])` gives `["cat sand dog", "cats and dog"]`. A word can be used any number of times, and an empty `text` has one split, the empty string. Return `[]` when there is no split. Write a recursive helper `from(start)` returning every split of the text from `start` to the end: for each word the text continues with at `start`, put that word in front of every split of what follows it. Put the words in a `Set` so each piece is one lookup. Many starts are reached along many paths, so keep each start’s answer in a `Map`, empty answers included. Without it, the hidden text of thirty `a`s followed by a `b` never finishes. Target: O(n² + the length of the answers) time for a text of n characters.',
    starter: `const splitWords = (text, words) => {

};

// Scratch pad. Change this and press Run.
console.log(splitWords("catsanddog", ["cat", "cats", "and", "sand", "dog"]));
`,
    skeleton: `const splitWords = (text, words) => {
  const dictionary = new Set(words);
  const memo = new Map(); // start -> every split of the text from start
  const from = start => {
    // the end of the text has one split: ""
    // a start worked out before: reuse its answer
    // for each end after start: if text.slice(start, end) is a word,
    //   put it in front of every split from end
    // remember the answer, empty or not
  };
  return /* every split from 0, sorted */;
};`,
    hints: [
      'Every split of the text from `start` is a word the text continues with at `start`, followed by a split of what is left. So the splits from `start` are built out of the splits from later positions, and the end of the text has exactly one split, the empty one.',
      'Store every start’s answer in the Map, empty lists included. A start with no split is the one most worth remembering: in a long run of `a`s it is reached along more paths than you could ever count.',
    ],
    approach: [
      'Put the words in a `Set`. Write `from(start)`: at the end of the text return `[""]`, and return the Map’s answer when it has one.',
      'Otherwise, for each `end` from `start + 1` to the length, when `text.slice(start, end)` is in the Set, add that word in front of every split from `end`, with a space between them unless the rest is empty.',
      'Store the list under `start` before you return it.',
      'Return a sorted copy of `from(0)`.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: `splitWords("catsanddog", ${WORDS})`, expected: ['cat sand dog', 'cats and dog'] },
      { call: 'splitWords("pineapplepenapple", ["apple", "pen", "applepen", "pine", "pineapple"])', expected: ['pine apple pen apple', 'pine applepen apple', 'pineapple pen apple'] },
      { call: 'splitWords("aaaa", ["a", "aa"])', expected: ['a a a a', 'a a aa', 'a aa a', 'aa a a', 'aa aa'], label: 'words used more than once' },
      { call: `splitWords("catsandog", ${WORDS})`, expected: [], label: 'no split', edge: true },
      { call: 'splitWords("Dog", ["dog"])', expected: [], label: 'case matters', edge: true },
      { call: 'splitWords("", ["a"])', expected: [''], label: 'an empty text has one split', edge: true },
    ],
  },
];
