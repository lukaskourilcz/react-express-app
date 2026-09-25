// The Easy band of the JavaScript track, second wave (#226).
//
// The first wave closed every JavaScript gap in the technique-coverage matrix,
// so this one works from the thinnest rows instead. Recursion, nested loops,
// for...in, flat and timers each sat at exactly three Easy challenges and get
// one or two more. Promises and async/await, which the Hard challenges lean
// on, get two each. The rest covers techniques the Coding home lists with no
// Easy JavaScript challenge, or with one: regular expressions, JSON, concat,
// join, forEach, sort, includes, indexOf, findIndex, every, destructuring
// defaults and spread into a call.
//
// Same rules as the first wave: one technique per challenge (two focus tags at
// most), ten minutes or less, and a starter that fails its own checks. The
// first focus tag names the documentation page that ends the hint ladder.
// Solutions live in `../solutions/easy-javascript-b.ts`, and `EASY_BAND` in
// `../catalog.ts` lists this file. English only: there is no Czech overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';

export const EASY_JAVASCRIPT_B_TASKS: CodingTaskSource[] = [
  /* ── regular expressions ──────────────────────────────────────────── */
  {
    id: 'js-easy3-digits-only',
    track: 'javascript',
    topic: 'javascript',
    level: 2,
    tier: 1,
    focus: ['regex'],
    title: 'Keep only the digits',
    prompt: 'Write `digitsOnly(text)`, returning the text with every character that is not a digit removed, using `replace` with a regular expression. `digitsOnly("+420 777-123 456")` gives `"420777123456"`. Text with no digits gives an empty string.',
    starter: `const digitsOnly = text => {

};

// Scratch pad. Change this and press Run.
console.log(digitsOnly("+420 777-123 456"));
`,
    skeleton: `const digitsOnly = text => {
  return text.replace(/* a pattern for one non-digit, with the g flag */, "");
};`,
    hints: ['`\\D` matches one character that is not a digit. Without the `g` flag, `replace` changes only the first match.'],
    approach: [
      'Write a pattern that matches a single non-digit: `/\\D/`.',
      'Add the `g` flag, so `replace` removes every match and not only the first.',
      'Replace each match with an empty string and return the result.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'digitsOnly("+420 777-123 456")', expected: '420777123456' },
      { call: 'digitsOnly("a1b2c3")', expected: '123' },
      { call: 'digitsOnly("2026")', expected: '2026', label: 'digits alone stay as they are' },
      { call: 'digitsOnly("no digits")', expected: '', label: 'no digits gives an empty string', edge: true },
      { call: 'digitsOnly("")', expected: '', label: 'empty text', edge: true },
    ],
  },
  {
    id: 'js-easy3-hex-colour',
    track: 'javascript',
    topic: 'javascript',
    level: 2,
    tier: 2,
    focus: ['regex'],
    title: 'Is it a hex colour?',
    prompt: 'Write `isHexColour(text)`, returning `true` when the whole text is a six-digit hex colour: a `#` followed by exactly six characters from 0–9 and a–f, in either case. Use a regular expression and its `test` method. `isHexColour("#1a2b3c")` gives `true`, and `isHexColour("#12345")` gives `false`. Anything before the `#` or after the sixth digit makes it `false`.',
    starter: `const isHexColour = text => {

};

// Scratch pad. Change this and press Run.
console.log(isHexColour("#1a2b3c"), isHexColour("#12345"));
`,
    skeleton: `const isHexColour = text => {
  const pattern = /* ^ and $ around a # and six hex characters, with the i flag */;
  return pattern.test(text);
};`,
    hints: ['`^` pins a pattern to the start of the text and `$` to the end, so nothing else can sit around the colour. `[0-9a-f]{6}` matches six hex characters, and the `i` flag accepts capitals too.'],
    approach: [
      'Build the character class for one hex digit: `[0-9a-f]`.',
      'Ask for exactly six of them with `{6}`, after a literal `#`.',
      'Anchor both ends with `^` and `$`, add the `i` flag, and return `pattern.test(text)`.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'isHexColour("#1a2b3c")', expected: true },
      { call: 'isHexColour("#FFFFFF")', expected: true, label: 'capitals count' },
      { call: 'isHexColour("#12345")', expected: false, label: 'five digits are too few', edge: true },
      { call: 'isHexColour("#12345g")', expected: false, label: 'g is not a hex digit', edge: true },
      { call: 'isHexColour("123456")', expected: false, label: 'the # is required', edge: true },
      { call: 'isHexColour("#1234567")', expected: false, label: 'a seventh digit is too many', edge: true },
    ],
  },
  {
    id: 'js-easy3-find-hashtags',
    track: 'javascript',
    topic: 'javascript',
    level: 2,
    tier: 2,
    focus: ['regex'],
    title: 'Every hashtag in a post',
    prompt: 'Write `hashtags(text)`, returning every hashtag in the text, in order. A hashtag is a `#` followed by one or more letters, digits or underscores. Use `match` with a regular expression and the `g` flag. `hashtags("Loving #javascript and #css")` gives `["#javascript", "#css"]`. When nothing matches, `match` gives `null`; return an empty array instead.',
    starter: `const hashtags = text => {

};

// Scratch pad. Change this and press Run.
console.log(hashtags("Loving #javascript and #css"));
`,
    skeleton: `const hashtags = text => {
  const found = text.match(/* a # and then one or more word characters, every match */);
  return /* found, or [] when it is null */;
};`,
    hints: ['`\\w` matches a letter, digit or underscore, and `\\w+` matches a run of them. With the `g` flag, `match` returns every match in an array, or `null` when nothing matches.'],
    approach: [
      'Write the pattern `/#\\w+/g`: a literal `#`, then one or more word characters, every match.',
      'Call `text.match` with it.',
      'Return the result, or `[]` when it is `null`. `??` does that in one step.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'hashtags("Loving #javascript and #css today")', expected: ['#javascript', '#css'] },
      { call: 'hashtags("#one#two")', expected: ['#one', '#two'], label: 'tags can touch' },
      { call: 'hashtags("no tags here")', expected: [], label: 'no match gives an empty array', edge: true },
      { call: 'hashtags("a # b")', expected: [], label: 'a # on its own is not a tag', edge: true },
    ],
  },

  /* ── split ────────────────────────────────────────────────────────── */
  {
    id: 'js-easy3-read-query',
    track: 'javascript',
    topic: 'javascript',
    level: 2,
    tier: 2,
    focus: ['split', 'objects'],
    title: 'Read a query string',
    prompt: 'A query string looks like `"page=2&sort=new"`. Write `parseQuery(query)`, returning an object with one key per pair: split the text on `&`, then split each pair on `=`. `parseQuery("page=2&sort=new")` gives `{ page: "2", sort: "new" }`. Values stay strings. A pair with no `=` gets an empty string, a key that appears twice keeps its last value, and an empty query gives `{}`.',
    starter: `const parseQuery = query => {

};

// Scratch pad. Change this and press Run.
console.log(parseQuery("page=2&sort=new"));
`,
    skeleton: `const parseQuery = query => {
  const result = {};
  if (/* the query is empty */) return result;

  for (const pair of query.split("&")) {
    const [key, value] = /* the pair split on = */;
    // store the value under the key, or "" when there is no value
  }

  return result;
};`,
    hints: ['`"".split("&")` gives `[""]`, not `[]`, so check for an empty query first. `const [key, value] = pair.split("=")` leaves `value` as `undefined` when the pair has no `=`.'],
    approach: [
      'Return `{}` straight away when the query is an empty string.',
      'Split the query on `&` and loop over the pairs.',
      'Split each pair on `=` and store the value under the key, using `""` when the value is missing. A later pair with the same key overwrites the earlier one.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'parseQuery("page=2&sort=new")', expected: { page: '2', sort: 'new' } },
      { call: 'parseQuery("q=shark")', expected: { q: 'shark' } },
      { call: 'parseQuery("flag")', expected: { flag: '' }, label: 'a key with no = gets an empty string', edge: true },
      { call: 'parseQuery("a=1&a=2")', expected: { a: '2' }, label: 'the last value wins', edge: true },
      { call: 'parseQuery("")', expected: {}, label: 'an empty query', edge: true },
    ],
  },

  /* ── concat and join ──────────────────────────────────────────────── */
  {
    id: 'js-easy3-add-to-playlist',
    track: 'javascript',
    topic: 'javascript',
    level: 4,
    tier: 1,
    focus: ['concat'],
    title: 'Add to a playlist',
    prompt: 'Write `addSongs(playlist, songs)`, returning a new playlist with `songs` added at the end, using `concat`. `songs` can be an array of titles or a single title: `addSongs(["Intro"], ["Wave", "Tide"])` gives `["Intro", "Wave", "Tide"]`, and `addSongs(["Intro"], "Wave")` gives `["Intro", "Wave"]`. The original playlist is not changed.',
    starter: `const addSongs = (playlist, songs) => {

};

// Scratch pad. Change this and press Run.
console.log(addSongs(["Intro"], ["Wave", "Tide"]));
`,
    skeleton: `const addSongs = (playlist, songs) => {
  return /* a new array: playlist followed by songs */;
};`,
    hints: ['`concat` returns a new array and leaves the one you call it on alone. Give it an array and it adds that array’s items; give it a single value and it adds the value.'],
    approach: [
      'Call `concat` on the playlist, with `songs` as the argument.',
      'Return the result. It works for an array of titles and for a single title, so you need no `if`.',
      'Avoid `push`: it changes the original playlist, which the task forbids.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'addSongs(["Intro"], ["Wave", "Tide"])', expected: ['Intro', 'Wave', 'Tide'] },
      { call: 'addSongs(["Intro"], "Wave")', expected: ['Intro', 'Wave'], label: 'a single title' },
      { call: 'addSongs([], [])', expected: [], label: 'nothing to add to nothing', edge: true },
      { call: '(() => { const list = ["Intro"]; addSongs(list, ["Wave"]); return list; })()', expected: ['Intro'], label: 'the original playlist is unchanged', edge: true },
    ],
  },
  {
    id: 'js-easy3-list-in-words',
    track: 'javascript',
    topic: 'javascript',
    level: 4,
    tier: 2,
    focus: ['join', 'slice'],
    title: 'A list in words',
    prompt: 'Write `inWords(items)`, joining a list of words the way a sentence does: commas between the items, and `and` before the last one. Use `slice` and `join`. `inWords(["tea", "coffee", "juice"])` gives `"tea, coffee and juice"`, and `inWords(["salt", "pepper"])` gives `"salt and pepper"`. A single item comes back on its own, and an empty list gives an empty string.',
    starter: `const inWords = items => {

};

// Scratch pad. Change this and press Run.
console.log(inWords(["tea", "coffee", "juice"]));
`,
    skeleton: `const inWords = items => {
  if (items.length < 2) return /* the single item, or "" */;
  const allButLast = /* every item except the last */;
  const last = items[items.length - 1];
  return /* allButLast joined with ", ", then " and ", then last */;
};`,
    hints: ['`items.slice(0, -1)` copies every item except the last. `join(", ")` puts a comma and a space between the items and nothing after the final one.'],
    approach: [
      'Handle short lists first. With fewer than two items, `items.join("")` already gives `""` or the one item.',
      'Take every item but the last with `slice(0, -1)` and join them with `", "`.',
      'Add `" and "` and the last item.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'inWords(["tea", "coffee", "juice"])', expected: 'tea, coffee and juice' },
      { call: 'inWords(["salt", "pepper"])', expected: 'salt and pepper' },
      { call: 'inWords(["a", "b", "c", "d"])', expected: 'a, b, c and d' },
      { call: 'inWords(["water"])', expected: 'water', label: 'one item comes back on its own', edge: true },
      { call: 'inWords([])', expected: '', label: 'no items', edge: true },
    ],
  },

  /* ── for...in ─────────────────────────────────────────────────────── */
  {
    id: 'js-easy3-fill-defaults',
    track: 'javascript',
    topic: 'javascript',
    level: 5,
    tier: 1,
    focus: ['for-in', 'objects'],
    title: 'Fill in the defaults',
    prompt: 'Write `withDefaults(settings, defaults)`, returning a new object with every key of `settings`, plus each key of `defaults` that `settings` does not have. Loop over `defaults` with `for…in`. `withDefaults({ theme: "dark" }, { theme: "light", size: 12 })` gives `{ theme: "dark", size: 12 }`. A setting of `false`, `0` or `""` is still a setting and is kept. Neither input is changed.',
    starter: `const withDefaults = (settings, defaults) => {

};

// Scratch pad. Change this and press Run.
console.log(withDefaults({ theme: "dark" }, { theme: "light", size: 12 }));
`,
    skeleton: `const withDefaults = (settings, defaults) => {
  const result = { ...settings };

  for (const key in defaults) {
    // copy defaults[key] across only when result does not have key yet
  }

  return result;
};`,
    hints: ['`key in result` is `true` whenever the key exists, whatever its value. Checking the value instead, as `result[key] || defaults[key]` does, would replace a `false` or a `0`.'],
    approach: [
      'Start from a copy of `settings`, so the original object never changes.',
      'Loop over the keys of `defaults` with `for…in`.',
      'When the copy does not have the key, copy the default across. Return the copy.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'withDefaults({ theme: "dark" }, { theme: "light", size: 12 })', expected: { theme: 'dark', size: 12 } },
      { call: 'withDefaults({}, { a: 1, b: 2 })', expected: { a: 1, b: 2 }, label: 'no settings takes every default' },
      { call: 'withDefaults({ sound: false, volume: 0 }, { sound: true, volume: 5 })', expected: { sound: false, volume: 0 }, label: 'false and 0 are kept', edge: true },
      { call: 'withDefaults({ extra: "x" }, {})', expected: { extra: 'x' }, label: 'a setting with no default stays', edge: true },
      { call: '(() => { const settings = { a: 1 }; withDefaults(settings, { b: 2 }); return settings; })()', expected: { a: 1 }, label: 'settings is not changed', edge: true },
    ],
  },
  {
    id: 'js-easy3-count-types',
    track: 'javascript',
    topic: 'javascript',
    level: 5,
    tier: 2,
    focus: ['for-in', 'objects'],
    title: 'Count values by type',
    prompt: 'Write `countTypes(object)`, returning an object that counts the values of `object` by what `typeof` says about them, visiting the keys with `for…in`. `countTypes({ a: 1, b: "x", c: 2 })` gives `{ number: 2, string: 1 }`. `typeof` answers `"object"` for arrays and for `null` too, so they count there. An empty object gives `{}`.',
    starter: `const countTypes = object => {

};

// Scratch pad. Change this and press Run.
console.log(countTypes({ a: 1, b: "x", c: 2 }));
`,
    skeleton: `const countTypes = object => {
  const counts = {};

  for (const key in object) {
    const type = /* what typeof says about object[key] */;
    // add one to counts[type], starting from 0 the first time
  }

  return counts;
};`,
    hints: ['`counts[type]` is `undefined` the first time a type turns up. `(counts[type] ?? 0) + 1` starts it at 1.'],
    approach: [
      'Create an empty object for the counts.',
      'Loop over the keys with `for…in` and read the type of each value with `typeof object[key]`.',
      'Use the type as a key in the counts and add one to it, starting from 0 when it is missing.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'countTypes({ a: 1, b: "x", c: 2 })', expected: { number: 2, string: 1 } },
      { call: 'countTypes({ ok: true, list: [1, 2], none: null })', expected: { boolean: 1, object: 2 }, label: 'arrays and null count as "object"' },
      { call: 'countTypes({ f: () => 1, g: "x" })', expected: { function: 1, string: 1 } },
      { call: 'countTypes({ u: undefined })', expected: { undefined: 1 }, label: 'undefined is its own type', edge: true },
      { call: 'countTypes({})', expected: {}, label: 'an empty object', edge: true },
    ],
  },

  /* ── nested loops ─────────────────────────────────────────────────── */
  {
    id: 'js-easy3-column-totals',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 1,
    focus: ['nested-loops'],
    title: 'Column totals',
    prompt: 'A grid is an array of rows, and every row holds the same number of numbers. Write `columnTotals(grid)`, returning the total of each column, left to right. Use a loop over the columns with a loop over the rows inside it. `columnTotals([[1, 2], [3, 4]])` gives `[4, 6]`. An empty grid gives `[]`.',
    starter: `const columnTotals = grid => {

};

// Scratch pad. Change this and press Run.
console.log(columnTotals([[1, 2], [3, 4]]));
`,
    skeleton: `const columnTotals = grid => {
  const totals = [];
  if (grid.length === 0) return totals;

  for (let column = 0; column < grid[0].length; column++) {
    let sum = 0;
    for (/* every row index */) {
      // add the number at this row and column
    }
    totals.push(sum);
  }

  return totals;
};`,
    hints: ['The number of columns is the length of any row, so read it from `grid[0]`. The outer loop picks a column and the inner loop walks down it with `grid[row][column]`.'],
    approach: [
      'Return `[]` for an empty grid, since it has no first row to count columns from.',
      'Loop over the column indexes, from 0 up to the length of the first row.',
      'For each column, loop over every row and add `grid[row][column]` to a sum. Push the sum when the inner loop ends.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'columnTotals([[1, 2], [3, 4]])', expected: [4, 6] },
      { call: 'columnTotals([[5], [6], [7]])', expected: [18], label: 'one column' },
      { call: 'columnTotals([[1, 2, 3]])', expected: [1, 2, 3], label: 'one row', edge: true },
      { call: 'columnTotals([[-1, 1], [1, -1]])', expected: [0, 0], label: 'negative numbers', edge: true },
      { call: 'columnTotals([])', expected: [], label: 'an empty grid', edge: true },
    ],
  },
  {
    id: 'js-easy3-every-combination',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 1,
    focus: ['nested-loops'],
    title: 'Every size in every colour',
    prompt: 'Write `combinations(sizes, colours)`, returning one label for every size paired with every colour, written as `"size colour"`. Loop over the sizes, and inside that loop, over the colours. `combinations(["S", "M"], ["red", "blue"])` gives `["S red", "S blue", "M red", "M blue"]`. When either list is empty there are no combinations.',
    starter: `const combinations = (sizes, colours) => {

};

// Scratch pad. Change this and press Run.
console.log(combinations(["S", "M"], ["red", "blue"]));
`,
    skeleton: `const combinations = (sizes, colours) => {
  const labels = [];

  for (const size of sizes) {
    for (/* every colour */) {
      // push the label for this size and colour
    }
  }

  return labels;
};`,
    hints: ['The inner loop runs all the way through on every turn of the outer loop, so each size meets every colour before the next size starts.'],
    approach: [
      'Start an empty array for the labels.',
      'Loop over the sizes, and inside that loop, loop over the colours.',
      'In the inner loop, push `size + " " + colour`. With an empty list one of the loops never runs its body, so the result stays empty.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'combinations(["S", "M"], ["red", "blue"])', expected: ['S red', 'S blue', 'M red', 'M blue'] },
      { call: 'combinations(["L"], ["black"])', expected: ['L black'] },
      { call: 'combinations(["S", "M", "L"], ["grey"])', expected: ['S grey', 'M grey', 'L grey'] },
      { call: 'combinations([], ["red"])', expected: [], label: 'no sizes', edge: true },
      { call: 'combinations(["S"], [])', expected: [], label: 'no colours', edge: true },
    ],
  },

  /* ── flat ─────────────────────────────────────────────────────────── */
  {
    id: 'js-easy3-pick-list',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 2,
    focus: ['flat'],
    title: 'One line per item picked',
    prompt: 'An order is an array of `{ name, qty }` items. Write `pickList(order)`, returning one entry for each thing to pick from the shelf: `qty` copies of each name, in order. Use `flatMap`, which maps every item to an array and then flattens those arrays by one level. `pickList([{ name: "apple", qty: 2 }, { name: "pear", qty: 1 }])` gives `["apple", "apple", "pear"]`. An item with a `qty` of 0 adds nothing.',
    starter: `const pickList = order => {

};

// Scratch pad. Change this and press Run.
console.log(pickList([{ name: "apple", qty: 2 }, { name: "pear", qty: 1 }]));
`,
    skeleton: `const pickList = order => {
  return order.flatMap(item => {
    // return an array holding item.qty copies of item.name
  });
};`,
    hints: ['`Array(3).fill("x")` gives `["x", "x", "x"]`. When the `flatMap` callback returns an empty array, that item leaves no trace in the result.'],
    approach: [
      'Call `flatMap` on the order.',
      'For each item, return an array of `item.qty` copies of `item.name`, for example `Array(item.qty).fill(item.name)`.',
      '`flatMap` joins those arrays end to end. A quantity of 0 gives an empty array, which adds nothing.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'pickList([{ name: "apple", qty: 2 }, { name: "pear", qty: 1 }])', expected: ['apple', 'apple', 'pear'] },
      { call: 'pickList([{ name: "nail", qty: 3 }])', expected: ['nail', 'nail', 'nail'] },
      { call: 'pickList([{ name: "sold out", qty: 0 }, { name: "tape", qty: 1 }])', expected: ['tape'], label: 'a quantity of 0 adds nothing', edge: true },
      { call: 'pickList([])', expected: [], label: 'an empty order', edge: true },
    ],
  },

  /* ── forEach ──────────────────────────────────────────────────────── */
  {
    id: 'js-easy3-discount-in-place',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 1,
    focus: ['forEach', 'objects'],
    title: 'Discount every item',
    prompt: 'Each item is `{ name, price }`, with the price in cents. Write `applyDiscount(items, percent)`, which lowers every item’s price by `percent` per cent in place, using `forEach`, and returns nothing. Round each new price to a whole number of cents with `Math.round`. After `applyDiscount(items, 10)`, an item priced 200 costs 180. A discount of 0 leaves every price as it was.',
    starter: `const applyDiscount = (items, percent) => {

};

// Scratch pad. Change this and press Run.
const basket = [{ name: "tea", price: 200 }];
applyDiscount(basket, 10);
console.log(basket);
`,
    skeleton: `const applyDiscount = (items, percent) => {
  items.forEach(item => {
    // replace item.price with the rounded, discounted price
  });
};`,
    hints: ['`forEach` calls your function once per item and returns `undefined`, so it suits work that changes things rather than work that builds a new array. Assign to `item.price` inside the callback.'],
    approach: [
      'Call `forEach` on the items.',
      'In the callback, work out `item.price * (100 - percent) / 100`, round it with `Math.round`, and assign it back to `item.price`.',
      'Return nothing. The caller already holds the items and sees the new prices.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: '(() => { const items = [{ name: "tea", price: 200 }, { name: "cake", price: 350 }]; applyDiscount(items, 10); return items; })()', expected: [{ name: 'tea', price: 180 }, { name: 'cake', price: 315 }] },
      { call: '(() => { const items = [{ name: "mug", price: 99 }]; applyDiscount(items, 50); return items[0].price; })()', expected: 50, label: 'prices round to whole cents' },
      { call: '(() => { const items = [{ name: "pen", price: 120 }]; applyDiscount(items, 0); return items; })()', expected: [{ name: 'pen', price: 120 }], label: 'no discount', edge: true },
      { call: 'applyDiscount([{ name: "cup", price: 100 }], 20)', expected: undefined, label: 'it returns nothing', edge: true },
      { call: '(() => { const items = []; applyDiscount(items, 30); return items; })()', expected: [], label: 'an empty list', edge: true },
    ],
  },

  /* ── sort ─────────────────────────────────────────────────────────── */
  {
    id: 'js-easy3-newest-first',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 2,
    focus: ['sort'],
    title: 'Newest first',
    prompt: 'Each post is `{ title, date }`, where `date` is text such as `"2026-09-01"`. Dates written this way sort correctly as text. Write `newestFirst(posts)`, returning a new array with the latest date first, using `sort` with a compare function. Posts with the same date keep their original order, and `posts` itself is not changed.',
    starter: `const newestFirst = posts => {

};

// Scratch pad. Change this and press Run.
console.log(newestFirst([{ title: "A", date: "2026-01-05" }, { title: "B", date: "2026-03-01" }]));
`,
    skeleton: `const newestFirst = posts => {
  return [...posts].sort((a, b) => {
    // negative when a is newer, positive when b is newer, 0 for the same date
  });
};`,
    hints: ['A compare function returns a negative number to put `a` first, a positive number to put `b` first, and 0 to leave the two in their order. Compare `a.date` and `b.date` with `<` and `>`.'],
    approach: [
      'Copy the array with `[...posts]` before sorting, because `sort` changes the array it is called on.',
      'Return a negative number when `a.date` is later than `b.date`, and a positive number when it is earlier.',
      'Return 0 for equal dates. `sort` is stable, so those posts stay in their original order.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'newestFirst([{ title: "a", date: "2026-01-05" }, { title: "b", date: "2026-03-01" }, { title: "c", date: "2025-12-31" }]).map(post => post.title)', expected: ['b', 'a', 'c'] },
      { call: 'newestFirst([{ title: "old", date: "2024-06-01" }, { title: "new", date: "2025-06-01" }]).map(post => post.title)', expected: ['new', 'old'] },
      { call: 'newestFirst([{ title: "x", date: "2026-05-01" }, { title: "y", date: "2026-05-01" }, { title: "z", date: "2026-06-01" }]).map(post => post.title)', expected: ['z', 'x', 'y'], label: 'posts on the same date keep their order', edge: true },
      { call: 'newestFirst([])', expected: [], label: 'no posts', edge: true },
      { call: '(() => { const posts = [{ title: "old", date: "2020-01-01" }, { title: "new", date: "2021-01-01" }]; newestFirst(posts); return posts.map(post => post.title); })()', expected: ['old', 'new'], label: 'the input keeps its order', edge: true },
    ],
  },

  /* ── includes, indexOf, findIndex, every ──────────────────────────── */
  {
    id: 'js-easy3-hide-banned',
    track: 'javascript',
    topic: 'javascript',
    level: 7,
    tier: 1,
    focus: ['includes', 'map'],
    title: 'Hide the banned words',
    prompt: 'Write `hideBanned(words, banned)`, returning a new array where every word that appears in `banned` is replaced by `"***"`. Check each word with `includes` inside `map`. `hideBanned(["you", "are", "silly"], ["silly"])` gives `["you", "are", "***"]`. The match is exact, so `"Silly"` is not the same word as `"silly"`.',
    starter: `const hideBanned = (words, banned) => {

};

// Scratch pad. Change this and press Run.
console.log(hideBanned(["you", "are", "silly"], ["silly"]));
`,
    skeleton: `const hideBanned = (words, banned) => {
  return words.map(word => /* "***" when banned includes word, otherwise word */);
};`,
    hints: ['`banned.includes(word)` is `true` when the word is on the banned list. A ternary in the `map` callback picks `"***"` or the word.'],
    approach: [
      'Map over the words, because the result has one entry per word.',
      'For each word, ask `banned.includes(word)`.',
      'Return `"***"` when it is banned and the word itself otherwise.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'hideBanned(["you", "are", "silly"], ["silly"])', expected: ['you', 'are', '***'] },
      { call: 'hideBanned(["bad", "good", "worse"], ["bad", "worse"])', expected: ['***', 'good', '***'] },
      { call: 'hideBanned(["hello"], [])', expected: ['hello'], label: 'nothing banned', edge: true },
      { call: 'hideBanned(["Silly", "silly"], ["silly"])', expected: ['Silly', '***'], label: 'the match is exact', edge: true },
      { call: 'hideBanned([], ["x"])', expected: [], label: 'no words', edge: true },
    ],
  },
  {
    id: 'js-easy3-positions-of',
    track: 'javascript',
    topic: 'javascript',
    level: 7,
    tier: 2,
    focus: ['indexOf', 'while'],
    title: 'Every position of a value',
    prompt: 'Write `positionsOf(list, value)`, returning every index where `value` appears, in order. Use `indexOf` with its second argument, the index to start searching from, inside a `while` loop. `positionsOf(["a", "b", "a", "c", "a"], "a")` gives `[0, 2, 4]`. No match gives `[]`. Like `indexOf`, it compares strictly, so `"1"` is not `1`.',
    starter: `const positionsOf = (list, value) => {

};

// Scratch pad. Change this and press Run.
console.log(positionsOf(["a", "b", "a", "c", "a"], "a"));
`,
    skeleton: `const positionsOf = (list, value) => {
  const positions = [];
  let index = list.indexOf(value);

  while (/* a match was found */) {
    positions.push(index);
    index = /* search again, starting just after this match */;
  }

  return positions;
};`,
    hints: ['`list.indexOf(value, start)` begins looking at `start` and gives -1 when there is no match from there on. Start each new search one place after the last match.'],
    approach: [
      'Find the first match with `list.indexOf(value)`.',
      'While the index is not -1, push it and search again from `index + 1`.',
      'When `indexOf` gives -1 there are no more matches, so return the positions.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'positionsOf(["a", "b", "a", "c", "a"], "a")', expected: [0, 2, 4] },
      { call: 'positionsOf([7, 7, 7], 7)', expected: [0, 1, 2], label: 'matches side by side' },
      { call: 'positionsOf([1, 2, 3], 4)', expected: [], label: 'no match', edge: true },
      { call: 'positionsOf([1, "1", 1], 1)', expected: [0, 2], label: 'the string "1" is not the number 1', edge: true },
      { call: 'positionsOf([], "x")', expected: [], label: 'an empty list', edge: true },
    ],
  },
  {
    id: 'js-easy3-first-over-limit',
    track: 'javascript',
    topic: 'javascript',
    level: 7,
    tier: 1,
    focus: ['findIndex'],
    title: 'The first reading over the limit',
    prompt: 'Write `firstOverLimit(readings, limit)`, returning the index of the first reading greater than `limit`, using `findIndex`. `firstOverLimit([3, 8, 12, 15], 10)` gives 2. A reading equal to the limit is not over it, and when no reading is over the limit the answer is -1.',
    starter: `const firstOverLimit = (readings, limit) => {

};

// Scratch pad. Change this and press Run.
console.log(firstOverLimit([3, 8, 12, 15], 10));
`,
    skeleton: `const firstOverLimit = (readings, limit) => {
  return readings.findIndex(/* a test for a reading over the limit */);
};`,
    hints: ['`findIndex` runs your test on each item in turn and gives the index of the first one that passes, or -1 when none does.'],
    approach: [
      'Call `findIndex` on the readings.',
      'Pass a test that returns `reading > limit`. Use `>` rather than `>=`, because a reading equal to the limit is not over it.',
      'Return what `findIndex` gives. It is already -1 when nothing matches.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'firstOverLimit([3, 8, 12, 15], 10)', expected: 2 },
      { call: 'firstOverLimit([20, 1], 10)', expected: 0, label: 'the first reading can be the one', edge: true },
      { call: 'firstOverLimit([10, 11], 10)', expected: 1, label: 'equal to the limit is not over it', edge: true },
      { call: 'firstOverLimit([1, 2], 5)', expected: -1, label: 'nothing over the limit', edge: true },
      { call: 'firstOverLimit([], 0)', expected: -1, label: 'no readings', edge: true },
    ],
  },
  {
    id: 'js-easy3-form-complete',
    track: 'javascript',
    topic: 'javascript',
    level: 7,
    tier: 1,
    focus: ['every', 'objects'],
    title: 'Every field filled in',
    prompt: 'A form is an object whose values are the strings someone typed. Write `isComplete(form)`, returning `true` when every value holds something other than spaces, using `Object.values` and `every`. `isComplete({ name: "Ada", email: "ada@example.com" })` gives `true`, and an empty email gives `false`. A value of only spaces counts as empty. `every` gives `true` for an empty list, so a form with no fields is complete.',
    starter: `const isComplete = form => {

};

// Scratch pad. Change this and press Run.
console.log(isComplete({ name: "Ada", email: "" }));
`,
    skeleton: `const isComplete = form => {
  return Object.values(form).every(/* a test for a value that is not blank */);
};`,
    hints: ['`value.trim()` removes the spaces at both ends, so a blank value becomes `""`. The test passes when what is left is not an empty string.'],
    approach: [
      'Get the values with `Object.values(form)`.',
      'Call `every` with a test that trims each value and checks it is not `""`.',
      'Return the answer. `every` stops at the first blank value, and gives `true` when there are no values at all.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'isComplete({ name: "Ada", email: "ada@example.com" })', expected: true },
      { call: 'isComplete({ name: "Ada", email: "" })', expected: false, label: 'an empty field' },
      { call: 'isComplete({ name: "   " })', expected: false, label: 'spaces alone count as empty', edge: true },
      { call: 'isComplete({ city: "  Brno " })', expected: true, label: 'spaces around a word are fine', edge: true },
      { call: 'isComplete({})', expected: true, label: 'a form with no fields is complete', edge: true },
    ],
  },

  /* ── destructuring and spread ─────────────────────────────────────── */
  {
    id: 'js-easy3-options-with-defaults',
    track: 'javascript',
    topic: 'javascript',
    level: 9,
    tier: 1,
    focus: ['destructuring'],
    title: 'Options with defaults',
    prompt: 'Write `makeUser(options)`, returning `{ name, role, active }` from an options object. Destructure the options in the parameter list and give each one a default: `name` is `"Guest"`, `role` is `"viewer"` and `active` is `true`. `makeUser({ name: "Ada" })` gives `{ name: "Ada", role: "viewer", active: true }`, and `makeUser()` with no argument gives the three defaults. A default applies only when a value is missing or `undefined`, so `active: false` and `name: null` are kept.',
    starter: `const makeUser = options => {

};

// Scratch pad. Change this and press Run.
console.log(makeUser({ name: "Ada" }));
`,
    skeleton: `const makeUser = ({ name = "Guest", /* role and active, with their defaults */ } = /* what to use when there is no argument */) => {
  return { name, role, active };
};`,
    hints: ['`({ name = "Guest" } = {})` takes `name` out of the argument, with a default. The `= {}` after the braces gives the function an empty object to destructure when it is called with nothing.'],
    approach: [
      'Replace the `options` parameter with an object pattern that names `name`, `role` and `active`.',
      'Give each name its default with `=` inside the pattern.',
      'Add `= {}` after the pattern, so a call with no argument destructures an empty object instead of throwing. Return the three values.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'makeUser({ name: "Ada" })', expected: { name: 'Ada', role: 'viewer', active: true } },
      { call: 'makeUser({ role: "admin", active: false })', expected: { name: 'Guest', role: 'admin', active: false }, label: 'false is a value and is kept', edge: true },
      { call: 'makeUser()', expected: { name: 'Guest', role: 'viewer', active: true }, label: 'no argument at all', edge: true },
      { call: 'makeUser({ name: undefined, role: "editor" })', expected: { name: 'Guest', role: 'editor', active: true }, label: 'undefined takes the default', edge: true },
      { call: 'makeUser({ name: null })', expected: { name: null, role: 'viewer', active: true }, label: 'null is a value and is kept', edge: true },
    ],
  },
  {
    id: 'js-easy3-highest-score',
    track: 'javascript',
    topic: 'javascript',
    level: 10,
    tier: 1,
    focus: ['spread'],
    title: 'Highest with Math.max',
    prompt: 'Write `highest(scores)`, returning the largest number in the array by spreading it into `Math.max`. `highest([3, 9, 4])` gives 9. `Math.max()` with no arguments gives `-Infinity`, so return `null` for an empty array instead.',
    starter: `const highest = scores => {

};

// Scratch pad. Change this and press Run.
console.log(highest([3, 9, 4]));
`,
    skeleton: `const highest = scores => {
  if (/* there are no scores */) return null;
  return Math.max(/* every score as its own argument */);
};`,
    hints: ['`Math.max` takes its numbers as separate arguments, not as one array. `Math.max(...scores)` spreads the array into those arguments.'],
    approach: [
      'Return `null` when the array is empty.',
      'Otherwise call `Math.max(...scores)`. The spread turns each item into its own argument.',
      'Return the result. The array itself is not changed.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'highest([3, 9, 4])', expected: 9 },
      { call: 'highest([7])', expected: 7 },
      { call: 'highest([2, 2])', expected: 2, label: 'a tie for the top' },
      { call: 'highest([-5, -2, -8])', expected: -2, label: 'negative scores', edge: true },
      { call: 'highest([])', expected: null, label: 'no scores gives null, not -Infinity', edge: true },
    ],
  },

  /* ── recursion ────────────────────────────────────────────────────── */
  {
    id: 'js-easy3-count-files',
    track: 'javascript',
    topic: 'javascript',
    level: 11,
    tier: 2,
    focus: ['recursion'],
    title: 'Count the files in a folder tree',
    prompt: 'A folder is `{ name, children }`, where `children` is an array of files and folders. A file is `{ name }`, with no `children`. Write `countFiles(entry)`, returning how many files `entry` holds at any depth, by recursion: a file counts as 1, and a folder adds up the files of each of its children. An empty folder holds 0 files.',
    starter: `const countFiles = entry => {

};

// Scratch pad. Change this and press Run.
console.log(countFiles({ name: "src", children: [{ name: "a.js" }, { name: "lib", children: [{ name: "b.js" }] }] }));
`,
    skeleton: `const countFiles = entry => {
  if (/* entry is a file: it has no children */) return 1;

  let total = 0;
  for (const child of entry.children) {
    total += /* the files inside child */;
  }
  return total;
};`,
    hints: ['Let `countFiles` answer for one child at a time. The base case is a file, which is 1. A folder adds up what `countFiles` says about each of its children.'],
    approach: [
      'Write the base case first: an entry without `children` is a file, so return 1.',
      'For a folder, start a total at 0 and loop over its children.',
      'Add `countFiles(child)` for each child and return the total. An empty folder never enters the loop and returns 0.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'countFiles({ name: "src", children: [{ name: "a.js" }, { name: "b.js" }] })', expected: 2 },
      { call: 'countFiles({ name: "app", children: [{ name: "index.js" }, { name: "lib", children: [{ name: "x.js" }, { name: "y.js" }] }] })', expected: 3, label: 'files inside a folder inside a folder' },
      { call: 'countFiles({ name: "notes.txt" })', expected: 1, label: 'a single file', edge: true },
      { call: 'countFiles({ name: "empty", children: [] })', expected: 0, label: 'an empty folder', edge: true },
      { call: 'countFiles({ name: "a", children: [{ name: "b", children: [{ name: "c", children: [] }] }] })', expected: 0, label: 'folders all the way down, and no files', edge: true },
    ],
  },
  {
    id: 'js-easy3-nesting-depth',
    track: 'javascript',
    topic: 'javascript',
    level: 11,
    tier: 2,
    focus: ['recursion'],
    title: 'How deep it goes',
    prompt: 'Write `depth(list)`, returning how many levels of arrays there are, by recursion. An array that holds no arrays has depth 1, and an array that holds arrays is one level deeper than the deepest of them. `depth([1, [2, [3]]])` gives 3, and `depth([])` gives 1.',
    starter: `const depth = list => {

};

// Scratch pad. Change this and press Run.
console.log(depth([1, [2, [3]]]));
`,
    skeleton: `const depth = list => {
  let deepest = 0;

  for (const item of list) {
    if (Array.isArray(item)) {
      // keep the larger of deepest and the depth of item
    }
  }

  return /* one level for list itself, plus the deepest inside it */;
};`,
    hints: ['`Array.isArray(item)` tells an inner array from a plain value. Call `depth(item)` on each inner array and keep the largest answer.'],
    approach: [
      'Keep the deepest inner depth found so far, starting at 0.',
      'Loop over the items. For each inner array, compare `depth(item)` with the deepest so far and keep the larger.',
      'Return 1 plus the deepest. With no inner arrays, that is 1.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'depth([1, 2, 3])', expected: 1 },
      { call: 'depth([1, [2, [3]]])', expected: 3 },
      { call: 'depth([[[3, [4]]], 2, [1]])', expected: 4, label: 'the deepest branch decides, wherever it sits' },
      { call: 'depth([])', expected: 1, label: 'an empty array is one level', edge: true },
      { call: 'depth([[], [[]]])', expected: 3, label: 'empty inner arrays still count', edge: true },
    ],
  },

  /* ── closures and higher-order functions ──────────────────────────── */
  {
    id: 'js-easy3-changed-since-last',
    track: 'javascript',
    topic: 'javascript',
    level: 12,
    tier: 2,
    focus: ['closures'],
    title: 'Did it change?',
    prompt: 'Write `makeChangeWatcher()`, returning a function `changed(value)`. Its first call returns `true`. Every later call returns `true` when `value` is not strictly equal to the value of the call before it, and `false` when it is. Keep the previous value in a variable the returned function closes over. A first value of `undefined` still counts as a change, and each watcher remembers only its own values.',
    starter: `const makeChangeWatcher = () => {

};

// Scratch pad. Uncomment once your function returns a function.
// const changed = makeChangeWatcher();
// console.log(changed(1), changed(1), changed(2));
`,
    skeleton: `const makeChangeWatcher = () => {
  let seenAny = false;
  let previous;

  return value => {
    const isChange = /* the first call, or value differs from previous */;
    // remember this value, and that a call has happened
    return isChange;
  };
};`,
    hints: ['A single `previous` variable cannot tell "no call yet" apart from "the last value was `undefined`". Keep a separate flag for whether any call has happened.'],
    approach: [
      'Inside `makeChangeWatcher`, declare a flag for "a value has been seen" and a variable for the previous value.',
      'In the returned function, a call is a change when the flag is still false or when `value !== previous`.',
      'Store the value and set the flag before returning, so the next call compares against this one.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: '(() => { const changed = makeChangeWatcher(); return [changed(1), changed(1), changed(2), changed(1)]; })()', expected: [true, false, true, true] },
      { call: '(() => { const changed = makeChangeWatcher(); return [changed("a"), changed("a"), changed("a")]; })()', expected: [true, false, false] },
      { call: '(() => { const changed = makeChangeWatcher(); return [changed(undefined), changed(undefined)]; })()', expected: [true, false], label: 'a first undefined is a change', edge: true },
      { call: '(() => { const a = makeChangeWatcher(); const b = makeChangeWatcher(); a(5); return b(5); })()', expected: true, label: 'each watcher keeps its own values', edge: true },
      { call: '(() => { const changed = makeChangeWatcher(); return [changed(0), changed("0")]; })()', expected: [true, true], label: 'the string "0" is not the number 0', edge: true },
    ],
  },
  {
    id: 'js-easy3-multiply-by',
    track: 'javascript',
    topic: 'javascript',
    level: 15,
    tier: 1,
    focus: ['higher-order', 'closures'],
    title: 'A function that makes functions',
    prompt: 'Write `multiplyBy(factor)`, a higher-order function that returns a new function. The new function takes one number and returns it multiplied by `factor`. `multiplyBy(3)(4)` gives 12, and `[1, 2, 3].map(multiplyBy(2))` gives `[2, 4, 6]`. Each returned function keeps its own factor.',
    starter: `const multiplyBy = factor => {

};

// Scratch pad. Uncomment once your function returns a function.
// console.log([1, 2, 3].map(multiplyBy(2)));
`,
    skeleton: `const multiplyBy = factor => {
  return /* a function of one number that multiplies it by factor */;
};`,
    hints: ['A function can return another function. The inner one can still read `factor` after `multiplyBy` has returned.'],
    approach: [
      'Return an arrow function that takes one parameter, `n`.',
      'Inside it, return `n * factor`.',
      'Each call to `multiplyBy` makes a new function with its own `factor`, so `multiplyBy(2)` and `multiplyBy(3)` never interfere.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'multiplyBy(3)(4)', expected: 12 },
      { call: '[1, 2, 3].map(multiplyBy(2))', expected: [2, 4, 6] },
      { call: '(() => { const double = multiplyBy(2); const triple = multiplyBy(3); return [double(5), triple(5)]; })()', expected: [10, 15], label: 'each function keeps its own factor' },
      { call: 'multiplyBy(0)(7)', expected: 0, label: 'a factor of 0', edge: true },
      { call: 'typeof multiplyBy(2)', expected: 'function', label: 'it returns a function', edge: true },
    ],
  },

  /* ── JSON ─────────────────────────────────────────────────────────── */
  {
    id: 'js-easy3-parse-or-fallback',
    track: 'javascript',
    topic: 'javascript',
    level: 19,
    tier: 1,
    focus: ['json'],
    title: 'Parse JSON safely',
    prompt: 'Write `parseOr(text, fallback)`, returning what `JSON.parse(text)` gives, or `fallback` when the text is not valid JSON. `JSON.parse` throws on bad input, so call it inside `try` and return the fallback from `catch`. `parseOr("[1, 2]", [])` gives `[1, 2]`, and `parseOr("{bad", {})` gives `{}`. Valid JSON such as `"0"` or `"null"` parses to a real value, and that value is kept.',
    starter: `const parseOr = (text, fallback) => {

};

// Scratch pad. Change this and press Run.
console.log(parseOr("[1, 2]", []), parseOr("{bad", {}));
`,
    skeleton: `const parseOr = (text, fallback) => {
  try {
    return /* the parsed text */;
  } catch {
    return /* the value to use instead */;
  }
};`,
    hints: ['`try` runs its block, and when anything in it throws, `catch` runs instead. Return the parsed value from `try` and the fallback from `catch`.'],
    approach: [
      'Open a `try` block and return `JSON.parse(text)` from it.',
      'In `catch`, return the fallback.',
      'Do not test the parsed value with `||`: a valid `0` or `null` would be swapped for the fallback.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'parseOr(\'{"a": 1}\', {})', expected: { a: 1 } },
      { call: 'parseOr("[1, 2]", [])', expected: [1, 2] },
      { call: 'parseOr("{bad", {})', expected: {}, label: 'invalid JSON gives the fallback', edge: true },
      { call: 'parseOr("", null)', expected: null, label: 'an empty string is not JSON', edge: true },
      { call: 'parseOr("0", 5)', expected: 0, label: 'a valid 0 is kept', edge: true },
    ],
  },
  {
    id: 'js-easy3-pretty-json',
    track: 'javascript',
    topic: 'javascript',
    level: 19,
    tier: 1,
    focus: ['json'],
    title: 'Save JSON people can read',
    prompt: 'Write `toFileText(value)`, returning `value` as JSON indented by two spaces and followed by one newline, the way a settings file is saved. Pass the indent as the third argument of `JSON.stringify`. `toFileText({ a: 1 })` gives three lines, `{`, `  "a": 1` and `}`, then a final newline.',
    starter: `const toFileText = value => {

};

// Scratch pad. Change this and press Run.
console.log(toFileText({ name: "shark", tags: ["js"] }));
`,
    skeleton: `const toFileText = value => {
  return JSON.stringify(value, /* no replacer */, /* the indent */) + /* a final newline */;
};`,
    hints: ['`JSON.stringify(value, null, 2)` puts each property on its own line, indented by two spaces. The second argument is a replacer, and `null` keeps everything.'],
    approach: [
      'Call `JSON.stringify` with `null` as the second argument and `2` as the third.',
      'Add `"\\n"` at the end, because a text file ends with a newline.',
      'Return the string. Empty objects and arrays stay on one line as `{}` and `[]`.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'toFileText({ a: 1 })', expected: '{\n  "a": 1\n}\n' },
      { call: 'toFileText([1, 2])', expected: '[\n  1,\n  2\n]\n' },
      { call: 'toFileText({ name: "shark", tags: [] })', expected: '{\n  "name": "shark",\n  "tags": []\n}\n', label: 'an empty array stays on one line', edge: true },
      { call: 'toFileText({})', expected: '{}\n', label: 'an empty object', edge: true },
    ],
  },

  /* ── promises and timers ──────────────────────────────────────────── */
  {
    id: 'js-easy3-list-failures',
    track: 'javascript',
    topic: 'javascript',
    level: 21,
    tier: 2,
    focus: ['promises'],
    title: 'Which ones failed',
    prompt: 'Write `failureMessages(promises)`. Wait for every promise to settle with `Promise.allSettled`, then resolve to the `message` of each one that rejected, in the order the promises were given. `Promise.all` would stop at the first rejection; `allSettled` waits for all of them and reports how each one ended. Every rejection is an `Error`. When nothing rejects, resolve to `[]`.',
    starter: `const failureMessages = promises => {

};

// Scratch pad. Uncomment once your function returns a promise.
// failureMessages([Promise.resolve(1), Promise.reject(new Error("timeout"))]).then(messages => console.log(messages));
`,
    skeleton: `const failureMessages = promises => {
  return Promise.allSettled(promises).then(results => {
    // keep the results whose status is "rejected", then take reason.message from each
  });
};`,
    hints: ['Each result from `allSettled` is `{ status: "fulfilled", value }` or `{ status: "rejected", reason }`, where `reason` is the error the promise rejected with.'],
    approach: [
      'Pass the promises to `Promise.allSettled` and continue with `.then`.',
      'Filter the results down to those with `status === "rejected"`.',
      'Map each of those to `result.reason.message`. The results come in the order the promises were given.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: '(() => { const failing = Promise.reject(new Error("timeout")); failing.catch(() => {}); return failureMessages([Promise.resolve(1), failing, Promise.resolve(3)]); })()', expected: ['timeout'], async: true },
      { call: 'failureMessages([Promise.resolve("a"), Promise.resolve("b")])', expected: [], label: 'nothing failed', async: true },
      { call: '(() => { const slow = new Promise((resolve, reject) => setTimeout(() => reject(new Error("slow")), 20)); slow.catch(() => {}); const fast = Promise.reject(new Error("fast")); fast.catch(() => {}); return failureMessages([slow, fast]); })()', expected: ['slow', 'fast'], label: 'in the order given, not the order they failed', edge: true, async: true },
      { call: 'failureMessages([])', expected: [], label: 'no promises', edge: true, async: true },
    ],
  },
  {
    id: 'js-easy3-give-up-after',
    track: 'javascript',
    topic: 'javascript',
    level: 21,
    tier: 2,
    focus: ['timers', 'promises'],
    title: 'Give up after a while',
    prompt: 'Write `withTimeout(promise, ms, fallback)`, resolving to what `promise` resolves to if it settles within `ms` milliseconds, and to `fallback` if it does not. Build a second promise that resolves to `fallback` from a `setTimeout`, and let `Promise.race` pick whichever settles first. A rejection that arrives in time passes through as a rejection.',
    starter: `const withTimeout = (promise, ms, fallback) => {

};

// Scratch pad. Uncomment once your function returns a promise.
// withTimeout(new Promise(resolve => setTimeout(() => resolve("late"), 50)), 10, "gave up").then(value => console.log(value));
`,
    skeleton: `const withTimeout = (promise, ms, fallback) => {
  const timeout = new Promise(resolve => {
    // resolve with fallback after ms milliseconds
  });
  return /* whichever of promise and timeout settles first */;
};`,
    hints: ['`Promise.race([a, b])` settles the same way as whichever of `a` and `b` settles first, with its value or with its error.'],
    approach: [
      'Create a promise that calls `resolve(fallback)` inside `setTimeout(…, ms)`.',
      'Pass the original promise and the timeout promise to `Promise.race`.',
      'Return the race. A fast value wins, a slow one loses to the fallback, and an early rejection rejects the race.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'withTimeout(Promise.resolve("fast"), 50, "gave up")', expected: 'fast', async: true },
      { call: 'withTimeout(new Promise(resolve => setTimeout(() => resolve("late"), 50)), 10, "gave up")', expected: 'gave up', label: 'too slow gives the fallback', async: true },
      { call: 'withTimeout(new Promise(resolve => setTimeout(() => resolve("in time"), 10)), 50, "gave up")', expected: 'in time', label: 'a slow value that is still in time', edge: true, async: true },
      { call: 'withTimeout(new Promise(() => {}), 20, null)', expected: null, label: 'a promise that never settles', edge: true, async: true },
      { call: '(() => { const failing = Promise.reject(new Error("broken")); failing.catch(() => {}); return withTimeout(failing, 50, "gave up").catch(error => error.message); })()', expected: 'broken', label: 'an early rejection passes through', edge: true, async: true },
    ],
  },

  /* ── async/await ──────────────────────────────────────────────────── */
  {
    id: 'js-easy3-cache-or-load',
    track: 'javascript',
    topic: 'javascript',
    level: 22,
    tier: 2,
    focus: ['async-await'],
    title: 'Always a promise',
    prompt: 'Write an `async` function `getValue(cache, key, load)`. When `cache` already holds `key`, return the cached value. Otherwise `await load(key)`, store the result in `cache[key]`, and return it. Because the function is `async`, the caller gets a promise both times, even when the value came straight from the cache. A cached `0` is a real value and is used.',
    starter: `const getValue = (cache, key, load) => {

};

// Scratch pad. Uncomment once your function returns a promise.
// getValue({}, "b", key => Promise.resolve(key + "!")).then(value => console.log(value));
`,
    skeleton: `const getValue = async (cache, key, load) => {
  if (/* cache holds key */) return cache[key];

  const value = /* wait for load(key) */;
  // store value in the cache
  return value;
};`,
    hints: ['An `async` function wraps whatever it returns in a promise, so a plain `return cache[key]` still reaches the caller as a promise. Test for the key with `key in cache` rather than by its value, so a cached `0` counts.'],
    approach: [
      'Mark the function `async`.',
      'If the key is in the cache, return its value. The `async` keyword makes that a promise.',
      'Otherwise `await load(key)`, save the result under the key, and return it. The next call for that key finds it in the cache.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'getValue({ a: 1 }, "a", () => Promise.resolve(9))', expected: 1, async: true },
      { call: '(() => { const cache = {}; return getValue(cache, "b", key => Promise.resolve(key + "!")).then(value => [value, cache.b]); })()', expected: ['b!', 'b!'], label: 'a loaded value is stored', async: true },
      { call: '(() => { const result = getValue({ a: 1 }, "a", () => Promise.resolve(9)); return result instanceof Promise; })()', expected: true, label: 'a cached value still arrives as a promise', edge: true },
      { call: '(() => { let calls = 0; const load = () => { calls += 1; return Promise.resolve(5); }; const cache = {}; return getValue(cache, "x", load).then(() => getValue(cache, "x", load)).then(() => calls); })()', expected: 1, label: 'the second call reads the cache', edge: true, async: true },
      { call: 'getValue({ zero: 0 }, "zero", () => Promise.resolve(99))', expected: 0, label: 'a cached 0 is used', edge: true, async: true },
    ],
  },
  {
    id: 'js-easy3-user-then-posts',
    track: 'javascript',
    topic: 'javascript',
    level: 22,
    tier: 2,
    focus: ['async-await'],
    title: 'First the user, then the posts',
    prompt: 'Write an `async` function `loadProfile(loadUser, loadPosts)`. `loadUser()` resolves to `{ id, name }`, and `loadPosts(id)` resolves to that user’s posts as an array. The second call needs the id from the first, so `await` the user before asking for the posts. Return `{ name, postCount }`. If either call rejects, the promise `loadProfile` returns rejects with the same error.',
    starter: `const loadProfile = async (loadUser, loadPosts) => {

};

// Scratch pad. Change this and press Run.
loadProfile(() => Promise.resolve({ id: 7, name: "Ada" }), id => Promise.resolve(["a", "b"])).then(profile => console.log(profile));
`,
    skeleton: `const loadProfile = async (loadUser, loadPosts) => {
  const user = /* wait for the user */;
  const posts = /* wait for the posts of user.id */;
  return { name: user.name, postCount: /* how many posts */ };
};`,
    hints: ['Each `await` pauses the function until its promise settles, so the line after `const user = await loadUser()` can already use `user.id`.'],
    approach: [
      'Await `loadUser()` and keep the user.',
      'Await `loadPosts(user.id)`. This call cannot start before the user has arrived.',
      'Return the user’s name and the length of the posts array. You need no `try`: a rejection should reach the caller.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'loadProfile(() => Promise.resolve({ id: 7, name: "Ada" }), id => Promise.resolve(id === 7 ? ["a", "b"] : []))', expected: { name: 'Ada', postCount: 2 }, async: true },
      { call: '(() => { const asked = []; return loadProfile(() => Promise.resolve({ id: 4, name: "Kai" }), id => { asked.push(id); return Promise.resolve(["p"]); }).then(() => asked); })()', expected: [4], label: 'the posts are asked for once, with the user’s id', async: true },
      { call: 'loadProfile(() => Promise.resolve({ id: 3, name: "Lin" }), () => Promise.resolve([]))', expected: { name: 'Lin', postCount: 0 }, label: 'no posts', edge: true, async: true },
      { call: 'loadProfile(() => new Promise(resolve => setTimeout(() => resolve({ id: 1, name: "Slow" }), 20)), id => Promise.resolve(id === 1 ? ["x", "y", "z"] : []))', expected: { name: 'Slow', postCount: 3 }, label: 'a slow user is waited for', edge: true, async: true },
      { call: 'loadProfile(() => Promise.reject(new Error("no user")), () => Promise.resolve([])).catch(error => error.message)', expected: 'no user', label: 'a rejection reaches the caller', edge: true, async: true },
    ],
  },

  /* ── sort, as numbers ─────────────────────────────────────────────── */
  {
    id: 'js-easy3-sort-numbers',
    track: 'javascript',
    topic: 'javascript',
    level: 24,
    tier: 1,
    focus: ['sort'],
    title: 'Sort numbers as numbers',
    prompt: 'Write `sortNumbers(numbers)`, returning a new array of the numbers from smallest to largest. Without a compare function, `sort` compares items as text, so `[10, 9, 1].sort()` gives `[1, 10, 9]`. Pass a compare function that subtracts one number from the other, and sort a copy so `numbers` itself is not changed.',
    starter: `const sortNumbers = numbers => {

};

// Scratch pad. Change this and press Run.
console.log(sortNumbers([10, 9, 1, 100]));
`,
    skeleton: `const sortNumbers = numbers => {
  return [...numbers].sort(/* (a, b) => a negative number when a comes first */);
};`,
    hints: ['`sort((a, b) => a - b)` puts `a` first whenever the result is negative, so smaller numbers come first. `sort` changes the array it is called on, so copy it with `[...numbers]` first.'],
    approach: [
      'Copy the array with `[...numbers]` or `slice()`.',
      'Sort the copy with the compare function `(a, b) => a - b`.',
      'Return the sorted copy.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'sortNumbers([10, 9, 1, 100])', expected: [1, 9, 10, 100] },
      { call: 'sortNumbers([3, -2, 0])', expected: [-2, 0, 3], label: 'negative numbers' },
      { call: 'sortNumbers([5])', expected: [5], label: 'one number', edge: true },
      { call: 'sortNumbers([])', expected: [], label: 'no numbers', edge: true },
      { call: '(() => { const numbers = [3, 1, 2]; sortNumbers(numbers); return numbers; })()', expected: [3, 1, 2], label: 'the input keeps its order', edge: true },
    ],
  },
];
