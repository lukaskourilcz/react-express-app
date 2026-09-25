// Server-only reference solutions and hidden tests for lib/coding/tasks/easy-javascript-b.ts.
// Never import from client code. The hidden tests aim at the shortcut each
// visible set leaves open: a hard-coded answer, a changed input, a value or a
// shape the visible tests never used, and the case the technique exists for.

import type { CodingSolution } from '../types';

export const EASY_JAVASCRIPT_B_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── regular expressions ──────────────────────────────────────────── */
  'js-easy3-digits-only': {
    solution: `const digitsOnly = text => {
  // The pattern matches one non-digit; the g flag removes every one of them.
  return text.replace(/\\D/g, "");
};`,
    junior: `const digitsOnly = text => {
  const nonDigit = /\\D/g;
  const digits = text.replace(nonDigit, "");
  return digits;
};`,
    senior: `const digitsOnly = text => text.replaceAll(/\\D/g, "");`,
    hiddenTests: [
      { call: 'digitsOnly("(555) 010-9999")', expected: '5550109999' },
      { call: 'digitsOnly("1 2 3 4 5 6 7 8 9 0")', expected: '1234567890' },
      { call: 'digitsOnly("x9")', expected: '9' },
    ],
  },
  'js-easy3-hex-colour': {
    solution: `const isHexColour = text => {
  // ^ and $ pin the pattern to the whole text; i accepts capital letters.
  return /^#[0-9a-f]{6}$/i.test(text);
};`,
    junior: `const isHexColour = text => {
  const pattern = /^#[0-9a-fA-F]{6}$/;
  const matches = pattern.test(text);
  return matches;
};`,
    senior: `const HEX_COLOUR = /^#[\\da-f]{6}$/i;

const isHexColour = text => HEX_COLOUR.test(text);`,
    hiddenTests: [
      { call: 'isHexColour(" #123456")', expected: false },
      { call: 'isHexColour("#AbCdEf")', expected: true },
      { call: 'isHexColour("color: #123456")', expected: false },
      { call: 'isHexColour("#000000")', expected: true },
    ],
  },
  'js-easy3-find-hashtags': {
    solution: `const hashtags = text => {
  // match with the g flag gives every match, or null when there is none.
  return text.match(/#\\w+/g) ?? [];
};`,
    junior: `const hashtags = text => {
  const found = text.match(/#\\w+/g);
  if (found === null) {
    return [];
  }
  return found;
};`,
    senior: `const hashtags = text => [...text.matchAll(/#\\w+/g)].map(([tag]) => tag);`,
    hiddenTests: [
      { call: 'hashtags("#a1_b2 done")', expected: ['#a1_b2'] },
      { call: 'hashtags("ends with #last")', expected: ['#last'] },
      { call: 'hashtags("#Dup and #dup")', expected: ['#Dup', '#dup'] },
      { call: 'hashtags("")', expected: [] },
    ],
  },

  /* ── split ────────────────────────────────────────────────────────── */
  'js-easy3-read-query': {
    solution: `const parseQuery = query => {
  const result = {};
  // "".split("&") gives [""], so an empty query stops here.
  if (query === "") return result;
  for (const pair of query.split("&")) {
    const [key, value] = pair.split("=");
    result[key] = value ?? "";
  }
  return result;
};`,
    junior: `const parseQuery = query => {
  const result = {};
  if (query.length === 0) {
    return result;
  }
  const pairs = query.split("&");
  for (let i = 0; i < pairs.length; i++) {
    const parts = pairs[i].split("=");
    const key = parts[0];
    let value = parts[1];
    if (value === undefined) {
      value = "";
    }
    result[key] = value;
  }
  return result;
};`,
    senior: `const parseQuery = query =>
  query === ""
    ? {}
    : Object.fromEntries(query.split("&").map(pair => {
        const [key, value = ""] = pair.split("=");
        return [key, value];
      }));`,
    hiddenTests: [
      { call: 'parseQuery("x=1&y=&z=3")', expected: { x: '1', y: '', z: '3' } },
      { call: 'parseQuery("limit=10")', expected: { limit: '10' } },
      { call: 'parseQuery("a=1&b=2&a=3")', expected: { a: '3', b: '2' } },
    ],
  },

  /* ── concat and join ──────────────────────────────────────────────── */
  'js-easy3-add-to-playlist': {
    solution: `const addSongs = (playlist, songs) => {
  // concat copies: an array argument adds its items, a single value adds itself.
  return playlist.concat(songs);
};`,
    junior: `const addSongs = (playlist, songs) => {
  let added = [];
  if (Array.isArray(songs)) {
    added = songs;
  } else {
    added = [songs];
  }
  return playlist.concat(added);
};`,
    senior: `const addSongs = (playlist, songs) => playlist.concat(songs);`,
    hiddenTests: [
      { call: 'addSongs([], "Solo")', expected: ['Solo'] },
      { call: 'addSongs(["a", "b"], ["c"])', expected: ['a', 'b', 'c'] },
      { call: '(() => { const list = ["a"]; return addSongs(list, []) !== list; })()', expected: true },
    ],
  },
  'js-easy3-list-in-words': {
    solution: `const inWords = items => {
  // join("") gives "" for no items and the item itself for one.
  if (items.length < 2) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
};`,
    junior: `const inWords = items => {
  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0];
  }
  const allButLast = items.slice(0, items.length - 1);
  const last = items[items.length - 1];
  return allButLast.join(", ") + " and " + last;
};`,
    senior: `const inWords = items => {
  if (items.length < 2) return items.join("");
  return \`\${items.slice(0, -1).join(", ")} and \${items.at(-1)}\`;
};`,
    hiddenTests: [
      { call: 'inWords(["x", "y"])', expected: 'x and y' },
      { call: 'inWords(["one", "two", "three", "four", "five"])', expected: 'one, two, three, four and five' },
      { call: '(() => { const items = ["a", "b", "c"]; inWords(items); return items; })()', expected: ['a', 'b', 'c'] },
    ],
  },

  /* ── for...in ─────────────────────────────────────────────────────── */
  'js-easy3-fill-defaults': {
    solution: `const withDefaults = (settings, defaults) => {
  const result = { ...settings };
  for (const key in defaults) {
    // in asks whether the key exists, so false, 0 and "" are kept.
    if (!(key in result)) result[key] = defaults[key];
  }
  return result;
};`,
    junior: `const withDefaults = (settings, defaults) => {
  const result = {};
  for (const key in settings) {
    result[key] = settings[key];
  }
  for (const key in defaults) {
    const alreadySet = key in result;
    if (!alreadySet) {
      result[key] = defaults[key];
    }
  }
  return result;
};`,
    senior: `const withDefaults = (settings, defaults) => {
  const result = { ...settings };
  for (const key in defaults) {
    if (Object.hasOwn(defaults, key) && !Object.hasOwn(result, key)) result[key] = defaults[key];
  }
  return result;
};`,
    hiddenTests: [
      { call: 'withDefaults({ name: "" }, { name: "anon" })', expected: { name: '' } },
      { call: 'withDefaults({ a: null }, { a: 1, b: 2 })', expected: { a: null, b: 2 } },
      { call: '(() => { const defaults = { a: 1 }; withDefaults({ b: 2 }, defaults); return defaults; })()', expected: { a: 1 } },
    ],
  },
  'js-easy3-count-types': {
    solution: `const countTypes = object => {
  const counts = {};
  for (const key in object) {
    const type = typeof object[key];
    // A type seen for the first time starts from 0.
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
};`,
    junior: `const countTypes = object => {
  const counts = {};
  for (const key in object) {
    const value = object[key];
    const type = typeof value;
    if (counts[type] === undefined) {
      counts[type] = 0;
    }
    counts[type] = counts[type] + 1;
  }
  return counts;
};`,
    senior: `const countTypes = object => {
  const counts = {};
  for (const key in object) {
    if (!Object.hasOwn(object, key)) continue;
    const type = typeof object[key];
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
};`,
    hiddenTests: [
      { call: 'countTypes({ a: 1, b: 2, c: 3 })', expected: { number: 3 } },
      { call: 'countTypes({ s: "", n: 0, b: false })', expected: { string: 1, number: 1, boolean: 1 } },
      { call: 'countTypes({ nested: { x: 1 }, list: [] })', expected: { object: 2 } },
    ],
  },

  /* ── nested loops ─────────────────────────────────────────────────── */
  'js-easy3-column-totals': {
    solution: `const columnTotals = grid => {
  const totals = [];
  // An empty grid has no first row to count the columns from.
  if (grid.length === 0) return totals;
  for (let column = 0; column < grid[0].length; column++) {
    let sum = 0;
    for (let row = 0; row < grid.length; row++) sum += grid[row][column];
    totals.push(sum);
  }
  return totals;
};`,
    junior: `const columnTotals = grid => {
  const totals = [];
  if (grid.length === 0) {
    return totals;
  }
  const columnCount = grid[0].length;
  for (let column = 0; column < columnCount; column++) {
    let sum = 0;
    for (let row = 0; row < grid.length; row++) {
      const value = grid[row][column];
      sum = sum + value;
    }
    totals.push(sum);
  }
  return totals;
};`,
    senior: `const columnTotals = grid => {
  const totals = [];
  for (const row of grid) {
    for (let column = 0; column < row.length; column++) {
      totals[column] = (totals[column] ?? 0) + row[column];
    }
  }
  return totals;
};`,
    hiddenTests: [
      { call: 'columnTotals([[1, 1, 1], [2, 2, 2], [3, 3, 3]])', expected: [6, 6, 6] },
      { call: 'columnTotals([[10, 0], [0, 10], [5, 5]])', expected: [15, 15] },
      { call: '(() => { const grid = [[1, 2], [3, 4]]; columnTotals(grid); return grid; })()', expected: [[1, 2], [3, 4]] },
    ],
  },
  'js-easy3-every-combination': {
    solution: `const combinations = (sizes, colours) => {
  const labels = [];
  for (const size of sizes) {
    // The inner loop runs in full for every size.
    for (const colour of colours) labels.push(size + " " + colour);
  }
  return labels;
};`,
    junior: `const combinations = (sizes, colours) => {
  const labels = [];
  for (let i = 0; i < sizes.length; i++) {
    for (let j = 0; j < colours.length; j++) {
      const label = sizes[i] + " " + colours[j];
      labels.push(label);
    }
  }
  return labels;
};`,
    senior: `const combinations = (sizes, colours) =>
  sizes.flatMap(size => colours.map(colour => \`\${size} \${colour}\`));`,
    hiddenTests: [
      { call: 'combinations(["XS", "S"], ["a", "b", "c"])', expected: ['XS a', 'XS b', 'XS c', 'S a', 'S b', 'S c'] },
      { call: 'combinations(["1"], ["x", "y"])', expected: ['1 x', '1 y'] },
      { call: 'combinations([], [])', expected: [] },
    ],
  },

  /* ── flat ─────────────────────────────────────────────────────────── */
  'js-easy3-pick-list': {
    solution: `const pickList = order => {
  // flatMap joins the per-item arrays; an empty one adds nothing.
  return order.flatMap(item => Array(item.qty).fill(item.name));
};`,
    junior: `const pickList = order => {
  const lists = order.map(item => {
    const copies = [];
    for (let i = 0; i < item.qty; i++) {
      copies.push(item.name);
    }
    return copies;
  });
  return lists.flat();
};`,
    senior: `const pickList = order => order.flatMap(({ name, qty }) => Array.from({ length: qty }, () => name));`,
    hiddenTests: [
      { call: 'pickList([{ name: "n", qty: 1 }, { name: "m", qty: 2 }, { name: "o", qty: 0 }])', expected: ['n', 'm', 'm'] },
      { call: 'pickList([{ name: "a", qty: 0 }])', expected: [] },
      { call: '(() => { const order = [{ name: "x", qty: 2 }]; pickList(order); return order; })()', expected: [{ name: 'x', qty: 2 }] },
    ],
  },

  /* ── forEach ──────────────────────────────────────────────────────── */
  'js-easy3-discount-in-place': {
    solution: `const applyDiscount = (items, percent) => {
  // forEach is for side effects: each price changes where it is.
  items.forEach(item => {
    item.price = Math.round(item.price * (100 - percent) / 100);
  });
};`,
    junior: `const applyDiscount = (items, percent) => {
  items.forEach(item => {
    const keep = (100 - percent) / 100;
    const newPrice = item.price * keep;
    item.price = Math.round(newPrice);
  });
};`,
    senior: `const applyDiscount = (items, percent) => {
  const factor = 1 - percent / 100;
  items.forEach(item => {
    item.price = Math.round(item.price * factor);
  });
};`,
    hiddenTests: [
      { call: '(() => { const items = [{ name: "a", price: 1000 }]; applyDiscount(items, 25); return items[0].price; })()', expected: 750 },
      { call: '(() => { const items = [{ name: "b", price: 100 }]; applyDiscount(items, 100); return items[0].price; })()', expected: 0 },
      { call: '(() => { const items = [{ name: "c", price: 100, qty: 3 }]; applyDiscount(items, 33); return items; })()', expected: [{ name: 'c', price: 67, qty: 3 }] },
    ],
  },

  /* ── sort ─────────────────────────────────────────────────────────── */
  'js-easy3-newest-first': {
    solution: `const newestFirst = posts => {
  // sort changes the array it is called on, so sort a copy.
  return [...posts].sort((a, b) => {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return 0;
  });
};`,
    junior: `const newestFirst = posts => {
  const copy = posts.slice();
  copy.sort((first, second) => {
    if (first.date === second.date) {
      return 0;
    }
    if (first.date > second.date) {
      return -1;
    }
    return 1;
  });
  return copy;
};`,
    senior: `const newestFirst = posts => posts.toSorted((a, b) => b.date.localeCompare(a.date));`,
    hiddenTests: [
      { call: 'newestFirst([{ title: "only", date: "2026-01-01" }])', expected: [{ title: 'only', date: '2026-01-01' }] },
      { call: 'newestFirst([{ title: "sep", date: "2026-09-30" }, { title: "oct", date: "2026-10-01" }]).map(post => post.title)', expected: ['oct', 'sep'] },
      { call: 'newestFirst([{ title: "p", date: "2026-02-02" }, { title: "q", date: "2026-02-02" }, { title: "r", date: "2026-02-02" }]).map(post => post.title)', expected: ['p', 'q', 'r'] },
      { call: 'newestFirst(Array.from({ length: 12 }, (_, i) => ({ title: String(i), date: "2026-01-" + (i + 10) }))).map(post => post.title)', expected: ['11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', '0'] },
    ],
  },

  /* ── includes, indexOf, findIndex, every ──────────────────────────── */
  'js-easy3-hide-banned': {
    solution: `const hideBanned = (words, banned) => {
  // includes compares strictly, so the match is exact.
  return words.map(word => (banned.includes(word) ? "***" : word));
};`,
    junior: `const hideBanned = (words, banned) => {
  const result = [];
  for (const word of words) {
    if (banned.includes(word)) {
      result.push("***");
    } else {
      result.push(word);
    }
  }
  return result;
};`,
    senior: `const hideBanned = (words, banned) => {
  const blocked = new Set(banned);
  return words.map(word => (blocked.has(word) ? "***" : word));
};`,
    hiddenTests: [
      { call: 'hideBanned(["no", "no", "yes"], ["no"])', expected: ['***', '***', 'yes'] },
      { call: 'hideBanned(["calm"], ["angry", "loud"])', expected: ['calm'] },
      { call: '(() => { const words = ["bad"]; hideBanned(words, ["bad"]); return words; })()', expected: ['bad'] },
    ],
  },
  'js-easy3-positions-of': {
    solution: `const positionsOf = (list, value) => {
  const positions = [];
  let index = list.indexOf(value);
  while (index !== -1) {
    positions.push(index);
    // The second argument starts the next search just after this match.
    index = list.indexOf(value, index + 1);
  }
  return positions;
};`,
    junior: `const positionsOf = (list, value) => {
  const positions = [];
  let start = 0;
  while (true) {
    const found = list.indexOf(value, start);
    if (found === -1) {
      break;
    }
    positions.push(found);
    start = found + 1;
  }
  return positions;
};`,
    senior: `const positionsOf = (list, value) => {
  const positions = [];
  for (let index = list.indexOf(value); index !== -1; index = list.indexOf(value, index + 1)) positions.push(index);
  return positions;
};`,
    hiddenTests: [
      { call: 'positionsOf([5, 1, 5], 5)', expected: [0, 2] },
      { call: 'positionsOf(["x"], "x")', expected: [0] },
      { call: 'positionsOf([0, false, 0, ""], 0)', expected: [0, 2] },
    ],
  },
  'js-easy3-first-over-limit': {
    solution: `const firstOverLimit = (readings, limit) => {
  // > rather than >=: a reading equal to the limit is not over it.
  return readings.findIndex(reading => reading > limit);
};`,
    junior: `const firstOverLimit = (readings, limit) => {
  for (let i = 0; i < readings.length; i++) {
    if (readings[i] > limit) {
      return i;
    }
  }
  return -1;
};`,
    senior: `const firstOverLimit = (readings, limit) => readings.findIndex(reading => reading > limit);`,
    hiddenTests: [
      { call: 'firstOverLimit([-5, -1, 0], -2)', expected: 1 },
      { call: 'firstOverLimit([5, 6, 7], 6)', expected: 2 },
      { call: 'firstOverLimit([100], 99)', expected: 0 },
    ],
  },
  'js-easy3-form-complete': {
    solution: `const isComplete = form => {
  // every is true for an empty list, so a form with no fields passes.
  return Object.values(form).every(value => value.trim() !== "");
};`,
    junior: `const isComplete = form => {
  for (const key in form) {
    const trimmed = form[key].trim();
    if (trimmed === "") {
      return false;
    }
  }
  return true;
};`,
    senior: `const isComplete = form => Object.values(form).every(value => value.trim().length > 0);`,
    hiddenTests: [
      { call: 'isComplete({ a: "1", b: "2", c: "" })', expected: false },
      { call: 'isComplete({ only: "yes" })', expected: true },
      { call: 'isComplete({ first: " ", second: "filled" })', expected: false },
    ],
  },

  /* ── destructuring and spread ─────────────────────────────────────── */
  'js-easy3-options-with-defaults': {
    solution: `// A default applies only when its option is missing or undefined, and
// = {} lets the function be called with no argument at all.
const makeUser = ({ name = "Guest", role = "viewer", active = true } = {}) => {
  return { name, role, active };
};`,
    junior: `const makeUser = (options = {}) => {
  const { name = "Guest", role = "viewer", active = true } = options;
  const user = { name: name, role: role, active: active };
  return user;
};`,
    senior: `const makeUser = ({ name = "Guest", role = "viewer", active = true } = {}) => ({ name, role, active });`,
    hiddenTests: [
      { call: 'makeUser({})', expected: { name: 'Guest', role: 'viewer', active: true } },
      { call: 'makeUser({ name: "Lin", role: "owner", active: true })', expected: { name: 'Lin', role: 'owner', active: true } },
      { call: 'makeUser({ extra: 1, role: "" })', expected: { name: 'Guest', role: '', active: true } },
    ],
  },
  'js-easy3-highest-score': {
    solution: `const highest = scores => {
  // Math.max() with no arguments is -Infinity, so answer an empty array first.
  if (scores.length === 0) return null;
  return Math.max(...scores);
};`,
    junior: `const highest = scores => {
  if (scores.length === 0) {
    return null;
  }
  const top = Math.max(...scores);
  return top;
};`,
    senior: `const highest = scores => (scores.length ? Math.max(...scores) : null);`,
    hiddenTests: [
      { call: 'highest([0, -1])', expected: 0 },
      { call: 'highest([1.5, 1.25])', expected: 1.5 },
      { call: 'highest([100, 3, 100])', expected: 100 },
    ],
  },

  /* ── recursion ────────────────────────────────────────────────────── */
  'js-easy3-count-files': {
    solution: `const countFiles = entry => {
  // Base case: a file has no children and counts once.
  if (!entry.children) return 1;
  let total = 0;
  for (const child of entry.children) total += countFiles(child);
  return total;
};`,
    junior: `const countFiles = entry => {
  const isFile = entry.children === undefined;
  if (isFile) {
    return 1;
  }
  let total = 0;
  for (const child of entry.children) {
    const inside = countFiles(child);
    total = total + inside;
  }
  return total;
};`,
    senior: `const countFiles = entry =>
  Array.isArray(entry.children) ? entry.children.reduce((total, child) => total + countFiles(child), 0) : 1;`,
    hiddenTests: [
      { call: 'countFiles({ name: "a", children: [{ name: "b", children: [{ name: "c", children: [{ name: "deep.txt" }] }] }] })', expected: 1 },
      { call: 'countFiles({ name: "root", children: [{ name: "1" }, { name: "d", children: [{ name: "2" }, { name: "3" }, { name: "e", children: [{ name: "4" }] }] }] })', expected: 4 },
      { call: 'countFiles({ name: "mixed", children: [{ name: "empty", children: [] }, { name: "readme.md" }] })', expected: 1 },
    ],
  },
  'js-easy3-nesting-depth': {
    solution: `const depth = list => {
  let deepest = 0;
  for (const item of list) {
    // Only inner arrays go deeper; plain values add nothing.
    if (Array.isArray(item)) deepest = Math.max(deepest, depth(item));
  }
  return 1 + deepest;
};`,
    junior: `const depth = list => {
  let deepest = 0;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (Array.isArray(item)) {
      const inner = depth(item);
      if (inner > deepest) {
        deepest = inner;
      }
    }
  }
  return deepest + 1;
};`,
    senior: `const depth = list => 1 + Math.max(0, ...list.filter(Array.isArray).map(item => depth(item)));`,
    hiddenTests: [
      { call: 'depth([[[[]]]])', expected: 4 },
      { call: 'depth(["a", ["b"]])', expected: 2 },
      { call: 'depth([1, [2], [3, [4, [5]]]])', expected: 4 },
      { call: 'depth([[[1]], [2]])', expected: 3 },
    ],
  },

  /* ── closures and higher-order functions ──────────────────────────── */
  'js-easy3-changed-since-last': {
    solution: `const makeChangeWatcher = () => {
  // A flag, not the value, says whether any call has happened yet.
  let seenAny = false;
  let previous;
  return value => {
    const isChange = !seenAny || value !== previous;
    seenAny = true;
    previous = value;
    return isChange;
  };
};`,
    junior: `const makeChangeWatcher = () => {
  let firstCall = true;
  let previous = undefined;
  return value => {
    let result = false;
    if (firstCall) {
      result = true;
    } else if (value !== previous) {
      result = true;
    }
    firstCall = false;
    previous = value;
    return result;
  };
};`,
    senior: `const makeChangeWatcher = () => {
  const NOTHING_YET = Symbol("nothing yet");
  let previous = NOTHING_YET;
  return value => {
    const isChange = value !== previous;
    previous = value;
    return isChange;
  };
};`,
    hiddenTests: [
      { call: '(() => { const changed = makeChangeWatcher(); return [changed(null), changed(undefined), changed(null)]; })()', expected: [true, true, true] },
      { call: '(() => { const changed = makeChangeWatcher(); return [changed(3), changed(3), changed(3), changed(4)]; })()', expected: [true, false, false, true] },
      { call: '(() => { const a = makeChangeWatcher(); const b = makeChangeWatcher(); return [a(1), b(2), a(1), b(3)]; })()', expected: [true, true, false, true] },
    ],
  },
  'js-easy3-multiply-by': {
    solution: `const multiplyBy = factor => {
  // The returned function closes over factor and can read it later.
  return n => n * factor;
};`,
    junior: `const multiplyBy = factor => {
  const multiply = function (number) {
    const result = number * factor;
    return result;
  };
  return multiply;
};`,
    senior: `const multiplyBy = factor => n => n * factor;`,
    hiddenTests: [
      { call: 'multiplyBy(-1)(4)', expected: -4 },
      { call: '[10, 20].map(multiplyBy(0.5))', expected: [5, 10] },
      { call: 'multiplyBy(2)(multiplyBy(3)(1))', expected: 6 },
    ],
  },

  /* ── JSON ─────────────────────────────────────────────────────────── */
  'js-easy3-parse-or-fallback': {
    solution: `const parseOr = (text, fallback) => {
  try {
    return JSON.parse(text);
  } catch {
    // JSON.parse throws on anything that is not valid JSON.
    return fallback;
  }
};`,
    junior: `const parseOr = (text, fallback) => {
  let result;
  try {
    result = JSON.parse(text);
  } catch (error) {
    result = fallback;
  }
  return result;
};`,
    senior: `const parseOr = (text, fallback) => {
  try { return JSON.parse(text); } catch { return fallback; }
};`,
    hiddenTests: [
      { call: 'parseOr("null", "x")', expected: null },
      { call: 'parseOr(\'"text"\', "")', expected: 'text' },
      { call: 'parseOr(\'{"a": }\', 7)', expected: 7 },
      { call: 'parseOr("true", false)', expected: true },
    ],
  },
  'js-easy3-pretty-json': {
    solution: `const toFileText = value => {
  // null keeps every property; 2 indents each level by two spaces.
  return JSON.stringify(value, null, 2) + "\\n";
};`,
    junior: `const toFileText = value => {
  const json = JSON.stringify(value, null, 2);
  const withNewline = json + "\\n";
  return withNewline;
};`,
    senior: `const toFileText = value => \`\${JSON.stringify(value, null, 2)}\\n\`;`,
    hiddenTests: [
      { call: 'toFileText({ a: { b: true } })', expected: '{\n  "a": {\n    "b": true\n  }\n}\n' },
      { call: 'toFileText("hi")', expected: '"hi"\n' },
      { call: 'toFileText(3)', expected: '3\n' },
    ],
  },

  /* ── promises and timers ──────────────────────────────────────────── */
  'js-easy3-list-failures': {
    solution: `const failureMessages = promises => {
  // allSettled never rejects: it reports how every promise ended.
  return Promise.allSettled(promises).then(results =>
    results.filter(result => result.status === "rejected").map(result => result.reason.message));
};`,
    junior: `const failureMessages = promises => {
  return Promise.allSettled(promises).then(results => {
    const messages = [];
    for (const result of results) {
      if (result.status === "rejected") {
        messages.push(result.reason.message);
      }
    }
    return messages;
  });
};`,
    senior: `const failureMessages = async promises => {
  const results = await Promise.allSettled(promises);
  return results.filter(({ status }) => status === "rejected").map(({ reason }) => reason.message);
};`,
    hiddenTests: [
      { call: '(() => { const one = Promise.reject(new Error("one")); const two = Promise.reject(new Error("two")); one.catch(() => {}); two.catch(() => {}); return failureMessages([one, two]); })()', expected: ['one', 'two'], async: true },
      { call: '(() => { const bad = Promise.reject(new Error("bad")); bad.catch(() => {}); return failureMessages([new Promise(resolve => setTimeout(() => resolve("slow"), 15)), bad]); })()', expected: ['bad'], async: true },
      { call: '(() => { const late = new Promise((resolve, reject) => setTimeout(() => reject(new Error("late")), 10)); late.catch(() => {}); return failureMessages([Promise.resolve(1), late, Promise.resolve(2)]); })()', expected: ['late'], async: true },
    ],
  },
  'js-easy3-give-up-after': {
    solution: `const withTimeout = (promise, ms, fallback) => {
  const timeout = new Promise(resolve => {
    setTimeout(() => resolve(fallback), ms);
  });
  // race settles with whichever promise settles first.
  return Promise.race([promise, timeout]);
};`,
    junior: `const withTimeout = (promise, ms, fallback) => {
  const timeout = new Promise(resolve => {
    setTimeout(() => {
      resolve(fallback);
    }, ms);
  });
  const winner = Promise.race([promise, timeout]);
  return winner;
};`,
    senior: `const withTimeout = (promise, ms, fallback) =>
  Promise.race([promise, new Promise(resolve => setTimeout(resolve, ms, fallback))]);`,
    hiddenTests: [
      { call: 'withTimeout(new Promise(() => {}), 10, 0)', expected: 0, async: true },
      { call: 'withTimeout(Promise.resolve(0), 20, 99)', expected: 0, async: true },
      { call: '(() => { const late = new Promise((resolve, reject) => setTimeout(() => reject(new Error("late")), 50)); late.catch(() => {}); return withTimeout(late, 10, "fallback"); })()', expected: 'fallback', async: true },
    ],
  },

  /* ── async/await ──────────────────────────────────────────────────── */
  'js-easy3-cache-or-load': {
    solution: `const getValue = async (cache, key, load) => {
  // async wraps this plain value in a promise as well.
  if (key in cache) return cache[key];
  const value = await load(key);
  cache[key] = value;
  return value;
};`,
    junior: `const getValue = async (cache, key, load) => {
  const isCached = key in cache;
  if (isCached) {
    const cached = cache[key];
    return cached;
  }
  const loaded = await load(key);
  cache[key] = loaded;
  return loaded;
};`,
    senior: `const getValue = async (cache, key, load) => {
  if (Object.hasOwn(cache, key)) return cache[key];
  return (cache[key] = await load(key));
};`,
    hiddenTests: [
      { call: '(() => { const cache = {}; return getValue(cache, "k", () => Promise.reject(new Error("offline"))).catch(error => [error.message, "k" in cache]); })()', expected: ['offline', false], async: true },
      { call: 'getValue({}, "n", () => Promise.resolve(null))', expected: null, async: true },
      { call: 'getValue({ a: "cached" }, "a", () => Promise.resolve("loaded"))', expected: 'cached', async: true },
    ],
  },
  'js-easy3-user-then-posts': {
    solution: `const loadProfile = async (loadUser, loadPosts) => {
  const user = await loadUser();
  // This call needs user.id, so it waits for the line above.
  const posts = await loadPosts(user.id);
  return { name: user.name, postCount: posts.length };
};`,
    junior: `const loadProfile = async (loadUser, loadPosts) => {
  const user = await loadUser();
  const userId = user.id;
  const posts = await loadPosts(userId);
  const profile = { name: user.name, postCount: posts.length };
  return profile;
};`,
    senior: `const loadProfile = async (loadUser, loadPosts) => {
  const { id, name } = await loadUser();
  const { length: postCount } = await loadPosts(id);
  return { name, postCount };
};`,
    hiddenTests: [
      { call: 'loadProfile(() => Promise.resolve({ id: 2, name: "Bo" }), () => Promise.reject(new Error("posts down"))).catch(error => error.message)', expected: 'posts down', async: true },
      { call: '(() => { let asked = 0; return loadProfile(() => Promise.reject(new Error("x")), () => { asked += 1; return Promise.resolve([]); }).catch(() => asked); })()', expected: 0, async: true },
      { call: 'loadProfile(() => Promise.resolve({ id: 9, name: "Nia" }), id => Promise.resolve(Array(id).fill("post")))', expected: { name: 'Nia', postCount: 9 }, async: true },
    ],
  },

  /* ── sort, as numbers ─────────────────────────────────────────────── */
  'js-easy3-sort-numbers': {
    solution: `const sortNumbers = numbers => {
  // Without a compare function, sort would compare the numbers as text.
  return [...numbers].sort((a, b) => a - b);
};`,
    junior: `const sortNumbers = numbers => {
  const copy = numbers.slice();
  copy.sort(function (a, b) {
    return a - b;
  });
  return copy;
};`,
    senior: `const sortNumbers = numbers => numbers.toSorted((a, b) => a - b);`,
    hiddenTests: [
      { call: 'sortNumbers([25, 100, 3])', expected: [3, 25, 100] },
      { call: 'sortNumbers([-10, -9, -100])', expected: [-100, -10, -9] },
      { call: 'sortNumbers([2, 2, 1])', expected: [1, 2, 2] },
      { call: 'sortNumbers([1.5, 1.25])', expected: [1.25, 1.5] },
      { call: 'sortNumbers([9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2])', expected: [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    ],
  },
};
