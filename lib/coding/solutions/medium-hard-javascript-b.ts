// Server-only reference solutions and hidden tests for
// lib/coding/tasks/medium-hard-javascript-b.ts. Never import from client code.
// The hidden tests aim at the shortcut each visible set leaves open: the
// technique the task combines, a value or shape the visible checks never used,
// and the case a plausible wrong answer gets wrong.

import type { CodingSolution } from '../types';

const LATER = 'const later = (ms, value, fail) => { const settled = new Promise((resolve, reject) => setTimeout(() => (fail ? reject(value) : resolve(value)), ms)); settled.catch(() => {}); return settled; };';

const ROLES = '{ owner: { can: ["billing:read"], inherits: ["admin"] }, admin: { can: ["posts:*", "users:read"], inherits: ["editor"] }, editor: { can: ["posts:edit"], inherits: ["viewer"] }, viewer: { can: ["posts:read"] } }';

export const MEDIUM_HARD_JAVASCRIPT_B_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── text and data formats ────────────────────────────────────────── */
  'js-mh2-word-guess': {
    solution: `const mark = (guess, answer) => {
  const marks = [".", ".", ".", ".", "."];
  // How many of each answer letter are left once the greens have claimed theirs.
  const left = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) marks[i] = "G";
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  // Left to right, each yellow uses up one leftover letter.
  for (let i = 0; i < 5; i++) {
    if (marks[i] === "G") continue;
    if (left[guess[i]] > 0) {
      marks[i] = "Y";
      left[guess[i]]--;
    }
  }
  return marks.join("");
};`,
    junior: "const mark = (guess, answer) => {\n  const marks = [];\n  const leftOver = {};\n  for (let i = 0; i < 5; i++) {\n    if (guess[i] === answer[i]) {\n      marks.push(\"G\");\n    } else {\n      marks.push(\".\");\n      const letter = answer[i];\n      if (leftOver[letter] === undefined) {\n        leftOver[letter] = 0;\n      }\n      leftOver[letter] = leftOver[letter] + 1;\n    }\n  }\n  for (let i = 0; i < 5; i++) {\n    const letter = guess[i];\n    if (marks[i] !== \"G\" && leftOver[letter] > 0) {\n      marks[i] = \"Y\";\n      leftOver[letter] = leftOver[letter] - 1;\n    }\n  }\n  return marks.join(\"\");\n};",
    senior: "const mark = (guess, answer) => {\n  const marks = Array(5).fill(\".\");\n  const remaining = {};\n  for (let i = 0; i < 5; i++) {\n    if (guess[i] === answer[i]) marks[i] = \"G\";\n    else remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;\n  }\n  for (let i = 0; i < 5; i++) {\n    if (marks[i] === \"G\" || !(remaining[guess[i]] > 0)) continue;\n    marks[i] = \"Y\";\n    remaining[guess[i]]--;\n  }\n  return marks.join(\"\");\n};",
    hiddenTests: [
      { call: "(() => {let checked=0;for(let a=0;a<32;a++){const answer=Array.from({length:5},(_,i)=>(a>>i)&1?\"b\":\"a\").join(\"\");for(let g=0;g<32;g++){const guess=Array.from({length:5},(_,i)=>(g>>i)&1?\"b\":\"a\").join(\"\"),expected=Array(5).fill(\".\"),used=Array(5).fill(false);for(let i=0;i<5;i++)if(guess[i]===answer[i]){expected[i]=\"G\";used[i]=true;}for(let i=0;i<5;i++){if(expected[i]===\"G\")continue;for(let j=0;j<5;j++)if(!used[j]&&guess[i]===answer[j]){used[j]=true;expected[i]=\"Y\";break;}}if(mark(guess,answer)!==expected.join(\"\"))return false;checked++;}}return checked;})()", expected: 1024 },

      { call: 'mark("speed", "abide")', expected: '..Y.Y' },
      { call: 'mark("array", "radar")', expected: 'YYYG.' },
      { call: 'mark("lllll", "hello")', expected: '..GG.' },
      { call: 'mark("toast", "tacos")', expected: 'GYYY.' },
      { call: 'mark("geese", "eagle")', expected: 'YY..G' },
      { call: 'mark("abbey", "bobby")', expected: '.YG.G' },
    ],
  },
  'js-mh2-table-of-contents': {
    solution: "const tableOfContents = markdown => {\n  const top = [];\n  const open = []; // headings that can still take children, shallowest first\n  let inCode = false;\n  for (const line of markdown.split(\"\\n\")) {\n    if (line.startsWith(\"```\")) {\n      inCode = !inCode; // a fence opens or closes a code block\n      continue;\n    }\n    if (inCode) continue;\n    // One to six #s and a space: seven #s and \"#tag\" do not match.\n    const match = line.match(/^(#{1,6}) +([\\s\\S]*)$/);\n    if (!match) continue;\n    const title = match[2].trim();\n    if (title === \"\") continue;\n    const depth = match[1].length;\n    const item = { title, children: [] };\n    // A heading closes every open heading at its own depth or deeper.\n    while (open.length > 0 && open[open.length - 1].depth >= depth) open.pop();\n    (open.length > 0 ? open[open.length - 1].item.children : top).push(item);\n    open.push({ depth, item });\n  }\n  return top;\n};",
    junior: "const tableOfContents = markdown => {\n  const result = [];\n  const stack = [];\n  let insideCode = false;\n  const lines = markdown.split(\"\\n\");\n  for (const line of lines) {\n    if (line.startsWith(\"```\")) {\n      insideCode = !insideCode;\n      continue;\n    }\n    if (insideCode) {\n      continue;\n    }\n    const match = /^(#{1,6}) +([\\s\\S]*)$/.exec(line);\n    if (match === null) {\n      continue;\n    }\n    const title = match[2].trim();\n    if (title === \"\") continue;\n    const depth = match[1].length;\n    const heading = { title: title, children: [] };\n    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {\n      stack.pop();\n    }\n    if (stack.length === 0) {\n      result.push(heading);\n    } else {\n      const parent = stack[stack.length - 1].heading;\n      parent.children.push(heading);\n    }\n    stack.push({ depth: depth, heading: heading });\n  }\n  return result;\n};",
    senior: "const HEADING = /^(?<hashes>#{1,6}) +(?<title>[\\s\\S]*)$/;\n\nconst tableOfContents = markdown => {\n  const root = { depth: 0, item: { children: [] } };\n  const open = [root];\n  let inCode = false;\n  for (const line of markdown.split(\"\\n\")) {\n    if (line.startsWith(\"```\")) inCode = !inCode;\n    const heading = !inCode && line.match(HEADING)?.groups;\n    if (!heading) continue;\n    const title = heading.title.trim();\n    if (title === \"\") continue;\n    const depth = heading.hashes.length;\n    while (open.at(-1).depth >= depth) open.pop();\n    const item = { title, children: [] };\n    open.at(-1).item.children.push(item);\n    open.push({ depth, item });\n  }\n  return root.item.children;\n};",
    hiddenTests: [
      { call: "tableOfContents([\"# Parent\",\"### Deep\",\"##   \\t \",\"#### Leaf\",\"## Left\\u2028Right\",\"#   \",\"#\\tTab\",\" # Indent\",\"####### Seven\",\"````js\",\"# Hidden\",\"```close\",\"# End ###\",\"```\",\"# Hidden forever\"].join(\"\\n\"))", expected: [{"title": "Parent", "children": [{"title": "Deep", "children": [{"title": "Leaf", "children": []}]}, {"title": "Left\u2028Right", "children": []}]}, {"title": "End ###", "children": []}] },
      { call: "(() => {const text=\"# x\\n\".repeat(5000),a=tableOfContents(text),b=tableOfContents(text);a[0].title=\"changed\";a[0].children.push({title:\"extra\",children:[]});return [a.length,b.length,b[0].title,b[0].children.length,a[0]!==a[1],a[1].children!==a[2].children,a!==b];})()", expected: [5000, 5000, "x", 0, true, true, true] },

      {
        call: 'tableOfContents(["# A", "## B", "# C", "## D"].join("\\n"))',
        expected: [{ title: 'A', children: [{ title: 'B', children: [] }] }, { title: 'C', children: [{ title: 'D', children: [] }] }],
      },
      {
        call: 'tableOfContents(["## A", "# B", "## C"].join("\\n"))',
        expected: [{ title: 'A', children: [] }, { title: 'B', children: [{ title: 'C', children: [] }] }],
      },
      {
        call: 'tableOfContents(["# A", "## B", "### C", "## D", "### E", "#### F", "# G"].join("\\n"))',
        expected: [
          {
            title: 'A',
            children: [
              { title: 'B', children: [{ title: 'C', children: [] }] },
              { title: 'D', children: [{ title: 'E', children: [{ title: 'F', children: [] }] }] },
            ],
          },
          { title: 'G', children: [] },
        ],
      },
      {
        call: 'tableOfContents(["# C# tips", "## Arrays # and more"].join("\\n"))',
        expected: [{ title: 'C# tips', children: [{ title: 'Arrays # and more', children: [] }] }],
      },
      {
        call: 'tableOfContents(["```", "# a", "```", "text", "```", "## b", "```", "## c"].join("\\n"))',
        expected: [{ title: 'c', children: [] }],
      },
      {
        call: 'tableOfContents(["###### Six", "# One", "# One"].join("\\n"))',
        expected: [{ title: 'Six', children: [] }, { title: 'One', children: [] }, { title: 'One', children: [] }],
      },
    ],
  },
  'js-mh2-json-log': {
    solution: `const LEVELS = ["debug", "info", "warn", "error"]; // least to most serious

const readLog = (text, minLevel) => {
  const parsed = [];
  const bad = [];
  text.split("\\n").forEach((line, index) => {
    if (line.trim() === "") return; // skipped, but still counted for the line numbers
    try {
      const value = JSON.parse(line); // a trailing "\\r" is only whitespace to JSON
      const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
      // indexOf is -1 for anything that is not a level, "toString" included.
      if (isObject && LEVELS.indexOf(value.level) !== -1) parsed.push(value);
      else bad.push(index + 1);
    } catch {
      bad.push(index + 1);
    }
  });
  const floor = LEVELS.indexOf(minLevel);
  const entries = parsed.filter(entry => LEVELS.indexOf(entry.level) >= floor);
  return { entries, bad };
};`,
    junior: `const readLog = (text, minLevel) => {
  const levels = ["debug", "info", "warn", "error"];
  const lines = text.split("\\n");
  const good = [];
  const bad = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) {
      continue;
    }
    let value;
    try {
      value = JSON.parse(line);
    } catch (error) {
      bad.push(i + 1);
      continue;
    }
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      bad.push(i + 1);
      continue;
    }
    if (levels.indexOf(value.level) === -1) {
      bad.push(i + 1);
      continue;
    }
    good.push(value);
  }
  const minimum = levels.indexOf(minLevel);
  const entries = good.filter(entry => levels.indexOf(entry.level) >= minimum);
  return { entries: entries, bad: bad };
};`,
    senior: "const LEVELS = [\"debug\", \"info\", \"warn\", \"error\"];\n\nconst parseEntry = line => {\n  try {\n    const value = JSON.parse(line);\n    return value && typeof value === \"object\" && !Array.isArray(value) && LEVELS.indexOf(value.level) !== -1 ? value : null;\n  } catch {\n    return null;\n  }\n};\n\nconst readLog = (text, minLevel) => {\n  const read = text\n    .split(\"\\n\")\n    .map((line, index) => ({ number: index + 1, line }))\n    .filter(({ line }) => line.trim())\n    .map(({ number, line }) => ({ number, entry: parseEntry(line) }));\n  return {\n    entries: read\n      .filter(({ entry }) => entry && LEVELS.indexOf(entry.level) >= LEVELS.indexOf(minLevel))\n      .map(({ entry }) => entry),\n    bad: read.filter(({ entry }) => !entry).map(({ number }) => number),\n  };\n};",
    hiddenTests: [
      { call: "(() => {const text=[\"\\u00a0\", \"\\u00a0{\\\"level\\\":\\\"info\\\"}\", \"\\ufeff{\\\"level\\\":\\\"error\\\"}\", \"\\t{\\\"level\\\":\\\"warn\\\"}\\r\", \"{\\\"level\\\":\\\"debug\\\"}\"].join(\"\\n\");return readLog(text,\"warn\");})()", expected: {"entries": [{"level": "warn"}], "bad": [2, 3]} },
      { call: "(() => {const text=\"{\\\"level\\\":\\\"warn\\\",\\\"level\\\":\\\"error\\\",\\\"__proto__\\\":{\\\"polluted\\\":true},\\\"nested\\\":[1,{\\\"ok\\\":false}]}\";const a=readLog(text,\"error\"),b=readLog(text,\"error\"),e=a.entries[0];return [a.bad.length,a.entries.length,e.level,Object.hasOwn(e,\"__proto__\"),Object.getPrototypeOf(e)===Object.prototype,e.polluted===undefined,e.__proto__.polluted,e.nested[1].ok,a.entries!==b.entries,e!==b.entries[0]];})()", expected: [0, 1, "error", true, true, true, true, false, true, true] },
      { call: "(() => {const out=readLog(Array(5000).fill(\"bad\").join(\"\\n\"),\"debug\"),seed=JSON.stringify({level:\"info\",msg:\"\"}),text=JSON.stringify({level:\"info\",msg:\"x\".repeat(100000-seed.length)}),large=readLog(text,\"debug\");return [out.entries.length,out.bad.length,out.bad[0],out.bad[4999],text.length,large.entries.length,large.bad.length,large.entries[0].msg.length===100000-seed.length];})()", expected: [0, 5000, 1, 5000, 100000, 1, 0, true] },

      { call: 'readLog(["", "", "oops", \'{"level":"info"}\'].join("\\n"), "info")', expected: { entries: [{ level: 'info' }], bad: [3] } },
      { call: 'readLog(\'{"level":"INFO"}\', "debug")', expected: { entries: [], bad: [1] } },
      { call: 'readLog(\'{"level":"toString"}\', "debug")', expected: { entries: [], bad: [1] } },
      { call: 'readLog(\'{"level":"info","nested":{"level":"error"}}\', "info")', expected: { entries: [{ level: 'info', nested: { level: 'error' } }], bad: [] } },
      { call: `readLog(['  {"level":"warn"}  ', '{"level":"debug"}', '{"level":"error"}', '{"level":1}'].join("\\n"), "warn")`, expected: { entries: [{ level: 'warn' }, { level: 'error' }], bad: [4] } },
      { call: `readLog(['x', '{"level":"warn"}', ''].join("\\r\\n"), "debug")`, expected: { entries: [{ level: 'warn' }], bad: [1] } },
      { call: 'readLog(\'{"level":"debug"}{"level":"info"}\', "debug")', expected: { entries: [], bad: [1] } },
    ],
  },
  'js-mh2-folder-tree': {
    solution: "const printTree = paths => {\n  // Build first: a folder is an object of its entries, a file is null.\n  const root = Object.create(null);\n  for (const path of paths) {\n    const parts = path.split(\"/\");\n    const file = parts.pop();\n    let folder = root;\n    for (const name of parts) folder = folder[name] ??= Object.create(null);\n    folder[file] = null; // listing the same file again changes nothing\n  }\n  const lines = [\".\"];\n  // Print second: prefix is what every line of this folder starts with.\n  const print = (folder, prefix) => {\n    const names = Object.keys(folder);\n    const folders = names.filter(name => folder[name] !== null).sort();\n    const files = names.filter(name => folder[name] === null).sort();\n    const entries = [...folders, ...files];\n    entries.forEach((name, index) => {\n      const last = index === entries.length - 1;\n      lines.push(prefix + (last ? \"\u2514\u2500\u2500 \" : \"\u251c\u2500\u2500 \") + name);\n      // Below a last entry nothing runs on down the side, so the indent is blank.\n      if (folder[name] !== null) print(folder[name], prefix + (last ? \"    \" : \"\u2502   \"));\n    });\n  };\n  print(root, \"\");\n  return lines;\n};",
    junior: "const printTree = paths => {\n  const root = Object.create(null);\n  for (const path of paths) {\n    const parts = path.split(\"/\");\n    let current = root;\n    for (let i = 0; i < parts.length; i++) {\n      const name = parts[i];\n      const isFile = i === parts.length - 1;\n      if (isFile) {\n        current[name] = null;\n      } else {\n        if (current[name] === undefined) {\n          current[name] = Object.create(null);\n        }\n        current = current[name];\n      }\n    }\n  }\n  const lines = [\".\"];\n  const printFolder = (folder, prefix) => {\n    const folderNames = [];\n    const fileNames = [];\n    for (const name of Object.keys(folder)) {\n      if (folder[name] === null) {\n        fileNames.push(name);\n      } else {\n        folderNames.push(name);\n      }\n    }\n    folderNames.sort();\n    fileNames.sort();\n    const names = folderNames.concat(fileNames);\n    for (let i = 0; i < names.length; i++) {\n      const name = names[i];\n      const isLast = i === names.length - 1;\n      let connector = \"\u251c\u2500\u2500 \";\n      let childPrefix = prefix + \"\u2502   \";\n      if (isLast) {\n        connector = \"\u2514\u2500\u2500 \";\n        childPrefix = prefix + \"    \";\n      }\n      lines.push(prefix + connector + name);\n      if (folder[name] !== null) {\n        printFolder(folder[name], childPrefix);\n      }\n    }\n  };\n  printFolder(root, \"\");\n  return lines;\n};",
    senior: "const printTree = paths => {\n  const root = Object.create(null);\n  for (const path of paths) {\n    const parts = path.split(\"/\");\n    const file = parts.pop();\n    const folder = parts.reduce((at, name) => at[name] ??= Object.create(null), root);\n    folder[file] = null;\n  }\n  const linesOf = (folder, prefix) => {\n    const names = Object.keys(folder);\n    const entries = [...names.filter(name => folder[name] !== null).sort(), ...names.filter(name => folder[name] === null).sort()];\n    return entries.flatMap((name, i) => {\n      const last = i === entries.length - 1;\n      const line = prefix + (last ? \"\u2514\u2500\u2500 \" : \"\u251c\u2500\u2500 \") + name;\n      return folder[name] === null ? [line] : [line, ...linesOf(folder[name], prefix + (last ? \"    \" : \"\u2502   \"))];\n    });\n  };\n  return [\".\", ...linesOf(root, \"\")];\n};",
    hiddenTests: [
      { call: "printTree(Object.freeze([\"__proto__/a.js\",\"constructor/b.js\",\"toString/c.js\",\"hasOwnProperty\",\"2\",\"10\",\"\ud83d\ude00.js\"]))", expected: [".", "\u251c\u2500\u2500 __proto__", "\u2502   \u2514\u2500\u2500 a.js", "\u251c\u2500\u2500 constructor", "\u2502   \u2514\u2500\u2500 b.js", "\u251c\u2500\u2500 toString", "\u2502   \u2514\u2500\u2500 c.js", "\u251c\u2500\u2500 10", "\u251c\u2500\u2500 2", "\u251c\u2500\u2500 hasOwnProperty", "\u2514\u2500\u2500 \ud83d\ude00.js"] },
      { call: "(() => {const paths=Object.freeze(Array.from({length:1000},(_,i)=>\"f\"+i)),out=printTree(paths),deep=Array.from({length:20},(_,i)=>\"p\"+i).join(\"/\"),a=printTree([deep]);return [out.length,out[1],out[1000],paths[0],a.length,a[20],printTree([])!==printTree([])];})()", expected: [1001, "\u251c\u2500\u2500 f0", "\u2514\u2500\u2500 f999", "f0", 21, "                                                                            \u2514\u2500\u2500 p19", true] },

      { call: 'printTree(["b.js", "B.js", "a.js"])', expected: ['.', '├── B.js', '├── a.js', '└── b.js'] },
      { call: 'printTree(["lib.js", "lib/a.js"])', expected: ['.', '├── lib', '│   └── a.js', '└── lib.js'] },
      { call: 'printTree(["file2.txt", "file10.txt"])', expected: ['.', '├── file10.txt', '└── file2.txt'] },
      {
        call: 'printTree(["src/a/x.js", "src/b/y.js", "src/c.js", "test/t.js"])',
        expected: ['.', '├── src', '│   ├── a', '│   │   └── x.js', '│   ├── b', '│   │   └── y.js', '│   └── c.js', '└── test', '    └── t.js'],
      },
      {
        call: 'printTree(["a/b/c.txt", "a/d.txt", "e/f.txt"])',
        expected: ['.', '├── a', '│   ├── b', '│   │   └── c.txt', '│   └── d.txt', '└── e', '    └── f.txt'],
      },
      {
        call: 'printTree(["z/last/deep/file.md", "z/last/deep/other.md", "a.txt"])',
        expected: ['.', '├── z', '│   └── last', '│       └── deep', '│           ├── file.md', '│           └── other.md', '└── a.txt'],
      },
      {
        call: 'printTree(["src/b.js", "lib/a.js"])',
        expected: ['.', '├── lib', '│   └── a.js', '└── src', '    └── b.js'],
      },
    ],
  },
  /* ── structures behind a small API ────────────────────────────────── */
  'js-mh2-bowling-card': {
    solution: `const scorecard = rolls => {
  const bowled = i => i < rolls.length;
  const isStrike = i => rolls[i] === 10;
  const isSpare = i => rolls[i] + rolls[i + 1] === 10;
  const totals = [];
  let total = 0;
  let i = 0; // the first roll of the current frame
  // Ten frames at most: in the tenth, the rolls after a strike or spare are only its bonus.
  while (totals.length < 10) {
    if (isStrike(i)) {
      if (!bowled(i + 2)) break; // still waiting for two bonus rolls
      total += 10 + rolls[i + 1] + rolls[i + 2];
      i += 1; // the bonus rolls are read, not used up
    } else {
      if (!bowled(i + 1)) break; // half a frame, or no frame at all
      if (isSpare(i)) {
        if (!bowled(i + 2)) break;
        total += 10 + rolls[i + 2];
      } else {
        total += rolls[i] + rolls[i + 1];
      }
      i += 2;
    }
    totals.push(total);
  }
  return totals;
};`,
    junior: "const scorecard = rolls => {\n  const hasRoll = index => index < rolls.length;\n  const isStrike = index => rolls[index] === 10;\n  const isSpare = index => rolls[index] + rolls[index + 1] === 10;\n  const totals = [];\n  let total = 0;\n  let roll = 0;\n  while (totals.length < 10) {\n    if (isStrike(roll)) {\n      if (!hasRoll(roll + 2)) break;\n      total = total + 10 + rolls[roll + 1] + rolls[roll + 2];\n      roll = roll + 1;\n    } else {\n      if (!hasRoll(roll + 1)) break;\n      if (isSpare(roll)) {\n        if (!hasRoll(roll + 2)) break;\n        total = total + 10 + rolls[roll + 2];\n      } else { total = total + rolls[roll] + rolls[roll + 1]; }\n      roll = roll + 2;\n    }\n    totals.push(total);\n  }\n  return totals;\n};",
    senior: `const scorecard = rolls => {
  const pins = i => rolls[i];
  const bowled = (...indexes) => indexes.every(i => i < rolls.length);
  // The frame that starts at roll i: its score and its size in rolls, or null while it waits.
  const frameAt = i => {
    if (pins(i) === 10) return bowled(i + 1, i + 2) ? { score: 10 + pins(i + 1) + pins(i + 2), size: 1 } : null;
    if (!bowled(i + 1)) return null;
    if (pins(i) + pins(i + 1) === 10) return bowled(i + 2) ? { score: 10 + pins(i + 2), size: 2 } : null;
    return { score: pins(i) + pins(i + 1), size: 2 };
  };
  const totals = [];
  let i = 0;
  while (totals.length < 10) {
    const frame = frameAt(i);
    if (!frame) break;
    totals.push((totals.at(-1) ?? 0) + frame.score);
    i += frame.size;
  }
  return totals;
};`,
    hiddenTests: [
      { call: "(() => {const rolls=Object.freeze([10,7,3,9,0]),a=scorecard(rolls),b=scorecard(rolls);return [a,b,a!==b,rolls.length,rolls[0],scorecard([])!==scorecard([])];})()", expected: [[20, 39, 48], [20, 39, 48], true, 5, 10, true] },
      { call: "(() => {const full=Object.freeze([...Array(18).fill(0),10,7,3]);return [scorecard(full.slice(0,19)),scorecard(full.slice(0,20)),scorecard(full),full.length];})()", expected: [[0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 20], 21] },

      { call: 'scorecard(Array(11).fill(10))', expected: [30, 60, 90, 120, 150, 180, 210, 240, 270] },
      { call: 'scorecard([0, 10, 5, 3])', expected: [15, 23] },
      { call: 'scorecard([...Array(18).fill(0), 7, 3, 10])', expected: [0, 0, 0, 0, 0, 0, 0, 0, 0, 20] },
      { call: 'scorecard([...Array(18).fill(0), 3, 4])', expected: [0, 0, 0, 0, 0, 0, 0, 0, 0, 7] },
      { call: 'scorecard([...Array(18).fill(0), 10, 10, 10])', expected: [0, 0, 0, 0, 0, 0, 0, 0, 0, 30] },
      { call: 'scorecard([...Array(18).fill(0), 10, 3, 4])', expected: [0, 0, 0, 0, 0, 0, 0, 0, 0, 17] },
      { call: 'scorecard([...Array(18).fill(0), 10, 3])', expected: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { call: 'scorecard([10, 10, 5])', expected: [25] },
      { call: 'scorecard([5, 5])', expected: [] },
    ],
  },
  'js-mh2-top-scores': {
    solution: `const createLeaderboard = size => {
  const board = []; // { name, score }, best first; every board has its own
  const placeOf = name => board.findIndex(entry => entry.name === name);
  return {
    add(name, score) {
      const old = placeOf(name);
      if (old !== -1) {
        if (board[old].score >= score) return old + 1; // not higher: nothing changes
        board.splice(old, 1); // the higher score replaces it
      }
      // The first entry the score beats: that puts it below every equal score.
      let at = board.findIndex(entry => entry.score < score);
      if (at === -1) at = board.length;
      if (at >= size) return null; // it does not make the board
      board.splice(at, 0, { name, score });
      board.splice(size); // whoever falls off the end
      return at + 1;
    },
    // New objects in a new array, so the caller cannot reach the board.
    top: () => board.map(({ name, score }) => ({ name, score })),
  };
};`,
    junior: "const createLeaderboard = size => {\n  const entries = [];\n  const add = (name, score) => {\n    const oldIndex = entries.findIndex(entry => entry.name === name);\n    if (oldIndex !== -1) {\n      if (score <= entries[oldIndex].score) {\n        return oldIndex + 1;\n      }\n      entries.splice(oldIndex, 1);\n    }\n    const lower = entries.findIndex(entry => entry.score < score);\n    const place = lower === -1 ? entries.length : lower;\n    if (place >= size) {\n      return null;\n    }\n    entries.splice(place, 0, { name: name, score: score });\n    if (entries.length > size) {\n      entries.splice(size, entries.length - size);\n    }\n    return place + 1;\n  };\n  const top = () => {\n    const copy = [];\n    for (const entry of entries) {\n      copy.push({ name: entry.name, score: entry.score });\n    }\n    return copy;\n  };\n  return { add: add, top: top };\n};",
    senior: "const createLeaderboard = size => {\n  const board = [];\n  const indexOr = (index, fallback) => (index === -1 ? fallback : index);\n  const add = (name, score) => {\n    const old = board.findIndex(entry => entry.name === name);\n    if (old !== -1 && board[old].score >= score) return old + 1;\n    if (old !== -1) board.splice(old, 1);\n    const at = indexOr(board.findIndex(entry => entry.score < score), board.length);\n    if (at >= size) return null;\n    board.splice(at, 0, { name, score });\n    board.splice(size);\n    return at + 1;\n  };\n  return { add, top: () => board.map(entry => ({ ...entry })) };\n};",
    hiddenTests: [
      { call: "(() => {const z=createLeaderboard(0);const b=createLeaderboard(3);const ranks=[b.add(\"__proto__\",-0.5),b.add(\"A\",-1),b.add(\"a\",-0.5),b.add(\"A\",0),b.add(\"a\",-2)];const one=b.top(),two=b.top();one[0].score=999;one.length=0;return [z.add(\"x\",1),z.top(),ranks,two,b.top()[0]!==two[0],b.top()!==two,z.top()!==z.top()];})()", expected: [null, [], [1, 2, 2, 1, 3], [{"name": "A", "score": 0}, {"name": "__proto__", "score": -0.5}, {"name": "a", "score": -0.5}], true, true, true] },
      { call: "(() => {const b=createLeaderboard(1000);let rank;for(let i=0;i<1000;i++)rank=b.add(\"p\"+i,i);const out=b.top();return [rank,out.length,out[0].name,out[999].name,b.add(\"tie\",0),b.add(\"p0\",1001),b.top()[0].name,b.top().length];})()", expected: [1, 1000, "p999", "p0", null, 1, "p0", 1000] },

      {
        call: '(() => { const board = createLeaderboard(2); board.add("A", 10); board.add("B", 20); board.add("C", 15); return [board.add("A", 25), board.top()]; })()',
        expected: [1, [{ name: 'A', score: 25 }, { name: 'B', score: 20 }]],
      },
      {
        call: '(() => { const board = createLeaderboard(3); board.add("A", 30); board.add("B", 20); board.add("C", 10); return [board.add("C", 40), board.top()]; })()',
        expected: [1, [{ name: 'C', score: 40 }, { name: 'A', score: 30 }, { name: 'B', score: 20 }]],
      },
      {
        call: '(() => { const board = createLeaderboard(2); board.add("A", 10); board.add("B", 10); return [board.add("C", 10), board.top()]; })()',
        expected: [null, [{ name: 'A', score: 10 }, { name: 'B', score: 10 }]],
      },
      {
        call: '(() => { const a = createLeaderboard(2); const b = createLeaderboard(2); a.add("X", 1); return [b.top(), b.add("Y", 0), b.top()]; })()',
        expected: [[], 1, [{ name: 'Y', score: 0 }]],
      },
      {
        call: '(() => { const board = createLeaderboard(1); board.add("A", 5); return [board.add("B", 7), board.add("A", 6), board.top()]; })()',
        expected: [1, null, [{ name: 'B', score: 7 }]],
      },
      {
        call: '(() => { const board = createLeaderboard(3); board.add("A", 50); board.add("B", 40); return [board.add("B", 40), board.add("B", 45), board.top()]; })()',
        expected: [2, 2, [{ name: 'A', score: 50 }, { name: 'B', score: 45 }]],
      },
      // An improvement that keeps its place takes out the old entry only, not the one below it.
      {
        call: '(() => { const board = createLeaderboard(3); board.add("A", 30); board.add("B", 20); board.add("C", 10); return [board.add("B", 25), board.top()]; })()',
        expected: [2, [{ name: 'A', score: 30 }, { name: 'B', score: 25 }, { name: 'C', score: 10 }]],
      },
    ],
  },
  'js-mh2-role-permissions': {
    solution: `const allowed = (roles, userRoles, permission) => {
  const visited = new Set(); // one per call, so a circle of roles comes to an end
  // "posts:*" covers every permission that starts with "posts:".
  const covers = rule => rule.endsWith(":*") && permission.startsWith(rule.slice(0, -1));
  const grants = name => {
    // Only roles' own entries count: "constructor" is inherited, not a role.
    if (!Object.hasOwn(roles, name) || visited.has(name)) return false;
    visited.add(name);
    const role = roles[name];
    if (role.can.includes(permission) || role.can.some(covers)) return true;
    return (role.inherits ?? []).some(grants); // the same question, one level down
  };
  return userRoles.some(grants);
};`,
    junior: "const allowed = (roles, userRoles, permission) => {\n  const visited = new Set();\n  const roleGrants = name => {\n    if (!Object.hasOwn(roles, name) || visited.has(name)) return false;\n    visited.add(name);\n    const role = roles[name];\n    if (role.can.includes(permission)) return true;\n    const wildcardMatches = role.can.some(rule => {\n      if (!rule.endsWith(\":*\")) return false;\n      return permission.startsWith(rule.slice(0, -1));\n    });\n    if (wildcardMatches) return true;\n    return (role.inherits ?? []).some(roleGrants);\n  };\n  return userRoles.some(roleGrants);\n};",
    senior: "const allowed = (roles, userRoles, permission) => {\n  const seen = new Set();\n  const covers = rule => rule.endsWith(\":*\") && permission.startsWith(rule.slice(0, -1));\n  const grants = name => {\n    if (seen.has(name) || !Object.hasOwn(roles, name)) return false;\n    seen.add(name);\n    const { can, inherits = [] } = roles[name];\n    return can.includes(permission) || can.some(covers) || (inherits ?? []).some(grants);\n  };\n  return userRoles.some(grants);\n};",
    hiddenTests: [
      { call: "(() => {const role=Object.freeze({can:Object.freeze([\"posts:*\",\"*\"]),inherits:null}),roles=Object.create({ghost:role});Object.defineProperty(roles,\"__proto__\",{value:role});roles.constructor=Object.freeze({can:Object.freeze([\"exact\"])});Object.freeze(roles);return [allowed(roles,Object.freeze([\"__proto__\"]),\"posts:\"),allowed(roles,[\"__proto__\"],\"postsbackup:x\"),allowed(roles,[\"__proto__\"],\"anything\"),allowed(roles,[\"__proto__\"],\"*\"),allowed(roles,[\"ghost\"],\"posts:x\"),allowed(roles,[\"constructor\"],\"exact\")];})()", expected: [true, false, false, true, false, true] },
      { call: "(() => {const roles=Object.create(null);for(let i=0;i<100;i++)roles[\"r\"+i]=Object.freeze({can:Object.freeze(i===99?[\"target\"]:[]),inherits:Object.freeze(i===99?[\"r0\"]:[\"r\"+(i+1),\"r\"+(i+1),\"r0\"])});Object.freeze(roles);return [allowed(roles,Object.freeze(Array(1000).fill(\"r0\")),\"target\"),allowed(roles,[\"r0\"],\"missing\"),allowed(roles,[\"r99\"],\"target\"),roles.r0.can.length];})()", expected: [true, false, true, 0] },

      { call: `allowed(${ROLES}, ["admin"], "postsbackup:read")`, expected: false },
      { call: `allowed(${ROLES}, ["owner"], "users:read")`, expected: true },
      { call: 'allowed({ a: { can: [], inherits: ["b"] }, b: { can: [], inherits: ["a", "c"] }, c: { can: ["x"] } }, ["a"], "x")', expected: true },
      { call: `[allowed(${ROLES}, ["editor"], "posts:read"), allowed(${ROLES}, ["editor"], "posts:read")]`, expected: [true, true] },
      {
        call: '(() => { const roles = { d: { can: [], inherits: ["b", "c"] }, b: { can: [], inherits: ["a"] }, c: { can: ["y:1"], inherits: ["a"] }, a: { can: ["x"] } }; return [allowed(roles, ["d"], "x"), allowed(roles, ["d"], "y:1"), allowed(roles, ["d"], "z")]; })()',
        expected: [true, true, false],
      },
      { call: `allowed(${ROLES}, ["constructor"], "posts:read")`, expected: false },
      { call: `allowed(${ROLES}, ["toString", "viewer"], "posts:read")`, expected: true },
      { call: 'allowed({ a: { can: [], inherits: ["a"] } }, ["a"], "x")', expected: false },
    ],
  },
  /* ── grids and seats ──────────────────────────────────────────────── */
  'js-mh2-life-step': {
    solution: `const nextGeneration = grid => {
  // Outside the grid the row or the character is undefined: dead, with no special case.
  const alive = (row, column) => grid[row]?.[column] === "#";
  return grid.map((line, row) =>
    [...line]
      .map((cell, column) => {
        let neighbours = 0;
        for (let dRow = -1; dRow <= 1; dRow++) {
          for (let dColumn = -1; dColumn <= 1; dColumn++) {
            if ((dRow !== 0 || dColumn !== 0) && alive(row + dRow, column + dColumn)) neighbours++;
          }
        }
        // Counted from the old grid only, so every cell changes at the same moment.
        return neighbours === 3 || (cell === "#" && neighbours === 2) ? "#" : ".";
      })
      .join("")
  );
};`,
    junior: "const nextGeneration = grid => grid.map((line, row) => {\n  const cells = [...line].map((cell, column) => {\n    let count = 0;\n    for (let dr = -1; dr <= 1; dr++) {\n      for (let dc = -1; dc <= 1; dc++) {\n        if (dr === 0 && dc === 0) continue;\n        if (grid[row + dr]?.[column + dc] === \"#\") count++;\n      }\n    }\n    if (count === 3 || (cell === \"#\" && count === 2)) return \"#\";\n    return \".\";\n  });\n  return cells.join(\"\");\n});",
    senior: "const nextGeneration = grid => grid.map((line, row) => [...line].map((cell, column) => {\n  let live = 0;\n  for (let dr = -1; dr <= 1; dr++) {\n    for (let dc = -1; dc <= 1; dc++) {\n      if ((dr || dc) && grid[row + dr]?.[column + dc] === \"#\") live++;\n    }\n  }\n  return live === 3 || (live === 2 && cell === \"#\") ? \"#\" : \".\";\n}).join(\"\"));",
    hiddenTests: [
      { call: "(() => {let mismatches=0;for(let mask=0;mask<512;mask++){const live=Array.from({length:9},(_,i)=>i).filter(i=>mask&(1<<i)),grid=Object.freeze(Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>(mask&(1<<(r*3+c)))?\"#\":\".\").join(\"\")));const expected=Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>{const i=r*3+c,near=live.filter(j=>j!==i&&Math.abs(Math.floor(j/3)-r)<=1&&Math.abs(j%3-c)<=1).length;return near===3||(live.includes(i)&&near===2)?\"#\":\".\";}).join(\"\"));if(JSON.stringify(nextGeneration(grid))!==JSON.stringify(expected))mismatches++;}return mismatches;})()", expected: 0 },
      { call: "(() => {const grid=Object.freeze(Array(100).fill(\"#\".repeat(100))),out=nextGeneration(grid),empty=Object.freeze([]),zero=Object.freeze(Array(100).fill(\"\"));return [out.length,out[0],out[1],out[99],out.join(\"\").split(\"#\").length-1,out!==grid,grid[0][0],nextGeneration(empty)!==empty,nextGeneration(zero).length];})()", expected: [100, "#..................................................................................................#", "....................................................................................................", "#..................................................................................................#", 4, true, "#", true, 100] },

      { call: 'nextGeneration([".#...", "..#..", "###..", ".....", "....."])', expected: ['.....', '#.#..', '.##..', '.#...', '.....'] },
      { call: 'nextGeneration(["###", "###", "###"])', expected: ['#.#', '...', '#.#'] },
      { call: 'nextGeneration(["###"])', expected: ['.#.'] },
      { call: 'nextGeneration(["#"])', expected: ['.'] },
      { call: 'nextGeneration(["#.#.#", ".#.#."])', expected: ['.###.', '.###.'] },
      { call: 'nextGeneration(["##....", "##....", "..##..", "..##..", "......", "......"])', expected: ['##....', '#.....', '...#..', '..##..', '......', '......'] },
    ],
  },
  'js-mh2-seats-together': {
    solution: `const bestSeats = (rows, count) => {
  const wanted = ".".repeat(count);
  const blocks = [];
  rows.forEach((line, row) => {
    let seat = line.indexOf(wanted);
    while (seat !== -1) {
      blocks.push({ row, seat });
      seat = line.indexOf(wanted, seat + 1); // one seat on, so overlapping blocks count
    }
  });
  const middleRow = (rows.length - 1) / 2;
  const rowDistance = ({ row }) => Math.abs(row - middleRow);
  const seatDistance = ({ row, seat }) => Math.abs(seat + (count - 1) / 2 - (rows[row].length - 1) / 2);
  // Each rule only decides when the rules before it tie.
  blocks.sort((a, b) => rowDistance(a) - rowDistance(b) || seatDistance(a) - seatDistance(b) || a.row - b.row || a.seat - b.seat);
  return blocks[0] ?? null;
};`,
    junior: "const bestSeats = (rows, count) => {\n  const wanted = \".\".repeat(count);\n  const blocks = [];\n  for (let row = 0; row < rows.length; row++) {\n    let seat = rows[row].indexOf(wanted);\n    while (seat !== -1) {\n      blocks.push({ row, seat });\n      seat = rows[row].indexOf(wanted, seat + 1);\n    }\n  }\n  const middle = (rows.length - 1) / 2;\n  const distance = block => Math.abs(block.seat + (count - 1) / 2 - (rows[block.row].length - 1) / 2);\n  blocks.sort((a, b) => {\n    const byRow = Math.abs(a.row - middle) - Math.abs(b.row - middle);\n    if (byRow !== 0) return byRow;\n    const bySeat = distance(a) - distance(b);\n    if (bySeat !== 0) return bySeat;\n    return a.row - b.row || a.seat - b.seat;\n  });\n  return blocks[0] ?? null;\n};",
    senior: "const bestSeats = (rows, count) => {\n  const wanted = \".\".repeat(count);\n  const middleRow = (rows.length - 1) / 2;\n  const blocksIn = (line, row) => {\n    const found = [];\n    let seat = line.indexOf(wanted);\n    while (seat !== -1) {\n      found.push({ row, seat, rowDistance: Math.abs(row - middleRow), seatDistance: Math.abs(seat + (count - 1) / 2 - (line.length - 1) / 2) });\n      seat = line.indexOf(wanted, seat + 1);\n    }\n    return found;\n  };\n  const [best] = rows.flatMap(blocksIn).sort((a, b) => a.rowDistance - b.rowDistance || a.seatDistance - b.seatDistance || a.row - b.row || a.seat - b.seat);\n  return best ? { row: best.row, seat: best.seat } : null;\n};",
    hiddenTests: [
      { call: "(() => {const rows=Object.freeze([\"\",\"..\"]),a=bestSeats(rows,1),b=bestSeats(rows,1);return [a,b,a!==b,bestSeats([\".xxxx\",\".....\"],1),bestSeats([\"\",\"\"],100),rows.length];})()", expected: [{"row": 1, "seat": 0}, {"row": 1, "seat": 0}, true, {"row": 1, "seat": 2}, null, 2] },
      { call: "(() => {const rows=Object.freeze(Array(100).fill(\".\".repeat(100)));return [bestSeats(rows,1),bestSeats(rows,100),bestSeats([\"......\"],3)];})()", expected: [{"row": 49, "seat": 49}, {"row": 49, "seat": 0}, {"row": 0, "seat": 1}] },

      { call: 'bestSeats(["...."], 2)', expected: { row: 0, seat: 1 } },
      { call: 'bestSeats(["x.x.", "..x.", "....", "x..x"], 2)', expected: { row: 2, seat: 1 } },
      { call: 'bestSeats(["..", "......", ".."], 2)', expected: { row: 1, seat: 2 } },
      { call: 'bestSeats([], 2)', expected: null },
      { call: 'bestSeats(["x.x", ".x.", "x.x"], 1)', expected: { row: 1, seat: 0 } },
      { call: 'bestSeats(["xx..xx...x"], 2)', expected: { row: 0, seat: 2 } },
      { call: 'bestSeats(["xx..xx...x"], 3)', expected: { row: 0, seat: 6 } },
    ],
  },
  /* ── async ────────────────────────────────────────────────────────── */
  'js-mh2-in-order': {
    solution: `const showInOrder = (promises, show) =>
  new Promise(resolve => {
    const results = []; // results[i] is filled once promise i has settled
    let next = 0; // the lowest index not shown yet
    const flush = () => {
      // One arrival can release several results that were waiting behind it.
      while (next < promises.length && results[next]) {
        show(results[next], next);
        next++;
      }
      if (next === promises.length) resolve(next);
    };
    if (promises.length === 0) resolve(0);
    promises.forEach((promise, index) => {
      // Stored as an object, even a value of undefined fills its slot.
      Promise.resolve(promise).then(
        value => {
          results[index] = { ok: true, value };
          flush();
        },
        error => {
          results[index] = { ok: false, error };
          flush();
        },
      );
    });
  });`,
    junior: `const showInOrder = (promises, show) => {
  return new Promise(resolve => {
    const total = promises.length;
    const settled = [];
    for (let i = 0; i < total; i++) {
      settled.push(null);
    }
    if (total === 0) {
      resolve(0);
      return;
    }
    let nextToShow = 0;
    const showReady = () => {
      while (nextToShow < total && settled[nextToShow] !== null) {
        show(settled[nextToShow], nextToShow);
        nextToShow = nextToShow + 1;
      }
      if (nextToShow === total) {
        resolve(total);
      }
    };
    promises.forEach((promise, index) => {
      promise
        .then(value => {
          settled[index] = { ok: true, value: value };
        })
        .catch(error => {
          settled[index] = { ok: false, error: error };
        })
        .then(() => {
          showReady();
        });
    });
  });
};`,
    senior: `const showInOrder = async (promises, show) => {
  // Handlers go on every promise first, so no rejection sits unhandled
  // while an earlier promise is still being awaited.
  const outcomes = promises.map(promise =>
    Promise.resolve(promise).then(value => ({ ok: true, value }), error => ({ ok: false, error })),
  );
  // Awaiting in index order shows each result once it and every earlier one are in.
  for (const [index, outcome] of outcomes.entries()) show(await outcome, index);
  return outcomes.length;
};`,
    hiddenTests: [
      {
        call: `(async () => { ${LATER} const seen = []; await showInOrder([later(20, 0), later(60, 1), later(10, 2), later(40, 3), later(5, 4), later(30, 5)], (result, index) => seen.push([index, result.value])); return seen; })()`,
        expected: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5]],
        async: true,
      },
      {
        call: `(async () => { ${LATER} const seen = []; const done = showInOrder([later(30, "a"), later(10, "b"), later(20, "c"), later(70, "d")], (result, index) => seen.push(index)); await later(15); const first = [...seen]; await later(30); const second = [...seen]; await done; return [first, second, seen]; })()`,
        expected: [[], [0, 1, 2], [0, 1, 2, 3]],
        async: true,
      },
      {
        call: `(async () => { ${LATER} const shown = []; await showInOrder([later(0, "nope", true), Promise.resolve(2)], result => shown.push(result)); return shown; })()`,
        expected: [{ ok: false, error: 'nope' }, { ok: true, value: 2 }],
        async: true,
      },
      {
        call: `(async () => { ${LATER} const shown = []; const count = await showInOrder([Promise.resolve(undefined), later(10, 2)], (result, index) => shown.push([index, result.ok, "value" in result, result.value === undefined])); return [count, shown]; })()`,
        expected: [2, [[0, true, true, true], [1, true, true, false]]],
        async: true,
      },
      {
        call: `(async () => { ${LATER} let shown = 0; const count = await showInOrder([later(10, 1), later(30, 2)], () => shown++); return [count, shown]; })()`,
        expected: [2, 2],
        async: true,
      },
      {
        call: `(async () => { ${LATER} const shown = []; await showInOrder([later(30, new Error("late"), true), later(5, 1)], result => shown.push(result.ok ? result.value : result.error.message)); return shown; })()`,
        expected: ['late', 1],
        async: true,
      },
    ],
  },
};
