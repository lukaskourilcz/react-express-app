// The Medium band of the JavaScript track, second wave (#226).
//
// Ten more Medium challenges, each combining two to four techniques the Easy
// band taught: every focus tag here is on at least three Easy JavaScript
// challenges, which the technique-coverage contract (`scripts/coding-coverage.ts`)
// enforces. The first wave left eleven Easy tags that no Medium challenge used
// (json, filter, forEach, findIndex, splice, some, includes, indexOf, functions,
// find and do-while). This wave brings nine of them into a Medium challenge,
// so the Easy challenges that teach them now lead somewhere. Tier 3 reads
// Medium through `difficultyOf`; nothing sets an authored difficulty.
//
// Each challenge has a hint ladder that ends in the documentation page of its
// first focus tag, visible checks with at least one edge case, and hidden
// checks aimed at the shortcut the visible ones leave open. Solutions live in
// `../solutions/medium-hard-javascript-b.ts`, and `MEDIUM_HARD_BAND` in
// `../catalog.ts` lists this file, which keeps these challenges out of every
// Learn level's quota. English only: there is no Czech overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';

/** A promise that settles after `ms` milliseconds, rejecting when `fail` is set.
 * Its rejection is marked as handled, so a solution that never attaches a
 * handler fails its checks instead of crashing the Node runner with an
 * unhandled rejection. */
const LATER = 'const later = (ms, value, fail) => { const settled = new Promise((resolve, reject) => setTimeout(() => (fail ? reject(value) : resolve(value)), ms)); settled.catch(() => {}); return settled; };';

const ROLES = '{ owner: { can: ["billing:read"], inherits: ["admin"] }, admin: { can: ["posts:*", "users:read"], inherits: ["editor"] }, editor: { can: ["posts:edit"], inherits: ["viewer"] }, viewer: { can: ["posts:read"] } }';

