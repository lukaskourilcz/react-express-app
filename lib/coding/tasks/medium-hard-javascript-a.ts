// The Medium and Hard band of the JavaScript track, first wave (#226).
//
// Every Easy wave has landed, so each challenge here combines two to four
// techniques the Easy band already taught: the technique-coverage contract
// (`scripts/coding-coverage.ts`) only lets a Medium or Hard challenge carry a
// focus tag that at least three Easy JavaScript challenges carry. Tier 3 reads
// Medium and tier 4 reads Hard, through `difficultyOf`; nothing sets an
// authored difficulty.
//
// Each challenge has a hint ladder that ends in the documentation page of its
// first focus tag, visible checks with at least one edge case, and hidden
// checks aimed at the shortcut the visible ones leave open. Solutions live in
// `../solutions/medium-hard-javascript-a.ts`, and `MEDIUM_HARD_BAND` in
// `../catalog.ts` lists this file, which keeps these challenges out of every
// Learn level's quota. English only: there is no Czech overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';

export const MEDIUM_HARD_JAVASCRIPT_A_TASKS: CodingTaskSource[] = [
  /* ── Medium: text and patterns ────────────────────────────────────── */
  {
    id: 'js-mh-fill-template',
    track: 'javascript',
    topic: 'javascript',
    level: 15,
    tier: 3,
    focus: ['regex', 'callbacks', 'objects'],
    title: 'Fill in a template',
    prompt: 'An email template marks each blank with a name in braces: `"Hi {name}, your order {orderId} has shipped."`. Write `fill(template, values)`, returning the text with every blank replaced by its value from the `values` object. Use `replace` with a regular expression that has the `g` flag, and pass a callback that works out each replacement. A name is made of letters, digits and underscores, and spaces just inside the braces are allowed, so `{ name }` is the same blank as `{name}`. A blank whose name is not an own property of `values` stays exactly as written, braces included, so a missing value is easy to spot. The values `0`, `false` and `""` are real values: fill them in, turned into text with `String`.',
    starter: `const fill = (template, values) => {

};

// Scratch pad. Change this and press Run.
console.log(fill("Hi {name}, your order {orderId} has shipped.", { name: "Ada", orderId: 1042 }));
`,
    skeleton: `const fill = (template, values) => {
  return template.replace(/* a pattern for one blank, with the g flag */, (blank, name) => {
    // the value as text when values has its own property called name,
    // otherwise the blank exactly as it was written
  });
};`,
    hints: [
      'With the `g` flag, `replace` calls your function once for every match. The function receives the whole match first, then each capture group, and whatever it returns takes the match’s place.',
      'Capture the name with `(\\w+)` and allow `\\s*` on either side of it. `Object.hasOwn(values, name)` tells a value the object really holds from one it only inherits, such as `toString`.',
    ],
    approach: [
      'Write the pattern: an opening brace, optional spaces, a captured name of `\\w` characters, optional spaces, a closing brace. Add the `g` flag so every blank is found.',
      'Call `template.replace(pattern, (blank, name) => ...)`.',
      'In the callback, return `String(values[name])` when `values` has its own property `name`, and `blank`, the text that matched, when it does not.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'fill("Hi {name}, your order {orderId} has shipped.", { name: "Ada", orderId: 1042 })', expected: 'Hi Ada, your order 1042 has shipped.' },
      { call: 'fill("{greeting}, {name}! {greeting} again.", { greeting: "Hello", name: "Lin" })', expected: 'Hello, Lin! Hello again.', label: 'every blank, not just the first' },
      { call: 'fill("Dear { name },", { name: "Sam" })', expected: 'Dear Sam,', label: 'spaces inside the braces' },
      { call: 'fill("Hi {name}, code {code}", { name: "Ada" })', expected: 'Hi Ada, code {code}', label: 'a missing value stays as written', edge: true },
      { call: 'fill("{count} new, starred: {starred}, note: [{note}]", { count: 0, starred: false, note: "" })', expected: '0 new, starred: false, note: []', label: '0, false and empty text are real values', edge: true },
      { call: 'fill("No blanks here.", { name: "Ada" })', expected: 'No blanks here.', label: 'no blanks at all', edge: true },
    ],
  },
  {
    id: 'js-mh-sort-versions',
    track: 'javascript',
    topic: 'javascript',
    level: 16,
    tier: 3,
    focus: ['split', 'map', 'sort'],
    title: 'Sort version numbers',
    prompt: 'Release tags such as `"1.10.0"` and `"1.9.2"` are whole numbers separated by dots. Sorted as text, `"1.10.0"` lands before `"1.9.2"`, because the character `1` comes before `9`. Write `sortVersions(versions)`, returning a new array from oldest to newest. Split each version on `"."`, turn the parts into numbers with `map`, and give `sort` a compare function that walks the parts from the left: the first part that differs decides. A missing part counts as 0, so `"2.1"` and `"2.1.0"` are equal, and equal versions keep the order they came in. Leave `versions` unchanged.',
    starter: `const sortVersions = versions => {

};

// Scratch pad. Change this and press Run.
console.log(sortVersions(["1.10.0", "1.9.2", "1.2.10"]));
`,
    skeleton: `const sortVersions = versions => {
  const compare = (a, b) => {
    const left = /* a's parts as numbers */;
    const right = /* b's parts as numbers */;
    // walk the longer of the two; a missing part is 0
    // return the first difference, or 0 when every part is equal
  };
  return /* a sorted copy */;
};`,
    hints: [
      'A compare function returns a negative number when `a` comes first, a positive one when `b` does, and 0 when they are equal. `sort` keeps equal items in their original order, but only if you really return 0 for them.',
      '`"1.10".split(".").map(Number)` gives `[1, 10]`. Read a part that is not there as 0 with `left[i] ?? 0`.',
    ],
    approach: [
      'Copy the array with `[...versions]`, because `sort` sorts in place.',
      'In the compare function, split both versions and map the parts to numbers.',
      'Loop up to the longer length. Subtract the two parts, treating a missing one as 0, and return the first result that is not 0.',
      'If every part is equal, return 0 so the two versions keep their order.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'sortVersions(["1.10.0", "1.9.2", "1.2.10"])', expected: ['1.2.10', '1.9.2', '1.10.0'] },
      { call: 'sortVersions(["2.0", "1.0.5", "1.0.10", "10.0", "9.9.9"])', expected: ['1.0.5', '1.0.10', '2.0', '9.9.9', '10.0'] },
      { call: 'sortVersions(["2.1", "2.1.0", "2.0.9", "2.1.0.0"])', expected: ['2.0.9', '2.1', '2.1.0', '2.1.0.0'], label: 'a missing part counts as 0', edge: true },
      { call: 'sortVersions(["3.0.0", "3", "3.0.1"])', expected: ['3.0.0', '3', '3.0.1'], label: 'equal versions keep their order', edge: true },
      { call: '(() => { const versions = ["1.10", "1.2"]; sortVersions(versions); return versions; })()', expected: ['1.10', '1.2'], label: 'versions is not changed', edge: true },
      { call: 'sortVersions([])', expected: [], label: 'no versions', edge: true },
    ],
  },
  {
    id: 'js-mh-csv-fields',
    track: 'javascript',
    topic: 'javascript',
    level: 11,
    tier: 3,
    focus: ['for-of', 'strings', 'push'],
    title: 'Read one line of CSV',
    prompt: 'In a CSV line, fields are separated by commas, and a field that holds a comma of its own is wrapped in double quotes: `Ada,"London, UK",36`. Inside quotes, a quote character is written twice, so `"say ""hi"""` is the text `say "hi"`. Write `parseCsvLine(line)`, returning the fields as an array of strings. `split(",")` cannot do this, because it also splits at the commas inside quotes. Walk the characters with `for...of` and remember whether you are inside quotes. Build the current field as you go, `push` it when you reach a comma outside quotes, and push the last field at the end. Spaces are part of a field. An empty line is one empty field, `[""]`, and two commas in a row have an empty field between them.',
    starter: `const parseCsvLine = line => {

};

// Scratch pad. Change this and press Run.
console.log(parseCsvLine('Ada,"London, UK",36'));
`,
    skeleton: `const parseCsvLine = line => {
  const fields = [];
  let field = "";
  let inQuotes = false;
  let previous = "";
  for (const char of line) {
    if (char === '"') {
      // a quote right after a closing quote is a quote character in the text
      // either way, a quote switches between inside and outside
    } else if (/* a comma outside quotes */) {
      // the field is finished
    } else {
      // any other character belongs to the field
    }
    previous = char;
  }
  // the last field has no comma after it
  return fields;
};`,
    hints: [
      'Keep a flag, `inQuotes`, and flip it on every quote character. A comma only ends a field while the flag is off.',
      'For `""` inside a quoted field, the first quote closes the quotes and the second opens them again. So a quote that arrives while you are outside quotes, straight after another quote, stands for one `"` in the text.',
    ],
    approach: [
      'Start with an empty list of fields, an empty current field, and `inQuotes` set to `false`.',
      'For each character: a quote flips `inQuotes`, and when it comes straight after a quote that closed the quotes, add a `"` to the field first.',
      'A comma while `inQuotes` is off pushes the current field and starts a new one. Every other character is added to the current field.',
      'After the loop, push the current field. That is also what makes an empty line give `[""]`.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'parseCsvLine("Ada,36,London")', expected: ['Ada', '36', 'London'] },
      { call: 'parseCsvLine(\'Ada,"London, UK",36\')', expected: ['Ada', 'London, UK', '36'], label: 'a comma inside quotes stays in the field' },
      { call: 'parseCsvLine(\'"say ""hi""",done\')', expected: ['say "hi"', 'done'], label: 'a doubled quote is one quote character' },
      { call: 'parseCsvLine("a,,b,")', expected: ['a', '', 'b', ''], label: 'empty fields, the last one included', edge: true },
      { call: 'parseCsvLine("")', expected: [''], label: 'an empty line is one empty field', edge: true },
      { call: 'parseCsvLine(\'"",x\')', expected: ['', 'x'], label: 'an empty quoted field', edge: true },
    ],
  },
  {
    id: 'js-mh-line-reader',
    track: 'javascript',
    topic: 'javascript',
    level: 15,
    tier: 3,
    focus: ['closures', 'split', 'callbacks'],
    title: 'Lines from chunks',
    prompt: 'A download arrives in chunks of text, and a chunk can end in the middle of a line. Write `createLineReader(onLine)`, returning an object with two methods. `push(chunk)` adds a chunk and calls `onLine(line)` once for every line the text so far has completed, in order, without its `"\\n"`. Text after the last `"\\n"` is not a line yet: keep it in the closure until a later chunk finishes it. `end()` calls `onLine` with that last piece if it is not empty. Split the text you hold on `"\\n"`: every piece but the last is a finished line, and the last piece is what you keep. Empty lines in the middle are lines too. Windows ends lines with `"\\r\\n"`, so drop a `"\\r"` from the end of a line before you report it. Each reader keeps its own text.',
    starter: `const createLineReader = onLine => {

};

// Scratch pad. Uncomment once your function returns something.
// const reader = createLineReader(line => console.log("line:", line));
// reader.push("first line\\nsecond ");
// reader.push("line\\nthird");
// reader.end();
`,
    skeleton: `const createLineReader = onLine => {
  let held = "";
  return {
    push(chunk) {
      const pieces = /* what you held and the new chunk, split on "\\n" */;
      held = /* the last piece, taken off the list */;
      // report every other piece, without a "\\r" at its end
    },
    end() {
      // report what is left, unless it is empty
    },
  };
};`,
    hints: [
      '`"a\\nb".split("\\n")` gives `["a", "b"]`, and `"a\\n".split("\\n")` gives `["a", ""]`. The last piece is always the text after the last newline, even when that text is empty.',
      'The two methods share one variable, `held`, declared in `createLineReader` and nowhere else. That closure is what lets a line started in one chunk be finished by the next.',
    ],
    approach: [
      'Declare `held = ""` inside `createLineReader`, so each reader has its own.',
      'In `push`, split `held + chunk` on `"\\n"`. Take the last piece off with `pop` and keep it in `held`.',
      'Call `onLine` for each remaining piece, after removing one `"\\r"` from its end if there is one.',
      'In `end`, report `held` the same way if it is not empty, then clear it.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: '(() => { const lines = []; const reader = createLineReader(line => lines.push(line)); reader.push("first line\\nsecond "); reader.push("line\\nthird"); reader.end(); return lines; })()', expected: ['first line', 'second line', 'third'] },
      { call: '(() => { const lines = []; const reader = createLineReader(line => lines.push(line)); reader.push("a\\nb"); const afterFirst = [...lines]; reader.push("c\\n"); const afterSecond = [...lines]; reader.end(); return [afterFirst, afterSecond, lines]; })()', expected: [['a'], ['a', 'bc'], ['a', 'bc']], label: 'a line is reported as soon as it is complete' },
      { call: '(() => { const lines = []; const reader = createLineReader(line => lines.push(line)); reader.push("no newline"); const before = lines.length; reader.end(); return [before, lines]; })()', expected: [0, ['no newline']], label: 'end reports the last piece' },
      { call: '(() => { const lines = []; const reader = createLineReader(line => lines.push(line)); reader.push("x\\n\\n"); reader.push("\\ny\\n"); reader.end(); return lines; })()', expected: ['x', '', '', 'y'], label: 'empty lines in the middle count', edge: true },
      { call: '(() => { const lines = []; const reader = createLineReader(line => lines.push(line)); reader.push("one\\r"); reader.push("\\ntwo\\r\\n"); reader.end(); return lines; })()', expected: ['one', 'two'], label: 'a Windows line ending split across two chunks', edge: true },
      { call: '(() => { const a = []; const b = []; const readerA = createLineReader(line => a.push(line)); const readerB = createLineReader(line => b.push(line)); readerA.push("left"); readerB.push("right\\n"); readerA.push(" side\\n"); return [a, b]; })()', expected: [['left side'], ['right']], label: 'each reader keeps its own text', edge: true },
    ],
  },

  /* ── Medium: closures that keep state ─────────────────────────────── */
  {
    id: 'js-mh-undo-redo',
    track: 'javascript',
    topic: 'javascript',
    level: 12,
    tier: 3,
    focus: ['closures', 'push', 'pop'],
    title: 'Undo and redo',
    prompt: 'A drawing app keeps its history in two stacks. Write `createHistory(initial)`, returning an object with four methods. `current()` returns the present value. `set(value)` makes `value` the present one. `undo()` goes back one step and `redo()` goes forward again, and both return the value that is present afterwards. Keep the past values and the undone values in two arrays inside the closure, and move values between them with `push` and `pop`. `set` pushes the old present onto the past and empties the undone values, because a new change starts a new branch. `undo` with no past, or `redo` with nothing undone, changes nothing and returns the present value. Each history is separate.',
    starter: `const createHistory = initial => {

};

// Scratch pad. Uncomment once your function returns something.
// const history = createHistory("blank");
// history.set("circle");
// console.log(history.undo(), history.redo());
`,
    skeleton: `const createHistory = initial => {
  let present = initial;
  const past = [];
  const undone = [];
  return {
    current: () => present,
    set(value) {
      // the old present goes onto the past, and nothing undone survives
    },
    undo() {
      // with a past: the present goes onto undone, the newest past comes back
      return present;
    },
    redo() {
      // the mirror image of undo
      return present;
    },
  };
};`,
    hints: [
      'An undo moves the present onto the undone stack and pops the newest value off the past. A redo does the same in the other direction.',
      'Check the length of a stack before you pop it. A value popped from a history can be `0`, `""` or `false`, so do not use `||` to spot an empty stack.',
    ],
    approach: [
      'Keep `present`, a `past` array and an `undone` array in the closure.',
      '`set(value)`: push `present` onto `past`, make `value` the present, and empty `undone`.',
      '`undo()`: if `past` has values, push `present` onto `undone` and pop the newest past value into `present`. Return `present` either way.',
      '`redo()`: the same, from `undone` back onto `past`.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: '(() => { const history = createHistory("blank"); history.set("circle"); history.set("square"); return [history.current(), history.undo(), history.undo(), history.current()]; })()', expected: ['square', 'circle', 'blank', 'blank'] },
      { call: '(() => { const history = createHistory(1); history.set(2); history.set(3); history.undo(); history.undo(); return [history.redo(), history.redo(), history.current()]; })()', expected: [2, 3, 3], label: 'redo goes forward again' },
      { call: '(() => { const history = createHistory("a"); return [history.undo(), history.redo(), history.current()]; })()', expected: ['a', 'a', 'a'], label: 'nothing to undo or redo changes nothing', edge: true },
      { call: '(() => { const history = createHistory("a"); history.set("b"); history.set("c"); history.undo(); history.set("d"); return [history.redo(), history.undo(), history.undo(), history.undo()]; })()', expected: ['d', 'b', 'a', 'a'], label: 'a new change clears what was undone', edge: true },
      { call: '(() => { const first = createHistory(0); const second = createHistory(10); first.set(1); second.set(11); first.undo(); return [first.current(), second.current()]; })()', expected: [0, 11], label: 'each history is separate', edge: true },
    ],
  },
  {
    id: 'js-mh-rate-limit',
    track: 'javascript',
    topic: 'javascript',
    level: 13,
    tier: 3,
    focus: ['closures', 'shift', 'push', 'while'],
    title: 'Allow so many requests a minute',
    prompt: 'An API lets each client make at most `limit` requests in any window of `windowMs` milliseconds. Write `createLimiter(limit, windowMs)`, returning an object with two methods. Both take the current time in milliseconds, and the times only ever move forward. `allow(now)` returns `true` if a request may go ahead now and `false` if it must be refused. `remaining(now)` returns how many more requests would be allowed right now, without making one. Keep the times of accepted requests in an array inside the closure, oldest first. Both methods start by removing, with `shift` in a `while` loop, every time that is `windowMs` or more before `now`. `allow` then accepts only if fewer than `limit` times are left, and records the request with `push`. A refused request is not recorded, and each limiter keeps its own times.',
    starter: `const createLimiter = (limit, windowMs) => {

};

// Scratch pad. Uncomment once your function returns something.
// const limiter = createLimiter(2, 1000);
// console.log(limiter.allow(0), limiter.allow(100), limiter.allow(200), limiter.remaining(1500));
`,
    skeleton: `const createLimiter = (limit, windowMs) => {
  const times = [];
  const forgetOld = now => {
    while (/* the oldest time is windowMs or more before now */) {
      // drop it
    }
  };
  return {
    allow(now) {
      forgetOld(now);
      // refuse when the window is full; otherwise record now and accept
    },
    remaining(now) {
      forgetOld(now);
      // how many more fit in the window
    },
  };
};`,
    hints: [
      'The times are in order, so the oldest one is always `times[0]`. Keep shifting it off while `now - times[0] >= windowMs`, and stop at the first time that is still inside the window.',
      'A `while` rather than an `if`: after a quiet spell, several old times can leave the window at once, and `remaining` has to see all of them go.',
    ],
    approach: [
      'Keep an array of accepted times inside `createLimiter`, so every limiter has its own.',
      'Write one helper that shifts old times off the front with a `while` loop, and call it first in both methods.',
      '`allow(now)`: if the array holds `limit` times or more, return `false`. Otherwise push `now` and return `true`.',
      '`remaining(now)`: return `limit` minus the number of times left.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: '(() => { const limiter = createLimiter(2, 1000); return [limiter.allow(0), limiter.allow(100), limiter.allow(200)]; })()', expected: [true, true, false] },
      { call: '(() => { const limiter = createLimiter(3, 60000); return [0, 10000, 20000, 30000, 60000, 65000, 70000, 80000].map(now => limiter.allow(now)); })()', expected: [true, true, true, false, true, false, true, true], label: 'the window slides along with the requests' },
      { call: '(() => { const limiter = createLimiter(3, 1000); const before = limiter.remaining(0); limiter.allow(0); limiter.allow(10); return [before, limiter.remaining(20), limiter.remaining(1005), limiter.remaining(5000)]; })()', expected: [3, 1, 2, 3], label: 'remaining counts only the current window' },
      { call: '(() => { const limiter = createLimiter(2, 1000); return [limiter.allow(0), limiter.allow(100), limiter.allow(999), limiter.allow(1000), limiter.allow(1100)]; })()', expected: [true, true, false, true, true], label: 'a request exactly windowMs later is in a new window', edge: true },
      { call: '(() => { const limiter = createLimiter(1, 100); return [limiter.allow(0), limiter.allow(50), limiter.allow(99), limiter.allow(100)]; })()', expected: [true, false, false, true], label: 'a refused request does not use up the window', edge: true },
      { call: '(() => { const a = createLimiter(1, 1000); const b = createLimiter(1, 1000); return [a.allow(0), b.allow(0), a.allow(10), b.allow(10)]; })()', expected: [true, true, false, false], label: 'each limiter keeps its own times', edge: true },
    ],
  },
  {
    id: 'js-mh-curry',
    track: 'javascript',
    topic: 'javascript',
    level: 13,
    tier: 3,
    focus: ['closures', 'spread', 'recursion'],
    title: 'Curry a function',
    prompt: 'Write `curry(fn)`, returning a version of `fn` that takes its arguments a few at a time. For `const add3 = (a, b, c) => a + b + c`, `curry(add3)(1)(2)(3)`, `curry(add3)(1, 2)(3)` and `curry(add3)(1)(2, 3)` all give 6. `fn.length` is how many parameters `fn` declares. Each call gathers the arguments so far, using rest parameters and spread syntax. Once there are at least `fn.length` of them, call `fn` with all of them and return its result. Until then, return a new function that remembers what has been gathered and goes on gathering. A function returned part of the way can be used again and again: with `const addOne = curry(add3)(1)`, `addOne(2)(3)` gives 6 and `addOne(10, 20)` gives 31.',
    starter: `const curry = fn => {

};

// Scratch pad. Uncomment once your function returns something.
// const add3 = (a, b, c) => a + b + c;
// console.log(curry(add3)(1)(2)(3), curry(add3)(1, 2)(3));
`,
    skeleton: `const curry = fn => {
  const gather = (...collected) => (...args) => {
    const all = /* what was collected, then the new arguments */;
    // enough arguments: call fn with all of them
    // not yet: return a function that goes on gathering from all
  };
  return gather();
};`,
    hints: [
      'Never change the array of arguments you have gathered so far. Build a new one with `[...collected, ...args]`, so a function returned part of the way can be called twice without the two calls seeing each other’s arguments.',
      'The function that goes on gathering is the same kind of function you are writing, started from more arguments. That is where the recursion is.',
    ],
    approach: [
      'Write a helper that takes the arguments collected so far and returns a function taking more.',
      'Inside that function, join the old and new arguments into a new array with spread syntax.',
      'If the new array has at least `fn.length` arguments, return `fn(...all)`. Otherwise return the helper called with the new array.',
      'Start by returning the helper called with no arguments at all.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: '(() => { const add3 = (a, b, c) => a + b + c; const curried = curry(add3); return [curried(1)(2)(3), curried(1, 2)(3), curried(1)(2, 3), curried(1, 2, 3)]; })()', expected: [6, 6, 6, 6] },
      { call: '(() => { const join = (a, b) => a + "-" + b; return curry(join)("x")("y"); })()', expected: 'x-y' },
      { call: 'typeof curry((a, b) => a * b)(2)', expected: 'function', label: 'too few arguments give back a function' },
      { call: '(() => { const add3 = (a, b, c) => a + b + c; const addOne = curry(add3)(1); return [addOne(2)(3), addOne(10, 20), addOne(2)(3)]; })()', expected: [6, 31, 6], label: 'a partial function can be used again', edge: true },
      { call: 'curry((a, b, ...rest) => rest.length)(1)(2, 3, 4)', expected: 2, label: 'extra arguments are passed on', edge: true },
      { call: 'curry(() => "now")()', expected: 'now', label: 'a function with no parameters', edge: true },
    ],
  },

  /* ── Medium: arrays and grids ─────────────────────────────────────── */
  {
    id: 'js-mh-spiral',
    track: 'javascript',
    topic: 'javascript',
    level: 9,
    tier: 3,
    focus: ['while', 'for', 'push'],
    title: 'Read a grid in a spiral',
    prompt: 'Write `spiral(grid)`, returning every value of a rectangular grid in spiral order: along the top row from left to right, down the right column, back along the bottom row from right to left, up the left column, and then the same again one ring further in. `spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9]])` gives `[1, 2, 3, 6, 9, 8, 7, 4, 5]`. Keep four bounds: `top`, `bottom`, `left` and `right`. A `while` loop runs while `top <= bottom` and `left <= right`. Inside it, four `for` loops each walk one side, `push` its values and move one bound inwards. Check the bounds again before the bottom row and before the left column, or a single row or column left in the middle is read twice. Leave `grid` unchanged.',
    starter: `const spiral = grid => {

};

// Scratch pad. Change this and press Run.
console.log(spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9]]));
`,
    skeleton: `const spiral = grid => {
  const values = [];
  let top = 0;
  let bottom = grid.length - 1;
  let left = 0;
  let right = grid.length > 0 ? grid[0].length - 1 : -1;
  while (top <= bottom && left <= right) {
    // the top row, left to right, then top++
    // the right column, downwards, then right--
    // if a row is left: the bottom row, right to left, then bottom--
    // if a column is left: the left column, upwards, then left++
  }
  return values;
};`,
    hints: [
      'After each side, move its bound one step inwards: `top++` after the top row, `right--` after the right column, and so on. The next side then starts one cell further along, so no corner is read twice.',
      'Try a grid of one row, `[[1, 2, 3]]`. After the top row, `top` is past `bottom`, and without a second check the bottom row would add `3, 2, 1` again.',
    ],
    approach: [
      'Set the four bounds from the grid’s size. An empty grid has no rows, so give `right` a value that stops the loop at once.',
      'In the `while` loop, walk the top row with `for` and push each value, then move `top` down. Walk the right column the same way, then move `right` left.',
      'If `top <= bottom` still holds, walk the bottom row from right to left and move `bottom` up.',
      'If `left <= right` still holds, walk the left column from bottom to top and move `left` right.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9]])', expected: [1, 2, 3, 6, 9, 8, 7, 4, 5] },
      { call: 'spiral([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]])', expected: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7], label: 'a wide grid' },
      { call: 'spiral([[1, 2], [3, 4], [5, 6], [7, 8]])', expected: [1, 2, 4, 6, 8, 7, 5, 3], label: 'a tall grid' },
      { call: 'spiral([[1, 2, 3]])', expected: [1, 2, 3], label: 'a single row is read once', edge: true },
      { call: 'spiral([[1], [2], [3]])', expected: [1, 2, 3], label: 'a single column is read once', edge: true },
      { call: 'spiral([])', expected: [], label: 'an empty grid', edge: true },
    ],
  },
  {
    id: 'js-mh-paint-bucket',
    track: 'javascript',
    topic: 'javascript',
    level: 16,
    tier: 3,
    focus: ['recursion', 'map'],
    title: 'Paint bucket',
    prompt: 'A paint program stores a picture as a grid of colour names, one array per row. Write `paintBucket(grid, row, col, colour)`, returning a new grid in which the cell at `[row, col]`, and every cell joined to it through cells of the same colour, is painted `colour`. Cells are joined up, down, left and right, never diagonally. Copy the grid first with `map`, row by row, so the caller’s grid is not changed. Then paint with a recursive function that paints one cell and calls itself for its four neighbours. It stops at the edge of the grid and at any cell that is not the starting colour. If the starting cell already has `colour`, return an unchanged copy.',
    starter: `const paintBucket = (grid, row, col, colour) => {

};

// Scratch pad. Change this and press Run.
console.log(paintBucket([["w", "w", "b"], ["w", "b", "b"], ["b", "w", "w"]], 0, 0, "r"));
`,
    skeleton: `const paintBucket = (grid, row, col, colour) => {
  const copy = /* every row copied */;
  const from = copy[row][col];
  if (from === colour) return copy;
  const paint = (r, c) => {
    // stop outside the grid, and at a cell that is not the starting colour
    // paint this cell, then its four neighbours
  };
  paint(row, col);
  return copy;
};`,
    hints: [
      '`grid.map(row => [...row])` copies every row. `[...grid]` alone copies only the outer array, and the rows would still be the caller’s.',
      'A painted cell no longer has the starting colour, so the recursion never visits it twice. That is also why a starting cell that already has `colour` must stop straight away: every cell would look unpainted forever.',
    ],
    approach: [
      'Copy the grid row by row with `map`, and read the starting colour from the copy.',
      'If the starting colour is already `colour`, return the copy.',
      'Write `paint(r, c)`: return at once if `r` or `c` is outside the grid or the cell is not the starting colour. Otherwise set the cell to `colour` and call `paint` for the cells above, below, left and right.',
      'Call `paint(row, col)` and return the copy.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'paintBucket([["w", "w", "b"], ["w", "b", "b"], ["b", "w", "w"]], 0, 0, "r")', expected: [['r', 'r', 'b'], ['r', 'b', 'b'], ['b', 'w', 'w']] },
      { call: 'paintBucket([["s", "s", "s", "s"], ["s", "t", "t", "s"], ["s", "t", "s", "s"], ["t", "s", "s", "t"]], 1, 1, "o")', expected: [['s', 's', 's', 's'], ['s', 'o', 'o', 's'], ['s', 'o', 's', 's'], ['t', 's', 's', 't']], label: 'only the joined cells of that colour' },
      { call: 'paintBucket([["b", "w"], ["w", "b"]], 0, 0, "g")', expected: [['g', 'w'], ['w', 'b']], label: 'diagonal cells are not joined', edge: true },
      { call: 'paintBucket([["x", "x"], ["x", "x"]], 1, 1, "x")', expected: [['x', 'x'], ['x', 'x']], label: 'the cell already has that colour', edge: true },
      { call: '(() => { const grid = [["a", "a"], ["b", "a"]]; paintBucket(grid, 0, 0, "z"); return grid; })()', expected: [['a', 'a'], ['b', 'a']], label: 'the caller’s grid is not changed', edge: true },
    ],
  },
  {
    id: 'js-mh-sudoku-check',
    track: 'javascript',
    topic: 'javascript',
    level: 20,
    tier: 3,
    focus: ['nested-loops', 'map-set', 'every'],
    title: 'Is this sudoku valid so far?',
    prompt: 'A sudoku board is 9 rows of 9 cells, each a digit from 1 to 9, or 0 for an empty cell. Write `isValidSudoku(board)`, returning `true` when no digit repeats within any row, any column or any of the nine 3 × 3 boxes. Empty cells never clash, and the board does not have to be complete or solvable. First check with `every` that the board has 9 rows of 9 cells, and return `false` if it does not. Then walk the board with two nested loops and remember what each row, column and box has seen in a `Set`, 27 sets in all. The box of cell `[r, c]` is number `Math.floor(r / 3) * 3 + Math.floor(c / 3)`.',
    starter: `const isValidSudoku = board => {

};

// Scratch pad. Change this and press Run.
const rows = ["530070000", "600195000", "098000060", "800060003", "400803001", "700020006", "060000280", "000419005", "000080079"];
console.log(isValidSudoku(rows.map(row => [...row].map(Number))));
`,
    skeleton: `const isValidSudoku = board => {
  if (/* not 9 rows of 9 cells */) return false;
  const rows = /* nine empty Sets */;
  const columns = /* nine empty Sets */;
  const boxes = /* nine empty Sets */;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const digit = board[r][c];
      // skip an empty cell
      // a digit this row, column or box has seen already is a clash
      // otherwise remember it in all three
    }
  }
  return true;
};`,
    hints: [
      '`Array.from({ length: 9 }, () => new Set())` makes nine separate Sets. `new Array(9).fill(new Set())` would put the same Set in every place.',
      'Each cell belongs to exactly one row Set, one column Set and one box Set. Check all three before adding the digit to any of them.',
    ],
    approach: [
      'Return `false` unless the board has 9 rows and `every` row has 9 cells.',
      'Make nine Sets each for the rows, the columns and the boxes.',
      'Loop over every cell. Skip a 0. Work out the box number, and return `false` if the row’s, the column’s or the box’s Set already has the digit.',
      'Add the digit to all three Sets. If the loops finish, return `true`.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'isValidSudoku(["530070000", "600195000", "098000060", "800060003", "400803001", "700020006", "060000280", "000419005", "000080079"].map(row => [...row].map(Number)))', expected: true },
      { call: 'isValidSudoku(["500000005", "000000000", "000000000", "000000000", "000000000", "000000000", "000000000", "000000000", "000000000"].map(row => [...row].map(Number)))', expected: false, label: 'a digit twice in one row' },
      { call: 'isValidSudoku(["500000000", "000000000", "000000000", "000000000", "000000000", "000000000", "000000000", "000000000", "500000000"].map(row => [...row].map(Number)))', expected: false, label: 'a digit twice in one column' },
      { call: 'isValidSudoku(["500000000", "050000000", "000000000", "000000000", "000000000", "000000000", "000000000", "000000000", "000000000"].map(row => [...row].map(Number)))', expected: false, label: 'a digit twice in one box', edge: true },
      { call: 'isValidSudoku(["500000000", "000000000", "000000000", "000000000", "000050000", "000000000", "000000000", "000000000", "000000005"].map(row => [...row].map(Number)))', expected: true, label: 'the same digit in different rows, columns and boxes', edge: true },
      { call: 'isValidSudoku(Array.from({ length: 9 }, () => new Array(9).fill(0)))', expected: true, label: 'empty cells never clash', edge: true },
      { call: 'isValidSudoku(Array.from({ length: 8 }, () => new Array(9).fill(0)))', expected: false, label: 'a board of 8 rows', edge: true },
    ],
  },
  {
    id: 'js-mh-thread-from-list',
    track: 'javascript',
    topic: 'javascript',
    level: 23,
    tier: 3,
    focus: ['map-set', 'for-of', 'objects'],
    title: 'Build a comment thread',
    prompt: 'Comments come from the database as a flat list of `{ id, parentId, text }` objects, where `parentId` is the `id` of the comment being replied to, or `null` for a top-level comment. Write `buildThread(comments)`, returning the top-level comments as a tree. Each node is `{ id, text, replies }`, and `replies` holds the nodes that answer it. Every list keeps the order the comments have in the input, even when a reply comes before its parent. A comment whose parent is not in the list goes to the top level, so nothing is lost. Make the nodes and a `Map` from each id to its node in one `for...of` pass, then attach each node to its parent’s `replies` in a second pass. Leave `comments` unchanged.',
    starter: `const buildThread = comments => {

};

// Scratch pad. Change this and press Run.
console.log(JSON.stringify(buildThread([
  { id: 1, parentId: null, text: "First!" },
  { id: 2, parentId: 1, text: "Welcome" },
]), null, 2));
`,
    skeleton: `const buildThread = comments => {
  const nodes = new Map();
  for (const { id, text } of comments) {
    // one new node per comment, found by its id
  }
  const roots = [];
  for (const comment of comments) {
    const node = nodes.get(comment.id);
    // into the parent's replies when the parent exists, otherwise into roots
  }
  return roots;
};`,
    hints: [
      'Two passes are what make the order of the input stop mattering: after the first pass every node exists, so a reply can find its parent even when the parent comes later in the list.',
      'Ask the Map whether the parent exists with `nodes.has(parentId)`. An id can be `0`, so `if (parentId)` would treat a real parent as no parent.',
    ],
    approach: [
      'First pass: for each comment, make a new node `{ id, text, replies: [] }` and store it in a Map under its id.',
      'Second pass, in input order: look up the comment’s node. If the Map has its `parentId`, push the node onto that parent’s `replies`.',
      'Otherwise push it onto the list of top-level nodes: that covers `null` and a parent that is missing.',
      'Return the top-level list. The comments themselves were only read, never changed.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'buildThread([{ id: 1, parentId: null, text: "First!" }, { id: 2, parentId: 1, text: "Welcome" }, { id: 3, parentId: null, text: "Question" }, { id: 4, parentId: 2, text: "Thanks" }])', expected: [{ id: 1, text: 'First!', replies: [{ id: 2, text: 'Welcome', replies: [{ id: 4, text: 'Thanks', replies: [] }] }] }, { id: 3, text: 'Question', replies: [] }] },
      { call: 'buildThread([{ id: 1, parentId: null, text: "p" }, { id: 3, parentId: 1, text: "c" }, { id: 2, parentId: 1, text: "b" }])', expected: [{ id: 1, text: 'p', replies: [{ id: 3, text: 'c', replies: [] }, { id: 2, text: 'b', replies: [] }] }], label: 'replies keep the input order' },
      { call: 'buildThread([{ id: "b", parentId: "a", text: "reply" }, { id: "a", parentId: null, text: "post" }])', expected: [{ id: 'a', text: 'post', replies: [{ id: 'b', text: 'reply', replies: [] }] }], label: 'a reply listed before its parent', edge: true },
      { call: 'buildThread([{ id: 7, parentId: 99, text: "orphan" }, { id: 8, parentId: null, text: "root" }])', expected: [{ id: 7, text: 'orphan', replies: [] }, { id: 8, text: 'root', replies: [] }], label: 'a missing parent puts the comment at the top level', edge: true },
      { call: 'buildThread([])', expected: [], label: 'no comments', edge: true },
    ],
  },

  /* ── Medium: sums, deep values and async batches ──────────────────── */
  {
    id: 'js-mh-who-owes-what',
    track: 'javascript',
    topic: 'javascript',
    level: 9,
    tier: 3,
    focus: ['reduce', 'objects', 'destructuring'],
    title: 'Who owes what',
    prompt: 'Friends log shared costs as `{ paidBy, amount, split }` objects: `amount` is in cents, and `split` lists everyone who shares the cost, which includes the payer only if the payer is listed. Write `balances(expenses)`, returning an object that maps each person to a balance in cents: everything they paid, minus their share of every cost in which they are listed. A positive balance means the group owes them. Each share is `Math.floor(amount / split.length)`, and the cents left over go one each to the first people in `split`, so the shares add up to exactly `amount`. Everyone who paid or shared appears, even at 0. Build the object with `reduce`, and destructure each expense in the callback’s parameters.',
    starter: `const balances = expenses => {

};

// Scratch pad. Change this and press Run.
console.log(balances([{ paidBy: "Ada", amount: 3000, split: ["Ada", "Ben", "Cy"] }]));
`,
    skeleton: `const balances = expenses =>
  expenses.reduce((totals, { paidBy, amount, split }) => {
    // the payer gains amount
    const share = /* the equal part, rounded down */;
    const leftOver = /* the cents that do not divide evenly */;
    // everyone in split loses their share, and the first leftOver people one cent more
    return totals;
  }, {});`,
    hints: [
      'Start the accumulator at `{}` and return it from every call of the callback. A person you have not seen yet has no balance, so read it as `(totals[name] ?? 0)`.',
      'For 1000 cents between three people, `Math.floor(1000 / 3)` is 333 and `1000 % 3` is 1 left over, so the first person pays 334.',
    ],
    approach: [
      'Call `reduce` on the expenses with `{}` as the starting value, and write the callback as `(totals, { paidBy, amount, split }) => ...`.',
      'Add `amount` to the payer’s balance.',
      'Work out the equal share and the cents left over. Go through `split` with its index, and take the share from each person, plus one cent while the index is below the number left over.',
      'Return `totals` from the callback, and `reduce` returns the finished object.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'balances([{ paidBy: "Ada", amount: 3000, split: ["Ada", "Ben", "Cy"] }])', expected: { Ada: 2000, Ben: -1000, Cy: -1000 } },
      { call: 'balances([{ paidBy: "Ada", amount: 3000, split: ["Ada", "Ben", "Cy"] }, { paidBy: "Ben", amount: 1200, split: ["Ada", "Ben"] }])', expected: { Ada: 1400, Ben: -400, Cy: -1000 }, label: 'balances add up over several costs' },
      { call: 'balances([{ paidBy: "Cy", amount: 1000, split: ["Ada", "Ben", "Cy"] }])', expected: { Ada: -334, Ben: -333, Cy: 667 }, label: 'left-over cents go to the first people in split', edge: true },
      { call: 'balances([{ paidBy: "Dee", amount: 500, split: ["Ada", "Ben"] }])', expected: { Dee: 500, Ada: -250, Ben: -250 }, label: 'a payer who does not share the cost', edge: true },
      { call: 'balances([{ paidBy: "Ada", amount: 100, split: ["Ben"] }, { paidBy: "Ben", amount: 100, split: ["Ada"] }])', expected: { Ada: 0, Ben: 0 }, label: 'everyone is listed, even at 0', edge: true },
      { call: 'balances([])', expected: {}, label: 'no costs', edge: true },
    ],
  },
  {
    id: 'js-mh-deep-equal',
    track: 'javascript',
    topic: 'javascript',
    level: 19,
    tier: 3,
    focus: ['recursion', 'objects', 'every'],
    title: 'Equal all the way down',
    prompt: '`===` compares objects and arrays by identity, so two separately built `{ a: [1, 2] }` are not equal. Write `deepEqual(a, b)` for values made of numbers, strings, booleans, `null`, `undefined`, arrays and plain objects. Two values are equal when `Object.is` says they are; or when both are arrays of the same length whose items are equal at every index; or when both are plain objects that are not arrays, with the same keys and equal values under each key. Compare the children by calling `deepEqual` on them, and use `every` to check all of them. The order of the keys does not matter. An array never equals an object, not even an object with the keys `"0"` and `"1"`, and `NaN` equals `NaN`.',
    starter: `const deepEqual = (a, b) => {

};

// Scratch pad. Change this and press Run.
console.log(deepEqual({ a: [1, 2] }, { a: [1, 2] }));
`,
    skeleton: `const deepEqual = (a, b) => {
  if (Object.is(a, b)) return true;
  // both must be objects, and not null, to be equal from here on
  // an array only equals an array
  // arrays: the same length, and every item equal
  // objects: the same number of keys, and every key of a in b with an equal value
};`,
    hints: [
      '`typeof null` is `"object"`, so check for `null` yourself before reading keys. `Array.isArray` is the only reliable way to tell an array from an object.',
      'Comparing key counts is not enough on its own: `{ a: undefined }` and `{ b: undefined }` have one key each. Check that every key of `a` is an own key of `b` with `Object.hasOwn`.',
    ],
    approach: [
      'Return `true` when `Object.is(a, b)`. That covers numbers, strings, booleans, `null`, `undefined`, `NaN` and the same object twice.',
      'Return `false` unless both are objects and neither is `null`, and unless both are arrays or neither is.',
      'For arrays, compare the lengths, then use `every` to call `deepEqual` on the items at each index.',
      'For objects, compare the number of keys, then use `every` over the keys of `a`: each must be an own key of `b` whose value is `deepEqual` to `a`’s.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'deepEqual({ a: [1, 2], b: { c: "x" } }, { b: { c: "x" }, a: [1, 2] })', expected: true, label: 'key order does not matter' },
      { call: 'deepEqual([1, [2, [3]]], [1, [2, [4]]])', expected: false, label: 'a difference deep inside' },
      { call: 'deepEqual({ a: 1 }, { a: 1, b: 2 })', expected: false, label: 'an extra key', edge: true },
      { call: 'deepEqual([1, 2], { 0: 1, 1: 2 })', expected: false, label: 'an array is not an object', edge: true },
      { call: 'deepEqual(NaN, NaN)', expected: true, label: 'NaN equals NaN', edge: true },
      { call: 'deepEqual(null, {})', expected: false, label: 'null is not an empty object', edge: true },
    ],
  },
  {
    id: 'js-mh-in-batches',
    track: 'javascript',
    topic: 'javascript',
    level: 22,
    tier: 3,
    focus: ['async-await', 'slice', 'promises'],
    title: 'Upload in batches',
    prompt: 'Uploading 1,000 photos at once overloads the server, and uploading them one by one is slow. Write an `async` function `inBatches(items, size, worker)` that calls `worker(item)` for every item, `size` items at a time. `worker` returns a promise. Start a whole batch together, wait with `Promise.all` until every item in it has finished, and only then start the next batch. Cut the batches with `slice`. Resolve with all the results, in the same order as `items`. If a worker rejects, `inBatches` rejects with the same error and starts no further batch.',
    starter: `const inBatches = async (items, size, worker) => {

};

// Scratch pad. Change this and press Run.
const upload = photo => new Promise(done => setTimeout(() => done(photo + " uploaded"), 10));
inBatches(["a.jpg", "b.jpg", "c.jpg"], 2, upload).then(console.log);
`,
    skeleton: `const inBatches = async (items, size, worker) => {
  const results = [];
  for (let start = 0; start < items.length; start += size) {
    const batch = /* size items from start */;
    // start every item of the batch, then wait for all of them
    // add the batch's results
  }
  return results;
};`,
    hints: [
      '`await` inside a `for` loop pauses the loop, so the next batch cannot start before the current one has finished.',
      '`Promise.all` resolves with the results in the order of the promises you gave it, whatever order they finish in, and it rejects as soon as one of them rejects.',
    ],
    approach: [
      'Loop over the start index of each batch, in steps of `size`.',
      'Cut the batch with `items.slice(start, start + size)` and call `worker` on each item, which starts them all.',
      'Await `Promise.all` of those promises and push its results onto the result list.',
      'Return the list. An error thrown by `await` leaves the loop, so no later batch starts.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'inBatches([1, 2, 3, 4, 5], 2, n => new Promise(done => setTimeout(() => done(n * 10), 50 - n * 5)))', expected: [10, 20, 30, 40, 50], label: 'results in the order of the items', async: true },
      { call: '(async () => { const log = []; await inBatches(["a", "b", "c", "d", "e"], 2, async item => { log.push("start " + item); await new Promise(done => setTimeout(done, item === "a" ? 30 : 10)); log.push("end " + item); return item; }); return log; })()', expected: ['start a', 'start b', 'end b', 'end a', 'start c', 'start d', 'end c', 'end d', 'start e', 'end e'], label: 'the next batch waits for the slowest item before it', async: true },
      { call: '(async () => { let active = 0; let most = 0; const out = await inBatches([1, 2, 3], 10, async n => { active++; most = Math.max(most, active); await new Promise(done => setTimeout(done, 5)); active--; return n + 1; }); return [out, most]; })()', expected: [[2, 3, 4], 3], label: 'a batch bigger than the list', edge: true, async: true },
      { call: 'inBatches([], 3, async n => n)', expected: [], label: 'no items', edge: true, async: true },
      { call: '(async () => { const started = []; try { await inBatches([1, 2, 3, 4], 2, async n => { started.push(n); await new Promise(done => setTimeout(done, 5)); if (n === 2) throw new Error("upload " + n + " failed"); return n; }); return "resolved"; } catch (error) { return [error.message, started]; } })()', expected: ['upload 2 failed', [1, 2]], label: 'a failure rejects and starts no further batch', edge: true, async: true },
    ],
  },
  {
    id: 'js-mh-latest-only',
    track: 'javascript',
    topic: 'javascript',
    level: 22,
    tier: 3,
    focus: ['promises', 'closures', 'async-await'],
    title: 'Only the newest call answers',
    prompt: 'A search box calls an async `search(query)` on every keystroke, and a slow answer to an old query can arrive after the answer to a newer one. Write `latestOnly(search)`, returning a function `run(...args)` that calls `search(...args)` straight away and returns a promise. If no other call of `run` has started by the time that search settles, the promise resolves to `{ stale: false, value }` with the search’s result, or rejects with its error if the search failed. If a later call has started in the meantime, the answer is stale: the promise resolves to `{ stale: true }`, whether the search succeeded or failed. Count the calls in the closure, and compare the count when each one settles. Two wrapped functions keep separate counts.',
    starter: `const latestOnly = search => {

};

// Scratch pad. Uncomment once your function returns something.
// const search = query => new Promise(done => setTimeout(() => done(query.toUpperCase()), query === "ca" ? 50 : 10));
// const run = latestOnly(search);
// run("ca").then(console.log);
// run("cat").then(console.log);
`,
    skeleton: `const latestOnly = search => {
  let started = 0;
  return async (...args) => {
    const mine = /* this call's number */;
    try {
      const value = await search(...args);
      // still the newest call? then the value counts
    } catch (error) {
      // an old failure is as stale as an old answer; a new one is passed on
    }
  };
};`,
    hints: [
      'Give each call a number from a counter that lives in the closure: `const mine = ++started`. When the search settles, the call is the newest one exactly when `mine === started`.',
      'Put the `await` inside `try`. In `catch`, return `{ stale: true }` for an old call, and `throw error` again for the newest one.',
    ],
    approach: [
      'Keep a counter of started calls inside `latestOnly`, so each wrapped function has its own.',
      'Return an `async` function. It takes the next number from the counter and calls `search(...args)` straight away.',
      'After `await`, compare its number with the counter: equal means `{ stale: false, value }`, different means `{ stale: true }`.',
      'In `catch`, do the same comparison: rethrow the error for the newest call, and return `{ stale: true }` for an older one.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: '(async () => { const search = query => new Promise(done => setTimeout(() => done(query.toUpperCase()), query === "ca" ? 50 : 10)); const run = latestOnly(search); const first = run("ca"); const second = run("cat"); return [await first, await second]; })()', expected: [{ stale: true }, { stale: false, value: 'CAT' }], async: true },
      { call: '(async () => { const echo = query => new Promise(done => setTimeout(() => done(query), 10)); const run = latestOnly(echo); const a = await run("a"); const b = await run("b"); return [a, b]; })()', expected: [{ stale: false, value: 'a' }, { stale: false, value: 'b' }], label: 'a call that settles before the next one starts is not stale', async: true },
      { call: '(async () => { const wait = (value, ms) => new Promise(done => setTimeout(() => done(value), ms)); const run = latestOnly(wait); const first = run("old", 10); const second = run("new", 40); return [await first, await second]; })()', expected: [{ stale: true }, { stale: false, value: 'new' }], label: 'a newer call makes an older one stale before it answers', edge: true, async: true },
      { call: '(async () => { const fail = query => Promise.reject(new Error("no results for " + query)); const run = latestOnly(fail); try { await run("zzz"); return "resolved"; } catch (error) { return error.message; } })()', expected: 'no results for zzz', label: 'the newest call passes its error on', edge: true, async: true },
      { call: '(async () => { const search = query => new Promise((done, fail) => setTimeout(() => (query === "bad" ? fail(new Error("boom")) : done(query)), query === "bad" ? 30 : 5)); const run = latestOnly(search); const first = run("bad"); const second = run("good"); return [await first, await second]; })()', expected: [{ stale: true }, { stale: false, value: 'good' }], label: 'an old failure is only stale', edge: true, async: true },
      { call: '(async () => { const echo = query => new Promise(done => setTimeout(() => done(query), 10)); const runA = latestOnly(echo); const runB = latestOnly(echo); const a = runA("a"); const b = runB("b"); return [await a, await b]; })()', expected: [{ stale: false, value: 'a' }, { stale: false, value: 'b' }], label: 'two wrapped functions count separately', edge: true, async: true },
    ],
  },

  /* ── Hard: algorithms on lists and grids ──────────────────────────── */
  {
    id: 'js-mh-settle-up',
    track: 'javascript',
    topic: 'javascript',
    level: 24,
    tier: 4,
    focus: ['sort', 'while', 'two-pointer', 'objects'],
    title: 'Settle up after a trip',
    prompt: 'After a trip, `balances` maps each person to a balance in cents: positive means the group owes them, negative means they owe the group, and the balances add up to 0. Write `settleUp(balances)`, returning the payments that settle every debt, as `{ from, to, amount }` objects in the order they are made. Follow one greedy rule, so everyone gets the same answer. Put the people who owe in one list and the people who are owed in another, leave out anyone at 0, and `sort` each list from the largest amount to the smallest, breaking a tie by name from A to Z. Then walk both lists with two indexes in a `while` loop: the current debtor pays the current creditor the smaller of what one owes and the other is owed. Whoever that brings to 0 is done, and their index moves on. Whoever still has an amount left stays current, even if someone later in the list now has more. Leave `balances` unchanged.',
    starter: `const settleUp = balances => {

};

// Scratch pad. Change this and press Run.
console.log(settleUp({ Ada: 1400, Ben: -400, Cy: -1000 }));
`,
    skeleton: `const settleUp = balances => {
  const debtors = [];
  const creditors = [];
  // one { name, amount } per person who owes or is owed, amounts positive
  const byAmountThenName = (a, b) => /* largest first, then A to Z */;
  debtors.sort(byAmountThenName);
  creditors.sort(byAmountThenName);
  const payments = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    // the smaller amount moves from debtors[d] to creditors[c]
    // whoever reaches 0 is done: move that index on
  }
  return payments;
};`,
    hints: [
      'Copy each person into a new `{ name, amount }` object with a positive amount, and change only the copies as payments are made. That keeps `balances` as it was and makes both lists sort the same way.',
      'A compare function can chain two rules with `||`: `b.amount - a.amount` is 0 for a tie, and then the name comparison decides. Compare names with `<` and `>`, returning `-1`, `1` or `0`.',
    ],
    approach: [
      'Go through `Object.entries(balances)`. A negative balance goes into the debtors as a positive amount; a positive one into the creditors; 0 goes nowhere.',
      'Sort both lists from the largest amount down, and by name from A to Z on a tie.',
      'While both indexes are inside their lists, pay the smaller of the two current amounts, record `{ from, to, amount }`, and take it off both.',
      'Move the debtor’s index on if they reach 0, and the creditor’s if they do. Both can reach 0 in the same payment.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    tests: [
      { call: 'settleUp({ Ada: 1400, Ben: -400, Cy: -1000 })', expected: [{ from: 'Cy', to: 'Ada', amount: 1000 }, { from: 'Ben', to: 'Ada', amount: 400 }] },
      { call: 'settleUp({ a: 500, b: 300, c: -600, d: -200 })', expected: [{ from: 'c', to: 'a', amount: 500 }, { from: 'c', to: 'b', amount: 100 }, { from: 'd', to: 'b', amount: 200 }], label: 'one debtor pays two creditors' },
      { call: 'settleUp({ Zoe: 100, Amy: 100, Max: -100, Bob: -100 })', expected: [{ from: 'Bob', to: 'Amy', amount: 100 }, { from: 'Max', to: 'Zoe', amount: 100 }], label: 'equal amounts go in name order', edge: true },
      { call: 'settleUp({ Ann: 0, Ben: 0 })', expected: [], label: 'nobody at 0 pays or is paid', edge: true },
      { call: 'settleUp({})', expected: [], label: 'no balances', edge: true },
      { call: '(() => { const balances = { x: 50, y: -50 }; settleUp(balances); return balances; })()', expected: { x: 50, y: -50 }, label: 'balances is not changed', edge: true },
    ],
  },
  {
    id: 'js-mh-line-diff',
    track: 'javascript',
    topic: 'javascript',
    level: 25,
    tier: 4,
    focus: ['nested-loops', 'while', 'push'],
    title: 'What changed between two versions',
    prompt: 'Write `diffLines(before, after)`, comparing two arrays of lines and returning the edit that turns the first into the second, as a list of `[mark, line]` pairs: `" "` for a line both keep, `"-"` for a line only `before` has and `"+"` for a line only `after` has. Read in order, the `" "` and `"-"` lines spell out `before`, and the `" "` and `"+"` lines spell out `after`. Keep as many lines as possible: the kept lines must be a longest common subsequence of the two arrays. Fill a table with two nested loops, where `table[i][j]` is the length of the longest common subsequence of `before.slice(i)` and `after.slice(j)`, working backwards from the ends. Then walk forwards from `[0, 0]` in a `while` loop and `push` one pair per step. Keep the line when both sides match. Otherwise remove the line from `before` if that keeps the table’s best length, and add the line from `after` if it does not. Removing wins a tie, so a changed line shows its `-` before its `+`.',
    starter: `const diffLines = (before, after) => {

};

// Scratch pad. Change this and press Run.
console.log(diffLines(["a", "b", "c"], ["a", "c", "d"]));
`,
    skeleton: `const diffLines = (before, after) => {
  // (before.length + 1) rows of (after.length + 1) zeros
  const table = [];
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      // equal lines: one more than the cell diagonally below
      // otherwise: the better of skipping a line of before or of after
    }
  }
  const edit = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    // keep, remove or add, and move i, j or both
  }
  return edit;
};`,
    hints: [
      'The table has one extra row and column of zeros: once one side has run out, nothing more can be kept. Fill it from the bottom right, so `table[i + 1][j]`, `table[i][j + 1]` and `table[i + 1][j + 1]` are ready when you need them.',
      'In the walk, removing `before[i]` keeps the best length exactly when `table[i + 1][j] >= table[i][j + 1]`. Once one array has run out, every step takes from the other one.',
    ],
    approach: [
      'Make the table with `before.length + 1` rows of `after.length + 1` zeros.',
      'Loop `i` down from the last line of `before` and, inside, `j` down from the last line of `after`. Equal lines give `table[i + 1][j + 1] + 1`; different ones give the larger of `table[i + 1][j]` and `table[i][j + 1]`.',
      'Walk with `i` and `j` from 0. Matching lines push `[" ", line]` and move both on.',
      'Otherwise push `["-", before[i]]` and move `i` when `after` has run out or removing keeps the best length; else push `["+", after[j]]` and move `j`.',
    ],
    verify: 'tests',
    estimatedMinutes: 40,
    tests: [
      { call: 'diffLines(["a", "b", "c"], ["a", "c", "d"])', expected: [[' ', 'a'], ['-', 'b'], [' ', 'c'], ['+', 'd']] },
      { call: '(() => { const before = ["title", "intro", "body", "outro", "sign-off"]; const after = ["title", "body", "extra", "outro", "thanks", "sign-off"]; const edit = diffLines(before, after); const kept = edit.filter(([mark]) => mark === " ").length; return [kept, edit.filter(([mark]) => mark !== "+").map(([, line]) => line), edit.filter(([mark]) => mark !== "-").map(([, line]) => line)]; })()', expected: [4, ['title', 'intro', 'body', 'outro', 'sign-off'], ['title', 'body', 'extra', 'outro', 'thanks', 'sign-off']], label: 'the edit spells out both versions and keeps the most lines' },
      { call: 'diffLines(["same"], ["same"])', expected: [[' ', 'same']], label: 'nothing changed' },
      { call: 'diffLines(["old"], ["new"])', expected: [['-', 'old'], ['+', 'new']], label: 'a changed line: the removal comes first', edge: true },
      { call: 'diffLines([], ["x", "y"])', expected: [['+', 'x'], ['+', 'y']], label: 'everything added', edge: true },
      { call: 'diffLines(["x", "y"], [])', expected: [['-', 'x'], ['-', 'y']], label: 'everything removed', edge: true },
    ],
  },
  {
    id: 'js-mh-word-search',
    track: 'javascript',
    topic: 'javascript',
    level: 25,
    tier: 4,
    focus: ['recursion', 'nested-loops', 'some'],
    title: 'Find a word in a letter grid',
    prompt: 'In a word search, a word is traced through a grid of letters by stepping from each letter to the next one up, down, left or right, never diagonally, and without using any cell twice. Write `findWord(grid, word)`, where `grid` is an array of equal-length strings, one per row. Return the `[row, column]` cells that spell the word, in order, or `null` if it cannot be traced. Try every cell as a start with two nested loops, row by row from the top left. From each start, follow the word with a recursive function that marks its cell as used, tries the neighbours in the order up, right, down, left with `some`, and unmarks the cell again if no path from it works, so that another path can use it. Return the first path found in that order. An empty word gives `[]`.',
    starter: `const findWord = (grid, word) => {

};

// Scratch pad. Change this and press Run.
console.log(findWord(["ABCE", "SFCS", "ADEE"], "ABCCED"));
`,
    skeleton: `const STEPS = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // up, right, down, left

const findWord = (grid, word) => {
  if (word === "") return [];
  const used = new Set();
  const path = [];
  const follow = (row, col, index) => {
    // false off the grid, on a used cell, or on the wrong letter
    // mark the cell and add it to the path
    // the last letter? then the word is found
    // otherwise try the neighbours; if none works, unmark and remove the cell
  };
  // try every cell as a start, row by row
  return null;
};`,
    hints: [
      '`some` stops at the first neighbour whose call returns `true`, which is exactly the first path in the order the prompt gives. Return `true` or `false` from the recursive function, and keep the path in one array you `push` to and `pop` from.',
      'Unmarking is what makes this backtracking: a cell that led nowhere on one path may be the cell another path needs. Store used cells as `"row,col"` strings in a `Set`.',
    ],
    approach: [
      'Return `[]` for an empty word. Otherwise make a `Set` of used cells and an empty path.',
      'Write `follow(row, col, index)`: return `false` outside the grid, on a used cell, or when the letter is not `word[index]`.',
      'Mark the cell and push it onto the path. If `index` is the last letter, return `true`. Otherwise ask `some` of the four neighbours whether `follow` succeeds from there with `index + 1`.',
      'If none does, unmark the cell, pop it off the path and return `false`. Loop over every cell as a start and return the path the first time `follow` succeeds, or `null` after the loops.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: 'findWord(["ABCE", "SFCS", "ADEE"], "ABCCED")', expected: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1]] },
      { call: 'findWord(["ABCE", "SFCS", "ADEE"], "SEE")', expected: [[1, 3], [2, 3], [2, 2]], label: 'a dead end on the way' },
      { call: 'findWord(["XY", "ZX"], "X")', expected: [[0, 0]], label: 'starts are tried from the top left' },
      { call: 'findWord(["ABCE", "SFCS", "ADEE"], "ABCB")', expected: null, label: 'a cell is used once', edge: true },
      { call: 'findWord(["AB", "CD"], "AD")', expected: null, label: 'no diagonal steps', edge: true },
      { call: 'findWord(["AB", "CD"], "")', expected: [], label: 'an empty word', edge: true },
    ],
  },
  {
    id: 'js-mh-arrangements',
    track: 'javascript',
    topic: 'javascript',
    level: 25,
    tier: 4,
    focus: ['recursion', 'map-set', 'sort'],
    title: 'Every arrangement, once',
    prompt: 'Write `arrangements(letters)`, returning every different order of the letters of a string, each order once, sorted the way `sort` orders strings when no compare function is given. `arrangements("aab")` gives `["aab", "aba", "baa"]`: the two `a`s are the same letter, so swapping them makes nothing new. Build the orders recursively: an order is one of the letters followed by an order of the letters that are left. Count each letter in a `Map`, so each position picks each different letter once, taking one from its count before going deeper and putting it back afterwards. Never make a repeat and remove it later: for `"aaaaaaaaab"`, making every order first would mean 3,628,800 of them to find 10. The empty string has one order, `""`.',
    starter: `const arrangements = letters => {

};

// Scratch pad. Change this and press Run.
console.log(arrangements("aab"));
`,
    skeleton: `const arrangements = letters => {
  const counts = new Map();
  // count every letter
  const results = [];
  const build = prefix => {
    // every letter used: record the prefix
    // otherwise, for each letter with some left: take one, build, put it back
  };
  build("");
  return results.sort();
};`,
    hints: [
      'Iterating over the Map visits each different letter once, however many copies of it there are. That is what stops two `a`s from producing the same order twice.',
      'Change the count before the recursive call and restore it straight after. Every branch then sees the counts as they were when it started.',
    ],
    approach: [
      'Count the letters: `counts.set(letter, (counts.get(letter) ?? 0) + 1)` for each one.',
      'Write `build(prefix)`. When `prefix` is as long as `letters`, push it onto the results and return.',
      'Otherwise loop over the Map’s entries. For each letter with a count above 0, lower the count by one, call `build(prefix + letter)`, then set the count back.',
      'Call `build("")`, then sort the results and return them.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    tests: [
      { call: 'arrangements("abc")', expected: ['abc', 'acb', 'bac', 'bca', 'cab', 'cba'] },
      { call: 'arrangements("aab")', expected: ['aab', 'aba', 'baa'], label: 'repeated letters make no repeats' },
      { call: 'arrangements("abab")', expected: ['aabb', 'abab', 'abba', 'baab', 'baba', 'bbaa'] },
      { call: 'arrangements("zzz")', expected: ['zzz'], label: 'one letter three times', edge: true },
      { call: 'arrangements("x")', expected: ['x'], edge: true },
      { call: 'arrangements("")', expected: [''], label: 'the empty string has one order', edge: true },
    ],
  },
  {
    id: 'js-mh-justify-text',
    track: 'javascript',
    topic: 'javascript',
    level: 24,
    tier: 4,
    focus: ['strings', 'split', 'push'],
    title: 'Justify a paragraph',
    prompt: 'Write `justify(text, width)`, laying the words of `text` out in lines of exactly `width` characters, like a newspaper column. Split the text into words on runs of whitespace. Fill each line greedily: take as many words as fit with one space between each pair. Then widen the line to `width` by adding spaces between its words, as evenly as possible; when they cannot be even, the gaps on the left get one more. A line with a single word, and the last line, are not widened: they keep single spaces and are padded with spaces at the end up to `width`. A word longer than `width` sits alone on its line with no padding. Empty text gives `[]`.',
    starter: `const justify = (text, width) => {

};

// Scratch pad. Change this and press Run.
console.log(justify("This is an example of text justification.", 16));
`,
    skeleton: `const justify = (text, width) => {
  const words = /* the words, split on runs of whitespace, no empty ones */;
  const lines = [];
  let line = [];
  let letters = 0;
  for (const word of words) {
    // if the word does not fit after one space, finish the line first
    // then add the word to the line
  }
  // the last line is left-aligned
  return lines;
};`,
    hints: [
      'A line of `n` words needs at least `n - 1` spaces. So a word fits when the letters so far, plus the spaces between the words already there and the one before it, plus its own length, is at most `width`.',
      'For a line with `gaps` gaps and `spaces` spaces to share out, every gap gets `Math.floor(spaces / gaps)`, and the first `spaces % gaps` gaps get one more. `" ".repeat(n)` and `padEnd` build the spacing.',
    ],
    approach: [
      'Split on `/\\s+/` and drop the empty strings, which leading or trailing spaces leave behind.',
      'Collect words for the current line while they fit. When the next word does not, push the finished line, widened, and start a new line with that word.',
      'To widen a line of two or more words, share `width` minus its letters among its gaps, giving the left gaps the extra spaces. A single word is padded at the end instead.',
      'After the loop, push the last line with single spaces, padded at the end.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: 'justify("This is an example of text justification.", 16)', expected: ['This    is    an', 'example  of text', 'justification.  '] },
      { call: 'justify("What must be acknowledgment shall be", 16)', expected: ['What   must   be', 'acknowledgment  ', 'shall be        '], label: 'a single word on a line is padded at the end' },
      { call: 'justify("aa b c dd eeee", 10)', expected: ['aa  b c dd', 'eeee      '], label: 'the left gaps take the extra spaces' },
      { call: 'justify("  a   b  ", 5)', expected: ['a b  '], label: 'runs of spaces separate words', edge: true },
      { call: 'justify("tiny supercalifragilistic word", 10)', expected: ['tiny      ', 'supercalifragilistic', 'word      '], label: 'a word longer than the line', edge: true },
      { call: 'justify("", 10)', expected: [], label: 'no text', edge: true },
    ],
  },

  /* ── Hard: routes, settings and JSON ──────────────────────────────── */
  {
    id: 'js-mh-match-route',
    track: 'javascript',
    topic: 'javascript',
    level: 24,
    tier: 4,
    focus: ['split', 'every', 'sort', 'objects'],
    title: 'Match a URL to a route',
    prompt: 'A router picks the page that answers a URL. Write `matchRoute(routes, path)`, where each route is a pattern such as `"/users/:id/posts/:postId"`. Split patterns and paths on `"/"` into segments; a trailing slash on a path is ignored, so `"/about/"` is `"/about"`. A segment that starts with `:` matches any one segment that is not empty and records it under that name. A final `*` matches the rest of the path, one segment or more, and records it as `rest`, joined with `/`. Any other segment must match exactly. Return `{ route, params }` for the best matching route, or `null` if none matches. When several routes match, the most specific wins: compare their segments from the left, where an exact segment beats a `:name` segment and a `:name` segment beats `*`, and the first difference decides. Routes that are equally specific keep their order, so the one listed first wins. Test each pattern with `every`, `sort` the matches with a compare function, and leave `routes` unchanged.',
    starter: `const matchRoute = (routes, path) => {

};

// Scratch pad. Change this and press Run.
console.log(matchRoute(["/users/:id", "/users/me"], "/users/me"));
`,
    skeleton: `const segmentsOf = text => {
  // split on "/" and drop one empty segment at the end, but keep "/" as [""]
};

const matchRoute = (routes, path) => {
  const parts = segmentsOf(path);
  const tryRoute = route => {
    // null unless every segment matches; otherwise { route, params }
  };
  const rank = segment => /* 0 exact, 1 :name, 2 * */;
  const moreSpecific = (a, b) => {
    // compare the ranks of a.route and b.route from the left
  };
  const matches = routes.map(tryRoute).filter(match => match !== null);
  return /* the first match after sorting, or null */;
};`,
    hints: [
      '`"/users/7".split("/")` gives `["", "users", "7"]`, and `"/users/7/"` gives one more empty segment at the end. Drop that one, but keep the single empty segment that `"/"` leaves, so the root still has a segment to match.',
      'Turn each pattern into ranks, 0 for an exact segment, 1 for `:name` and 2 for `*`. The compare function returns the first difference between the two lists of ranks, or 0 when there is none, and `sort` keeps equal routes in their order.',
    ],
    approach: [
      'Split the path into segments once. For a pattern ending in `*`, the path needs more segments than the pattern has before the `*`; for any other, exactly as many.',
      'Check the segments with `every`: a `:name` segment needs a segment that is not empty, and any other must be equal.',
      'For a match, record each `:name` in `params`, and for `*` record the remaining segments joined with `/` as `params.rest`.',
      'Sort the matches by comparing rank lists from the left, and return the first, or `null` when nothing matched. `map` and `filter` make new arrays, so `routes` is never sorted.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: 'matchRoute(["/users", "/users/:id", "/users/:id/posts/:postId"], "/users/42/posts/7")', expected: { route: '/users/:id/posts/:postId', params: { id: '42', postId: '7' } } },
      { call: 'matchRoute(["/users/:id", "/users/me"], "/users/me")', expected: { route: '/users/me', params: {} }, label: 'an exact segment beats a :name segment' },
      { call: 'matchRoute(["/files/*", "/files/:name"], "/files/2026/q3/report.pdf")', expected: { route: '/files/*', params: { rest: '2026/q3/report.pdf' } }, label: '* takes the rest of the path' },
      { call: 'matchRoute(["/files/*", "/files/:name"], "/files/report.pdf")', expected: { route: '/files/:name', params: { name: 'report.pdf' } }, label: 'a :name segment beats *', edge: true },
      { call: 'matchRoute(["/users/:id"], "/users")', expected: null, label: 'a :name segment needs a segment to match', edge: true },
      { call: 'matchRoute(["/about"], "/about/")', expected: { route: '/about', params: {} }, label: 'a trailing slash is ignored', edge: true },
    ],
  },
  {
    id: 'js-mh-settings-diff',
    track: 'javascript',
    topic: 'javascript',
    level: 24,
    tier: 4,
    focus: ['recursion', 'for-in', 'objects', 'sort'],
    title: 'What changed in the settings',
    prompt: 'Two versions of a settings object are nested plain objects whose leaves are strings, numbers, booleans, `null`, or arrays of those. Keys never contain a dot. Write `diffSettings(before, after)`, returning every leaf that differs as a `{ path, change }` object. `path` is the keys from the top down, joined with dots, and `change` is `"added"` (only in `after`), `"removed"` (only in `before`) or `"changed"`. Walk both objects with `for...in`, and recurse where both hold a plain object under the same key. An object that is only on one side is reported leaf by leaf, so an empty one reports nothing. Where one side holds an object and the other a leaf, the object’s leaves count as removed or added, and the leaf as added or removed. Leaves are compared with `===`, and arrays are equal when they have the same length and `===` items in the same order. Return the list sorted by `path`, the way `sort` orders strings when no compare function is given.',
    starter: `const diffSettings = (before, after) => {

};

// Scratch pad. Change this and press Run.
console.log(diffSettings({ theme: "dark", font: { size: 14 } }, { theme: "light", font: { size: 14, weight: 400 } }));
`,
    skeleton: `const isObject = value => /* a plain object: not null, not an array */;

const diffSettings = (before, after) => {
  const changes = [];
  const everyLeaf = (value, path, change) => {
    // an object: go into each key; a leaf: record { path, change }
  };
  const walk = (a, b, prefix) => {
    for (const key in a) {
      // only in a, both objects, one object, or two leaves that differ
    }
    for (const key in b) {
      // only in b
    }
  };
  walk(before, after, "");
  return /* changes, sorted by path */;
};`,
    hints: [
      '`typeof` says `"object"` for `null` and for arrays too, and both are leaves here. Write one `isObject` helper that rules them out, and use it everywhere.',
      'Two helpers keep this short. One reports every leaf under a value with a single kind of change; the other walks two objects side by side and calls the first one wherever only one side has something.',
    ],
    approach: [
      'For each key of `before`: if `after` does not have it as its own property, report every leaf under it as removed.',
      'If both values are plain objects, recurse with the longer path. If exactly one is, report its leaves as removed or added and the other side’s leaf as added or removed.',
      'If both are leaves and differ, arrays compared item by item, report `"changed"`.',
      'Then report every leaf under a key only `after` has as added. Sort the list by `path` and return it.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: 'diffSettings({ theme: "dark", font: { size: 14, family: "Inter" } }, { theme: "light", font: { size: 14, family: "Inter", weight: 400 } })', expected: [{ path: 'font.weight', change: 'added' }, { path: 'theme', change: 'changed' }] },
      { call: 'diffSettings({ a: 1, b: { c: 2 } }, { a: 1 })', expected: [{ path: 'b.c', change: 'removed' }], label: 'a removed object reports its leaves' },
      { call: 'diffSettings({}, { editor: { tabs: { size: 2, spaces: true } } })', expected: [{ path: 'editor.tabs.size', change: 'added' }, { path: 'editor.tabs.spaces', change: 'added' }], label: 'an added object, two levels deep' },
      { call: 'diffSettings({ z: 1, a: 1, m: { b: 1, a: 1 } }, { z: 2, a: 2, m: { b: 2, a: 2 } })', expected: [{ path: 'a', change: 'changed' }, { path: 'm.a', change: 'changed' }, { path: 'm.b', change: 'changed' }, { path: 'z', change: 'changed' }], label: 'sorted by path' },
      { call: 'diffSettings({ tags: ["a", "b"], keep: [1] }, { tags: ["b", "a"], keep: [1] })', expected: [{ path: 'tags', change: 'changed' }], label: 'arrays compare item by item', edge: true },
      { call: 'diffSettings({ n: 0, x: { y: null } }, { n: false, x: { y: null } })', expected: [{ path: 'n', change: 'changed' }], label: '0 is not false, and null equals null', edge: true },
    ],
  },
  {
    id: 'js-mh-safe-stringify',
    track: 'javascript',
    topic: 'javascript',
    level: 22,
    tier: 4,
    focus: ['json', 'recursion', 'map-set'],
    title: 'JSON that survives a loop',
    prompt: '`JSON.stringify` throws on an object that contains itself, and real data does that: a tree node with a `parent` link, or a user whose friends list leads back to them. Write `safeStringify(value)`, returning the JSON text of `value` with every reference back to an object that contains it replaced by the string `"[Circular]"`. An object that appears twice without containing itself, such as one address used for billing and shipping, is not a loop and is written out both times. Walk the value recursively and build a copy. Keep the objects on the current path from the root in a `Set`: add an object before visiting its children and delete it afterwards, and put `"[Circular]"` in place of a child that is already in the set. Then pass the copy to `JSON.stringify`. The values are plain objects, arrays, strings, numbers, booleans and `null`. Leave `value` unchanged.',
    starter: `const safeStringify = value => {

};

// Scratch pad. Change this and press Run.
const node = { name: "root", children: [] };
node.children.push({ name: "leaf", parent: node });
console.log(safeStringify(node));
`,
    skeleton: `const safeStringify = value => {
  const path = new Set();
  const copy = current => {
    // a primitive or null is its own copy
    // an object already on the path is a loop
    // otherwise: add it to the path, copy its children, take it off again
  };
  return JSON.stringify(copy(value));
};`,
    hints: [
      'A `Set` of every object seen so far is not enough: it would call the second use of a shared address a loop. Only an object that is still being visited, higher up the current path, makes a loop.',
      'Delete the object from the set after its children are copied. The next sibling then starts from the right path, and may use the same object again.',
    ],
    approach: [
      'Write `copy(current)`: return `current` itself when it is not an object or is `null`.',
      'If the path set already has `current`, return `"[Circular]"`.',
      'Otherwise add `current` to the set, build a new array with `map` or a new object from `Object.entries`, calling `copy` on every child, and delete `current` from the set before returning the new value.',
      'Return `JSON.stringify(copy(value))`. The original is never touched.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    tests: [
      { call: '(() => { const node = { name: "root", children: [] }; node.children.push({ name: "leaf", parent: node }); return safeStringify(node); })()', expected: '{"name":"root","children":[{"name":"leaf","parent":"[Circular]"}]}' },
      { call: 'safeStringify({ a: [1, "two", null, true] })', expected: '{"a":[1,"two",null,true]}', label: 'plain data comes out as JSON.stringify writes it' },
      { call: '(() => { const address = { city: "Brno" }; return safeStringify({ billing: address, shipping: address }); })()', expected: '{"billing":{"city":"Brno"},"shipping":{"city":"Brno"}}', label: 'the same object twice is not a loop', edge: true },
      { call: '(() => { const list = [1]; list.push(list); return safeStringify(list); })()', expected: '[1,"[Circular]"]', label: 'an array that holds itself', edge: true },
      { call: '(() => { const me = { name: "me" }; me.self = me; return safeStringify(me); })()', expected: '{"name":"me","self":"[Circular]"}', label: 'an object that holds itself', edge: true },
      { call: 'safeStringify("text")', expected: '"text"', label: 'a string on its own', edge: true },
    ],
  },

  /* ── Hard: promises that share work ───────────────────────────────── */
  {
    id: 'js-mh-batch-loader',
    track: 'javascript',
    topic: 'javascript',
    level: 23,
    tier: 4,
    focus: ['promises', 'timers', 'map-set', 'closures'],
    title: 'Batch requests into one',
    prompt: 'A page asks for many users one at a time, and every request is a round trip to the server. Write `createLoader(loadMany, waitMs)`, returning a function `load(id)` that returns a promise of one user. `load` does not fetch straight away: the first `load` of a batch starts a `setTimeout` of `waitMs`, and every `load` before it fires joins the same batch. When the timer fires, call `loadMany(ids)` once with the batch’s ids, each id once, in the order they were first asked for. `loadMany` returns a promise of an array with one result per id, in the same order. Each `load` promise resolves with the result for its id, so an id asked for twice gets the same result both times. If `loadMany` rejects, every promise in that batch rejects with the same error. A `load` after the timer has fired starts a new batch. Keep the batch being gathered in a `Map` inside the closure, from each id to the callers waiting for it.',
    starter: `const createLoader = (loadMany, waitMs) => {

};

// Scratch pad. Uncomment once your function returns something.
// const load = createLoader(async ids => { console.log("loading", ids); return ids.map(id => "user " + id); }, 10);
// Promise.all([load(1), load(2), load(1)]).then(console.log);
`,
    skeleton: `const createLoader = (loadMany, waitMs) => {
  let batch = null; // the Map being gathered, or null between batches
  return id => new Promise((resolve, reject) => {
    if (batch === null) {
      const current = new Map();
      batch = current;
      setTimeout(async () => {
        batch = null; // any load from now on starts a new batch
        // call loadMany with the ids of current, then settle every caller
      }, waitMs);
    }
    // add { resolve, reject } to the callers waiting for this id
  });
};`,
    hints: [
      'Create the promise with `new Promise((resolve, reject) => ...)` and keep its two functions in the Map. The timer can call them much later, which is how one `loadMany` call settles many promises.',
      'Set the gathering Map back to `null` when the timer fires, before `loadMany` is even called. Hold on to the fired batch in a local variable, so a new batch cannot mix with the one in flight.',
    ],
    approach: [
      'Keep a variable for the batch being gathered, `null` when there is none. In `load`, if it is `null`, make a new Map and start the timer.',
      'Add the caller’s `resolve` and `reject` to the list for its id, creating the list the first time the id is asked for. The Map’s keys stay in first-asked order.',
      'When the timer fires, clear the variable, then call `loadMany([...current.keys()])` and await it.',
      'Resolve every caller of the id at index `i` with result `i`. If `loadMany` rejects, reject every caller of the batch with the error.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: '(async () => { const calls = []; const load = createLoader(async ids => { calls.push(ids); return ids.map(id => "user " + id); }, 10); const users = await Promise.all([load(1), load(2), load(3)]); return [users, calls]; })()', expected: [['user 1', 'user 2', 'user 3'], [[1, 2, 3]]], async: true },
      { call: '(async () => { const calls = []; const load = createLoader(async ids => { calls.push(ids); return ids; }, 10); await load("a"); await Promise.all([load("b"), load("c")]); return calls; })()', expected: [['a'], ['b', 'c']], label: 'a load after the timer starts a new batch', async: true },
      { call: '(async () => { const calls = []; const load = createLoader(async ids => { calls.push(ids); return ids; }, 40); const first = load(1); await new Promise(done => setTimeout(done, 5)); const second = load(2); await Promise.all([first, second]); return calls; })()', expected: [[1, 2]], label: 'a load while the timer waits joins the batch', async: true },
      { call: '(async () => { const calls = []; const load = createLoader(async ids => { calls.push(ids); return ids.map(id => id * 10); }, 10); const values = await Promise.all([load(5), load(7), load(5)]); return [values, calls]; })()', expected: [[50, 70, 50], [[5, 7]]], label: 'an id asked for twice is loaded once', edge: true, async: true },
      { call: '(async () => { let calls = 0; const load = createLoader(async ids => { calls++; return ids; }, 30); const pending = load(1); const before = calls; await pending; return [before, calls]; })()', expected: [0, 1], label: 'nothing is fetched before the timer fires', edge: true, async: true },
      { call: '(async () => { const load = createLoader(async () => { throw new Error("server down"); }, 10); const results = await Promise.allSettled([load(1), load(2)]); return results.map(result => result.status + ": " + result.reason.message); })()', expected: ['rejected: server down', 'rejected: server down'], label: 'a failed batch rejects every caller', edge: true, async: true },
    ],
  },
  {
    id: 'js-mh-shared-request',
    track: 'javascript',
    topic: 'javascript',
    level: 23,
    tier: 4,
    focus: ['promises', 'map-set', 'closures'],
    title: 'One request, shared',
    prompt: 'Three widgets on a page ask for the same exchange rate at the same moment, and the app should send one request, not three. Write `shareRequests(fetchRate, ttlMs, now)`, returning a function `get(key)` that returns a promise of `fetchRate(key)`’s result. `now()` returns the current time in milliseconds: call it instead of `Date.now()`, so the checks can move time. Keep a `Map` inside the closure from each key to `{ promise, at }`. `get` returns the stored promise when the key has one that was stored less than `ttlMs` ago. Otherwise it calls `fetchRate(key)`, stores the promise with the time, and returns it. So callers share a request while it is in flight, and share its result until it is `ttlMs` old. A request that fails must not be remembered: when its promise rejects, delete its entry so the next `get` tries again, but only if the entry is still that request’s, because a newer request for the same key may have replaced it.',
    starter: `const shareRequests = (fetchRate, ttlMs, now) => {

};

// Scratch pad. Uncomment once your function returns something.
// const get = shareRequests(async key => { console.log("fetching", key); return 1.1; }, 1000, Date.now);
// Promise.all([get("EUR"), get("EUR")]).then(console.log);
`,
    skeleton: `const shareRequests = (fetchRate, ttlMs, now) => {
  const entries = new Map(); // key -> { promise, at }
  return key => {
    const stored = entries.get(key);
    // a fresh stored promise is shared
    const entry = /* a new request and the time it was made */;
    entries.set(key, entry);
    // when it fails, forget it, but only if the Map still holds this entry
    return entry.promise;
  };
};`,
    hints: [
      'Store the promise, not the value. A promise exists from the moment the request starts, so a second caller can share it before any answer has arrived.',
      'Attach the clean-up with `entry.promise.catch(...)` and compare `entries.get(key) === entry` inside it. The caller still receives the original promise, so they see the rejection too.',
    ],
    approach: [
      'Make a `Map` inside `shareRequests`, so each one keeps its own entries.',
      'In `get`, read the entry for the key. If there is one and `now() - entry.at < ttlMs`, return its promise.',
      'Otherwise call `fetchRate(key)`, store `{ promise, at: now() }` under the key, and attach a `catch` that deletes the key if the Map still holds this same entry.',
      'Return the stored promise.',
    ],
    verify: 'tests',
    estimatedMinutes: 30,
    tests: [
      { call: '(async () => { let calls = 0; const get = shareRequests(async key => { calls++; return key + " rate"; }, 1000, () => 0); const results = await Promise.all([get("EUR"), get("EUR"), get("USD")]); return [results, calls]; })()', expected: [['EUR rate', 'EUR rate', 'USD rate'], 2], async: true },
      { call: '(() => { const get = shareRequests(async key => key, 1000, () => 0); return get("a") === get("a"); })()', expected: true, label: 'callers share one promise' },
      { call: '(async () => { let time = 0; let calls = 0; const get = shareRequests(async () => { calls++; return calls; }, 100, () => time); const first = await get("k"); time = 99; const second = await get("k"); time = 100; const third = await get("k"); return [first, second, third]; })()', expected: [1, 1, 2], label: 'a result is shared until it is ttlMs old', edge: true, async: true },
      { call: '(async () => { let calls = 0; const get = shareRequests(async () => { calls++; if (calls === 1) throw new Error("timeout"); return "ok"; }, 1000, () => 0); const first = await get("k").catch(error => error.message); const second = await get("k"); return [first, second, calls]; })()', expected: ['timeout', 'ok', 2], label: 'a failed request is tried again', edge: true, async: true },
      { call: '(async () => { let calls = 0; const get = shareRequests(() => { calls++; return Promise.reject(new Error("down")); }, 1000, () => 0); const results = await Promise.allSettled([get("x"), get("x")]); return [results.map(result => result.reason.message), calls]; })()', expected: [['down', 'down'], 1], label: 'callers in flight share the failure too', edge: true, async: true },
    ],
  },
];
