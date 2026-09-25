// Server-only reference solutions and hidden tests for lib/coding/tasks/easy-javascript-a.ts.
// Never import from client code. The hidden tests aim at the shortcut each
// visible set leaves open: a hard-coded answer, a changed input, a value or a
// shape the visible tests never used, and the case the technique exists for.

import type { CodingSolution } from '../types';

export const EASY_JAVASCRIPT_A_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── flat ─────────────────────────────────────────────────────────── */
  'js-easy2-flatten-once': {
    solution: `const flattenOnce = list => {
  // flat() defaults to a depth of 1 and returns a new array.
  return list.flat();
};`,
    junior: `const flattenOnce = list => {
  const flattened = list.flat(1);
  return flattened;
};`,
    senior: `const flattenOnce = list => list.flat();`,
    hiddenTests: [
      { call: 'flattenOnce([])', expected: [] },
      { call: 'flattenOnce([[1, 2], 3, [[4]]])', expected: [1, 2, 3, [4]] },
      { call: 'flattenOnce([["x"], "y"])', expected: ['x', 'y'] },
    ],
  },
  'js-easy2-all-tags': {
    solution: `const allTags = posts => {
  // map gives one array of tags per post; flat joins them end to end.
  return posts.map(post => post.tags).flat();
};`,
    junior: `const allTags = posts => {
  const tagLists = posts.map(post => post.tags);
  const tags = tagLists.flat();
  return tags;
};`,
    senior: `// flatMap maps and flattens one level in a single pass.
const allTags = posts => posts.flatMap(({ tags }) => tags);`,
    hiddenTests: [
      { call: 'allTags([{ title: "Nested", tags: ["a", "b", "c"] }])', expected: ['a', 'b', 'c'] },
      { call: 'allTags([{ title: "One", tags: ["solo"] }, { title: "Two", tags: [] }, { title: "Three", tags: ["x", "y"] }])', expected: ['solo', 'x', 'y'] },
      { call: '(() => { const posts = [{ title: "A", tags: ["t"] }]; allTags(posts); return posts; })()', expected: [{ title: 'A', tags: ['t'] }] },
    ],
  },
  'js-easy2-menu-items': {
    solution: `const menuItems = menu => {
  // Two levels of brackets sit around each dish: its section and its group.
  return menu.flat(2);
};`,
    junior: `const menuItems = menu => {
  const groups = menu.flat();
  const dishes = groups.flat();
  return dishes;
};`,
    senior: `const menuItems = menu => menu.flat(2);`,
    hiddenTests: [
      { call: 'menuItems([[["a"], ["b"]], [["c"], ["d", "e"]]])', expected: ['a', 'b', 'c', 'd', 'e'] },
      { call: 'menuItems([[["only"]]])', expected: ['only'] },
      { call: '(() => { const menu = [[["x"]]]; menuItems(menu); return menu; })()', expected: [[['x']]] },
    ],
  },

  /* ── for...in ─────────────────────────────────────────────────────── */
  'js-easy2-keys-with-value': {
    solution: `const keysWithValue = (object, value) => {
  const keys = [];
  for (const key in object) {
    // === keeps "1" and 1 apart.
    if (object[key] === value) keys.push(key);
  }
  return keys;
};`,
    junior: `const keysWithValue = (object, value) => {
  const matching = [];
  for (const key in object) {
    const current = object[key];
    if (current === value) {
      matching.push(key);
    }
  }
  return matching;
};`,
    senior: `const keysWithValue = (object, value) => {
  const keys = [];
  // for...in also walks inherited keys; the task is about the object's own.
  for (const key in object) if (Object.hasOwn(object, key) && object[key] === value) keys.push(key);
  return keys;
};`,
    hiddenTests: [
      { call: 'keysWithValue({ x: true, y: false, z: true }, true)', expected: ['x', 'z'] },
      { call: 'keysWithValue({ a: null, b: undefined }, null)', expected: ['a'] },
      { call: 'keysWithValue({ one: 0, two: 0, three: 0 }, 0)', expected: ['one', 'two', 'three'] },
    ],
  },
  'js-easy2-invert-object': {
    solution: `const invert = object => {
  const inverted = {};
  for (const key in object) {
    // The value becomes the key; a later key with the same value overwrites.
    inverted[object[key]] = key;
  }
  return inverted;
};`,
    junior: `const invert = object => {
  const result = {};
  for (const key in object) {
    const value = object[key];
    result[value] = key;
  }
  return result;
};`,
    senior: `const invert = object => {
  const inverted = {};
  for (const key in object) if (Object.hasOwn(object, key)) inverted[object[key]] = key;
  return inverted;
};`,
    hiddenTests: [
      { call: 'invert({ one: 1, two: 2 })', expected: { 1: 'one', 2: 'two' } },
      { call: 'invert({ k: "v" })', expected: { v: 'k' } },
      { call: 'invert({ a: "z", b: "y", c: "z" })', expected: { z: 'c', y: 'b' } },
    ],
  },
  'js-easy2-own-keys-only': {
    solution: `const ownKeys = object => {
  const keys = [];
  for (const key in object) {
    // for...in visits inherited keys too; hasOwn keeps the object's own.
    if (Object.hasOwn(object, key)) keys.push(key);
  }
  return keys;
};`,
    junior: `const ownKeys = object => {
  const result = [];
  for (const key in object) {
    const isOwn = Object.prototype.hasOwnProperty.call(object, key);
    if (isOwn) {
      result.push(key);
    }
  }
  return result;
};`,
    senior: `const ownKeys = object => {
  const keys = [];
  for (const key in object) if (Object.hasOwn(object, key)) keys.push(key);
  return keys;
};`,
    hiddenTests: [
      { call: 'ownKeys(Object.assign(Object.create({ a: 1, b: 2 }), { c: 3, d: 4 }))', expected: ['c', 'd'] },
      { call: 'ownKeys({ only: undefined })', expected: ['only'] },
      { call: 'ownKeys(Object.assign(Object.create(Object.create({ deep: 1 })), { top: 1 }))', expected: ['top'] },
    ],
  },

  /* ── promises ─────────────────────────────────────────────────────── */
  'js-easy2-double-later': {
    solution: `const doubleLater = promise => {
  // then returns a new promise; a rejection skips the callback and carries on.
  return promise.then(value => value * 2);
};`,
    junior: `const doubleLater = promise => {
  const doubled = promise.then(value => {
    const result = value * 2;
    return result;
  });
  return doubled;
};`,
    senior: `const doubleLater = async promise => (await promise) * 2;`,
    hiddenTests: [
      { call: 'doubleLater(Promise.resolve(21))', expected: 42, async: true },
      { call: 'doubleLater(doubleLater(Promise.resolve(3)))', expected: 12, async: true },
      { call: 'doubleLater(new Promise(resolve => setTimeout(() => resolve(5), 10)))', expected: 10, async: true },
      { call: '(() => { const failing = Promise.reject(new Error("timeout")); failing.catch(() => {}); return doubleLater(failing).then(() => "resolved", error => error.message); })()', expected: 'timeout', async: true },
    ],
  },
  'js-easy2-fallback-on-failure': {
    solution: `const withFallback = (promise, fallback) => {
  // catch runs only on a rejection, so a resolved 0 or undefined passes through.
  return promise.catch(() => fallback);
};`,
    junior: `const withFallback = (promise, fallback) => {
  return promise.catch(error => {
    return fallback;
  });
};`,
    senior: `const withFallback = async (promise, fallback) => {
  try {
    return await promise;
  } catch {
    return fallback;
  }
};`,
    hiddenTests: [
      { call: 'withFallback(Promise.resolve([1, 2]), [])', expected: [1, 2], async: true },
      { call: '(() => { const failing = Promise.reject("plain string"); failing.catch(() => {}); return withFallback(failing, "used"); })()', expected: 'used', async: true },
      { call: 'withFallback(new Promise(resolve => setTimeout(() => resolve("late"), 10)), "early")', expected: 'late', async: true },
    ],
  },
  'js-easy2-total-when-ready': {
    solution: `const totalWhenReady = prices =>
  // Promise.all waits for every price and rejects as soon as one fails.
  Promise.all(prices).then(values => values.reduce((sum, value) => sum + value, 0));`,
    junior: `const totalWhenReady = prices => {
  return Promise.all(prices).then(values => {
    let total = 0;
    for (const value of values) {
      total = total + value;
    }
    return total;
  });
};`,
    senior: `const totalWhenReady = async prices => {
  const values = await Promise.all(prices);
  return values.reduce((sum, value) => sum + value, 0);
};`,
    hiddenTests: [
      { call: 'totalWhenReady([Promise.resolve(-4), Promise.resolve(4)])', expected: 0, async: true },
      { call: 'totalWhenReady([Promise.resolve(10)])', expected: 10, async: true },
      { call: 'totalWhenReady([new Promise(resolve => setTimeout(() => resolve(2), 20)), new Promise(resolve => setTimeout(() => resolve(3), 5))])', expected: 5, async: true },
    ],
  },

  /* ── timers ───────────────────────────────────────────────────────── */
  'js-easy2-cancel-a-timer': {
    solution: `const schedule = (task, ms) => {
  const id = setTimeout(task, ms);
  // The returned function closes over this id, so it cancels this timer only.
  return () => clearTimeout(id);
};`,
    junior: `const schedule = (task, ms) => {
  const timerId = setTimeout(() => {
    task();
  }, ms);
  const cancel = () => {
    clearTimeout(timerId);
  };
  return cancel;
};`,
    senior: `// Clearing a timer that already fired is a no-op, so the id needs no guard.
const schedule = (task, ms) => {
  const id = setTimeout(task, ms);
  return () => clearTimeout(id);
};`,
    hiddenTests: [
      { call: 'new Promise(done => { const log = []; schedule(() => log.push("slow"), 30); schedule(() => log.push("fast"), 10); setTimeout(() => done(log), 70); })', expected: ['fast', 'slow'], async: true },
      { call: '(() => { let runs = 0; const cancel = schedule(() => { runs += 1; }, 0); return new Promise(done => setTimeout(done, 30)).then(() => { cancel(); return runs; }); })()', expected: 1, async: true },
      { call: 'new Promise(done => { const log = []; schedule(() => log.push("a"), 20); const cancelB = schedule(() => log.push("b"), 20); cancelB(); setTimeout(() => done(log), 60); })', expected: ['a'], async: true },
      { call: 'typeof schedule(() => {}, 5)', expected: 'function' },
    ],
  },
  'js-easy2-repeat-then-stop': {
    solution: `const repeat = (task, times, ms) => {
  if (times <= 0) return;
  let calls = 0;
  const id = setInterval(() => {
    calls += 1;
    task(calls);
    // Clear on the last call, or the interval keeps firing for ever.
    if (calls === times) clearInterval(id);
  }, ms);
};`,
    junior: `const repeat = (task, times, ms) => {
  if (times === 0) {
    return;
  }
  let callNumber = 0;
  const intervalId = setInterval(() => {
    callNumber = callNumber + 1;
    task(callNumber);
    if (callNumber === times) {
      clearInterval(intervalId);
    }
  }, ms);
};`,
    senior: `const repeat = (task, times, ms) => {
  if (times < 1) return;
  let calls = 0;
  const id = setInterval(() => {
    task(++calls);
    if (calls === times) clearInterval(id);
  }, ms);
};`,
    hiddenTests: [
      { call: 'new Promise(done => { const log = []; repeat(n => log.push(n), 4, 5); setTimeout(() => done(log), 150); })', expected: [1, 2, 3, 4], async: true },
      { call: 'new Promise(done => { let calls = 0; repeat(() => { calls += 1; }, 2, 5); setTimeout(() => done(calls), 120); })', expected: 2, async: true },
      { call: 'new Promise(done => { const log = []; repeat(n => log.push("a" + n), 2, 5); repeat(n => log.push("b" + n), 1, 5); setTimeout(() => done(log.length), 120); })', expected: 3, async: true },
    ],
  },
  'js-easy2-fire-in-delay-order': {
    solution: `const inDelayOrder = jobs => new Promise(resolve => {
  const fired = [];
  // With no jobs no timer would ever resolve the promise, so answer now.
  if (jobs.length === 0) return resolve(fired);
  for (const { name, ms } of jobs) {
    setTimeout(() => {
      fired.push(name);
      if (fired.length === jobs.length) resolve(fired);
    }, ms);
  }
});`,
    junior: `const inDelayOrder = jobs => {
  return new Promise(resolve => {
    const fired = [];
    if (jobs.length === 0) {
      resolve(fired);
      return;
    }
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      setTimeout(() => {
        fired.push(job.name);
        if (fired.length === jobs.length) {
          resolve(fired);
        }
      }, job.ms);
    }
  });
};`,
    senior: `const inDelayOrder = async jobs => {
  const fired = [];
  await Promise.all(jobs.map(({ name, ms }) => new Promise(done => setTimeout(() => done(fired.push(name)), ms))));
  return fired;
};`,
    hiddenTests: [
      { call: 'inDelayOrder([{ name: "x", ms: 40 }, { name: "y", ms: 20 }, { name: "z", ms: 0 }])', expected: ['z', 'y', 'x'], async: true },
      { call: 'inDelayOrder([{ name: "solo", ms: 15 }])', expected: ['solo'], async: true },
      { call: 'inDelayOrder([{ name: "b", ms: 25 }, { name: "a", ms: 25 }, { name: "c", ms: 5 }])', expected: ['c', 'b', 'a'], async: true },
    ],
  },

  /* ── callbacks ────────────────────────────────────────────────────── */
  'js-easy2-call-n-times': {
    solution: `const times = (n, callback) => {
  const results = [];
  for (let index = 0; index < n; index += 1) {
    results.push(callback(index));
  }
  return results;
};`,
    junior: `const times = (n, callback) => {
  const results = [];
  for (let index = 0; index < n; index++) {
    const value = callback(index);
    results.push(value);
  }
  return results;
};`,
    senior: `// Array.from calls the mapper once per slot, with the index second.
const times = (n, callback) => Array.from({ length: n }, (_, index) => callback(index));`,
    hiddenTests: [
      { call: 'times(5, i => i % 2 === 0)', expected: [true, false, true, false, true] },
      { call: 'times(1, i => [i])', expected: [[0]] },
      { call: 'times(3, i => "#" + (i + 1))', expected: ['#1', '#2', '#3'] },
    ],
  },
  'js-easy2-error-first-callback': {
    solution: `const safeDivide = (a, b, callback) => {
  if (b === 0) {
    callback(new Error("Cannot divide by zero"));
    // Return here, or the success call below would run as well.
    return;
  }
  callback(null, a / b);
};`,
    junior: `const safeDivide = (a, b, callback) => {
  if (b === 0) {
    const error = new Error("Cannot divide by zero");
    callback(error);
  } else {
    const result = a / b;
    callback(null, result);
  }
};`,
    senior: `const safeDivide = (a, b, callback) => {
  if (b === 0) return void callback(new Error("Cannot divide by zero"));
  callback(null, a / b);
};`,
    hiddenTests: [
      { call: '(() => { let out; safeDivide(7, 2, (error, value) => { out = value; }); return out; })()', expected: 3.5 },
      { call: '(() => { let out; safeDivide(-9, 3, (error, value) => { out = [error, value]; }); return out; })()', expected: [null, -3] },
      { call: '(() => { let calls = 0; safeDivide(1, 0, () => { calls += 1; }); return calls; })()', expected: 1 },
      { call: '[safeDivide(4, 2, () => "ignored"), safeDivide(4, 0, () => "ignored")]', expected: [undefined, undefined] },
    ],
  },
  'js-easy2-after-n-calls': {
    solution: `const after = (count, done) => {
  let calls = 0;
  return () => {
    calls += 1;
    // === rather than >=, so done fires on the count-th call only.
    if (calls === count) done();
  };
};`,
    junior: `const after = (count, done) => {
  let callsSoFar = 0;
  function counted() {
    callsSoFar = callsSoFar + 1;
    if (callsSoFar === count) {
      done();
    }
  }
  return counted;
};`,
    senior: `const after = (count, done) => {
  let remaining = count;
  return () => {
    if (--remaining === 0) done();
  };
};`,
    hiddenTests: [
      { call: '(() => { let fired = 0; const finish = after(4, () => { fired += 1; }); finish(); finish(); finish(); return fired; })()', expected: 0 },
      { call: '(() => { const log = []; const finish = after(2, () => log.push("done")); finish(); log.push("one"); finish(); log.push("two"); return log; })()', expected: ['one', 'done', 'two'] },
      { call: '(() => { let args; const finish = after(1, (...received) => { args = received; }); finish("ignored"); return args; })()', expected: [] },
    ],
  },

  /* ── higher-order functions ───────────────────────────────────────── */
  'js-easy2-negate-a-test': {
    solution: `const negate = test =>
  // Rest collects every argument; spread hands them on in the same order.
  (...args) => !test(...args);`,
    junior: `const negate = test => {
  const flipped = (...args) => {
    const result = test(...args);
    if (result) {
      return false;
    }
    return true;
  };
  return flipped;
};`,
    senior: `// A regular function keeps this for tests that are methods.
const negate = test => function (...args) {
  return !test.apply(this, args);
};`,
    hiddenTests: [
      { call: '["", "a", null, "b"].filter(negate(Boolean))', expected: ['', null] },
      { call: 'negate(() => undefined)()', expected: true },
      { call: 'negate((a, b, c) => a + b + c === 6)(1, 2, 3)', expected: false },
      { call: 'typeof negate(() => true)', expected: 'function' },
    ],
  },
  'js-easy2-sort-by-key': {
    solution: `const sortBy = (list, pick) => {
  // Copy first: sort changes the array it is called on.
  return [...list].sort((a, b) => pick(a) - pick(b));
};`,
    junior: `const sortBy = (list, pick) => {
  const copy = list.slice();
  copy.sort((first, second) => {
    const firstKey = pick(first);
    const secondKey = pick(second);
    return firstKey - secondKey;
  });
  return copy;
};`,
    senior: `// pick runs once per item, not once per comparison.
const sortBy = (list, pick) =>
  list
    .map((item, index) => ({ item, key: pick(item), index }))
    .sort((a, b) => a.key - b.key || a.index - b.index)
    .map(({ item }) => item);`,
    hiddenTests: [
      { call: 'sortBy([], n => n)', expected: [] },
      { call: 'sortBy([-1, -5, 3], n => Math.abs(n))', expected: [-1, 3, -5] },
      { call: 'sortBy([{ t: "x", p: 5 }, { t: "y", p: -2 }], o => o.p).map(o => o.t)', expected: ['y', 'x'] },
    ],
  },
  'js-easy2-count-where': {
    solution: `const countWhere = (list, test) => {
  let count = 0;
  for (const item of list) {
    // Any truthy result counts, not only true.
    if (test(item)) count += 1;
  }
  return count;
};`,
    junior: `const countWhere = (list, test) => {
  let count = 0;
  for (const item of list) {
    const passed = test(item);
    if (passed) {
      count = count + 1;
    }
  }
  return count;
};`,
    senior: `const countWhere = (list, test) => list.reduce((count, item) => (test(item) ? count + 1 : count), 0);`,
    hiddenTests: [
      { call: 'countWhere([1, 2, 3], () => false)', expected: 0 },
      { call: 'countWhere([1, 2, 3, 4, 5, 6], n => n % 3 === 0)', expected: 2 },
      { call: 'countWhere([{ done: true }, { done: false }, { done: true }], task => task.done)', expected: 2 },
    ],
  },

  /* ── recursion ────────────────────────────────────────────────────── */
  'js-easy2-factorial': {
    solution: `const factorial = n => {
  // The base case comes first: without it the calls never stop.
  if (n === 0) return 1;
  return n * factorial(n - 1);
};`,
    junior: `function factorial(n) {
  if (n === 0) {
    return 1;
  }
  const smaller = factorial(n - 1);
  return n * smaller;
}`,
    senior: `const factorial = n => (n <= 1 ? 1 : n * factorial(n - 1));`,
    hiddenTests: [
      { call: 'factorial(10)', expected: 3628800 },
      { call: 'factorial(2)', expected: 2 },
      { call: 'factorial(7)', expected: 5040 },
    ],
  },
  'js-easy2-power': {
    solution: `const power = (base, exponent) => {
  if (exponent === 0) return 1;
  // Each call takes one factor off the exponent until none is left.
  return base * power(base, exponent - 1);
};`,
    junior: `function power(base, exponent) {
  if (exponent === 0) {
    return 1;
  }
  const smaller = power(base, exponent - 1);
  return base * smaller;
}`,
    senior: `// Halving the exponent needs about log2(exponent) calls instead of exponent.
const power = (base, exponent) => {
  if (exponent === 0) return 1;
  const half = power(base, Math.floor(exponent / 2));
  return exponent % 2 === 0 ? half * half : half * half * base;
};`,
    hiddenTests: [
      { call: 'power(5, 4)', expected: 625 },
      { call: 'power(0, 0)', expected: 1 },
      { call: 'power(1.5, 2)', expected: 2.25 },
      { call: 'power(-3, 2)', expected: 9 },
    ],
  },
  'js-easy2-list-to-array': {
    solution: `const toArray = node => {
  // null ends the chain; every other node puts its value in front of the rest.
  if (node === null) return [];
  return [node.value, ...toArray(node.next)];
};`,
    junior: `function toArray(node) {
  if (node === null) {
    return [];
  }
  const rest = toArray(node.next);
  return [node.value].concat(rest);
}`,
    senior: `// Carry the values down instead of copying the tail on every return.
const toArray = (node, values = []) => {
  if (!node) return values;
  values.push(node.value);
  return toArray(node.next, values);
};`,
    hiddenTests: [
      { call: 'toArray({ value: null, next: { value: false, next: null } })', expected: [null, false] },
      { call: '(() => { let node = null; for (let n = 5; n >= 1; n--) node = { value: n, next: node }; return toArray(node); })()', expected: [1, 2, 3, 4, 5] },
      { call: 'toArray({ value: [1], next: { value: { x: 1 }, next: null } })', expected: [[1], { x: 1 }] },
    ],
  },

  /* ── nested loops ─────────────────────────────────────────────────── */
  'js-easy2-every-pair': {
    solution: `const allPairs = list => {
  const pairs = [];
  for (let i = 0; i < list.length; i++) {
    // Start one past i: no item pairs with itself, and no pair appears twice.
    for (let j = i + 1; j < list.length; j++) {
      pairs.push([list[i], list[j]]);
    }
  }
  return pairs;
};`,
    junior: `const allPairs = list => {
  const pairs = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const first = list[i];
      const second = list[j];
      pairs.push([first, second]);
    }
  }
  return pairs;
};`,
    senior: `const allPairs = list => list.flatMap((first, i) => list.slice(i + 1).map(second => [first, second]));`,
    hiddenTests: [
      { call: 'allPairs([1, 2, 3, 4]).length', expected: 6 },
      { call: 'allPairs(["x", "y", "z", "w"])', expected: [['x', 'y'], ['x', 'z'], ['x', 'w'], ['y', 'z'], ['y', 'w'], ['z', 'w']] },
      { call: 'allPairs([true, false])', expected: [[true, false]] },
    ],
  },
  'js-easy2-find-in-grid': {
    solution: `const findInGrid = (grid, target) => {
  for (let row = 0; row < grid.length; row++) {
    // Each row uses its own length: rows can differ.
    for (let column = 0; column < grid[row].length; column++) {
      if (grid[row][column] === target) return [row, column];
    }
  }
  return null;
};`,
    junior: `const findInGrid = (grid, target) => {
  for (let row = 0; row < grid.length; row++) {
    const cells = grid[row];
    for (let column = 0; column < cells.length; column++) {
      const cell = cells[column];
      if (cell === target) {
        return [row, column];
      }
    }
  }
  return null;
};`,
    senior: `const findInGrid = (grid, target) => {
  for (const [row, cells] of grid.entries()) {
    const column = cells.indexOf(target);
    if (column !== -1) return [row, column];
  }
  return null;
};`,
    hiddenTests: [
      { call: 'findInGrid([], 1)', expected: null },
      { call: 'findInGrid([[0, 1, 2], [3, 4], [5]], 5)', expected: [2, 0] },
      { call: 'findInGrid([["x"], ["y", "target"]], "target")', expected: [1, 1] },
    ],
  },

  /* ── two pointers ─────────────────────────────────────────────────── */
  'js-easy2-sorted-squares': {
    solution: `const sortedSquares = sorted => {
  const result = new Array(sorted.length);
  let left = 0;
  let right = sorted.length - 1;
  // Fill from the back: the larger end square is the biggest one left.
  for (let write = sorted.length - 1; write >= 0; write--) {
    const leftSquare = sorted[left] * sorted[left];
    const rightSquare = sorted[right] * sorted[right];
    if (leftSquare > rightSquare) {
      result[write] = leftSquare;
      left++;
    } else {
      result[write] = rightSquare;
      right--;
    }
  }
  return result;
};`,
    junior: `const sortedSquares = sorted => {
  const result = [];
  let left = 0;
  let right = sorted.length - 1;
  while (left <= right) {
    const leftSquare = sorted[left] * sorted[left];
    const rightSquare = sorted[right] * sorted[right];
    if (leftSquare > rightSquare) {
      result.unshift(leftSquare);
      left = left + 1;
    } else {
      result.unshift(rightSquare);
      right = right - 1;
    }
  }
  return result;
};`,
    senior: `const sortedSquares = sorted => {
  const result = Array(sorted.length);
  for (let left = 0, right = sorted.length - 1, write = right; left <= right; write--) {
    result[write] = Math.abs(sorted[left]) > Math.abs(sorted[right]) ? sorted[left++] ** 2 : sorted[right--] ** 2;
  }
  return result;
};`,
    hiddenTests: [
      { call: 'sortedSquares([0])', expected: [0] },
      { call: 'sortedSquares([-5, 5])', expected: [25, 25] },
      { call: 'sortedSquares([-10, -2, 1, 1, 4])', expected: [1, 1, 4, 16, 100] },
      { call: '(() => { const input = [-2, 1]; sortedSquares(input); return input; })()', expected: [-2, 1] },
    ],
  },
  'js-easy2-reverse-vowels': {
    solution: `const reverseVowels = text => {
  const isVowel = char => "aeiouAEIOU".includes(char);
  // Strings cannot change in place, so swap inside an array of characters.
  const chars = text.split("");
  let left = 0;
  let right = chars.length - 1;
  while (left < right) {
    if (!isVowel(chars[left])) {
      left++;
    } else if (!isVowel(chars[right])) {
      right--;
    } else {
      [chars[left], chars[right]] = [chars[right], chars[left]];
      left++;
      right--;
    }
  }
  return chars.join("");
};`,
    junior: `const reverseVowels = text => {
  const vowels = "aeiouAEIOU";
  const chars = text.split("");
  let left = 0;
  let right = chars.length - 1;
  while (left < right) {
    while (left < right && !vowels.includes(chars[left])) {
      left = left + 1;
    }
    while (left < right && !vowels.includes(chars[right])) {
      right = right - 1;
    }
    const temporary = chars[left];
    chars[left] = chars[right];
    chars[right] = temporary;
    left = left + 1;
    right = right - 1;
  }
  return chars.join("");
};`,
    senior: `const VOWELS = new Set("aeiouAEIOU");
const reverseVowels = text => {
  const chars = [...text];
  for (let left = 0, right = chars.length - 1; left < right; ) {
    if (!VOWELS.has(chars[left])) left++;
    else if (!VOWELS.has(chars[right])) right--;
    else [chars[left++], chars[right--]] = [chars[right], chars[left]];
  }
  return chars.join("");
};`,
    hiddenTests: [
      { call: 'reverseVowels("leetcode")', expected: 'leotcede' },
      { call: 'reverseVowels("a")', expected: 'a' },
      { call: 'reverseVowels("Hello World")', expected: 'Hollo Werld' },
      { call: 'reverseVowels("AEIOU")', expected: 'UOIEA' },
    ],
  },
  'js-easy2-outside-in': {
    solution: `const outsideIn = list => {
  const result = [];
  let left = 0;
  let right = list.length - 1;
  while (left <= right) {
    result.push(list[left]);
    // When the pointers meet, the middle item goes in once.
    if (left !== right) result.push(list[right]);
    left += 1;
    right -= 1;
  }
  return result;
};`,
    junior: `const outsideIn = list => {
  const result = [];
  let left = 0;
  let right = list.length - 1;
  while (left <= right) {
    const fromLeft = list[left];
    result.push(fromLeft);
    if (left < right) {
      const fromRight = list[right];
      result.push(fromRight);
    }
    left = left + 1;
    right = right - 1;
  }
  return result;
};`,
    senior: `const outsideIn = list => {
  const result = [];
  for (let left = 0, right = list.length - 1; left <= right; left++, right--) {
    result.push(list[left]);
    if (left < right) result.push(list[right]);
  }
  return result;
};`,
    hiddenTests: [
      { call: 'outsideIn([1, 2])', expected: [1, 2] },
      { call: 'outsideIn([10, 20, 30, 40, 50, 60])', expected: [10, 60, 20, 50, 30, 40] },
      { call: 'outsideIn([0, 0, 1])', expected: [0, 1, 0] },
    ],
  },

  /* ── slice ────────────────────────────────────────────────────────── */
  'js-easy2-page-of-results': {
    solution: `const page = (items, pageNumber, pageSize) => {
  // Every earlier page holds pageSize items, and pages count from 1.
  const start = (pageNumber - 1) * pageSize;
  return items.slice(start, start + pageSize);
};`,
    junior: `const page = (items, pageNumber, pageSize) => {
  const pagesBefore = pageNumber - 1;
  const start = pagesBefore * pageSize;
  const end = start + pageSize;
  const pageItems = items.slice(start, end);
  return pageItems;
};`,
    senior: `const page = (items, pageNumber, pageSize) => items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);`,
    hiddenTests: [
      { call: 'page([], 1, 10)', expected: [] },
      { call: 'page([1, 2, 3, 4, 5, 6, 7], 2, 3)', expected: [4, 5, 6] },
      { call: 'page(["only"], 1, 5)', expected: ['only'] },
    ],
  },

  /* ── async and await ──────────────────────────────────────────────── */
  'js-easy2-await-both': {
    solution: `const addBoth = async (first, second) => {
  const a = await first;
  const b = await second;
  // No try: a rejection escapes, which rejects the promise addBoth returns.
  return a + b;
};`,
    junior: `const addBoth = async (first, second) => {
  const firstValue = await first;
  const secondValue = await second;
  const total = firstValue + secondValue;
  return total;
};`,
    senior: `// Promise.all waits for both at once and handles a rejection from either.
const addBoth = async (first, second) => {
  const [a, b] = await Promise.all([first, second]);
  return a + b;
};`,
    hiddenTests: [
      { call: 'addBoth(Promise.resolve(0.5), Promise.resolve(0.25))', expected: 0.75, async: true },
      { call: 'addBoth(new Promise(resolve => setTimeout(() => resolve(1), 15)), new Promise(resolve => setTimeout(() => resolve(2), 5)))', expected: 3, async: true },
      { call: '(() => { const failing = Promise.reject(new Error("first failed")); failing.catch(() => {}); return addBoth(failing, Promise.resolve(2)).then(() => "resolved", error => error.message); })()', expected: 'first failed', async: true },
      { call: 'addBoth(Promise.resolve(1), Promise.resolve(1)) instanceof Promise', expected: true },
    ],
  },
  'js-easy2-await-or-default': {
    solution: `const loadOr = async (load, fallback) => {
  try {
    // await inside try: a rejection and a synchronous throw both land in catch.
    return await load();
  } catch {
    return fallback;
  }
};`,
    junior: `const loadOr = async (load, fallback) => {
  let result;
  try {
    result = await load();
  } catch (error) {
    result = fallback;
  }
  return result;
};`,
    senior: `// Calling load inside the executor turns a synchronous throw into a rejection.
const loadOr = (load, fallback) => new Promise(resolve => resolve(load())).catch(() => fallback);`,
    hiddenTests: [
      { call: 'loadOr(() => new Promise(resolve => setTimeout(() => resolve([1, 2]), 10)), [])', expected: [1, 2], async: true },
      { call: 'loadOr(() => new Promise((resolve, reject) => setTimeout(() => reject(new Error("late failure")), 10)), "fallback")', expected: 'fallback', async: true },
      { call: 'loadOr(() => Promise.resolve(null), "default")', expected: null, async: true },
    ],
  },

  /* ── closures ─────────────────────────────────────────────────────── */
  'js-easy2-running-average': {
    solution: `const makeAverager = () => {
  // Each call to makeAverager gets its own total and count.
  let total = 0;
  let count = 0;
  return value => {
    total += value;
    count += 1;
    return total / count;
  };
};`,
    junior: `const makeAverager = () => {
  let total = 0;
  let count = 0;
  function average(value) {
    total = total + value;
    count = count + 1;
    const result = total / count;
    return result;
  }
  return average;
};`,
    senior: `const makeAverager = () => {
  let total = 0;
  let count = 0;
  return value => (total += value) / ++count;
};`,
    hiddenTests: [
      { call: '(() => { const avg = makeAverager(); avg(-5); return avg(5); })()', expected: 0 },
      { call: '(() => { const avg = makeAverager(); return [avg(1), avg(2), avg(6)]; })()', expected: [1, 1.5, 3] },
      { call: '(() => { const avg = makeAverager(); return [avg(2.5), avg(3.5)]; })()', expected: [2.5, 3] },
    ],
  },
};
