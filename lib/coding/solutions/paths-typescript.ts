/** Server-only solutions for the TypeScript section's short paths.
 *
 * Every level adds functions to the same file, so a level's solution is every
 * earlier level's code plus its own; the path's starter types come first. The
 * content contract type-checks all three boards against the visible type
 * tests and runs them against every visible and hidden check. */

import type { CodingSolution } from '../types';
import { cumulativeLevels, type Boards, type Hidden } from './path-boards';

const GENERICS: Boards = {
  reference: [
    `function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    // get returns T[] | undefined; checking it narrows to T[] without a !.
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}`,
    `function countBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}`,
    `function uniqueBy<T, K>(items: readonly T[], keyOf: (item: T) => K): T[] {
  const seen = new Set<K>();
  const kept: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(item);
  }
  return kept;
}`,
    `function partition<T, S extends T>(items: readonly T[], isMatch: (item: T) => item is S): [S[], Exclude<T, S>[]] {
  const matched: S[] = [];
  const rest: Exclude<T, S>[] = [];
  for (const item of items) {
    if (isMatch(item)) matched.push(item);
    // TypeScript does not narrow a generic T in the else branch, hence the cast.
    else rest.push(item as Exclude<T, S>);
  }
  return [matched, rest];
}`,
    `function sortBy<T>(items: readonly T[], ...keys: ((item: T) => number | string)[]): T[] {
  // Copy first: sort changes the array it is called on.
  return [...items].sort((a, b) => {
    for (const key of keys) {
      const left = key(a);
      const right = key(b);
      if (left < right) return -1;
      if (left > right) return 1;
    }
    // Equal on every key: 0 lets the stable sort keep input order.
    return 0;
  });
}`,
  ],
  junior: [
    `function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = keyOf(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }
  return groups;
}`,
    `function countBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (let i = 0; i < items.length; i++) {
    const key = keyOf(items[i]);
    const current = counts.get(key);
    if (current === undefined) {
      counts.set(key, 1);
    } else {
      counts.set(key, current + 1);
    }
  }
  return counts;
}`,
    `function uniqueBy<T, K>(items: readonly T[], keyOf: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = keyOf(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}`,
    `function partition<T, S extends T>(items: readonly T[], isMatch: (item: T) => item is S): [S[], Exclude<T, S>[]] {
  const matched: S[] = [];
  const rest: Exclude<T, S>[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (isMatch(item)) {
      matched.push(item);
    } else {
      rest.push(item as Exclude<T, S>);
    }
  }
  return [matched, rest];
}`,
    `function compareValues(left: number | string, right: number | string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function sortBy<T>(items: readonly T[], ...keys: ((item: T) => number | string)[]): T[] {
  const copy = items.slice();
  copy.sort(function (a, b) {
    for (let i = 0; i < keys.length; i++) {
      const result = compareValues(keys[i](a), keys[i](b));
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  });
  return copy;
}`,
  ],
  senior: [
    `const groupBy = <T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> =>
  items.reduce((groups, item) => {
    const key = keyOf(item);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(item);
    return groups;
  }, new Map<K, T[]>());`,
    `const countBy = <T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, number> =>
  new Map([...groupBy(items, keyOf)].map(([key, group]): [K, number] => [key, group.length]));`,
    `const uniqueBy = <T, K>(items: readonly T[], keyOf: (item: T) => K): T[] =>
  [...groupBy(items, keyOf).values()].map((group) => group[0]);`,
    `const partition = <T, S extends T>(items: readonly T[], isMatch: (item: T) => item is S): [S[], Exclude<T, S>[]] => [
  items.filter(isMatch),
  items.filter((item) => !isMatch(item)) as Exclude<T, S>[],
];`,
    `const sortBy = <T>(items: readonly T[], ...keys: ((item: T) => number | string)[]): T[] =>
  [...items].sort((a, b) => {
    for (const key of keys) {
      const [left, right] = [key(a), key(b)];
      if (left !== right) return left < right ? -1 : 1;
    }
    return 0;
  });`,
  ],
};

