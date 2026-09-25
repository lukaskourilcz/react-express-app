// Server-only reference solutions and hidden tests for lib/coding/tasks/easy-javascript-c.ts.
// Never import from client code. The hidden tests aim at the shortcut each
// visible set leaves open: a hard-coded answer, a changed input, a value or a
// shape the visible tests never used, and the case the technique exists for.

import type { CodingSolution } from '../types';

export const EASY_JAVASCRIPT_C_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── pop, shift and unshift ───────────────────────────────────────── */
  'js-easy4-undo-last': {
    solution: `const undo = history => {
  // pop gives undefined on an empty array, so answer null before calling it.
  if (history.length === 0) return null;
  return history.pop();
};`,
    junior: `const undo = history => {
  if (history.length === 0) {
    return null;
  }
  const newest = history.pop();
  return newest;
};`,
    senior: `const undo = history => (history.length > 0 ? history.pop() : null);`,
    hiddenTests: [
      { call: '(() => { const history = [1, 2, 3]; const undone = [undo(history), undo(history), undo(history), undo(history)]; return [undone, history]; })()', expected: [[3, 2, 1, null], []] },
      { call: 'undo([0])', expected: 0 },
      { call: 'undo(["", "x", ""])', expected: '' },
    ],
  },
  'js-easy4-recent-searches': {
    solution: `const addSearch = (recent, term, max) => {
  // Newest first; the oldest searches fall off the end.
  recent.unshift(term);
  while (recent.length > max) {
    recent.pop();
  }
  return recent;
};`,
    junior: `const addSearch = (recent, term, max) => {
  recent.unshift(term);
  let tooMany = recent.length > max;
  while (tooMany) {
    recent.pop();
    tooMany = recent.length > max;
  }
  return recent;
};`,
    senior: `const addSearch = (recent, term, max) => {
  recent.unshift(term);
  while (recent.length > max) recent.pop();
  return recent;
};`,
    hiddenTests: [
      { call: '(() => { const recent = ["a"]; return addSearch(recent, "b", 2) === recent; })()', expected: true },
      { call: 'addSearch(["x", "y", "z", "w"], "new", 2)', expected: ['new', 'x'] },
      { call: 'addSearch(["a", "b", "c"], "d", 4)', expected: ['d', 'a', 'b', 'c'] },
    ],
  },
  'js-easy4-split-command': {
    solution: `const readCommand = words => {
  // shift changes the array it is called on, so work on a copy.
  const args = [...words];
  const command = args.shift();
  // shift gives undefined when there was no first word.
  return { command: command === undefined ? null : command, args };
};`,
    junior: `const readCommand = words => {
  const args = words.slice();
  let command = null;
  if (args.length > 0) {
    command = args.shift();
  }
  return { command: command, args: args };
};`,
    senior: `const readCommand = words => {
  const args = [...words];
  const command = args.length > 0 ? args.shift() : null;
  return { command, args };
};`,
    hiddenTests: [
      { call: 'readCommand(["move", "3", "left", "fast"])', expected: { command: 'move', args: ['3', 'left', 'fast'] } },
      { call: 'readCommand(["", "x"])', expected: { command: '', args: ['x'] } },
      { call: '(() => { const words = ["a"]; readCommand(words).args.push("b"); return words; })()', expected: ['a'] },
    ],
  },

  /* ── concat and join ──────────────────────────────────────────────── */
  'js-easy4-header-and-footer': {
    solution: `const framed = (rows, header, footer) => {
  // concat spreads an array argument one level, so the footer is wrapped
  // to arrive as one item even when it is an array of cells.
  return [header].concat(rows, [footer]);
};`,
    junior: `const framed = (rows, header, footer) => {
  const top = [header];
  const bottom = [footer];
  const withRows = top.concat(rows);
  const result = withRows.concat(bottom);
  return result;
};`,
    senior: `const framed = (rows, header, footer) => [header].concat(rows, [footer]);`,
    hiddenTests: [
      { call: 'framed([1, 2, 3], 0, 4)', expected: [0, 1, 2, 3, 4] },
      { call: 'framed([["a"]], ["H"], ["F"])', expected: [['H'], ['a'], ['F']] },
      { call: 'framed([], [], [])', expected: [[], []] },
    ],
  },
  'js-easy4-csv-line': {
    solution: `const toCsvLine = values => {
  // join writes null and undefined as empty text, which is an empty cell.
  return values.join(",");
};`,
    junior: `const toCsvLine = values => {
  const separator = ",";
  const line = values.join(separator);
  return line;
};`,
    senior: `const toCsvLine = values => values.join(",");`,
    hiddenTests: [
      { call: 'toCsvLine([0, false, ""])', expected: '0,false,' },
      { call: 'toCsvLine(["a", "b", "c", "d"])', expected: 'a,b,c,d' },
      { call: 'toCsvLine([null, null])', expected: ',' },
    ],
  },

  /* ── slice ────────────────────────────────────────────────────────── */
  'js-easy4-last-few': {
    solution: `const lastFew = (items, n) => {
  // slice(-0) is slice(0), the whole array, so 0 needs its own answer.
  if (n === 0) return [];
  return items.slice(-n);
};`,
    junior: `const lastFew = (items, n) => {
  if (n <= 0) {
    return [];
  }
  const start = -n;
  const result = items.slice(start);
  return result;
};`,
    senior: `const lastFew = (items, n) => items.slice(Math.max(items.length - n, 0));`,
    hiddenTests: [
      { call: 'lastFew([], 3)', expected: [] },
      { call: 'lastFew([5, 6, 7, 8, 9], 4)', expected: [6, 7, 8, 9] },
      { call: '(() => { const items = [1, 2]; return lastFew(items, 5) === items; })()', expected: false },
      { call: 'lastFew(["x", "y", "z"], 0)', expected: [] },
    ],
  },

  /* ── do...while ───────────────────────────────────────────────────── */
  'js-easy4-count-digits': {
    solution: `const countDigits = n => {
  let digits = 0;
  // The body runs before the first check, so 0 still counts as one digit.
  do {
    digits++;
    n = Math.floor(n / 10);
  } while (n > 0);
  return digits;
};`,
    junior: `const countDigits = n => {
  let count = 0;
  let remaining = n;
  do {
    count = count + 1;
    remaining = Math.floor(remaining / 10);
  } while (remaining > 0);
  return count;
};`,
    senior: `const countDigits = n => {
  let digits = 0;
  do {
    digits += 1;
    n = Math.trunc(n / 10);
  } while (n > 0);
  return digits;
};`,
    hiddenTests: [
      { call: 'countDigits(9)', expected: 1 },
      { call: 'countDigits(10)', expected: 2 },
      { call: 'countDigits(99999)', expected: 5 },
      { call: 'countDigits(100000)', expected: 6 },
    ],
  },
  'js-easy4-every-page': {
    solution: `const readAll = getPage => {
  const items = [];
  let pageNumber = 1;
  // Page 1 has to be read before we know whether a page 2 exists.
  do {
    const page = getPage(pageNumber);
    items.push(...page.items);
    pageNumber = page.next;
  } while (pageNumber !== null);
  return items;
};`,
    junior: `const readAll = getPage => {
  const items = [];
  let pageNumber = 1;
  let page;
  do {
    page = getPage(pageNumber);
    for (let i = 0; i < page.items.length; i++) {
      items.push(page.items[i]);
    }
    pageNumber = page.next;
  } while (pageNumber !== null);
  return items;
};`,
    senior: `const readAll = getPage => {
  const items = [];
  let next = 1;
  do {
    const page = getPage(next);
    items.push(...page.items);
    ({ next } = page);
  } while (next !== null);
  return items;
};`,
    hiddenTests: [
      { call: 'readAll(n => ({ 1: { items: [], next: 2 }, 2: { items: ["late"], next: null } })[n])', expected: ['late'] },
      { call: 'readAll(() => ({ items: [[1, 2]], next: null }))', expected: [[1, 2]] },
      { call: '(() => { let calls = 0; readAll(() => { calls += 1; return { items: [], next: null }; }); return calls; })()', expected: 1 },
      { call: 'readAll(n => ({ 1: { items: [1, 2], next: 2 }, 2: { items: [3, 4], next: 3 }, 3: { items: [5], next: null } })[n])', expected: [1, 2, 3, 4, 5] },
    ],
  },

  /* ── forEach ──────────────────────────────────────────────────────── */
  'js-easy4-place-totals': {
    solution: `const placeTotals = numbers => {
  const totals = { even: 0, odd: 0 };
  // forEach passes the index second, after the value.
  numbers.forEach((number, index) => {
    if (index % 2 === 0) totals.even += number;
    else totals.odd += number;
  });
  return totals;
};`,
    junior: `const placeTotals = numbers => {
  let even = 0;
  let odd = 0;
  numbers.forEach(function (number, index) {
    if (index % 2 === 0) {
      even = even + number;
    } else {
      odd = odd + number;
    }
  });
  return { even: even, odd: odd };
};`,
    senior: `const placeTotals = numbers => {
  const totals = { even: 0, odd: 0 };
  numbers.forEach((number, index) => {
    totals[index % 2 === 0 ? "even" : "odd"] += number;
  });
  return totals;
};`,
    hiddenTests: [
      { call: 'placeTotals([10, -5, 10, -5])', expected: { even: 20, odd: -10 } },
      { call: 'placeTotals([0, 9])', expected: { even: 0, odd: 9 } },
      { call: 'placeTotals([1, 2, 3, 4, 5, 6])', expected: { even: 9, odd: 12 } },
    ],
  },

  /* ── nested loops ─────────────────────────────────────────────────── */
  'js-easy4-grid-differences': {
    solution: `const differences = (a, b) => {
  const found = [];
  for (let row = 0; row < a.length; row++) {
    // The inner loop walks across the current row, whatever its length.
    for (let column = 0; column < a[row].length; column++) {
      if (a[row][column] !== b[row][column]) found.push([row, column]);
    }
  }
  return found;
};`,
    junior: `const differences = (a, b) => {
  const found = [];
  for (let row = 0; row < a.length; row++) {
    const rowA = a[row];
    const rowB = b[row];
    for (let column = 0; column < rowA.length; column++) {
      if (rowA[column] !== rowB[column]) {
        found.push([row, column]);
      }
    }
  }
  return found;
};`,
    senior: `const differences = (a, b) => {
  const found = [];
  a.forEach((cells, row) => {
    cells.forEach((cell, column) => {
      if (cell !== b[row][column]) found.push([row, column]);
    });
  });
  return found;
};`,
    hiddenTests: [
      { call: 'differences([[1, 2], [3, 4]], [[5, 6], [7, 8]])', expected: [[0, 0], [0, 1], [1, 0], [1, 1]] },
      { call: 'differences([[1, 2], [3, 4], [5, 6]], [[1, 2], [3, 4], [5, 7]])', expected: [[2, 1]] },
      { call: 'differences([["a", "b", "c"], ["d", "e", "f"]], [["a", "b", "c"], ["d", "e", "F"]])', expected: [[1, 2]] },
      { call: 'differences([[0, 1]], [[false, 1]])', expected: [[0, 0]] },
    ],
  },

  /* ── two pointers ─────────────────────────────────────────────────── */
  'js-easy4-letters-in-order': {
    solution: `const inOrder = (short, long) => {
  let i = 0; // the next character of short to find
  // j visits every character of long; i moves only on a match.
  for (let j = 0; j < long.length && i < short.length; j++) {
    if (short[i] === long[j]) i++;
  }
  return i === short.length;
};`,
    junior: `const inOrder = (short, long) => {
  let i = 0;
  let j = 0;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i = i + 1;
    }
    j = j + 1;
  }
  return i === short.length;
};`,
    senior: `const inOrder = (short, long) => {
  let found = 0;
  for (const char of long) {
    if (char === short[found]) found++;
  }
  return found === short.length;
};`,
    hiddenTests: [
      { call: 'inOrder("aa", "baba")', expected: true },
      { call: 'inOrder("shark", "s-h-a-r-k")', expected: true },
      { call: 'inOrder("ab", "ba")', expected: false },
      { call: 'inOrder("abc", "abc")', expected: true },
      { call: 'inOrder("", "")', expected: true },
    ],
  },
  'js-easy4-mirror-lists': {
    solution: `const isMirror = (a, b) => {
  if (a.length !== b.length) return false;
  // i walks a from the front while j walks b from the back.
  for (let i = 0, j = b.length - 1; i < a.length; i++, j--) {
    if (a[i] !== b[j]) return false;
  }
  return true;
};`,
    junior: `const isMirror = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  let i = 0;
  let j = b.length - 1;
  while (i < a.length) {
    if (a[i] !== b[j]) {
      return false;
    }
    i = i + 1;
    j = j - 1;
  }
  return true;
};`,
    senior: `const isMirror = (a, b) =>
  a.length === b.length && a.every((item, i) => item === b[b.length - 1 - i]);`,
    hiddenTests: [
      { call: 'isMirror([1, 2], [0, 2, 1])', expected: false },
      { call: 'isMirror([1, 2, 3], [2, 1])', expected: false },
      { call: 'isMirror([1, 2, 1], [1, 2, 1])', expected: true },
      { call: 'isMirror([1, 2], [1, 2])', expected: false },
      { call: 'isMirror(["a"], ["a"])', expected: true },
    ],
  },

  /* ── flat ─────────────────────────────────────────────────────────── */
  'js-easy4-flatten-all': {
    solution: `const flattenAll = list => {
  // flat takes a depth; Infinity keeps going until nothing is nested.
  return list.flat(Infinity);
};`,
    junior: `const flattenAll = list => {
  let result = list.flat();
  while (result.some(item => Array.isArray(item))) {
    result = result.flat();
  }
  return result;
};`,
    senior: `const flattenAll = list => list.flat(Infinity);`,
    hiddenTests: [
      { call: 'flattenAll([[[[[[1]]]]], 2])', expected: [1, 2] },
      { call: 'flattenAll(["a", ["b", ["c"]], ["d"]])', expected: ['a', 'b', 'c', 'd'] },
      { call: '(() => { const list = [1]; return flattenAll(list) === list; })()', expected: false },
      { call: 'flattenAll([])', expected: [] },
    ],
  },
  'js-easy4-expand-ranges': {
    solution: `const expand = ranges =>
  // Each range becomes its own array; flatMap joins them one level deep.
  ranges.flatMap(([from, to]) => {
    const pages = [];
    for (let page = from; page <= to; page++) pages.push(page);
    return pages;
  });`,
    junior: `const expand = ranges => {
  const lists = ranges.map(range => {
    const from = range[0];
    const to = range[1];
    const pages = [];
    for (let page = from; page <= to; page++) {
      pages.push(page);
    }
    return pages;
  });
  return lists.flat();
};`,
    senior: `const expand = ranges =>
  ranges.flatMap(([from, to]) => Array.from({ length: to - from + 1 }, (_, i) => from + i));`,
    hiddenTests: [
      { call: 'expand([[5, 9]])', expected: [5, 6, 7, 8, 9] },
      { call: 'expand([[0, 0], [1, 1]])', expected: [0, 1] },
      { call: 'expand([[1, 2], [3, 4], [5, 5]])', expected: [1, 2, 3, 4, 5] },
      { call: 'expand([[-2, 1]])', expected: [-2, -1, 0, 1] },
    ],
  },

  /* ── some, find, includes, indexOf and findIndex ──────────────────── */
  'js-easy4-any-overdue': {
    solution: `const hasOverdue = (tasks, today) => {
  // some stops at the first task that is open and past its date.
  return tasks.some(task => !task.done && task.due < today);
};`,
    junior: `const hasOverdue = (tasks, today) => {
  return tasks.some(function (task) {
    if (task.done) {
      return false;
    }
    const isLate = task.due < today;
    return isLate;
  });
};`,
    senior: `const hasOverdue = (tasks, today) => tasks.some(({ done, due }) => !done && due < today);`,
    hiddenTests: [
      { call: 'hasOverdue([{ title: "x", due: "2025-12-31", done: false }], "2026-01-01")', expected: true },
      { call: 'hasOverdue([{ title: "a", due: "2026-01-01", done: true }, { title: "b", due: "2027-01-01", done: false }], "2026-06-01")', expected: false },
      { call: 'hasOverdue([{ title: "a", due: "2026-09-24", done: false }], "2026-09-25")', expected: true },
    ],
  },
  'js-easy4-first-free-slot': {
    solution: `const firstFree = slots => {
  const slot = slots.find(slot => !slot.booked);
  // find gives undefined when every slot is booked.
  return slot ? slot.time : null;
};`,
    junior: `const firstFree = slots => {
  const freeSlot = slots.find(function (slot) {
    return slot.booked === false;
  });
  if (freeSlot === undefined) {
    return null;
  }
  return freeSlot.time;
};`,
    senior: `const firstFree = slots => slots.find(slot => !slot.booked)?.time ?? null;`,
    hiddenTests: [
      { call: 'firstFree([{ time: "13:00", booked: true }, { time: "13:15", booked: true }, { time: "13:30", booked: false }])', expected: '13:30' },
      { call: 'firstFree([{ time: "16:00", booked: true }, { time: "16:30", booked: true }])', expected: null },
      { call: 'firstFree([{ time: "11:00", booked: false }, { time: "11:30", booked: false }])', expected: '11:00' },
    ],
  },
  'js-easy4-allowed-file': {
    solution: `const isAllowed = (fileName, allowed) => {
  const dot = fileName.lastIndexOf(".");
  // No dot means no extension, not an extension equal to the whole name.
  if (dot === -1) return false;
  const extension = fileName.slice(dot + 1).toLowerCase();
  return allowed.includes(extension);
};`,
    junior: `const isAllowed = (fileName, allowed) => {
  const parts = fileName.split(".");
  if (parts.length < 2) {
    return false;
  }
  const last = parts[parts.length - 1];
  const extension = last.toLowerCase();
  return allowed.includes(extension);
};`,
    senior: `const isAllowed = (fileName, allowed) => {
  const dot = fileName.lastIndexOf(".");
  return dot !== -1 && allowed.includes(fileName.slice(dot + 1).toLowerCase());
};`,
    hiddenTests: [
      { call: 'isAllowed("my.photo.JPG", ["jpg"])', expected: true },
      { call: 'isAllowed("report.pdf.exe", ["pdf"])', expected: false },
      { call: 'isAllowed("README", ["md", "txt"])', expected: false },
      { call: 'isAllowed("a.Jpg", ["png", "jpg"])', expected: true },
    ],
  },
  'js-easy4-next-step': {
    solution: `const nextStep = (steps, current) => {
  const index = steps.indexOf(current);
  // -1 means not found; without this check steps[0] would come back.
  if (index === -1 || index === steps.length - 1) return null;
  return steps[index + 1];
};`,
    junior: `const nextStep = (steps, current) => {
  const index = steps.indexOf(current);
  if (index === -1) {
    return null;
  }
  const lastIndex = steps.length - 1;
  if (index === lastIndex) {
    return null;
  }
  return steps[index + 1];
};`,
    senior: `const nextStep = (steps, current) => {
  const index = steps.indexOf(current);
  return index === -1 ? null : steps[index + 1] ?? null;
};`,
    hiddenTests: [
      { call: 'nextStep(["x", "y", "z"], "q")', expected: null },
      { call: 'nextStep(["one"], "one")', expected: null },
      { call: 'nextStep(["start", "middle", "end"], "middle")', expected: 'end' },
      { call: 'nextStep(["a", "b"], "a")', expected: 'b' },
    ],
  },
  'js-easy4-insert-position': {
    solution: `const insertAt = (sorted, value) => {
  const index = sorted.findIndex(number => number >= value);
  // -1 means nothing is as big as value, so it goes at the end.
  return index === -1 ? sorted.length : index;
};`,
    junior: `const insertAt = (sorted, value) => {
  const index = sorted.findIndex(function (number) {
    return number >= value;
  });
  if (index === -1) {
    return sorted.length;
  }
  return index;
};`,
    senior: `const insertAt = (sorted, value) => {
  const index = sorted.findIndex(number => number >= value);
  return index < 0 ? sorted.length : index;
};`,
    hiddenTests: [
      { call: 'insertAt([1, 3, 5, 7], 6)', expected: 3 },
      { call: 'insertAt([1, 1, 1], 1)', expected: 0 },
      { call: 'insertAt([-5, 0, 5], -10)', expected: 0 },
      { call: 'insertAt([2, 4], 100)', expected: 2 },
    ],
  },

  /* ── default parameters and recursion ─────────────────────────────── */
  'js-easy4-clamp-defaults': {
    solution: `// Defaults in the parameter list apply only when an argument is undefined.
const clamp = (value, min = 0, max = 100) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};`,
    junior: `function clamp(value, min = 0, max = 100) {
  if (value < min) {
    return min;
  } else if (value > max) {
    return max;
  } else {
    return value;
  }
}`,
    senior: `const clamp = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max);`,
    hiddenTests: [
      { call: 'clamp(5, 0, 0)', expected: 0 },
      { call: 'clamp(-20, undefined, 10)', expected: 0 },
      { call: 'clamp(-1, -10, -5)', expected: -5 },
      { call: 'clamp(100)', expected: 100 },
      { call: 'clamp(3, undefined, undefined)', expected: 3 },
    ],
  },
  'js-easy4-to-binary': {
    solution: `const toBinary = n => {
  // Base case: 0 and 1 are single binary digits.
  if (n < 2) return String(n);
  // Recursive case: the digits of half of n, then the last digit.
  return toBinary(Math.floor(n / 2)) + (n % 2);
};`,
    junior: `function toBinary(n) {
  if (n === 0) {
    return "0";
  }
  if (n === 1) {
    return "1";
  }
  const lastDigit = n % 2;
  const rest = Math.floor(n / 2);
  return toBinary(rest) + String(lastDigit);
}`,
    senior: `const toBinary = n => (n < 2 ? String(n) : toBinary(n >> 1) + (n & 1));`,
    hiddenTests: [
      { call: 'toBinary(255)', expected: '11111111' },
      { call: 'toBinary(2)', expected: '10' },
      { call: 'toBinary(1024)', expected: '10000000000' },
      { call: 'toBinary(37)', expected: '100101' },
    ],
  },

  /* ── higher-order functions and callbacks ─────────────────────────── */
  'js-easy4-record-calls': {
    solution: `const recorded = (fn, calls) => {
  // The new function keeps hold of fn and calls, and gathers any arguments.
  return (...args) => {
    const result = fn(...args);
    calls.push({ args, result });
    return result;
  };
};`,
    junior: `function recorded(fn, calls) {
  function wrapper(...args) {
    const result = fn(...args);
    const entry = { args: args, result: result };
    calls.push(entry);
    return result;
  }
  return wrapper;
}`,
    senior: `const recorded = (fn, calls) => (...args) => {
  const result = fn(...args);
  calls.push({ args, result });
  return result;
};`,
    hiddenTests: [
      { call: '(() => { const calls = []; const sum = recorded((...n) => n.reduce((a, b) => a + b, 0), calls); sum(1, 2, 3, 4); return calls; })()', expected: [{ args: [1, 2, 3, 4], result: 10 }] },
      { call: '(() => { const calls = []; const times = recorded((a, b) => a * b, calls); return [times(3, 4), times(0, 9), calls.length]; })()', expected: [12, 0, 2] },
      { call: '(() => { const log = []; const inc = recorded(x => x + 1, log); const dbl = recorded(x => x * 2, log); inc(1); dbl(5); return log; })()', expected: [{ args: [1], result: 2 }, { args: [5], result: 10 }] },
    ],
  },
  'js-easy4-each-line': {
    solution: `const eachLine = (text, onLine) => {
  let reported = 0;
  text.split("\\n").forEach((line, index) => {
    if (line === "") return;
    // The callback decides what to do; we only pass the line and its number.
    onLine(line, index + 1);
    reported++;
  });
  return reported;
};`,
    junior: `const eachLine = (text, onLine) => {
  let reported = 0;
  const lines = text.split("\\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line !== "") {
      const number = i + 1;
      onLine(line, number);
      reported = reported + 1;
    }
  }
  return reported;
};`,
    senior: `const eachLine = (text, onLine) =>
  text.split("\\n").reduce((reported, line, index) => {
    if (!line) return reported;
    onLine(line, index + 1);
    return reported + 1;
  }, 0);`,
    hiddenTests: [
      { call: '(() => { const seen = []; const count = eachLine("one", line => seen.push(line)); return [count, seen]; })()', expected: [1, ['one']] },
      { call: '(() => { const seen = []; eachLine("\\nstart\\n", (line, number) => seen.push(number)); return seen; })()', expected: [2] },
      { call: 'eachLine("a\\n\\n\\nb\\nc", () => {})', expected: 3 },
    ],
  },
  'js-easy4-report-changes': {
    solution: `const applyChanges = (settings, changes, onChange) => {
  let changed = 0;
  for (const key in changes) {
    // Read the old value before it is overwritten.
    const oldValue = settings[key];
    const newValue = changes[key];
    if (oldValue === newValue) continue;
    settings[key] = newValue;
    onChange(key, oldValue, newValue);
    changed++;
  }
  return changed;
};`,
    junior: `const applyChanges = (settings, changes, onChange) => {
  let changed = 0;
  for (const key in changes) {
    const oldValue = settings[key];
    const newValue = changes[key];
    if (oldValue !== newValue) {
      settings[key] = newValue;
      onChange(key, oldValue, newValue);
      changed = changed + 1;
    }
  }
  return changed;
};`,
    senior: `const applyChanges = (settings, changes, onChange) => {
  let changed = 0;
  for (const key in changes) {
    const [before, after] = [settings[key], changes[key]];
    if (before === after) continue;
    settings[key] = after;
    onChange(key, before, after);
    changed += 1;
  }
  return changed;
};`,
    hiddenTests: [
      { call: '(() => { const seen = []; const settings = { a: 1, b: 2, c: 3 }; const count = applyChanges(settings, { a: 1, b: 20, c: 30 }, key => seen.push(key)); return [count, seen, settings]; })()', expected: [2, ['b', 'c'], { a: 1, b: 20, c: 30 }] },
      { call: '(() => { const settings = { on: false }; return [applyChanges(settings, { on: 0 }, () => {}), settings.on]; })()', expected: [1, 0] },
      { call: '(() => { const seen = []; applyChanges({ x: "a" }, { x: "b" }, (...args) => seen.push(args)); return seen; })()', expected: [['x', 'a', 'b']] },
    ],
  },

  /* ── timers ───────────────────────────────────────────────────────── */
  'js-easy4-tick-down': {
    solution: `const countdown = (from, ms, onTick) => {
  const tick = n => {
    if (n < 1) return;
    onTick(n);
    // Each tick schedules the next one; the last schedules nothing.
    if (n > 1) setTimeout(() => tick(n - 1), ms);
  };
  if (from >= 1) setTimeout(() => tick(from), ms);
};`,
    junior: `function countdown(from, ms, onTick) {
  let current = from;
  function step() {
    onTick(current);
    current = current - 1;
    if (current >= 1) {
      setTimeout(step, ms);
    }
  }
  if (current >= 1) {
    setTimeout(step, ms);
  }
}`,
    senior: `const countdown = (from, ms, onTick) => {
  if (from < 1) return;
  setTimeout(() => {
    onTick(from);
    countdown(from - 1, ms, onTick);
  }, ms);
};`,
    hiddenTests: [
      { call: 'new Promise(resolve => { const ticks = []; countdown(5, 5, n => ticks.push(n)); setTimeout(() => resolve([...ticks]), 150); })', expected: [5, 4, 3, 2, 1], async: true },
      { call: 'new Promise(resolve => { const ticks = []; countdown(4, 20, n => ticks.push(n)); setTimeout(() => resolve([...ticks]), 30); })', expected: [4], async: true },
      { call: 'new Promise(resolve => { const ticks = []; countdown(1, 10, n => ticks.push(n)); setTimeout(() => resolve([...ticks]), 60); })', expected: [1], async: true },
    ],
  },
  'js-easy4-remind-later': {
    solution: `const scheduleReminders = (events, now, remind) => {
  let scheduled = 0;
  events.forEach(({ title, at }) => {
    if (at <= now) return; // already started
    // The delay is how long from now, not the event's time itself.
    setTimeout(() => remind(title), at - now);
    scheduled++;
  });
  return scheduled;
};`,
    junior: `const scheduleReminders = (events, now, remind) => {
  let scheduled = 0;
  events.forEach(function (event) {
    if (event.at > now) {
      const delay = event.at - now;
      setTimeout(function () {
        remind(event.title);
      }, delay);
      scheduled = scheduled + 1;
    }
  });
  return scheduled;
};`,
    senior: `const scheduleReminders = (events, now, remind) => {
  const upcoming = events.filter(event => event.at > now);
  upcoming.forEach(({ title, at }) => setTimeout(remind, at - now, title));
  return upcoming.length;
};`,
    hiddenTests: [
      { call: 'new Promise(resolve => { const seen = []; scheduleReminders([{ title: "b", at: 2040 }, { title: "a", at: 2020 }, { title: "c", at: 2070 }], 2000, title => seen.push(title)); setTimeout(() => resolve([...seen]), 55); })', expected: ['a', 'b'], async: true },
      { call: 'new Promise(resolve => { const seen = []; scheduleReminders([{ title: "old", at: 5 }, { title: "new", at: 30 }], 10, title => seen.push(title)); setTimeout(() => resolve([...seen]), 80); })', expected: ['new'], async: true },
      { call: 'scheduleReminders([], 0, () => {})', expected: 0 },
      { call: 'scheduleReminders([{ title: "x", at: 101 }], 100, () => {})', expected: 1 },
    ],
  },

  /* ── JSON ─────────────────────────────────────────────────────────── */
  'js-easy4-public-fields': {
    solution: `const toPublicJson = user => {
  // An array as the second argument is an allow-list of property names.
  return JSON.stringify(user, ["id", "name", "avatar"]);
};`,
    junior: `const toPublicJson = user => {
  const allowed = ["id", "name", "avatar"];
  const publicUser = {};
  for (const field of allowed) {
    if (field in user) {
      publicUser[field] = user[field];
    }
  }
  return JSON.stringify(publicUser);
};`,
    senior: `const PUBLIC_FIELDS = ["id", "name", "avatar"];

const toPublicJson = user => JSON.stringify(user, PUBLIC_FIELDS);`,
    hiddenTests: [
      { call: 'toPublicJson({ avatar: "a.png", name: "Zed", id: 99, role: "admin" })', expected: '{"id":99,"name":"Zed","avatar":"a.png"}' },
      { call: 'JSON.parse(toPublicJson({ id: 3, name: "Mo", avatar: "m.png", token: "t" }))', expected: { id: 3, name: 'Mo', avatar: 'm.png' } },
      { call: 'toPublicJson({ id: 0, name: "", avatar: "" })', expected: '{"id":0,"name":"","avatar":""}' },
      { call: 'typeof toPublicJson({ id: 1, name: "a", avatar: "b" })', expected: 'string' },
    ],
  },

  /* ── fetch and async/await ────────────────────────────────────────── */
  'js-easy4-get-json': {
    solution: `const getJson = async (request, url) => {
  const response = await request(url);
  // fetch resolves for a 404 or a 500 too; ok is what tells them apart.
  if (!response.ok) throw new Error("Request failed: " + response.status);
  return await response.json();
};`,
    junior: `async function getJson(request, url) {
  const response = await request(url);
  if (response.ok === false) {
    const message = "Request failed: " + response.status;
    throw new Error(message);
  }
  const data = await response.json();
  return data;
}`,
    senior: `const getJson = async (request, url) => {
  const response = await request(url);
  if (!response.ok) throw new Error(\`Request failed: \${response.status}\`);
  return response.json();
};`,
    hiddenTests: [
      { call: 'getJson(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: "no" }) }), "/me").catch(error => error.message)', expected: 'Request failed: 401', async: true },
      { call: 'getJson(() => Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) }), "/empty")', expected: null, async: true },
      { call: 'getJson(() => Promise.resolve({ ok: true, status: 200, json: () => new Promise(resolve => setTimeout(() => resolve([1, 2]), 20)) }), "/slow")', expected: [1, 2], async: true },
      { call: '(() => { let parsed = false; return getJson(() => Promise.resolve({ ok: false, status: 404, json: () => { parsed = true; return Promise.resolve({}); } }), "/x").catch(() => parsed); })()', expected: false, async: true },
    ],
  },
  'js-easy4-post-json': {
    solution: `const postJson = async (request, url, data) => {
  const response = await request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // A request body is text, so the data is turned into JSON first.
    body: JSON.stringify(data),
  });
  return response.status;
};`,
    junior: `async function postJson(request, url, data) {
  const headers = { "Content-Type": "application/json" };
  const body = JSON.stringify(data);
  const options = { method: "POST", headers: headers, body: body };
  const response = await request(url, options);
  return response.status;
}`,
    senior: `const JSON_HEADERS = { "Content-Type": "application/json" };

const postJson = async (request, url, data) => {
  const { status } = await request(url, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(data) });
  return status;
};`,
    hiddenTests: [
      { call: '(() => { let body = null; return postJson((url, options) => { body = options.body; return Promise.resolve({ status: 202 }); }, "/q", { a: [1, 2], b: null }).then(status => [status, body]); })()', expected: [202, '{"a":[1,2],"b":null}'], async: true },
      { call: '(() => { let headers = null; return postJson((url, options) => { headers = options.headers; return Promise.resolve({ status: 200 }); }, "/h", {}).then(() => headers); })()', expected: { 'Content-Type': 'application/json' }, async: true },
      { call: 'postJson(() => new Promise(resolve => setTimeout(() => resolve({ status: 503 }), 20)), "/slow", {})', expected: 503, async: true },
      { call: 'postJson(() => Promise.reject(new Error("offline")), "/x", {}).catch(error => error.message)', expected: 'offline', async: true },
    ],
  },
  'js-easy4-spinner-finally': {
    solution: `const withSpinner = async (show, hide, task) => {
  show();
  try {
    // Without await, the try block would end at once and finally would
    // hide the spinner while the task was still running.
    return await task();
  } finally {
    hide();
  }
};`,
    junior: `async function withSpinner(show, hide, task) {
  show();
  let result;
  try {
    result = await task();
  } finally {
    hide();
  }
  return result;
}`,
    senior: `const withSpinner = async (show, hide, task) => {
  show();
  try {
    return await task();
  } finally {
    hide();
  }
};`,
    hiddenTests: [
      { call: '(() => { let hides = 0; return withSpinner(() => {}, () => { hides += 1; }, async () => "x").then(() => hides); })()', expected: 1, async: true },
      { call: '(() => { let hides = 0; return withSpinner(() => {}, () => { hides += 1; }, async () => { throw new Error("no"); }).catch(() => hides); })()', expected: 1, async: true },
      { call: 'withSpinner(() => {}, () => {}, () => Promise.resolve([1, 2]))', expected: [1, 2], async: true },
      { call: '(() => { const log = []; return withSpinner(() => log.push("show"), () => log.push("hide"), () => new Promise((resolve, reject) => setTimeout(() => { log.push("failed"); reject(new Error("late")); }, 20))).catch(error => [error.message, log]); })()', expected: ['late', ['show', 'failed', 'hide']], async: true },
    ],
  },
};
