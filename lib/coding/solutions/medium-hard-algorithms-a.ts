// Server-only reference solutions and hidden tests for
// lib/coding/tasks/medium-hard-algorithms-a.ts. Never import from client code.
// The hidden tests aim at the shortcut each visible set leaves open: the
// technique the task combines, a value or shape the visible checks never used,
// and the case a plausible wrong answer gets wrong. Where the cost is the
// point, one hidden check is large enough that the brute force runs out of the
// grader's 2.5-second budget, or it counts the reads.

import type { CodingSolution } from '../types';
import { tree, withList, withTree } from '../tasks/easy-algorithms-a';

const LIST_VALUES = 'const values = node => { const out = []; for (; node; node = node.next) out.push(node.value); return out; };';

const countedSearch = (n: number, cut: number, target: number): string =>
  `(() => { const base = Array.from({ length: ${n} }, (_, i) => ((i + ${cut}) % ${n}) * 3); let reads = 0; const values = new Proxy(base, { get(list, key, receiver) { if (typeof key === "string" && /^\\d+$/.test(key)) reads++; return Reflect.get(list, key, receiver); } }); return [findRotated(values, ${target}), reads <= 200]; })()`;

const GRID_TRACKS = 'const tracks = []; for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) { if (c < 9) tracks.push([r + ":" + c, r + ":" + (c + 1), (r * 7 + c * 13) % 9 + 1]); if (r < 9) tracks.push([r + ":" + c, (r + 1) + ":" + c, (r * 11 + c * 5) % 9 + 1]); }';