const SHAPE = `type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "rect"; width: number; height: number };`;

const UNIONS: Boards = {
  reference: [
    `${SHAPE}

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius * shape.radius;
    case "square":
      return shape.side * shape.side;
    case "rect":
      return shape.width * shape.height;
  }
}`,
    `function assertNever(value: never): never {
  throw new Error("Unexpected shape: " + JSON.stringify(value));
}

function perimeter(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return 2 * Math.PI * shape.radius;
    case "square":
      return 4 * shape.side;
    case "rect":
      return 2 * (shape.width + shape.height);
    default:
      // Every kind is handled above, so shape is never here. A new kind
      // without a case makes this line a compile error.
      return assertNever(shape);
  }
}`,
    `function parseAmount(input: string | number | null | undefined): number | null {
  if (typeof input === "number") {
    // NaN and Infinity are numbers too, but not amounts.
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input !== "string") return null; // null or undefined
  const text = input.trim();
  return /^-?\\d+(\\.\\d+)?$/.test(text) ? Number(text) : null;
}`,
    `function isShape(value: unknown): value is Shape {
  if (typeof value !== "object" || value === null) return false;
  // Proved to be an object; the cast lets us read fields not proved yet.
  const record = value as Record<string, unknown>;
  const size = (key: string): boolean => {
    const field = record[key];
    return typeof field === "number" && Number.isFinite(field) && field >= 0;
  };
  switch (record.kind) {
    case "circle":
      return size("radius");
    case "square":
      return size("side");
    case "rect":
      return size("width") && size("height");
    default:
      return false;
  }
}`,
    `function totalArea(values: unknown[]): { total: number; skipped: number } {
  let total = 0;
  let skipped = 0;
  for (const value of values) {
    // Inside the if, the type guard has made value a Shape.
    if (isShape(value)) total += area(value);
    else skipped += 1;
  }
  return { total: Math.round(total * 100) / 100, skipped };
}`,
  ],
  junior: [
    `${SHAPE}

function area(shape: Shape): number {
  if (shape.kind === "circle") {
    return Math.PI * shape.radius * shape.radius;
  } else if (shape.kind === "square") {
    return shape.side * shape.side;
  } else {
    return shape.width * shape.height;
  }
}`,
    `function assertNever(value: never): never {
  const text = JSON.stringify(value);
  throw new Error("Unexpected shape: " + text);
}

function perimeter(shape: Shape): number {
  if (shape.kind === "circle") {
    return 2 * Math.PI * shape.radius;
  }
  if (shape.kind === "square") {
    return 4 * shape.side;
  }
  if (shape.kind === "rect") {
    return 2 * (shape.width + shape.height);
  }
  return assertNever(shape);
}`,
    `function parseAmount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) {
    return null;
  }
  if (typeof input === "number") {
    if (Number.isFinite(input)) {
      return input;
    }
    return null;
  }
  const text = input.trim();
  const pattern = /^-?\\d+(\\.\\d+)?$/;
  if (!pattern.test(text)) {
    return null;
  }
  return Number(text);
}`,
    `function isSize(field: unknown): boolean {
  if (typeof field !== "number") {
    return false;
  }
  if (!Number.isFinite(field)) {
    return false;
  }
  return field >= 0;
}

function isShape(value: unknown): value is Shape {
  if (typeof value !== "object") {
    return false;
  }
  if (value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.kind === "circle") {
    return isSize(record.radius);
  }
  if (record.kind === "square") {
    return isSize(record.side);
  }
  if (record.kind === "rect") {
    return isSize(record.width) && isSize(record.height);
  }
  return false;
}`,
    `function totalArea(values: unknown[]): { total: number; skipped: number } {
  let total = 0;
  let skipped = 0;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (isShape(value)) {
      total = total + area(value);
    } else {
      skipped = skipped + 1;
    }
  }
  const rounded = Math.round(total * 100) / 100;
  return { total: rounded, skipped: skipped };
}`,
  ],
  senior: [
    `${SHAPE}

const area = (shape: Shape): number => {
  switch (shape.kind) {
    case "circle": return Math.PI * shape.radius ** 2;
    case "square": return shape.side ** 2;
    case "rect": return shape.width * shape.height;
  }
};`,
    `const assertNever = (value: never): never => {
  throw new Error(\`Unexpected shape: \${JSON.stringify(value)}\`);
};

const perimeter = (shape: Shape): number => {
  switch (shape.kind) {
    case "circle": return 2 * Math.PI * shape.radius;
    case "square": return 4 * shape.side;
    case "rect": return 2 * (shape.width + shape.height);
    default: return assertNever(shape);
  }
};`,
    `const AMOUNT = /^-?\\d+(\\.\\d+)?$/;

const parseAmount = (input: string | number | null | undefined): number | null => {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const text = input?.trim() ?? "";
  return AMOUNT.test(text) ? Number(text) : null;
};`,
    `const isSize = (field: unknown): boolean => typeof field === "number" && Number.isFinite(field) && field >= 0;

const isShape = (value: unknown): value is Shape => {
  if (typeof value !== "object" || value === null) return false;
  const shape = value as Record<string, unknown>;
  switch (shape.kind) {
    case "circle": return isSize(shape.radius);
    case "square": return isSize(shape.side);
    case "rect": return isSize(shape.width) && isSize(shape.height);
    default: return false;
  }
};`,
    `const totalArea = (values: unknown[]): { total: number; skipped: number } => {
  const shapes = values.filter(isShape);
  const total = shapes.reduce((sum, shape) => sum + area(shape), 0);
  return { total: Math.round(total * 100) / 100, skipped: values.length - shapes.length };
};`,
  ],
};

