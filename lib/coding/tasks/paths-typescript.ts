/** The TypeScript section's short paths. Five levels each; every level adds
 * one function to the same file and is graded twice: the runtime checks test
 * the behaviour, and the compiler checks the types.
 *
 * Generic collection helpers teaches type parameters that the call infers;
 * Unions and narrowing teaches a discriminated union, exhaustive switches,
 * `typeof` narrowing and a type guard for data the program did not write.
 *
 * Task bodies only. Solutions live in `lib/coding/solutions/paths-typescript.ts`. */

import type { Spec } from './evolving';
import { check, doc, en } from './path-helpers';

const handbook = (title: string, page: string) => doc(title, `https://www.typescriptlang.org/docs/handbook/2/${page}`);

export const TYPESCRIPT_PATHS: Record<string, Spec> = {
  'ts-path-generics': {
    starter: `// Generic collection helpers. Every level adds one function to this file.
// Keep the earlier functions: their checks run again at every level.

function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  throw new Error("Implement me");
}
`,
    focus: ['generics', 'map-set'],
    prompts: [
      en('Implement `groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]>`: a Map from each key to the items that have it, keys in first-seen order and items in input order. `groupBy(["apple", "avocado", "banana"], (word) => word[0])` gives `"a" → ["apple", "avocado"]` and `"b" → ["banana"]`. `T` is the item type and `K` the key type; TypeScript infers both from the call, so the result is typed without a cast. Do not change the input.'),
      en('Add `countBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, number>`: how many items share each key, keys in first-seen order. `countBy([1, 2, 3], (n) => n > 1)` gives `false → 1` and `true → 2`. The key can be any type: a string, a number, a boolean.'),
      en('Add `uniqueBy<T, K>(items: readonly T[], keyOf: (item: T) => K): T[]`: the items in input order, keeping only the first item for each key. `uniqueBy(["apple", "avocado", "banana"], (word) => word[0])` gives `["apple", "banana"]`. A `Set<K>` of the keys you have kept makes each check one `has()` call. The result has the same element type as the input.'),
      en('Add `partition<T, S extends T>(items: readonly T[], isMatch: (item: T) => item is S): [S[], Exclude<T, S>[]]`: the items `isMatch` accepts, then the rest, both in input order. `isMatch` is a type guard, so partitioning `(number | string)[]` with `(x): x is number => typeof x === "number"` is typed `[number[], string[]]`. TypeScript does not narrow a generic `T` in the `else` branch, so the rest needs one cast: `item as Exclude<T, S>`.'),
      en('Add `sortBy<T>(items: readonly T[], ...keys: ((item: T) => number | string)[]): T[]`: a new array sorted by the first key, then by the second where the first ties, and so on. Compare with `<` and `>`, smallest first: numbers by value, strings by character code. To sort a number from high to low, return its negative: `(actor) => -actor.runs`. Equal items keep input order, and the input is not changed.'),
    ],
    hints: [
      en('`if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(item);` The `!` tells the compiler what the line before made true: the key has an array now.'),
      en('The same loop as `groupBy`, with a number instead of an array: `counts.set(key, (counts.get(key) ?? 0) + 1)`.'),
      en('`const seen = new Set<K>()`. Keep an item when `!seen.has(key)`, and add the key as you keep it.'),
      en('`const matched: S[] = []; const rest: Exclude<T, S>[] = [];` Inside `if (isMatch(item))`, `item` is an `S`, so `matched.push(item)` compiles as it is.'),
      en('`[...items].sort(compare)` copies first. In `compare`, loop over the keys and return `-1` or `1` at the first key that differs; return `0` when none does, and the stable sort keeps input order.'),
    ],
    approaches: [
      [en('Create `const groups = new Map<K, T[]>()`.'), en('For each item, work out its key with `keyOf(item)`.'), en('Create the key\'s array when it is new, push the item, and return the Map.')],
      [en('Create `const counts = new Map<K, number>()`.'), en('For each item, work out its key.'), en('Store the old count plus one, then return the Map.')],
      [en('Create `const seen = new Set<K>()` and an empty result.'), en('For each item, work out its key; skip it when `seen` has the key.'), en('Otherwise add the key to `seen` and push the item.')],
      [en('Create the two typed arrays, `matched` and `rest`.'), en('Loop once; `isMatch(item)` decides which array gets the item.'), en('Return `[matched, rest]`.')],
      [en('Copy the items with `[...items]`.'), en('Sort the copy with a compare function that tries each key in turn.'), en('Return `-1` or `1` at the first key whose values differ, and `0` when all are equal.')],
    ],
    tests: [
      [
        check('[...groupBy(["apple", "avocado", "banana"], (word) => word[0])]', [['a', ['apple', 'avocado']], ['b', ['banana']]]),
        check('groupBy([1, 2, 3, 4], (n) => n % 2 === 0 ? "even" : "odd").get("odd")', [1, 3]),
        check('[...groupBy([{t: 1}, {t: 2}, {t: 1}], (o) => o.t).keys()]', [1, 2], 'keys in first-seen order'),
        check('groupBy([], (x) => x).size', 0, 'empty input gives an empty Map', true),
        check('(() => { const list = [3, 1]; groupBy(list, (n) => n); return list; })()', [3, 1], 'the input is not changed', true),
      ],
      [
        check('[...countBy(["apple", "avocado", "banana"], (word) => word[0])]', [['a', 2], ['b', 1]]),
        check('[...countBy([1, 2, 3], (n) => n > 1)]', [[false, 1], [true, 2]], 'boolean keys'),
        check('countBy(["x", "y"], () => "same").get("same")', 2),
        check('countBy([], (x) => x).size', 0, 'empty input', true),
      ],
      [
        check('uniqueBy(["apple", "avocado", "banana"], (word) => word[0])', ['apple', 'banana']),
        check('uniqueBy([{id: 1, v: "a"}, {id: 1, v: "b"}, {id: 2, v: "c"}], (o) => o.id).map((o) => o.v)', ['a', 'c'], 'the first item for each key stays'),
        check('uniqueBy(["A", "a", "b"], (s) => s.toLowerCase())', ['A', 'b'], 'the key decides what counts as the same', true),
        check('uniqueBy([1, 2, 3], (n) => n)', [1, 2, 3]),
        check('uniqueBy([], (x) => x)', [], 'empty input', true),
      ],
      [
        check('partition([1, "a", 2, "b"], (x) => typeof x === "number")', [[1, 2], ['a', 'b']]),
        check('partition(["a"], (x) => typeof x === "number")', [[], ['a']]),
        check('partition([1, 2], (x) => typeof x === "number")', [[1, 2], []], 'nothing left over', true),
        check('partition([], () => true)', [[], []], 'empty input', true),
        check('(() => { const list = [1, "a"]; partition(list, (x) => typeof x === "number"); return list; })()', [1, 'a'], 'the input is not changed', true),
      ],
      [
        check('sortBy([{n: "b", r: 2}, {n: "a", r: 2}, {n: "c", r: 1}], (x) => x.r, (x) => x.n).map((x) => x.n)', ['c', 'a', 'b']),
        check('sortBy([3, 1, 2], (n) => n)', [1, 2, 3]),
        check('sortBy([{n: "x", r: 1}, {n: "y", r: 5}], (x) => -x.r).map((x) => x.n)', ['y', 'x'], 'a minus sign sorts high to low'),
        check('sortBy([{k: 1, i: 0}, {k: 1, i: 1}, {k: 0, i: 2}], (x) => x.k).map((x) => x.i)', [2, 0, 1], 'equal keys keep input order', true),
        check('(() => { const list = [2, 1]; sortBy(list, (n) => n); return list; })()', [2, 1], 'the input is not changed', true),
        check('sortBy([], (x) => x)', [], 'empty input', true),
      ],
    ],
    typeTests: [
      [
        { code: 'const groups: Map<string, string[]> = groupBy(["a", "b"], (s) => s.toUpperCase());' },
        { code: 'const wrong: Map<number, string[]> = groupBy(["a"], (s) => s);', rejects: true },
      ],
      [
        { code: 'const counts: Map<boolean, number> = countBy([1, 2], (n) => n > 1);' },
        { code: 'const wrong: Map<boolean, string> = countBy([1], (n) => n > 0);', rejects: true },
      ],
      [
        { code: 'const kept: string[] = uniqueBy(["a"], (s) => s.length);' },
        { code: 'const wrong: number[] = uniqueBy(["a"], (s) => s.length);', rejects: true },
      ],
      [
        { code: 'const [numbers, words]: [number[], string[]] = partition([1, "a"] as (number | string)[], (x): x is number => typeof x === "number");' },
        { code: 'const [wrong]: [string[], number[]] = partition([1, "a"] as (number | string)[], (x): x is number => typeof x === "number");', rejects: true },
      ],
      [
        { code: 'const sorted: { n: string }[] = sortBy([{ n: "a" }], (x) => x.n);' },
        { code: 'sortBy([{ n: "a" }], (x) => x.missing);', rejects: true },
      ],
    ],
    references: [
      [handbook('Generics', 'generics.html'), doc('Map', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map')],
      [handbook('Generic functions', 'functions.html#generic-functions'), doc('Map.prototype.get()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/get')],
      [handbook('Inference in generic functions', 'functions.html#inference'), doc('Set', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set')],
      [handbook('Using type predicates', 'narrowing.html#using-type-predicates'), doc('Exclude<UnionType, ExcludedMembers>', 'https://www.typescriptlang.org/docs/handbook/utility-types.html#excludeuniontype-excludedmembers')],
      [handbook('Rest parameters', 'functions.html#rest-parameters-and-arguments'), doc('Array.prototype.sort()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort')],
    ],
  },

  'ts-path-unions': {
    starter: `// Unions and narrowing. Every level adds one function to this file.
// Keep the earlier functions: their checks run again at every level.

type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "rect"; width: number; height: number };

function area(shape: Shape): number {
  throw new Error("Implement me");
}
`,
    focus: ['unions', 'narrowing', 'type-guards'],
    prompts: [
      en('`Shape` is a discriminated union: every member has a `kind`, and `kind` tells TypeScript which other fields exist. Implement `area(shape)`: `Math.PI * radius * radius` for a circle, `side * side` for a square, and `width * height` for a rect. Switch on `shape.kind`; inside each `case` TypeScript knows the exact member, so `shape.radius` only compiles in the circle branch.'),
      en('Add `perimeter(shape: Shape): number`: `2 * Math.PI * radius`, `4 * side`, or `2 * (width + height)`. Make the switch exhaustive: its `default` branch returns `assertNever(shape)`. Write `assertNever(value: never): never` too; it throws `new Error("Unexpected shape: " + JSON.stringify(value))`. If a fourth shape is added and a `case` is missing, `shape` is no longer `never` in that branch and the compiler points at the gap.'),
      en('Add `parseAmount(input: string | number | null | undefined): number | null`. A finite number comes back as it is. A string is trimmed and must look like a decimal number, `/^-?\\d+(\\.\\d+)?$/`; then `Number` converts it. Everything else gives `null`: `NaN`, `Infinity`, `null`, `undefined`, an empty string and `"12abc"`. Check `typeof input` first: after `typeof input === "number"`, TypeScript treats `input` as a number, and after the `"string"` check, as a string.'),
      en('Add `isShape(value: unknown): value is Shape`, a type guard for data you did not write, such as parsed JSON. It returns `true` only for a non-null object whose `kind` is `"circle"`, `"square"` or `"rect"` and whose size fields for that kind are finite numbers of zero or more. After `if (isShape(value))`, TypeScript lets you call `area(value)`.'),
      en('Add `totalArea(values: unknown[]): { total: number; skipped: number }`: add up the area of every value `isShape` accepts, and count the ones it rejects. Round `total` to two decimals with `Math.round(total * 100) / 100`. An empty list gives `{ total: 0, skipped: 0 }`.'),
    ],
    hints: [
      en('`switch (shape.kind) { case "circle": return Math.PI * shape.radius ** 2; ... }`. Each `case` returns, so no `break` is needed.'),
      en('After the three `case`s, TypeScript has ruled every member out, so `shape` is `never` in `default`. `never` is assignable to anything, which is why `return assertNever(shape)` compiles in a function that returns a number.'),
      en('`if (typeof input === "number") return Number.isFinite(input) ? input : null;` Then `if (typeof input !== "string") return null;` leaves `input` a string for the regular expression.'),
      en('Cast once after the object check: `const record = value as Record<string, unknown>`. Then a size check is `typeof record.side === "number" && Number.isFinite(record.side) && record.side >= 0`.'),
      en('Loop over the values: `if (isShape(value)) total += area(value); else skipped += 1;`. Inside the `if`, `value` is a `Shape`.'),
    ],
    approaches: [
      [en('Switch on `shape.kind`.'), en('Return the formula for each of the three kinds.'), en('Read only the fields that kind has.')],
      [en('Write `assertNever`: it only throws.'), en('Switch on `shape.kind` in `perimeter` and return each formula.'), en('Return `assertNever(shape)` from the `default` branch.')],
      [en('Numbers: return the input if it is finite, otherwise `null`.'), en('Anything that is not a string now: return `null`.'), en('Trim the string, test it against the pattern, and convert it with `Number`.')],
      [en('Return `false` unless the value is an object and not `null`.'), en('Read `kind` and switch on it.'), en('For each kind, check that its size fields are finite numbers of zero or more; any other kind is `false`.')],
      [en('Start with `total = 0` and `skipped = 0`.'), en('For each value, add its area if `isShape` accepts it, or count it as skipped.'), en('Round the total to two decimals and return both numbers.')],
    ],
    tests: [
      [
        check('area({kind: "square", side: 3})', 9),
        check('area({kind: "rect", width: 2, height: 5})', 10),
        check('Math.round(area({kind: "circle", radius: 2}) * 100) / 100', 12.57),
        check('area({kind: "circle", radius: 0})', 0, 'a zero radius', true),
        check('area({kind: "square", side: 0.5})', 0.25, 'sizes can be fractions', true),
      ],
      [
        check('perimeter({kind: "square", side: 3})', 12),
        check('perimeter({kind: "rect", width: 2, height: 5})', 14),
        check('Math.round(perimeter({kind: "circle", radius: 1}) * 100) / 100', 6.28),
        check('(() => { try { assertNever({kind: "hexagon"}); return "no error"; } catch (error) { return error.message; } })()', 'Unexpected shape: {"kind":"hexagon"}', 'assertNever throws with the value', true),
        check('(() => { try { return perimeter({kind: "hexagon", side: 1}); } catch (error) { return error.message; } })()', 'Unexpected shape: {"kind":"hexagon","side":1}', 'an unknown kind reaches assertNever', true),
      ],
      [
        check('parseAmount(5)', 5),
        check('parseAmount(" 2.50 ")', 2.5),
        check('parseAmount("-3")', -3),
        check('parseAmount("12abc")', null, 'text after the number'),
        check('parseAmount("")', null, 'an empty string', true),
        check('parseAmount(null)', null, 'null', true),
        check('parseAmount(undefined)', null, 'undefined', true),
        check('parseAmount(NaN)', null, 'NaN is a number, but not an amount', true),
      ],
      [
        check('isShape({kind: "circle", radius: 1})', true),
        check('isShape({kind: "rect", width: 2, height: 3})', true),
        check('isShape({kind: "circle"})', false, 'a missing size'),
        check('isShape({kind: "hexagon", side: 1})', false, 'an unknown kind'),
        check('isShape({kind: "square", side: "2"})', false, 'a size must be a number', true),
        check('isShape({kind: "rect", width: 2, height: -1})', false, 'a negative size', true),
        check('isShape(null)', false, 'null', true),
      ],
      [
        check('totalArea([{kind: "square", side: 2}, {kind: "rect", width: 1, height: 3}])', { total: 7, skipped: 0 }),
        check('totalArea([{kind: "square", side: 2}, "oops", null])', { total: 4, skipped: 2 }),
        check('totalArea([{kind: "circle", radius: 1}])', { total: 3.14, skipped: 0 }, 'the total is rounded to two decimals'),
        check('totalArea([])', { total: 0, skipped: 0 }, 'an empty list', true),
        check('totalArea([{kind: "square", side: -1}])', { total: 0, skipped: 1 }, 'an invalid shape is skipped', true),
      ],
    ],
    typeTests: [
      [
        { code: 'const a: number = area({ kind: "circle", radius: 1 });' },
        { code: 'area({ kind: "circle", side: 1 });', rejects: true },
      ],
      [
        { code: 'const p: number = perimeter({ kind: "square", side: 1 });' },
        { code: 'const incomplete = (s: Shape): number => { switch (s.kind) { case "circle": return 1; case "square": return 2; default: return assertNever(s); } };', rejects: true },
      ],
      [
        { code: 'const n: number | null = parseAmount("1");' },
        { code: 'const wrong: number = parseAmount("1");', rejects: true },
      ],
      [
        { code: 'const input: unknown = JSON.parse("{}"); if (isShape(input)) { const a: number = area(input); }' },
        { code: 'const input: unknown = JSON.parse("{}"); const a: number = area(input);', rejects: true },
      ],
      [
        { code: 'const result: { total: number; skipped: number } = totalArea([1, "a"]);' },
        { code: 'const wrong: string = totalArea([]).total;', rejects: true },
      ],
    ],
    references: [
      [handbook('Discriminated unions', 'narrowing.html#discriminated-unions'), handbook('Union types', 'everyday-types.html#union-types')],
      [handbook('Exhaustiveness checking', 'narrowing.html#exhaustiveness-checking'), handbook('The never type', 'narrowing.html#the-never-type')],
      [handbook('typeof type guards', 'narrowing.html#typeof-type-guards'), doc('Number.isFinite()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite')],
      [handbook('Using type predicates', 'narrowing.html#using-type-predicates'), handbook('The unknown type', 'functions.html#unknown')],
      [handbook('Narrowing', 'narrowing.html'), doc('Math.round()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round')],
    ],
  },
};