export const MEDIUM_HARD_ALGORITHMS_A_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── Medium: sorting and pointers ─────────────────────────────────── */
  'alg-mh-three-sum': {
    solution: `const threeSum = numbers => {
  // A sorted copy: compared as numbers, and the caller's list left alone.
  const sorted = [...numbers].sort((a, b) => a - b);
  const triples = [];
  for (let first = 0; first < sorted.length - 2; first++) {
    // Every triple that starts with this value was found at its first copy.
    if (first > 0 && sorted[first] === sorted[first - 1]) continue;
    let left = first + 1;
    let right = sorted.length - 1;
    while (left < right) {
      const sum = sorted[first] + sorted[left] + sorted[right];
      if (sum < 0) left++; // only a larger value on the left can raise the sum
      else if (sum > 0) right--; // only a smaller value on the right can lower it
      else {
        triples.push([sorted[first], sorted[left], sorted[right]]);
        // Step past every repeat, so the same values are not recorded twice.
        while (left < right && sorted[left] === sorted[left + 1]) left++;
        while (left < right && sorted[right] === sorted[right - 1]) right--;
        left++;
        right--;
      }
    }
  }
  return triples;
};`,
    junior: `const threeSum = numbers => {
  const sorted = [];
  for (const number of numbers) {
    sorted.push(number);
  }
  sorted.sort((a, b) => a - b);
  const triples = [];
  for (let first = 0; first < sorted.length - 2; first++) {
    const firstValue = sorted[first];
    if (first > 0 && firstValue === sorted[first - 1]) {
      continue;
    }
    let left = first + 1;
    let right = sorted.length - 1;
    while (left < right) {
      const leftValue = sorted[left];
      const rightValue = sorted[right];
      const sum = firstValue + leftValue + rightValue;
      if (sum < 0) {
        left = left + 1;
      } else if (sum > 0) {
        right = right - 1;
      } else {
        triples.push([firstValue, leftValue, rightValue]);
        while (left < right && sorted[left] === leftValue) {
          left = left + 1;
        }
        while (left < right && sorted[right] === rightValue) {
          right = right - 1;
        }
      }
    }
  }
  return triples;
};`,
    senior: `const threeSum = numbers => {
  const sorted = numbers.toSorted((a, b) => a - b);
  const triples = [];
  // Once the first value is above 0, three of them cannot add up to 0.
  for (let first = 0; first < sorted.length - 2 && sorted[first] <= 0; first++) {
    if (sorted[first] === sorted[first - 1]) continue; // sorted[-1] is undefined
    let left = first + 1;
    let right = sorted.length - 1;
    while (left < right) {
      const sum = sorted[first] + sorted[left] + sorted[right];
      if (sum < 0) left++;
      else if (sum > 0) right--;
      else {
        triples.push([sorted[first], sorted[left++], sorted[right--]]);
        // A repeat on the right is skipped by the sum itself: it is now too big.
        while (left < right && sorted[left] === sorted[left - 1]) left++;
      }
    }
  }
  return triples;
};`,
    hiddenTests: [
      { call: 'threeSum([3, 0, -2, -1, 1, 2])', expected: [[-2, -1, 3], [-2, 0, 2], [-1, 0, 1]] },
      { call: 'threeSum([-1, -1, -1, 2, 2, 2])', expected: [[-1, -1, 2]] },
      { call: 'threeSum([1, -1, 0])', expected: [[-1, 0, 1]] },
      { call: 'threeSum([5, -5, 0, 5, -5])', expected: [[-5, 0, 5]] },
      { call: 'threeSum([-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6])', expected: [[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]] },
      { call: 'threeSum(Array.from({ length: 300 }, (_, i) => (i % 7) - 3))', expected: [[-3, 0, 3], [-3, 1, 2], [-2, -1, 3], [-2, 0, 2], [-2, 1, 1], [-1, -1, 2], [-1, 0, 1], [0, 0, 0]] },
      { call: '(() => { const found = threeSum(Array.from({ length: 800 }, (_, i) => (i * i * 7919 + i * 31) % 100003 - 50001)); return [found.length, found[0], found[found.length - 1]]; })()', expected: [581, [-50001, 1543, 48458], [-1112, -579, 1691]] },
    ],
  },
  'alg-mh-meeting-rooms': {
    solution: `const roomsNeeded = meetings => {
  // map makes new arrays, so sorting them leaves meetings alone.
  const starts = meetings.map(([start]) => start).sort((a, b) => a - b);
  const ends = meetings.map(([, end]) => end).sort((a, b) => a - b);
  let rooms = 0;
  let ended = 0; // how many of the sorted ends have passed
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] < ends[ended]) {
      rooms++; // nothing has finished yet: one more room
    } else {
      ended++; // the earliest meeting still running is over; take its room
    }
  }
  return rooms;
};`,
    junior: `const roomsNeeded = meetings => {
  const starts = [];
  const ends = [];
  for (const meeting of meetings) {
    starts.push(meeting[0]);
    ends.push(meeting[1]);
  }
  starts.sort((a, b) => a - b);
  ends.sort((a, b) => a - b);
  let rooms = 0;
  let endIndex = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] < ends[endIndex]) {
      rooms = rooms + 1;
    } else {
      endIndex = endIndex + 1;
    }
  }
  return rooms;
};`,
    senior: `const roomsNeeded = meetings => {
  // One event per start (+1) and per end (-1). At the same minute an end sorts
  // first, so a room frees up before the next meeting takes it.
  const events = meetings
    .flatMap(([start, end]) => [[start, 1], [end, -1]])
    .sort(([timeA, changeA], [timeB, changeB]) => timeA - timeB || changeA - changeB);
  let inUse = 0;
  let most = 0;
  for (const [, change] of events) {
    inUse += change;
    most = Math.max(most, inUse);
  }
  return most;
};`,
    hiddenTests: [
      { call: 'roomsNeeded([[5, 9], [9, 12], [10, 15]])', expected: 2 },
      { call: 'roomsNeeded([[1, 3], [2, 5], [4, 6]])', expected: 2 },
      { call: 'roomsNeeded([[0, 5], [0, 5], [0, 5]])', expected: 3 },
      { call: 'roomsNeeded([[1, 2], [2, 3], [3, 4], [1, 4]])', expected: 2 },
      { call: 'roomsNeeded([[100, 200], [30, 150], [90, 110], [150, 160]])', expected: 3 },
      { call: 'roomsNeeded([[3, 4]])', expected: 1 },
      { call: 'roomsNeeded(Array.from({ length: 1000 }, (_, i) => [(i * 37) % 600, (i * 37) % 600 + 30 + (i % 50)]))', expected: 95 },
    ],
  },
  'alg-mh-rotated-search': {
    solution: `const findRotated = (values, target) => {
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const value = values[middle];
    if (value === target) return middle;
    const first = values[low];
    if (first <= value) {
      // low..middle is in order, so the target is there only if it lies between its ends.
      if (first <= target && target < value) high = middle - 1;
      else low = middle + 1;
    } else {
      // The break is on the left, so middle..high is the half in order.
      const last = values[high];
      if (value < target && target <= last) low = middle + 1;
      else high = middle - 1;
    }
  }
  return -1;
};`,
    junior: `const findRotated = (values, target) => {
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (values[middle] === target) {
      return middle;
    }
    const leftHalfInOrder = values[low] <= values[middle];
    if (leftHalfInOrder) {
      const insideLeft = values[low] <= target && target < values[middle];
      if (insideLeft) {
        high = middle - 1;
      } else {
        low = middle + 1;
      }
    } else {
      const insideRight = values[middle] < target && target <= values[high];
      if (insideRight) {
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
  }
  return -1;
};`,
    senior: `const findRotated = (values, target) => {
  const count = values.length;
  // First find where the smallest value sits: the point the list was cut.
  let low = 0;
  let high = count - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (values[middle] > values[high]) low = middle + 1;
    else high = middle;
  }
  const shift = low;
  // Then search positions 0..count-1 of the sorted order, mapped onto the rotation.
  for (let from = 0, to = count - 1; from <= to; ) {
    const middle = (from + to) >> 1;
    const index = (middle + shift) % count;
    const value = values[index];
    if (value === target) return index;
    if (value < target) from = middle + 1;
    else to = middle - 1;
  }
  return -1;
};`,
    hiddenTests: [
      { call: 'findRotated([5, 1, 3], 5)', expected: 0 },
      { call: 'findRotated([5, 1, 3], 3)', expected: 2 },
      { call: 'findRotated([3, 1], 1)', expected: 1 },
      { call: 'findRotated([6, 7, 8, 1, 2, 3, 4, 5], 8)', expected: 2 },
      { call: 'findRotated([6, 7, 8, 1, 2, 3, 4, 5], 1)', expected: 3 },
      { call: 'findRotated([-9, -4, 0, 3, -20, -15], -15)', expected: 5 },
      { call: 'findRotated([2, 4], 3)', expected: -1 },
      { call: countedSearch(65536, 40000, 1), expected: [-1, true] },
      { call: countedSearch(65536, 0, 196605), expected: [65535, true] },
    ],
  },
  'alg-mh-nth-from-end': {
    solution: `const removeFromEnd = (head, n) => {
  // A placeholder in front of the head gives the head a node before it too.
  const placeholder = { value: null, next: head };
  let lead = placeholder;
  let trail = placeholder;
  for (let step = 0; step < n; step++) lead = lead.next;
  // Keep the gap of n nodes until lead is on the last node.
  while (lead.next) {
    lead = lead.next;
    trail = trail.next;
  }
  trail.next = trail.next.next; // unlink the nth node from the end
  return placeholder.next;
};`,
    junior: `const removeFromEnd = (head, n) => {
  let length = 0;
  let current = head;
  while (current !== null) {
    length = length + 1;
    current = current.next;
  }
  const position = length - n;
  if (position === 0) {
    return head.next;
  }
  let before = head;
  let index = 1;
  while (index < position) {
    before = before.next;
    index = index + 1;
  }
  before.next = before.next.next;
  return head;
};`,
    senior: `const removeFromEnd = (head, n) => {
  let lead = head;
  for (let i = 0; i < n; i++) lead = lead.next;
  if (lead === null) return head.next; // n is the length: the head is the node to go
  let trail = head;
  while (lead.next) [lead, trail] = [lead.next, trail.next];
  trail.next = trail.next.next;
  return head;
};`,
    hiddenTests: [
      { call: withList(`${LIST_VALUES} return values(removeFromEnd(list(10, 20, 30, 40), 4));`), expected: [20, 30, 40] },
      { call: withList(`${LIST_VALUES} return values(removeFromEnd(list(0, 0, 0), 2));`), expected: [0, 0] },
      { call: withList(`${LIST_VALUES} return values(removeFromEnd(list(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), 7));`), expected: [1, 2, 3, 5, 6, 7, 8, 9, 10] },
      { call: withList('const head = list(1, 2); const result = removeFromEnd(head, 1); return [result === head, head.next];'), expected: [true, null] },
      { call: withList('const head = list(5, 6, 7); const second = head.next; return removeFromEnd(head, 3) === second;'), expected: true },
      { call: withList(`${LIST_VALUES} const kept = values(removeFromEnd(list(...Array.from({ length: 5000 }, (_, i) => i)), 2500)); return [kept.length, kept[2499], kept[2500]];`), expected: [4999, 2499, 2501] },
    ],
  },
  /* ── Medium: hash maps and running totals ─────────────────────────── */
  'alg-mh-subarray-sum': {
    solution: `const countStretches = (amounts, target) => {
  // Running total -> how many times it has come up. 0 stands for "before the first amount".
  const seen = new Map([[0, 1]]);
  let total = 0;
  let count = 0;
  for (const amount of amounts) {
    total += amount;
    // Every earlier total equal to total - target starts a stretch that ends here.
    count += seen.get(total - target) ?? 0;
    seen.set(total, (seen.get(total) ?? 0) + 1);
  }
  return count;
};`,
    junior: `const countStretches = (amounts, target) => {
  const seen = new Map();
  seen.set(0, 1);
  let total = 0;
  let count = 0;
  for (const amount of amounts) {
    total = total + amount;
    const wanted = total - target;
    if (seen.has(wanted)) {
      count = count + seen.get(wanted);
    }
    if (seen.has(total)) {
      seen.set(total, seen.get(total) + 1);
    } else {
      seen.set(total, 1);
    }
  }
  return count;
};`,
    senior: `const countStretches = (amounts, target) => {
  const seen = new Map([[0, 1]]);
  let total = 0;
  return amounts.reduce((count, amount) => {
    total += amount;
    const endingHere = seen.get(total - target) ?? 0; // read before this total is recorded
    seen.set(total, (seen.get(total) ?? 0) + 1);
    return count + endingHere;
  }, 0);
};`,
    hiddenTests: [
      { call: 'countStretches([2, -2, 2, -2, 2], 2)', expected: 6 },
      { call: 'countStretches([-1, -1, 1], 0)', expected: 1 },
      { call: 'countStretches([1, 2, 3], 7)', expected: 0 },
      { call: 'countStretches([10, 2, -2, -20, 10], -10)', expected: 3 },
      { call: 'countStretches(Array.from({ length: 20000 }, (_, i) => (i % 7) - 3), 0)', expected: 53054490 },
      { call: 'countStretches(Array.from({ length: 20000 }, (_, i) => ((i * 37) % 11) - 5), 4)', expected: 9917190 },
    ],
  },
  /* ── Medium: recursion ────────────────────────────────────────────── */
  'alg-mh-balanced-brackets': {
    solution: `const balanced = pairs => {
  const found = [];
  const build = (text, opened, closed) => {
    if (text.length === 2 * pairs) {
      found.push(text); // every step kept it balanceable, so a full string is an answer
      return;
    }
    // "(" before ")": the answers come out in alphabetical order.
    if (opened < pairs) build(text + "(", opened + 1, closed);
    if (closed < opened) build(text + ")", opened, closed + 1);
  };
  build("", 0, 0);
  return found;
};`,
    junior: `const balanced = pairs => {
  const found = [];
  const current = [];
  const build = (opened, closed) => {
    if (opened === pairs && closed === pairs) {
      found.push(current.join(""));
      return;
    }
    if (opened < pairs) {
      current.push("(");
      build(opened + 1, closed);
      current.pop();
    }
    if (closed < opened) {
      current.push(")");
      build(opened, closed + 1);
      current.pop();
    }
  };
  build(0, 0);
  return found;
};`,
    senior: `const balanced = pairs => {
  const found = [];
  // The same walk with an explicit stack. ")" goes on first so "(" comes off
  // first, which keeps the alphabetical order.
  const stack = [["", 0, 0]];
  while (stack.length > 0) {
    const [text, opened, closed] = stack.pop();
    if (text.length === 2 * pairs) {
      found.push(text);
      continue;
    }
    if (closed < opened) stack.push([text + ")", opened, closed + 1]);
    if (opened < pairs) stack.push([text + "(", opened + 1, closed]);
  }
  return found;
};`,
    hiddenTests: [
      { call: 'balanced(4)', expected: ['(((())))', '((()()))', '((())())', '((()))()', '(()(()))', '(()()())', '(()())()', '(())(())', '(())()()', '()((()))', '()(()())', '()(())()', '()()(())', '()()()()'] },
      { call: 'balanced(6).length', expected: 132 },
      { call: '(() => { const all = balanced(7); return [all.length, new Set(all).size, [...all].sort().join() === all.join()]; })()', expected: [429, 429, true] },
      { call: '(() => { const all = balanced(11); return [all.length, all[0], all[all.length - 1]]; })()', expected: [58786, '((((((((((()))))))))))', '()()()()()()()()()()()'] },
    ],
  },
  'alg-mh-check-bst': {
    solution: `const isSearchTree = root => {
  // Every node must lie strictly inside the range its ancestors set.
  const within = (node, low, high) => {
    if (node === null) return true;
    if (node.value <= low || node.value >= high) return false; // equal breaks the rule too
    // Going left lowers the ceiling to this value; going right raises the floor.
    return within(node.left, low, node.value) && within(node.right, node.value, high);
  };
  return within(root, -Infinity, Infinity);
};`,
    junior: `const isSearchTree = root => {
  const values = [];
  const collect = node => {
    if (node === null) {
      return;
    }
    collect(node.left);
    values.push(node.value);
    collect(node.right);
  };
  collect(root);
  for (let i = 1; i < values.length; i++) {
    if (values[i] <= values[i - 1]) {
      return false;
    }
  }
  return true;
};`,
    senior: `// Defaults carry the range, so the root call needs only the tree.
const isSearchTree = (node, low = -Infinity, high = Infinity) =>
  node === null ||
  (low < node.value &&
    node.value < high &&
    isSearchTree(node.left, low, node.value) &&
    isSearchTree(node.right, node.value, high));`,
    hiddenTests: [
      { call: withTree('isSearchTree(node(10, node(5), node(15, node(6), node(20))))'), expected: false },
      { call: withTree('isSearchTree(node(0, node(-5), node(5)))'), expected: true },
      { call: withTree('isSearchTree(node(0, null, node(3, node(-1))))'), expected: false },
      { call: withTree('isSearchTree(node(3, null, node(3)))'), expected: false },
      { call: withTree('isSearchTree(node(1))'), expected: true },
      { call: withTree('isSearchTree(node(50, node(30, node(20), node(40, node(35), node(45))), node(70, node(60, node(55), node(65)), node(80))))'), expected: true },
      { call: withTree('isSearchTree(node(50, node(30, node(20), node(40, node(35), node(55))), node(70)))'), expected: false },
      { call: withTree('isSearchTree(node(-2e9, null, node(5e9)))'), expected: true },
    ],
  },
  'alg-mh-fewest-coins': {
    solution: `const fewestCoins = (coins, amount) => {
  // Amount left -> fewest coins that pay it, or Infinity when none can.
  const memo = new Map();
  const best = left => {
    if (left === 0) return 0;
    if (left < 0) return Infinity;
    if (memo.has(left)) return memo.get(left);
    let fewest = Infinity;
    for (const coin of coins) {
      fewest = Math.min(fewest, 1 + best(left - coin));
    }
    memo.set(left, fewest); // failures are remembered as well as successes
    return fewest;
  };
  const answer = best(amount);
  return answer === Infinity ? -1 : answer;
};`,
    junior: `const fewestCoins = (coins, amount) => {
  const fewest = [0];
  for (let total = 1; total <= amount; total++) {
    let best = Infinity;
    for (const coin of coins) {
      if (coin <= total) {
        const withThisCoin = fewest[total - coin] + 1;
        if (withThisCoin < best) {
          best = withThisCoin;
        }
      }
    }
    fewest.push(best);
  }
  if (fewest[amount] === Infinity) {
    return -1;
  }
  return fewest[amount];
};`,
    senior: `const fewestCoins = (coins, amount) => {
  const memo = new Map([[0, 0]]);
  const best = left => {
    if (left < 0) return Infinity;
    if (!memo.has(left)) memo.set(left, 1 + Math.min(...coins.map(coin => best(left - coin))));
    return memo.get(left);
  };
  const answer = best(amount);
  return Number.isFinite(answer) ? answer : -1;
};`,
    hiddenTests: [
      { call: 'fewestCoins([2, 5], 3)', expected: -1 },
      { call: 'fewestCoins([1, 5, 11], 15)', expected: 3 },
      { call: 'fewestCoins([25, 10, 1], 30)', expected: 3 },
      { call: 'fewestCoins([3, 5], 7)', expected: -1 },
      { call: 'fewestCoins([7, 11, 13], 400)', expected: 32 },
      { call: 'fewestCoins([4, 6], 999)', expected: -1 },
      { call: 'fewestCoins([186, 419, 83, 408], 6249)', expected: 20 },
    ],
  },
  /* ── Hard ─────────────────────────────────────────────────────────── */
  'alg-mh-trapped-rain': {
    solution: `const trappedWater = heights => {
  let left = 0;
  let right = heights.length - 1;
  let tallestLeft = 0;
  let tallestRight = 0;
  let water = 0;
  while (left < right) {
    tallestLeft = Math.max(tallestLeft, heights[left]);
    tallestRight = Math.max(tallestRight, heights[right]);
    // The lower side is settled: the other side has a wall at least that tall.
    if (tallestLeft <= tallestRight) {
      water += tallestLeft - heights[left];
      left++;
    } else {
      water += tallestRight - heights[right];
      right--;
    }
  }
  return water;
};`,
    junior: `const trappedWater = heights => {
  const count = heights.length;
  const tallestFromLeft = [];
  let tallest = 0;
  for (let i = 0; i < count; i++) {
    if (heights[i] > tallest) {
      tallest = heights[i];
    }
    tallestFromLeft.push(tallest);
  }
  const tallestFromRight = [];
  tallest = 0;
  for (let i = count - 1; i >= 0; i--) {
    if (heights[i] > tallest) {
      tallest = heights[i];
    }
    tallestFromRight[i] = tallest;
  }
  let water = 0;
  for (let i = 0; i < count; i++) {
    const level = Math.min(tallestFromLeft[i], tallestFromRight[i]);
    water = water + level - heights[i];
  }
  return water;
};`,
    senior: `const trappedWater = heights => {
  let [left, right] = [0, heights.length - 1];
  let [leftMax, rightMax, water] = [0, 0, 0];
  while (left < right) {
    // Move the lower wall: the taller one guarantees a bound on its side.
    if (heights[left] < heights[right]) {
      leftMax = Math.max(leftMax, heights[left]);
      water += leftMax - heights[left++];
    } else {
      rightMax = Math.max(rightMax, heights[right]);
      water += rightMax - heights[right--];
    }
  }
  return water;
};`,
    hiddenTests: [
      { call: 'trappedWater([2, 0, 2, 0, 2])', expected: 4 },
      { call: 'trappedWater([0, 0, 0])', expected: 0 },
      { call: 'trappedWater([3, 1, 2, 1, 3])', expected: 5 },
      { call: 'trappedWater([5, 4, 1, 2])', expected: 1 },
      { call: 'trappedWater([2, 0, 1])', expected: 1 },
      { call: 'trappedWater(Array.from({ length: 50000 }, (_, i) => (i * 7919) % 101))', expected: 2499272 },
      { call: 'trappedWater(Array.from({ length: 50000 }, (_, i) => Math.abs(25000 - i)))', expected: 624950001 },
    ],
  },
  'alg-mh-fastest-route': {
    solution: `const fastestRoute = (tracks, start, goal) => {
  // A Map keeps any station name, "constructor" included, apart from what objects inherit.
  const neighbours = new Map();
  const link = (from, to, minutes) => {
    if (!neighbours.has(from)) neighbours.set(from, []);
    neighbours.get(from).push([to, minutes]);
  };
  for (const [from, to, minutes] of tracks) {
    link(from, to, minutes);
    link(to, from, minutes); // every track runs both ways
  }
  const time = new Map([[start, 0]]);
  const cameFrom = new Map();
  const settled = new Set();
  while (true) {
    // Settle the reached station with the smallest time: no route to it can get shorter.
    let current = null;
    for (const [station, minutes] of time) {
      if (!settled.has(station) && (current === null || minutes < time.get(current))) current = station;
    }
    if (current === null) return null; // everything reachable is settled, and the goal was not
    settled.add(current);
    if (current === goal) {
      const route = [goal];
      while (route[0] !== start) route.unshift(cameFrom.get(route[0]));
      return { minutes: time.get(goal), route };
    }
    for (const [next, minutes] of neighbours.get(current) ?? []) {
      const through = time.get(current) + minutes;
      if (!time.has(next) || through < time.get(next)) {
        time.set(next, through);
        cameFrom.set(next, current);
      }
    }
  }
};`,
    junior: `const fastestRoute = (tracks, start, goal) => {
  const neighbours = new Map();
  for (const track of tracks) {
    const from = track[0];
    const to = track[1];
    const minutes = track[2];
    if (!neighbours.has(from)) {
      neighbours.set(from, []);
    }
    if (!neighbours.has(to)) {
      neighbours.set(to, []);
    }
    neighbours.get(from).push({ station: to, minutes: minutes });
    neighbours.get(to).push({ station: from, minutes: minutes });
  }
  const best = new Map();
  best.set(start, 0);
  const previous = new Map();
  const done = new Set();
  let current = start;
  while (current !== null) {
    done.add(current);
    if (current === goal) {
      const route = [];
      let station = goal;
      while (station !== start) {
        route.push(station);
        station = previous.get(station);
      }
      route.push(start);
      route.reverse();
      return { minutes: best.get(goal), route: route };
    }
    const edges = neighbours.get(current) || [];
    for (const edge of edges) {
      const candidate = best.get(current) + edge.minutes;
      if (!best.has(edge.station) || candidate < best.get(edge.station)) {
        best.set(edge.station, candidate);
        previous.set(edge.station, current);
      }
    }
    current = null;
    let smallest = Infinity;
    for (const [station, minutes] of best) {
      if (!done.has(station) && minutes < smallest) {
        smallest = minutes;
        current = station;
      }
    }
  }
  return null;
};`,
    senior: `const fastestRoute = (tracks, start, goal) => {
  const neighbours = new Map();
  for (const [a, b, minutes] of tracks) {
    for (const [from, to] of [[a, b], [b, a]]) {
      if (!neighbours.has(from)) neighbours.set(from, []);
      neighbours.get(from).push([to, minutes]);
    }
  }
  // A binary heap of [minutes, station, cameFrom], quickest on top: the part a big map needs.
  const heap = [];
  const swap = (i, j) => { [heap[i], heap[j]] = [heap[j], heap[i]]; };
  const push = entry => {
    heap.push(entry);
    for (let i = heap.length - 1; i > 0 && heap[(i - 1) >> 1][0] > heap[i][0]; i = (i - 1) >> 1) swap(i, (i - 1) >> 1);
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length === 0) return top;
    heap[0] = last;
    for (let i = 0; ; ) {
      let smallest = i;
      for (const child of [2 * i + 1, 2 * i + 2]) {
        if (child < heap.length && heap[child][0] < heap[smallest][0]) smallest = child;
      }
      if (smallest === i) return top;
      swap(i, smallest);
      i = smallest;
    }
  };
  const cameFrom = new Map(); // a station is settled once it is in here
  push([0, start, null]);
  while (heap.length > 0) {
    const [minutes, station, from] = pop();
    if (cameFrom.has(station)) continue; // an older, slower entry for a settled station
    cameFrom.set(station, from);
    if (station === goal) {
      const route = [];
      for (let at = goal; at !== null; at = cameFrom.get(at)) route.unshift(at);
      return { minutes, route };
    }
    for (const [next, length] of neighbours.get(station) ?? []) {
      if (!cameFrom.has(next)) push([minutes + length, next, station]);
    }
  }
  return null;
};`,
    hiddenTests: [
      { call: 'fastestRoute([["S", "A", 1], ["S", "B", 4], ["A", "B", 1], ["B", "T", 1]], "S", "T")', expected: { minutes: 3, route: ['S', 'A', 'B', 'T'] } },
      { call: 'fastestRoute([["A", "B", 0], ["B", "C", 3], ["A", "C", 4]], "A", "C")', expected: { minutes: 3, route: ['A', 'B', 'C'] } },
      { call: 'fastestRoute([["A", "B", 1], ["C", "D", 1]], "A", "D")', expected: null },
      { call: 'fastestRoute([["A", "B", 1]], "Z", "A")', expected: null },
      { call: 'fastestRoute([["A", "B", 5], ["A", "B", 3], ["B", "C", 1]], "A", "C")', expected: { minutes: 4, route: ['A', 'B', 'C'] } },
      { call: 'fastestRoute([["constructor", "toString", 2], ["toString", "hasOwnProperty", 3], ["constructor", "hasOwnProperty", 9]], "constructor", "hasOwnProperty")', expected: { minutes: 5, route: ['constructor', 'toString', 'hasOwnProperty'] } },
      { call: `(() => { ${GRID_TRACKS} return fastestRoute(tracks, "0:0", "9:9").minutes; })()`, expected: 63 },
    ],
  },
  'alg-mh-longest-rising': {
    solution: `const longestRising = scores => {
  // tails[k]: the smallest score that ends a rising run of length k + 1. Always sorted.
  const tails = [];
  for (const score of scores) {
    let low = 0;
    let high = tails.length;
    // The first tail that is not smaller than score.
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (tails[middle] < score) low = middle + 1;
      else high = middle;
    }
    tails[low] = score; // a lower ending for that length, or one run longer than any so far
  }
  return tails.length;
};`,
    junior: `const longestRising = scores => {
  const tails = [];
  for (const score of scores) {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (tails[middle] < score) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    if (low === tails.length) {
      tails.push(score);
    } else {
      tails[low] = score;
    }
  }
  return tails.length;
};`,
    senior: `const lowerBound = (sorted, value) => {
  let [low, high] = [0, sorted.length];
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (sorted[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
};

const longestRising = scores =>
  scores.reduce((tails, score) => {
    tails[lowerBound(tails, score)] = score;
    return tails;
  }, []).length;`,
    hiddenTests: [
      { call: 'longestRising([3, 10, 2, 1, 20])', expected: 3 },
      { call: 'longestRising([4, 10, 4, 3, 8, 9])', expected: 3 },
      { call: 'longestRising([-5, -3, -4, 0, -1, 2])', expected: 4 },
      { call: 'longestRising([1, 3, 6, 7, 9, 4, 10, 5, 6])', expected: 6 },
      { call: 'longestRising([2, 2, 3])', expected: 2 },
      { call: 'longestRising(Array.from({ length: 20000 }, (_, i) => (i * 7919) % 20011))', expected: 145 },
      { call: 'longestRising(Array.from({ length: 20000 }, (_, i) => (i % 1000) + Math.floor(i / 1000)))', expected: 1019 },
    ],
  },
  'alg-mh-tree-to-text': {
    solution: `const serialize = root => {
  const parts = [];
  // Preorder, with "#" for every missing child: enough to rebuild the shape.
  const write = node => {
    if (node === null) {
      parts.push("#");
      return;
    }
    parts.push(String(node.value));
    write(node.left);
    write(node.right);
  };
  write(root);
  return parts.join(",");
};

const deserialize = text => {
  const parts = text.split(",");
  let next = 0; // shared by every read of this call, and fresh for each call
  const read = () => {
    const item = parts[next++];
    if (item === "#") return null;
    // Property order is evaluation order: the left subtree is read first.
    return { value: Number(item), left: read(), right: read() };
  };
  return read();
};`,
    junior: `const serialize = root => {
  if (root === null) {
    return "#";
  }
  const left = serialize(root.left);
  const right = serialize(root.right);
  return root.value + "," + left + "," + right;
};

const deserialize = text => {
  const items = text.split(",");
  let position = 0;
  const readNode = () => {
    const item = items[position];
    position = position + 1;
    if (item === "#") {
      return null;
    }
    const node = { value: Number(item), left: null, right: null };
    node.left = readNode();
    node.right = readNode();
    return node;
  };
  return readNode();
};`,
    senior: `const serialize = node => (node ? \`\${node.value},\${serialize(node.left)},\${serialize(node.right)}\` : "#");

const deserialize = text => {
  // An iterator is a reading position that every read shares.
  const items = text.split(",")[Symbol.iterator]();
  const read = () => {
    const { value: item } = items.next();
    return item === "#" ? null : { value: Number(item), left: read(), right: read() };
  };
  return read();
};`,
    hiddenTests: [
      { call: 'deserialize("5,4,11,7,#,#,2,#,#,#,8,13,#,#,4,#,1,#,#")', expected: tree(5, tree(4, tree(11, tree(7), tree(2))), tree(8, tree(13), tree(4, null, tree(1)))) },
      { call: withTree('serialize(node(5, node(4, node(11, node(7), node(2))), node(8, node(13), node(4, null, node(1)))))'), expected: '5,4,11,7,#,#,2,#,#,#,8,13,#,#,4,#,1,#,#' },
      { call: withTree('serialize(node(0))'), expected: '0,#,#' },
      { call: 'deserialize("-1,#,-2,#,#")', expected: tree(-1, null, tree(-2)) },
      { call: '[deserialize("1,#,#"), deserialize("2,#,#")]', expected: [tree(1), tree(2)] },
      { call: withTree('(() => { let root = null; for (let i = 0; i < 300; i++) root = node(i, root); const text = serialize(root); return [serialize(deserialize(text)) === text, text.split(",").length]; })()'), expected: [true, 601] },
    ],
  },
  'alg-mh-smallest-window': {
    solution: `const smallestWindow = (text, letters) => {
  if (letters === "") return "";
  // How many more of each character the window needs; below 0 means spare.
  const need = new Map();
  for (const char of letters) need.set(char, (need.get(char) ?? 0) + 1);
  let missing = letters.length; // needed characters the window still lacks, repeats counted
  let bestStart = 0;
  let bestLength = Infinity;
  let left = 0;
  for (let right = 0; right < text.length; right++) {
    const char = text[right];
    if (need.has(char)) {
      if (need.get(char) > 0) missing--;
      need.set(char, need.get(char) - 1);
    }
    // Shrink from the left for as long as the window still holds everything.
    while (missing === 0) {
      if (right - left + 1 < bestLength) {
        bestStart = left; // strictly shorter only, so a tie keeps the leftmost
        bestLength = right - left + 1;
      }
      const gone = text[left];
      if (need.has(gone)) {
        need.set(gone, need.get(gone) + 1);
        if (need.get(gone) > 0) missing++;
      }
      left++;
    }
  }
  return bestLength === Infinity ? "" : text.slice(bestStart, bestStart + bestLength);
};`,
    junior: `const smallestWindow = (text, letters) => {
  if (letters.length === 0) {
    return "";
  }
  const need = {};
  for (const char of letters) {
    if (need[char] === undefined) {
      need[char] = 1;
    } else {
      need[char] = need[char] + 1;
    }
  }
  let missing = letters.length;
  let bestStart = 0;
  let bestLength = Infinity;
  let left = 0;
  let right = 0;
  while (right < text.length) {
    const added = text[right];
    if (need[added] !== undefined) {
      if (need[added] > 0) {
        missing = missing - 1;
      }
      need[added] = need[added] - 1;
    }
    right = right + 1;
    while (missing === 0) {
      const length = right - left;
      if (length < bestLength) {
        bestLength = length;
        bestStart = left;
      }
      const removed = text[left];
      if (need[removed] !== undefined) {
        need[removed] = need[removed] + 1;
        if (need[removed] > 0) {
          missing = missing + 1;
        }
      }
      left = left + 1;
    }
  }
  if (bestLength === Infinity) {
    return "";
  }
  return text.slice(bestStart, bestStart + bestLength);
};`,
    senior: `const smallestWindow = (text, letters) => {
  if (!letters) return "";
  const need = new Map();
  for (const char of letters) need.set(char, (need.get(char) ?? 0) + 1);
  let missing = letters.length;
  let [bestStart, bestEnd] = [0, Infinity];
  for (let left = 0, right = 0; right < text.length; right++) {
    const char = text[right];
    if (!need.has(char)) continue;
    if (need.get(char) > 0) missing--;
    need.set(char, need.get(char) - 1);
    for (; missing === 0; left++) {
      if (right + 1 - left < bestEnd - bestStart) [bestStart, bestEnd] = [left, right + 1];
      const gone = text[left];
      if (need.has(gone) && need.set(gone, need.get(gone) + 1).get(gone) > 0) missing++;
    }
  }
  return bestEnd === Infinity ? "" : text.slice(bestStart, bestEnd);
};`,
    hiddenTests: [
      { call: 'smallestWindow("abcabdebac", "cda")', expected: 'cabd' },
      { call: 'smallestWindow("bba", "ab")', expected: 'ba' },
      { call: 'smallestWindow("abcdebdde", "bde")', expected: 'deb' },
      { call: 'smallestWindow("abxba", "ab")', expected: 'ab' },
      { call: 'smallestWindow("xxxx", "y")', expected: '' },
      { call: '(() => { const text = Array.from({ length: 50000 }, (_, i) => "abcdefghij"[(i * 7) % 10]).join(""); const found = smallestWindow(text, "jjaa"); return [found.length, text.indexOf(found)]; })()', expected: [14, 7] },
      { call: 'smallestWindow("x".repeat(49999) + "y", "yx")', expected: 'xy' },
    ],
  },
  'alg-mh-merge-contacts': {
    solution: `const mergeContacts = contacts => {
  // email -> the indexes of every contact that lists it
  const byEmail = new Map();
  contacts.forEach(({ emails }, index) => {
    for (const email of emails) {
      if (!byEmail.has(email)) byEmail.set(email, []);
      byEmail.get(email).push(index);
    }
  });
  const visited = new Set();
  // Depth first: a contact, then every contact reachable through one of its emails.
  const visit = (index, emails) => {
    visited.add(index);
    for (const email of contacts[index].emails) {
      emails.add(email);
      for (const other of byEmail.get(email)) {
        if (!visited.has(other)) visit(other, emails);
      }
    }
  };
  const people = [];
  contacts.forEach(({ name }, index) => {
    if (visited.has(index)) return; // already part of an earlier person
    const emails = new Set();
    visit(index, emails);
    people.push({ name, emails: [...emails].sort() }); // a new array: the contacts keep theirs
  });
  return people;
};`,
    junior: `const mergeContacts = contacts => {
  const contactsByEmail = new Map();
  for (let index = 0; index < contacts.length; index++) {
    for (const email of contacts[index].emails) {
      if (!contactsByEmail.has(email)) {
        contactsByEmail.set(email, []);
      }
      contactsByEmail.get(email).push(index);
    }
  }
  const visited = new Set();
  const people = [];
  for (let index = 0; index < contacts.length; index++) {
    if (visited.has(index)) {
      continue;
    }
    visited.add(index);
    const emails = new Set();
    const toVisit = [index];
    while (toVisit.length > 0) {
      const current = toVisit.pop();
      for (const email of contacts[current].emails) {
        emails.add(email);
        for (const other of contactsByEmail.get(email)) {
          if (!visited.has(other)) {
            visited.add(other);
            toVisit.push(other);
          }
        }
      }
    }
    const sorted = Array.from(emails);
    sorted.sort();
    people.push({ name: contacts[index].name, emails: sorted });
  }
  return people;
};`,
    senior: `const mergeContacts = contacts => {
  // Union-find: each contact points towards the first contact of its person.
  const parent = contacts.map((_, index) => index);
  const find = index => (parent[index] === index ? index : (parent[index] = find(parent[index])));
  const union = (a, b) => {
    const [rootA, rootB] = [find(a), find(b)];
    if (rootA !== rootB) parent[Math.max(rootA, rootB)] = Math.min(rootA, rootB); // the earlier contact stays the root
  };
  const firstWith = new Map(); // email -> the first contact that lists it
  contacts.forEach(({ emails }, index) => {
    for (const email of emails) {
      if (firstWith.has(email)) union(firstWith.get(email), index);
      else firstWith.set(email, index);
    }
  });
  const people = new Map(); // root -> emails, in the order the roots first appear
  contacts.forEach(({ emails }, index) => {
    const root = find(index);
    if (!people.has(root)) people.set(root, new Set());
    for (const email of emails) people.get(root).add(email);
  });
  return [...people].map(([root, emails]) => ({ name: contacts[root].name, emails: [...emails].sort() }));
};`,
    hiddenTests: [
      {
        call: 'mergeContacts([{ name: "X", emails: [] }, { name: "Y", emails: ["y@x.dev"] }])',
        expected: [{ name: 'X', emails: [] }, { name: 'Y', emails: ['y@x.dev'] }],
      },
      {
        call: 'mergeContacts([{ name: "A", emails: ["a@x.dev"] }, { name: "B", emails: ["b@x.dev"] }, { name: "C", emails: ["c@x.dev"] }, { name: "D", emails: ["c@x.dev", "a@x.dev"] }])',
        expected: [{ name: 'A', emails: ['a@x.dev', 'c@x.dev'] }, { name: 'B', emails: ['b@x.dev'] }],
      },
      {
        call: 'mergeContacts([{ name: "Kim", emails: ["kim@x.dev", "Kim@x.dev"] }, { name: "K", emails: ["k@x.dev", "kim@x.dev"] }, { name: "Kay", emails: ["kim@x.dev"] }])',
        expected: [{ name: 'Kim', emails: ['Kim@x.dev', 'k@x.dev', 'kim@x.dev'] }],
      },
      {
        call: '(() => { const book = [{ name: "A", emails: ["z@x.dev", "a@x.dev"] }, { name: "B", emails: ["a@x.dev"] }]; mergeContacts(book); return book; })()',
        expected: [{ name: 'A', emails: ['z@x.dev', 'a@x.dev'] }, { name: 'B', emails: ['a@x.dev'] }],
      },
      {
        call: '(() => { const book = Array.from({ length: 300 }, (_, i) => ({ name: "c" + i, emails: ["e" + i + "@x.dev", "e" + (i + 1) + "@x.dev"] })); const people = mergeContacts(book); return [people.length, people[0].name, people[0].emails.length, people[0].emails[0], people[0].emails[299]]; })()',
        expected: [1, 'c0', 301, 'e0@x.dev', 'e99@x.dev'],
      },
      {
        call: '(() => { const book = Array.from({ length: 100 }, (_, i) => ({ name: "c" + i, emails: ["e" + i + "@x.dev"] })); book.push({ name: "hub", emails: Array.from({ length: 50 }, (_, i) => "e" + (i * 2 + 1) + "@x.dev") }); const people = mergeContacts(book); return [people.length, people[0].name, people[1].name, people[1].emails.length, people[2].name, people[50].name]; })()',
        expected: [51, 'c0', 'c1', 50, 'c2', 'c98'],
      },
    ],
  },
  'alg-mh-split-words': {
    solution: `const splitWords = (text, words) => {
  const dictionary = new Set(words);
  // start -> every split of the text from start; empty lists are remembered too.
  const memo = new Map();
  const from = start => {
    if (start === text.length) return [""]; // the end has one split: the empty one
    if (memo.has(start)) return memo.get(start);
    const splits = [];
    for (let end = start + 1; end <= text.length; end++) {
      const word = text.slice(start, end);
      if (!dictionary.has(word)) continue;
      for (const rest of from(end)) splits.push(rest === "" ? word : word + " " + rest);
    }
    memo.set(start, splits);
    return splits;
  };
  return [...from(0)].sort();
};`,
    junior: `const splitWords = (text, words) => {
  const unique = [];
  for (const word of words) {
    if (!unique.includes(word)) {
      unique.push(word);
    }
  }
  const memo = new Map();
  const splitFrom = start => {
    if (start === text.length) {
      return [""];
    }
    if (memo.has(start)) {
      return memo.get(start);
    }
    const results = [];
    for (const word of unique) {
      if (text.startsWith(word, start)) {
        const rests = splitFrom(start + word.length);
        for (const rest of rests) {
          if (rest === "") {
            results.push(word);
          } else {
            results.push(word + " " + rest);
          }
        }
      }
    }
    memo.set(start, results);
    return results;
  };
  const all = splitFrom(0);
  const sorted = all.slice();
  sorted.sort();
  return sorted;
};`,
    senior: `const splitWords = (text, words) => {
  const dictionary = new Set(words);
  const memo = new Map([[text.length, [""]]]);
  const from = start => {
    if (!memo.has(start)) {
      const splits = [];
      for (let end = start + 1; end <= text.length; end++) {
        const word = text.slice(start, end);
        if (dictionary.has(word)) splits.push(...from(end).map(rest => (rest ? \`\${word} \${rest}\` : word)));
      }
      memo.set(start, splits);
    }
    return memo.get(start);
  };
  return from(0).toSorted();
};`,
    hiddenTests: [
      { call: 'splitWords("a".repeat(30) + "b", ["a", "aa", "aaa", "aaaa"])', expected: [] },
      { call: '(() => { const all = splitWords("a".repeat(18), ["a", "aa"]); return [all.length, all[0], all[all.length - 1]]; })()', expected: [4181, 'a a a a a a a a a a a a a a a a a a', 'aa aa aa aa aa aa aa aa aa'] },
      { call: 'splitWords("abcd", ["a", "abc", "b", "cd", "bcd", "d"])', expected: ['a b cd', 'a bcd', 'abc d'] },
      { call: 'splitWords("dogdog", ["dog", "dog"])', expected: ['dog dog'] },
      { call: 'splitWords("aaab", ["a", "aa", "aaa", "b", "ab"])', expected: ['a a a b', 'a a ab', 'a aa b', 'aa a b', 'aa ab', 'aaa b'] },
      { call: 'splitWords("penpineapple", ["pen", "pine", "apple", "pineapple", "pin"])', expected: ['pen pine apple', 'pen pineapple'] },
    ],
  },
};
