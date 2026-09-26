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

  /* ── Hard: algorithms on lists and grids ──────────────────────────── */
  'js-mh-settle-up': {
    solution: `const settleUp = balances => {
  // Largest amount first; a tie goes by name, A to Z.
  const byAmountThenName = (a, b) => b.amount - a.amount || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  // New objects with positive amounts: the payments change these, never balances.
  const debtors = [];
  const creditors = [];
  for (const [name, balance] of Object.entries(balances)) {
    if (balance < 0) debtors.push({ name, amount: -balance });
    else if (balance > 0) creditors.push({ name, amount: balance });
  }
  debtors.sort(byAmountThenName);
  creditors.sort(byAmountThenName);
  const payments = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const amount = Math.min(debtor.amount, creditor.amount);
    payments.push({ from: debtor.name, to: creditor.name, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
    // Whoever still has an amount left stays current: the lists are not re-sorted.
    if (debtor.amount === 0) d++;
    if (creditor.amount === 0) c++;
  }
  return payments;
};`,
    junior: `const settleUp = balances => {
  const owes = [];
  const owed = [];
  const names = Object.keys(balances);
  for (const name of names) {
    const balance = balances[name];
    if (balance < 0) {
      owes.push({ name: name, amount: -balance });
    }
    if (balance > 0) {
      owed.push({ name: name, amount: balance });
    }
  }
  const compare = (a, b) => {
    if (a.amount !== b.amount) {
      return b.amount - a.amount;
    }
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  };
  owes.sort(compare);
  owed.sort(compare);
  const payments = [];
  while (owes.length > 0 && owed.length > 0) {
    const debtor = owes[0];
    const creditor = owed[0];
    let amount = debtor.amount;
    if (creditor.amount < amount) {
      amount = creditor.amount;
    }
    payments.push({ from: debtor.name, to: creditor.name, amount: amount });
    debtor.amount = debtor.amount - amount;
    creditor.amount = creditor.amount - amount;
    if (debtor.amount === 0) {
      owes.shift();
    }
    if (creditor.amount === 0) {
      owed.shift();
    }
  }
  return payments;
};`,
    senior: `const byAmountThenName = (a, b) => b.amount - a.amount || (a.name < b.name ? -1 : Number(a.name > b.name));

const side = (balances, sign) =>
  Object.entries(balances)
    .filter(([, balance]) => Math.sign(balance) === sign)
    .map(([name, balance]) => ({ name, amount: Math.abs(balance) }))
    .sort(byAmountThenName);

const settleUp = balances => {
  const debtors = side(balances, -1);
  const creditors = side(balances, 1);
  const payments = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].amount, creditors[c].amount);
    payments.push({ from: debtors[d].name, to: creditors[c].name, amount });
    debtors[d].amount -= amount;
    creditors[c].amount -= amount;
    if (debtors[d].amount === 0) d++;
    if (creditors[c].amount === 0) c++;
  }
  return payments;
};`,
    hiddenTests: [
      { call: 'settleUp({ A: 600, B: 500, C: -700, D: -400 })', expected: [{ from: 'C', to: 'A', amount: 600 }, { from: 'C', to: 'B', amount: 100 }, { from: 'D', to: 'B', amount: 400 }] },
      { call: 'settleUp({ p: 700, q: -250, r: -250, s: -100, t: -100 })', expected: [{ from: 'q', to: 'p', amount: 250 }, { from: 'r', to: 'p', amount: 250 }, { from: 's', to: 'p', amount: 100 }, { from: 't', to: 'p', amount: 100 }] },
      { call: 'settleUp({ A: 300, B: 300, C: -500, D: -100 })', expected: [{ from: 'C', to: 'A', amount: 300 }, { from: 'C', to: 'B', amount: 200 }, { from: 'D', to: 'B', amount: 100 }] },
      { call: 'settleUp({ a: 1234, b: -1000, c: 567, d: -801 })', expected: [{ from: 'b', to: 'a', amount: 1000 }, { from: 'd', to: 'a', amount: 234 }, { from: 'd', to: 'c', amount: 567 }] },
    ],
  },
  'js-mh-line-diff': {
    solution: `const diffLines = (before, after) => {
  const rows = before.length;
  const cols = after.length;
  // table[i][j]: the longest common subsequence of before.slice(i) and
  // after.slice(j). The extra row and column of zeros is "one side ran out".
  const table = [];
  for (let i = 0; i <= rows; i++) table.push(new Array(cols + 1).fill(0));
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      table[i][j] = before[i] === after[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const edit = [];
  let i = 0;
  let j = 0;
  while (i < rows || j < cols) {
    if (i < rows && j < cols && before[i] === after[j]) {
      edit.push([" ", before[i]]);
      i++;
      j++;
    } else if (j === cols || (i < rows && table[i + 1][j] >= table[i][j + 1])) {
      edit.push(["-", before[i]]); // on a tie the removal goes first
      i++;
    } else {
      edit.push(["+", after[j]]);
      j++;
    }
  }
  return edit;
};`,
    junior: `const diffLines = (before, after) => {
  const table = [];
  for (let i = 0; i <= before.length; i++) {
    const row = [];
    for (let j = 0; j <= after.length; j++) {
      row.push(0);
    }
    table.push(row);
  }
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      if (before[i] === after[j]) {
        table[i][j] = table[i + 1][j + 1] + 1;
      } else {
        const skipBefore = table[i + 1][j];
        const skipAfter = table[i][j + 1];
        if (skipBefore >= skipAfter) {
          table[i][j] = skipBefore;
        } else {
          table[i][j] = skipAfter;
        }
      }
    }
  }
  const result = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      result.push([" ", before[i]]);
      i = i + 1;
      j = j + 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      result.push(["-", before[i]]);
      i = i + 1;
    } else {
      result.push(["+", after[j]]);
      j = j + 1;
    }
  }
  while (i < before.length) {
    result.push(["-", before[i]]);
    i = i + 1;
  }
  while (j < after.length) {
    result.push(["+", after[j]]);
    j = j + 1;
  }
  return result;
};`,
    senior: `const lcsTable = (a, b) => {
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
};

const diffLines = (before, after) => {
  const table = lcsTable(before, after);
  const edit = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      edit.push([" ", before[i]]);
      i++;
      j++;
    } else if (j === after.length || (i < before.length && table[i + 1][j] >= table[i][j + 1])) {
      edit.push(["-", before[i++]]);
    } else {
      edit.push(["+", after[j++]]);
    }
  }
  return edit;
};`,
    hiddenTests: [
      { call: 'diffLines(["title", "intro", "body", "outro", "sign-off"], ["title", "body", "extra", "outro", "thanks", "sign-off"])', expected: [[' ', 'title'], ['-', 'intro'], [' ', 'body'], ['+', 'extra'], [' ', 'outro'], ['+', 'thanks'], [' ', 'sign-off']] },
      { call: 'diffLines(["a", "b", "a", "b"], ["b", "a", "b", "a"])', expected: [['-', 'a'], [' ', 'b'], [' ', 'a'], [' ', 'b'], ['+', 'a']] },
      { call: 'diffLines(["a", "x", "c"], ["a", "y", "c"])', expected: [[' ', 'a'], ['-', 'x'], ['+', 'y'], [' ', 'c']] },
      { call: '(() => { const before = [..."ABCBDAB"]; const after = [..."BDCABA"]; const edit = diffLines(before, after); return [edit.filter(([mark]) => mark === " ").length, edit.filter(([mark]) => mark !== "+").map(([, line]) => line).join(""), edit.filter(([mark]) => mark !== "-").map(([, line]) => line).join("")]; })()', expected: [4, 'ABCBDAB', 'BDCABA'] },
      { call: '(() => { const before = Array.from({ length: 60 }, (_, i) => "line " + (i % 7)); const after = Array.from({ length: 60 }, (_, i) => "line " + (i % 5)); const edit = diffLines(before, after); return [edit.filter(([mark]) => mark === " ").length, edit.filter(([mark]) => mark !== "+").map(([, line]) => line).join() === before.join(), edit.filter(([mark]) => mark !== "-").map(([, line]) => line).join() === after.join()]; })()', expected: [44, true, true] },
      { call: 'diffLines([], [])', expected: [] },
    ],
  },
  'js-mh-word-search': {
    solution: `const STEPS = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // up, right, down, left

const findWord = (grid, word) => {
  if (word === "") return [];
  const used = new Set();
  const path = [];
  const follow = (row, col, index) => {
    if (row < 0 || row >= grid.length || col < 0 || col >= grid[row].length) return false;
    const key = row + "," + col;
    if (used.has(key) || grid[row][col] !== word[index]) return false;
    used.add(key);
    path.push([row, col]);
    if (index === word.length - 1) return true;
    // some stops at the first neighbour that finishes the word.
    const found = STEPS.some(([dr, dc]) => follow(row + dr, col + dc, index + 1));
    if (!found) {
      // A dead end from here: free the cell, another path may need it.
      used.delete(key);
      path.pop();
    }
    return found;
  };
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (follow(row, col, 0)) return path;
    }
  }
  return null;
};`,
    junior: `const findWord = (grid, word) => {
  if (word.length === 0) {
    return [];
  }
  const visited = [];
  for (let r = 0; r < grid.length; r++) {
    const row = [];
    for (let c = 0; c < grid[r].length; c++) {
      row.push(false);
    }
    visited.push(row);
  }
  const path = [];
  const search = (r, c, index) => {
    if (r < 0 || r >= grid.length) {
      return false;
    }
    if (c < 0 || c >= grid[r].length) {
      return false;
    }
    if (visited[r][c]) {
      return false;
    }
    if (grid[r][c] !== word[index]) {
      return false;
    }
    visited[r][c] = true;
    path.push([r, c]);
    if (index === word.length - 1) {
      return true;
    }
    if (search(r - 1, c, index + 1)) {
      return true;
    }
    if (search(r, c + 1, index + 1)) {
      return true;
    }
    if (search(r + 1, c, index + 1)) {
      return true;
    }
    if (search(r, c - 1, index + 1)) {
      return true;
    }
    visited[r][c] = false;
    path.pop();
    return false;
  };
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (search(r, c, 0)) {
        return path;
      }
    }
  }
  return null;
};`,
    senior: `const STEPS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

const findWord = (grid, word) => {
  if (word === "") return [];
  const trace = (row, col, path) => {
    if (grid[row]?.[col] !== word[path.length] || path.some(([r, c]) => r === row && c === col)) return null;
    const next = [...path, [row, col]]; // a new path per step, so a dead end needs no undoing
    if (next.length === word.length) return next;
    for (const [dr, dc] of STEPS) {
      const found = trace(row + dr, col + dc, next);
      if (found) return found;
    }
    return null;
  };
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const found = trace(row, col, []);
      if (found) return found;
    }
  }
  return null;
};`,
    hiddenTests: [
      { call: 'findWord(["CAA", "AAA", "BCD"], "AAB")', expected: [[1, 1], [1, 0], [2, 0]] },
      { call: 'findWord(["BX", "AB"], "AB")', expected: [[1, 0], [0, 0]] },
      { call: 'findWord(["XA", "AX"], "A")', expected: [[0, 1]] },
      { call: 'findWord(["AXX", "BXX", "CDE"], "EDCBA")', expected: [[2, 2], [2, 1], [2, 0], [1, 0], [0, 0]] },
      { call: 'findWord(["AAAA"], "AAAA")', expected: [[0, 0], [0, 1], [0, 2], [0, 3]] },
      { call: 'findWord(["AB"], "ABA")', expected: null },
    ],
  },
  'js-mh-arrangements': {
    solution: `const arrangements = letters => {
  const counts = new Map();
  for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  const results = [];
  const build = prefix => {
    if (prefix.length === letters.length) {
      results.push(prefix);
      return;
    }
    // Each different letter once per position: that is what stops repeats,
    // before they are made rather than after.
    for (const [letter, count] of counts) {
      if (count === 0) continue;
      counts.set(letter, count - 1);
      build(prefix + letter);
      counts.set(letter, count); // put it back for the next branch
    }
  };
  build("");
  return results.sort();
};`,
    junior: `const arrangements = letters => {
  const sorted = letters.split("").sort();
  const used = [];
  for (let i = 0; i < sorted.length; i++) {
    used.push(false);
  }
  const results = [];
  const build = current => {
    if (current.length === sorted.length) {
      results.push(current);
      return;
    }
    for (let i = 0; i < sorted.length; i++) {
      if (used[i]) {
        continue;
      }
      if (i > 0 && sorted[i] === sorted[i - 1] && !used[i - 1]) {
        continue;
      }
      used[i] = true;
      build(current + sorted[i]);
      used[i] = false;
    }
  };
  build("");
  results.sort();
  return results;
};`,
    senior: `const arrangements = letters => {
  if (letters.length <= 1) return [letters];
  const orders = [];
  for (const letter of new Set(letters)) {
    const at = letters.indexOf(letter);
    const rest = letters.slice(0, at) + letters.slice(at + 1);
    for (const tail of arrangements(rest)) orders.push(letter + tail);
  }
  return orders.sort();
};`,
    hiddenTests: [
      { call: 'arrangements("aaaaaaaaab").length', expected: 10 },
      { call: 'arrangements("aaaaaaaabb").length', expected: 45 },
      { call: 'arrangements("cba")', expected: ['abc', 'acb', 'bac', 'bca', 'cab', 'cba'] },
      { call: 'arrangements("aabc")', expected: ['aabc', 'aacb', 'abac', 'abca', 'acab', 'acba', 'baac', 'baca', 'bcaa', 'caab', 'caba', 'cbaa'] },
      { call: 'arrangements("1a1")', expected: ['11a', '1a1', 'a11'] },
    ],
  },
  'js-mh-justify-text': {
    solution: `const justify = (text, width) => {
  // Leading or trailing whitespace leaves empty strings behind: drop them.
  const words = text.split(/\\s+/).filter(word => word !== "");
  const lines = [];
  const widen = lineWords => {
    if (lineWords.length === 1) return lineWords[0].padEnd(width);
    const gaps = lineWords.length - 1;
    const spaces = width - lineWords.reduce((sum, word) => sum + word.length, 0);
    let out = lineWords[0];
    for (let i = 1; i < lineWords.length; i++) {
      // Every gap gets the even share; the first (spaces % gaps) get one more.
      out += " ".repeat(Math.floor(spaces / gaps) + (i <= spaces % gaps ? 1 : 0)) + lineWords[i];
    }
    return out;
  };
  let line = [];
  let letters = 0;
  for (const word of words) {
    // The word fits after the gaps already there plus one more space.
    if (line.length > 0 && letters + line.length + word.length > width) {
      lines.push(widen(line));
      line = [];
      letters = 0;
    }
    line.push(word);
    letters += word.length;
  }
  if (line.length > 0) lines.push(line.join(" ").padEnd(width)); // the last line is not widened
  return lines;
};`,
    junior: `const justify = (text, width) => {
  const pieces = text.split(/\\s+/);
  const words = [];
  for (const piece of pieces) {
    if (piece.length > 0) {
      words.push(piece);
    }
  }
  const lines = [];
  let index = 0;
  while (index < words.length) {
    const lineWords = [words[index]];
    let lineLength = words[index].length;
    index = index + 1;
    while (index < words.length && lineLength + 1 + words[index].length <= width) {
      lineWords.push(words[index]);
      lineLength = lineLength + 1 + words[index].length;
      index = index + 1;
    }
    const isLastLine = index === words.length;
    let line = "";
    if (isLastLine || lineWords.length === 1) {
      line = lineWords.join(" ");
      while (line.length < width) {
        line = line + " ";
      }
    } else {
      let letterCount = 0;
      for (const word of lineWords) {
        letterCount = letterCount + word.length;
      }
      const gapCount = lineWords.length - 1;
      const spaceCount = width - letterCount;
      const evenShare = Math.floor(spaceCount / gapCount);
      let extra = spaceCount % gapCount;
      line = lineWords[0];
      for (let i = 1; i < lineWords.length; i++) {
        let gap = evenShare;
        if (extra > 0) {
          gap = gap + 1;
          extra = extra - 1;
        }
        line = line + " ".repeat(gap) + lineWords[i];
      }
    }
    lines.push(line);
  }
  return lines;
};`,
    senior: `const justify = (text, width) => {
  const lines = [];
  for (const word of text.split(/\\s+/).filter(Boolean)) {
    const line = lines.at(-1);
    if (line && line.join(" ").length + 1 + word.length <= width) line.push(word);
    else lines.push([word]);
  }
  return lines.map((line, index) => {
    if (index === lines.length - 1 || line.length === 1) return line.join(" ").padEnd(width);
    const gaps = line.length - 1;
    const spaces = width - line.join("").length;
    return line.reduce((out, word, i) => out + " ".repeat(Math.floor(spaces / gaps) + (i <= spaces % gaps ? 1 : 0)) + word);
  });
};`,
    hiddenTests: [
      { call: 'justify("Science is what we understand well enough to explain to a computer. Art is everything else we do", 20)', expected: ['Science  is  what we', 'understand      well', 'enough to explain to', 'a  computer.  Art is', 'everything  else  we', 'do                  '] },
      { call: 'justify("abc def", 7)', expected: ['abc def'] },
      { call: 'justify("one\\ntwo\\tthree", 9)', expected: ['one   two', 'three    '] },
      { call: 'justify("a b c", 1)', expected: ['a', 'b', 'c'] },
      { call: 'justify("ab cd ef gh", 6)', expected: ['ab  cd', 'ef gh '] },
      { call: 'justify("   ", 4)', expected: [] },
    ],
  },

  /* ── Hard: routes, settings and JSON ──────────────────────────────── */
  'js-mh-match-route': {
    solution: `// "/about/" and "/about" are the same page, but "/" keeps its one empty segment.
const segmentsOf = text => {
  const parts = text.split("/");
  if (parts.length > 1 && parts[parts.length - 1] === "") parts.pop();
  return parts;
};
// Lower is more specific: 0 for an exact segment, 1 for :name, 2 for *.
const rank = segment => (segment === "*" ? 2 : segment.startsWith(":") ? 1 : 0);

const matchRoute = (routes, path) => {
  const parts = segmentsOf(path);
  const tryRoute = route => {
    const pattern = segmentsOf(route);
    const wildcard = pattern[pattern.length - 1] === "*";
    const fixed = wildcard ? pattern.slice(0, -1) : pattern;
    // * needs at least one segment of its own; otherwise the lengths must agree.
    if (wildcard ? parts.length <= fixed.length : parts.length !== fixed.length) return null;
    const fits = fixed.every((segment, i) => (segment.startsWith(":") ? parts[i] !== "" : segment === parts[i]));
    if (!fits) return null;
    const params = {};
    fixed.forEach((segment, i) => {
      if (segment.startsWith(":")) params[segment.slice(1)] = parts[i];
    });
    if (wildcard) params.rest = parts.slice(fixed.length).join("/");
    return { route, params };
  };
  const moreSpecific = (a, b) => {
    const left = segmentsOf(a.route).map(rank);
    const right = segmentsOf(b.route).map(rank);
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      if (left[i] !== right[i]) return left[i] - right[i];
    }
    return 0; // equally specific: sort is stable, so the route listed first stays first
  };
  // map and filter build a new array, so routes itself is never sorted.
  const matches = routes.map(tryRoute).filter(match => match !== null);
  return matches.sort(moreSpecific)[0] ?? null;
};`,
    junior: `const splitPath = text => {
  const parts = text.split("/");
  if (parts.length > 1 && parts[parts.length - 1] === "") {
    parts.pop();
  }
  return parts;
};

const segmentRank = segment => {
  if (segment === "*") {
    return 2;
  }
  if (segment.startsWith(":")) {
    return 1;
  }
  return 0;
};

const matchRoute = (routes, path) => {
  const pathParts = splitPath(path);
  const matches = [];
  for (const route of routes) {
    const routeParts = splitPath(route);
    const last = routeParts[routeParts.length - 1];
    const hasRest = last === "*";
    let fixedParts = routeParts;
    if (hasRest) {
      fixedParts = routeParts.slice(0, routeParts.length - 1);
    }
    let lengthOk = pathParts.length === fixedParts.length;
    if (hasRest) {
      lengthOk = pathParts.length > fixedParts.length;
    }
    if (!lengthOk) {
      continue;
    }
    const allMatch = fixedParts.every((part, i) => {
      if (part.startsWith(":")) {
        return pathParts[i] !== "";
      }
      return part === pathParts[i];
    });
    if (!allMatch) {
      continue;
    }
    const params = {};
    for (let i = 0; i < fixedParts.length; i++) {
      if (fixedParts[i].startsWith(":")) {
        const name = fixedParts[i].slice(1);
        params[name] = pathParts[i];
      }
    }
    if (hasRest) {
      params.rest = pathParts.slice(fixedParts.length).join("/");
    }
    matches.push({ route: route, params: params });
  }
  if (matches.length === 0) {
    return null;
  }
  matches.sort((a, b) => {
    const aParts = splitPath(a.route);
    const bParts = splitPath(b.route);
    let shorter = aParts.length;
    if (bParts.length < shorter) {
      shorter = bParts.length;
    }
    for (let i = 0; i < shorter; i++) {
      const difference = segmentRank(aParts[i]) - segmentRank(bParts[i]);
      if (difference !== 0) {
        return difference;
      }
    }
    return 0;
  });
  return matches[0];
};`,
    senior: `const segmentsOf = text => (text.length > 1 && text.endsWith("/") ? text.slice(0, -1) : text).split("/");
const rankOf = segment => (segment === "*" ? 2 : segment[0] === ":" ? 1 : 0);

const matchRoute = (routes, path) => {
  const parts = segmentsOf(path);
  const candidates = [];
  for (const route of routes) {
    const pattern = segmentsOf(route);
    const hasRest = pattern.at(-1) === "*";
    const fixed = hasRest ? pattern.slice(0, -1) : pattern;
    const lengthFits = hasRest ? parts.length > fixed.length : parts.length === fixed.length;
    if (!lengthFits || !fixed.every((segment, i) => (segment[0] === ":" ? parts[i] !== "" : segment === parts[i]))) continue;
    const params = Object.fromEntries(fixed.flatMap((segment, i) => (segment[0] === ":" ? [[segment.slice(1), parts[i]]] : [])));
    if (hasRest) params.rest = parts.slice(fixed.length).join("/");
    candidates.push({ route, params, ranks: pattern.map(rankOf) });
  }
  candidates.sort((a, b) => {
    const i = a.ranks.findIndex((rank, k) => rank !== b.ranks[k]);
    return i === -1 || b.ranks[i] === undefined ? 0 : a.ranks[i] - b.ranks[i];
  });
  const [best] = candidates;
  return best ? { route: best.route, params: best.params } : null;
};`,
    hiddenTests: [
      { call: 'matchRoute(["/:section/new", "/posts/:id"], "/posts/new")', expected: { route: '/posts/:id', params: { id: 'new' } } },
      { call: 'matchRoute(["/items/:id", "/items/:slug"], "/items/9")', expected: { route: '/items/:id', params: { id: '9' } } },
      { call: '[matchRoute(["/docs/*"], "/docs"), matchRoute(["/docs/*"], "/docs/")]', expected: [null, null] },
      { call: '[matchRoute(["/", "/:page"], "/"), matchRoute(["/", "/:page"], "/pricing")]', expected: [{ route: '/', params: {} }, { route: '/:page', params: { page: 'pricing' } }] },
      { call: 'matchRoute(["/a/:b"], "/a/x/y")', expected: null },
      { call: 'matchRoute(["/:a/:b", "/shop/:b", "/shop/cart"], "/shop/cart")', expected: { route: '/shop/cart', params: {} } },
      { call: '(() => { const routes = ["/x/*", "/x/:id", "/x/y"]; matchRoute(routes, "/x/y"); return routes; })()', expected: ['/x/*', '/x/:id', '/x/y'] },
      { call: 'matchRoute(["/files/:dir/*"], "/files/img/a/b.png")', expected: { route: '/files/:dir/*', params: { dir: 'img', rest: 'a/b.png' } } },
    ],
  },
  'js-mh-settings-diff': {
    solution: `// typeof says "object" for null and arrays too; both are leaves here.
const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);
const sameLeaf = (a, b) =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((item, i) => item === b[i])
    : a === b;

const diffSettings = (before, after) => {
  const changes = [];
  const join = (prefix, key) => (prefix === "" ? key : prefix + "." + key);
  // Every leaf under value, reported with one kind of change.
  const everyLeaf = (value, path, change) => {
    if (!isObject(value)) {
      changes.push({ path, change });
      return;
    }
    for (const key in value) everyLeaf(value[key], join(path, key), change);
  };
  const walk = (a, b, prefix) => {
    for (const key in a) {
      const path = join(prefix, key);
      if (!Object.hasOwn(b, key)) everyLeaf(a[key], path, "removed");
      else if (isObject(a[key]) && isObject(b[key])) walk(a[key], b[key], path);
      else if (isObject(a[key]) || isObject(b[key])) {
        // An object on one side and a leaf on the other: both sides are reported.
        everyLeaf(a[key], path, "removed");
        everyLeaf(b[key], path, "added");
      } else if (!sameLeaf(a[key], b[key])) changes.push({ path, change: "changed" });
    }
    for (const key in b) {
      if (!Object.hasOwn(a, key)) everyLeaf(b[key], join(prefix, key), "added");
    }
  };
  walk(before, after, "");
  return changes.sort((x, y) => (x.path < y.path ? -1 : x.path > y.path ? 1 : 0));
};`,
    junior: `const isPlainObject = value => {
  if (value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return false;
  }
  return typeof value === "object";
};

const leavesEqual = (a, b) => {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }
  return a === b;
};

const diffSettings = (before, after) => {
  const changes = [];
  const pathFor = (prefix, key) => {
    if (prefix === "") {
      return key;
    }
    return prefix + "." + key;
  };
  const reportAll = (value, path, change) => {
    if (isPlainObject(value)) {
      for (const key in value) {
        reportAll(value[key], pathFor(path, key), change);
      }
    } else {
      changes.push({ path: path, change: change });
    }
  };
  const compare = (a, b, prefix) => {
    for (const key in a) {
      const path = pathFor(prefix, key);
      const inB = Object.prototype.hasOwnProperty.call(b, key);
      if (!inB) {
        reportAll(a[key], path, "removed");
        continue;
      }
      const aIsObject = isPlainObject(a[key]);
      const bIsObject = isPlainObject(b[key]);
      if (aIsObject && bIsObject) {
        compare(a[key], b[key], path);
      } else if (aIsObject || bIsObject) {
        reportAll(a[key], path, "removed");
        reportAll(b[key], path, "added");
      } else if (!leavesEqual(a[key], b[key])) {
        changes.push({ path: path, change: "changed" });
      }
    }
    for (const key in b) {
      const inA = Object.prototype.hasOwnProperty.call(a, key);
      if (!inA) {
        reportAll(b[key], pathFor(prefix, key), "added");
      }
    }
  };
  compare(before, after, "");
  changes.sort((x, y) => {
    if (x.path < y.path) {
      return -1;
    }
    if (x.path > y.path) {
      return 1;
    }
    return 0;
  });
  return changes;
};`,
    senior: `const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);

const leaves = (value, prefix = "", out = new Map()) => {
  for (const key in value) {
    const path = prefix ? \`\${prefix}.\${key}\` : key;
    if (isObject(value[key])) leaves(value[key], path, out);
    else out.set(path, value[key]);
  }
  return out;
};

const sameLeaf = (a, b) =>
  Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((item, i) => item === b[i]) : a === b;

const diffSettings = (before, after) => {
  const old = leaves(before);
  const next = leaves(after);
  const changes = [];
  for (const [path, value] of old) {
    if (!next.has(path)) changes.push({ path, change: "removed" });
    else if (!sameLeaf(value, next.get(path))) changes.push({ path, change: "changed" });
  }
  for (const path of next.keys()) if (!old.has(path)) changes.push({ path, change: "added" });
  return changes.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
};`,
    hiddenTests: [
      { call: 'diffSettings({ proxy: { host: "x", port: 1 } }, { proxy: null })', expected: [{ path: 'proxy', change: 'added' }, { path: 'proxy.host', change: 'removed' }, { path: 'proxy.port', change: 'removed' }] },
      { call: 'diffSettings({ cache: false }, { cache: { size: 10 } })', expected: [{ path: 'cache', change: 'removed' }, { path: 'cache.size', change: 'added' }] },
      { call: 'diffSettings({ list: [1, 2], mixed: [1, "1"] }, { list: [1, 2, 3], mixed: [1, 1] })', expected: [{ path: 'list', change: 'changed' }, { path: 'mixed', change: 'changed' }] },
      { call: 'diffSettings({ a: { b: { c: { d: 1 } } } }, { a: { b: { c: { d: 1, e: 2 } } } })', expected: [{ path: 'a.b.c.e', change: 'added' }] },
      { call: 'diffSettings({ gone: {}, stay: 1 }, { stay: 1, fresh: {} })', expected: [] },
      { call: 'diffSettings({ ui: { dark: true, size: "m" }, beta: false }, { ui: { dark: true, size: "l", font: null }, beta: false, lang: "en" })', expected: [{ path: 'lang', change: 'added' }, { path: 'ui.font', change: 'added' }, { path: 'ui.size', change: 'changed' }] },
    ],
  },
  'js-mh-safe-stringify': {
    solution: `const safeStringify = value => {
  // The objects on the path from the root to where we are now. A child that
  // is already on the path points back up: that is the loop.
  const path = new Set();
  const copy = current => {
    if (current === null || typeof current !== "object") return current;
    if (path.has(current)) return "[Circular]";
    path.add(current);
    const result = Array.isArray(current)
      ? current.map(child => copy(child))
      : Object.fromEntries(Object.entries(current).map(([key, child]) => [key, copy(child)]));
    path.delete(current); // leaving it: a later sibling may use the same object freely
    return result;
  };
  return JSON.stringify(copy(value));
};`,
    junior: `const safeStringify = value => {
  const ancestors = [];
  const copy = current => {
    if (current === null) {
      return null;
    }
    if (typeof current !== "object") {
      return current;
    }
    if (ancestors.includes(current)) {
      return "[Circular]";
    }
    ancestors.push(current);
    let result;
    if (Array.isArray(current)) {
      result = [];
      for (const item of current) {
        result.push(copy(item));
      }
    } else {
      result = {};
      for (const key of Object.keys(current)) {
        result[key] = copy(current[key]);
      }
    }
    ancestors.pop();
    return result;
  };
  return JSON.stringify(copy(value));
};`,
    senior: `const safeStringify = value => {
  const ancestors = [];
  return JSON.stringify(value, function (key, current) {
    if (typeof current !== "object" || current === null) return current;
    // this is the object that holds current: drop every ancestor below it.
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) ancestors.pop();
    if (ancestors.includes(current)) return "[Circular]";
    ancestors.push(current);
    return current;
  });
};`,
    hiddenTests: [
      { call: '(() => { const a = { name: "a" }; const b = { name: "b", back: a }; a.next = b; return safeStringify({ start: a }); })()', expected: '{"start":{"name":"a","next":{"name":"b","back":"[Circular]"}}}' },
      { call: '(() => { const tag = { id: 1 }; return safeStringify([tag, tag, [tag]]); })()', expected: '[{"id":1},{"id":1},[{"id":1}]]' },
      { call: '(() => { const shared = { v: 1 }; return safeStringify({ first: { inner: shared }, second: shared }); })()', expected: '{"first":{"inner":{"v":1}},"second":{"v":1}}' },
      { call: '(() => { const ada = { name: "Ada", friends: [] }; const ben = { name: "Ben", friends: [ada] }; ada.friends.push(ben); return safeStringify([ada, ben]); })()', expected: '[{"name":"Ada","friends":[{"name":"Ben","friends":["[Circular]"]}]},{"name":"Ben","friends":[{"name":"Ada","friends":["[Circular]"]}]}]' },
      { call: '(() => { const node = { id: 1 }; node.self = node; safeStringify(node); return node.self === node; })()', expected: true },
      { call: '[safeStringify(null), safeStringify(42), safeStringify([])]', expected: ['null', '42', '[]'] },
    ],
  },

  /* ── Hard: promises that share work ───────────────────────────────── */
  'js-mh-batch-loader': {
    solution: `const createLoader = (loadMany, waitMs) => {
  // The batch being gathered, id -> callers waiting for it; null between batches.
  let gathering = null;
  const send = async batch => {
    const ids = [...batch.keys()]; // a Map keeps the order ids were first asked for
    try {
      const results = await loadMany(ids);
      ids.forEach((id, index) => {
        for (const { resolve } of batch.get(id)) resolve(results[index]);
      });
    } catch (error) {
      for (const waiting of batch.values()) {
        for (const { reject } of waiting) reject(error);
      }
    }
  };
  return id => new Promise((resolve, reject) => {
    if (gathering === null) {
      const batch = new Map();
      gathering = batch;
      setTimeout(() => {
        gathering = null; // a load from now on starts a new batch
        send(batch);
      }, waitMs);
    }
    if (!gathering.has(id)) gathering.set(id, []);
    gathering.get(id).push({ resolve, reject });
  });
};`,
    junior: `const createLoader = (loadMany, waitMs) => {
  let currentBatch = null;
  const load = id => {
    return new Promise((resolve, reject) => {
      if (currentBatch === null) {
        const batch = { ids: [], waiting: new Map() };
        currentBatch = batch;
        setTimeout(async () => {
          currentBatch = null;
          try {
            const results = await loadMany(batch.ids);
            for (let i = 0; i < batch.ids.length; i++) {
              const callers = batch.waiting.get(batch.ids[i]);
              for (const caller of callers) {
                caller.resolve(results[i]);
              }
            }
          } catch (error) {
            for (const id of batch.ids) {
              const callers = batch.waiting.get(id);
              for (const caller of callers) {
                caller.reject(error);
              }
            }
          }
        }, waitMs);
      }
      if (!currentBatch.waiting.has(id)) {
        currentBatch.ids.push(id);
        currentBatch.waiting.set(id, []);
      }
      currentBatch.waiting.get(id).push({ resolve: resolve, reject: reject });
    });
  };
  return load;
};`,
    senior: `const createLoader = (loadMany, waitMs) => {
  let batch = null;
  return id => {
    if (batch === null) {
      const current = { promises: new Map() };
      current.results = new Promise(done => setTimeout(done, waitMs)).then(() => {
        batch = null;
        return loadMany([...current.promises.keys()]);
      });
      batch = current;
    }
    if (!batch.promises.has(id)) {
      const index = batch.promises.size; // one shared promise per id, picking its own result
      batch.promises.set(id, batch.results.then(results => results[index]));
    }
    return batch.promises.get(id);
  };
};`,
    hiddenTests: [
      { call: '(async () => { const calls = []; const load = createLoader(async ids => { calls.push(ids); return ids.map(id => -id); }, 10); const values = await Promise.all([load(3), load(1), load(3), load(2)]); return [values, calls]; })()', expected: [[-3, -1, -3, -2], [[3, 1, 2]]], async: true },
      { call: '(async () => { const calls = []; const a = createLoader(async ids => { calls.push("a:" + ids.join()); return ids; }, 10); const b = createLoader(async ids => { calls.push("b:" + ids.join()); return ids; }, 10); await Promise.all([a(1), b(2), a(3)]); return calls.sort(); })()', expected: ['a:1,3', 'b:2'], async: true },
      { call: '(async () => { let fail = true; const load = createLoader(async ids => { if (fail) { fail = false; throw new Error("once"); } return ids.map(id => id + "!"); }, 10); const first = await load("x").catch(error => error.message); const second = await load("x"); return [first, second]; })()', expected: ['once', 'x!'], async: true },
      { call: '(async () => { const load = createLoader(async ids => ids.map(id => (id === "zero" ? 0 : null)), 5); return Promise.all([load("zero"), load("none")]); })()', expected: [0, null], async: true },
      { call: '(async () => { const calls = []; const load = createLoader(async ids => { calls.push(ids.length); return ids; }, 10); const wait = ms => new Promise(done => setTimeout(done, ms)); const all = [load(1), load(2)]; await wait(30); all.push(load(3)); await wait(30); all.push(load(4), load(5), load(4)); await Promise.all(all); return calls; })()', expected: [2, 1, 2], async: true },
      { call: '(async () => { const calls = []; const load = createLoader(ids => { calls.push(ids); return new Promise(done => setTimeout(() => done(ids.map(String)), 50)); }, 5); const first = load(1); await new Promise(done => setTimeout(done, 20)); const second = load(2); return [await first, await second, calls]; })()', expected: ['1', '2', [[1], [2]]], async: true },
    ],
  },
  'js-mh-shared-request': {
    solution: `const shareRequests = (fetchRate, ttlMs, now) => {
  const entries = new Map(); // key -> { promise, at }
  return key => {
    const stored = entries.get(key);
    // The promise exists from the moment the request starts, so a second
    // caller shares it before any answer has arrived.
    if (stored && now() - stored.at < ttlMs) return stored.promise;
    const entry = { promise: fetchRate(key), at: now() };
    entries.set(key, entry);
    entry.promise.catch(() => {
      // Forget a failure, but only this one: a newer request for the same key
      // may have replaced it while it was in flight.
      if (entries.get(key) === entry) entries.delete(key);
    });
    return entry.promise;
  };
};`,
    junior: `const shareRequests = (fetchRate, ttlMs, now) => {
  const cache = new Map();
  const get = key => {
    if (cache.has(key)) {
      const saved = cache.get(key);
      const age = now() - saved.at;
      if (age < ttlMs) {
        return saved.promise;
      }
    }
    const promise = fetchRate(key);
    const entry = { promise: promise, at: now() };
    cache.set(key, entry);
    promise.catch(() => {
      const current = cache.get(key);
      if (current === entry) {
        cache.delete(key);
      }
    });
    return promise;
  };
  return get;
};`,
    senior: `const shareRequests = (fetchRate, ttlMs, now) => {
  const entries = new Map();
  const isFresh = entry => entry !== undefined && now() - entry.at < ttlMs;
  return key => {
    const stored = entries.get(key);
    if (isFresh(stored)) return stored.promise;
    const entry = { promise: Promise.resolve(fetchRate(key)), at: now() };
    entries.set(key, entry);
    entry.promise.catch(() => {
      if (entries.get(key) === entry) entries.delete(key);
    });
    return entry.promise;
  };
};`,
    hiddenTests: [
      { call: '(async () => { let time = 0; let calls = 0; const get = shareRequests(() => { calls++; const mine = calls; return new Promise((done, fail) => setTimeout(() => (mine === 1 ? fail(new Error("slow failure")) : done("fresh")), mine === 1 ? 50 : 10)); }, 20, () => time); const first = get("k").catch(error => error.message); time = 30; const second = get("k"); const firstResult = await first; const third = get("k"); return [firstResult, await second, await third, calls]; })()', expected: ['slow failure', 'fresh', 'fresh', 2], async: true },
      { call: '(async () => { let time = 0; let calls = 0; const get = shareRequests(async () => ++calls, 100, () => time); const first = get("k"); time = 150; const second = get("k"); return [await first, await second]; })()', expected: [1, 2], async: true },
      { call: '(async () => { let time = 0; const seen = []; const get = shareRequests(async key => { seen.push(key); return key; }, 50, () => time); await get("a"); time = 40; await get("b"); time = 60; await get("a"); await get("b"); return seen; })()', expected: ['a', 'b', 'a'], async: true },
      { call: '(async () => { let calls = 0; const fetchRate = async key => { calls++; return key; }; const one = shareRequests(fetchRate, 1000, () => 0); const two = shareRequests(fetchRate, 1000, () => 0); await Promise.all([one("x"), two("x")]); return calls; })()', expected: 2, async: true },
      { call: '(async () => { let calls = 0; const get = shareRequests(async () => { calls++; return 0; }, 1000, () => 0); await get("z"); const again = await get("z"); return [again, calls]; })()', expected: [0, 1], async: true },
    ],
  },
};
