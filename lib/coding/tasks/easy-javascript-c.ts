// The Easy band of the JavaScript track, third wave (#226).
//
// The matrix has shown no short JavaScript tag since the first wave. This one
// starts from its thinnest rows: callbacks, two pointers, flat and timers each
// sat at four Easy challenges and get two more, and nested loops, push, slice,
// for...in, recursion and higher-order functions get one each, so every tag on
// a Medium challenge now has at least six. The rest covers techniques the
// Coding home lists with two Easy JavaScript challenges or fewer: pop, shift,
// unshift, do...while, concat, join, forEach, some, find, includes, indexOf,
// findIndex, default parameters, JSON, and fetch, which had none.
//
// Same rules as the earlier waves: one technique per challenge (two focus tags
// at most), ten minutes or less, and a starter that fails its own checks. The
// first focus tag names the documentation page that ends the hint ladder.
// Solutions live in `../solutions/easy-javascript-c.ts`, and `EASY_BAND` in
// `../catalog.ts` lists this file. English only: there is no Czech overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';

export const EASY_JAVASCRIPT_C_TASKS: CodingTaskSource[] = [
  /* ── pop, shift and unshift ───────────────────────────────────────── */
  {
    id: 'js-easy4-undo-last',
    track: 'javascript',
    topic: 'javascript',
    level: 4,
    tier: 1,
    focus: ['pop'],
    title: 'Undo the last step',
    prompt: "An editor stores history in a dense ordinary array, oldest first. Write `undo(history)`, removing exactly its last entry in place and returning that entry unchanged. Entries may be any value, including `0`, `false`, an empty string, `null` or `undefined`; do not confuse these with an empty array. If the array is already empty, leave it empty and return `null`. `pop()` is one approach. Target: O(1) time per call under the ordinary array model, regardless of n, the current number of entries.",
    starter: `const undo = history => {

};

// Scratch pad. Change this and press Run.
const changes = ["type a", "type b"];
console.log(undo(changes), changes);
`,
    skeleton: `const undo = history => {
  if (/* nothing to undo */) return null;
  return /* the newest change, removed from history */;
};`,
    hints: ["Use the array's length to distinguish nothing to undo from an entry with an empty or falsey value. Only the last entry should disappear."],
    approach: [
      'Check `history.length`. When it is 0, return `null`.',
      'Otherwise call `history.pop()`. It removes the newest change and gives it back.',
      'Return what `pop` gave you. The caller’s array is now one shorter.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: '(() => { const history = ["type a", "type b", "bold"]; return [undo(history), history]; })()', expected: ['bold', ['type a', 'type b']] },
      { call: '(() => { const history = ["a", "b"]; undo(history); return undo(history); })()', expected: 'a', label: 'the second undo returns the change before' },
      { call: 'undo(["only"])', expected: 'only' },
      { call: 'undo([])', expected: null, label: 'nothing to undo gives null', edge: true },
      { call: '(() => { const history = ["x"]; undo(history); return [undo(history), history]; })()', expected: [null, []], label: 'undo after the last change', edge: true },
    ],
  },
  {
    id: 'js-easy4-recent-searches',
    track: 'javascript',
    topic: 'javascript',
    level: 4,
    tier: 2,
    focus: ['unshift', 'pop'],
    title: 'Recent searches',
    prompt: "A search box shows the latest searches first and remembers at most `max` of them. Write `addSearch(recent, term, max)`, which puts `term` at the front of `recent` with `unshift`, then removes searches from the end with `pop` until no more than `max` are left. It changes `recent` in place and returns it. `addSearch([\"css\", \"html\"], \"js\", 2)` gives `[\"js\", \"css\"]`. `recent` is a mutable dense array of primitive strings; `term` is a primitive string and `max` is an integer from 0 through 10000. Keep duplicates and empty terms as separate searches, preserving their order. The result must be the same array, including when max is zero. Target: O(n) time, where n is the original number of searches; moving or removing one stored reference takes constant time.",
    starter: `const addSearch = (recent, term, max) => {

};

// Scratch pad. Change this and press Run.
console.log(addSearch(["css", "html"], "js", 2));
`,
    skeleton: `const addSearch = (recent, term, max) => {
  // put term at the front
  while (/* more than max searches */) {
    // drop the oldest one from the end
  }
  return recent;
};`,
    hints: ['`unshift` adds to the front and moves every other item one place along. `pop` takes the last, oldest item off. A `while` loop keeps popping for as long as the list is too long.'],
    approach: [
      'Call `recent.unshift(term)` so the newest search comes first.',
      'While `recent.length` is greater than `max`, call `recent.pop()`.',
      'Return `recent`, the same array you were given.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'addSearch(["css", "html"], "js", 2)', expected: ['js', 'css'] },
      { call: 'addSearch(["css"], "js", 5)', expected: ['js', 'css'], label: 'room to spare keeps everything' },
      { call: '(() => { const recent = ["a", "b", "c"]; addSearch(recent, "d", 3); return recent; })()', expected: ['d', 'a', 'b'], label: 'the list changes in place' },
      { call: 'addSearch([], "first", 3)', expected: ['first'], label: 'the first search', edge: true },
      { call: 'addSearch(["a", "b"], "c", 0)', expected: [], label: 'a max of 0 keeps nothing', edge: true },
      { call: "addSearch([\"a\",\"a\",\"\"],\"a\",4)", expected: ["a", "a", "a", ""], label: "duplicates and empty search terms", edge: true },
      { call: "(() => { const recent=[\"a\",\"b\"]; const result=addSearch(recent,\"\",0); return result===recent&&recent.length===0; })()", expected: true, label: "zero limit preserves the array identity", edge: true },
      { call: "(() => { const recent=Array.from({length:128},(_,i)=>String(i)); const result=addSearch(recent,\"new\",1); return result===recent&&recent.length===1&&recent[0]===\"new\"; })()", expected: true, label: "remove every excess search", edge: true },
      { call: "addSearch([],\"\",10000)", expected: [""], label: "empty term is a search", edge: true },
    ],
  },
  {
    id: 'js-easy4-split-command',
    track: 'javascript',
    topic: 'javascript',
    level: 4,
    tier: 1,
    focus: ['shift'],
    title: 'Split off the command',
    prompt: "Write `readCommand(words)` for a dense array of strings. Return a new object `{ command, args }`: the first string unchanged as command, and a new array of the remaining strings in order. Preserve the caller's array, even if the result is edited later. An empty input gives `{ command: null, args: [] }` with a new args array; an empty first string remains `\"\"`. If you use `shift()`, work on a copy. Target: O(n) time, where n is the number of input strings.",
    starter: `const readCommand = words => {

};

// Scratch pad. Change this and press Run.
console.log(readCommand(["add", "milk", "eggs"]));
`,
    skeleton: `const readCommand = words => {
  const args = [...words];
  const command = /* the first word, taken off args */;
  return { command: /* command, or null when there was none */, args };
};`,
    hints: ["Taking a word from the front changes an array if you use shift. Protect the caller's array and distinguish an empty first word from no first word."],
    approach: [
      'Copy the words with `[...words]`.',
      'Call `shift()` on the copy. What it returns is the command, and the copy now holds only the arguments.',
      'Return `{ command, args }`, turning a missing command into `null`.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'readCommand(["add", "milk", "eggs"])', expected: { command: 'add', args: ['milk', 'eggs'] } },
      { call: 'readCommand(["help"])', expected: { command: 'help', args: [] }, label: 'a command with no arguments' },
      { call: 'readCommand([])', expected: { command: null, args: [] }, label: 'no words at all', edge: true },
      { call: '(() => { const words = ["say", "hi"]; readCommand(words); return words; })()', expected: ['say', 'hi'], label: 'the input is not changed', edge: true },
    ],
  },

  /* ── concat and join ──────────────────────────────────────────────── */
  {
    id: 'js-easy4-header-and-footer',
    track: 'javascript',
    topic: 'javascript',
    level: 4,
    tier: 1,
    focus: ['concat'],
    title: 'Add a header and a footer',
    prompt: "A table is an array of rows. Write `framed(rows, header, footer)`, returning a new array with `header` first, then every row, then `footer`, using `concat`. `framed([\"a\", \"b\"], \"Name\", \"End\")` gives `[\"Name\", \"a\", \"b\", \"End\"]`. A row, the header or the footer can itself be an array of cells, and each one stays a single item. `rows` is not changed. Inputs are ordinary dense arrays and data values, without custom concat behavior. Keep the original row, header and footer references; this is a shallow copy. Do not change any input, including nested values; frozen inputs are valid. Target: O(n) time, where n is the number of rows; copying a reference takes constant time.",
    starter: `const framed = (rows, header, footer) => {

};

// Scratch pad. Change this and press Run.
console.log(framed(["a", "b"], "Name", "End"));
`,
    skeleton: `const framed = (rows, header, footer) => {
  return [header].concat(/* the rows, then the footer as one item */);
};`,
    hints: ["`concat` adds an array argument one level deep. How can you pass an array-valued footer as one item? The new outer array should still refer to the original rows."],
    approach: [
      'Start from an array holding only the header: `[header]`.',
      'Call `concat` on it with `rows` and `[footer]`. The rows are added one by one; the wrapped footer is added as one item.',
      'Return the new array. `rows` is not changed.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'framed(["a", "b"], "Name", "End")', expected: ['Name', 'a', 'b', 'End'] },
      { call: 'framed([], "Name", "End")', expected: ['Name', 'End'], label: 'no rows', edge: true },
      { call: 'framed([["Ada", 36], ["Lin", 29]], ["name", "age"], ["total", 65])', expected: [['name', 'age'], ['Ada', 36], ['Lin', 29], ['total', 65]], label: 'rows, header and footer that are arrays each stay one item', edge: true },
      { call: '(() => { const rows = ["x"]; framed(rows, "H", "F"); return rows; })()', expected: ['x'], label: 'rows is not changed', edge: true },
      { call: "(() => { const row={id:1},h=[\"H\"],f=[\"F\"]; const rows=Object.freeze([row,row]); const out=framed(rows,h,f); return Array.isArray(out)&&out!==rows&&out.length===4&&out[0]===h&&out[1]===row&&out[2]===row&&out[3]===f&&row.id===1&&h.length===1&&f.length===1; })()", expected: true, label: "shallow references, duplicate rows and frozen input", edge: true },
      { call: "(() => { const rows=[]; return framed(rows,0,false)!==rows; })()", expected: true, label: "fresh result for no rows", edge: true },
    ],
  },
  {
    id: 'js-easy4-csv-line',
    track: 'javascript',
    topic: 'javascript',
    level: 4,
    tier: 1,
    focus: ['join'],
    title: 'One line of CSV',
    prompt: "Write `toCsvLine(values)`, returning the values as one line of text with a comma between each pair, using `join`. `toCsvLine([\"Ada\", 36, \"London\"])` gives `\"Ada,36,London\"`. A missing value must leave an empty cell, and `join` already writes `null` and `undefined` as empty text: `toCsvLine([\"Ada\", null, \"London\"])` gives `\"Ada,,London\"`. No values give an empty string. This is a restricted CSV exercise: values are primitive strings without commas, double quotes, carriage returns or newlines, finite numbers, booleans, null or undefined, in a dense array. Quoting and escaping arbitrary CSV fields are outside this task. Do not change the input; frozen arrays are valid. Target: O(n) time, where n is the number of cells plus the total length of their text in UTF-16 code units, using a linear join implementation.",
    starter: `const toCsvLine = values => {

};

// Scratch pad. Change this and press Run.
console.log(toCsvLine(["Ada", null, "London"]));
`,
    skeleton: `const toCsvLine = values => {
  const separator = /* the text that goes between two values */;
  return values.join(separator);
};`,
    hints: ['`join` turns every item into text and puts the separator between them. It writes `null` and `undefined` as nothing at all, where `"" + null` would give the word `"null"`.'],
    approach: [
      "A plain join is sufficient only because these fields exclude CSV delimiter, quote and line-break characters. A general CSV writer would need quoting and escaping.",
      'Call `join` on the values.',
      'Pass `","` as the separator. Without an argument, `join` uses a comma too, but saying so makes the format clear.',
      'Return the text. An empty array joins to an empty string, so it needs no special case.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'toCsvLine(["Ada", 36, "London"])', expected: 'Ada,36,London' },
      { call: 'toCsvLine(["only"])', expected: 'only', label: 'one value has no comma' },
      { call: 'toCsvLine(["Ada", null, "London"])', expected: 'Ada,,London', label: 'null is an empty cell', edge: true },
      { call: 'toCsvLine([undefined, "x"])', expected: ',x', label: 'undefined is an empty cell too', edge: true },
      { call: 'toCsvLine([])', expected: '', label: 'no values', edge: true },
      { call: "(() => { const values=[\"left\",null,\"right\"]; const line=toCsvLine(values); return line===\"left,,right\"&&values.length===3&&values[0]===\"left\"&&values[1]===null&&values[2]===\"right\"; })()", expected: true, label: "joining preserves input order and missing cells", edge: true },
      { call: "toCsvLine(Object.freeze([\"\",false,0,undefined,\"🦈\"]))", expected: ",false,0,,🦈", label: "frozen mixed cells", edge: true },
      { call: "toCsvLine([null,undefined,\"\"])", expected: ",,", label: "three empty cells", edge: true },
      { call: "toCsvLine([\"  Ada  \", -1.5, true])", expected: "  Ada  ,-1.5,true", label: "keep spaces and primitive conversion", edge: true },
    ],
  },

  /* ── slice ────────────────────────────────────────────────────────── */
  {
    id: 'js-easy4-last-few',
    track: 'javascript',
    topic: 'javascript',
    level: 4,
    tier: 1,
    focus: ['slice'],
    title: 'The last few',
    prompt: "Write `lastFew(items, n)`, returning a new array of the last `n` items, using `slice` with a negative start. `lastFew([\"a\", \"b\", \"c\", \"d\"], 2)` gives `[\"c\", \"d\"]`. Asking for more items than there are gives them all. Watch one edge: an `n` of 0 must give `[]`, but `slice(-0)` is the same as `slice(0)` and copies the whole array. `items` is an ordinary dense array and `n` is an integer from 0 through 10000 (including numeric -0). Always create a fresh outer array, even for empty input; preserve the selected item references, order and repeats. Do not change the input or nested values; frozen arrays are valid. Target: O(n) time in the worst case, where n in this complexity statement is the number of input items, distinct from the requested count parameter. Copying each reference takes constant time.",
    starter: `const lastFew = (items, n) => {

};

// Scratch pad. Change this and press Run.
console.log(lastFew(["a", "b", "c", "d"], 2));
`,
    skeleton: `const lastFew = (items, n) => {
  if (/* n is 0 */) return [];
  return items.slice(/* a negative start */);
};`,
    hints: ["A negative start counts back from the end. Decide what zero should return before using that start; then think about how copying differs from reusing the original array."],
    approach: [
      'When `n` is 0, return `[]`.',
      'Otherwise call `items.slice(-n)`. A start further back than the first item starts at the first item.',
      'Return the copy. `slice` never changes `items`.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'lastFew(["a", "b", "c", "d"], 2)', expected: ['c', 'd'] },
      { call: 'lastFew([1, 2, 3], 1)', expected: [3] },
      { call: 'lastFew([1, 2], 5)', expected: [1, 2], label: 'more than there are gives them all', edge: true },
      { call: 'lastFew([1, 2, 3], 0)', expected: [], label: 'none asked for', edge: true },
      { call: '(() => { const items = [1, 2, 3]; lastFew(items, 2); return items; })()', expected: [1, 2, 3], label: 'items is not changed', edge: true },
      { call: "(() => { const item={id:1}; const items=Object.freeze([0,item,item]); const out=lastFew(items,2); return out!==items&&out.length===2&&out[0]===item&&out[1]===item&&item.id===1; })()", expected: true, label: "shallow copy with repeated references", edge: true },
      { call: "(() => { const items=[]; const out=lastFew(items,3); return Array.isArray(out)&&out!==items&&out.length===0; })()", expected: true, label: "fresh empty result", edge: true },
      { call: "lastFew([1,2],-0)", expected: [], label: "numeric negative zero", edge: true },
      { call: "lastFew([1,2],10000)", expected: [1, 2], label: "maximum requested count", edge: true },
    ],
  },

  /* ── do...while ───────────────────────────────────────────────────── */
  {
    id: 'js-easy4-count-digits',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 1,
    focus: ['do-while'],
    title: 'Count the digits',
    prompt: "Write `countDigits(n)` for a whole number `n` of 0 or more, returning how many digits it has. Use a `do...while` loop: count one digit, divide `n` by 10 and round down with `Math.floor`, and repeat while `n` is still above 0. `countDigits(2026)` gives 4. The number 0 has one digit, and a `do...while` gets that right because its body always runs once. The input is an integer from 0 through Number.MAX_SAFE_INTEGER (9007199254740991); numeric -0 also counts as zero. Negative, fractional and non-finite inputs are outside this task. Target: O(log n) time for positive n, where n is the numeric value, counting each division and rounding as constant time; zero takes O(1). Near powers of ten, floating-point logarithms may round to the wrong side of the boundary, so repeated integer division is a reliable approach.",
    starter: `const countDigits = n => {

};

// Scratch pad. Change this and press Run.
console.log(countDigits(2026), countDigits(0));
`,
    skeleton: `const countDigits = n => {
  let digits = 0;
  do {
    // count one digit and drop it from n
  } while (/* digits are left */);
  return digits;
};`,
    hints: ['A `while` loop checks its condition first, so for 0 it would never run and would count no digits. A `do...while` runs its body once before the first check.'],
    approach: [
      'Start a counter at 0.',
      'In the `do` block, add 1 to the counter and set `n` to `Math.floor(n / 10)`.',
      'Close with `while (n > 0)` and return the counter.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'countDigits(2026)', expected: 4 },
      { call: 'countDigits(7)', expected: 1, label: 'one digit' },
      { call: 'countDigits(123456789)', expected: 9 },
      { call: 'countDigits(0)', expected: 1, label: 'zero has one digit', edge: true },
      { call: 'countDigits(1000)', expected: 4, label: 'zeros at the end count', edge: true },
      { call: "countDigits(999999999999999)", expected: 15, label: "just below a large power of ten", edge: true },
      { call: "countDigits(1000000000000000)", expected: 16, label: "large power of ten", edge: true },
      { call: "countDigits(Number.MAX_SAFE_INTEGER)", expected: 16, label: "largest safe integer", edge: true },
      { call: "countDigits(-0)", expected: 1, label: "negative zero has one digit", edge: true },
      { call: "countDigits(87654321)", expected: 8, label: "an unseen ordinary input", edge: true },
    ],
  },
  {
    id: 'js-easy4-every-page',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 2,
    focus: ['do-while', 'push'],
    title: 'Read every page',
    prompt: "An API returns results one page at a time. `getPage(number)` returns `{ items, next }`: the page’s items, and the number of the page after it, or `null` on the last page. Write `readAll(getPage)`, which starts at page 1, collects every item in order and returns them in one array. You only learn whether there is another page after reading one, so use a `do...while` loop that stops once `next` is `null`, and add each page’s items with `push`. This callback is synchronous, not a network request: getPage always returns a valid ordinary data object. Page 1 exists, and following next forms a finite acyclic chain of positive integer page numbers ending in null; the next number may skip or decrease. There are at most 10000 pages and 10000 item entries overall, with at most 1000 items per page. Each items array is ordinary and dense; empty pages do not end the chain. Call getPage exactly once for each page in chain order and never for null. Return a fresh shallow array, preserving item references, repeats and nested array values; do not change page objects, their arrays or stored values, and accept frozen pages. Target: O(n) time, where n is the page count plus total item count, assuming constant-time getPage lookup and reference copying.",
    starter: `const readAll = getPage => {

};

// Scratch pad. Change this and press Run.
const pages = { 1: { items: ["a", "b"], next: 2 }, 2: { items: ["c"], next: null } };
console.log(readAll(number => pages[number]));
`,
    skeleton: `const readAll = getPage => {
  const items = [];
  let pageNumber = 1;
  do {
    const page = getPage(pageNumber);
    // add the page's items, then move pageNumber to the next page
  } while (/* there is a next page */);
  return items;
};`,
    hints: ["Read the first page before checking its next link. Keep collecting even when a page has no items, and follow the returned number exactly; page numbers need not increase."],
    approach: [
      'Keep an empty result array and a page number that starts at 1.',
      'In the `do` block, fetch the page, push its items onto the result, and set the page number to `page.next`.',
      'Loop `while` the page number is not `null`, then return the result. Use the number `next` gives you: it can skip numbers.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'readAll(n => ({ 1: { items: ["a", "b"], next: 2 }, 2: { items: ["c"], next: null } })[n])', expected: ['a', 'b', 'c'] },
      { call: 'readAll(() => ({ items: ["only"], next: null }))', expected: ['only'], label: 'a single page' },
      { call: '(() => { const asked = []; readAll(n => { asked.push(n); return { items: [n], next: n < 3 ? n + 1 : null }; }); return asked; })()', expected: [1, 2, 3], label: 'each page is asked for once, starting at 1' },
      { call: 'readAll(() => ({ items: [], next: null }))', expected: [], label: 'the first page is empty', edge: true },
      { call: 'readAll(n => ({ 1: { items: ["x"], next: 5 }, 5: { items: ["y"], next: null } })[n])', expected: ['x', 'y'], label: 'next can skip page numbers', edge: true },
      { call: "(() => {const asked=[],pages={1:{items:[\"a\"],next:7},7:{items:[],next:3},3:{items:[\"b\"],next:null}};const out=readAll(n=>{asked.push(n);return pages[n];});return [out,asked];})()", expected: [["a", "b"], [1, 7, 3]], label: "empty middle page and decreasing next number", edge: true },
      { call: "(() => {const value={id:1},nested=[1,2],items=Object.freeze([value,nested,value]),page=Object.freeze({items,next:null});const out=readAll(()=>page);return out!==items&&out.length===3&&out[0]===value&&out[1]===nested&&out[2]===value&&value.id===1&&nested.length===2;})()", expected: true, label: "frozen page shallow references and nested array leaf", edge: true },
      { call: "(() => {const items=[\"b\",\"a\"],page={items,next:null};readAll(()=>page);return page.items===items&&items[0]===\"b\"&&items[1]===\"a\";})()", expected: true, label: "page items stay unchanged", edge: true },
      { call: "(() => {const items=[],page={items,next:null};const first=readAll(()=>page),second=readAll(()=>page);return first!==items&&first!==second&&first.length===0&&second.length===0;})()", expected: true, label: "fresh empty collections", edge: true },
    ],
  },

  /* ── forEach ──────────────────────────────────────────────────────── */
  {
    id: 'js-easy4-place-totals',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 1,
    focus: ['forEach'],
    title: 'Even places and odd places',
    prompt: "Write `placeTotals(numbers)`, returning `{ even, odd }`: the sum of the numbers at even positions (0, 2, 4 and so on) and the sum of those at odd positions (1, 3, 5 and so on). Use `forEach`, whose callback receives each number’s index as its second argument. `placeTotals([5, 1, 4, 2])` gives `{ even: 9, odd: 3 }`. The position decides, not whether the number is even. An empty array gives `{ even: 0, odd: 0 }`. The input is an ordinary dense array of at most 10000 integers between -1000000 and 1000000; each sum remains exactly representable as a Number. Do not change the array; frozen inputs are valid. Return a fresh totals object on every call. Target: O(n) time, where n is the number of array entries and addition/index arithmetic take constant time.",
    starter: `const placeTotals = numbers => {

};

// Scratch pad. Change this and press Run.
console.log(placeTotals([5, 1, 4, 2]));
`,
    skeleton: `const placeTotals = numbers => {
  const totals = { even: 0, odd: 0 };
  numbers.forEach((number, index) => {
    // add number to totals.even or totals.odd, depending on index
  });
  return totals;
};`,
    hints: ["Keep separate totals for the two index groups. The callback receives value before index; decide which of those two arguments should determine the group."],
    approach: [
      'Start with `{ even: 0, odd: 0 }`.',
      'Call `forEach` with a callback that takes `(number, index)`.',
      'Add the number to `even` when `index % 2 === 0`, otherwise to `odd`, and return the totals after the loop.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'placeTotals([5, 1, 4, 2])', expected: { even: 9, odd: 3 } },
      { call: 'placeTotals([1, 1, 1, 1, 1])', expected: { even: 3, odd: 2 } },
      { call: 'placeTotals([2, 3, 2, 3])', expected: { even: 4, odd: 6 }, label: 'the position decides, not the number' },
      { call: 'placeTotals([7])', expected: { even: 7, odd: 0 }, label: 'one number sits at position 0', edge: true },
      { call: 'placeTotals([])', expected: { even: 0, odd: 0 }, label: 'no numbers', edge: true },
      { call: "(() => {const ns=[5,2,-7,3];const out=placeTotals(ns);return out.even===-2&&out.odd===5&&ns.length===4&&ns[0]===5&&ns[1]===2&&ns[2]===-7&&ns[3]===3;})()", expected: true, label: "preserve signed input order", edge: true },
      { call: "placeTotals(Object.freeze([-1,0,2,-3,4]))", expected: {"even": 5, "odd": -3}, label: "frozen signed integers", edge: true },
      { call: "(() => {const first=placeTotals([1]),second=placeTotals([2]);return first!==second&&first.even===1&&first.odd===0&&second.even===2;})()", expected: true, label: "independent results across calls", edge: true },
      { call: "(() => {const out=placeTotals(Array(10000).fill(1000000));return out.even===5000000000&&out.odd===5000000000;})()", expected: true, label: "exact upper-bound sums", edge: true },
    ],
  },

  /* ── nested loops ─────────────────────────────────────────────────── */
  {
    id: 'js-easy4-grid-differences',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 2,
    focus: ['nested-loops'],
    title: 'Spot the differences',
    prompt: "Two grids have the same number of rows, and each row is the same length in both. Write `differences(a, b)`, returning the `[row, column]` position of every cell where the grids differ, compared with `!==`, row by row and left to right. Use one loop over the rows and a second loop inside it over that row’s columns. `differences([[1, 2], [3, 4]], [[1, 0], [3, 5]])` gives `[[0, 1], [1, 1]]`. Identical grids give `[]`. Both levels are ordinary dense arrays of data values. Rows may differ in length, but each corresponding pair of rows has the same length, with at most 100 rows and 100 cells per row. Use JavaScript strict inequality: NaN differs from NaN, 0 and -0 do not differ, and objects compare by reference. Treat comparison as constant-time for this exercise. Do not change either grid, its rows or stored values; frozen inputs are valid. Return a fresh outer list and a separate fresh coordinate pair for each difference. Target: O(n²) time, where n is the larger of the row count and the widest row length; each cell is compared once, so the actual work is proportional to rows plus visited cells and is bounded by this maximum-dimension model.",
    starter: `const differences = (a, b) => {

};

// Scratch pad. Change this and press Run.
console.log(differences([[1, 2], [3, 4]], [[1, 0], [3, 5]]));
`,
    skeleton: `const differences = (a, b) => {
  const found = [];
  for (let row = 0; row < a.length; row++) {
    for (let column = 0; /* every column of this row */; column++) {
      // record [row, column] when the two cells differ
    }
  }
  return found;
};`,
    hints: ['The outer loop picks a row and the inner loop walks across it. The inner loop’s limit is the length of the current row, `a[row].length`, which need not equal the number of rows.'],
    approach: [
      'Loop over the row indexes of `a`.',
      'Inside, loop over the column indexes of `a[row]`.',
      'When `a[row][column] !== b[row][column]`, push `[row, column]`. Return the list after both loops.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'differences([[1, 2], [3, 4]], [[1, 0], [3, 5]])', expected: [[0, 1], [1, 1]] },
      { call: 'differences([[1, 2, 3]], [[0, 2, 0]])', expected: [[0, 0], [0, 2]], label: 'one row' },
      { call: 'differences([[1], [2], [3]], [[1], [9], [3]])', expected: [[1, 0]], label: 'one column' },
      { call: 'differences([["x", "o"], ["o", "x"]], [["x", "o"], ["o", "x"]])', expected: [], label: 'identical grids', edge: true },
      { call: 'differences([], [])', expected: [], label: 'empty grids', edge: true },
      { call: "differences([[NaN,0,\"1\"]],[[NaN,-0,1]])", expected: [[0, 0], [0, 2]], label: "strict NaN zero and string semantics", edge: true },
      { call: "(() => {const shared={id:1};return differences([[shared,{id:1}]],[[shared,{id:1}]]);})()", expected: [[0, 1]], label: "object reference comparison", edge: true },
      { call: "differences([[],[1,2],[]],[[],[0,2],[]])", expected: [[1, 0]], label: "matching ragged row shapes", edge: true },
      { call: "differences(Object.freeze([Object.freeze([1,2])]),Object.freeze([Object.freeze([0,2])]))", expected: [[0, 0]], label: "frozen grids", edge: true },
      { call: "(() => {const a=[[1],[2]],b=[[3],[4]];const out=differences(a,b);return out!==a&&out!==b&&out[0]!==out[1]&&a[0][0]===1&&a[1][0]===2&&b[0][0]===3&&b[1][0]===4;})()", expected: true, label: "independent coordinates and unchanged sources", edge: true },
    ],
  },

  /* ── two pointers ─────────────────────────────────────────────────── */
  {
    id: 'js-easy4-letters-in-order',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 2,
    focus: ['two-pointer', 'strings'],
    title: 'Letters in the same order',
    prompt: "Write `inOrder(short, long)`, returning `true` when every character of `short` appears in `long` in the same order, though not necessarily side by side. `inOrder(\"ace\", \"abcde\")` gives `true`, and `inOrder(\"aec\", \"abcde\")` gives `false`. Keep one index in each string: move the `long` index on every step, and move the `short` index only when the two characters match. Each character of `long` can be used once. An empty `short` is always in order. Both inputs are primitive strings. This indexing exercise compares UTF-16 code units, the units used by string brackets and .length, rather than whole Unicode code points or visible graphemes. Case and spelling are exact; do not normalize or sort. A surrogate half can therefore match one indexed unit of a surrogate pair. Target: O(n) time, where n is the sum of the two UTF-16 string lengths and indexed comparison takes constant time.",
    starter: `const inOrder = (short, long) => {

};

// Scratch pad. Change this and press Run.
console.log(inOrder("ace", "abcde"), inOrder("aec", "abcde"));
`,
    skeleton: `const inOrder = (short, long) => {
  let i = 0; // the next character of short to find
  for (let j = 0; j < long.length; j++) {
    // when short[i] matches long[j], move i on
  }
  return /* whether i reached the end of short */;
};`,
    hints: ["The short-string index records the next UTF-16 unit you still need. Move it only on a match, while the long-string index moves forward; using for...of on only one string would mix code points with indexed units."],
    approach: ["Start i at zero for short and scan long by indexed UTF-16 units.", "When short[i] equals long[j], advance i. Advance j on every scanned unit; earlier long positions cannot be reused.", "Return whether i reached short.length. Keep the same unit model in every variant: for...of yields whole surrogate pairs, whereas brackets index individual code units."],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'inOrder("ace", "abcde")', expected: true },
      { call: 'inOrder("aec", "abcde")', expected: false, label: 'the order matters' },
      { call: 'inOrder("", "abc")', expected: true, label: 'an empty short string', edge: true },
      { call: 'inOrder("abc", "")', expected: false, label: 'an empty long string', edge: true },
      { call: 'inOrder("aa", "a")', expected: false, label: 'a character is used once', edge: true },
      { call: "inOrder(\"🦈\",\"x🦈y\")", expected: true, label: "surrogate pairs can match as two indexed units", edge: true },
      { call: "inOrder(\"\\ud83e\",\"🦈\")", expected: true, label: "the stated unit is a UTF-16 code unit", edge: true },
      { call: "inOrder(\"🦈\",\"\\ud83ex\\udd88\")", expected: true, label: "subsequence units need not be adjacent", edge: true },
      { call: "inOrder(\"A\",\"a\")", expected: false, label: "case is exact", edge: true },
      { call: "inOrder(\"é\",\"e\\u0301\")", expected: false, label: "no normalization", edge: true },
      { call: "inOrder(\"aba\",\"aaab\")", expected: false, label: "multiplicity and order both matter", edge: true },
    ],
  },
  {
    id: 'js-easy4-mirror-lists',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 2,
    focus: ['two-pointer'],
    title: 'Mirror images',
    prompt: "Write `isMirror(a, b)`, returning `true` when `b` holds the items of `a` in reverse order. Walk with two indexes: one moves forwards through `a` from the start, the other backwards through `b` from the end, and stop at the first pair that differs. Lists of different lengths are never mirrors. `isMirror([1, 2, 3], [3, 2, 1])` gives `true`. Neither list is changed. Inputs are ordinary dense arrays of data values; frozen arrays are valid. Compare each pair with strict equality, so NaN never matches itself, 0 and -0 match, and distinct objects with the same fields still differ. Assume constant-time comparison for this exercise. Do not mutate either array or nested values. Target: O(n) time in the worst case, where n is the larger input length; differing lengths or an early mismatch can take less.",
    starter: `const isMirror = (a, b) => {

};

// Scratch pad. Change this and press Run.
console.log(isMirror([1, 2, 3], [3, 2, 1]));
`,
    skeleton: `const isMirror = (a, b) => {
  if (/* the lengths differ */) return false;
  for (let i = 0, j = b.length - 1; i < a.length; i++, j--) {
    // compare a[i] with b[j]
  }
  return true;
};`,
    hints: ['Start `i` at 0 and `j` at `b.length - 1`, then move them in opposite directions. Check the lengths first: a shorter `b` can match every pair you compare and still not be a mirror.'],
    approach: [
      'Return `false` when `a.length !== b.length`.',
      'Walk `i` forwards from 0 and `j` backwards from `b.length - 1` together.',
      'Return `false` at the first `a[i] !== b[j]`, and `true` if the walk finishes.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'isMirror([1, 2, 3], [3, 2, 1])', expected: true },
      { call: 'isMirror([1, 2, 3], [3, 1, 2])', expected: false },
      { call: 'isMirror([1, 2], [2, 1, 0])', expected: false, label: 'different lengths', edge: true },
      { call: 'isMirror([], [])', expected: true, label: 'two empty lists', edge: true },
      { call: '(() => { const a = [1, 2]; const b = [2, 1]; isMirror(a, b); return [a, b]; })()', expected: [[1, 2], [2, 1]], label: 'neither list is changed', edge: true },
      { call: "isMirror([NaN],[NaN])", expected: false, label: "NaN does not match itself", edge: true },
      { call: "isMirror([0],[-0])", expected: true, label: "both zero signs match", edge: true },
      { call: "isMirror([{id:1}],[{id:1}])", expected: false, label: "distinct object references differ", edge: true },
      { call: "(() => {const item={id:1};return isMirror(Object.freeze([item,\"x\"]),Object.freeze([\"x\",item]));})()", expected: true, label: "shared references and frozen arrays", edge: true },
      { call: "(() => {const a=[1,2,3],b=[3,2,1];const out=isMirror(a,b);return out===true&&a[0]===1&&a[2]===3&&b[0]===3&&b[2]===1;})()", expected: true, label: "successful comparisons preserve longer arrays", edge: true },
    ],
  },

  /* ── flat ─────────────────────────────────────────────────────────── */
  {
    id: 'js-easy4-flatten-all',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 1,
    focus: ['flat'],
    title: 'Flatten every level',
    prompt: "Write `flattenAll(list)`, returning a fresh array with all nested array levels removed in left-to-right order. `flattenAll([1, [2, [3, [4]]]])` gives `[1, 2, 3, 4]`. Use flat with an unbounded depth setting; empty nested arrays add nothing. Inputs are finite ordinary dense arrays, with no cyclic arrays, at most 100 nesting levels and at most 10000 visited array entries. If an array is referenced twice, visit that branch twice. Non-array values, including objects, null and undefined, stay as single values with their original references. Do not change any input array or nested value; frozen arrays are valid. Always return a new array, including for already flat or empty input. Target: O(n) time, where n counts visited array entries and array nodes by occurrence, assuming constant-time reference copying.",
    starter: `const flattenAll = list => {

};

// Scratch pad. Change this and press Run.
console.log(flattenAll([1, [2, [3, [4]]]]));
`,
    skeleton: `const flattenAll = list => {
  return list.flat(/* a depth no nesting can exceed */);
};`,
    hints: ["The depth argument controls how many nested array levels flat removes. Choose a value that does not stop at a fixed finite depth; remember that non-array objects are leaves, not structures to traverse."],
    approach: ["Call flat on the original list with Infinity as its depth. This input domain is finite and acyclic, so all array branches eventually end.", "Return its fresh result; flat copies leaf references without traversing non-array objects. It preserves order and repeated occurrences.", "Avoid repeatedly flattening one level at a time: that can rescan a growing result for each nesting level. The single traversal target counts every visited array entry and node."],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'flattenAll([1, [2, [3, [4]]]])', expected: [1, 2, 3, 4] },
      { call: 'flattenAll([[["deep"]], "top"])', expected: ['deep', 'top'] },
      { call: 'flattenAll([1, 2, 3])', expected: [1, 2, 3], label: 'nothing to flatten', edge: true },
      { call: 'flattenAll([[], [[]]])', expected: [], label: 'empty arrays disappear', edge: true },
      { call: '(() => { const list = [1, [2]]; flattenAll(list); return list; })()', expected: [1, [2]], label: 'list is not changed', edge: true },
      { call: "(() => {let list=[\"deep\"];for(let i=0;i<32;i++)list=[list];return flattenAll(list);})()", expected: ["deep"], label: "more than six nesting levels", edge: true },
      { call: "(() => {const value={id:1},inner=Object.freeze([value,null,undefined]),list=Object.freeze([inner,inner]);const out=flattenAll(list);return out!==list&&out!==inner&&out.length===6&&out[0]===value&&out[1]===null&&out[2]===undefined&&out[3]===value&&value.id===1;})()", expected: true, label: "frozen repeated branches preserve non-array references", edge: true },
      { call: "(() => {const list=[];const first=flattenAll(list),second=flattenAll(list);return first!==list&&first!==second&&first.length===0&&second.length===0;})()", expected: true, label: "fresh empty arrays", edge: true },
    ],
  },
  {
    id: 'js-easy4-expand-ranges',
    track: 'javascript',
    topic: 'javascript',
    level: 6,
    tier: 2,
    focus: ['flat'],
    title: 'Expand the ranges',
    prompt: "A list stores inclusive integer ranges as [from, to] pairs. Write `expand(ranges)`, returning every integer in range order, using flatMap to join each range's numbers. `expand([[1, 3], [7, 8]])` gives `[1, 2, 3, 7, 8]`. Equal endpoints give one number; reversed endpoints add nothing. Keep repeated numbers from overlapping or repeated ranges. Inputs are ordinary dense arrays of two-integer pairs, with endpoints from -10000 through 10000, at most 10000 ranges and at most 10000 produced numbers overall. Do not change either input level; frozen arrays are valid. Return a fresh array even for empty input. Target: O(n) time, where n is the number of ranges plus the number of produced integers; integer increments and copies take constant time.",
    starter: `const expand = ranges => {

};

// Scratch pad. Change this and press Run.
console.log(expand([[1, 3], [7, 8]]));
`,
    skeleton: `const expand = ranges => {
  return ranges.flatMap(([from, to]) => {
    const pages = [];
    // push every page from "from" to "to", both included
    return pages;
  });
};`,
    hints: ['`flatMap` is `map` followed by `flat()` with a depth of 1. The callback may return an array of any length, and its items land side by side in the result.'],
    approach: [
      'Call `flatMap` on the ranges, taking each range apart as `[from, to]`.',
      'In the callback, build an array of the numbers from `from` to `to` with a `for` loop that stops after `to`.',
      'Return that array from the callback. `flatMap` joins the arrays in order.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'expand([[1, 3], [7, 8]])', expected: [1, 2, 3, 7, 8] },
      { call: 'expand([[10, 12], [2, 3]])', expected: [10, 11, 12, 2, 3], label: 'ranges keep the order given' },
      { call: 'expand([[4, 4]])', expected: [4], label: 'both ends equal', edge: true },
      { call: 'expand([])', expected: [], label: 'no ranges', edge: true },
      { call: "expand([[2,3],[3,4],[2,2]])", expected: [2, 3, 3, 4, 2], label: "overlap and repeated values remain in range order", edge: true },
      { call: "expand([[4,2],[-1,0],[0,0]])", expected: [-1, 0, 0], label: "reversed range adds nothing and zero is retained", edge: true },
      { call: "expand(Object.freeze([Object.freeze([-2,1]),Object.freeze([5,5])]))", expected: [-2, -1, 0, 1, 5], label: "frozen ranges", edge: true },
      { call: "(() => {const first=[3,4],second=[1,2],ranges=[first,second];expand(ranges);return ranges[0]===first&&ranges[1]===second&&first[0]===3&&first[1]===4&&second[0]===1&&second[1]===2;})()", expected: true, label: "preserve range order and pair data", edge: true },
      { call: "(() => {const ranges=[];const a=expand(ranges),b=expand(ranges);return a!==ranges&&a!==b&&a.length===0&&b.length===0;})()", expected: true, label: "fresh empty results", edge: true },
      { call: "(() => {const out=expand([[-5000,4999]]);return out.length===10000&&out.every((value,index)=>value===index-5000);})()", expected: true, label: "bounded output-sensitive expansion", edge: true },
    ],
  },

  /* ── some, find, includes, indexOf and findIndex ──────────────────── */
  {
    id: 'js-easy4-any-overdue',
    track: 'javascript',
    topic: 'javascript',
    level: 7,
    tier: 1,
    focus: ['some'],
    title: 'Anything overdue?',
    prompt: "Each task is `{ title, due, done }`, with `due` as a date string such as `\"2026-09-25\"`. Write `hasOverdue(tasks, today)`, returning `true` when at least one task is not done and is due before `today`. Use `some`, which stops at the first task that passes. Date strings in this form compare correctly with `<`. A finished task is never overdue, a task due today is not overdue yet, and no tasks give `false`. tasks is an ordinary dense array of data objects with own Boolean done flags and valid ten-character YYYY-MM-DD due dates; today is another valid date in that same format, with four-digit years from 0001 through 9999. Use the supplied today value, not the current system clock. Do not change task order, fields or other values; frozen records and arrays are valid. Return a Boolean. Target: O(n) time in the worst case, where n is the task count and fixed-length date comparison is constant-time; an early overdue match can take less.",
    starter: `const hasOverdue = (tasks, today) => {

};

// Scratch pad. Change this and press Run.
console.log(hasOverdue([{ title: "tax", due: "2026-09-01", done: false }], "2026-09-25"));
`,
    skeleton: `const hasOverdue = (tasks, today) => {
  return tasks.some(task => /* not done and due before today */);
};`,
    hints: ['`some` returns `true` as soon as its callback returns `true` for one element, and `false` for an empty array. Both conditions go in the one callback, joined with `&&`.'],
    approach: [
      'Call `some` on the tasks.',
      'In the callback, return `!task.done && task.due < today`.',
      'Return what `some` gives back.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'hasOverdue([{ title: "tax", due: "2026-09-01", done: false }], "2026-09-25")', expected: true },
      { call: 'hasOverdue([{ title: "a", due: "2026-10-01", done: false }, { title: "b", due: "2026-08-30", done: false }], "2026-09-25")', expected: true, label: 'one overdue task is enough' },
      { call: 'hasOverdue([{ title: "tax", due: "2026-09-01", done: true }], "2026-09-25")', expected: false, label: 'a finished task is never overdue', edge: true },
      { call: 'hasOverdue([{ title: "call", due: "2026-09-25", done: false }], "2026-09-25")', expected: false, label: 'due today is not overdue yet', edge: true },
      { call: 'hasOverdue([], "2026-09-25")', expected: false, label: 'no tasks', edge: true },
      { call: "hasOverdue(Object.freeze([Object.freeze({title:\"done\",due:\"0001-01-01\",done:true}),Object.freeze({title:\"open\",due:\"2024-02-29\",done:false})]),\"2024-03-01\")", expected: true, label: "frozen records and calendar boundary", edge: true },
      { call: "hasOverdue([{title:\"future\",due:\"9999-12-31\",done:false}],\"0001-01-01\")", expected: false, label: "supplied comparison date and valid date bounds", edge: true },
      { call: "(() => {const first={title:\"future\",due:\"2027-01-01\",done:false},second={title:\"late\",due:\"2020-01-01\",done:false},tasks=[first,second];const out=hasOverdue(tasks,\"2026-01-01\");return out===true&&tasks[0]===first&&tasks[1]===second&&first.done===false&&second.done===false;})()", expected: true, label: "preserve source order and flags", edge: true },
    ],
  },
  {
    id: 'js-easy4-first-free-slot',
    track: 'javascript',
    topic: 'javascript',
    level: 7,
    tier: 1,
    focus: ['find'],
    title: 'The first free slot',
    prompt: "A booking page lists slots in time order as `{ time, booked }`. Write `firstFree(slots)`, returning the `time` of the first slot that is not booked, using `find`. `find` gives `undefined` when nothing matches; return `null` then, so the page can say it is fully booked. slots is an ordinary dense array of data objects with own Boolean booked flags and valid 24-hour times in exactly HH:mm format, including 00:00. The supplied array is already in nondecreasing time order; choose its first unbooked entry without sorting or reserving it. Do not change any slot, other data or array order; frozen inputs are valid. Return a time string or null only when no entry is free. Target: O(n) time in the worst case, where n is the slot count and reading the fields takes constant time.",
    starter: `const firstFree = slots => {

};

// Scratch pad. Change this and press Run.
console.log(firstFree([{ time: "09:00", booked: true }, { time: "09:30", booked: false }]));
`,
    skeleton: `const firstFree = slots => {
  const slot = slots.find(/* a slot that is not booked */);
  return /* its time, or null when there is none */;
};`,
    hints: ['`find` returns the first element its callback accepts, the whole element, or `undefined` when none is accepted. Read `.time` only once you know a slot was found.'],
    approach: [
      'Call `find` with a callback that returns `!slot.booked`.',
      'If it found a slot, return that slot’s `time`.',
      'If it gave `undefined`, return `null`.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'firstFree([{ time: "09:00", booked: true }, { time: "09:30", booked: false }, { time: "10:00", booked: false }])', expected: '09:30' },
      { call: 'firstFree([{ time: "09:00", booked: false }])', expected: '09:00' },
      { call: 'firstFree([{ time: "09:00", booked: true }])', expected: null, label: 'fully booked', edge: true },
      { call: 'firstFree([])', expected: null, label: 'no slots', edge: true },
      { call: "firstFree([{time:\"00:00\",booked:false},{time:\"00:30\",booked:false}])", expected: "00:00", label: "midnight is a valid time", edge: true },
      { call: "firstFree(Object.freeze([Object.freeze({time:\"09:00\",booked:true}),Object.freeze({time:\"09:15\",booked:true}),Object.freeze({time:\"09:30\",booked:true}),Object.freeze({time:\"09:45\",booked:true}),Object.freeze({time:\"10:00\",booked:false})]))", expected: "10:00", label: "look beyond the first three slots in frozen input", edge: true },
      { call: "(() => {const slot={time:\"23:59\",booked:false},slots=[slot];const out=firstFree(slots);return out===\"23:59\"&&slots[0]===slot&&slot.booked===false;})()", expected: true, label: "finding a slot does not book it", edge: true },
    ],
  },
  {
    id: 'js-easy4-allowed-file',
    track: 'javascript',
    topic: 'javascript',
    level: 7,
    tier: 1,
    focus: ['includes', 'strings'],
    title: 'Is this file type allowed?',
    prompt: "Write `isAllowed(fileName, allowed)`, where `allowed` is an array of lower-case extensions such as `[\"png\", \"jpg\"]`. Take the text after the last dot of the file name, lower-case it, and check it with `includes`. `isAllowed(\"Photo.PNG\", [\"png\", \"jpg\"])` gives `true`. A name with no dot has no extension and is never allowed. This is a literal name-suffix exercise, not file-content inspection. fileName is a primitive string of at most 1024 UTF-16 units and is treated exactly as supplied, without trimming or path parsing. allowed is an ordinary dense array of nonempty lowercase ASCII letter/digit extensions, each at most 16 units. A leading-dot name such as .PNG has extension png under this last-dot rule; an empty name, a lone dot or a trailing dot is not allowed. Do not change allowed; frozen arrays are valid. Target: O(n) time, where n is the filename length plus allowed entry count, with bounded extension comparison and linear string scanning/lowercasing.",
    starter: `const isAllowed = (fileName, allowed) => {

};

// Scratch pad. Change this and press Run.
console.log(isAllowed("Photo.PNG", ["png", "jpg"]));
`,
    skeleton: `const isAllowed = (fileName, allowed) => {
  const dot = fileName.lastIndexOf(".");
  if (/* there is no dot */) return false;
  const extension = /* the text after the dot, in lower case */;
  return allowed.includes(extension);
};`,
    hints: ['`lastIndexOf(".")` gives the position of the last dot, or -1 when there is none. `includes` looks for an exact match, so `"PNG"` does not match `"png"` until you lower-case it.'],
    approach: [
      'Find the last dot with `lastIndexOf`. Return `false` when it is -1.',
      'Take the text after it with `slice(dot + 1)` and lower-case it.',
      'Return `allowed.includes(extension)`.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'isAllowed("Photo.PNG", ["png", "jpg"])', expected: true },
      { call: 'isAllowed("notes.txt", ["png", "jpg"])', expected: false },
      { call: 'isAllowed("archive.tar.gz", ["gz"])', expected: true, label: 'only the part after the last dot counts' },
      { call: 'isAllowed("png", ["png"])', expected: false, label: 'no dot, no extension', edge: true },
      { call: 'isAllowed("image.jpg", [])', expected: false, label: 'nothing allowed', edge: true },
      { call: "isAllowed(\".PNG\",[\"png\"])", expected: true, label: "a leading dot follows the stated suffix rule", edge: true },
      { call: "isAllowed(\"name.png \",[\"png\"])", expected: false, label: "do not trim extension text", edge: true },
      { call: "isAllowed(\"name.png\\n\",[\"png\"])", expected: false, label: "a trailing line break is literal data", edge: true },
      { call: "isAllowed(\"name.\",[\"png\"])", expected: false, label: "no text after the last dot", edge: true },
      { call: "isAllowed(\".\",[\"png\"])", expected: false, label: "a lone dot is not an allowed extension", edge: true },
      { call: "isAllowed(\"a.JPG\",Object.freeze([\"png\",\"jpg\"]))", expected: true, label: "frozen allowed list", edge: true },
      { call: "(() => {const allowed=[\"png\",\"jpg\"];const out=isAllowed(\"a.JPG\",allowed);return out===true&&allowed[0]===\"png\"&&allowed[1]===\"jpg\";})()", expected: true, label: "preserve allowed order", edge: true },
    ],
  },
  {
    id: 'js-easy4-next-step',
    track: 'javascript',
    topic: 'javascript',
    level: 7,
    tier: 1,
    focus: ['indexOf'],
    title: 'What comes next',
    prompt: "A checkout runs through fixed steps, such as `[\"cart\", \"address\", \"payment\", \"done\"]`. Write `nextStep(steps, current)`, returning the step after `current`, using `indexOf` to find where `current` is. The last step has no next step, and neither does a name that is not in the list: return `null` for both. steps is an ordinary dense array of primitive strings, and current is a primitive string; each string is at most 128 UTF-16 units. Matching is exact and case-sensitive. When labels repeat, use the first occurrence as indexOf does. Empty strings are valid labels, so an empty next label must be returned as an empty string, not null. Do not change the input; frozen arrays are valid. Target: O(n) time in the worst case, where n is the number of steps and bounded string equality takes constant time.",
    starter: `const nextStep = (steps, current) => {

};

// Scratch pad. Change this and press Run.
console.log(nextStep(["cart", "address", "payment", "done"], "address"));
`,
    skeleton: `const nextStep = (steps, current) => {
  const index = steps.indexOf(current);
  if (/* not found, or the last step */) return null;
  return steps[index + 1];
};`,
    hints: ['`indexOf` gives -1 when the value is missing, and `-1 + 1` is 0, so an unknown step would return the first step with no error. Check for -1 before you use the index.'],
    approach: [
      'Find the position of `current` with `indexOf`.',
      'Return `null` when it is -1 or when it is the last index, `steps.length - 1`.',
      'Otherwise return `steps[index + 1]`.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'nextStep(["cart", "address", "payment", "done"], "address")', expected: 'payment' },
      { call: 'nextStep(["cart", "address", "payment", "done"], "cart")', expected: 'address' },
      { call: 'nextStep(["cart", "address", "payment", "done"], "done")', expected: null, label: 'the last step', edge: true },
      { call: 'nextStep(["cart", "address", "payment", "done"], "shipping")', expected: null, label: 'a step that is not in the list', edge: true },
      { call: 'nextStep([], "cart")', expected: null, label: 'no steps', edge: true },
      { call: "nextStep([\"a\",\"b\",\"a\",\"c\"],\"a\")", expected: "b", label: "use the first repeated current label", edge: true },
      { call: "nextStep([\"a\",\"\",\"b\"],\"a\")", expected: "", label: "empty destination is a real label", edge: true },
      { call: "nextStep([\"\",\"b\"],\"\")", expected: "b", label: "empty current label can match", edge: true },
      { call: "nextStep([\"cart\",\"done\"],\"Cart\")", expected: null, label: "exact case", edge: true },
      { call: "nextStep(Object.freeze([\"a\",\"b\"]),\"a\")", expected: "b", label: "frozen input", edge: true },
      { call: "(() => {const steps=[\"b\",\"a\",\"c\"];nextStep(steps,\"b\");return steps;})()", expected: ["b", "a", "c"], label: "preserve step order", edge: true },
    ],
  },
  {
    id: 'js-easy4-insert-position',
    track: 'javascript',
    topic: 'javascript',
    level: 7,
    tier: 2,
    focus: ['findIndex'],
    title: 'Where does it go?',
    prompt: "Write `insertAt(sorted, value)` for a list of numbers in ascending order, returning the index where `value` should go to keep the list sorted: the index of the first number that is greater than or equal to `value`. Use `findIndex`. When every number is smaller, `findIndex` gives -1, but the value belongs at the end, so return `sorted.length`. `insertAt([10, 20, 30], 25)` gives 2. sorted is an ordinary dense array of finite Numbers in nondecreasing order, and value is a finite Number. Fractional and negative values are valid; compare without rounding. For duplicates return the position before the first equal entry. This function only reports an index: do not insert, reorder or otherwise change the input, and accept frozen arrays. Target: O(n) time for the taught findIndex scan, where n is the input length and numeric comparison is constant-time; a faster correct search also meets the goal.",
    starter: `const insertAt = (sorted, value) => {

};

// Scratch pad. Change this and press Run.
console.log(insertAt([10, 20, 30], 25));
`,
    skeleton: `const insertAt = (sorted, value) => {
  const index = sorted.findIndex(/* the first number >= value */);
  return /* index, or the end of the list when it is -1 */;
};`,
    hints: ['`findIndex` returns the position of the first element its callback accepts, or -1. Here -1 means "after everything", which is the index `sorted.length`.'],
    approach: [
      'Call `findIndex` with `number => number >= value`.',
      'If the result is -1, return `sorted.length`.',
      'Otherwise return the result.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'insertAt([10, 20, 30], 25)', expected: 2 },
      { call: 'insertAt([10, 20, 30], 5)', expected: 0, label: 'before everything' },
      { call: 'insertAt([10, 20, 30], 20)', expected: 1, label: 'an equal value goes before it' },
      { call: 'insertAt([10, 20, 30], 40)', expected: 3, label: 'after everything goes at the end', edge: true },
      { call: 'insertAt([], 7)', expected: 0, label: 'an empty list', edge: true },
      { call: "insertAt([0.1,0.2,0.3],0.15)", expected: 1, label: "fractional lower bound without rounding", edge: true },
      { call: "insertAt(Object.freeze([-2,-0,0,1]),0)", expected: 1, label: "frozen input and first equal zero", edge: true },
      { call: "(() => {const input=[1,3,5];const out=insertAt(input,2);return out===1&&input.length===3&&input[0]===1&&input[1]===3&&input[2]===5;})()", expected: true, label: "report the position without inserting", edge: true },
      { call: "insertAt([1,1,1,2],1)", expected: 0, label: "lower bound before all duplicates", edge: true },
    ],
  },

  /* ── default parameters and recursion ─────────────────────────────── */
  {
    id: 'js-easy4-clamp-defaults',
    track: 'javascript',
    topic: 'javascript',
    level: 11,
    tier: 1,
    focus: ['functions'],
    title: 'Keep it in range',
    prompt: "Write `clamp(value, min = 0, max = 100)`, returning `value` pulled into the range from `min` to `max`: `min` when it is below, `max` when it is above, and `value` itself otherwise. Give `min` and `max` their defaults in the parameter list, so `clamp(150)` gives 100 and `clamp(-5)` gives 0. A default applies when the argument is missing or `undefined`, so `clamp(7, undefined, 5)` gives 5. A 0 that is passed in is a real limit. Domain: value and supplied limits are finite Numbers from -1,000,000 through 1,000,000, with min <= max after defaults. Equal limits and fractions are valid. Return the original value when it is inside the inclusive range, preserving its sign if it is -0; otherwise return the exact applicable limit. Target: O(1) time under unit-cost Number comparisons.",
    starter: `const clamp = (value, min, max) => {

};

// Scratch pad. Change this and press Run.
console.log(clamp(150), clamp(-5), clamp(7, undefined, 5));
`,
    skeleton: `const clamp = (value, min = /* default */, max = /* default */) => {
  if (value < min) return min;
  // and the other side
  return value;
};`,
    hints: ['A default written as `min = 0` in the parameter list is used only when the argument is `undefined`. `max || 100` in the body also replaces a deliberately supplied max of 0 with 100.'],
    approach: [
      'Write the defaults into the parameter list: `min = 0, max = 100`.',
      'Return `min` when `value < min`, and `max` when `value > max`.',
      'Otherwise return `value`.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'clamp(150)', expected: 100 },
      { call: 'clamp(-5)', expected: 0 },
      { call: 'clamp(42)', expected: 42, label: 'inside the range' },
      { call: 'clamp(5, 10)', expected: 10, label: 'only min given' },
      { call: 'clamp(50, 0, 10)', expected: 10 },
      { call: 'clamp(7, undefined, 5)', expected: 5, label: 'undefined takes the default', edge: true },
    ],
  },
  {
    id: 'js-easy4-to-binary',
    track: 'javascript',
    topic: 'javascript',
    level: 11,
    tier: 1,
    focus: ['recursion'],
    title: 'A number in binary',
    prompt: "Write `toBinary(n)` for a whole number `n` of 0 or more, returning its binary digits as a string, with recursion rather than `toString(2)`. The last binary digit is `n % 2`, and the digits before it are the binary form of `Math.floor(n / 2)`. Stop when `n` is 0 or 1: it is its own single digit. `toBinary(6)` gives `\"110\"`. Domain: n is a nonnegative safe-integer Number, up to Number.MAX_SAFE_INTEGER; -0 also returns \"0\". Return no leading zeros except the single digit for zero. Do not use 32-bit shifts to halve n: they truncate larger Numbers. Target: O(n²) time under a string-copying model, where n here is the number of binary output digits (not the numeric argument). Recursion has O(n) depth; copying each growing prefix gives the quadratic bound, while engines may optimize concatenation.",
    starter: `const toBinary = n => {

};

// Scratch pad. Change this and press Run.
console.log(toBinary(6));
`,
    skeleton: `const toBinary = n => {
  if (/* n is 0 or 1 */) return String(n);
  return toBinary(/* n halved and rounded down */) + /* the last digit */;
};`,
    hints: ['Every recursive function needs a base case that returns without calling itself. Here it is `n < 2`. Each other call halves `n`, so it always gets there.'],
    approach: [
      'Base case: when `n < 2`, return `String(n)`.',
      'Recursive case: call `toBinary(Math.floor(n / 2))` for the digits in front.',
      'Add `n % 2` to the end of that string and return it.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'toBinary(6)', expected: '110' },
      { call: 'toBinary(5)', expected: '101' },
      { call: 'toBinary(8)', expected: '1000', label: 'zeros at the end' },
      { call: 'toBinary(0)', expected: '0', label: 'zero', edge: true },
      { call: 'toBinary(1)', expected: '1', label: 'one', edge: true },
    ],
  },

  /* ── higher-order functions and callbacks ─────────────────────────── */
  {
    id: 'js-easy4-record-calls',
    track: 'javascript',
    topic: 'javascript',
    level: 15,
    tier: 2,
    focus: ['higher-order'],
    title: 'Record every call',
    prompt: "Write `recorded(fn, calls)`, returning a new function that does what `fn` does and also writes down each use. When the new function is called, it calls `fn` with the same arguments, pushes `{ args, result }` onto the `calls` array, and returns the result. Collect the arguments with a rest parameter, `(...args)`, so any number of them works. Nothing is written until the new function is called. Invoke fn exactly once per wrapper call. Append only after it returns normally, so a throwing call propagates the same error and appends nothing. Preserve existing log entries, use a fresh args array/record per completed call and keep exact argument/result references, including undefined and falsy values. Domain: calls is an ordinary mutable array; fn is synchronous, independent of dynamic this and does not itself modify calls. Each wrapper is called at most 1,000 times with at most 100 arguments. Target: O(n) time per invocation, where n is 1 plus the argument count, excluding fn’s own work and using amortized log append. Stored log space grows with completed calls and their arguments.",
    starter: `const recorded = (fn, calls) => {

};

// Scratch pad. Change this and press Run.
const calls = [];
const add = recorded((a, b) => a + b, calls);
console.log(typeof add === "function" ? add(2, 3) : add, calls);
`,
    skeleton: `const recorded = (fn, calls) => {
  return (...args) => {
    const result = /* fn called with the same arguments */;
    // write { args, result } into calls
    return result;
  };
};`,
    hints: ['A function that returns a function is a higher-order function. `(...args)` gathers every argument into an array, and `fn(...args)` spreads them back out as separate arguments.'],
    approach: [
      'Return a new arrow function that takes `(...args)`.',
      'Inside it, call `fn(...args)` and keep the result.',
      'Push `{ args, result }` onto `calls`, then return the result.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: '(() => { const calls = []; const add = recorded((a, b) => a + b, calls); return [add(2, 3), calls]; })()', expected: [5, [{ args: [2, 3], result: 5 }]] },
      { call: '(() => { const calls = []; const shout = recorded(text => text.toUpperCase(), calls); shout("hi"); shout("yo"); return calls; })()', expected: [{ args: ['hi'], result: 'HI' }, { args: ['yo'], result: 'YO' }], label: 'every call is written down, in order' },
      { call: '(() => { const calls = []; const answer = recorded(() => 42, calls); answer(); return calls; })()', expected: [{ args: [], result: 42 }], label: 'no arguments', edge: true },
      { call: '(() => { const calls = []; recorded(x => x, calls); return calls; })()', expected: [], label: 'nothing is written until it is called', edge: true },
    ],
  },
  {
    id: 'js-easy4-each-line',
    track: 'javascript',
    topic: 'javascript',
    level: 15,
    tier: 2,
    focus: ['callbacks', 'split'],
    title: 'Call back for each line',
    prompt: "Write `eachLine(text, onLine)`, which splits `text` on `\"\\n\"` and calls `onLine(line, number)` for every line that is not empty. Lines are numbered from 1 in the order they appear, and empty lines still take up a number, the way an editor counts them. `eachLine` returns how many times it called `onLine`. What happens to each line is up to the callback. text has at most 10000 UTF-16 code units. Split only on LF: CR and whitespace-only lines are literal nonempty content, with no trimming. Invoke onLine synchronously in line order with exactly two arguments and ignore its return value. If onLine throws, stop and propagate that original value; earlier callbacks stay completed. onLine does not depend on this. Target: O(n) time and split storage, where n is 1 + text.length, excluding callback work.",
    starter: `const eachLine = (text, onLine) => {

};

// Scratch pad. Change this and press Run.
eachLine("first\\n\\nthird", (line, number) => console.log(number, line));
`,
    skeleton: `const eachLine = (text, onLine) => {
  let reported = 0;
  const lines = text.split("\\n");
  for (let i = 0; i < lines.length; i++) {
    // skip an empty line; otherwise call back with the line and its number
  }
  return reported;
};`,
    hints: ['A callback is a function you are handed and call at the right moment. Here the right moment is each non-empty line, and the line number is its index plus 1, counted before you skip anything.'],
    approach: [
      'Split the text on `"\\n"`.',
      'Loop over the lines with their index. Skip a line that is `""`.',
      'For any other line, call `onLine(line, index + 1)` and count the call. Return the count.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: '(() => { const seen = []; eachLine("first\\nsecond", (line, number) => seen.push(number + ": " + line)); return seen; })()', expected: ['1: first', '2: second'] },
      { call: 'eachLine("x\\ny\\nz", () => {})', expected: 3, label: 'it returns how many lines it reported' },
      { call: '(() => { const seen = []; eachLine("a\\n\\nb", (line, number) => seen.push([line, number])); return seen; })()', expected: [['a', 1], ['b', 3]], label: 'empty lines are skipped but still counted', edge: true },
      { call: 'eachLine("", () => {})', expected: 0, label: 'empty text', edge: true },
      { call: '(() => { let called = false; eachLine("\\n\\n", () => { called = true; }); return called; })()', expected: false, label: 'only empty lines', edge: true },
    ],
  },
  {
    id: 'js-easy4-report-changes',
    track: 'javascript',
    topic: 'javascript',
    level: 15,
    tier: 2,
    focus: ['callbacks', 'for-in'],
    title: 'Report what changed',
    prompt: "Write `applyChanges(settings, changes, onChange)`. Go through the keys of `changes` with `for...in`. For each key whose new value differs from the one in `settings` (compare with `!==`), store the new value in `settings` and call `onChange(key, oldValue, newValue)`. A key whose value is already the same is left alone and not reported. Return how many keys changed. Visit only own enumerable string keys of changes, in normal for-in key order; ignore inherited, nonenumerable and symbol keys. settings is a mutable extensible ordinary record whose existing own data properties are writable/configurable, while changes is read-only and may be frozen. Keys, including __proto__ and constructor, are literal data keys: preserve the prototype of settings. A missing own settings key reads undefined, even if its prototype has that name. If old and new are both undefined, leave an absent key absent. Values are opaque references/values; use exactly !==, so NaN differs from itself while both zero signs compare equal. Store the new own data value before calling onChange synchronously with exactly three original arguments; do not clone values. Propagate an original callback error and stop, keeping changes already stored. Callbacks do not mutate the input records. Both records/visited prototype keys have at most 10000 properties; key lengths are bounded to 1000. Target: O(n) time under bounded-key access, where n is 1 + all enumerable string keys visited by for-in, including ignored inherited keys; auxiliary work space is O(1), excluding callback work.",
    starter: `const applyChanges = (settings, changes, onChange) => {

};

// Scratch pad. Change this and press Run.
const settings = { theme: "light", size: 14 };
applyChanges(settings, { theme: "dark", size: 14 }, (key, from, to) => console.log(key, from, "->", to));
console.log(settings);
`,
    skeleton: `const applyChanges = (settings, changes, onChange) => {
  let changed = 0;
  for (const key in changes) {
    if (!Object.hasOwn(changes, key)) continue;
    const oldValue = Object.hasOwn(settings, key) ? settings[key] : undefined;
    const newValue = changes[key];
    // skip an unchanged key; otherwise define an own data property, call back and count it
  }
  return changed;
};`,
    hints: ['`for (const key in changes)` also sees inherited keys, so guard with Object.hasOwn. Define changed values as own data properties to handle __proto__ safely. Read the old value before you overwrite it, or the callback will be told the new value twice.'],
    approach: [
      'Loop over the keys of `changes` with `for...in`, skipping keys that are not its own.',
      'Read the old and the new value. When they are the same with `===`, move on to the next key.',
      'Otherwise define the own data value with Object.defineProperty (writable, enumerable and configurable), call `onChange(key, oldValue, newValue)` and add 1 to the count. Return the count.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: '(() => { const seen = []; const settings = { theme: "light", size: 14 }; applyChanges(settings, { theme: "dark" }, (key, from, to) => seen.push([key, from, to])); return [settings, seen]; })()', expected: [{ theme: 'dark', size: 14 }, [['theme', 'light', 'dark']]] },
      { call: 'applyChanges({ a: 1, b: 2 }, { a: 5, b: 6 }, () => {})', expected: 2 },
      { call: '(() => { const seen = []; applyChanges({}, { lang: "en" }, (key, from, to) => seen.push([key, from === undefined, to])); return seen; })()', expected: [['lang', true, 'en']], label: 'a new key had no value before', edge: true },
      { call: 'applyChanges({ size: 14 }, { size: 14 }, () => {})', expected: 0, label: 'the same value is not a change', edge: true },
      { call: '(() => { let calls = 0; applyChanges({ a: 1 }, {}, () => { calls++; }); return calls; })()', expected: 0, label: 'no changes', edge: true },
    ],
  },

  /* ── timers ───────────────────────────────────────────────────────── */
  {
    id: 'js-easy4-tick-down',
    track: 'javascript',
    topic: 'javascript',
    level: 15,
    tier: 2,
    focus: ['timers'],
    title: 'Count down, one tick at a time',
    prompt: "Write `countdown(from, ms, onTick)`, which calls `onTick(from)` after `ms` milliseconds, then `onTick(from - 1)` `ms` milliseconds after that, and so on down to `onTick(1)`. Chain `setTimeout` calls rather than using `setInterval`: each tick schedules the next one, and the last tick schedules nothing. `countdown` itself returns straight away, before any tick. A `from` of 0 never calls `onTick`. from is an integer from 0 to 1000 and ms is an integer from 1 to 1000. onTick is synchronous, returns normally and does not depend on this; pass exactly one argument and ignore its return value. Each countdown has independent state and keeps only the next tick scheduled. Delays are minimum waits, not exact wall-clock deadlines. The return value is unspecified. Target: O(n) time for the complete sequence of wrapper callbacks, where n is 1 + from, with O(1) simultaneously retained timer/state space, excluding host timer management, waiting and onTick work.",
    starter: `const countdown = (from, ms, onTick) => {

};

// Scratch pad. Change this and press Run.
countdown(3, 100, n => console.log(n));
`,
    skeleton: `const countdown = (from, ms, onTick) => {
  if (/* nothing left to count */) return;
  setTimeout(() => {
    // tick with from, then start the countdown from one less
  }, ms);
};`,
    hints: ['`setTimeout(fn, ms)` runs `fn` once, later, and returns at once. A timer callback that starts another `setTimeout` makes a chain, and the chain stops when a callback starts nothing.'],
    approach: [
      'Return without doing anything when `from` is less than 1.',
      'Otherwise start a `setTimeout` for `ms` milliseconds.',
      'In its callback, call `onTick(from)`, then start the rest of the countdown from `from - 1`.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'new Promise(resolve => { const ticks = []; countdown(3, 10, n => ticks.push(n)); setTimeout(() => resolve([...ticks]), 100); })', expected: [3, 2, 1], async: true },
      { call: 'new Promise(resolve => { const ticks = []; countdown(3, 20, n => ticks.push(n)); setTimeout(() => resolve([...ticks]), 30); })', expected: [3], label: 'one tick every ms milliseconds', async: true },
      { call: '(() => { const ticks = []; countdown(3, 10, n => ticks.push(n)); return [...ticks]; })()', expected: [], label: 'nothing happens straight away', edge: true },
      { call: 'new Promise(resolve => { const ticks = []; countdown(0, 10, n => ticks.push(n)); setTimeout(() => resolve([...ticks]), 50); })', expected: [], label: 'from 0 never ticks', edge: true, async: true },
    ],
  },
  {
    id: 'js-easy4-remind-later',
    track: 'javascript',
    topic: 'javascript',
    level: 15,
    tier: 2,
    focus: ['timers', 'forEach'],
    title: 'A reminder for each event',
    prompt: "Each event is `{ title, at }`, where `at` is a time in milliseconds on the same clock as `now`. Write `scheduleReminders(events, now, remind)`, which uses `forEach` to start one `setTimeout` per event, calling `remind(title)` when that event’s time comes, `at - now` milliseconds from now. An event at or before `now` has already started: skip it. Return how many reminders were scheduled. events is a read-only dense array of at most 1000 ordinary read-only records and may be frozen with its records. title is a string of at most 1000 characters; now and at are nonnegative integer timestamps at most 1000000000000. Every future event is at most 1000 milliseconds ahead. Capture title and delay when scheduling, so later caller edits to records/arrays do not change queued reminders. Invoke remind with exactly one title argument; it is synchronous, returns normally and does not depend on this. Duplicate events each get their own timer, and equal delays keep input registration order. Leave the input untouched. Timer waits are minimum delays, not exact wall-clock deadlines. Target: O(n) time to register reminders and O(n) retained timer data, where n is 1 + events.length, excluding host timer management, waiting and remind work.",
    starter: `const scheduleReminders = (events, now, remind) => {

};

// Scratch pad. Change this and press Run.
console.log(scheduleReminders([{ title: "standup", at: 1300 }, { title: "coffee", at: 1100 }], 1000, title => console.log(title)));
`,
    skeleton: `const scheduleReminders = (events, now, remind) => {
  let scheduled = 0;
  events.forEach(event => {
    // skip an event that has started; otherwise set its timer and count it
  });
  return scheduled;
};`,
    hints: ['Each `setTimeout` runs on its own, so starting several at once is fine: they fire in order of their delays. The delay is the wait from now, `at - now`. Passing `at` itself would wait far too long.'],
    approach: [
      'Call `forEach` on the events and keep a count.',
      'Skip an event whose `at` is less than or equal to `now`.',
      'For any other event, first capture its title and delay, then call `setTimeout(() => remind(title), delay)` and add 1 to the count. Return the count.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'new Promise(resolve => { const seen = []; scheduleReminders([{ title: "standup", at: 1030 }, { title: "coffee", at: 1010 }], 1000, title => seen.push(title)); setTimeout(() => resolve([...seen]), 80); })', expected: ['coffee', 'standup'], label: 'reminders arrive in time order', async: true },
      { call: 'scheduleReminders([{ title: "a", at: 1010 }, { title: "b", at: 1020 }], 1000, () => {})', expected: 2 },
      { call: 'scheduleReminders([{ title: "past", at: 900 }, { title: "now", at: 1000 }], 1000, () => {})', expected: 0, label: 'past and present events are skipped', edge: true },
      { call: '(() => { const seen = []; scheduleReminders([{ title: "soon", at: 1010 }], 1000, title => seen.push(title)); return [...seen]; })()', expected: [], label: 'nothing fires straight away', edge: true },
      { call: 'new Promise(resolve => { const seen = []; scheduleReminders([{ title: "later", at: 1050 }], 1000, title => seen.push(title)); setTimeout(() => resolve([...seen]), 20); })', expected: [], label: 'a reminder waits for its time', edge: true, async: true },
    ],
  },

  /* ── JSON ─────────────────────────────────────────────────────────── */
  {
    id: 'js-easy4-public-fields',
    track: 'javascript',
    topic: 'javascript',
    level: 19,
    tier: 2,
    focus: ['json'],
    title: 'Only the public fields',
    prompt: "Write `toPublicJson(user)`, returning compact JSON text with only id, name and avatar, in that order, using JSON.stringify’s property-list replacer. Missing or undefined public fields are omitted; null, false, zero and empty strings are kept. This is serialization practice for the flat data contract below, not authorization or validation of arbitrary objects. Domain: user is an ordinary record whose public fields, if present, are own data properties holding strings up to 1,000 UTF-16 units, finite Numbers, Booleans, null or undefined. There are no inherited public fields, proxies or toJSON hooks. Other fields are opaque and must not be read or copied; an ignored extra may have a throwing getter. The record may be frozen and must not be mutated. Target: O(n) time under ordinary JSON serialization, where n is 1 plus the length of the selected string values; the number of ignored private properties does not add traversal work.",
    starter: `const toPublicJson = user => {

};

// Scratch pad. Change this and press Run.
console.log(toPublicJson({ id: 7, name: "Ada", email: "ada@example.com", avatar: "ada.png" }));
`,
    skeleton: `const toPublicJson = user => {
  return JSON.stringify(user, /* the names of the fields to keep */);
};`,
    hints: ['The second argument of `JSON.stringify` is called the replacer. Given an array of strings, it works as an allow-list: every other property is left out of the text.'],
    approach: [
      'List the public fields in order: `["id", "name", "avatar"]`.',
      'Pass the user and that list to `JSON.stringify`.',
      'Return the text it produces.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'toPublicJson({ id: 7, name: "Ada", email: "ada@example.com", avatar: "ada.png" })', expected: '{"id":7,"name":"Ada","avatar":"ada.png"}' },
      { call: 'toPublicJson({ passwordHash: "x1", avatar: null, name: "Lin", id: 1 })', expected: '{"id":1,"name":"Lin","avatar":null}', label: 'the fields come out in the listed order' },
      { call: 'toPublicJson({ id: 2, name: "Kai" })', expected: '{"id":2,"name":"Kai"}', label: 'a missing field is left out', edge: true },
      { call: 'toPublicJson({ email: "secret@example.com" })', expected: '{}', label: 'nothing public', edge: true },
    ],
  },

  /* ── fetch and async/await ────────────────────────────────────────── */
  {
    id: 'js-easy4-get-json',
    track: 'javascript',
    topic: 'javascript',
    level: 22,
    tier: 2,
    focus: ['fetch'],
    title: 'A 404 is still a response',
    prompt: '`fetch` rejects only when the request cannot be made at all. A 404 or a 500 still resolves to a response, with `ok` set to `false`. Write an `async` function `getJson(request, url)`, where `request` works like `fetch`: call it with the URL and await the response. When `response.ok` is `false`, throw an `Error` whose message is `"Request failed: "` followed by `response.status`. Otherwise return the body from `await response.json()`.',
    starter: `const getJson = async (request, url) => {

};

// Scratch pad. Change this and press Run.
const notFound = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
getJson(notFound, "/missing").then(data => console.log("data", data), error => console.log("error", error.message));
`,
    skeleton: `const getJson = async (request, url) => {
  const response = await request(url);
  if (/* the response is not ok */) {
    // throw an Error that names the status
  }
  return await response.json();
};`,
    hints: ['A response says whether it succeeded in `response.ok`, which is `true` for statuses 200 to 299. `fetch` does not look at the status for you, so a missing page arrives as a normal response unless you check.'],
    approach: [
      'Await `request(url)` to get the response.',
      'If `response.ok` is `false`, throw `new Error("Request failed: " + response.status)`.',
      'Otherwise await `response.json()` and return it. A rejection from `request` passes through untouched.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'getJson(url => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ url, id: 1 }) }), "/api/user")', expected: { url: '/api/user', id: 1 }, async: true },
      { call: '(() => { const asked = []; return getJson(url => { asked.push(url); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) }); }, "/list").then(() => asked); })()', expected: ['/list'], label: 'the URL is requested once', async: true },
      { call: 'getJson(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }), "/missing").catch(error => error.message)', expected: 'Request failed: 404', label: 'a 404 becomes an error', edge: true, async: true },
      { call: 'getJson(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }), "/boom").then(() => "no error", error => error instanceof Error)', expected: true, label: 'it throws a real Error', edge: true, async: true },
      { call: 'getJson(() => Promise.reject(new Error("offline")), "/x").catch(error => error.message)', expected: 'offline', label: 'a network failure passes through', edge: true, async: true },
    ],
  },
  {
    id: 'js-easy4-post-json',
    track: 'javascript',
    topic: 'javascript',
    level: 22,
    tier: 2,
    focus: ['fetch', 'json'],
    title: 'Send JSON with a POST',
    prompt: 'Write an `async` function `postJson(request, url, data)`, where `request` works like `fetch`. Call it with the URL and an options object with these three properties and no others: `method: "POST"`, `headers: { "Content-Type": "application/json" }`, and `body`, which is `data` turned into JSON text with `JSON.stringify`. Await the response and return its `status`, whatever it is.',
    starter: `const postJson = async (request, url, data) => {

};

// Scratch pad. Change this and press Run.
const logRequest = (url, options) => { console.log(url, options); return Promise.resolve({ ok: true, status: 201 }); };
postJson(logRequest, "/api/notes", { text: "hi" }).then(status => console.log(status));
`,
    skeleton: `const postJson = async (request, url, data) => {
  const response = await request(url, {
    method: /* the method */,
    headers: /* the content type */,
    body: /* data as JSON text */,
  });
  return response.status;
};`,
    hints: ['A request body travels as text, so an object has to go through `JSON.stringify` first. The `Content-Type` header tells the server how to read that text.'],
    approach: [
      'Build the options: `method`, `headers` and `body`.',
      'Set `body` to `JSON.stringify(data)`.',
      'Await `request(url, options)` and return `response.status`.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: '(() => { const sent = []; return postJson((url, options) => { sent.push([url, options]); return Promise.resolve({ ok: true, status: 201 }); }, "/api/notes", { text: "hi" }).then(status => [status, sent]); })()', expected: [201, [['/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"text":"hi"}' }]]], async: true },
      { call: '(() => { let method = null; return postJson((url, options) => { method = options.method; return Promise.resolve({ status: 200 }); }, "/x", null).then(() => method); })()', expected: 'POST', label: 'the method is POST', async: true },
      { call: '(() => { let body = null; return postJson((url, options) => { body = options.body; return Promise.resolve({ status: 200 }); }, "/x", [1, 2]).then(() => typeof body); })()', expected: 'string', label: 'the body is text, not an object', edge: true, async: true },
      { call: 'postJson(() => Promise.resolve({ ok: false, status: 400 }), "/api/notes", {})', expected: 400, label: 'an error status still comes back', edge: true, async: true },
    ],
  },
  {
    id: 'js-easy4-spinner-finally',
    track: 'javascript',
    topic: 'javascript',
    level: 22,
    tier: 2,
    focus: ['async-await'],
    title: 'Hide the spinner every time',
    prompt: 'Write an `async` function `withSpinner(show, hide, task)`. Call `show()`, then `await task()` and return what it resolves to. Call `hide()` in a `finally` block, so the spinner goes away once the task has finished, whether it succeeded or failed. When `task` rejects, `withSpinner` rejects with the same error, after hiding the spinner.',
    starter: `const withSpinner = async (show, hide, task) => {

};

// Scratch pad. Change this and press Run.
withSpinner(() => console.log("show"), () => console.log("hide"), async () => "loaded").then(value => console.log(value));
`,
    skeleton: `const withSpinner = async (show, hide, task) => {
  show();
  try {
    return /* the task's result, once it has finished */;
  } finally {
    // hide the spinner
  }
};`,
    hints: ['A `finally` block runs after the `try` block, whether it returned or threw. It only waits for the task if the `try` block awaits it: `return task()` without `await` leaves the `try` block at once, and `finally` hides the spinner while the task is still running.'],
    approach: [
      'Call `show()` first.',
      'In a `try` block, `return await task()`.',
      'In the `finally` block, call `hide()`. Do not catch the error: it should reach the caller.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: '(() => { const log = []; return withSpinner(() => log.push("show"), () => log.push("hide"), async () => { log.push("work"); return 42; }).then(value => [value, log]); })()', expected: [42, ['show', 'work', 'hide']], async: true },
      { call: '(() => { const log = []; return withSpinner(() => log.push("show"), () => log.push("hide"), () => new Promise(resolve => setTimeout(() => { log.push("done"); resolve("ok"); }, 20))).then(() => log); })()', expected: ['show', 'done', 'hide'], label: 'the spinner stays until the task finishes', async: true },
      { call: '(() => { const log = []; return withSpinner(() => log.push("show"), () => log.push("hide"), () => Promise.reject(new Error("broken"))).catch(error => [error.message, log]); })()', expected: ['broken', ['show', 'hide']], label: 'a failed task still hides the spinner', edge: true, async: true },
      { call: '(() => { const log = []; withSpinner(() => log.push("show"), () => log.push("hide"), () => new Promise(() => {})); return [...log]; })()', expected: ['show'], label: 'show comes first, straight away', edge: true },
    ],
  },
];
