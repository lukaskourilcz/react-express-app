// Server-only reference solutions and hidden tests for
// lib/coding/tasks/medium-hard-javascript-a.ts. Never import from client code.
// The hidden tests aim at the shortcut each visible set leaves open: the
// technique the task combines, a value or shape the visible checks never used,
// and the case a plausible wrong answer gets wrong.

import type { CodingSolution } from '../types';

export const MEDIUM_HARD_JAVASCRIPT_A_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── Medium: text and patterns ────────────────────────────────────── */
  'js-mh-fill-template': {
    solution: `const fill = (template, values) =>
  // replace calls the callback once per blank, and whatever it returns is
  // used as it is, so a "$" in a value is never read as a pattern.
  template.replace(/\\{\\s*(\\w+)\\s*\\}/g, (blank, name) =>
    // Only the object's own properties count: {toString} is not a value.
    Object.hasOwn(values, name) ? String(values[name]) : blank);`,
    junior: `const fill = (template, values) => {
  const pattern = /\\{\\s*(\\w+)\\s*\\}/g;
  const replaceBlank = (blank, name) => {
    const hasValue = Object.prototype.hasOwnProperty.call(values, name);
    if (hasValue) {
      return String(values[name]);
    }
    return blank;
  };
  return template.replace(pattern, replaceBlank);
};`,
    senior: `const BLANK = /\\{\\s*(?<name>\\w+)\\s*\\}/g;

const fill = (template, values) =>
  template.replaceAll(BLANK, (blank, ...rest) => {
    const { name } = rest.at(-1); // with named groups, the groups object comes last
    return Object.hasOwn(values, name) ? \`\${values[name]}\` : blank;
  });`,
    hiddenTests: [
      { call: 'fill("{toString} and {constructor}", {})', expected: '{toString} and {constructor}' },
      { call: 'fill("{x}", { x: "$&" })', expected: '$&' },
      { call: 'fill("{user_1} / {User1}", { user_1: "a", User1: "b" })', expected: 'a / b' },
      { call: 'fill("{ a b } and {}", { a: 1 })', expected: '{ a b } and {}' },
      { call: 'fill("{{name}}", { name: "Ada" })', expected: '{Ada}' },
      { call: 'fill("{price} or {price}", { price: 9.5 })', expected: '9.5 or 9.5' },
    ],
  },
  'js-mh-sort-versions': {
    solution: `const sortVersions = versions => {
  const compare = (a, b) => {
    const left = a.split(".").map(Number);
    const right = b.split(".").map(Number);
    // Walk the longer version; a part that is not there counts as 0.
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
      const difference = (left[i] ?? 0) - (right[i] ?? 0);
      if (difference !== 0) return difference;
    }
    return 0; // equal: sort is stable, so they keep their order
  };
  return [...versions].sort(compare);
};`,
    junior: `const sortVersions = versions => {
  const copy = [];
  for (const version of versions) {
    copy.push(version);
  }
  copy.sort((a, b) => {
    const aParts = a.split(".").map(Number);
    const bParts = b.split(".").map(Number);
    let longest = aParts.length;
    if (bParts.length > longest) {
      longest = bParts.length;
    }
    for (let i = 0; i < longest; i++) {
      let aPart = 0;
      if (i < aParts.length) {
        aPart = aParts[i];
      }
      let bPart = 0;
      if (i < bParts.length) {
        bPart = bParts[i];
      }
      if (aPart < bPart) {
        return -1;
      }
      if (aPart > bPart) {
        return 1;
      }
    }
    return 0;
  });
  return copy;
};`,
    senior: `const sortVersions = versions =>
  versions
    .map(version => ({ version, parts: version.split(".").map(Number) })) // split each version once, not on every comparison
    .sort((a, b) => {
      const length = Math.max(a.parts.length, b.parts.length);
      for (let i = 0; i < length; i++) {
        const difference = (a.parts[i] ?? 0) - (b.parts[i] ?? 0);
        if (difference) return difference;
      }
      return 0;
    })
    .map(({ version }) => version);`,
    hiddenTests: [
      { call: 'sortVersions(["0.1", "0.0.1", "0.1.0", "0.0.10", "0.0.2"])', expected: ['0.0.1', '0.0.2', '0.0.10', '0.1', '0.1.0'] },
      { call: 'sortVersions(["4.2.0", "4.2", "4.1.9"])', expected: ['4.1.9', '4.2.0', '4.2'] },
      { call: 'sortVersions(["1.1.1", "1.1", "1.1.1.1", "1"])', expected: ['1', '1.1', '1.1.1', '1.1.1.1'] },
      { call: 'sortVersions(["2.0.0", "1", "2", "1.0", "2.0"])', expected: ['1', '1.0', '2.0.0', '2', '2.0'] },
      { call: 'sortVersions(["1.100", "1.20", "1.3"])', expected: ['1.3', '1.20', '1.100'] },
      { call: 'sortVersions(["5"])', expected: ['5'] },
    ],
  },
  'js-mh-csv-fields': {
    solution: `const parseCsvLine = line => {
  const fields = [];
  let field = "";
  let inQuotes = false;
  let previous = "";
  for (const char of line) {
    if (char === '"') {
      // A quote straight after the quote that closed the field is an escaped
      // quote: keep one, and flipping the flag takes us back inside.
      if (!inQuotes && previous === '"') field += '"';
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
    previous = char;
  }
  fields.push(field); // the last field has no comma after it
  return fields;
};`,
    junior: `const parseCsvLine = line => {
  const fields = [];
  let current = "";
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (insideQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current = current + '"';
        i = i + 1;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        current = current + char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current = current + char;
      }
    }
  }
  fields.push(current);
  return fields;
};`,
    senior: `// One field and the separator after it: a quoted field, or anything up to a comma.
const FIELD = /(?:"((?:[^"]|"")*)"|([^,]*))(,|$)/g;

const parseCsvLine = line => {
  const fields = [];
  for (const [, quoted, plain, separator] of line.matchAll(FIELD)) {
    fields.push(quoted === undefined ? plain : quoted.replaceAll('""', '"'));
    if (separator === "") break; // the end of the line: the pattern would match "" there again
  }
  return fields;
};`,
    hiddenTests: [
      { call: 'parseCsvLine(\'"a,b,c"\')', expected: ['a,b,c'] },
      { call: 'parseCsvLine(\'""""\')', expected: ['"'] },
      { call: 'parseCsvLine(\'1,"two ""2""",3,"4,5"\')', expected: ['1', 'two "2"', '3', '4,5'] },
      { call: 'parseCsvLine(",")', expected: ['', ''] },
      { call: 'parseCsvLine(" a , b ")', expected: [' a ', ' b '] },
      { call: 'parseCsvLine(\'x,"first\\nsecond"\')', expected: ['x', 'first\nsecond'] },
    ],
  },
  'js-mh-line-reader': {
    solution: `const createLineReader = onLine => {
  // The unfinished end of the text so far. Only this reader's methods see it.
  let held = "";
  const report = line => onLine(line.endsWith("\\r") ? line.slice(0, -1) : line);
  return {
    push(chunk) {
      const pieces = (held + chunk).split("\\n");
      held = pieces.pop(); // the last piece has no "\\n" after it yet
      for (const line of pieces) report(line);
    },
    end() {
      if (held !== "") report(held);
      held = "";
    },
  };
};`,
    junior: `const createLineReader = onLine => {
  let unfinished = "";
  const sendLine = line => {
    let clean = line;
    if (clean.endsWith("\\r")) {
      clean = clean.slice(0, clean.length - 1);
    }
    onLine(clean);
  };
  const push = chunk => {
    const text = unfinished + chunk;
    const pieces = text.split("\\n");
    for (let i = 0; i < pieces.length - 1; i++) {
      sendLine(pieces[i]);
    }
    unfinished = pieces[pieces.length - 1];
  };
  const end = () => {
    if (unfinished.length > 0) {
      sendLine(unfinished);
    }
    unfinished = "";
  };
  return { push, end };
};`,
    senior: `const createLineReader = onLine => {
  let rest = "";
  const report = line => onLine(line.replace(/\\r$/, ""));
  return {
    push(chunk) {
      const lines = (rest + chunk).split("\\n");
      rest = lines.pop();
      lines.forEach(line => report(line));
    },
    end() {
      if (rest) report(rest);
      rest = "";
    },
  };
};`,
    hiddenTests: [
      { call: '(() => { const lines = []; const reader = createLineReader(line => lines.push(line)); for (const char of "ab\\ncd\\n\\ne") reader.push(char); reader.end(); return lines; })()', expected: ['ab', 'cd', '', 'e'] },
      { call: '(() => { const lines = []; const reader = createLineReader(line => lines.push(line)); reader.push(""); reader.push("q\\n"); reader.push(""); reader.end(); return lines; })()', expected: ['q'] },
      { call: '(() => { const lines = []; const reader = createLineReader(line => lines.push(line)); reader.push("1\\n2\\n3\\n4"); return lines; })()', expected: ['1', '2', '3'] },
      { call: '(() => { let calls = 0; const reader = createLineReader(() => { calls++; }); reader.push("a\\nb\\nc\\n"); reader.push("d\\n"); reader.end(); return calls; })()', expected: 4 },
      { call: '(() => { const lines = []; const reader = createLineReader(line => lines.push(line)); reader.end(); reader.push("late\\n"); return lines; })()', expected: ['late'] },
    ],
  },

  /* ── Medium: closures that keep state ─────────────────────────────── */
  'js-mh-undo-redo': {
    solution: `const createHistory = initial => {
  let present = initial;
  const past = []; // newest last
  const undone = []; // the most recently undone last
  return {
    current: () => present,
    set(value) {
      past.push(present);
      present = value;
      undone.length = 0; // a new change starts a new branch
    },
    undo() {
      // Check the length, not the value: 0, "" and false are values too.
      if (past.length > 0) {
        undone.push(present);
        present = past.pop();
      }
      return present;
    },
    redo() {
      if (undone.length > 0) {
        past.push(present);
        present = undone.pop();
      }
      return present;
    },
  };
};`,
    junior: `const createHistory = initial => {
  let present = initial;
  let past = [];
  let future = [];
  const current = () => {
    return present;
  };
  const set = value => {
    past.push(present);
    present = value;
    future = [];
  };
  const undo = () => {
    if (past.length === 0) {
      return present;
    }
    future.push(present);
    present = past.pop();
    return present;
  };
  const redo = () => {
    if (future.length === 0) {
      return present;
    }
    past.push(present);
    present = future.pop();
    return present;
  };
  return { current, set, undo, redo };
};`,
    senior: `const createHistory = initial => {
  let present = initial;
  const past = [];
  const future = [];
  const move = (from, to) => {
    if (from.length === 0) return present;
    to.push(present);
    present = from.pop();
    return present;
  };
  return {
    current: () => present,
    set(value) {
      past.push(present);
      present = value;
      future.length = 0;
    },
    undo: () => move(past, future),
    redo: () => move(future, past),
  };
};`,
    hiddenTests: [
      { call: '(() => { const history = createHistory("x"); history.set("y"); history.undo(); history.redo(); history.undo(); return [history.current(), history.redo(), history.redo()]; })()', expected: ['x', 'y', 'y'] },
      { call: '(() => { const history = createHistory(0); history.set(""); history.set(false); return [history.undo(), history.undo(), history.undo(), history.redo()]; })()', expected: ['', 0, 0, ''] },
      { call: '(() => { const history = createHistory(0); for (let i = 1; i <= 5; i++) history.set(i); history.undo(); history.undo(); history.undo(); history.set(9); const seen = []; for (let i = 0; i < 5; i++) seen.push(history.undo()); return seen; })()', expected: [2, 1, 0, 0, 0] },
      { call: '(() => { const first = { n: 1 }; const history = createHistory(first); history.set({ n: 2 }); return history.undo() === first; })()', expected: true },
      { call: '(() => { const history = createHistory(null); history.set(undefined); history.set(1); return [history.undo(), history.undo(), history.redo(), history.redo()]; })()', expected: [undefined, null, undefined, 1] },
    ],
  },
  'js-mh-rate-limit': {
    solution: `const createLimiter = (limit, windowMs) => {
  // Times of accepted requests, oldest first. Only this limiter can reach it.
  const times = [];
  const forgetOld = now => {
    // After a quiet spell several times can leave the window at once.
    while (times.length > 0 && now - times[0] >= windowMs) {
      times.shift();
    }
  };
  return {
    allow(now) {
      forgetOld(now);
      if (times.length >= limit) return false; // a refused request is not recorded
      times.push(now);
      return true;
    },
    remaining(now) {
      forgetOld(now);
      return limit - times.length;
    },
  };
};`,
    junior: `const createLimiter = (limit, windowMs) => {
  const accepted = [];
  const dropExpired = now => {
    let oldestIsExpired = accepted.length > 0 && now - accepted[0] >= windowMs;
    while (oldestIsExpired) {
      accepted.shift();
      oldestIsExpired = accepted.length > 0 && now - accepted[0] >= windowMs;
    }
  };
  const allow = now => {
    dropExpired(now);
    if (accepted.length < limit) {
      accepted.push(now);
      return true;
    }
    return false;
  };
  const remaining = now => {
    dropExpired(now);
    const left = limit - accepted.length;
    return left;
  };
  return { allow, remaining };
};`,
    senior: `const createLimiter = (limit, windowMs) => {
  const accepted = [];
  const remaining = now => {
    while (accepted.length && accepted[0] <= now - windowMs) accepted.shift();
    return limit - accepted.length;
  };
  const allow = now => {
    if (remaining(now) <= 0) return false;
    accepted.push(now);
    return true;
  };
  return { allow, remaining };
};`,
    hiddenTests: [
      { call: '(() => { const limiter = createLimiter(3, 100); limiter.allow(0); limiter.allow(1); limiter.allow(2); return [limiter.remaining(2), limiter.remaining(500)]; })()', expected: [0, 3] },
      { call: '(() => { const limiter = createLimiter(0, 1000); return [limiter.allow(0), limiter.remaining(0), limiter.allow(5000)]; })()', expected: [false, 0, false] },
      { call: '(() => { const limiter = createLimiter(1, 100); limiter.remaining(0); limiter.remaining(1); return [limiter.allow(2), limiter.allow(3)]; })()', expected: [true, false] },
      { call: '(() => { const limiter = createLimiter(2, 50); return [limiter.allow(7), limiter.allow(7), limiter.allow(7), limiter.allow(57), limiter.allow(57), limiter.allow(57)]; })()', expected: [true, true, false, true, true, false] },
      { call: '(() => { const a = createLimiter(2, 100); const b = createLimiter(1, 100); return [a.allow(0), b.allow(0), a.allow(1), b.allow(1), a.remaining(2), b.remaining(150)]; })()', expected: [true, true, true, false, 0, 1] },
    ],
  },
  'js-mh-curry': {
    solution: `const curry = fn => {
  // gather never changes the arguments it has collected, so every partial
  // function can be called again and each call branches off on its own.
  const gather = (...collected) => (...args) => {
    const all = [...collected, ...args];
    return all.length >= fn.length ? fn(...all) : gather(...all);
  };
  return gather();
};`,
    junior: `const curry = fn => {
  const needed = fn.length;
  const collect = previousArgs => {
    return (...newArgs) => {
      const allArgs = [...previousArgs, ...newArgs];
      if (allArgs.length >= needed) {
        return fn(...allArgs);
      }
      return collect(allArgs);
    };
  };
  return collect([]);
};`,
    senior: `const curry = fn => function curried(...args) {
  return args.length >= fn.length ? fn(...args) : (...more) => curried(...args, ...more);
};`,
    hiddenTests: [
      { call: '(() => { const volume = (l, w, h) => l * w * h; const base = curry(volume)(2); const wide = base(3); return [wide(4), wide(5), base(1)(1), base(1, 1)]; })()', expected: [24, 30, 2, 2] },
      { call: '(() => { const pair = (a, b) => [a, b]; const one = curry(pair); const two = curry(pair); one("x"); return [two("y")("z"), one("p")("q")]; })()', expected: [['y', 'z'], ['p', 'q']] },
      { call: 'curry((a, b) => a + b)(1)()(2)', expected: 3 },
      { call: 'curry((a, b, c, d) => [a, b, c, d])(1)(2)(3)(4)', expected: [1, 2, 3, 4] },
      { call: '(() => { let calls = 0; const add = curry((a, b) => { calls++; return a + b; }); const addTen = add(10); addTen(1); addTen(2); return [calls, addTen(0)]; })()', expected: [2, 10] },
    ],
  },

  /* ── Medium: arrays and grids ─────────────────────────────────────── */
  'js-mh-spiral': {
    solution: `const spiral = grid => {
  const values = [];
  let top = 0;
  let bottom = grid.length - 1;
  let left = 0;
  let right = grid.length > 0 ? grid[0].length - 1 : -1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) values.push(grid[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) values.push(grid[r][right]);
    right--;
    // A single row or column may be all that was left: check before going back.
    if (top <= bottom) {
      for (let c = right; c >= left; c--) values.push(grid[bottom][c]);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) values.push(grid[r][left]);
      left++;
    }
  }
  return values;
};`,
    junior: `const spiral = grid => {
  const result = [];
  if (grid.length === 0) {
    return result;
  }
  let topRow = 0;
  let bottomRow = grid.length - 1;
  let leftCol = 0;
  let rightCol = grid[0].length - 1;
  while (topRow <= bottomRow && leftCol <= rightCol) {
    for (let col = leftCol; col <= rightCol; col++) {
      result.push(grid[topRow][col]);
    }
    topRow = topRow + 1;
    for (let row = topRow; row <= bottomRow; row++) {
      result.push(grid[row][rightCol]);
    }
    rightCol = rightCol - 1;
    if (topRow <= bottomRow) {
      for (let col = rightCol; col >= leftCol; col--) {
        result.push(grid[bottomRow][col]);
      }
      bottomRow = bottomRow - 1;
    }
    if (leftCol <= rightCol) {
      for (let row = bottomRow; row >= topRow; row--) {
        result.push(grid[row][leftCol]);
      }
      leftCol = leftCol + 1;
    }
  }
  return result;
};`,
    senior: `const spiral = grid => {
  const rows = grid.map(row => [...row]); // peel a copy, never the caller's grid
  const values = [];
  while (rows.length > 0) {
    values.push(...rows.shift());
    for (const row of rows) if (row.length > 0) values.push(row.pop());
    if (rows.length > 0) values.push(...rows.pop().reverse());
    for (let r = rows.length - 1; r >= 0; r--) if (rows[r].length > 0) values.push(rows[r].shift());
  }
  return values;
};`,
    hiddenTests: [
      { call: 'spiral([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]])', expected: [1, 2, 3, 4, 8, 12, 16, 15, 14, 13, 9, 5, 6, 7, 11, 10] },
      { call: 'spiral([[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15]])', expected: [1, 2, 3, 4, 5, 10, 15, 14, 13, 12, 11, 6, 7, 8, 9] },
      { call: 'spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12], [13, 14, 15]])', expected: [1, 2, 3, 6, 9, 12, 15, 14, 13, 10, 7, 4, 5, 8, 11] },
      { call: 'spiral([[7]])', expected: [7] },
      { call: '(() => { const grid = [[1, 2], [3, 4]]; const out = spiral(grid); return [out, grid]; })()', expected: [[1, 2, 4, 3], [[1, 2], [3, 4]]] },
    ],
  },
  'js-mh-paint-bucket': {
    solution: `const paintBucket = (grid, row, col, colour) => {
  const copy = grid.map(cells => [...cells]); // new rows, so the caller's grid stays as it was
  const from = copy[row][col];
  // Painting a cell its own colour would never end: every cell stays "unpainted".
  if (from === colour) return copy;
  const paint = (r, c) => {
    if (r < 0 || r >= copy.length || c < 0 || c >= copy[r].length) return;
    if (copy[r][c] !== from) return;
    copy[r][c] = colour;
    paint(r - 1, c);
    paint(r + 1, c);
    paint(r, c - 1);
    paint(r, c + 1);
  };
  paint(row, col);
  return copy;
};`,
    junior: `const paintBucket = (grid, row, col, colour) => {
  const copy = grid.map(cells => {
    const newRow = [];
    for (const cell of cells) {
      newRow.push(cell);
    }
    return newRow;
  });
  const startColour = copy[row][col];
  if (startColour === colour) {
    return copy;
  }
  const fill = (r, c) => {
    const insideRows = r >= 0 && r < copy.length;
    if (!insideRows) {
      return;
    }
    const insideCols = c >= 0 && c < copy[r].length;
    if (!insideCols) {
      return;
    }
    if (copy[r][c] !== startColour) {
      return;
    }
    copy[r][c] = colour;
    fill(r - 1, c);
    fill(r, c + 1);
    fill(r + 1, c);
    fill(r, c - 1);
  };
  fill(row, col);
  return copy;
};`,
    senior: `const NEIGHBOURS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const paintBucket = (grid, row, col, colour) => {
  const copy = grid.map(cells => [...cells]);
  const from = copy[row][col];
  const paint = (r, c) => {
    if (copy[r]?.[c] !== from) return; // off the grid reads undefined, which is never a colour
    copy[r][c] = colour;
    NEIGHBOURS.forEach(([dr, dc]) => paint(r + dr, c + dc));
  };
  if (from !== colour) paint(row, col);
  return copy;
};`,
    hiddenTests: [
      { call: 'paintBucket([["s", "s", "s", "s"], ["s", "t", "t", "s"], ["s", "t", "s", "s"], ["t", "s", "s", "t"]], 0, 0, "o")', expected: [['o', 'o', 'o', 'o'], ['o', 't', 't', 'o'], ['o', 't', 'o', 'o'], ['t', 'o', 'o', 't']] },
      { call: 'paintBucket([["a", "a", "a"], ["b", "b", "a"], ["a", "a", "a"]], 2, 0, "z")', expected: [['z', 'z', 'z'], ['b', 'b', 'z'], ['z', 'z', 'z']] },
      { call: 'paintBucket([["a", "a", "b", "a"]], 0, 3, "c")', expected: [['a', 'a', 'b', 'c']] },
      { call: 'paintBucket([["a"]], 0, 0, "b")', expected: [['b']] },
      { call: '(() => { const grid = [["a"]]; const out = paintBucket(grid, 0, 0, "a"); return [out !== grid, out[0] !== grid[0], out]; })()', expected: [true, true, [['a']]] },
    ],
  },
  'js-mh-sudoku-check': {
    solution: `const isValidSudoku = board => {
  if (board.length !== 9 || !board.every(row => row.length === 9)) return false;
  // Array.from calls the function nine times: nine different Sets.
  const rows = Array.from({ length: 9 }, () => new Set());
  const columns = Array.from({ length: 9 }, () => new Set());
  const boxes = Array.from({ length: 9 }, () => new Set());
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const digit = board[r][c];
      if (digit === 0) continue; // empty cells never clash
      const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (rows[r].has(digit) || columns[c].has(digit) || boxes[box].has(digit)) return false;
      rows[r].add(digit);
      columns[c].add(digit);
      boxes[box].add(digit);
    }
  }
  return true;
};`,
    junior: `const isValidSudoku = board => {
  if (board.length !== 9) {
    return false;
  }
  const rightWidth = board.every(row => row.length === 9);
  if (!rightWidth) {
    return false;
  }
  for (let r = 0; r < 9; r++) {
    const seen = new Set();
    for (let c = 0; c < 9; c++) {
      const digit = board[r][c];
      if (digit !== 0) {
        if (seen.has(digit)) {
          return false;
        }
        seen.add(digit);
      }
    }
  }
  for (let c = 0; c < 9; c++) {
    const seen = new Set();
    for (let r = 0; r < 9; r++) {
      const digit = board[r][c];
      if (digit !== 0) {
        if (seen.has(digit)) {
          return false;
        }
        seen.add(digit);
      }
    }
  }
  for (let box = 0; box < 9; box++) {
    const seen = new Set();
    const firstRow = Math.floor(box / 3) * 3;
    const firstCol = (box % 3) * 3;
    for (let r = firstRow; r < firstRow + 3; r++) {
      for (let c = firstCol; c < firstCol + 3; c++) {
        const digit = board[r][c];
        if (digit !== 0) {
          if (seen.has(digit)) {
            return false;
          }
          seen.add(digit);
        }
      }
    }
  }
  return true;
};`,
    senior: `const isValidSudoku = board => {
  if (board.length !== 9 || !board.every(row => row.length === 9)) return false;
  const seen = new Set(); // one Set of labelled facts: "row 3 has 5", "box 4 has 5", ...
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const digit = board[r][c];
      if (digit === 0) continue;
      const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      for (const fact of [\`r\${r}:\${digit}\`, \`c\${c}:\${digit}\`, \`b\${box}:\${digit}\`]) {
        if (seen.has(fact)) return false;
        seen.add(fact);
      }
    }
  }
  return true;
};`,
    hiddenTests: [
      { call: 'isValidSudoku(["830070000", "600195000", "098000060", "800060003", "400803001", "700020006", "060000280", "000419005", "000080079"].map(row => [...row].map(Number)))', expected: false },
      { call: 'isValidSudoku(["534678912", "672195348", "198342567", "859761423", "426853791", "713924856", "961537284", "287419635", "345286179"].map(row => [...row].map(Number)))', expected: true },
      { call: 'isValidSudoku(["000000000", "000000000", "000070000", "000000000", "000000000", "000000000", "000070000", "000000000", "000000000"].map(row => [...row].map(Number)))', expected: false },
      { call: 'isValidSudoku(["000000000", "000000000", "000000000", "000000000", "000000000", "000000000", "000000900", "000000000", "000000009"].map(row => [...row].map(Number)))', expected: false },
      { call: 'isValidSudoku([...Array.from({ length: 8 }, () => new Array(9).fill(0)), new Array(8).fill(0)])', expected: false },
      { call: 'isValidSudoku(Array.from({ length: 9 }, (_, r) => new Array(r === 4 ? 10 : 9).fill(0)))', expected: false },
    ],
  },
  'js-mh-thread-from-list': {
    solution: `const buildThread = comments => {
  // First pass: every node exists before any reply looks for its parent,
  // which is what makes the input order stop mattering.
  const nodes = new Map();
  for (const { id, text } of comments) nodes.set(id, { id, text, replies: [] });
  const roots = [];
  for (const { id, parentId } of comments) {
    const node = nodes.get(id);
    // has(), not a truthiness check: an id can be 0.
    if (nodes.has(parentId)) nodes.get(parentId).replies.push(node);
    else roots.push(node); // top level, or a parent that is missing
  }
  return roots;
};`,
    junior: `const buildThread = comments => {
  const nodeById = new Map();
  for (const comment of comments) {
    const node = {
      id: comment.id,
      text: comment.text,
      replies: [],
    };
    nodeById.set(comment.id, node);
  }
  const topLevel = [];
  for (const comment of comments) {
    const node = nodeById.get(comment.id);
    const parentExists = nodeById.has(comment.parentId);
    if (parentExists) {
      const parent = nodeById.get(comment.parentId);
      parent.replies.push(node);
    } else {
      topLevel.push(node);
    }
  }
  return topLevel;
};`,
    senior: `const buildThread = comments => {
  const nodes = new Map(comments.map(({ id, text }) => [id, { id, text, replies: [] }]));
  const roots = [];
  for (const { id, parentId } of comments) {
    (nodes.get(parentId)?.replies ?? roots).push(nodes.get(id));
  }
  return roots;
};`,
    hiddenTests: [
      { call: 'buildThread([{ id: 3, parentId: 2, text: "c" }, { id: 2, parentId: 1, text: "b" }, { id: 1, parentId: null, text: "a" }])', expected: [{ id: 1, text: 'a', replies: [{ id: 2, text: 'b', replies: [{ id: 3, text: 'c', replies: [] }] }] }] },
      { call: 'buildThread([{ id: 0, parentId: null, text: "zero" }, { id: 1, parentId: 0, text: "one" }])', expected: [{ id: 0, text: 'zero', replies: [{ id: 1, text: 'one', replies: [] }] }] },
      { call: '(() => { const comments = [{ id: 1, parentId: null, text: "a" }, { id: 2, parentId: 1, text: "b" }]; buildThread(comments); return comments; })()', expected: [{ id: 1, parentId: null, text: 'a' }, { id: 2, parentId: 1, text: 'b' }] },
      { call: 'buildThread([{ id: "x", parentId: null, text: "1" }, { id: "y", parentId: "x", text: "2" }, { id: "z", parentId: "gone", text: "3" }, { id: "w", parentId: "y", text: "4" }, { id: "v", parentId: "x", text: "5" }])', expected: [{ id: 'x', text: '1', replies: [{ id: 'y', text: '2', replies: [{ id: 'w', text: '4', replies: [] }] }, { id: 'v', text: '5', replies: [] }] }, { id: 'z', text: '3', replies: [] }] },
      { call: '(() => { const [root] = buildThread([{ id: 1, parentId: null, text: "a" }, { id: 2, parentId: 1, text: "b" }]); return root.replies[0].replies; })()', expected: [] },
    ],
  },

  /* ── Medium: sums, deep values and async batches ──────────────────── */
  'js-mh-who-owes-what': {
    solution: `const balances = expenses =>
  expenses.reduce((totals, { paidBy, amount, split }) => {
    totals[paidBy] = (totals[paidBy] ?? 0) + amount;
    const share = Math.floor(amount / split.length);
    const leftOver = amount % split.length;
    split.forEach((name, index) => {
      // The first leftOver people pay one cent more, so the shares add up to amount.
      totals[name] = (totals[name] ?? 0) - share - (index < leftOver ? 1 : 0);
    });
    return totals;
  }, {});`,
    junior: `const balances = expenses => {
  const totals = {};
  for (const expense of expenses) {
    const payer = expense.paidBy;
    if (totals[payer] === undefined) {
      totals[payer] = 0;
    }
    totals[payer] = totals[payer] + expense.amount;
    const people = expense.split.length;
    const share = Math.floor(expense.amount / people);
    let leftOver = expense.amount - share * people;
    for (const name of expense.split) {
      if (totals[name] === undefined) {
        totals[name] = 0;
      }
      let owes = share;
      if (leftOver > 0) {
        owes = owes + 1;
        leftOver = leftOver - 1;
      }
      totals[name] = totals[name] - owes;
    }
  }
  return totals;
};`,
    senior: `const addTo = (totals, name, cents) => {
  totals[name] = (totals[name] ?? 0) + cents;
  return totals;
};

const balances = expenses =>
  expenses.reduce((totals, { paidBy, amount, split }) => {
    const share = Math.floor(amount / split.length);
    const extra = amount % split.length;
    addTo(totals, paidBy, amount);
    split.forEach((name, i) => addTo(totals, name, -(share + (i < extra ? 1 : 0))));
    return totals;
  }, {});`,
    hiddenTests: [
      { call: 'balances([{ paidBy: "A", amount: 10, split: ["A", "B", "C", "D"] }])', expected: { A: 7, B: -3, C: -2, D: -2 } },
      { call: 'balances([{ paidBy: "x", amount: 997, split: ["x", "y", "z"] }, { paidBy: "y", amount: 101, split: ["z", "x"] }, { paidBy: "z", amount: 50, split: ["y"] }])', expected: { x: 614, y: -281, z: -333 } },
      { call: 'balances([{ paidBy: "Solo", amount: 999, split: ["Solo"] }])', expected: { Solo: 0 } },
      { call: '(() => { const result = balances([{ paidBy: "p", amount: 1001, split: ["q", "r", "s"] }, { paidBy: "q", amount: 7, split: ["p", "s"] }]); return Object.values(result).reduce((sum, n) => sum + n, 0); })()', expected: 0 },
    ],
  },
  'js-mh-deep-equal': {
    solution: `const deepEqual = (a, b) => {
  if (Object.is(a, b)) return true; // primitives, NaN, and the same object twice
  // From here on both must be objects, and typeof null is "object" too.
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  const keys = Object.keys(a);
  // Counting keys alone would let { a: undefined } equal { b: undefined }.
  return keys.length === Object.keys(b).length &&
    keys.every(key => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
};`,
    junior: `const deepEqual = (a, b) => {
  if (Object.is(a, b)) {
    return true;
  }
  const aIsObject = typeof a === "object" && a !== null;
  const bIsObject = typeof b === "object" && b !== null;
  if (!aIsObject || !bIsObject) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) {
      return false;
    }
    if (!deepEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
};`,
    senior: `const isObject = value => typeof value === "object" && value !== null;

const deepEqual = (a, b) => {
  if (Object.is(a, b)) return true;
  if (!isObject(a) || !isObject(b) || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a); // an array's keys are its indexes, so one path covers both shapes
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
};`,
    hiddenTests: [
      { call: 'deepEqual({ a: undefined }, { b: undefined })', expected: false },
      { call: 'deepEqual({ x: [{ y: [NaN] }] }, { x: [{ y: [NaN] }] })', expected: true },
      { call: 'deepEqual([1, 2, 3], [1, 2])', expected: false },
      { call: 'deepEqual({}, [])', expected: false },
      { call: 'deepEqual({ a: null }, { a: {} })', expected: false },
      { call: 'deepEqual([[], {}], [[], {}])', expected: true },
      { call: 'deepEqual("1", 1)', expected: false },
    ],
  },
  'js-mh-in-batches': {
    solution: `const inBatches = async (items, size, worker) => {
  const results = [];
  for (let start = 0; start < items.length; start += size) {
    const batch = items.slice(start, start + size);
    // Start the whole batch, then wait for all of it: the await holds the loop,
    // so the next batch cannot start early. A rejection leaves the loop.
    const done = await Promise.all(batch.map(item => worker(item)));
    results.push(...done);
  }
  return results;
};`,
    junior: `const inBatches = async (items, size, worker) => {
  const allResults = [];
  let index = 0;
  while (index < items.length) {
    const batch = items.slice(index, index + size);
    const promises = [];
    for (const item of batch) {
      promises.push(worker(item));
    }
    const batchResults = await Promise.all(promises);
    for (const result of batchResults) {
      allResults.push(result);
    }
    index = index + size;
  }
  return allResults;
};`,
    senior: `const inBatches = async (items, size, worker) => {
  const batches = Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
  const results = [];
  for (const batch of batches) {
    results.push(...(await Promise.all(batch.map(item => worker(item)))));
  }
  return results;
};`,
    hiddenTests: [
      { call: 'inBatches([5, 4, 3, 2, 1, 0, 9], 3, n => new Promise(done => setTimeout(() => done(n), n)))', expected: [5, 4, 3, 2, 1, 0, 9], async: true },
      { call: '(async () => { const log = []; await inBatches([1, 2, 3, 4], 2, async n => { log.push("start " + n); await new Promise(done => setTimeout(done, n === 1 ? 40 : 5)); log.push("end " + n); }); return log; })()', expected: ['start 1', 'start 2', 'end 2', 'end 1', 'start 3', 'start 4', 'end 3', 'end 4'], async: true },
      { call: '(async () => { const started = []; try { await inBatches(["a", "b", "c", "d", "e"], 2, async s => { started.push(s); await new Promise(done => setTimeout(done, 1)); if (s === "d") throw new Error("no " + s); return s; }); return "resolved"; } catch (error) { return [error.message, started]; } })()', expected: ['no d', ['a', 'b', 'c', 'd']], async: true },
      { call: 'inBatches([1, 2, 3, 4, 5], 2, async n => n * n)', expected: [1, 4, 9, 16, 25], async: true },
      { call: 'inBatches([], 2, async n => n) instanceof Promise', expected: true },
    ],
  },
  'js-mh-latest-only': {
    solution: `const latestOnly = search => {
  let started = 0; // how many calls this wrapper has started
  return async (...args) => {
    const mine = ++started;
    try {
      const value = await search(...args);
      return mine === started ? { stale: false, value } : { stale: true };
    } catch (error) {
      if (mine !== started) return { stale: true }; // an old failure is as stale as an old answer
      throw error;
    }
  };
};`,
    junior: `const latestOnly = search => {
  let callCount = 0;
  const run = async (...args) => {
    callCount = callCount + 1;
    const myNumber = callCount;
    let value;
    try {
      value = await search(...args);
    } catch (error) {
      const isNewest = myNumber === callCount;
      if (isNewest) {
        throw error;
      }
      return { stale: true };
    }
    const isNewest = myNumber === callCount;
    if (isNewest) {
      return { stale: false, value: value };
    }
    return { stale: true };
  };
  return run;
};`,
    senior: `const latestOnly = search => {
  let latest = 0;
  return (...args) => {
    const id = ++latest;
    const isStale = () => id !== latest;
    return Promise.resolve(search(...args)).then(
      value => (isStale() ? { stale: true } : { stale: false, value }),
      error => {
        if (isStale()) return { stale: true };
        throw error;
      },
    );
  };
};`,
    hiddenTests: [
      { call: '(async () => { const calls = []; const run = latestOnly(async (...args) => { calls.push(args); return args.length; }); const pending = run(1, 2, 3); const seenBeforeAwait = calls.length; return [seenBeforeAwait, await pending, calls]; })()', expected: [1, { stale: false, value: 3 }, [[1, 2, 3]]], async: true },
      { call: '(async () => { const wait = (value, ms) => new Promise(done => setTimeout(() => done(value), ms)); const run = latestOnly(wait); return Promise.all([run("a", 30), run("b", 5), run("c", 20)]); })()', expected: [{ stale: true }, { stale: true }, { stale: false, value: 'c' }], async: true },
      { call: '(async () => { const wait = (value, ms) => new Promise(done => setTimeout(() => done(value), ms)); const run = latestOnly(wait); const first = run(1, 20); await run(2, 5); const third = await run(3, 5); return [await first, third]; })()', expected: [{ stale: true }, { stale: false, value: 3 }], async: true },
      { call: '(async () => { const run = latestOnly(async () => ""); return run(); })()', expected: { stale: false, value: '' }, async: true },
      { call: '(async () => { const run = latestOnly(query => (query === "boom" ? Promise.reject(new Error("broken")) : Promise.resolve(query))); const answer = await run("fine"); const failure = await run("boom").catch(error => error.message); return [answer, failure]; })()', expected: [{ stale: false, value: 'fine' }, 'broken'], async: true },
    ],
  },
};