const HIDDEN: Record<string, Hidden> = {
  'ts-path-generics': [
    [['groupBy(["b", "a", "b"], (s) => s).get("b")', ['b', 'b']], ['[...groupBy([0, 1, 2], (n) => n > 0).keys()]', [false, true]]],
    [['countBy(["a", "b", "a"], (s) => s).get("a")', 2], ['countBy([1], (n) => n).has(2)', false]],
    [['uniqueBy([3, 1, 3, 2, 1], (n) => n)', [3, 1, 2]], ['uniqueBy([{k: "x"}, {k: "x"}], (o) => o.k).length', 1]],
    [['partition([0, "", null, 1], (x) => typeof x === "number")', [[0, 1], ['', null]]], ['partition(["a", "b"], () => false)', [[], ['a', 'b']]]],
    [['sortBy([2, 1])', [2, 1]], ['sortBy(["b", "a", "c"], (s) => s)', ['a', 'b', 'c']], ['sortBy([{a: 1, b: "y"}, {a: 1, b: "x"}, {a: 0, b: "z"}], (o) => o.a, (o) => o.b).map((o) => o.b)', ['z', 'x', 'y']]],
  ],
  'ts-path-unions': [
    [['area({kind: "rect", width: 0, height: 9})', 0], ['area({kind: "square", side: 10})', 100]],
    [['perimeter({kind: "rect", width: 0.5, height: 0.5})', 2], ['perimeter({kind: "circle", radius: 0})', 0]],
    [['parseAmount("007")', 7], ['parseAmount(Infinity)', null], ['parseAmount("1.")', null], ['parseAmount(" -0.5 ")', -0.5]],
    [['isShape({kind: "square", side: 0})', true], ['isShape({kind: "rect", width: Infinity, height: 1})', false], ['isShape("circle")', false], ['isShape({kind: "toString", side: 1})', false]],
    [['totalArea([undefined, 0, {}])', { total: 0, skipped: 3 }], ['totalArea([{kind: "square", side: 1}, {kind: "square", side: 1}])', { total: 2, skipped: 0 }]],
  ],
};

export const TYPESCRIPT_PATH_SOLUTIONS: Record<string, CodingSolution> = Object.fromEntries([
  ...cumulativeLevels('ts-path-generics', GENERICS, HIDDEN['ts-path-generics']),
  ...cumulativeLevels('ts-path-unions', UNIONS, HIDDEN['ts-path-unions']),
]);
