// Server-only reference solutions and hidden tests for lib/coding/tasks/javascript-loops.ts.
// Never import from client code. Hidden tests target the obvious shortcut: a
// hard-coded return, mutating an input the prompt protects, a built-in the task
// asks the learner to write by hand, or a value the visible tests never used.

import type { CodingSolution } from '../types';

export const JAVASCRIPT_LOOP_SOLUTIONS: Record<string, CodingSolution> = {
  "js-digit-sum": {
    solution: "const digitSum = n => { let total = 0; while (n > 0) { total += n % 10; n = Math.floor(n / 10); } return total; };",
    junior: `const digitSum = n => {
  let remaining = n;
  let total = 0;
  while (remaining > 0) {
    const lastDigit = remaining % 10;
    total = total + lastDigit;
    remaining = Math.floor(remaining / 10);
  }
  return total;
};`,
    senior: `const digitSum = n => {
  let total = 0;
  // Stop one step early: whatever is left below 10 is the last digit itself.
  while (n >= 10) {
    total += n % 10;
    n = Math.trunc(n / 10);
  }
  return total + n;
};`,
    hiddenTests: [
      { call: "digitSum(99999)", expected: 45 },
      { call: "digitSum(305)", expected: 8 },
      { call: "digitSum(10)", expected: 1 },
    ],
  },
  "js-count-multiples": {
    solution: "const countMultiples = (n, from, to) => { let count = 0; for (let value = from; value <= to; value += 1) { if (value % n === 0) count += 1; } return count; };",
    junior: `const countMultiples = (n, from, to) => {
  const multiples = [];
  for (let value = from; value <= to; value += 1) {
    if (value % n === 0) {
      multiples.push(value);
    }
  }
  return multiples.length;
};`,
    senior: `const countMultiples = (n, from, to) => {
  // Jump to the first multiple at or after "from", then step by n instead of by one.
  const first = Math.ceil(from / n) * n;
  let count = 0;
  for (let value = first; value <= to; value += n) count += 1;
  return count;
};`,
    hiddenTests: [
      { call: "countMultiples(6, 1, 100)", expected: 16 },
      { call: "countMultiples(1, 3, 9)", expected: 7 },
      { call: "countMultiples(10, 15, 25)", expected: 1 },
    ],
  },
  "js-words-of-length": {
    solution: "const countWordsOfLength = (sentence, length) => { let count = 0; for (const word of sentence.split(\" \")) { if (word.length === length) count += 1; } return count; };",
    junior: `const countWordsOfLength = (sentence, length) => {
  if (sentence === "") {
    return 0;
  }
  const words = sentence.split(" ");
  let count = 0;
  for (const word of words) {
    if (word.length === length) {
      count = count + 1;
    }
  }
  return count;
};`,
    senior: `const countWordsOfLength = (sentence, length) => {
  // An empty sentence has no words; split would otherwise hand back one empty string.
  const words = sentence ? sentence.split(" ") : [];
  let count = 0;
  for (const { length: wordLength } of words) {
    if (wordLength === length) count += 1;
  }
  return count;
};`,
    hiddenTests: [
      { call: "countWordsOfLength(\"red green blue\", 4)", expected: 1 },
      { call: "countWordsOfLength(\"ab ab ab ab\", 2)", expected: 4 },
      { call: "countWordsOfLength(\"xyz\", 3)", expected: 1 },
    ],
  },
  "js-queue-with-shift": {
    solution: "const serveNext = (queue, newcomer) => { queue.push(newcomer); return queue.shift(); };",
    junior: `const serveNext = (queue, newcomer) => {
  queue.push(newcomer);
  const front = queue[0];
  queue.shift();
  return front;
};`,
    senior: `const serveNext = (queue, newcomer) => {
  // Nobody ahead: the newcomer is served at once and the queue stays empty.
  if (queue.length === 0) return newcomer;
  queue.push(newcomer);
  return queue.shift();
};`,
    hiddenTests: [
      { call: "(() => { const queue = [\"x\",\"y\",\"z\"]; const served = serveNext(queue, \"w\"); return [served, queue.length, queue[queue.length - 1]]; })()", expected: ["x", 3, "w"] },
      { call: "(() => { const queue = [\"a\"]; serveNext(queue, \"b\"); serveNext(queue, \"c\"); return queue; })()", expected: ["c"] },
      { call: "(() => { const queue = []; serveNext(queue, \"p\"); return queue.length; })()", expected: 0 },
    ],
  },
  "js-swap-stack-top": {
    solution: "const swapTop = (stack, item) => { const top = stack.pop(); stack.push(item); return top; };",
    junior: `const swapTop = (stack, item) => {
  let removed;
  if (stack.length > 0) {
    removed = stack.pop();
  }
  stack.push(item);
  return removed;
};`,
    senior: `const swapTop = (stack, item) => {
  // splice(-1, 1, item) is pop-then-push in one call; on an empty stack it removes nothing and returns [].
  const [top] = stack.splice(-1, 1, item);
  return top;
};`,
    hiddenTests: [
      { call: "(() => { const stack = [7,8,9,10]; const top = swapTop(stack, 0); return [top, stack.length, stack[3]]; })()", expected: [10, 4, 0] },
      { call: "(() => { const stack = []; swapTop(stack, 1); swapTop(stack, 2); return stack; })()", expected: [2] },
      { call: "(() => { const stack = [\"x\"]; return swapTop(stack, \"y\") === \"x\" && stack[0] === \"y\"; })()", expected: true },
    ],
  },
  "js-add-to-front": {
    solution: "const addToFront = (list, item) => list.unshift(item);",
    junior: `const addToFront = (list, item) => {
  list.unshift(item);
  const newLength = list.length;
  return newLength;
};`,
    senior: `const addToFront = (list, item) => {
  // An insert at index 0 through splice; the new length is then read straight off the list.
  list.splice(0, 0, item);
  return list.length;
};`,
    hiddenTests: [
      { call: "(() => { const list = [5,6,7,8]; const length = addToFront(list, 4); return [length, list[0], list.length]; })()", expected: [5, 4, 5] },
      { call: "(() => { const list = []; addToFront(list, null); return list; })()", expected: [null] },
      { call: "(() => { const list = [\"x\"]; return addToFront(list, \"y\") === 2 && list[0] === \"y\" && list[1] === \"x\"; })()", expected: true },
    ],
  },
  "js-remove-a-range": {
    solution: "const removeRange = (list, start, count) => list.splice(start, count);",
    junior: `const removeRange = (list, start, count) => {
  const removed = [];
  for (let step = 0; step < count; step += 1) {
    if (start >= list.length) {
      break;
    }
    const taken = list.splice(start, 1);
    removed.push(taken[0]);
  }
  return removed;
};`,
    senior: `const removeRange = (list, start, count) => {
  // Nothing to take out: leave the list alone rather than asking splice for zero items.
  if (count <= 0 || start >= list.length) return [];
  return list.splice(start, count);
};`,
    hiddenTests: [
      { call: "(() => { const list = [10,20,30,40,50,60]; const removed = removeRange(list, 2, 3); return [removed, list]; })()", expected: [[30, 40, 50], [10, 20, 60]] },
      { call: "(() => { const list = [\"p\",\"q\",\"r\",\"s\"]; removeRange(list, 3, 1); return list; })()", expected: ["p", "q", "r"] },
      { call: "(() => { const list = [1,2]; return [removeRange(list, 2, 1), list]; })()", expected: [[], [1, 2]] },
    ],
  },
  "js-copy-a-range": {
    solution: "const copyRange = (list, start, end) => list.slice(start, end);",
    junior: `const copyRange = (list, start, end) => {
  if (start >= end) {
    return [];
  }
  const copy = list.slice(start, end);
  return copy;
};`,
    senior: `const copyRange = (list, start, end) => {
  // Clamp the end first, then build the copy from a known length; the source is never touched.
  const stop = Math.min(end, list.length);
  const length = Math.max(0, stop - start);
  return Array.from({ length }, (_, offset) => list[start + offset]);
};`,
    hiddenTests: [
      { call: "copyRange([5,6,7,8,9], 2, 5)", expected: [7, 8, 9] },
      { call: "(() => { const list = [\"x\",\"y\",\"z\"]; const copy = copyRange(list, 0, 3); copy.push(\"w\"); return [list, copy.length]; })()", expected: [["x", "y", "z"], 4] },
      { call: "copyRange([], 0, 1)", expected: [] },
    ],
  },
  "js-insert-at-index": {
    solution: "const insertAt = (list, index, item) => { list.splice(index, 0, item); return list; };",
    junior: `const insertAt = (list, index, item) => {
  for (let slot = list.length; slot > index; slot -= 1) {
    list[slot] = list[slot - 1];
  }
  list[index] = item;
  return list;
};`,
    senior: `const insertAt = (list, index, item) => {
  // Clamp so a negative index cannot count from the end, which splice would otherwise do.
  const at = Math.min(Math.max(index, 0), list.length);
  list.splice(at, 0, item);
  return list;
};`,
    hiddenTests: [
      { call: "insertAt([10,20,30,40], 3, 35)", expected: [10, 20, 30, 35, 40] },
      { call: "(() => { const list = [\"a\",\"b\",\"c\"]; return insertAt(list, 1, \"z\") === list; })()", expected: true },
      { call: "insertAt([1,2,3], 1, [0])", expected: [1, [0], 2, 3] },
    ],
  },
  "js-rotate-once": {
    solution: "const rotateOnce = list => { if (list.length > 0) list.push(list.shift()); return list; };",
    junior: `const rotateOnce = list => {
  if (list.length === 0) {
    return list;
  }
  const first = list.shift();
  list.push(first);
  return list;
};`,
    senior: `const rotateOnce = list => {
  // splice(0, 1) is [] on an empty list, so spreading it pushes nothing and no guard is needed.
  list.push(...list.splice(0, 1));
  return list;
};`,
    hiddenTests: [
      { call: "rotateOnce([1,2,3,4,5])", expected: [2, 3, 4, 5, 1] },
      { call: "(() => { const list = [1,2,3]; rotateOnce(list); rotateOnce(list); return list; })()", expected: [3, 1, 2] },
      { call: "rotateOnce([]).length", expected: 0 },
    ],
  },
  "js-last-item-safely": {
    solution: "const lastItem = (list, fallback) => list.length > 0 ? list[list.length - 1] : fallback;",
    junior: `const lastItem = (list, fallback) => {
  if (list.length === 0) {
    return fallback;
  }
  const lastIndex = list.length - 1;
  return list[lastIndex];
};`,
    senior: `const lastItem = (list, fallback) => {
  // slice(-1) is [] on an empty list, so the destructuring default applies only then.
  const [last = fallback] = list.slice(-1);
  return last;
};`,
    hiddenTests: [
      { call: "lastItem([10,20,30,40], -1)", expected: 40 },
      { call: "(() => { const list = [\"x\",\"y\"]; return [lastItem(list, \"?\"), list.length]; })()", expected: ["y", 2] },
      { call: "lastItem([], null)", expected: null },
    ],
  },
  "js-sum-with-for": {
    solution: "const addUp = numbers => { let total = 0; for (let index = 0; index < numbers.length; index += 1) total += numbers[index]; return total; };",
    junior: `const addUp = numbers => {
  if (numbers.length === 0) {
    return 0;
  }
  let total = numbers[0];
  for (let index = 1; index < numbers.length; index += 1) {
    total = total + numbers[index];
  }
  return total;
};`,
    senior: `const addUp = numbers => {
  let total = 0;
  // The index is only ever used to read, so for...of says the same thing with less to get wrong.
  for (const number of numbers) total += number;
  return total;
};`,
    hiddenTests: [
      { call: "addUp([100,200,300,400])", expected: 1000 },
      { call: "addUp([7])", expected: 7 },
      { call: "addUp([1,1,1,1,1,1,1,1,1,1])", expected: 10 },
    ],
  },
  "js-count-matches": {
    solution: "const countMatches = (items, target) => { let count = 0; for (let index = 0; index < items.length; index += 1) { if (items[index] === target) count += 1; } return count; };",
    junior: `const countMatches = (items, target) => {
  let count = 0;
  for (let index = 0; index < items.length; index += 1) {
    const isMatch = items[index] === target;
    if (isMatch) {
      count += 1;
    }
  }
  return count;
};`,
    senior: `const countMatches = (items, target) => {
  // Keep the matches, then count them; filter compares strictly, so "1" never matches 1.
  return items.filter(item => item === target).length;
};`,
    hiddenTests: [
      { call: "countMatches([true,false,true,true], true)", expected: 3 },
      { call: "countMatches([0,0,0,0,0], 0)", expected: 5 },
      { call: "countMatches([null, undefined, null], null)", expected: 2 },
    ],
  },
  "js-reverse-in-place": {
    solution: "const reverseInPlace = list => { let left = 0; let right = list.length - 1; while (left < right) { const temp = list[left]; list[left] = list[right]; list[right] = temp; left += 1; right -= 1; } return list; };",
    junior: `const reverseInPlace = list => {
  let left = 0;
  let right = list.length - 1;
  while (left < right) {
    const leftValue = list[left];
    const rightValue = list[right];
    list[left] = rightValue;
    list[right] = leftValue;
    left = left + 1;
    right = right - 1;
  }
  return list;
};`,
    senior: `const reverseInPlace = list => {
  // Both indexes live in the loop head, and a destructuring swap needs no temporary.
  for (let left = 0, right = list.length - 1; left < right; left += 1, right -= 1) {
    [list[left], list[right]] = [list[right], list[left]];
  }
  return list;
};`,
    hiddenTests: [
      { call: "(() => { const list = [1,2,3,4,5]; list.reverse = () => { throw new Error(\"reverse() is not allowed here\"); }; return reverseInPlace(list); })()", expected: [5, 4, 3, 2, 1] },
      { call: "(() => { const list = [1,2]; return reverseInPlace(list) === list; })()", expected: true },
      { call: "(() => { const list = [\"x\",\"y\",\"z\",\"w\"]; reverseInPlace(list); return list.join(\"\"); })()", expected: "wzyx" },
    ],
  },
  "js-countdown-by-step": {
    solution: "const countdownBy = (start, step) => { const result = []; let value = start; while (value > 0) { result.push(value); value -= step; } return result; };",
    junior: `const countdownBy = (start, step) => {
  const values = [];
  if (start <= 0) {
    return values;
  }
  let current = start;
  while (current > 0) {
    values.push(current);
    current = current - step;
  }
  return values;
};`,
    senior: `const countdownBy = (start, step) => {
  // How many values sit above zero is known up front, so build the array directly.
  const count = Math.max(0, Math.ceil(start / step));
  return Array.from({ length: count }, (_, index) => start - index * step);
};`,
    hiddenTests: [
      { call: "countdownBy(20, 7)", expected: [20, 13, 6] },
      { call: "countdownBy(1, 1)", expected: [1] },
      { call: "countdownBy(9, 3)", expected: [9, 6, 3] },
    ],
  },
  "js-first-divisible": {
    solution: "const firstDivisible = (numbers, divisor) => { let found = null; let index = 0; while (index < numbers.length) { if (numbers[index] % divisor === 0) { found = numbers[index]; break; } index += 1; } return found; };",
    junior: `const firstDivisible = (numbers, divisor) => {
  let index = 0;
  let result = null;
  let found = false;
  while (index < numbers.length && !found) {
    const number = numbers[index];
    if (number % divisor === 0) {
      result = number;
      found = true;
    }
    index += 1;
  }
  return result;
};`,
    senior: `const firstDivisible = (numbers, divisor) => {
  // find stops at the first hit; ?? keeps a found 0 while turning "nothing found" into null.
  return numbers.find(number => number % divisor === 0) ?? null;
};`,
    hiddenTests: [
      { call: "firstDivisible([13,17,19,21,22], 11)", expected: 22 },
      { call: "firstDivisible([8,16,24], 8)", expected: 8 },
      { call: "firstDivisible([-6,9], 3)", expected: -6 },
    ],
  },
  "js-attempt-until": {
    solution: "const attemptUntil = (attempt, limit) => { let calls = 0; let succeeded; do { calls += 1; succeeded = attempt(); } while (!succeeded && calls < limit); return succeeded ? calls : -1; };",
    junior: `const attemptUntil = (attempt, limit) => {
  let calls = 0;
  let succeeded = false;
  do {
    calls = calls + 1;
    const result = attempt();
    if (result) {
      succeeded = true;
    }
  } while (!succeeded && calls < limit);
  if (succeeded) {
    return calls;
  }
  return -1;
};`,
    senior: `const attemptUntil = (attempt, limit) => {
  let calls = 0;
  do {
    calls += 1;
    if (attempt()) return calls; // success leaves the loop from inside, so no flag is needed
  } while (calls < limit);
  return -1;
};`,
    hiddenTests: [
      { call: "(() => { let calls = 0; const result = attemptUntil(() => { calls += 1; return calls === 6; }, 10); return [result, calls]; })()", expected: [6, 6] },
      { call: "(() => { let calls = 0; attemptUntil(() => { calls += 1; return true; }, 10); return calls; })()", expected: 1 },
      { call: "(() => { let calls = 0; attemptUntil(() => { calls += 1; return false; }, 3); return calls; })()", expected: 3 },
    ],
  },
  "js-join-with-for-of": {
    solution: "const joinWords = (words, separator) => { let result = \"\"; let first = true; for (const word of words) { if (!first) result += separator; result += word; first = false; } return result; };",
    junior: `const joinWords = (words, separator) => {
  let result = "";
  let position = 0;
  for (const word of words) {
    if (position > 0) {
      result = result + separator;
    }
    result = result + word;
    position = position + 1;
  }
  return result;
};`,
    senior: `const joinWords = (words, separator) => {
  let result = "";
  // entries() hands over the index, so only the first word goes in without a separator in front.
  for (const [index, word] of words.entries()) {
    result += index === 0 ? word : separator + word;
  }
  return result;
};`,
    hiddenTests: [
      { call: "joinWords([\"one\",\"two\",\"three\",\"four\"], \" | \")", expected: "one | two | three | four" },
      { call: "(() => { const words = [\"x\",\"y\"]; words.join = () => { throw new Error(\"join() is not allowed here\"); }; return joinWords(words, \"+\"); })()", expected: "x+y" },
      { call: "joinWords([\"\",\"\"], \"-\")", expected: "-" },
    ],
  },
  "js-number-items": {
    solution: "const numberItems = items => { const result = []; for (const [index, item] of items.entries()) result.push((index + 1) + \". \" + item); return result; };",
    junior: `const numberItems = items => {
  const result = [];
  for (const [index, item] of items.entries()) {
    const position = index + 1;
    const label = position + ". " + item;
    result.push(label);
  }
  return result;
};`,
    senior: `// map already pairs each item with its index; the template literal does the formatting.
const numberItems = items => items.map((item, index) => \`\${index + 1}. \${item}\`);`,
    hiddenTests: [
      { call: "numberItems([\"a\",\"b\",\"c\",\"d\",\"e\",\"f\",\"g\",\"h\",\"i\",\"j\",\"k\"])[10]", expected: "11. k" },
      { call: "numberItems([\"\", \"x\"])", expected: ["1. ", "2. x"] },
      { call: "(() => { const items = [\"a\"]; numberItems(items); return items; })()", expected: ["a"] },
    ],
  },
  "js-times-table": {
    solution: "const timesTable = size => { const table = []; for (let row = 1; row <= size; row += 1) { const cells = []; for (let column = 1; column <= size; column += 1) cells.push(row * column); table.push(cells); } return table; };",
    junior: `const timesTable = size => {
  const table = [];
  for (let row = 0; row < size; row += 1) {
    table.push([]);
    for (let column = 0; column < size; column += 1) {
      table[row][column] = (row + 1) * (column + 1);
    }
  }
  return table;
};`,
    senior: `const timesTable = size => {
  const range = Array.from({ length: size }, (_, index) => index + 1);
  // Every row is the range scaled by its own number.
  return range.map(row => range.map(column => row * column));
};`,
    hiddenTests: [
      { call: "timesTable(5)[4][4]", expected: 25 },
      { call: "timesTable(6).length", expected: 6 },
      { call: "timesTable(7)[2]", expected: [3, 6, 9, 12, 15, 18, 21] },
    ],
  },
  "js-some-and-every": {
    solution: "const passReport = (scores, passMark) => ({ anyPassed: scores.some(score => score >= passMark), allPassed: scores.every(score => score >= passMark) });",
    junior: `const passReport = (scores, passMark) => {
  let anyPassed = false;
  let allPassed = true;
  for (const score of scores) {
    if (score >= passMark) {
      anyPassed = true;
    } else {
      allPassed = false;
    }
  }
  return { anyPassed: anyPassed, allPassed: allPassed };
};`,
    senior: `const passReport = (scores, passMark) => {
  // One predicate serves both questions; some and every already give the right answers for an empty list.
  const passes = score => score >= passMark;
  return { anyPassed: scores.some(passes), allPassed: scores.every(passes) };
};`,
    hiddenTests: [
      { call: "passReport([49,50,51], 50)", expected: { anyPassed: true, allPassed: false } },
      { call: "passReport([100,99,98,97], 97)", expected: { anyPassed: true, allPassed: true } },
      { call: "passReport([0], 1)", expected: { anyPassed: false, allPassed: false } },
    ],
  },
  "js-locate-item": {
    solution: "const locate = (list, item) => ({ present: list.includes(item), index: list.indexOf(item) });",
    junior: `const locate = (list, item) => {
  let index = -1;
  for (let position = 0; position < list.length; position += 1) {
    if (list[position] === item) {
      index = position;
      break;
    }
  }
  const present = index !== -1;
  return { present: present, index: index };
};`,
    senior: `const locate = (list, item) => {
  // indexOf answers both questions in one scan; includes would walk the list a second time.
  const index = list.indexOf(item);
  return { present: index !== -1, index };
};`,
    hiddenTests: [
      { call: "locate([\"x\",\"y\",\"z\",\"w\"], \"w\")", expected: { present: true, index: 3 } },
      { call: "locate([0, false, \"\"], false)", expected: { present: true, index: 1 } },
      { call: "locate([null], undefined)", expected: { present: false, index: -1 } },
    ],
  },
  "js-remove-by-id": {
    solution: "const removeById = (items, id) => { const index = items.findIndex(item => item.id === id); if (index === -1) return null; return items.splice(index, 1)[0]; };",
    junior: `const removeById = (items, id) => {
  let position = -1;
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].id === id) {
      position = index;
      break;
    }
  }
  if (position === -1) {
    return null;
  }
  const removed = items[position];
  items.splice(position, 1);
  return removed;
};`,
    senior: `const removeById = (items, id) => {
  const index = items.findIndex(item => item.id === id);
  // splice hands back the removed items as an array; with no match there is nothing to splice.
  const [removed = null] = index === -1 ? [] : items.splice(index, 1);
  return removed;
};`,
    hiddenTests: [
      { call: "(() => { const items = [{id:\"a\"},{id:\"b\"},{id:\"c\"},{id:\"d\"}]; const removed = removeById(items, \"d\"); return [removed.id, items.length]; })()", expected: ["d", 3] },
      { call: "(() => { const items = [{id:1},{id:2},{id:3}]; removeById(items, 42); return items.length; })()", expected: 3 },
      { call: "(() => { const items = [{id:1}]; return removeById(items, 1) !== null && items.length === 0; })()", expected: true },
    ],
  },
  "js-highest-with-reduce": {
    solution: "const highest = numbers => numbers.length === 0 ? null : numbers.reduce((best, number) => number > best ? number : best);",
    junior: `const highest = numbers => {
  if (numbers.length === 0) {
    return null;
  }
  const best = numbers.reduce((bestSoFar, number) => {
    if (number > bestSoFar) {
      return number;
    }
    return bestSoFar;
  }, numbers[0]);
  return best;
};`,
    senior: `const highest = numbers => {
  if (numbers.length === 0) return null; // reduce without a seed throws on an empty array
  return numbers.reduce((best, number) => Math.max(best, number));
};`,
    hiddenTests: [
      { call: "highest([10,100,1000,999])", expected: 1000 },
      { call: "highest([0,-1])", expected: 0 },
      { call: "highest([2.5,2.75,2.6])", expected: 2.75 },
    ],
  },
  "js-count-by-key": {
    solution: "const countBy = (items, keyFn) => items.reduce((counts, item) => { const key = keyFn(item); counts[key] = (counts[key] ?? 0) + 1; return counts; }, {});",
    junior: `const countBy = (items, keyFn) => {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    if (counts[key] === undefined) {
      counts[key] = 1;
    } else {
      counts[key] = counts[key] + 1;
    }
  }
  return counts;
};`,
    senior: `const countBy = (items, keyFn) => {
  // Count in a Map, which takes any key as it is, then hand back the plain object the caller expects.
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(counts);
};`,
    hiddenTests: [
      { call: "countBy([{team:\"red\"},{team:\"blue\"},{team:\"red\"},{team:\"red\"}], person => person.team)", expected: { red: 3, blue: 1 } },
      { call: "countBy([\"aa\",\"b\",\"cc\",\"ddd\"], word => word.length)", expected: { "1": 1, "2": 2, "3": 1 } },
      { call: "countBy([true,false,true], value => String(value))", expected: { true: 2, false: 1 } },
    ],
  },
  "js-running-totals": {
    solution: "const runningTotals = numbers => numbers.reduce((totals, number) => { const previous = totals.length > 0 ? totals[totals.length - 1] : 0; totals.push(previous + number); return totals; }, []);",
    junior: `const runningTotals = numbers => {
  const totals = [];
  let runningSum = 0;
  for (const number of numbers) {
    runningSum = runningSum + number;
    totals.push(runningSum);
  }
  return totals;
};`,
    senior: `const runningTotals = numbers => {
  let sum = 0;
  // map keeps one output per input; the closure carries the running sum between calls.
  return numbers.map(number => (sum += number));
};`,
    hiddenTests: [
      { call: "runningTotals([10,20,30,40,50])", expected: [10, 30, 60, 100, 150] },
      { call: "(() => { const numbers = [1,2,3]; runningTotals(numbers); return numbers; })()", expected: [1, 2, 3] },
      { call: "runningTotals([0.5,0.5,0.5])", expected: [0.5, 1, 1.5] },
    ],
  },
  "js-apply-all": {
    solution: "const applyAll = (value, steps) => steps.reduce((current, step) => step(current), value);",
    junior: `const applyAll = (value, steps) => {
  let current = value;
  for (const step of steps) {
    current = step(current);
  }
  return current;
};`,
    senior: `const applyAll = (value, steps) => {
  // Fold the steps into one pipeline function first, then run it once; no steps leaves the identity.
  const pipeline = steps.reduce((run, step) => input => step(run(input)), input => input);
  return pipeline(value);
};`,
    hiddenTests: [
      { call: "applyAll(1, [n => n + 1, n => n + 1, n => n + 1, n => n + 1])", expected: 5 },
      { call: "applyAll(0, [n => n - 1])", expected: -1 },
      { call: "applyAll(\"a\", [text => text + \"b\", text => text + \"c\", text => text.length])", expected: 3 },
    ],
  },
  "js-swap-pairs": {
    solution: "const swapPairs = list => { const result = list.slice(); for (let index = 0; index + 1 < result.length; index += 2) { [result[index], result[index + 1]] = [result[index + 1], result[index]]; } return result; };",
    junior: `const swapPairs = list => {
  const copy = list.slice();
  for (let index = 0; index < copy.length - 1; index += 2) {
    const first = copy[index];
    const second = copy[index + 1];
    copy[index] = second;
    copy[index + 1] = first;
  }
  return copy;
};`,
    senior: `const swapPairs = list => list.map((item, index, all) => {
  // Even positions look one to the right, odd ones look one to the left; an odd tail has no partner.
  const partner = index % 2 === 0 ? index + 1 : index - 1;
  return partner < all.length ? all[partner] : item;
});`,
    hiddenTests: [
      { call: "swapPairs([1,2,3,4,5,6,7,8])", expected: [2, 1, 4, 3, 6, 5, 8, 7] },
      { call: "swapPairs([true,false])", expected: [false, true] },
      { call: "(() => { const list = [\"x\",\"y\",\"z\"]; const out = swapPairs(list); return out !== list && out.join(\"\") === \"yxz\"; })()", expected: true },
    ],
  },
  "js-sum-labelled-pairs": {
    solution: "const totalOf = (pairs, label) => { let total = 0; for (const [name, value] of pairs) { if (name === label) total += value; } return total; };",
    junior: `const totalOf = (pairs, label) => {
  let total = 0;
  for (const pair of pairs) {
    const name = pair[0];
    const value = pair[1];
    if (name === label) {
      total = total + value;
    }
  }
  return total;
};`,
    senior: `// Destructure each pair in the reducer's parameter list; a non-matching label passes the total through.
const totalOf = (pairs, label) => pairs.reduce((total, [name, value]) => (name === label ? total + value : total), 0);`,
    hiddenTests: [
      { call: "totalOf([[\"tea\",3],[\"coffee\",4],[\"tea\",3],[\"tea\",3]], \"tea\")", expected: 9 },
      { call: "totalOf([[\"k\",0.5],[\"k\",0.25]], \"k\")", expected: 0.75 },
      { call: "totalOf([[\"n\",1],[\"N\",100]], \"n\")", expected: 1 },
    ],
  },
  "js-immutable-list-edits": {
    solution: "const withInserted = (list, index, item) => [...list.slice(0, index), item, ...list.slice(index)];\nconst withoutIndex = (list, index) => [...list.slice(0, index), ...list.slice(index + 1)];\nconst withReplaced = (list, index, item) => [...list.slice(0, index), item, ...list.slice(index + 1)];",
    junior: `const withInserted = (list, index, item) => {
  const copy = list.slice();
  copy.splice(index, 0, item);
  return copy;
};
const withoutIndex = (list, index) => {
  const copy = list.slice();
  copy.splice(index, 1);
  return copy;
};
const withReplaced = (list, index, item) => {
  const copy = list.slice();
  copy[index] = item;
  return copy;
};`,
    senior: `// One non-mutating splice covers all three edits: copy up to the index, add the new items, copy the rest.
const spliced = (list, index, remove, ...insert) => [...list.slice(0, index), ...insert, ...list.slice(index + remove)];
const withInserted = (list, index, item) => spliced(list, index, 0, item);
const withoutIndex = (list, index) => spliced(list, index, 1);
const withReplaced = (list, index, item) => spliced(list, index, 1, item);`,
    hiddenTests: [
      { call: "withReplaced([\"a\",\"b\",\"c\",\"d\"], 0, \"z\")", expected: ["z", "b", "c", "d"] },
      { call: "(() => { const list = [\"a\",\"b\"]; const out = withInserted(list, 1, \"x\"); return out !== list && out.length === 3 && list.length === 2; })()", expected: true },
      { call: "withoutIndex([5,6,7,8], 3)", expected: [5, 6, 7] },
    ],
  },
  "js-variadic-sum": {
    solution: "const sumAll = (...numbers) => { let total = 0; for (const number of numbers) total += number; return total; };",
    junior: `const sumAll = (...numbers) => {
  let total = 0;
  for (let index = 0; index < numbers.length; index += 1) {
    total = total + numbers[index];
  }
  return total;
};`,
    senior: `// The rest parameter is a real array, so reduce folds it straight into a total; no arguments leaves the seed 0.
const sumAll = (...numbers) => numbers.reduce((total, number) => total + number, 0);`,
    hiddenTests: [
      { call: "sumAll(1,2,3,4,5,6,7,8,9,10)", expected: 55 },
      { call: "sumAll(7)", expected: 7 },
      { call: "(() => { const values = [2, 4, 8]; return sumAll(...values, 16); })()", expected: 30 },
    ],
  },
  "js-make-tally": {
    solution: "const makeTally = start => { let total = start; return (...values) => { for (const value of values) total += value; return total; }; };",
    junior: `const makeTally = start => {
  let total = start;
  const tally = (...values) => {
    for (let index = 0; index < values.length; index += 1) {
      total = total + values[index];
    }
    return total;
  };
  return tally;
};`,
    senior: `const makeTally = start => {
  let total = start;
  // Each call folds its own arguments first, then adds that to the total the closure keeps.
  return (...values) => {
    total += values.reduce((sum, value) => sum + value, 0);
    return total;
  };
};`,
    hiddenTests: [
      { call: "(() => { const tally = makeTally(1); tally(1); tally(1); tally(1); return tally(1); })()", expected: 5 },
      { call: "(() => { const tally = makeTally(0); return [tally(2), tally(2), tally(2)]; })()", expected: [2, 4, 6] },
      { call: "(() => { const tally = makeTally(5); tally(...[1, 2, 3]); return tally(); })()", expected: 11 },
    ],
  },
  "js-handlers-keep-index": {
    solution: "const makeHandlers = count => { const handlers = []; for (let index = 0; index < count; index += 1) handlers.push(() => index); return handlers; };",
    junior: `const makeHandlers = count => {
  const handlers = [];
  for (let index = 0; index < count; index += 1) {
    const captured = index;
    const handler = () => {
      return captured;
    };
    handlers.push(handler);
  }
  return handlers;
};`,
    senior: `// Each callback closes over its own index, which the mapping function receives as a parameter.
const makeHandlers = count => Array.from({ length: count }, (_, index) => () => index);`,
    hiddenTests: [
      { call: "makeHandlers(6).map(handler => handler())", expected: [0, 1, 2, 3, 4, 5] },
      { call: "makeHandlers(5)[2]()", expected: 2 },
      { call: "(() => { const handlers = makeHandlers(2); return handlers[0] !== handlers[1]; })()", expected: true },
    ],
  },
  "js-my-map-filter": {
    solution: "const myMap = (list, fn) => { const result = []; for (let index = 0; index < list.length; index += 1) result.push(fn(list[index], index)); return result; };\nconst myFilter = (list, fn) => { const result = []; for (let index = 0; index < list.length; index += 1) { if (fn(list[index], index)) result.push(list[index]); } return result; };",
    junior: `const myMap = (list, fn) => {
  const result = [];
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index];
    const mapped = fn(item, index);
    result.push(mapped);
  }
  return result;
};
const myFilter = (list, fn) => {
  const result = [];
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index];
    const keep = fn(item, index);
    if (keep) {
      result.push(item);
    }
  }
  return result;
};`,
    senior: `const myMap = (list, fn) => {
  // The output length is known, so allocate it once and fill by index instead of pushing.
  const result = new Array(list.length);
  for (let index = 0; index < list.length; index += 1) result[index] = fn(list[index], index);
  return result;
};
const myFilter = (list, fn) => {
  const result = [];
  for (const [index, item] of list.entries()) {
    if (fn(item, index)) result.push(item);
  }
  return result;
};`,
    hiddenTests: [
      { call: "(() => { const list = [3,4,5]; list.map = null; list.filter = null; return [myMap(list, n => n + 1), myFilter(list, n => n > 3)]; })()", expected: [[4, 5, 6], [4, 5]] },
      { call: "myFilter([0, 1, \"\", \"a\", null], item => item)", expected: [1, "a"] },
      { call: "myMap([1,2,3,4,5,6], (n, index) => n * index)", expected: [0, 2, 6, 12, 20, 30] },
    ],
  },
  "js-my-reduce": {
    solution: "const myReduce = (list, fn, initial) => { let accumulator = initial; let start = 0; if (initial === undefined && list.length > 0) { accumulator = list[0]; start = 1; } for (let index = start; index < list.length; index += 1) accumulator = fn(accumulator, list[index], index); return accumulator; };",
    junior: `const myReduce = (list, fn, initial) => {
  let accumulator;
  let startIndex;
  if (initial === undefined) {
    accumulator = list[0];
    startIndex = 1;
  } else {
    accumulator = initial;
    startIndex = 0;
  }
  for (let index = startIndex; index < list.length; index += 1) {
    accumulator = fn(accumulator, list[index], index);
  }
  return accumulator;
};`,
    senior: `const myReduce = (list, fn, initial) => {
  const seeded = initial !== undefined;
  let accumulator = seeded ? initial : list[0];
  for (const [index, item] of list.entries()) {
    if (index === 0 && !seeded) continue; // the first item is already the seed
    accumulator = fn(accumulator, item, index);
  }
  return accumulator;
};`,
    hiddenTests: [
      { call: "(() => { const list = [1,2,3,4]; list.reduce = null; return myReduce(list, (a, b) => a * b, 1); })()", expected: 24 },
      { call: "myReduce([[1],[2],[3]], (flat, part) => flat.concat(part), [])", expected: [1, 2, 3] },
      { call: "myReduce([\"x\"], (a, b) => a + b)", expected: "x" },
    ],
  },
  "js-label-numbers": {
    solution: "const labelNumbers = numbers => numbers.map(number => number > 0 ? \"positive\" : number < 0 ? \"negative\" : \"zero\");",
    junior: `const labelNumbers = numbers => {
  const labels = [];
  for (const number of numbers) {
    if (number > 0) {
      labels.push("positive");
    } else if (number < 0) {
      labels.push("negative");
    } else {
      labels.push("zero");
    }
  }
  return labels;
};`,
    senior: `const labelNumbers = numbers => {
  // Math.sign collapses every number to -1, 0 or 1, so one lookup replaces the nested ternary.
  const bySign = { "1": "positive", "-1": "negative", "0": "zero" };
  return numbers.map(number => bySign[Math.sign(number)]);
};`,
    hiddenTests: [
      { call: "labelNumbers([1,-2,3,-4,0,5])", expected: ["positive", "negative", "positive", "negative", "zero", "positive"] },
      { call: "labelNumbers([-100])", expected: ["negative"] },
      { call: "(() => { const numbers = [1, -1]; labelNumbers(numbers); return numbers; })()", expected: [1, -1] },
    ],
  },
  "js-sum-mixed-values": {
    solution: "const sumMixed = values => { let total = 0; for (const value of values) total += Number(value); return total; };",
    junior: `const sumMixed = values => {
  let total = 0;
  for (const value of values) {
    if (typeof value === "string") {
      total = total + Number(value);
    } else {
      total = total + value;
    }
  }
  return total;
};`,
    senior: `// Number accepts both kinds of input, so one reduce covers the list; the seed 0 keeps the sum numeric.
const sumMixed = values => values.reduce((total, value) => total + Number(value), 0);`,
    hiddenTests: [
      { call: "sumMixed([\"7\",\"8\",\"9\"])", expected: 24 },
      { call: "sumMixed([100,\"100\",100,\"100\"])", expected: 400 },
      { call: "sumMixed([\"0\", 0, \"0\"])", expected: 0 },
    ],
  },
  "js-compact-values": {
    solution: "const compactLoop = values => { const result = []; for (const value of values) { if (value) result.push(value); } return result; };\nconst compactFilter = values => values.filter(Boolean);",
    junior: `const compactLoop = values => {
  const kept = [];
  for (const value of values) {
    const isTruthy = Boolean(value);
    if (isTruthy) {
      kept.push(value);
    }
  }
  return kept;
};
const compactFilter = values => {
  return values.filter(value => {
    if (value) {
      return true;
    }
    return false;
  });
};`,
    senior: `const compactLoop = values => {
  const kept = [];
  for (const value of values) {
    if (!value) continue; // false, 0, "", null, undefined and NaN all fail this test
    kept.push(value);
  }
  return kept;
};
const compactFilter = values => values.filter(Boolean);`,
    hiddenTests: [
      { call: "compactFilter([1, 0, 2, 0, 3, 0, 4, \"\"])", expected: [1, 2, 3, 4] },
      { call: "compactLoop([-1, \"false\", true])", expected: [-1, "false", true] },
      { call: "compactFilter([null, \"x\", undefined, \"y\"])", expected: ["x", "y"] },
    ],
  },
  "js-count-nested-keys": {
    solution: "const countKeys = object => { let count = 0; for (const key in object) { count += 1; const value = object[key]; if (value !== null && typeof value === \"object\" && !Array.isArray(value)) count += countKeys(value); } return count; };",
    junior: `const countKeys = object => {
  let count = 0;
  for (const key in object) {
    count = count + 1;
    const value = object[key];
    const isObject = typeof value === "object";
    const isNull = value === null;
    const isArray = Array.isArray(value);
    if (isObject && !isNull && !isArray) {
      count = count + countKeys(value);
    }
  }
  return count;
};`,
    senior: `// The tag check rules out null and arrays in one comparison.
const isPlainObject = value => Object.prototype.toString.call(value) === "[object Object]";
const countKeys = object => {
  let count = 0;
  // Object.values skips inherited keys, which for...in would also visit.
  for (const value of Object.values(object)) count += 1 + (isPlainObject(value) ? countKeys(value) : 0);
  return count;
};`,
    hiddenTests: [
      { call: "countKeys({a:1,b:2,c:3,d:{e:4,f:5,g:{h:6}}})", expected: 8 },
      { call: "countKeys({x:{y:{}},z:{}})", expected: 3 },
      { call: "countKeys(JSON.parse('{\"a\":{\"b\":1},\"c\":[{\"d\":1}]}'))", expected: 3 },
    ],
  },
  "js-order-total": {
    solution: "const orderTotal = items => { let total = 0; for (const item of items) total += item.price * (item.quantity ?? 1); return total; };",
    junior: `const orderTotal = items => {
  let total = 0;
  for (const item of items) {
    let quantity = item.quantity;
    if (quantity === undefined || quantity === null) {
      quantity = 1;
    }
    total = total + item.price * quantity;
  }
  return total;
};`,
    senior: `// A destructuring default would only cover undefined, so ?? stays to treat null as a missing quantity too.
const orderTotal = items => items.reduce((total, { price, quantity }) => total + price * (quantity ?? 1), 0);`,
    hiddenTests: [
      { call: "orderTotal([{price:1.5,quantity:2},{price:2.5},{price:0,quantity:9}])", expected: 5.5 },
      { call: "orderTotal([{price:7,quantity:undefined}])", expected: 7 },
      { call: "orderTotal([{price:2,quantity:0},{price:2}])", expected: 2 },
    ],
  },
  "js-frequency-map": {
    solution: "const frequencies = values => { const counts = new Map(); for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1); return counts; };",
    junior: `const frequencies = values => {
  const counts = new Map();
  for (const value of values) {
    if (counts.has(value)) {
      counts.set(value, counts.get(value) + 1);
    } else {
      counts.set(value, 1);
    }
  }
  return counts;
};`,
    senior: `// Map.set returns the map itself, so reduce can thread it through without a block body.
const frequencies = values => values.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map());`,
    hiddenTests: [
      { call: "[...frequencies([\"r\",\"g\",\"b\",\"g\",\"r\",\"r\"])]", expected: [["r", 3], ["g", 2], ["b", 1]] },
      { call: "frequencies([true,true,false]).get(true)", expected: 2 },
      { call: "frequencies([null, null]).get(null)", expected: 2 },
    ],
  },
  "js-map-entries-at-least": {
    solution: "const entriesAtLeast = (map, min) => { const pairs = []; for (const [key, value] of map) { if (value >= min) pairs.push([key, value]); } return pairs; };",
    junior: `const entriesAtLeast = (map, min) => {
  const matching = [];
  for (const entry of map) {
    const key = entry[0];
    const value = entry[1];
    if (value >= min) {
      matching.push([key, value]);
    }
  }
  return matching;
};`,
    senior: `// Spreading the Map gives its [key, value] pairs in insertion order; filter keeps the qualifying ones and touches nothing.
const entriesAtLeast = (map, min) => [...map].filter(([, value]) => value >= min);`,
    hiddenTests: [
      { call: "entriesAtLeast(new Map([[\"p\",7],[\"q\",8],[\"r\",1],[\"s\",9]]), 8)", expected: [["q", 8], ["s", 9]] },
      { call: "entriesAtLeast(new Map([[1, 1],[2, 2]]), 2)", expected: [[2, 2]] },
      { call: "entriesAtLeast(new Map([[\"neg\",-1]]), -5)", expected: [["neg", -1]] },
    ],
  },
  "js-chunk-with-loop": {
    solution: "const chunkBy = (items, size) => { const groups = []; let current = []; for (let index = 0; index < items.length; index += 1) { current.push(items[index]); if (current.length === size) { groups.push(current); current = []; } } if (current.length > 0) groups.push(current); return groups; };",
    junior: `const chunkBy = (items, size) => {
  const groups = [];
  for (let index = 0; index < items.length; index += 1) {
    const startsNewGroup = index % size === 0;
    if (startsNewGroup) {
      groups.push([]);
    }
    const lastGroup = groups[groups.length - 1];
    lastGroup.push(items[index]);
  }
  return groups;
};`,
    senior: `const chunkBy = (items, size) => items.reduce((groups, item, index) => {
  // A new group opens at every multiple of size; the item always lands in the latest one.
  if (index % size === 0) groups.push([]);
  groups[groups.length - 1].push(item);
  return groups;
}, []);`,
    hiddenTests: [
      { call: "(() => { const items = [1,2,3,4,5,6,7]; items.slice = null; return chunkBy(items, 3); })()", expected: [[1, 2, 3], [4, 5, 6], [7]] },
      { call: "chunkBy([1,2,3,4,5,6], 3)", expected: [[1, 2, 3], [4, 5, 6]] },
      { call: "chunkBy([9], 4)", expected: [[9]] },
    ],
  },
  "js-zip-lists": {
    solution: "const zip = (left, right) => { const pairs = []; const length = Math.min(left.length, right.length); for (let index = 0; index < length; index += 1) pairs.push([left[index], right[index]]); return pairs; };",
    junior: `const zip = (left, right) => {
  const pairs = [];
  let shorter = left.length;
  if (right.length < shorter) {
    shorter = right.length;
  }
  for (let index = 0; index < shorter; index += 1) {
    const pair = [left[index], right[index]];
    pairs.push(pair);
  }
  return pairs;
};`,
    senior: `// The pair count is the shorter length, so Array.from can build the result from indexes alone.
const zip = (left, right) => Array.from({ length: Math.min(left.length, right.length) }, (_, index) => [left[index], right[index]]);`,
    hiddenTests: [
      { call: "zip([1,2,3,4,5], [5,4,3,2,1])", expected: [[1, 5], [2, 4], [3, 3], [4, 2], [5, 1]] },
      { call: "zip([\"a\"], [1,2,3,4])", expected: [["a", 1]] },
      { call: "(() => { const left = [1,2]; const right = [3,4]; zip(left, right); return [left, right]; })()", expected: [[1, 2], [3, 4]] },
    ],
  },
  "js-rotate-by-n": {
    solution: "const rotateBy = (list, n) => { const length = list.length; if (length === 0) return []; const shift = ((n % length) + length) % length; const result = []; for (let index = 0; index < length; index += 1) result.push(list[(index - shift + length) % length]); return result; };",
    junior: `const rotateBy = (list, n) => {
  const length = list.length;
  const result = [];
  if (length === 0) {
    return result;
  }
  let shift = n % length;
  if (shift < 0) {
    shift = shift + length;
  }
  for (let index = 0; index < length; index += 1) {
    const destination = (index + shift) % length;
    result[destination] = list[index];
  }
  return result;
};`,
    senior: `const rotateBy = (list, n) => {
  const { length } = list;
  // Each slot reads from (index - n) mod length, made non-negative so left turns and a large n wrap alike.
  return list.map((_, index) => list[(((index - n) % length) + length) % length]);
};`,
    hiddenTests: [
      { call: "rotateBy([1,2,3,4], 4)", expected: [1, 2, 3, 4] },
      { call: "rotateBy([1,2,3,4,5,6], -8)", expected: [3, 4, 5, 6, 1, 2] },
      { call: "(() => { const list = [1,2,3]; rotateBy(list, 1); return list; })()", expected: [1, 2, 3] },
    ],
  },
  "js-run-length-encode": {
    solution: "const runLength = text => { let result = \"\"; let count = 0; for (let index = 0; index < text.length; index += 1) { count += 1; if (text[index] !== text[index + 1]) { result += count + text[index]; count = 0; } } return result; };",
    junior: `const runLength = text => {
  if (text === "") {
    return "";
  }
  let encoded = "";
  let current = text[0];
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === current) {
      count = count + 1;
    } else {
      encoded = encoded + count + current;
      current = character;
      count = 1;
    }
  }
  encoded = encoded + count + current;
  return encoded;
};`,
    senior: `const runLength = text => {
  let encoded = "";
  for (let start = 0; start < text.length; ) {
    let end = start;
    while (text[end] === text[start]) end += 1; // past the end text[end] is undefined, which closes the run
    encoded += \`\${end - start}\${text[start]}\`;
    start = end;
  }
  return encoded;
};`,
    hiddenTests: [
      { call: "runLength(\"xxxxyyyxxz\")", expected: "4x3y2x1z" },
      { call: "runLength(\"ab\")", expected: "1a1b" },
      { call: "runLength(\"       \")", expected: "7 " },
    ],
  },
  "js-pair-with-sum": {
    solution: "const pairWithSum = (sorted, target) => { let left = 0; let right = sorted.length - 1; while (left < right) { const sum = sorted[left] + sorted[right]; if (sum === target) return [sorted[left], sorted[right]]; if (sum < target) left += 1; else right -= 1; } return null; };",
    junior: `const pairWithSum = (sorted, target) => {
  for (let first = 0; first < sorted.length; first += 1) {
    for (let second = first + 1; second < sorted.length; second += 1) {
      const sum = sorted[first] + sorted[second];
      if (sum === target) {
        return [sorted[first], sorted[second]];
      }
    }
  }
  return null;
};`,
    senior: `const pairWithSum = (sorted, target) => {
  for (let left = 0, right = sorted.length - 1; left < right; ) {
    const sum = sorted[left] + sorted[right];
    if (sum === target) return [sorted[left], sorted[right]];
    // Too small even with the largest value still in play, so this left value can never pair: skip it for good.
    if (sum < target) left += 1;
    else right -= 1;
  }
  return null;
};`,
    hiddenTests: [
      { call: "pairWithSum([2,3,5,8,13,21], 26)", expected: [5, 21] },
      { call: "pairWithSum([1,1,2,2], 2)", expected: [1, 1] },
      { call: "pairWithSum([10,20,30,40,50], 90)", expected: [40, 50] },
    ],
  },
  "js-binary-search": {
    solution: "const binarySearch = (sorted, target) => { let low = 0; let high = sorted.length - 1; while (low <= high) { const middle = Math.floor((low + high) / 2); if (sorted[middle] === target) return middle; if (sorted[middle] < target) low = middle + 1; else high = middle - 1; } return -1; };",
    junior: `const binarySearch = (sorted, target) => {
  let low = 0;
  let high = sorted.length - 1;
  let foundAt = -1;
  while (low <= high && foundAt === -1) {
    const middle = Math.floor((low + high) / 2);
    const value = sorted[middle];
    if (value === target) {
      foundAt = middle;
    } else if (value < target) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return foundAt;
};`,
    senior: `const binarySearch = (sorted, target) => {
  let low = 0;
  let high = sorted.length; // half-open: the answer, if any, sits in [low, high)
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const value = sorted[middle];
    if (value === target) return middle;
    if (value < target) low = middle + 1;
    else high = middle;
  }
  return -1;
};`,
    hiddenTests: [
      { call: "(() => { let reads = 0; const big = Array.from({ length: 1000 }, (_, index) => index * 2); const watched = new Proxy(big, { get: (list, key) => { if (typeof key === \"string\" && /^\\d+$/.test(key)) reads += 1; return list[key]; } }); const index = binarySearch(watched, 1998); return [index, reads < 30]; })()", expected: [999, true] },
      { call: "binarySearch([-9,-4,0,3,8,12,20], -4)", expected: 1 },
      { call: "binarySearch([10,20,30], 25)", expected: -1 },
    ],
  },
  "js-sliding-window-max": {
    solution: "const windowMax = (numbers, size) => { const result = []; for (let start = 0; start + size <= numbers.length; start += 1) { let best = numbers[start]; for (let index = start + 1; index < start + size; index += 1) { if (numbers[index] > best) best = numbers[index]; } result.push(best); } return result; };",
    junior: `const windowMax = (numbers, size) => {
  const maxes = [];
  const lastStart = numbers.length - size;
  for (let start = 0; start <= lastStart; start += 1) {
    let best = numbers[start];
    for (let offset = 1; offset < size; offset += 1) {
      const candidate = numbers[start + offset];
      if (candidate > best) {
        best = candidate;
      }
    }
    maxes.push(best);
  }
  return maxes;
};`,
    senior: `const windowMax = (numbers, size) => {
  // One entry per window start; Math.max over a slice scans the window without a hand-written inner loop.
  const windows = Math.max(0, numbers.length - size + 1);
  return Array.from({ length: windows }, (_, start) => Math.max(...numbers.slice(start, start + size)));
};`,
    hiddenTests: [
      { call: "windowMax([9,8,7,6,5,4,3,2,1], 4)", expected: [9, 8, 7, 6, 5, 4] },
      { call: "windowMax([1,2,3,4,5,6], 1)", expected: [1, 2, 3, 4, 5, 6] },
      { call: "windowMax([2,2,2,2], 3)", expected: [2, 2] },
    ],
  },
  "js-matrix-transpose": {
    solution: "const transpose = matrix => { const result = []; if (matrix.length === 0) return result; for (let column = 0; column < matrix[0].length; column += 1) { const row = []; for (let line = 0; line < matrix.length; line += 1) row.push(matrix[line][column]); result.push(row); } return result; };",
    junior: `const transpose = matrix => {
  const result = [];
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix[row].length; column += 1) {
      if (result[column] === undefined) {
        result[column] = [];
      }
      result[column][row] = matrix[row][column];
    }
  }
  return result;
};`,
    senior: `const transpose = matrix => {
  if (matrix.length === 0) return []; // no first row to take the column count from
  // Walk the columns of the first row; each becomes a row made of that column from every input row.
  return matrix[0].map((_, column) => matrix.map(row => row[column]));
};`,
    hiddenTests: [
      { call: "transpose([[1,2,3,4],[5,6,7,8],[9,10,11,12]])", expected: [[1, 5, 9], [2, 6, 10], [3, 7, 11], [4, 8, 12]] },
      { call: "transpose([[\"a\",\"b\"],[\"c\",\"d\"],[\"e\",\"f\"]])", expected: [["a", "c", "e"], ["b", "d", "f"]] },
      { call: "(() => { const out = transpose([[1,2],[3,4]]); return out[0] !== out[1]; })()", expected: true },
    ],
  },
};
