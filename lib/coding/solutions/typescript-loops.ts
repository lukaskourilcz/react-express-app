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
    hiddenTests: [
      { call: "myReduce([1, 2, 3, 4], (acc, n) => Math.max(acc, n), 0)", expected: 4 },
      { call: "myReduce([\"x\", \"y\"], (acc, s) => acc + s.length, 0)", expected: 2 },
    ],
  },
  "ts-pluck-all": {
    solution: `const pluckAll = <T, K extends keyof T>(items: T[], keys: K[]): T[K][][] =>
  items.map(item => keys.map(key => item[key]));`,
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
    hiddenTests: [
      { call: "binarySearch(Array.from({ length: 1000 }, (_, i) => i * 2), 998)", expected: 499 },
      { call: "binarySearch([1, 3, 5, 7, 9, 11], 11)", expected: 5 },
      { call: "binarySearch([2, 4, 6], 1)", expected: -1 },
    ],
  },
};
