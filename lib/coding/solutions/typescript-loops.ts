// Server-only reference solutions and hidden tests for lib/coding/tasks/typescript-loops.ts.
// Never import from client code.

import type { CodingSolution } from '../types';

export const TYPESCRIPT_LOOP_SOLUTIONS: Record<string, CodingSolution> = {
  "ts-inferred-total": {
    solution: `const totalLength = (words: string[]): number => {
  let total = 0;
  for (const word of words) total += word.length;
  return total;
};`,
    junior: `const totalLength = (words: string[]): number => {
  let total = 0;
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const wordLength = word.length;
    total = total + wordLength;
  }
  return total;
};`,
    senior: `const totalLength = (words: string[]): number => words.reduce((total, word) => total + word.length, 0);`,
    hiddenTests: [
      { call: "totalLength([\"ab\", \"cde\", \"f\"])", expected: 6 },
      { call: "totalLength([\"   \"])", expected: 3 },
    ],
  },
  "ts-take-turns": {
    solution: `const takeTurns = (waiting: string[], turns: number): string[] => {
  const queue = [...waiting];
  const served: string[] = [];
  while (served.length < turns) {
    const next = queue.shift();
    if (next === undefined) break;
    served.push(next);
    queue.push(next);
  }
  return served;
};`,
    junior: `const takeTurns = (waiting: string[], turns: number): string[] => {
  const served: string[] = [];
  if (waiting.length === 0) {
    return served;
  }
  let position = 0;
  for (let turn = 0; turn < turns; turn += 1) {
    served.push(waiting[position]);
    position = position + 1;
    if (position === waiting.length) {
      position = 0;
    }
  }
  return served;
};`,
    senior: `const takeTurns = (waiting: string[], turns: number): string[] => {
  if (waiting.length === 0) return [];
  // Turn n goes to person n modulo the group size, so no queue has to be rotated.
  return Array.from({ length: turns }, (_, turn) => waiting[turn % waiting.length]);
};`,
    hiddenTests: [
      { call: "(() => { const waiting = [\"ada\", \"bo\"]; takeTurns(waiting, 3); return waiting; })()", expected: ["ada", "bo"] },
      { call: "takeTurns([\"a\", \"b\", \"c\"], 7)", expected: ["a", "b", "c", "a", "b", "c", "a"] },
    ],
  },
  "ts-pad-a-readonly-list": {
    solution: `const padScores = (scores: readonly number[], size: number): number[] => {
  const padded = [...scores];
  while (padded.length < size) padded.push(0);
  return padded;
};`,
    junior: `const padScores = (scores: readonly number[], size: number): number[] => {
  const padded: number[] = [];
  for (const score of scores) {
    padded.push(score);
  }
  for (let i = padded.length; i < size; i += 1) {
    padded.push(0);
  }
  return padded;
};`,
    senior: `const padScores = (scores: readonly number[], size: number): number[] => {
  // Clamp at zero so a list already longer than size is copied unchanged.
  const missing = Math.max(0, size - scores.length);
  return scores.concat(Array.from({ length: missing }, () => 0));
};`,
    hiddenTests: [
      { call: "(() => { const scores = [1, 2]; padScores(scores, 4); return scores; })()", expected: [1, 2] },
      { call: "padScores([5, 5], 2)", expected: [5, 5] },
    ],
  },
  "ts-lowest-and-highest": {
    solution: `const minMax = (values: number[]): [number, number] => {
  if (values.length === 0) return [0, 0];
  let low = values[0];
  let high = values[0];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] < low) low = values[i];
    if (values[i] > high) high = values[i];
  }
  return [low, high];
};`,
    junior: `const minMax = (values: number[]): [number, number] => {
  if (values.length === 0) {
    return [0, 0];
  }
  const sorted: number[] = [];
  for (const value of values) {
    sorted.push(value);
  }
  sorted.sort((a, b) => a - b);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  return [lowest, highest];
};`,
    senior: `const minMax = (values: number[]): [number, number] => {
  if (values.length === 0) return [0, 0];
  // One pass rather than Math.min(...values), which spreads the whole list onto the call stack.
  return values.reduce<[number, number]>(([low, high], value) => [Math.min(low, value), Math.max(high, value)], [values[0], values[0]]);
};`,
    hiddenTests: [
      { call: "minMax([0, 0, 0])", expected: [0, 0] },
      { call: "minMax([2, 9, -4, 7])", expected: [-4, 9] },
    ],
  },
  "ts-total-expenses": {
    solution: `interface Expenses {
  rent: number;
  food: number;
  travel: number;
}

const totalExpenses = (expenses: Expenses): number => {
  let total = 0;
  for (const key in expenses) total += expenses[key as keyof Expenses];
  return total;
};`,
    junior: `interface Expenses {
  rent: number;
  food: number;
  travel: number;
}

const totalExpenses = (expenses: Expenses): number => {
  const rent = expenses.rent;
  const food = expenses.food;
  const travel = expenses.travel;
  return rent + food + travel;
};`,
    senior: `interface Expenses {
  rent: number;
  food: number;
  travel: number;
}

// Object.values is typed number[] here, so a new expense line is counted without touching this function.
const totalExpenses = (expenses: Expenses): number => Object.values(expenses).reduce((total, amount) => total + amount, 0);`,
    hiddenTests: [
      { call: "totalExpenses({ rent: 10, food: 20, travel: 30 })", expected: 60 },
      { call: "totalExpenses({ rent: -5, food: 5, travel: 0 })", expected: 0 },
    ],
  },
  "ts-path-length": {
    solution: `type Point = { x: number; y: number };

const pathLength = (points: Point[]): number => {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
};`,
    junior: `type Point = { x: number; y: number };

const pathLength = (points: Point[]): number => {
  let total = 0;
  let previous: Point | null = null;
  for (const point of points) {
    if (previous !== null) {
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      total = total + distance;
    }
    previous = point;
  }
  return total;
};`,
    senior: `type Point = { x: number; y: number };

// slice(1) shifts every index by one, so points[index] is the previous point of each step.
const pathLength = (points: Point[]): number =>
  points.slice(1).reduce((total, point, index) => total + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);`,
    hiddenTests: [
      { call: "pathLength([{ x: 0, y: 0 }, { x: 6, y: 8 }, { x: 6, y: 8 }])", expected: 10 },
      { call: "pathLength([{ x: 0, y: 0 }, { x: 0, y: 5 }, { x: 0, y: 0 }])", expected: 10 },
    ],
  },
  "ts-mixed-total": {
    solution: `const mixedTotal = (values: (string | number)[]): number => {
  let total = 0;
  for (const value of values) total += typeof value === "string" ? value.length : value;
  return total;
};`,
    junior: `const mixedTotal = (values: (string | number)[]): number => {
  let total = 0;
  for (const value of values) {
    if (typeof value === "string") {
      total = total + value.length;
    } else {
      total = total + value;
    }
  }
  return total;
};`,
    senior: `const mixedTotal = (values: (string | number)[]): number =>
  values.reduce<number>((total, value) => total + (typeof value === "number" ? value : value.length), 0);`,
    hiddenTests: [
      { call: "mixedTotal([10, \"\", 5])", expected: 15 },
      { call: "mixedTotal([\"abcd\"])", expected: 4 },
    ],
  },
  "ts-only-the-files": {
    solution: `interface FileEntry {
  kind: "file";
  name: string;
  size: number;
}

interface FolderEntry {
  kind: "folder";
  name: string;
}

type Entry = FileEntry | FolderEntry;

const isFile = (entry: Entry): entry is FileEntry => entry.kind === "file";

const onlyFiles = (entries: Entry[]): FileEntry[] => entries.filter(isFile);`,
    junior: `interface FileEntry {
  kind: "file";
  name: string;
  size: number;
}

interface FolderEntry {
  kind: "folder";
  name: string;
}

type Entry = FileEntry | FolderEntry;

const isFile = (entry: Entry): entry is FileEntry => {
  if (entry.kind === "file") {
    return true;
  }
  return false;
};

const onlyFiles = (entries: Entry[]): FileEntry[] => {
  const files: FileEntry[] = [];
  for (const entry of entries) {
    if (isFile(entry)) {
      files.push(entry);
    }
  }
  return files;
};`,
    senior: `interface FileEntry {
  kind: "file";
  name: string;
  size: number;
}

interface FolderEntry {
  kind: "folder";
  name: string;
}

type Entry = FileEntry | FolderEntry;

const isFile = (entry: Entry): entry is FileEntry => entry.kind === "file";

// flatMap acts as a typed filter: the guard narrows entry, and an empty array drops a folder.
const onlyFiles = (entries: Entry[]): FileEntry[] => entries.flatMap((entry) => (isFile(entry) ? [entry] : []));`,
    hiddenTests: [
      {
        call: "onlyFiles([{ kind: \"file\", name: \"a\", size: 1 }, { kind: \"file\", name: \"b\", size: 2 }])",
        expected: [{ kind: "file", name: "a", size: 1 }, { kind: "file", name: "b", size: 2 }],
      },
      { call: "onlyFiles([{ kind: \"folder\", name: \"x\" }, { kind: \"folder\", name: \"y\" }])", expected: [] },
    ],
    hiddenTypeTests: [
      { code: "const __only: FileEntry[] = [{ kind: \"file\", name: \"a\", size: 1 } as Entry].filter(isFile);" },
      { code: "const __name: string = onlyFiles([])[0].name;" },
    ],
  },
  "ts-count-a-status": {
    solution: `enum Status {
  Todo = "todo",
  Doing = "doing",
  Done = "done",
}

const countStatus = (items: Status[], wanted: Status): number =>
  items.reduce((count, item) => (item === wanted ? count + 1 : count), 0);`,
    junior: `enum Status {
  Todo = "todo",
  Doing = "doing",
  Done = "done",
}

const countStatus = (items: Status[], wanted: Status): number => {
  let count = 0;
  for (const item of items) {
    if (item === wanted) {
      count = count + 1;
    }
  }
  return count;
};`,
    senior: `enum Status {
  Todo = "todo",
  Doing = "doing",
  Done = "done",
}

const countStatus = (items: Status[], wanted: Status): number => items.filter((item) => item === wanted).length;`,
    hiddenTests: [
      { call: "countStatus([Status.Todo, Status.Done, Status.Todo, Status.Todo], Status.Todo)", expected: 3 },
      { call: "countStatus([Status.Done], Status.Doing)", expected: 0 },
    ],
  },
  "ts-chunk-a-list": {
    solution: `const chunk = <T>(items: T[], size: number): T[][] => {
  const groups: T[][] = [];
  for (let start = 0; start < items.length; start += size) groups.push(items.slice(start, start + size));
  return groups;
};`,
    junior: `const chunk = <T>(items: T[], size: number): T[][] => {
  const groups: T[][] = [];
  let current: T[] = [];
  for (const item of items) {
    current.push(item);
    if (current.length === size) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) {
    groups.push(current);
  }
  return groups;
};`,
    senior: `const chunk = <T>(items: T[], size: number): T[][] =>
  // The group count is known up front, so each group is one slice at its own offset.
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));`,
    hiddenTests: [
      { call: "chunk([1, 2, 3, 4, 5, 6], 3)", expected: [[1, 2, 3], [4, 5, 6]] },
      { call: "chunk([1, 2, 3, 4, 5, 6, 7], 3)", expected: [[1, 2, 3], [4, 5, 6], [7]] },
    ],
  },
  "ts-zip-two-lists": {
    solution: `const zip = <A, B>(left: A[], right: B[]): [A, B][] => {
  const pairs: [A, B][] = [];
  const count = Math.min(left.length, right.length);
  for (let i = 0; i < count; i += 1) pairs.push([left[i], right[i]]);
  return pairs;
};`,
    junior: `const zip = <A, B>(left: A[], right: B[]): [A, B][] => {
  const pairs: [A, B][] = [];
  let i = 0;
  while (i < left.length && i < right.length) {
    const pair: [A, B] = [left[i], right[i]];
    pairs.push(pair);
    i = i + 1;
  }
  return pairs;
};`,
    senior: `// Slicing left to right's length stops at the shorter list, so no index runs off the end.
const zip = <A, B>(left: A[], right: B[]): [A, B][] => left.slice(0, right.length).map((item, index): [A, B] => [item, right[index]]);`,
    hiddenTests: [
      { call: "zip([1, 2, 3], [\"a\", \"b\", \"c\"])", expected: [[1, "a"], [2, "b"], [3, "c"]] },
      { call: "zip([], [])", expected: [] },
    ],
  },
  "ts-group-by-key": {
    solution: `const groupBy = <T, K extends PropertyKey>(items: T[], keyOf: (item: T) => K): Record<K, T[]> => {
  const groups = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyOf(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
};`,
    junior: `const groupBy = <T, K extends PropertyKey>(items: T[], keyOf: (item: T) => K): Record<K, T[]> => {
  const groups = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyOf(item);
    if (key in groups) {
      groups[key].push(item);
    } else {
      groups[key] = [item];
    }
  }
  return groups;
};`,
    senior: `const groupBy = <T, K extends PropertyKey>(items: T[], keyOf: (item: T) => K): Record<K, T[]> =>
  items.reduce((groups, item) => {
    const key = keyOf(item);
    // ??= creates the group on first sight and reuses it after, in one expression.
    (groups[key] ??= []).push(item);
    return groups;
  }, {} as Record<K, T[]>);`,
    hiddenTests: [
      { call: "groupBy([\"aa\", \"b\", \"cc\"], w => w.length)", expected: { 1: ["b"], 2: ["aa", "cc"] } },
      { call: "groupBy([1, 2, 3], () => \"all\")", expected: { all: [1, 2, 3] } },
    ],
  },
  "ts-write-reduce": {
    solution: `const myReduce = <T, U>(items: T[], step: (acc: U, item: T) => U, initial: U): U => {
  let acc = initial;
  for (let i = 0; i < items.length; i += 1) acc = step(acc, items[i]);
  return acc;
};`,
    junior: `const myReduce = <T, U>(items: T[], step: (acc: U, item: T) => U, initial: U): U => {
  let result = initial;
  for (const item of items) {
    const next = step(result, item);
    result = next;
  }
  return result;
};`,
    senior: `const myReduce = <T, U>(items: T[], step: (acc: U, item: T) => U, initial: U): U => {
  if (items.length === 0) return initial;
  // A fold is recursive by nature: combine the head, then fold the rest with the new accumulator.
  const [head, ...rest] = items;
  return myReduce(rest, step, step(initial, head));
};`,
    hiddenTests: [
      { call: "myReduce([1, 2, 3, 4], (acc, n) => Math.max(acc, n), 0)", expected: 4 },
      { call: "myReduce([\"x\", \"y\"], (acc, s) => acc + s.length, 0)", expected: 2 },
    ],
  },
  "ts-pluck-all": {
    solution: `const pluckAll = <T, K extends keyof T>(items: T[], keys: K[]): T[K][][] =>
  items.map(item => keys.map(key => item[key]));`,
    junior: `const pluckAll = <T, K extends keyof T>(items: T[], keys: K[]): T[K][][] => {
  const rows: T[K][][] = [];
  for (const item of items) {
    const row: T[K][] = [];
    for (const key of keys) {
      row.push(item[key]);
    }
    rows.push(row);
  }
  return rows;
};`,
    senior: `const pluckAll = <T, K extends keyof T>(items: T[], keys: K[]): T[K][][] => {
  // Naming the row builder keeps the nested map readable and states the T[K][] row type once.
  const row = (item: T): T[K][] => keys.map((key) => item[key]);
  return items.map(row);
};`,
    hiddenTests: [
      { call: "pluckAll([{ a: 1, b: 2, c: 3 }], [\"a\", \"c\"])", expected: [[1, 3]] },
      { call: "pluckAll([{ a: 1 }, { a: 2 }, { a: 3 }], [\"a\"])", expected: [[1], [2], [3]] },
    ],
  },
  "ts-apply-patches-in-order": {
    solution: `interface Profile {
  name: string;
  age: number;
  city: string;
}

const applyPatches = (profile: Profile, patches: Partial<Profile>[]): Profile => {
  let current = profile;
  for (const patch of patches) current = { ...current, ...patch };
  return current;
};`,
    junior: `interface Profile {
  name: string;
  age: number;
  city: string;
}

const applyPatches = (profile: Profile, patches: Partial<Profile>[]): Profile => {
  const current: Profile = { name: profile.name, age: profile.age, city: profile.city };
  for (const patch of patches) {
    if (patch.name !== undefined) {
      current.name = patch.name;
    }
    if (patch.age !== undefined) {
      current.age = patch.age;
    }
    if (patch.city !== undefined) {
      current.city = patch.city;
    }
  }
  return current;
};`,
    senior: `interface Profile {
  name: string;
  age: number;
  city: string;
}

// Each patch spreads over the result of the one before it, so later patches win.
const applyPatches = (profile: Profile, patches: Partial<Profile>[]): Profile =>
  patches.reduce<Profile>((current, patch) => ({ ...current, ...patch }), profile);`,
    hiddenTests: [
      {
        call: "(() => { const profile = { name: \"Ada\", age: 36, city: \"London\" }; applyPatches(profile, [{ age: 1 }]); return profile.age; })()",
        expected: 36,
      },
      {
        call: "applyPatches({ name: \"Ada\", age: 36, city: \"London\" }, [{ name: \"Bo\" }, { age: 9 }, { city: \"Oslo\" }])",
        expected: { name: "Bo", age: 9, city: "Oslo" },
      },
    ],
  },
  "ts-score-by-player": {
    solution: `interface Round {
  player: string;
  points: number;
}

const scoreByPlayer = (rounds: Round[]): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const round of rounds) totals[round.player] = (totals[round.player] ?? 0) + round.points;
  return totals;
};`,
    junior: `interface Round {
  player: string;
  points: number;
}

const scoreByPlayer = (rounds: Round[]): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const round of rounds) {
    const player = round.player;
    if (totals[player] === undefined) {
      totals[player] = round.points;
    } else {
      totals[player] = totals[player] + round.points;
    }
  }
  return totals;
};`,
    senior: `interface Round {
  player: string;
  points: number;
}

const scoreByPlayer = (rounds: Round[]): Record<string, number> =>
  rounds.reduce<Record<string, number>>((totals, { player, points }) => {
    totals[player] = (totals[player] ?? 0) + points;
    return totals;
  }, {});`,
    hiddenTests: [
      {
        call: "scoreByPlayer([{ player: \"a\", points: 1 }, { player: \"b\", points: 2 }, { player: \"a\", points: 3 }, { player: \"b\", points: 4 }])",
        expected: { a: 4, b: 6 },
      },
      { call: "scoreByPlayer([{ player: \"solo\", points: 2.5 }])", expected: { solo: 2.5 } },
    ],
  },
  "ts-freeze-a-copy": {
    solution: `type Frozen<T> = { readonly [K in keyof T]: T[K] };

const freezeCopy = <T extends object>(source: T): Frozen<T> => {
  const copy = {} as { [K in keyof T]: T[K] };
  for (const [key, value] of Object.entries(source)) copy[key as keyof T] = value;
  return Object.freeze(copy);
};`,
    junior: `type Frozen<T> = { readonly [K in keyof T]: T[K] };

const freezeCopy = <T extends object>(source: T): Frozen<T> => {
  const copy = {} as { [K in keyof T]: T[K] };
  const keys = Object.keys(source) as (keyof T)[];
  for (const key of keys) {
    const value = source[key];
    copy[key] = value;
  }
  Object.freeze(copy);
  return copy;
};`,
    senior: `type Frozen<T> = { readonly [K in keyof T]: T[K] };

// A shallow spread copies the own enumerable keys, so the caller's object is never the one frozen.
const freezeCopy = <T extends object>(source: T): Frozen<T> => Object.freeze({ ...source });`,
    hiddenTests: [
      { call: "Object.isFrozen(freezeCopy({}))", expected: true },
      { call: "freezeCopy({ x: 1, y: 2, z: 3 })", expected: { x: 1, y: 2, z: 3 } },
    ],
    hiddenTypeTests: [
      { code: "const __b: string = freezeCopy({ a: 1, b: \"x\" }).b;" },
      { code: "freezeCopy({ a: 1 }).b;", rejects: true },
    ],
  },
  "ts-values-of-a-type": {
    solution: `type TypeName = "string" | "number" | "boolean";

type OfType<N extends TypeName> = N extends "string" ? string : N extends "number" ? number : boolean;

const ofType = <N extends TypeName>(values: unknown[], name: N): OfType<N>[] =>
  values.filter((value): value is OfType<N> => typeof value === name);`,
    junior: `type TypeName = "string" | "number" | "boolean";

type OfType<N extends TypeName> = N extends "string" ? string : N extends "number" ? number : boolean;

const ofType = <N extends TypeName>(values: unknown[], name: N): OfType<N>[] => {
  const found: OfType<N>[] = [];
  for (const value of values) {
    if (typeof value === name) {
      found.push(value as OfType<N>);
    }
  }
  return found;
};`,
    senior: `type TypeName = "string" | "number" | "boolean";

type OfType<N extends TypeName> = N extends "string" ? string : N extends "number" ? number : boolean;

// A guard factory: hasType("number") is a reusable predicate typed for that one name.
const hasType = <N extends TypeName>(name: N) => (value: unknown): value is OfType<N> => typeof value === name;

const ofType = <N extends TypeName>(values: unknown[], name: N): OfType<N>[] => values.filter(hasType(name));`,
    hiddenTests: [
      { call: "ofType([1, 2, 3], \"boolean\")", expected: [] },
      { call: "ofType([\"a\", true, \"b\"], \"string\")", expected: ["a", "b"] },
    ],
    hiddenTypeTests: [
      { code: "const __flags: boolean[] = ofType([true], \"boolean\");" },
    ],
  },
  "ts-memoized-run": {
    solution: `type Output<F> = F extends (arg: number) => infer R ? R : never;

const runMemoized = <F extends (arg: number) => unknown>(fn: F, inputs: number[]): Output<F>[] => {
  const cache = new Map<number, Output<F>>();
  const results: Output<F>[] = [];
  for (const input of inputs) {
    if (!cache.has(input)) cache.set(input, fn(input) as Output<F>);
    results.push(cache.get(input) as Output<F>);
  }
  return results;
};`,
    junior: `type Output<F> = F extends (arg: number) => infer R ? R : never;

const runMemoized = <F extends (arg: number) => unknown>(fn: F, inputs: number[]): Output<F>[] => {
  const cache: { [input: number]: Output<F> } = {};
  const results: Output<F>[] = [];
  for (const input of inputs) {
    if (!(input in cache)) {
      const output = fn(input) as Output<F>;
      cache[input] = output;
    }
    results.push(cache[input]);
  }
  return results;
};`,
    senior: `type Output<F> = F extends (arg: number) => infer R ? R : never;

const runMemoized = <F extends (arg: number) => unknown>(fn: F, inputs: number[]): Output<F>[] => {
  const cache = new Map<number, Output<F>>();
  return inputs.map((input) => {
    // has() rather than get() ?? ..., so a cached undefined or null still counts as a hit.
    if (cache.has(input)) return cache.get(input) as Output<F>;
    const output = fn(input) as Output<F>;
    cache.set(input, output);
    return output;
  });
};`,
    hiddenTests: [
      { call: "runMemoized(n => n * n, [3, 3, 3])", expected: [9, 9, 9] },
      { call: "(() => { let calls = 0; runMemoized(n => { calls += 1; return n; }, [5, 6, 7]); return calls; })()", expected: 3 },
    ],
    hiddenTypeTests: [
      { code: "const __flags: boolean[] = runMemoized(n => n > 0, [1]);" },
      { code: "runMemoized((s: string) => s, [1]);", rejects: true },
    ],
  },
  "ts-tag-every-id": {
    solution: `type Tag<P extends string> = \`\${P}-\${number}\`;

const tagAll = <P extends string>(prefix: P, ids: number[]): Tag<P>[] => {
  const tags: Tag<P>[] = [];
  for (const id of ids) tags.push(\`\${prefix}-\${id}\`);
  return tags;
};`,
    junior: `type Tag<P extends string> = \`\${P}-\${number}\`;

const tagAll = <P extends string>(prefix: P, ids: number[]): Tag<P>[] => {
  const tags: Tag<P>[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const tag: Tag<P> = \`\${prefix}-\${id}\`;
    tags.push(tag);
  }
  return tags;
};`,
    senior: `type Tag<P extends string> = \`\${P}-\${number}\`;

// The arrow's return annotation gives the template literal its Tag<P> type instead of plain string.
const tagAll = <P extends string>(prefix: P, ids: number[]): Tag<P>[] => ids.map((id): Tag<P> => \`\${prefix}-\${id}\`);`,
    hiddenTests: [
      { call: "tagAll(\"item\", [1, 2, 3])", expected: ["item-1", "item-2", "item-3"] },
      { call: "tagAll(\"v\", [42])", expected: ["v-42"] },
    ],
    hiddenTypeTests: [
      { code: "const __items: `item-${number}`[] = tagAll(\"item\", []);" },
      { code: "const __plain: string[] = tagAll(\"item\", [1]);" },
    ],
  },
  "ts-pair-with-a-sum": {
    solution: `const pairWithSum = (sorted: readonly number[], target: number): [number, number] | null => {
  let left = 0;
  let right = sorted.length - 1;
  while (left < right) {
    const sum = sorted[left] + sorted[right];
    if (sum === target) return [sorted[left], sorted[right]];
    if (sum < target) left += 1;
    else right -= 1;
  }
  return null;
};`,
    junior: `const pairWithSum = (sorted: readonly number[], target: number): [number, number] | null => {
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const sum = sorted[i] + sorted[j];
      if (sum === target) {
        return [sorted[i], sorted[j]];
      }
    }
  }
  return null;
};`,
    senior: `const pairWithSum = (sorted: readonly number[], target: number): [number, number] | null => {
  // The list is sorted, so each value's partner can be binary-searched among the later values.
  const hasLater = (wanted: number, from: number): boolean => {
    let low = from;
    let high = sorted.length - 1;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      if (sorted[middle] === wanted) return true;
      if (sorted[middle] < wanted) low = middle + 1;
      else high = middle - 1;
    }
    return false;
  };
  for (const [index, value] of sorted.entries()) {
    if (hasLater(target - value, index + 1)) return [value, target - value];
  }
  return null;
};`,
    hiddenTests: [
      { call: "pairWithSum([1, 2, 4, 5], 6)", expected: [1, 5] },
      { call: "pairWithSum([1, 2, 3], 7)", expected: null },
    ],
  },
  "ts-binary-search": {
    solution: `const binarySearch = (sorted: readonly number[], target: number): number => {
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (sorted[middle] === target) return middle;
    if (sorted[middle] < target) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
};`,
    junior: `const binarySearch = (sorted: readonly number[], target: number): number => {
  let low = 0;
  let high = sorted.length - 1;
  let found = -1;
  while (low <= high && found === -1) {
    const middle = Math.floor((low + high) / 2);
    const middleValue = sorted[middle];
    if (middleValue === target) {
      found = middle;
    } else if (middleValue < target) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
};`,
    senior: `const binarySearch = (sorted: readonly number[], target: number): number => {
  const search = (low: number, high: number): number => {
    if (low > high) return -1;
    const middle = (low + high) >>> 1; // integer midpoint without Math.floor
    if (sorted[middle] === target) return middle;
    return sorted[middle] < target ? search(middle + 1, high) : search(low, middle - 1);
  };
  return search(0, sorted.length - 1);
};`,
    hiddenTests: [
      { call: "binarySearch(Array.from({ length: 1000 }, (_, i) => i * 2), 998)", expected: 499 },
      { call: "binarySearch([1, 3, 5, 7, 9, 11], 11)", expected: 5 },
      { call: "binarySearch([2, 4, 6], 1)", expected: -1 },
    ],
  },
};
