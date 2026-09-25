// The Easy band of the TypeScript track, second wave (#226).
//
// The first wave closed every TypeScript gap: each tag on a Medium challenge
// had three Easy ones, and fourteen tags sat at exactly three. This wave takes
// each of those fourteen to five or more. Utility types, the tag Medium uses
// most, get four more: `Omit`, `Extract`, `Required` and `ReturnType`, none
// of which had an Easy challenge. For, reduce, literal types, record, generics,
// tuples, unions and narrowing each gain one or two on the way.
//
// Same rules as the earlier waves: one technique per challenge (two focus tags
// at most), ten minutes or less, a starter that fails its own checks, and every
// challenge graded twice, by the runtime checks and by the compiler. The first
// focus tag names the documentation page that ends the hint ladder. Solutions
// live in `../solutions/easy-typescript-b.ts`, and `EASY_BAND` in
// `../catalog.ts` lists this file. English only: there is no Czech overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';

export const EASY_TYPESCRIPT_B_TASKS: CodingTaskSource[] = [
  /* ── utility types ────────────────────────────────────────────────── */
  {
    id: 'ts-easy3-save-a-new-todo',
    track: 'typescript',
    topic: 'typescript',
    level: 18,
    tier: 2,
    focus: ['utility-types', 'spread'],
    title: 'Save a new todo',
    prompt: 'A todo app hands out ids itself, so a new todo arrives without one. `Todo` has an `id`, a `title` and a `done` flag. Declare `type NewTodo = Omit<Todo, "id">`, then write `addTodo(todos: readonly Todo[], draft: NewTodo): Todo[]`. It returns a new list with the draft added at the end under the next id: one more than the highest id in the list, or `1` when the list is empty. Build the new todo with spread and leave the list you were given as it is.',
    starter: `interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const addTodo = (todos, draft) => {

};

// Scratch pad. Change this and press Run.
console.log(addTodo([{ id: 1, title: "Buy milk", done: true }], { title: "Call Bo", done: false }));
`,
    skeleton: `interface Todo {
  id: number;
  title: string;
  done: boolean;
}

type NewTodo = Omit<Todo, "id">;

const addTodo = (todos: readonly Todo[], draft: NewTodo): Todo[] => {
  // the next id: the highest id plus one, or 1 for an empty list
  // a new array: every todo, then { id, ...draft }
};`,
    hints: ['`Omit<Todo, "id">` is `Todo` without its `id`, so a caller cannot pick one. `Math.max(0, ...todos.map((todo) => todo.id))` is the highest id, or 0 for an empty list. The last todo is not always the one with the highest id.'],
    approach: [
      'Declare `NewTodo` with `Omit`. The second type argument names the key to leave out.',
      'Work out the next id: the highest id in the list plus one. Start from 0, so an empty list gives 1.',
      'Return `[...todos, { id, ...draft }]`: a new array that ends with the new todo.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'addTodo([{ id: 1, title: "Buy milk", done: true }], { title: "Call Bo", done: false })', expected: [{ id: 1, title: 'Buy milk', done: true }, { id: 2, title: 'Call Bo', done: false }] },
      { call: 'addTodo([], { title: "First", done: false })', expected: [{ id: 1, title: 'First', done: false }], label: 'an empty list starts at 1', edge: true },
      { call: 'addTodo([{ id: 7, title: "a", done: false }, { id: 3, title: "b", done: false }], { title: "c", done: true }).map((todo) => todo.id)', expected: [7, 3, 8], label: 'the highest id, not the last one', edge: true },
      { call: '(() => { const list = [{ id: 1, title: "a", done: false }]; addTodo(list, { title: "b", done: false }); return list.length; })()', expected: 1, label: 'the list passed in keeps its length', edge: true },
    ],
    typeTests: [
      { code: 'const __d: NewTodo = { title: "Plan", done: false };', label: 'a new todo has a title and a done flag' },
      { code: 'const __list: Todo[] = addTodo([], { title: "Plan", done: false });', label: 'gives back todos' },
      { code: 'addTodo([], { id: 5, title: "Plan", done: false });', label: 'a new todo cannot bring its own id', rejects: true },
      { code: 'const __e: NewTodo = { title: "Plan" };', label: 'a new todo still needs its done flag', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-only-the-clicks',
    track: 'typescript',
    topic: 'typescript',
    level: 19,
    tier: 2,
    focus: ['utility-types', 'filter'],
    title: 'Only the clicks',
    prompt: 'An analytics script records `UiEvent` values: clicks with an `x` and a `y`, and key presses with a `key`. Declare `type Click = Extract<UiEvent, { kind: "click" }>`: the members of the union that fit that shape. Then write `clicks(events: readonly UiEvent[]): Click[]`, returning the clicks in their original order. Give `filter` a callback whose return type is the type predicate `event is Click`, so the array it hands back holds only clicks.',
    starter: `type UiEvent =
  | { kind: "click"; x: number; y: number }
  | { kind: "key"; key: string };

const clicks = (events) => {

};

// Scratch pad. Change this and press Run.
console.log(clicks([{ kind: "click", x: 1, y: 2 }, { kind: "key", key: "a" }]));
`,
    skeleton: `type UiEvent =
  | { kind: "click"; x: number; y: number }
  | { kind: "key"; key: string };

type Click = Extract<UiEvent, { kind: "click" }>;

const clicks = (events: readonly UiEvent[]): Click[] =>
  events.filter((event): event is Click => {
    // is this event a click?
  });`,
    hints: ['`Extract` is the opposite of `Exclude`: it keeps the members of a union that are assignable to the second argument. The runtime check is one comparison on `event.kind`. The predicate return type tells the compiler what that comparison proved.'],
    approach: [
      'Declare `Click` with `Extract`: the union first, then the shape to keep.',
      'Call `filter` on the events.',
      'Type the callback as returning `event is Click`, and return `event.kind === "click"`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'clicks([{ kind: "click", x: 1, y: 2 }, { kind: "key", key: "a" }, { kind: "click", x: 5, y: 0 }])', expected: [{ kind: 'click', x: 1, y: 2 }, { kind: 'click', x: 5, y: 0 }] },
      { call: 'clicks([{ kind: "key", key: "Enter" }, { kind: "key", key: "Tab" }])', expected: [], label: 'only key presses', edge: true },
      { call: 'clicks([])', expected: [], label: 'no events', edge: true },
      { call: 'clicks([{ kind: "click", x: 0, y: 0 }])', expected: [{ kind: 'click', x: 0, y: 0 }], label: 'a click at 0, 0 still counts', edge: true },
    ],
    typeTests: [
      { code: 'const __c: Click = { kind: "click", x: 1, y: 2 };', label: 'a click has a position' },
      { code: 'const __x: number = clicks([])[0].x;', label: 'every result has an x' },
      { code: 'const __k: Click = { kind: "key", key: "a" };', label: 'a key press is not a click', rejects: true },
      { code: 'clicks([{ kind: "scroll" }]);', label: 'only known events go in', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-complete-profile',
    track: 'typescript',
    topic: 'typescript',
    level: 18,
    tier: 2,
    focus: ['utility-types', 'type-guards'],
    title: 'Is the profile complete?',
    prompt: 'A `Profile` needs only a `name`: the `email` and the `phone` are optional. `Required<Profile>` is the same type with every property required. Write `isComplete(profile: Profile): profile is Required<Profile>`, returning `true` when the email and the phone are both filled in, which means present and not an empty string. After `if (isComplete(profile))`, the compiler reads `profile.email` as a `string` instead of `string | undefined`.',
    starter: `interface Profile {
  name: string;
  email?: string;
  phone?: string;
}

const isComplete = (profile) => {

};

// Scratch pad. Change this and press Run.
console.log(isComplete({ name: "Ada", email: "ada@example.com" }));
`,
    skeleton: `interface Profile {
  name: string;
  email?: string;
  phone?: string;
}

const isComplete = (profile: Profile): profile is Required<Profile> => {
  // true only when the email and the phone are both non-empty strings
};`,
    hints: ['A type predicate is still a boolean at runtime, and the checks return `true` or `false`. `profile.email && profile.phone` gives back one of the strings instead, and the compiler refuses a string where the predicate needs a boolean. Compare each field with `undefined` and with `""`.'],
    approach: [
      'Give the function the return type `profile is Required<Profile>`.',
      'Check that the email is neither `undefined` nor `""`, then do the same for the phone.',
      'Return `true` only when both checks pass.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'isComplete({ name: "Ada", email: "ada@example.com", phone: "555 0100" })', expected: true },
      { call: 'isComplete({ name: "Ada", email: "ada@example.com" })', expected: false, label: 'no phone' },
      { call: 'isComplete({ name: "Ada" })', expected: false, label: 'only a name', edge: true },
      { call: 'isComplete({ name: "Ada", email: "", phone: "555 0100" })', expected: false, label: 'an empty email is not filled in', edge: true },
    ],
    typeTests: [
      { code: 'const __p: Profile = { name: "Ada" }; if (isComplete(__p)) { const __e: string = __p.email; }', label: 'a complete profile has an email string' },
      { code: 'const __q: Profile = { name: "Ada" }; const __f: string = __q.email;', label: 'before the check, the email may be missing', rejects: true },
      { code: 'const __r: Required<Profile> = { name: "Ada", email: "ada@example.com" };', label: 'Required<Profile> needs the phone too', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-receipt-total',
    track: 'typescript',
    topic: 'typescript',
    level: 19,
    tier: 2,
    focus: ['utility-types', 'reduce'],
    title: 'A type from a function',
    prompt: 'A till reads each receipt line with `parseLine`, written for you, which returns `{ name, qty, cents }`. Declare `type Line = ReturnType<typeof parseLine>`, so the type follows the function if it ever changes. Then write `orderTotal(lines: readonly Line[]): number`, returning the sum of `qty * cents` over every line, in cents. Use `reduce` with a start value of `0`.',
    starter: `const parseLine = (line: string) => {
  const [name, qty, cents] = line.split(",");
  return { name, qty: Number(qty), cents: Number(cents) };
};

const orderTotal = (lines) => {

};

// Scratch pad. Change this and press Run.
console.log(orderTotal([parseLine("tea,2,350"), parseLine("cake,1,420")]));
`,
    skeleton: `const parseLine = (line: string) => {
  const [name, qty, cents] = line.split(",");
  return { name, qty: Number(qty), cents: Number(cents) };
};

type Line = ReturnType<typeof parseLine>;

const orderTotal = (lines: readonly Line[]): number =>
  lines.reduce((total, line) => {
    // add what this line costs
  }, 0);`,
    hints: ['`typeof parseLine` is the type of the function, and `ReturnType` takes the type of what it returns: `{ name: string; qty: number; cents: number }`. Keep the `0`: without a start value, `reduce` throws on an empty list.'],
    approach: [
      'Declare `Line` as `ReturnType<typeof parseLine>`.',
      'Call `reduce` on the lines, starting from `0`.',
      'In the callback, return the running total plus `line.qty * line.cents`.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'orderTotal([parseLine("tea,2,350"), parseLine("cake,1,420")])', expected: 1120 },
      { call: 'orderTotal([{ name: "tea", qty: 3, cents: 200 }])', expected: 600, label: 'a line built by hand' },
      { call: 'orderTotal([])', expected: 0, label: 'an empty receipt', edge: true },
      { call: 'orderTotal([parseLine("bag,0,10"), parseLine("pen,4,125")])', expected: 500, label: 'a line with no items adds nothing', edge: true },
    ],
    typeTests: [
      { code: 'const __l: Line = { name: "tea", qty: 2, cents: 350 };', label: 'a line has a name, a quantity and a price' },
      { code: 'const __t: number = orderTotal([parseLine("tea,1,1")]);', label: 'gives back a number' },
      { code: 'const __bad: Line = { name: "tea", qty: "2", cents: 350 };', label: 'the quantity is a number', rejects: true },
      { code: 'orderTotal(["tea,2,350"]);', label: 'the lines are parsed first', rejects: true },
    ],
  },

  /* ── generic constraints ──────────────────────────────────────────── */
  {
    id: 'ts-easy3-newest-version',
    track: 'typescript',
    topic: 'typescript',
    level: 15,
    tier: 2,
    focus: ['map-set', 'constraints'],
    title: 'Keep the newest version',
    prompt: 'A sync job receives records that can repeat: the same `id` may arrive more than once with a different `version`. Write `latest<T extends { id: string; version: number }>(records: readonly T[]): T[]`, keeping one record per id: the one with the highest version. When two share the highest version, keep the one that came first. Return the records in the order their ids first appeared. A `Map` from id to record does both jobs: `set` on a key it already holds replaces the value and leaves the key where it was.',
    starter: `const latest = (records) => {

};

// Scratch pad. Change this and press Run.
console.log(latest([{ id: "a", version: 1, text: "Hi" }, { id: "b", version: 1, text: "Yo" }, { id: "a", version: 2, text: "Hello" }]));
`,
    skeleton: `const latest = <T extends { id: string; version: number }>(records: readonly T[]): T[] => {
  const byId = new Map<string, T>();
  for (const record of records) {
    // keep this record when its id is new, or when its version is higher
  }
  return [...byId.values()];
};`,
    hints: ['Read what the map already holds with `byId.get(record.id)`. Store the new record only when there is nothing yet or its version is strictly higher, so a tie keeps the first. The constraint lets you read `id` and `version`, and `T` hands the caller back their own record type with every other field.'],
    approach: [
      'Create an empty `Map<string, T>`.',
      'For each record, look up the one kept for its id. Store the record when there is none or its version is higher.',
      'Return `[...byId.values()]`: the values in the order their keys were first set.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'latest([{ id: "a", version: 1, text: "Hi" }, { id: "b", version: 1, text: "Yo" }, { id: "a", version: 2, text: "Hello" }])', expected: [{ id: 'a', version: 2, text: 'Hello' }, { id: 'b', version: 1, text: 'Yo' }] },
      { call: 'latest([{ id: "a", version: 3 }, { id: "a", version: 1 }])', expected: [{ id: 'a', version: 3 }], label: 'an older version arriving later is ignored' },
      { call: 'latest([{ id: "x", version: 2, n: 1 }, { id: "x", version: 2, n: 2 }])', expected: [{ id: 'x', version: 2, n: 1 }], label: 'a tie keeps the first', edge: true },
      { call: 'latest([])', expected: [], label: 'no records', edge: true },
    ],
    typeTests: [
      { code: 'const __r: { id: string; version: number; text: string }[] = latest([{ id: "a", version: 1, text: "Hi" }]);', label: 'the records keep their own fields' },
      { code: 'latest([{ id: "a" }]);', label: 'every record needs a version', rejects: true },
      { code: 'latest([{ id: 1, version: 1 }]);', label: 'the id is a string', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-swap-in-the-edit',
    track: 'typescript',
    topic: 'typescript',
    level: 15,
    tier: 2,
    focus: ['constraints', 'map'],
    title: 'Swap in the edited item',
    prompt: 'An edit form saves one item of a list. Write `replaceById<T extends { id: number }>(items: readonly T[], edited: T): T[]`, returning a new array in which the item with the same `id` as `edited` is replaced by it. Every other item stays as it was, in the same place. When no item has that id, the new array holds the same items as before. Use `map`: the constraint lets you read `.id`, and `T` keeps the caller’s own item type on the way out.',
    starter: `const replaceById = (items, edited) => {

};

// Scratch pad. Change this and press Run.
console.log(replaceById([{ id: 1, name: "Ada" }, { id: 2, name: "Bo" }], { id: 2, name: "Bob" }));
`,
    skeleton: `const replaceById = <T extends { id: number }>(items: readonly T[], edited: T): T[] =>
  items.map((item) => {
    // the edited item when the ids match, otherwise the item itself
  });`,
    hints: ['`map` returns one result per item, so the length and the order stay the same without any extra work. Compare `item.id === edited.id` and return either `edited` or `item`. Changing `items[i]` would edit the caller’s array too.'],
    approach: [
      'Give the function a type parameter `T extends { id: number }`.',
      'Map over the items.',
      'Return `edited` for the item whose id matches, and the item itself for every other.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'replaceById([{ id: 1, name: "Ada" }, { id: 2, name: "Bo" }], { id: 2, name: "Bob" })', expected: [{ id: 1, name: 'Ada' }, { id: 2, name: 'Bob' }] },
      { call: 'replaceById([{ id: 1, done: false }, { id: 2, done: false }, { id: 3, done: false }], { id: 1, done: true }).map((todo) => todo.done)', expected: [true, false, false], label: 'the first item' },
      { call: 'replaceById([{ id: 1, name: "Ada" }], { id: 9, name: "New" })', expected: [{ id: 1, name: 'Ada' }], label: 'no item has that id', edge: true },
      { call: 'replaceById([], { id: 1 })', expected: [], label: 'no items', edge: true },
      { call: '(() => { const list = [{ id: 1, n: 1 }]; replaceById(list, { id: 1, n: 2 }); return list[0].n; })()', expected: 1, label: 'the list passed in is not edited', edge: true },
    ],
    typeTests: [
      { code: 'const __r: { id: number; name: string }[] = replaceById([{ id: 1, name: "a" }], { id: 1, name: "b" });', label: 'the items keep their own type' },
      { code: 'replaceById([{ name: "a" }], { name: "b" });', label: 'every item needs an id', rejects: true },
      { code: 'replaceById([{ id: "1" }], { id: "1" });', label: 'the id is a number', rejects: true },
    ],
  },

  /* ── for and tuples ───────────────────────────────────────────────── */
  {
    id: 'ts-easy3-route-legs',
    track: 'typescript',
    topic: 'typescript',
    level: 4,
    tier: 1,
    focus: ['for', 'tuples'],
    title: 'Each stop and the next',
    prompt: 'A bus route is a list of stops in order. Write `legs(stops: readonly string[]): [string, string][]`, returning one `[from, to]` pair per leg: each stop with the stop after it. `legs(["Depot", "Park", "Station"])` gives `[["Depot", "Park"], ["Park", "Station"]]`. Use a `for` loop whose index stops one short of the last stop. A route with fewer than two stops has no legs.',
    starter: `const legs = (stops) => {

};

// Scratch pad. Change this and press Run.
console.log(legs(["Depot", "Park", "Station"]));
`,
    skeleton: `const legs = (stops: readonly string[]): [string, string][] => {
  const pairs: [string, string][] = [];
  // loop i from 0 while stops[i + 1] exists, pushing [stops[i], stops[i + 1]]
  return pairs;
};`,
    hints: ['Annotate the result as `[string, string][]`, a list of pairs. Without that, TypeScript infers `[a, b]` as `string[]`, which may hold any number of strings. Stop the loop at `i < stops.length - 1`, so `stops[i + 1]` always exists.'],
    approach: [
      'Create an empty array typed `[string, string][]`.',
      'Loop `i` from 0 while `i < stops.length - 1`.',
      'Push `[stops[i], stops[i + 1]]` each time, then return the array.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'legs(["Depot", "Park", "Station"])', expected: [['Depot', 'Park'], ['Park', 'Station']] },
      { call: 'legs(["A", "B"])', expected: [['A', 'B']], label: 'one leg' },
      { call: 'legs(["Depot"])', expected: [], label: 'a single stop', edge: true },
      { call: 'legs([])', expected: [], label: 'no stops', edge: true },
      { call: 'legs(["A", "B", "A"])', expected: [['A', 'B'], ['B', 'A']], label: 'a route can come back to a stop', edge: true },
    ],
    typeTests: [
      { code: 'const __l: [string, string][] = legs(["a", "b"]);', label: 'gives back pairs' },
      { code: 'const __f: (stops: readonly string[]) => [string, string][] = legs;', label: 'accepts a read-only list' },
      { code: 'const __x: [string, string, string] = legs(["a", "b"])[0];', label: 'a leg has two stops', rejects: true },
      { code: 'legs([1, 2]);', label: 'stops are names', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-every-nth',
    track: 'typescript',
    topic: 'typescript',
    level: 14,
    tier: 2,
    focus: ['for', 'generics'],
    title: 'Every nth item',
    prompt: 'A video editor builds a preview from every third frame of a clip. Write `everyNth<T>(items: readonly T[], n: number): T[]`, returning the items at positions `n`, `2n`, `3n` and so on, counting from 1. In a `for` loop that means starting at index `n - 1` and adding `n` each time. The type parameter hands the caller back the item type they passed in. An `n` below 1 gives `[]`.',
    starter: `const everyNth = (items, n) => {

};

// Scratch pad. Change this and press Run.
console.log(everyNth(["f1", "f2", "f3", "f4", "f5", "f6"], 3));
`,
    skeleton: `const everyNth = <T>(items: readonly T[], n: number): T[] => {
  const picked: T[] = [];
  // return [] straight away when n is below 1
  // loop i from n - 1 while it is inside the list, adding n each time, and keep items[i]
  return picked;
};`,
    hints: ['The third item sits at index 2, so the first index is `n - 1`, and `i += n` jumps straight to the next one. Check `n < 1` first: with `n` at 0, `i += n` never moves and the loop never ends.'],
    approach: [
      'Return `[]` when `n` is below 1.',
      'Loop `i` from `n - 1` while `i < items.length`, adding `n` each time.',
      'Push `items[i]` on each pass, then return the list.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'everyNth(["f1", "f2", "f3", "f4", "f5", "f6", "f7"], 3)', expected: ['f3', 'f6'] },
      { call: 'everyNth([1, 2, 3, 4], 1)', expected: [1, 2, 3, 4], label: 'n of 1 keeps everything' },
      { call: 'everyNth([1, 2], 5)', expected: [], label: 'fewer items than n', edge: true },
      { call: 'everyNth([1, 2, 3], 0)', expected: [], label: 'n of 0', edge: true },
    ],
    typeTests: [
      { code: 'const __s: string[] = everyNth(["a", "b"], 2);', label: 'strings in, strings out' },
      { code: 'const __n: number[] = everyNth([1, 2], 2);', label: 'numbers in, numbers out' },
      { code: 'const __x: number[] = everyNth(["a"], 1);', label: 'strings do not come out as numbers', rejects: true },
      { code: 'everyNth([1], "2");', label: 'n is a number', rejects: true },
    ],
  },

  /* ── keyof ────────────────────────────────────────────────────────── */
  {
    id: 'ts-easy3-setting-or-default',
    track: 'typescript',
    topic: 'typescript',
    level: 17,
    tier: 2,
    focus: ['keyof'],
    title: 'A setting or its default',
    prompt: 'An app stores only the settings a user has changed, as a `Partial<Settings>`. Write `settingOr<K extends keyof Settings>(saved: Partial<Settings>, key: K): Settings[K]`, returning the saved value for `key`, or the one in `DEFAULTS` when nothing is saved. The return type `Settings[K]` means the type of that one setting, so `settingOr(saved, "sounds")` is a `boolean` and `settingOr(saved, "fontSize")` is a `number`. A saved `false` or `0` is a real choice: keep it.',
    starter: `interface Settings {
  theme: "light" | "dark";
  fontSize: number;
  sounds: boolean;
}

const DEFAULTS: Settings = { theme: "light", fontSize: 16, sounds: true };

const settingOr = (saved, key) => {

};

// Scratch pad. Change this and press Run.
console.log(settingOr({ fontSize: 20 }, "fontSize"), settingOr({}, "theme"));
`,
    skeleton: `interface Settings {
  theme: "light" | "dark";
  fontSize: number;
  sounds: boolean;
}

const DEFAULTS: Settings = { theme: "light", fontSize: 16, sounds: true };

const settingOr = <K extends keyof Settings>(saved: Partial<Settings>, key: K): Settings[K] => {
  // the saved value when there is one, otherwise the default
};`,
    hints: ['`K extends keyof Settings` makes `key` one of `"theme"`, `"fontSize"` or `"sounds"`, and `Settings[K]` looks up the type that key holds. At runtime, `??` falls back only on `undefined` and `null`. `||` would also replace a saved `false`, and switch the sounds back on.'],
    approach: [
      'Give the function a type parameter `K extends keyof Settings` and the return type `Settings[K]`.',
      'Read `saved[key]`.',
      'Return it, or `DEFAULTS[key]` when it is `undefined`: `saved[key] ?? DEFAULTS[key]`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'settingOr({ fontSize: 20 }, "fontSize")', expected: 20 },
      { call: 'settingOr({}, "theme")', expected: 'light', label: 'nothing saved gives the default' },
      { call: 'settingOr({ sounds: false }, "sounds")', expected: false, label: 'a saved false stays false', edge: true },
      { call: 'settingOr({ fontSize: 0 }, "fontSize")', expected: 0, label: 'a saved 0 stays 0', edge: true },
      { call: 'settingOr({ theme: "dark" }, "sounds")', expected: true, label: 'a different saved setting does not count', edge: true },
    ],
    typeTests: [
      { code: 'const __b: boolean = settingOr({}, "sounds");', label: 'sounds is a boolean' },
      { code: 'const __t: "light" | "dark" = settingOr({}, "theme");', label: 'the theme keeps its two values' },
      { code: 'const __n: number = settingOr({}, "theme");', label: 'the theme is not a number', rejects: true },
      { code: 'settingOr({}, "volume");', label: 'only real settings', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-change-one-field',
    track: 'typescript',
    topic: 'typescript',
    level: 16,
    tier: 2,
    focus: ['keyof', 'spread'],
    title: 'Change one field',
    prompt: 'A shop admin edits one field of a product at a time. Write `setField<K extends keyof Product>(product: Product, key: K, value: Product[K]): Product`, returning a new product with that one field changed. The types tie the value to the key: `setField(mug, "price", 5)` compiles and `setField(mug, "price", "5")` does not. Build the new product with spread, and leave the original as it is.',
    starter: `interface Product {
  name: string;
  price: number;
  inStock: boolean;
}

const setField = (product, key, value) => {

};

// Scratch pad. Change this and press Run.
console.log(setField({ name: "Mug", price: 8, inStock: true }, "price", 10));
`,
    skeleton: `interface Product {
  name: string;
  price: number;
  inStock: boolean;
}

const setField = <K extends keyof Product>(product: Product, key: K, value: Product[K]): Product => {
  // a new object: every field of product, then key set to value
};`,
    hints: ['A key in square brackets inside an object literal is a computed key: `{ [key]: value }` uses whatever `key` holds as the property name. Spread the product first and put `[key]: value` after it, so the new value wins.'],
    approach: [
      'Declare the type parameter `K extends keyof Product`, and type `value` as `Product[K]`.',
      'Spread the product into a new object literal.',
      'Add `[key]: value` after the spread, and return the object.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'setField({ name: "Mug", price: 8, inStock: true }, "price", 10)', expected: { name: 'Mug', price: 10, inStock: true } },
      { call: 'setField({ name: "Mug", price: 8, inStock: true }, "inStock", false)', expected: { name: 'Mug', price: 8, inStock: false }, label: 'a boolean field' },
      { call: 'setField({ name: "Mug", price: 8, inStock: true }, "name", "Cup").name', expected: 'Cup', label: 'a text field' },
      { call: '(() => { const mug = { name: "Mug", price: 8, inStock: true }; setField(mug, "price", 0); return mug.price; })()', expected: 8, label: 'the original keeps its price', edge: true },
    ],
    typeTests: [
      { code: 'const __p: Product = setField({ name: "a", price: 1, inStock: true }, "price", 2);', label: 'gives back a product' },
      { code: 'setField({ name: "a", price: 1, inStock: true }, "inStock", false);', label: 'a boolean field takes a boolean' },
      { code: 'setField({ name: "a", price: 1, inStock: true }, "price", "2");', label: 'the price takes a number', rejects: true },
      { code: 'setField({ name: "a", price: 1, inStock: true }, "colour", "red");', label: 'only fields a product has', rejects: true },
    ],
  },

  /* ── spread and objects ───────────────────────────────────────────── */
  {
    id: 'ts-easy3-pin-to-top',
    track: 'typescript',
    topic: 'typescript',
    level: 7,
    tier: 1,
    focus: ['spread', 'filter'],
    title: 'Pin a chat to the top',
    prompt: 'A messaging app lets you pin one chat above the others. Write `pinToTop(chats: readonly string[], chat: string): string[]`, returning a new list with `chat` first and every other chat after it, in the same order as before. Build it as `[chat, ...rest]`, where `rest` is the list without that chat. A chat that is not in the list is not added: return a copy of the list as it is.',
    starter: `const pinToTop = (chats: readonly string[], chat: string): string[] => {

};

// Scratch pad. Change this and press Run.
console.log(pinToTop(["Ada", "Bo", "Cy"], "Cy"));
`,
    skeleton: `const pinToTop = (chats: readonly string[], chat: string): string[] => {
  // not in the list: return a copy, unchanged
  // rest: every chat except this one, in order
  // return [chat, ...rest]
};`,
    hints: ['`filter` gives you the list without the pinned chat, and a spread puts that list after it in a new array. Check `includes` first, or a chat that was never in the list would appear at the top.'],
    approach: [
      'When the chat is not in the list, return `[...chats]`.',
      'Filter out the chat to get the rest, still in order.',
      'Return `[chat, ...rest]`.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'pinToTop(["Ada", "Bo", "Cy"], "Cy")', expected: ['Cy', 'Ada', 'Bo'] },
      { call: 'pinToTop(["Ada", "Bo", "Cy"], "Ada")', expected: ['Ada', 'Bo', 'Cy'], label: 'already at the top' },
      { call: 'pinToTop(["Ada", "Bo"], "Dee")', expected: ['Ada', 'Bo'], label: 'a chat that is not in the list', edge: true },
      { call: 'pinToTop([], "Ada")', expected: [], label: 'no chats', edge: true },
    ],
    typeTests: [
      { code: 'const __l: string[] = pinToTop(["a"], "a");', label: 'gives back an ordinary array' },
      { code: 'const __f: (chats: readonly string[], chat: string) => string[] = pinToTop;', label: 'accepts a read-only list' },
      { code: 'pinToTop(["a"], 1);', label: 'a chat is a name', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-move-house',
    track: 'typescript',
    topic: 'typescript',
    level: 7,
    tier: 2,
    focus: ['spread', 'objects'],
    title: 'Move to a new city',
    prompt: 'Write `moveTo(user: User, city: string): User`, returning a new user whose address has the new `city` and keeps its `street`. The user you were given must not change, and neither must its address. Spread copies one level only: `{ ...user }` is a new user that still points at the old `address` object, so the address needs a spread of its own.',
    starter: `interface Address {
  street: string;
  city: string;
}

interface User {
  name: string;
  address: Address;
}

const moveTo = (user: User, city: string): User => {

};

// Scratch pad. Change this and press Run.
console.log(moveTo({ name: "Ada", address: { street: "1 Quay", city: "Leeds" } }, "York"));
`,
    skeleton: `interface Address {
  street: string;
  city: string;
}

interface User {
  name: string;
  address: Address;
}

const moveTo = (user: User, city: string): User => ({
  ...user,
  // address: a new object with the old address fields, then the new city
});`,
    hints: ['Check the original after a run: if `user.address.city` changed, your copy still shares the address object. A second spread, nested inside the first, gives the address a copy of its own.'],
    approach: [
      'Spread the user into a new object.',
      'Set `address` to a new object: spread the old address, then set `city`.',
      'Return the new user. The user and the address you were given stay as they were.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'moveTo({ name: "Ada", address: { street: "1 Quay", city: "Leeds" } }, "York")', expected: { name: 'Ada', address: { street: '1 Quay', city: 'York' } } },
      { call: 'moveTo({ name: "Bo", address: { street: "2 Hill", city: "Bath" } }, "Bath").address', expected: { street: '2 Hill', city: 'Bath' }, label: 'a move within the same city' },
      { call: '(() => { const ada = { name: "Ada", address: { street: "1 Quay", city: "Leeds" } }; moveTo(ada, "York"); return ada.address.city; })()', expected: 'Leeds', label: 'the original address keeps its city', edge: true },
      { call: '(() => { const ada = { name: "Ada", address: { street: "1 Quay", city: "Leeds" } }; return moveTo(ada, "York").address === ada.address; })()', expected: false, label: 'the new user gets its own address', edge: true },
    ],
    typeTests: [
      { code: 'const __u: User = moveTo({ name: "a", address: { street: "s", city: "c" } }, "d");', label: 'gives back a user' },
      { code: 'moveTo({ name: "a", address: { street: "s", city: "c" } }, 42);', label: 'a city is text', rejects: true },
      { code: 'moveTo({ name: "a" }, "d");', label: 'a user has an address', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-rank-the-scores',
    track: 'typescript',
    topic: 'typescript',
    level: 13,
    tier: 2,
    focus: ['sort', 'objects'],
    title: 'Rank the scores',
    prompt: 'A quiz keeps its scores in an object from each player’s name to their points. Write `ranked(scores: Record<string, number>): [string, number][]`, returning `[name, points]` pairs from the most points to the fewest. `Object.entries(scores)` gives you the pairs; sort them by their second item. Players on the same points keep the order the object lists them in.',
    starter: `const ranked = (scores) => {

};

// Scratch pad. Change this and press Run.
console.log(ranked({ Ada: 7, Bo: 12, Cy: 3 }));
`,
    skeleton: `const ranked = (scores: Record<string, number>): [string, number][] =>
  Object.entries(scores).sort((a, b) => {
    // compare the points at index 1, most first
  });`,
    hints: ['Each entry is a `[name, points]` pair, so the points sit at index 1. A compare function that subtracts the first pair’s points from the second’s sorts from high to low, and a difference of 0 keeps the order. `Object.entries` builds a new array, so sorting it leaves `scores` alone.'],
    approach: [
      'Call `Object.entries(scores)` to get the `[name, points]` pairs.',
      'Sort them with a compare function on index 1, most points first.',
      'Return the sorted pairs.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'ranked({ Ada: 7, Bo: 12, Cy: 3 })', expected: [['Bo', 12], ['Ada', 7], ['Cy', 3]] },
      { call: 'ranked({ Ada: 5, Bo: 5, Cy: 9 })', expected: [['Cy', 9], ['Ada', 5], ['Bo', 5]], label: 'a tie keeps the order of the object', edge: true },
      { call: 'ranked({})', expected: [], label: 'no players', edge: true },
      { call: 'ranked({ Solo: 0 })', expected: [['Solo', 0]], label: 'one player on zero', edge: true },
    ],
    typeTests: [
      { code: 'const __r: [string, number][] = ranked({ a: 1 });', label: 'gives back name and points pairs' },
      { code: 'const __p: number = ranked({ a: 1 })[0][1];', label: 'the second item is the points' },
      { code: 'ranked({ a: "1" });', label: 'points are numbers', rejects: true },
    ],
  },

  /* ── sort and strings ─────────────────────────────────────────────── */
  {
    id: 'ts-easy3-sort-ignoring-case',
    track: 'typescript',
    topic: 'typescript',
    level: 4,
    tier: 2,
    focus: ['sort', 'strings'],
    title: 'Sort titles, ignoring case',
    prompt: 'A reading list shows its titles from A to Z. `sort` with no compare function orders by character code, where every capital letter comes before every lower-case one, so `"Zebra"` lands before `"apple"`. Write `sortTitles(titles: readonly string[]): string[]`, returning a new array sorted by the lower-case form of each title, compared with `<` and `>`. Titles that differ only in case keep their original order.',
    starter: `const sortTitles = (titles: readonly string[]): string[] => {

};

// Scratch pad. Change this and press Run.
console.log(sortTitles(["Zebra", "apple", "Mango"]));
`,
    skeleton: `const sortTitles = (titles: readonly string[]): string[] =>
  [...titles].sort((a, b) => {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    // -1 when left comes first, 1 when right does, 0 for a tie
  });`,
    hints: ['Lower-case both titles inside the compare function and return `-1`, `1` or `0`. The `0` matters: it tells `sort` to keep the two titles in their order. Copy with `[...titles]` first, because `sort` works in place and the parameter is read-only.'],
    approach: [
      'Copy the titles into a new array.',
      'Sort the copy with a compare function that lower-cases both titles.',
      'Return `-1` when the first comes earlier, `1` when it comes later, and `0` when they match.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'sortTitles(["Zebra", "apple", "Mango"])', expected: ['apple', 'Mango', 'Zebra'] },
      { call: 'sortTitles(["b", "A", "c"])', expected: ['A', 'b', 'c'] },
      { call: 'sortTitles(["Dune", "dune", "DUNE"])', expected: ['Dune', 'dune', 'DUNE'], label: 'titles that differ only in case keep their order', edge: true },
      { call: 'sortTitles([])', expected: [], label: 'no titles', edge: true },
      { call: '(() => { const list = ["b", "a"]; sortTitles(list); return list; })()', expected: ['b', 'a'], label: 'the list passed in keeps its order', edge: true },
    ],
    typeTests: [
      { code: 'const __s: string[] = sortTitles(["a"]);', label: 'gives back an ordinary array' },
      { code: 'const __f: (titles: readonly string[]) => string[] = sortTitles;', label: 'accepts a read-only list' },
      { code: 'sortTitles([1, 2]);', label: 'titles are text', rejects: true },
    ],
  },

  /* ── while ────────────────────────────────────────────────────────── */
  {
    id: 'ts-easy3-retry-delays',
    track: 'typescript',
    topic: 'typescript',
    level: 9,
    tier: 1,
    focus: ['while', 'readonly'],
    title: 'Wait times between retries',
    prompt: 'A client that cannot reach the server waits before it tries again, and doubles the wait each time. Write `retryDelays(first: number, cap: number): readonly number[]`, listing the waits in milliseconds: `first`, then twice that, and so on while the wait is no more than `cap`. `retryDelays(100, 1000)` gives `[100, 200, 400, 800]`. You do not know the count in advance, so use a `while` loop. A `first` of 0 or less never grows, so return `[]` for it. The `readonly` return type stops a caller from pushing a wait of their own.',
    starter: `const retryDelays = (first, cap) => {

};

// Scratch pad. Change this and press Run.
console.log(retryDelays(100, 1000));
`,
    skeleton: `const retryDelays = (first: number, cap: number): readonly number[] => {
  const delays: number[] = [];
  // return [] straight away when first is 0 or less
  let wait = first;
  // while the wait still fits under the cap: record it, then double it
  return delays;
};`,
    hints: ['Build the list in an ordinary `number[]` and return it: a mutable array is assignable to `readonly number[]`, and the caller sees only the read-only type. Check `first <= 0` before the loop, or it never ends.'],
    approach: [
      'Return `[]` when `first` is 0 or less.',
      'Start `wait` at `first`, and loop while `wait <= cap`.',
      'Inside the loop, push `wait` and then double it.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'retryDelays(100, 1000)', expected: [100, 200, 400, 800] },
      { call: 'retryDelays(250, 1000)', expected: [250, 500, 1000], label: 'a wait equal to the cap still counts' },
      { call: 'retryDelays(2000, 1000)', expected: [], label: 'the first wait is already too long', edge: true },
      { call: 'retryDelays(0, 1000)', expected: [], label: 'a first wait of 0 never grows', edge: true },
    ],
    typeTests: [
      { code: 'const __d: readonly number[] = retryDelays(100, 1000);', label: 'gives back a read-only list' },
      { code: 'retryDelays(100, 1000).push(5);', label: 'a caller cannot add a wait', rejects: true },
      { code: 'retryDelays("100", 1000);', label: 'the waits are numbers', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-read-headers',
    track: 'typescript',
    topic: 'typescript',
    level: 20,
    tier: 2,
    focus: ['while', 'record'],
    title: 'Headers until the blank line',
    prompt: 'An HTTP response starts with header lines such as `Content-Type: text/html`, then one blank line (`""`), then the body. Write `readHeaders(lines: readonly string[]): Record<string, string>`, reading from the top with a `while` loop until it reaches the blank line or runs out of lines. Split each header at its first `": "`: the name before it, in lower case, is the key, and everything after it is the value. Nothing after the blank line is read, even when it looks like a header.',
    starter: `const readHeaders = (lines) => {

};

// Scratch pad. Change this and press Run.
console.log(readHeaders(["Content-Type: text/html", "Content-Length: 12", "", "<p>Hi</p>"]));
`,
    skeleton: `const readHeaders = (lines: readonly string[]): Record<string, string> => {
  const headers: Record<string, string> = {};
  let i = 0;
  while (/* i is in range and lines[i] is not "" */) {
    const at = lines[i].indexOf(": ");
    // key: the part before at, in lower case; value: everything after ": "
    i++;
  }
  return headers;
};`,
    hints: ['`indexOf(": ")` finds only the first separator, so a value that holds its own `": "` stays whole. `slice(0, at)` is the name and `slice(at + 2)` the value. `split(": ")` would cut such a value in pieces.'],
    approach: [
      'Start an empty `Record<string, string>` and an index at 0.',
      'Loop while the index is in range and the line there is not `""`.',
      'Split the line at its first `": "`, store the lower-case name with its value, and move to the next line.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'readHeaders(["Content-Type: text/html", "Content-Length: 12", "", "<p>Hi</p>"])', expected: { 'content-type': 'text/html', 'content-length': '12' } },
      { call: 'readHeaders(["Host: example.com"])', expected: { host: 'example.com' }, label: 'no blank line: read to the end' },
      { call: 'readHeaders(["", "Host: example.com"])', expected: {}, label: 'a blank first line means no headers', edge: true },
      { call: 'readHeaders(["X-Note: see: below", ""])', expected: { 'x-note': 'see: below' }, label: 'a value keeps its own colons', edge: true },
      { call: 'readHeaders(["A: 1", "", "B: 2"])', expected: { a: '1' }, label: 'nothing after the blank line', edge: true },
    ],
    typeTests: [
      { code: 'const __h: Record<string, string> = readHeaders(["A: 1"]);', label: 'gives back a record of text' },
      { code: 'const __v: string = readHeaders([])["host"];', label: 'every value is text' },
      { code: 'readHeaders("A: 1");', label: 'the input is a list of lines', rejects: true },
    ],
  },

  /* ── destructuring ────────────────────────────────────────────────── */
  {
    id: 'ts-easy3-passed-the-mark',
    track: 'typescript',
    topic: 'typescript',
    level: 20,
    tier: 2,
    focus: ['destructuring', 'record'],
    title: 'Who reached the pass mark',
    prompt: 'Exam results arrive as a `Record<string, number>` from each student’s name to their score. Write `passed(scores: Record<string, number>, mark: number): string[]`, returning the names of the students who scored `mark` or more, in the order the record lists them. Loop over `Object.entries(scores)` with `for...of`, and destructure each entry in the loop head into a name and a score.',
    starter: `const passed = (scores, mark) => {

};

// Scratch pad. Change this and press Run.
console.log(passed({ Ada: 72, Bo: 48, Cy: 90 }, 50));
`,
    skeleton: `const passed = (scores: Record<string, number>, mark: number): string[] => {
  const names: string[] = [];
  for (const [name, score] of Object.entries(scores)) {
    // keep the name when the score reaches the mark
  }
  return names;
};`,
    hints: ['`Object.entries` turns the record into `[name, score]` pairs. Destructuring the pair in the loop head, `for (const [name, score] of …)`, names both parts, so the body reads `score >= mark` instead of `entry[1] >= mark`.'],
    approach: [
      'Type the scores as `Record<string, number>`.',
      'Loop over `Object.entries(scores)`, destructuring each pair into `name` and `score`.',
      'Push the name when `score >= mark`, and return the names.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'passed({ Ada: 72, Bo: 48, Cy: 90 }, 50)', expected: ['Ada', 'Cy'] },
      { call: 'passed({ Ada: 50, Bo: 49 }, 50)', expected: ['Ada'], label: 'the mark itself passes', edge: true },
      { call: 'passed({ Ada: 10 }, 50)', expected: [], label: 'nobody passed', edge: true },
      { call: 'passed({}, 50)', expected: [], label: 'no students', edge: true },
    ],
    typeTests: [
      { code: 'const __n: string[] = passed({ a: 1 }, 1);', label: 'gives back names' },
      { code: 'passed({ a: "72" }, 50);', label: 'scores are numbers', rejects: true },
      { code: 'passed({ a: 1 }, "50");', label: 'the mark is a number', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-order-line',
    track: 'typescript',
    topic: 'typescript',
    level: 5,
    tier: 1,
    focus: ['destructuring', 'strings'],
    title: 'One line per order',
    prompt: 'An order list shows each order on one line, such as `#12 Ada, 3 items`. Write `orderLine(order: Order): string`. Destructure the `id`, the customer’s `name` and the `items` in the parameter list: a nested pattern reaches into `customer`. Write `item` for exactly one item and `items` for any other count, 0 included.',
    starter: `interface Order {
  id: number;
  customer: { name: string; email: string };
  items: string[];
}

const orderLine = (order: Order): string => {

};

// Scratch pad. Change this and press Run.
console.log(orderLine({ id: 12, customer: { name: "Ada", email: "ada@example.com" }, items: ["tea", "cake", "jam"] }));
`,
    skeleton: `interface Order {
  id: number;
  customer: { name: string; email: string };
  items: string[];
}

const orderLine = ({ id, customer: { name }, items }: Order): string => {
  // "#<id> <name>, <count> item" or "... items"
};`,
    hints: ['In `customer: { name }`, the colon opens a nested pattern: `name` comes from `order.customer.name`, and no `customer` variable is created. A template literal builds the line: `` `#${id} ${name}, ${items.length} ${word}` ``.'],
    approach: [
      'Destructure `id`, `customer: { name }` and `items` in the parameter list.',
      'Pick the word: `item` when `items.length === 1`, otherwise `items`.',
      'Return the line built with a template literal.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'orderLine({ id: 12, customer: { name: "Ada", email: "ada@example.com" }, items: ["tea", "cake", "jam"] })', expected: '#12 Ada, 3 items' },
      { call: 'orderLine({ id: 100, customer: { name: "Dee Ray", email: "dee@example.com" }, items: ["a", "b"] })', expected: '#100 Dee Ray, 2 items', label: 'a name with a space' },
      { call: 'orderLine({ id: 7, customer: { name: "Bo", email: "bo@example.com" }, items: ["mug"] })', expected: '#7 Bo, 1 item', label: 'one item', edge: true },
      { call: 'orderLine({ id: 3, customer: { name: "Cy", email: "cy@example.com" }, items: [] })', expected: '#3 Cy, 0 items', label: 'no items', edge: true },
    ],
    typeTests: [
      { code: 'const __s: string = orderLine({ id: 1, customer: { name: "a", email: "e" }, items: [] });', label: 'gives back text' },
      { code: 'orderLine({ id: 1, name: "a", items: [] });', label: 'the name sits inside customer', rejects: true },
      { code: 'orderLine({ id: "1", customer: { name: "a", email: "e" }, items: [] });', label: 'the id is a number', rejects: true },
    ],
  },

  /* ── Map and Set ──────────────────────────────────────────────────── */
  {
    id: 'ts-easy3-squares-visited',
    track: 'typescript',
    topic: 'typescript',
    level: 10,
    tier: 2,
    focus: ['map-set', 'tuples'],
    title: 'Squares visited',
    prompt: 'A robot on a grid logs each position it passes as an `[x, y]` pair, and it can cross the same square more than once. Write `visited(path: readonly [number, number][]): number`, returning how many different squares it visited. `new Set(path)` does not work here: two arrays holding the same numbers are still two different objects, so the Set keeps both. Turn each pair into a text key such as `"2,3"` and count the keys in a `Set<string>`.',
    starter: `const visited = (path) => {

};

// Scratch pad. Change this and press Run.
console.log(visited([[0, 0], [1, 0], [0, 0]]));
`,
    skeleton: `const visited = (path: readonly [number, number][]): number => {
  const seen = new Set<string>();
  for (const [x, y] of path) {
    // add a text key made from x and y
  }
  return seen.size;
};`,
    hints: ['A Set compares objects by identity and strings by value. `` `${x},${y}` `` gives the same text for the same square every time, and the comma keeps `[1, 23]` apart from `[12, 3]`. `seen.size` is the count.'],
    approach: [
      'Create an empty `Set<string>`.',
      'For each `[x, y]`, add a key such as `` `${x},${y}` ``.',
      'Return `seen.size`.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'visited([[0, 0], [1, 0], [0, 0]])', expected: 2 },
      { call: 'visited([[0, 0], [0, 1], [1, 1], [1, 0]])', expected: 4, label: 'four different squares' },
      { call: 'visited([])', expected: 0, label: 'no moves', edge: true },
      { call: 'visited([[2, 3], [2, 3], [2, 3]])', expected: 1, label: 'the same square three times', edge: true },
    ],
    typeTests: [
      { code: 'const __n: number = visited([[0, 0]]);', label: 'gives back a count' },
      { code: 'visited([[0, 0, 0]]);', label: 'each position is an x and a y', rejects: true },
      { code: 'visited([["0", "0"]]);', label: 'coordinates are numbers', rejects: true },
    ],
  },

  /* ── two pointers ─────────────────────────────────────────────────── */
  {
    id: 'ts-easy3-pages-as-ranges',
    track: 'typescript',
    topic: 'typescript',
    level: 22,
    tier: 2,
    focus: ['two-pointer', 'strings'],
    title: 'Pages as ranges',
    prompt: 'A print dialog shows the pages you picked as ranges: `[1, 2, 3, 7, 8, 10]` reads `"1-3, 7-8, 10"`. Write `toRanges(pages: readonly number[]): string`. The pages are sorted, with no repeats. Keep two indexes: `start` on the first page of a run, and `end`, which moves forward while the next page is one more than the page at `end`. Write the run as `"start-end"`, or as one number when it holds a single page, then begin the next run after `end`. Join the runs with `", "`. No pages give `""`.',
    starter: `const toRanges = (pages: readonly number[]): string => {

};

// Scratch pad. Change this and press Run.
console.log(toRanges([1, 2, 3, 7, 8, 10]));
`,
    skeleton: `const toRanges = (pages: readonly number[]): string => {
  const runs: string[] = [];
  let start = 0;
  while (start < pages.length) {
    let end = start;
    // move end forward while the next page follows on
    // push one run, then start the next one after end
  }
  return runs.join(", ");
};`,
    hints: ['A run goes on while `pages[end + 1] === pages[end] + 1`. When it stops, the run covers `pages[start]` to `pages[end]`, and the next run starts at `end + 1`.'],
    approach: [
      'Set `start` to 0 and loop while it is inside the list.',
      'Set `end` to `start`, and move it forward while the next page is one more than `pages[end]`.',
      'Push `` `${pages[start]}-${pages[end]}` ``, or the single page when `start === end`, then set `start` to `end + 1`. Join the runs with `", "`.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'toRanges([1, 2, 3, 7, 8, 10])', expected: '1-3, 7-8, 10' },
      { call: 'toRanges([4])', expected: '4', label: 'a single page' },
      { call: 'toRanges([])', expected: '', label: 'no pages', edge: true },
      { call: 'toRanges([1, 3, 5])', expected: '1, 3, 5', label: 'no two pages in a row', edge: true },
      { call: 'toRanges([5, 6, 7, 8])', expected: '5-8', label: 'one long run', edge: true },
    ],
    typeTests: [
      { code: 'const __s: string = toRanges([1, 2]);', label: 'gives back text' },
      { code: 'const __f: (pages: readonly number[]) => string = toRanges;', label: 'accepts a read-only list' },
      { code: 'toRanges(["1", "2"]);', label: 'pages are numbers', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-alternate-playlists',
    track: 'typescript',
    topic: 'typescript',
    level: 23,
    tier: 2,
    focus: ['two-pointer', 'generics'],
    title: 'Alternate two playlists',
    prompt: 'A party playlist takes turns between two guests’ lists: a song from `a`, then one from `b`, then the next from `a`, and so on. When one list runs out, the rest of the other follows in order. Write `alternate<T>(a: readonly T[], b: readonly T[]): T[]`, with one index for each list. The type parameter lets it work for song titles, ids or any other items, as long as both lists hold the same kind.',
    starter: `const alternate = (a, b) => {

};

// Scratch pad. Change this and press Run.
console.log(alternate(["Intro", "Wave"], ["Tide", "Drift", "Echo"]));
`,
    skeleton: `const alternate = <T>(a: readonly T[], b: readonly T[]): T[] => {
  const mixed: T[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    // take a[i] when a has items left, then b[j] when b has items left
  }
  return mixed;
};`,
    hints: ['Inside the loop, take `a[i]` when `i` is still in range, then `b[j]` when `j` is. Each index moves only when its own list gave an item, so the longer list carries on after the shorter one ends. Test the index, not the item: a song called `""` or an id of `0` is still an item.'],
    approach: [
      'Start an index at 0 for each list, and an empty result.',
      'Loop while either index is still in range.',
      'Push `a[i]` and move `i` when `a` has items left, then do the same for `b` and `j`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'alternate(["Intro", "Wave"], ["Tide", "Drift", "Echo"])', expected: ['Intro', 'Tide', 'Wave', 'Drift', 'Echo'] },
      { call: 'alternate([1, 3, 5], [2, 4, 6])', expected: [1, 2, 3, 4, 5, 6], label: 'two lists of the same length' },
      { call: 'alternate([], ["x", "y"])', expected: ['x', 'y'], label: 'one list is empty', edge: true },
      { call: 'alternate(["a", "b", "c"], ["z"])', expected: ['a', 'z', 'b', 'c'], label: 'the first list is longer', edge: true },
    ],
    typeTests: [
      { code: 'const __s: string[] = alternate(["a"], ["b"]);', label: 'strings in, strings out' },
      { code: 'const __n: number[] = alternate([1], [2]);', label: 'numbers in, numbers out' },
      { code: 'const __x: string[] = alternate([1], [2]);', label: 'numbers do not come out as strings', rejects: true },
      { code: 'alternate(["a"], [1]);', label: 'both lists hold the same kind of item', rejects: true },
    ],
  },

  /* ── type guards and narrowing ────────────────────────────────────── */
  {
    id: 'ts-easy3-check-the-json',
    track: 'typescript',
    topic: 'typescript',
    level: 12,
    tier: 2,
    focus: ['type-guards', 'json'],
    title: 'Check the JSON first',
    prompt: '`JSON.parse` returns `any`, so the compiler believes whatever you say came back. Write `isUser(value: unknown): value is User`, returning `true` only for an object whose `name` is a string and whose `age` is a number. Then write `readUser(text: string): User | null`: parse the text, which is always valid JSON, and return the result when `isUser` accepts it, or `null` when it does not. `null` is valid JSON too, and `typeof null` is `"object"`.',
    starter: `interface User {
  name: string;
  age: number;
}

const isUser = (value) => {

};

const readUser = (text) => {

};

// Scratch pad. Change this and press Run.
console.log(readUser('{"name":"Ada","age":36}'), readUser('{"name":"Ada"}'));
`,
    skeleton: `interface User {
  name: string;
  age: number;
}

const isUser = (value: unknown): value is User => {
  if (typeof value !== "object" || value === null) return false;
  // "name" in value lets you read value.name: check that it is a string
  // then do the same for age, with "number"
};

const readUser = (text: string): User | null => {
  const value: unknown = JSON.parse(text);
  // the value when isUser accepts it, otherwise null
};`,
    hints: ['Store the parsed result as `unknown`, not `any`, and the compiler makes you check it before you use it. After `typeof value === "object" && value !== null`, the test `"name" in value` lets you read `value.name` and check its type with `typeof`.'],
    approach: [
      'In `isUser`, return `false` unless the value is an object and not `null`.',
      'Return `"name" in value && typeof value.name === "string"`, joined with the same check for `age` and `"number"`.',
      'In `readUser`, parse the text into an `unknown`, and return it when `isUser` says yes, or `null` otherwise.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'readUser(JSON.stringify({ name: "Ada", age: 36 }))', expected: { name: 'Ada', age: 36 } },
      { call: 'readUser(JSON.stringify({ name: "Ada" }))', expected: null, label: 'no age' },
      { call: 'readUser(JSON.stringify({ name: "Ada", age: "36" }))', expected: null, label: 'an age in quotes is text', edge: true },
      { call: 'readUser("null")', expected: null, label: 'null is valid JSON', edge: true },
      { call: 'isUser({ name: "Bo", age: 0 })', expected: true, label: 'an age of 0 is still a number', edge: true },
    ],
    typeTests: [
      { code: 'const __u: User | null = readUser("{}");', label: 'gives back a user or null' },
      { code: 'const __v: unknown = 1; if (isUser(__v)) { const __n: string = __v.name; }', label: 'a checked value is a User' },
      { code: 'const __w: unknown = 1; const __m: string = __w.name;', label: 'an unchecked value cannot be read', rejects: true },
      { code: 'const __r: User = readUser("{}");', label: 'check for null before using the result', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-data-or-error',
    track: 'typescript',
    topic: 'typescript',
    level: 11,
    tier: 2,
    focus: ['narrowing', 'filter'],
    title: 'Data or an error',
    prompt: 'A batch of API replies holds two shapes: `{ data }` when a call worked and `{ error }` when it failed. There is no shared `kind` field to compare, so narrow with the `in` operator: inside `if ("error" in reply)`, TypeScript knows `reply` is the error shape. Write `errorsOf(replies: readonly Reply[]): string[]`, returning every error message, in order.',
    starter: `type Reply = { data: string[] } | { error: string };

const errorsOf = (replies) => {

};

// Scratch pad. Change this and press Run.
console.log(errorsOf([{ data: ["a"] }, { error: "Timeout" }]));
`,
    skeleton: `type Reply = { data: string[] } | { error: string };

const errorsOf = (replies: readonly Reply[]): string[] =>
  replies
    .filter((reply): reply is { error: string } => {
      // is this an error reply?
    })
    .map((reply) => reply.error);`,
    hints: ['`reply.error` does not compile on a plain `Reply`, because the data shape has no `error`. The check `"error" in reply` narrows it. Type the `filter` callback as `reply is { error: string }`, and the `map` after it can read `.error`.'],
    approach: [
      'Filter the replies, keeping those where `"error" in reply`.',
      'Type the callback as a predicate, so the filtered array holds only error replies.',
      'Map each one to its `error` message.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'errorsOf([{ data: ["a"] }, { error: "Timeout" }, { error: "Not found" }])', expected: ['Timeout', 'Not found'] },
      { call: 'errorsOf([{ data: [] }, { data: ["x"] }])', expected: [], label: 'every call worked', edge: true },
      { call: 'errorsOf([])', expected: [], label: 'no replies', edge: true },
      { call: 'errorsOf([{ error: "" }])', expected: [''], label: 'an empty message is still an error', edge: true },
    ],
    typeTests: [
      { code: 'const __e: string[] = errorsOf([{ error: "x" }]);', label: 'gives back the messages' },
      { code: 'errorsOf([{ data: [1] }]);', label: 'data holds text', rejects: true },
      { code: 'errorsOf([{ message: "x" }]);', label: 'only the two reply shapes', rejects: true },
    ],
  },

  /* ── literal types and unions ─────────────────────────────────────── */
  {
    id: 'ts-easy3-next-light',
    track: 'typescript',
    topic: 'typescript',
    level: 8,
    tier: 1,
    focus: ['literal-types', 'record'],
    title: 'The next traffic light',
    prompt: 'A traffic light shows `"red"`, then `"green"`, then `"amber"`, then red again. Declare `type Light = "red" | "green" | "amber"` and a table `const NEXT: Record<Light, Light>` that maps each light to the one after it. Then write `nextLight(light: Light, steps: number): Light`, moving through the table `steps` times. Typed as `Record<Light, Light>`, the table cannot leave a light out or misspell one without a compile error.',
    starter: `const nextLight = (light, steps) => {

};

// Scratch pad. Change this and press Run.
console.log(nextLight("red", 1));
`,
    skeleton: `type Light = "red" | "green" | "amber";

const NEXT: Record<Light, Light> = {
  // one entry per light
};

const nextLight = (light: Light, steps: number): Light => {
  let current = light;
  // replace current with NEXT[current], steps times
  return current;
};`,
    hints: ['Look the next light up with `NEXT[current]`. The `Record<Light, Light>` type makes the compiler check that every light has an entry and that every value is a real light. A `for` loop that runs `steps` times does the moving.'],
    approach: [
      'Declare `Light` as a union of the three strings.',
      'Fill `NEXT`: red to green, green to amber, amber to red.',
      'Start from `light` and replace it with `NEXT[current]`, `steps` times.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'nextLight("red", 1)', expected: 'green' },
      { call: 'nextLight("amber", 1)', expected: 'red', label: 'amber goes back to red' },
      { call: 'nextLight("red", 3)', expected: 'red', label: 'three steps make a full cycle', edge: true },
      { call: 'nextLight("green", 0)', expected: 'green', label: 'no steps', edge: true },
    ],
    typeTests: [
      { code: 'const __l: Light = nextLight("red", 2);', label: 'gives back a light' },
      { code: 'const __t: Record<Light, Light> = NEXT;', label: 'the table covers every light' },
      { code: 'nextLight("blue", 1);', label: 'only the three lights', rejects: true },
      { code: 'const __x: Light = "yellow";', label: 'amber is spelled amber', rejects: true },
    ],
  },
  {
    id: 'ts-easy3-all-in-celsius',
    track: 'typescript',
    topic: 'typescript',
    level: 11,
    tier: 2,
    focus: ['map', 'unions'],
    title: 'Every reading in Celsius',
    prompt: 'Weather stations report in Celsius or in Fahrenheit, and each `Reading` names its scale in `unit`. Write `toCelsius(readings: readonly Reading[]): number[]`, returning one Celsius value per reading with `map`. A Celsius reading stays as it is. A Fahrenheit one becomes `(value - 32) * 5 / 9`, rounded to one decimal place with `Math.round(celsius * 10) / 10`.',
    starter: `type Reading =
  | { unit: "C"; value: number }
  | { unit: "F"; value: number };

const toCelsius = (readings) => {

};

// Scratch pad. Change this and press Run.
console.log(toCelsius([{ unit: "C", value: 21 }, { unit: "F", value: 212 }]));
`,
    skeleton: `type Reading =
  | { unit: "C"; value: number }
  | { unit: "F"; value: number };

const toCelsius = (readings: readonly Reading[]): number[] =>
  readings.map((reading) => {
    // a C reading as it is; an F reading converted, then rounded
  });`,
    hints: ['Check `reading.unit` inside the callback. `map` needs a number back for every reading, the Celsius ones included, or that slot ends up `undefined`. Round only the converted value.'],
    approach: [
      'Map over the readings.',
      'When `unit` is `"C"`, return `value` unchanged.',
      'When it is `"F"`, convert, then round with `Math.round(celsius * 10) / 10`.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'toCelsius([{ unit: "C", value: 21 }, { unit: "F", value: 212 }])', expected: [21, 100] },
      { call: 'toCelsius([{ unit: "F", value: 98.6 }])', expected: [37], label: 'body temperature' },
      { call: 'toCelsius([{ unit: "F", value: 0 }])', expected: [-17.8], label: 'below freezing, rounded', edge: true },
      { call: 'toCelsius([])', expected: [], label: 'no readings', edge: true },
      { call: 'toCelsius([{ unit: "C", value: -3.25 }])', expected: [-3.25], label: 'a Celsius reading is not rounded', edge: true },
    ],
    typeTests: [
      { code: 'const __c: number[] = toCelsius([{ unit: "C", value: 1 }]);', label: 'gives back numbers' },
      { code: 'toCelsius([{ unit: "K", value: 300 }]);', label: 'only Celsius and Fahrenheit', rejects: true },
      { code: 'toCelsius([{ unit: "C" }]);', label: 'every reading has a value', rejects: true },
    ],
  },
];