export const MEDIUM_HARD_JAVASCRIPT_B_TASKS: CodingTaskSource[] = [
  /* ── text and data formats ────────────────────────────────────────── */
  {
    id: 'js-mh2-word-guess',
    track: 'javascript',
    topic: 'javascript',
    level: 13,
    tier: 3,
    focus: ['for', 'objects', 'strings'],
    title: 'Colour the letters of a guess',
    prompt: 'In a five-letter word game, each letter of a guess is marked `"G"` when the answer has that letter in the same place, `"Y"` when the answer has it in another place, and `"."` when it does not. Repeated letters are where it gets hard. The answer `"abbey"` has two `b`s, so only two of the three `b`s in the guess `"bobby"` can be marked: `mark("bobby", "abbey")` gives `"Y.G.G"`. Write `mark(guess, answer)`, returning the five marks as one string. Use two passes with `for` loops. The first marks every exact match `"G"` and counts, in an object, the letters of the answer that were not matched exactly. The second goes left to right over the letters of the guess that are not green, and marks a `"Y"` for each one whose count is above 0, taking one off that count each time. Both words are five lowercase letters.',
    starter: `const mark = (guess, answer) => {

};

// Scratch pad. Change this and press Run.
console.log(mark("bobby", "abbey"));
`,
    skeleton: `const mark = (guess, answer) => {
  const marks = [".", ".", ".", ".", "."];
  const left = {}; // letter -> how many of the answer's letters are still unmatched
  for (let i = 0; i < 5; i++) {
    // an exact match is green; otherwise count the answer's letter
  }
  for (let i = 0; i < 5; i++) {
    // not green, and that letter still left over: yellow, and one fewer left
  }
  return marks.join("");
};`,
    hints: [
      'Greens come first, because a green claims its letter before any yellow can. In `mark("hello", "world")` the `l` in the fourth place is green and uses up the only `l` of the answer, so the `l` before it gets no yellow.',
      '`left[letter] = (left[letter] || 0) + 1` counts a letter whether or not you have seen it before. In the second pass, `left[letter] > 0` is false for a letter that was never counted, because `undefined > 0` is false.',
    ],
    approach: [
      'First pass: where `guess[i] === answer[i]`, set the mark to `"G"`; otherwise add one to the count of `answer[i]`.',
      'Second pass, left to right: skip the greens. When the count for `guess[i]` is above 0, set `"Y"` and take one off the count.',
      'Join the marks into one string.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'mark("crane", "crane")', expected: 'GGGGG' },
      { call: 'mark("slate", "crane")', expected: '..G.G' },
      { call: 'mark("react", "trace")', expected: 'YYGGY', label: 'every letter, some in the wrong place' },
      { call: 'mark("bobby", "abbey")', expected: 'Y.G.G', label: 'three b’s against two' },
      { call: 'mark("hello", "world")', expected: '...GY', label: 'a letter used by a green is not also yellow', edge: true },
      { call: 'mark("eerie", "there")', expected: 'Y.Y.G', label: 'the first spare e gets the yellow', edge: true },
      { call: 'mark("abcde", "fghij")', expected: '.....', label: 'nothing in common', edge: true },
    ],
  },
  {
    id: 'js-mh2-table-of-contents',
    track: 'javascript',
    topic: 'javascript',
    level: 16,
    tier: 3,
    focus: ['regex', 'for-of', 'push', 'pop'],
    title: 'A table of contents from headings',
    prompt: 'A Markdown heading is a line that starts with one to six `#` characters and a space, like `## Install`. Write `tableOfContents(markdown)`, returning the headings as a tree: an array of `{ title, children }` objects, where each heading goes into the `children` of the nearest heading above it that has fewer `#`s, or into the top level when there is none. The title is the text after the `#`s, trimmed. Walk the lines with `for...of` and match each one with a regular expression that captures the `#`s and the title. Keep a stack of the headings that are still open, with their depths. For each new heading, `pop` every heading at least as deep, `push` the new one into the children of the heading left on top (or into the top level), and push it onto the stack. Lines inside a fenced code block, from a line that starts with three backticks to the next such line, are code and never headings. `#hashtag`, with no space, is not a heading, and neither is a line that starts with seven `#`s.',
    starter: `const tableOfContents = markdown => {

};

// Scratch pad. Change this and press Run.
console.log(JSON.stringify(tableOfContents("# Guide\\n## Install\\n## Use"), null, 2));
`,
    skeleton: `const tableOfContents = markdown => {
  const top = [];
  const open = []; // the headings still open, as { depth, item }
  let inCode = false;
  for (const line of markdown.split("\\n")) {
    // a line that starts with three backticks opens or closes a code block
    const match = /* one to six #s, a space, then the title */;
    // not a heading, or inside code: on to the next line
    const item = { title: /* the title, trimmed */, children: [] };
    // pop every open heading at least as deep as this one
    // add item to the children of the heading on top, or to top
    // push this heading onto the stack
  }
  return top;
};`,
    hints: [
      'The pattern `/^(#{1,6}) +(.+)$/` does the checking: `match[1].length` is the depth and `match[2].trim()` the title. Six `#`s at most, then a space, is what rules out `#hashtag` and a line of seven.',
      'The stack holds the chain of headings the next heading could belong to. A new heading closes everything at its own depth or deeper, so once those are popped, whatever is left on top is its parent.',
    ],
    approach: [
      'Split on `"\\n"` and walk the lines with `for...of`. A line that starts with three backticks flips an `inCode` flag; skip every line while it is set.',
      'Match the line against the heading pattern. If it does not match, go on to the next line.',
      'Make `{ title, children: [] }`. `pop` while the heading on top of the stack is at least as deep, then push the item into its `children`, or into the top-level array when the stack is empty.',
      'Push `{ depth, item }` onto the stack, and return the top-level array at the end.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      {
        call: 'tableOfContents(["# Guide", "## Install", "## Use", "### Options", "# FAQ"].join("\\n"))',
        expected: [
          { title: 'Guide', children: [{ title: 'Install', children: [] }, { title: 'Use', children: [{ title: 'Options', children: [] }] }] },
          { title: 'FAQ', children: [] },
        ],
      },
      {
        call: 'tableOfContents(["Intro text", "## Setup", "More text", "## Deploy"].join("\\n"))',
        expected: [{ title: 'Setup', children: [] }, { title: 'Deploy', children: [] }],
        label: 'headings with no parent stay at the top',
      },
      {
        call: 'tableOfContents(["# A", "### Deep", "## Mid"].join("\\n"))',
        expected: [{ title: 'A', children: [{ title: 'Deep', children: [] }, { title: 'Mid', children: [] }] }],
        label: 'a skipped level goes under the nearest shallower heading',
        edge: true,
      },
      {
        call: 'tableOfContents(["```js", "# not a heading", "```", "# Real"].join("\\n"))',
        expected: [{ title: 'Real', children: [] }],
        label: 'lines in a code block are code',
        edge: true,
      },
      {
        call: 'tableOfContents(["#hashtag", "##  Spaced out  ", "####### Seven"].join("\\n"))',
        expected: [{ title: 'Spaced out', children: [] }],
        label: 'one to six #s and a space, and the title trimmed',
        edge: true,
      },
      { call: 'tableOfContents("")', expected: [], label: 'no headings', edge: true },
    ],
  },
  {
    id: 'js-mh2-json-log',
    track: 'javascript',
    topic: 'javascript',
    level: 17,
    tier: 3,
    focus: ['json', 'split', 'indexOf', 'filter'],
    title: 'Read a log of JSON lines',
    prompt: 'A server writes its log as one JSON object per line: `{"level":"info","msg":"started"}`. Write `readLog(text, minLevel)`, returning `{ entries, bad }`. Split the text into lines on `"\\n"`; a line may also end in `"\\r"`, which `JSON.parse` treats like a space. Skip lines that are empty or hold only spaces, and parse every other line with `JSON.parse` inside `try...catch`. A line is bad when it is not valid JSON, when it is not an object (an array, a number, a string and `null` do not count), or when its `level` is not one of `"debug"`, `"info"`, `"warn"` and `"error"`. `bad` lists the line numbers of the bad lines, counting from 1. `entries` holds the parsed objects whose level is `minLevel` or more serious, in the order they came. Keep the four levels in an array in that order, compare positions with `indexOf`, and `filter` on it.',
    starter: `const readLog = (text, minLevel) => {

};

// Scratch pad. Change this and press Run.
console.log(readLog('{"level":"info","msg":"started"}\\nnot json', "debug"));
`,
    skeleton: `const LEVELS = ["debug", "info", "warn", "error"];

const readLog = (text, minLevel) => {
  const parsed = [];
  const bad = [];
  text.split("\\n").forEach((line, index) => {
    // an empty line, or one of only spaces: skip it
    try {
      const value = JSON.parse(line);
      // an object (not an array, not null) with a known level? keep it; otherwise it is bad
    } catch {
      // not valid JSON: bad, by its line number
    }
  });
  const entries = /* the parsed entries at minLevel or above */;
  return { entries, bad };
};`,
    hints: [
      '`typeof null` and `typeof []` are both `"object"`, so an object check needs `value !== null && typeof value === "object" && !Array.isArray(value)`.',
      '`LEVELS.indexOf(entry.level)` is -1 for anything that is not a level, so one lookup answers both "is this a level?" and "how serious is it?". A plain object used as a lookup would also answer for `"toString"`, which every object inherits.',
    ],
    approach: [
      'Split on `"\\n"` and go through the lines with their index. Skip a line whose `trim()` is empty; the line number is the index plus 1 either way.',
      'Parse each other line in `try...catch`. A parse error, a value that is not a plain object, or a level that `indexOf` cannot find makes the line bad.',
      'Keep the good entries in order, then `filter` them to those whose level position is at least that of `minLevel`.',
      'Return `{ entries, bad }`.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      {
        call: `readLog(['{"level":"info","msg":"started"}', '{"level":"debug","msg":"cache warm"}', '{"level":"error","msg":"db down"}'].join("\\n"), "info")`,
        expected: { entries: [{ level: 'info', msg: 'started' }, { level: 'error', msg: 'db down' }], bad: [] },
      },
      {
        call: `readLog(['{"level":"error","code":500}', '{"level":"warn","code":429}'].join("\\n"), "error")`,
        expected: { entries: [{ level: 'error', code: 500 }], bad: [] },
        label: 'only the most serious level',
      },
      {
        call: `readLog(['{"level":"warn","msg":"slow"}', 'not json', '{"level":"info"'].join("\\n"), "debug")`,
        expected: { entries: [{ level: 'warn', msg: 'slow' }], bad: [2, 3] },
        label: 'broken lines are reported by number',
      },
      {
        call: `readLog(['{"level":"info"}', '', '   ', '{"level":"warn"}'].join("\\r\\n"), "debug")`,
        expected: { entries: [{ level: 'info' }, { level: 'warn' }], bad: [] },
        label: 'Windows line endings and blank lines',
        edge: true,
      },
      {
        call: `readLog(['[1, 2]', '42', 'null', '"info"', '{"level":"fatal"}', '{"msg":"no level"}'].join("\\n"), "debug")`,
        expected: { entries: [], bad: [1, 2, 3, 4, 5, 6] },
        label: 'only objects with a known level count',
        edge: true,
      },
      { call: 'readLog("", "info")', expected: { entries: [], bad: [] }, label: 'an empty log', edge: true },
    ],
  },
  {
    id: 'js-mh2-folder-tree',
    track: 'javascript',
    topic: 'javascript',
    level: 19,
    tier: 3,
    focus: ['split', 'recursion', 'sort', 'strings'],
    title: 'Print a folder tree',
    prompt: 'Write `printTree(paths)`, taking file paths such as `"src/lib/math.js"` and returning, as an array of strings, the lines a `tree` command prints for them. The first line is `"."`. Under each folder come its folders and then its files, each group sorted by name with `sort()`’s default order. Every entry starts with `"├── "`, or with `"└── "` when it is the last one in its folder. The lines inside a folder are indented by `"│   "` when that folder has more entries after it, and by four spaces when it is the last one. Split each path on `"/"` and build nested objects first, where a folder is an object of its entries and a file is `null`. Then write a recursive function that prints the entries of one folder, given the prefix its lines start with. A path listed twice appears once.',
    starter: `const printTree = paths => {

};

// Scratch pad. Change this and press Run.
console.log(printTree(["README.md", "src/index.js", "src/lib/math.js"]).join("\\n"));
`,
    skeleton: `const printTree = paths => {
  const root = {};
  for (const path of paths) {
    // walk the parts: a folder for every part but the last, and the last is a file (null)
  }
  const lines = ["."];
  const print = (folder, prefix) => {
    const names = Object.keys(folder);
    const folders = /* the names whose entry is an object, sorted */;
    const files = /* the names whose entry is null, sorted */;
    const entries = [...folders, ...files];
    entries.forEach((name, index) => {
      const last = index === entries.length - 1;
      // this entry's line, with "├── " or "└── "
      // a folder: print its entries with the prefix grown by "│   " or four spaces
    });
  };
  print(root, "");
  return lines;
};`,
    hints: [
      'Build first, print second. `path.split("/")` gives the folder names and then the file name. Walk them from `root`, with `folder[name] ??= {}` for every part but the last and `folder[last] = null` for the file.',
      'The prefix is what every line of one folder starts with, and each level adds four characters to it: `"│   "` when the folder above still has entries below it, so the line down its side goes on, and four spaces when it was the last one.',
    ],
    approach: [
      'Build the nested objects: an object for each folder and `null` for each file. Setting the same file twice changes nothing.',
      'Write `print(folder, prefix)`. Split its names into folders and files, sort both, and put the folders first.',
      'For each entry, push `prefix + (last ? "└── " : "├── ") + name`. For a folder, call `print` on it with `prefix + (last ? "    " : "│   ")`.',
      'Start the lines with `"."` and call `print(root, "")`.',
    ],
    verify: 'tests',
    estimatedMinutes: 25,
    tests: [
      {
        call: 'printTree(["README.md", "src/index.js", "src/lib/math.js"])',
        expected: ['.', '├── src', '│   ├── lib', '│   │   └── math.js', '│   └── index.js', '└── README.md'],
      },
      { call: 'printTree(["b.txt", "a.txt"])', expected: ['.', '├── a.txt', '└── b.txt'], label: 'sorted by name' },
      {
        call: 'printTree(["docs/guide.md", "app.js", "docs/api.md"])',
        expected: ['.', '├── docs', '│   ├── api.md', '│   └── guide.md', '└── app.js'],
        label: 'folders before files',
      },
      {
        call: 'printTree(["a/b/c/d.txt"])',
        expected: ['.', '└── a', '    └── b', '        └── c', '            └── d.txt'],
        label: 'below a last entry, the indent is spaces',
        edge: true,
      },
      { call: 'printTree(["x.js", "x.js"])', expected: ['.', '└── x.js'], label: 'a path listed twice', edge: true },
      { call: 'printTree([])', expected: ['.'], label: 'no paths', edge: true },
    ],
  },
  /* ── structures behind a small API ────────────────────────────────── */
  {
    id: 'js-mh2-bowling-card',
    track: 'javascript',
    topic: 'javascript',
    level: 14,
    tier: 3,
    focus: ['while', 'push', 'functions'],
    title: 'Score a bowling card',
    prompt: 'A game of ten-pin bowling has ten frames. A frame is two rolls, unless the first roll knocks down all ten pins: that is a strike, and the frame is that one roll. Two rolls that knock down all ten between them are a spare. A frame scores the pins it knocked down, plus the next two rolls after a strike, or the next one roll after a spare. A strike or a spare in the tenth frame earns the extra rolls it needs, and those rolls count only as its bonus. Write `scorecard(rolls)`, returning the running total after each frame that can be scored so far. A strike or spare still waiting for its bonus rolls, or a frame with only one roll, cannot be scored yet, and neither can any frame after it. `scorecard([10, 7, 3, 9, 0])` gives `[20, 39, 48]`. Walk the rolls with an index in a `while` loop, one frame at a time, `push` each running total, and write small helper functions such as `isStrike(i)` and `isSpare(i)` so that the loop reads like the rules.',
    starter: `const scorecard = rolls => {

};

// Scratch pad. Change this and press Run.
console.log(scorecard([10, 7, 3, 9, 0]));
`,
    skeleton: `const scorecard = rolls => {
  const bowled = i => /* the roll at i has happened */;
  const isStrike = i => /* the roll at i knocks down all ten */;
  const isSpare = i => /* the rolls at i and i + 1 knock down ten between them */;
  const totals = [];
  let total = 0;
  let i = 0; // the first roll of the current frame
  while (totals.length < 10) {
    // a strike: needs the rolls at i + 1 and i + 2, and the frame is one roll
    // otherwise: needs the roll at i + 1; a spare also needs i + 2; the frame is two rolls
    // a frame that cannot be scored yet ends the card
    totals.push(total);
  }
  return totals;
};`,
    hints: [
      'The index moves by the size of the frame, 1 for a strike and 2 otherwise, while the bonus reads rolls ahead without moving it. That is how the same roll can count in two frames.',
      'Stop at ten frames even when there are more rolls: in the tenth frame, the rolls after a strike or spare are its bonus, not an eleventh frame. `while (totals.length < 10)` gives you that.',
    ],
    approach: [
      'Write `bowled(i)` as `i < rolls.length`, `isStrike(i)` as `rolls[i] === 10`, and `isSpare(i)` as the two rolls at `i` adding up to 10.',
      'Loop while fewer than ten totals are written. For a strike, stop if `i + 2` is not bowled yet; otherwise add `10 + rolls[i + 1] + rolls[i + 2]` and move `i` on by 1.',
      'Otherwise stop if `i + 1` is not bowled. For a spare, stop if `i + 2` is not bowled, or add `10 + rolls[i + 2]`; for an open frame add its two rolls. Move `i` on by 2.',
      '`push` the running total after each frame and return the totals.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'scorecard([10, 7, 3, 9, 0])', expected: [20, 39, 48] },
      { call: 'scorecard([1, 4, 4, 5, 6, 4, 5, 5, 10, 0, 1, 7, 3, 6, 4, 10, 2, 8, 6])', expected: [5, 14, 29, 49, 60, 61, 77, 97, 117, 133], label: 'a whole game' },
      { call: 'scorecard(Array(12).fill(10))', expected: [30, 60, 90, 120, 150, 180, 210, 240, 270, 300], label: 'a perfect game' },
      { call: 'scorecard(Array(21).fill(5))', expected: [15, 30, 45, 60, 75, 90, 105, 120, 135, 150], label: 'a spare in every frame, and one bonus roll' },
      { call: 'scorecard([10, 10])', expected: [], label: 'a strike waits for two more rolls', edge: true },
      { call: 'scorecard([3])', expected: [], label: 'half a frame', edge: true },
      { call: 'scorecard([])', expected: [], label: 'no rolls yet', edge: true },
    ],
  },
  {
    id: 'js-mh2-top-scores',
    track: 'javascript',
    topic: 'javascript',
    level: 15,
    tier: 3,
    focus: ['findIndex', 'splice', 'closures'],
    title: 'Keep the top scores',
    prompt: 'Write `createLeaderboard(size)`, returning an object with two functions that share one list through a closure. `top()` returns the board, best first, as new `{ name, score }` objects in a new array, so changing what it returns never changes the board. `add(name, score)` records a score and returns the player’s place on the board, 1 for the top, or `null` when the score does not make the board. The board holds at most `size` entries and one entry per player. A new score replaces the player’s old one only when it is higher; otherwise nothing changes, and `add` returns the place they already have. A new score goes below every equal score already there, so whoever reached a score first stays ahead. Find where it goes with `findIndex`, put it there with `splice`, and use `splice` again to take out the player’s old entry and the entry that falls off the end.',
    starter: `const createLeaderboard = size => {

};

// Scratch pad. Uncomment once your function returns something.
// const board = createLeaderboard(3);
// console.log(board.add("Ada", 50), board.add("Bo", 80), board.top());
`,
    skeleton: `const createLeaderboard = size => {
  const board = []; // { name, score }, best first
  return {
    add(name, score) {
      const old = board.findIndex(/* this player's entry */);
      // on the board already: not higher means nothing changes; higher means the old entry goes
      const at = /* the first entry with a lower score, or the end of the board */;
      // past the last place: null
      // put it in at that place, and cut the board back to size
    },
    top() {
      // copies, so the caller cannot change the board
    },
  };
};`,
    hints: [
      '`board.findIndex(entry => entry.score < score)` is the first entry the new score beats, which puts it below every equal score. When it beats nobody it is -1, and the place is the end of the board.',
      '`splice(at, 0, entry)` inserts without removing anything, `splice(old, 1)` takes one entry out, and `splice(size)` cuts off everything from index `size` to the end.',
    ],
    approach: [
      'Keep the entries in an array inside `createLeaderboard`, so every board has its own.',
      'In `add`, find the player’s entry. If they have one and the new score is not higher, return its place; if it is higher, take the old entry out first.',
      'Find the place with `findIndex`, treating -1 as the end. If that place is `size` or beyond, return `null`; otherwise `splice` the entry in, `splice(size)` off the rest, and return the place plus 1.',
      '`top()` maps the entries to new objects.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      {
        call: '(() => { const board = createLeaderboard(3); return [board.add("Ada", 50), board.add("Bo", 80), board.add("Cy", 60), board.top()]; })()',
        expected: [1, 1, 2, [{ name: 'Bo', score: 80 }, { name: 'Cy', score: 60 }, { name: 'Ada', score: 50 }]],
      },
      {
        call: '(() => { const board = createLeaderboard(2); board.add("A", 10); board.add("B", 20); return [board.add("C", 15), board.top()]; })()',
        expected: [2, [{ name: 'B', score: 20 }, { name: 'C', score: 15 }]],
        label: 'the last entry falls off the end',
      },
      {
        call: '(() => { const board = createLeaderboard(2); board.add("A", 10); board.add("B", 20); return [board.add("C", 5), board.top()]; })()',
        expected: [null, [{ name: 'B', score: 20 }, { name: 'A', score: 10 }]],
        label: 'a score below a full board does not get on',
      },
      {
        call: '(() => { const board = createLeaderboard(3); board.add("A", 50); return [board.add("B", 50), board.top()]; })()',
        expected: [2, [{ name: 'A', score: 50 }, { name: 'B', score: 50 }]],
        label: 'an equal score goes below',
        edge: true,
      },
      {
        call: '(() => { const board = createLeaderboard(3); board.add("A", 10); board.add("B", 20); return [board.add("A", 30), board.add("A", 5), board.top()]; })()',
        expected: [1, 1, [{ name: 'A', score: 30 }, { name: 'B', score: 20 }]],
        label: 'one entry per player, and only a higher score counts',
        edge: true,
      },
      {
        call: '(() => { const board = createLeaderboard(3); board.add("A", 10); const copy = board.top(); copy[0].score = 999; copy.push({ name: "X", score: 1 }); return board.top(); })()',
        expected: [{ name: 'A', score: 10 }],
        label: 'top returns a copy',
        edge: true,
      },
    ],
  },
  {
    id: 'js-mh2-role-permissions',
    track: 'javascript',
    topic: 'javascript',
    level: 17,
    tier: 3,
    focus: ['some', 'includes', 'recursion', 'map-set'],
    title: 'Can this role do it?',
    prompt: 'An admin panel gives each role a list of permissions and, optionally, the roles it inherits from: `{ editor: { can: ["posts:edit"], inherits: ["viewer"] }, viewer: { can: ["posts:read"] } }`. Write `allowed(roles, userRoles, permission)`, returning `true` when any of the user’s roles grants `permission`, directly or through the roles it inherits, however deep. A permission ending in `:*` grants everything that starts with the text before the `*`, so `"posts:*"` covers `"posts:delete"` but not `"postsbackup:read"`. Write a recursive `grants(name)` that checks the role’s own `can` list with `includes`, then its wildcards, and then asks whether `some` of the roles it inherits grant the permission. Roles can inherit in a circle by mistake, so keep the roles already visited in a `Set` and never visit one twice. A name that `roles` does not have as its own property, checked with `Object.hasOwn`, grants nothing.',
    starter: `const allowed = (roles, userRoles, permission) => {

};

// Scratch pad. Change this and press Run.
const roles = {
  editor: { can: ["posts:edit"], inherits: ["viewer"] },
  viewer: { can: ["posts:read"] },
};
console.log(allowed(roles, ["editor"], "posts:read"));
`,
    skeleton: `const allowed = (roles, userRoles, permission) => {
  const visited = new Set();
  const grants = name => {
    // a role roles does not own, or one visited already, grants nothing
    // remember this one as visited
    const role = roles[name];
    // its own list: the exact permission, or a wildcard that covers it
    // otherwise: does some inherited role grant it?
  };
  return userRoles.some(grants);
};`,
    hints: [
      'A role grants a permission when its own list does, or when a role it inherits grants it. That second part is the same question one level down, which is why `grants` calls itself.',
      'With `a` inheriting `b` and `b` inheriting `a`, a plain recursion goes round for ever. Add each role to the `Set` before you look at the roles it inherits, and return `false` for a role that is already there.',
    ],
    approach: [
      'Keep one `visited` Set for the call. `grants(name)` returns `false` when `Object.hasOwn(roles, name)` is false or the name is in the Set; otherwise it adds the name.',
      'Return `true` when `role.can.includes(permission)`, or when some entry of `can` ends in `":*"` and `permission` starts with that entry minus its last character.',
      'Otherwise return `(role.inherits ?? []).some(grants)`.',
      '`allowed` is `userRoles.some(grants)`.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: `allowed(${ROLES}, ["editor"], "posts:read")`, expected: true, label: 'inherited from viewer' },
      { call: `allowed(${ROLES}, ["viewer"], "posts:edit")`, expected: false },
      { call: `allowed(${ROLES}, ["admin"], "posts:delete")`, expected: true, label: 'a wildcard' },
      { call: `allowed(${ROLES}, ["owner"], "posts:read")`, expected: true, label: 'three levels down' },
      { call: `allowed(${ROLES}, ["viewer", "ghost"], "users:read")`, expected: false, label: 'an unknown role grants nothing', edge: true },
      { call: 'allowed({ a: { can: [], inherits: ["b"] }, b: { can: [], inherits: ["a"] } }, ["a"], "x")', expected: false, label: 'a circle of roles comes to an end', edge: true },
      { call: `allowed(${ROLES}, [], "posts:read")`, expected: false, label: 'no roles at all', edge: true },
    ],
  },
  /* ── grids and seats ──────────────────────────────────────────────── */
  {
    id: 'js-mh2-life-step',
    track: 'javascript',
    topic: 'javascript',
    level: 18,
    tier: 3,
    focus: ['nested-loops', 'map'],
    title: 'One step of the Game of Life',
    prompt: 'In Conway’s Game of Life, every cell of a grid is alive (`"#"`) or dead (`"."`). Write `nextGeneration(grid)`, taking the grid as an array of strings of equal length and returning the next generation in the same shape. Each cell looks at its neighbours, up to eight of them counting the diagonals. Cells outside the grid count as dead, so the grid does not wrap around. A live cell with two or three live neighbours stays alive, a dead cell with exactly three comes alive, and every other cell is dead in the next generation. Every cell changes at the same moment, so count from the old grid and build a new one: `map` over the rows and over the cells of each row, and count the neighbours with two nested loops over the offsets -1, 0 and 1, skipping the cell itself. Leave `grid` unchanged.',
    starter: `const nextGeneration = grid => {

};

// Scratch pad. Change this and press Run.
console.log(nextGeneration([".....", "..#..", "..#..", "..#..", "....."]));
`,
    skeleton: `const nextGeneration = grid => {
  const alive = (row, column) => /* true for a "#" inside the grid, false outside it */;
  return grid.map((line, row) =>
    [...line].map((cell, column) => {
      let neighbours = 0;
      for (let dRow = -1; dRow <= 1; dRow++) {
        for (let dColumn = -1; dColumn <= 1; dColumn++) {
          // skip the cell itself; count a live neighbour
        }
      }
      // the rules: is this cell alive in the next generation?
    }).join("")
  );
};`,
    hints: [
      'Changing cells in place spoils the count for the cells after them: a cell that has just died no longer counts as a live neighbour, although in this generation it still is one. Read only from `grid`, and write only to the new array.',
      '`grid[row]?.[column] === "#"` is `false` for a row or column outside the grid, because a missing row is `undefined` and `"abc"[5]` is `undefined` too. That keeps the edges free of special cases.',
    ],
    approach: [
      'Write `alive(row, column)`, which is true only for a `"#"` inside the grid.',
      'For each cell, loop `dRow` and `dColumn` from -1 to 1, skip the pair `0, 0`, and count the live neighbours.',
      'A live cell survives with 2 or 3; a dead cell comes alive with exactly 3. Return `"#"` or `"."`.',
      'Build each new row with `[...line].map(...)` and `join("")`, and the grid with `grid.map`.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'nextGeneration([".....", "..#..", "..#..", "..#..", "....."])', expected: ['.....', '.....', '.###.', '.....', '.....'] },
      { call: 'nextGeneration(["....", ".##.", ".##.", "...."])', expected: ['....', '.##.', '.##.', '....'], label: 'a block never changes' },
      { call: 'nextGeneration(["...", ".#.", "..."])', expected: ['...', '...', '...'], label: 'a cell on its own dies' },
      { call: 'nextGeneration(["##", "#."])', expected: ['##', '##'], label: 'cells outside the grid are dead', edge: true },
      { call: 'nextGeneration([".#.", ".#.", ".#."])', expected: ['...', '###', '...'], label: 'the grid does not wrap around', edge: true },
      { call: '(() => { const grid = [".#.", ".#.", ".#."]; nextGeneration(grid); return grid; })()', expected: ['.#.', '.#.', '.#.'], label: 'grid is not changed', edge: true },
      { call: 'nextGeneration([])', expected: [], label: 'an empty grid', edge: true },
    ],
  },
  {
    id: 'js-mh2-seats-together',
    track: 'javascript',
    topic: 'javascript',
    level: 20,
    tier: 3,
    focus: ['indexOf', 'while', 'sort'],
    title: 'Seats together in a cinema',
    prompt: 'A cinema row is a string with `"."` for a free seat and `"x"` for a taken one, and `rows[0]` is the front row. Write `bestSeats(rows, count)`, finding `count` free seats side by side and returning `{ row, seat }`, the row’s index and the index of the block’s leftmost seat, or `null` when no row has room. The best block is the one nearest the middle of the room: first by how far its row is from the middle row, then by how far the middle of the block is from the middle of its row. A tie goes to the row nearer the front, then to the block further left. The middle of 3 rows is row 1, the middle of 4 rows lies halfway between rows 1 and 2, and the middle of a row of 6 seats lies between seats 2 and 3. Find the blocks of a row with `indexOf(".".repeat(count), from)` in a `while` loop, starting each search one seat after the last block found, so that overlapping blocks all count. Collect every block and `sort` them with a compare function that applies the rules in order.',
    starter: `const bestSeats = (rows, count) => {

};

// Scratch pad. Change this and press Run.
console.log(bestSeats(["....", "....", "...."], 2));
`,
    skeleton: `const bestSeats = (rows, count) => {
  const wanted = ".".repeat(count);
  const blocks = [];
  rows.forEach((line, row) => {
    let seat = line.indexOf(wanted);
    while (seat !== -1) {
      // record the block, then search again from the next seat
    }
  });
  const middleRow = (rows.length - 1) / 2;
  const rowDistance = block => /* how far the block's row is from middleRow */;
  const seatDistance = block => /* how far the block's middle is from the middle of its row */;
  blocks.sort((a, b) => /* row distance, then seat distance, then front row, then leftmost seat */);
  // the first block, or null
};`,
    hints: [
      'The middle of `n` things numbered from 0 is `(n - 1) / 2`, and the middle of a block that starts at `seat` is `seat + (count - 1) / 2`. Either can end in .5, and comparing them needs no rounding.',
      'A compare function can chain rules with `||`: `a.first - b.first || a.second - b.second` only reaches the second rule when the first one gives 0.',
    ],
    approach: [
      'For each row, find the blocks with `indexOf` in a `while` loop, searching again from `seat + 1` after each find, and push `{ row, seat }` for every block.',
      'Write the two distances: `Math.abs(row - middleRow)`, and `Math.abs(seat + (count - 1) / 2 - (rows[row].length - 1) / 2)`.',
      'Sort the blocks by row distance, then seat distance, then row, then seat, all in one compare function.',
      'Return the first block, or `null` when there are none.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'bestSeats(["....", "....", "...."], 2)', expected: { row: 1, seat: 1 } },
      { call: 'bestSeats(["x..x", "xxxx", "...."], 2)', expected: { row: 0, seat: 1 }, label: 'a tie between rows goes to the front' },
      { call: 'bestSeats([".....", "x.x.x", "....."], 2)', expected: { row: 0, seat: 1 }, label: 'a tie inside a row goes left' },
      { call: 'bestSeats(["......", "..xx..", "......"], 2)', expected: { row: 1, seat: 0 }, label: 'the middle row wins, even at its edge' },
      { call: 'bestSeats(["xxxx"], 1)', expected: null, label: 'a full house', edge: true },
      { call: 'bestSeats([".."], 3)', expected: null, label: 'a block wider than the row', edge: true },
    ],
  },
  /* ── async ────────────────────────────────────────────────────────── */
  {
    id: 'js-mh2-in-order',
    track: 'javascript',
    topic: 'javascript',
    level: 21,
    tier: 3,
    focus: ['promises', 'callbacks', 'forEach', 'while'],
    title: 'Show results in order as they arrive',
    prompt: 'A page asks for several sections at once and must show them from top to bottom: section 3 may not appear before section 2, but it should not wait for the slowest section either. Write `showInOrder(promises, show)`. Call `show(result, index)` once for each promise, in index order, as soon as that promise and every one before it have settled. `result` is `{ ok: true, value }` for a promise that fulfilled and `{ ok: false, error }` for one that rejected, where `error` is the rejection reason; a rejection does not hold up the results after it. `showInOrder` returns a promise that resolves to the number of results shown, once all of them have been. Attach a handler to every promise with `forEach`, keep each settled result in its slot, and after each one, `while` the next slot to show is filled, show it and move on.',
    starter: `const showInOrder = (promises, show) => {

};

// Scratch pad. Uncomment once your function returns something.
// const later = (ms, value) => new Promise(done => setTimeout(() => done(value), ms));
// showInOrder([later(30, "a"), later(10, "b")], (result, index) => console.log(index, result)).then(console.log);
`,
    skeleton: `const showInOrder = (promises, show) =>
  new Promise(resolve => {
    const results = []; // results[i] once promise i has settled
    let next = 0; // the index of the next result to show
    const flush = () => {
      // while results[next] is filled: show it and move next on
      // once every result has been shown, resolve with the count
    };
    // no promises: nothing to wait for
    promises.forEach((promise, index) => {
      // on fulfilment store { ok: true, value }, on rejection { ok: false, error }; then flush
    });
  });`,
    hints: [
      'Results arrive in any order, but only the lowest index not shown yet may be shown. Keep that index in `next`. Each time a result lands, show every filled slot from `next` onwards, because one arrival can release several results that were waiting behind it.',
      '`promise.then(value => ..., error => ...)` sends both outcomes to one place. Store each outcome as an object: then even a result whose value is `undefined` is a filled slot.',
    ],
    approach: [
      'Return a new promise. When there are no promises, resolve it with 0 straight away.',
      'For each promise, attach `then` with one handler per outcome. Each stores `{ ok: true, value }` or `{ ok: false, error }` at its index and calls `flush`.',
      '`flush` loops `while (next < promises.length && results[next])`: it calls `show(results[next], next)` and adds one to `next`.',
      'When `next` reaches the length, resolve with the count.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      {
        call: `(async () => { ${LATER} const seen = []; const count = await showInOrder([later(30, "a"), later(10, "b"), later(20, "c")], (result, index) => seen.push([index, result.value])); return [count, seen]; })()`,
        expected: [3, [[0, 'a'], [1, 'b'], [2, 'c']]],
        async: true,
      },
      {
        call: `(async () => { ${LATER} const seen = []; const done = showInOrder([later(10, "a"), later(20, "b"), later(80, "c")], (result, index) => seen.push(index)); await later(40); const early = [...seen]; await done; return [early, seen]; })()`,
        expected: [[0, 1], [0, 1, 2]],
        label: 'a result is shown as soon as the ones before it are',
        async: true,
      },
      {
        call: `(async () => { ${LATER} const seen = []; await showInOrder([later(10, "a"), later(5, new Error("timeout"), true), later(15, "c")], result => seen.push(result.ok ? result.value : "failed: " + result.error.message)); return seen; })()`,
        expected: ['a', 'failed: timeout', 'c'],
        label: 'a failure is shown in its place, and the rest go on',
        async: true,
      },
      {
        call: '(async () => { const shown = []; const count = await showInOrder([Promise.resolve(1), Promise.resolve(2)], result => shown.push(result)); return [count, shown]; })()',
        expected: [2, [{ ok: true, value: 1 }, { ok: true, value: 2 }]],
        label: 'promises that have already settled',
        async: true,
      },
      {
        call: `(async () => { ${LATER} const seen = []; const done = showInOrder([later(50, "slow"), later(5, "fast")], (result, index) => seen.push(index)); await later(20); const early = [...seen]; await done; return [early, seen]; })()`,
        expected: [[], [0, 1]],
        label: 'nothing jumps the queue',
        edge: true,
        async: true,
      },
      { call: 'showInOrder([], () => {})', expected: 0, label: 'no promises', edge: true, async: true },
    ],
  },
];
