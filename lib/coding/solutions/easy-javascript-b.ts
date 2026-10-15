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
      { call: 'digitsOnly("١2３4😀5")', expected: '245' },
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
      {"call": "isHexColour(\"#123456\\n\")", "expected": false},
      {"call": "isHexColour(\"\\n#123456\\n\")", "expected": false},
      {"call": "isHexColour(\"#123456\\r\\n\")", "expected": false},
      {"call": "isHexColour(\"#123456 \")", "expected": false},
      {"call": "isHexColour(\"#１２３４５６\")", "expected": false},
      {"call": "isHexColour(\"#abc\")", "expected": false},
      {"call": "isHexColour(\"#123456 \")", "expected": false},
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
      {"call": "hashtags(\"#Dup #Dup #dup\")", "expected": ["#Dup", "#Dup", "#dup"]},
      {"call": "hashtags(\"x#A_9 ##two #café #你好 #١\")", "expected": ["#A_9", "#two", "#caf"]},
      {"call": "hashtags(\"#_ #12\")", "expected": ["#_", "#12"]},
      { call: 'hashtags("#a1_b2 done")', expected: ['#a1_b2'] },
      { call: 'hashtags("ends with #last")', expected: ['#last'] },
      { call: 'hashtags("#Dup and #dup")', expected: ['#Dup', '#dup'] },
      { call: 'hashtags("")', expected: [] },
    ],
  },

  /* ── split ────────────────────────────────────────────────────────── */
  'js-easy3-read-query': {
    solution: `const parseQuery = query => {
  const entries = [];
  for (const pair of query.split("&")) {
    if (pair === "") continue;
    const index = pair.indexOf("=");
    entries.push(index < 0 ? [pair, ""] : [pair.slice(0, index), pair.slice(index + 1)]);
  }
  return Object.fromEntries(entries);
};`,
    junior: `const parseQuery = query => {
  const result = {};
  const pairs = query.split("&");
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (pair === "") continue;
    const index = pair.indexOf("=");
    const key = index < 0 ? pair : pair.slice(0, index);
    const value = index < 0 ? "" : pair.slice(index + 1);
    Object.defineProperty(result, key, {
      value, enumerable: true, configurable: true, writable: true,
    });
  }
  return result;
};`,
    senior: `const parseQuery = query =>
  Object.fromEntries(query.split("&").filter(pair => pair !== "").map(pair => {
    const index = pair.indexOf("=");
    return index < 0 ? [pair, ""] : [pair.slice(0, index), pair.slice(index + 1)];
  }));`,
    hiddenTests: [
      {"call": "parseQuery(\"&&a=1&&=zero&flag&\")", "expected": {"a": "1", "": "zero", "flag": ""}},
      {"call": "parseQuery(\"a=b=c&x==&space= a b &plus=a+b&p=%20&?x=1\")", "expected": {"a": "b=c", "x": "=", "space": " a b ", "plus": "a+b", "p": "%20", "?x": "1"}},
      {"call": "(() => { const out = parseQuery(\"__proto__=first&__proto__=last&constructor=custom\"); return [Object.keys(out).sort(), out[\"__proto__\"], out.constructor, Object.prototype.hasOwnProperty.call(out, \"__proto__\")]; })()", "expected": [["__proto__", "constructor"], "last", "custom", true]},
      {"call": "parseQuery(\"en=cat&cs=dog\")", "expected": {"en": "cat", "cs": "dog"}},
      {"call": "(() => { const first = parseQuery(\"a=1\"); const second = parseQuery(\"a=1\"); return first !== second; })()", "expected": true},
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
    solution: "const withDefaults = (settings, defaults) => {\n  const result = Object.create(null);\n  for (const key in settings) {\n    if (Object.hasOwn(settings, key)) result[key] = settings[key];\n  }\n  for (const key in defaults) {\n    if (Object.hasOwn(defaults, key) && !Object.hasOwn(result, key)) {\n      result[key] = defaults[key];\n    }\n  }\n  return result;\n};",
    junior: "const withDefaults = (settings, defaults) => {\n  const result = Object.create(null);\n  for (const key in settings) {\n    const isOwnSetting = Object.hasOwn(settings, key);\n    if (isOwnSetting) result[key] = settings[key];\n  }\n  for (const key in defaults) {\n    const isOwnDefault = Object.hasOwn(defaults, key);\n    const alreadySet = Object.hasOwn(result, key);\n    if (isOwnDefault && !alreadySet) result[key] = defaults[key];\n  }\n  return result;\n};",
    senior: "const withDefaults = (settings, defaults) => Object.fromEntries([...Object.entries(defaults), ...Object.entries(settings)]);",
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
    senior: "const countTypes = object => {\n  const counts = {};\n  // Match the inherited-key semantics of for...in in this exercise.\n  for (const key in object) {\n    const type = typeof object[key];\n    counts[type] = (counts[type] ?? 0) + 1;\n  }\n  return counts;\n};",
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
    const numerator = item.price * (100 - percent);
    const newPrice = numerator / 100;
    item.price = Math.round(newPrice);
  });
};`,
    senior: `const applyDiscount = (items, percent) => {
  items.forEach(item => {
    item.price = Math.round(item.price * (100 - percent) / 100);
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
  // String membership is exact and case-sensitive.
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
  for (const value of Object.values(form)) {
    const trimmed = value.trim();
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
    junior: "const makeUser = ({ name = \"Guest\", role = \"viewer\", active = true } = {}) => {\n  const user = { name: name, role: role, active: active };\n  return user;\n};",
    senior: `const makeUser = ({ name = "Guest", role = "viewer", active = true } = {}) => ({ name, role, active });`,
    hiddenTests: [
      {"call": "makeUser(Object.freeze({name:0,role:'',active:false}))", "expected": {"name": 0, "role": "", "active": false}, "label": "zero empty string and false are preserved"},
      {"call": "(() => {const options={name:undefined};Object.defineProperty(options,'unused',{enumerable:true,get(){throw new Error('extra field read');}});const out=makeUser(Object.freeze(options));return out.name==='Guest'&&out.role==='viewer'&&out.active===true&&Object.keys(out).sort().join(',')==='active,name,role';})()", "expected": true, "label": "read exactly named fields without enumerating ignored extras or mutating frozen input"},
      {"call": "(() => {const value=Object.freeze({id:1});const o=Object.freeze({name:value,role:null,active:0});const a=makeUser(o),b=makeUser(o);return a!==b&&a!==o&&a.name===value&&a.role===null&&a.active===0;})()", "expected": true, "label": "shallow identity and a fresh exact output on every call"},
      {"call": "makeUser(Object.freeze(Object.create({name:'Inherited',role:'editor',active:false})))", "expected": {"name": "Inherited", "role": "editor", "active": false}, "label": "destructuring reads inherited named data properties"},

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
      {"call": "[Object.is(highest([-0,+0]),+0),Object.is(highest([-0]),-0)]", "expected": [true, true], "label": "Math.max signed-zero semantics"},
      {"call": "(() => {const input=Object.freeze([-9,4,1,-2]);return highest(input)===4&&input.join(',')==='-9,4,1,-2';})()", "expected": true, "label": "frozen caller order is preserved"},
      {"call": "highest(Object.freeze(Array.from({length:10000},(_,i)=>i-10000)))", "expected": -1, "label": "ten thousand negative scores have a negative maximum"},

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
      {"call": "countFiles(Object.freeze({name:'same',children:Object.freeze([Object.freeze({name:'same'}),Object.freeze({name:'same'}),Object.freeze({name:'empty',children:Object.freeze([])})])}))", "expected": 2, "label": "duplicate names are separate file entries in a frozen tree"},
      {"call": "(() => {let e=Object.freeze({name:'leaf'});for(let i=0;i<99;i++)e=Object.freeze({name:'dir',children:Object.freeze([e])});return countFiles(e);})()", "expected": 1, "label": "one hundred nested entries preserve the leaf"},
      {"call": "countFiles(Object.freeze({name:'root',children:Object.freeze(Array.from({length:999},()=>Object.freeze({name:'same'})))}))", "expected": 999, "label": "maximum thousand-entry tree counts every file"},
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
      {"call": "depth(Object.freeze([null,Object.freeze({inside:[[[1]]]}),'[[x]]',Object.freeze([])]))", "expected": 2, "label": "only arrays add depth and opaque objects stay opaque"},
      {"call": "(() => {let a=Object.freeze([]);for(let i=1;i<100;i++)a=Object.freeze([a]);return depth(a);})()", "expected": 100, "label": "one hundred frozen nesting levels"},
      {"call": "depth(Object.freeze(Array(999).fill(null)))", "expected": 1, "label": "maximum array-plus-slot count without inner arrays"},
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
      {"call": "(() => {const c=makeChangeWatcher();return [c(NaN),c(NaN),c(0),c(-0),c(0)];})()", "expected": [true, true, true, false, false], "label": "strict equality differs from Object.is for NaN and signed zero"},
      {"call": "(() => {const c=makeChangeWatcher(),a={x:1},b={x:1};const first=c(a);a.x=2;return [first,c(a),c(b),c(b)];})()", "expected": [true, false, true, false], "label": "object identity is independent of matching or changed contents"},
      {"call": "(() => {const c=makeChangeWatcher(),f=()=>0,s=Symbol('x');return [c(f),c(f),c(s),c(s),c(Symbol('x')),c(1n),c(1),c(undefined)];})()", "expected": [true, false, true, false, true, true, true, true], "label": "opaque functions symbols and BigInts use strict comparison"},
      {"call": "(() => {const c=makeChangeWatcher(),a=Object.freeze(Object.defineProperty({},'unused',{get(){throw Error('inspect');}}));let ok=c(a);for(let i=1;i<1000;i++)ok=ok&&!c(a);return ok;})()", "expected": true, "label": "a thousand repeated opaque inputs are not inspected"},
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
      {"call": "[Object.is(multiplyBy(-1)(0),-0),Object.is(multiplyBy(0)(-1),-0),Object.is(multiplyBy(-0)(-1),+0)]", "expected": [true, true, true], "label": "signed-zero products are not replaced by positive zero"},
      {"call": "multiplyBy(0.1)(0.2)", "expected": 0.020000000000000004, "label": "ordinary unrounded floating-point product"},
      {"call": "(() => {const a=multiplyBy(2),b=multiplyBy(2),c=multiplyBy(-0.5);return a!==b&&a(3)===6&&c(3)===-1.5&&a(4)===8&&b(-2)===-4&&multiplyBy(1000000)(1000000)===1000000000000;})()", "expected": true, "label": "fresh independent stable functions and maximal product"},
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
      {"call": "(() => {const fallback=Object.freeze({id:1});return parseOr('{bad',fallback)===fallback&&parseOr('false',fallback)===false&&parseOr('\"\"',fallback)===''&&Object.is(parseOr('-0',fallback),-0);})()", "expected": true, "label": "exact fallback identity and valid falsy values"},
      {"call": "(() => {const out=parseOr('{\"__proto__\":{\"x\":1},\"a\":1,\"a\":2}',null);return Object.hasOwn(out,'__proto__')&&out.a===2&&out.__proto__.x===1&&Object.getPrototypeOf(out)!==out.__proto__;})()", "expected": true, "label": "duplicate-key and prototype-like-name parsing semantics"},
      {"call": "(() => {const text='['+'0,'.repeat(4998)+'0]';const out=parseOr(text,null);return out.length===4999&&out.every(x=>x===0);})()", "expected": true, "label": "near-maximum input text"},
      {"call": "[parseOr('true false',7),parseOr('[1,]',7),parseOr('/*x*/null',7),parseOr('  null  ',7)]", "expected": [7, 7, 7, null], "label": "syntax errors and valid surrounding whitespace"},
      { call: 'parseOr("null", "x")', expected: null },
      { call: 'parseOr(\'"text"\', "")', expected: 'text' },
      { call: 'parseOr(\'{"a": }\', 7)', expected: 7 },
      { call: 'parseOr("true", false)', expected: true },
    ],
  },
  'js-easy3-pretty-json': {
    solution: `const toFileText = value => {
  // null means no replacer; 2 indents each level by two spaces.
  return JSON.stringify(value, null, 2) + "\\n";
};`,
    junior: `const toFileText = value => {
  const json = JSON.stringify(value, null, 2);
  const withNewline = json + "\\n";
  return withNewline;
};`,
    senior: `const toFileText = value => \`\${JSON.stringify(value, null, 2)}\\n\`;`,
    hiddenTests: [
      {"call": "toFileText({z:'😀',a:'line\\nquote\"',empty:[]})", "expected": "{\n  \"z\": \"😀\",\n  \"a\": \"line\\nquote\\\"\",\n  \"empty\": []\n}\n", "label": "original key order, Unicode and escaping"},
      {"call": "[toFileText(null),toFileText(false),toFileText(0),toFileText('')]", "expected": ["null\n", "false\n", "0\n", "\"\"\n"], "label": "top-level JSON scalar values"},
      {"call": "toFileText(Object.freeze({nested:Object.freeze([Object.freeze({ok:true})])}))", "expected": "{\n  \"nested\": [\n    {\n      \"ok\": true\n    }\n  ]\n}\n", "label": "frozen nested ordinary JSON data"},
      {"call": "(() => {const text=toFileText(Object.freeze(Array(1000).fill(1)));return text.length===5003&&text.startsWith('[\\n  1,')&&text.endsWith('  1\\n]\\n');})()", "expected": true, "label": "large indented array has exactly one final LF"},
      { call: 'toFileText({ a: { b: true } })', expected: '{\n  "a": {\n    "b": true\n  }\n}\n' },
      { call: 'toFileText("hi")', expected: '"hi"\n' },
      { call: 'toFileText(3)', expected: '3\n' },
    ],
  },

  /* ── promises and timers ──────────────────────────────────────────── */
  'js-easy3-list-failures': {
    solution: "const failureMessages = promises => {\n  // For these native-promise inputs, report every outcome instead of rejecting early.\n  return Promise.allSettled(promises).then(results =>\n    results.filter(result => result.status === \"rejected\").map(result => result.reason.message));\n};",
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
      { call: "(() => {const a=Promise.reject(new Error(\"\")),b=Promise.reject(new Error(\"same\")),c=Promise.reject(new Error(\"same\"));a.catch(()=>{});b.catch(()=>{});c.catch(()=>{});return failureMessages(Object.freeze([Promise.resolve(new Error(\"fulfilled\")),a,b,c]));})()", expected: ["", "same", "same"], async: true },
      { call: "(() => {const error=new Error(\"before\"),bad=Promise.reject(error);bad.catch(()=>{});let finished=false;const slow=new Promise(done=>setTimeout(()=>{finished=true;error.message=\"after\";done(1);},20));const inputs=[bad,slow],result=failureMessages(inputs);inputs.length=0;return result.then(messages=>[finished,messages]);})()", expected: [true, ["after"]], async: true },
      { call: "(() => {const error=Object.freeze(new Error(\"repeated\")),bad=Promise.reject(error);bad.catch(()=>{});return failureMessages(Object.freeze(Array(1000).fill(bad))).then(messages=>[messages.length,messages[0],messages[999]]);})()", expected: [1000, "repeated", "repeated"], async: true },
      { call: "(() => {const a=failureMessages([]),b=failureMessages([]);return Promise.all([a,b]).then(([x,y])=>[a instanceof Promise,x.length,y.length,x!==y]);})()", expected: [true, 0, 0, true], async: true },

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
      { call: "(async()=>{const obj=Object.freeze({}),fn=()=>1,sym=Symbol('x');const kept=[];for(const value of [obj,fn,sym,NaN,-0])kept.push(Object.is(await withTimeout(Promise.resolve(value),20,'unused'),value));const reason=Object.freeze({code:1}),bad=Promise.reject(reason);bad.catch(()=>{});return [kept,await withTimeout(bad,20,0).then(()=>false,error=>error===reason)];})()", expected: [[true, true, true, true, true], true], async: true },
      { call: "(async()=>{let calls=0;const fn=()=>{calls++;},sym=Symbol('fallback'),obj=Object.freeze({});const out=[];for(const fallback of [fn,sym,obj,undefined,-0])out.push(Object.is(await withTimeout(new Promise(()=>{}),0,fallback),fallback));return [out,calls];})()", expected: [[true, true, true, true, true], 0], async: true },
      { call: "(async()=>{const input=Promise.resolve('ready'),output=withTimeout(input,0,'late');let settled=false;output.then(()=>{settled=true;});const immediate=settled;return [output instanceof Promise,output!==input,immediate,await output];})()", expected: [true, true, false, "ready"], async: true },
      { call: "(async()=>{let complete=false;const input=new Promise(done=>setTimeout(()=>{complete=true;done('late');},30));const output=withTimeout(input,0,'fallback');const first=await output;await new Promise(done=>setTimeout(done,50));return [first,await output,complete];})()", expected: ["fallback", "fallback", true], async: true },

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
      {"call": "(() => {const input=Object.freeze([-0,+0,-0,2,-2]);const out=sortNumbers(input);return out!==input&&out[0]===-2&&Object.is(out[1],-0)&&Object.is(out[2],+0)&&Object.is(out[3],-0)&&out[4]===2&&Object.is(input[0],-0);})()", "expected": true, "label": "stable signed zeros and frozen original order"},
      {"call": "(() => {const input=[];const a=sortNumbers(input),b=sortNumbers(input);return a!==input&&a!==b&&a.length===0;})()", "expected": true, "label": "each empty result is fresh"},
      {"call": "(() => {const a=sortNumbers(Object.freeze(Array.from({length:1000},(_,i)=>999-i)));return a.length===1000&&a.every((x,i)=>x===i);})()", "expected": true, "label": "thousand-number reverse ordering"},
      {"call": "sortNumbers(Object.freeze([1000000,-1000000,0.125,0.125,-0.5]))", "expected": [-1000000, -0.5, 0.125, 0.125, 1000000], "label": "finite endpoints, duplicate fractions and multiplicity"},
      { call: 'sortNumbers([25, 100, 3])', expected: [3, 25, 100] },
      { call: 'sortNumbers([-10, -9, -100])', expected: [-100, -10, -9] },
      { call: 'sortNumbers([2, 2, 1])', expected: [1, 2, 2] },
      { call: 'sortNumbers([1.5, 1.25])', expected: [1.25, 1.5] },
      { call: 'sortNumbers([9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2])', expected: [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    ],
  },
};
