// Server-only reference solutions and hidden tests for lib/coding/tasks/easy-typescript-b.ts.
// Never import from client code. The hidden tests aim at the shortcut each
// visible set leaves open: a hard-coded answer, a changed input, a value or a
// shape the visible tests never used, and the case the technique exists for.

import type { CodingSolution } from '../types';

export const EASY_TYPESCRIPT_B_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── utility types ────────────────────────────────────────────────── */
  'ts-easy3-save-a-new-todo': {
    solution: `interface Todo {
  id: number;
  title: string;
  done: boolean;
}

// The caller cannot pick an id: Omit takes it out of the type.
type NewTodo = Omit<Todo, "id">;

const addTodo = (todos: readonly Todo[], draft: NewTodo): Todo[] => {
  // Starting from 0 means an empty list hands out id 1.
  const id = Math.max(0, ...todos.map((todo) => todo.id)) + 1;
  // A new array, so the list passed in keeps its length.
  return [...todos, { id, ...draft }];
};`,
    junior: `interface Todo {
  id: number;
  title: string;
  done: boolean;
}

type NewTodo = Omit<Todo, "id">;

const addTodo = (todos: readonly Todo[], draft: NewTodo): Todo[] => {
  let highest = 0;
  for (const todo of todos) {
    if (todo.id > highest) {
      highest = todo.id;
    }
  }
  const todo: Todo = { id: highest + 1, title: draft.title, done: draft.done };
  const next: Todo[] = [...todos];
  next.push(todo);
  return next;
};`,
    senior: `interface Todo {
  id: number;
  title: string;
  done: boolean;
}

type NewTodo = Omit<Todo, "id">;

const nextId = (todos: readonly Todo[]): number =>
  todos.reduce((highest, todo) => Math.max(highest, todo.id), 0) + 1;

const addTodo = (todos: readonly Todo[], draft: NewTodo): Todo[] => [
  ...todos,
  { id: nextId(todos), ...draft },
];`,
    hiddenTests: [
      { call: 'addTodo(Object.freeze([{ id: 2, title: "x", done: false }]), { title: "y", done: true })', expected: [{ id: 2, title: 'x', done: false }, { id: 3, title: 'y', done: true }] },
      { call: 'addTodo([{ id: 10, title: "a", done: false }, { id: 11, title: "b", done: false }, { id: 4, title: "c", done: false }], { title: "d", done: false })[3]', expected: { id: 12, title: 'd', done: false } },
      { call: '(() => { const draft = { title: "z", done: false }; addTodo([], draft); return draft; })()', expected: { title: 'z', done: false } },
      { call: 'addTodo([{ id: 1, title: "a", done: false }], { title: "a", done: false }).length', expected: 2 },
    ],
    hiddenTypeTests: [
      { code: 'const __n: NewTodo = { title: "a", done: false, id: 1 };', label: 'NewTodo has no id', rejects: true },
    ],
  },
  'ts-easy3-only-the-clicks': {
    solution: `type UiEvent =
  | { kind: "click"; x: number; y: number }
  | { kind: "key"; key: string };

// Extract keeps the union members that fit the shape: here, only the click.
type Click = Extract<UiEvent, { kind: "click" }>;

const clicks = (events: readonly UiEvent[]): Click[] =>
  // The predicate return type is what types the filtered array as Click[].
  events.filter((event): event is Click => event.kind === "click");`,
    junior: `type UiEvent =
  | { kind: "click"; x: number; y: number }
  | { kind: "key"; key: string };

type Click = Extract<UiEvent, { kind: "click" }>;

const clicks = (events: readonly UiEvent[]): Click[] => {
  const result: Click[] = [];
  for (const event of events) {
    if (event.kind === "click") {
      result.push(event);
    }
  }
  return result;
};`,
    senior: `type UiEvent =
  | { kind: "click"; x: number; y: number }
  | { kind: "key"; key: string };

type Click = Extract<UiEvent, { kind: "click" }>;

const isClick = (event: UiEvent): event is Click => event.kind === "click";

const clicks = (events: readonly UiEvent[]): Click[] => events.filter(isClick);`,
    hiddenTests: [
      { call: 'clicks([{ kind: "key", key: "a" }, { kind: "click", x: 3, y: 4 }, { kind: "key", key: "b" }, { kind: "click", x: 9, y: 9 }]).map((click) => click.x)', expected: [3, 9] },
      { call: '(() => { const events = [{ kind: "click", x: 1, y: 1 }]; return clicks(events) !== events; })()', expected: true },
      { call: 'clicks([{ kind: "click", x: -2, y: 7 }, { kind: "click", x: 4, y: -1 }])', expected: [{ kind: 'click', x: -2, y: 7 }, { kind: 'click', x: 4, y: -1 }] },
    ],
  },
  'ts-easy3-complete-profile': {
    solution: `interface Profile {
  name: string;
  email?: string;
  phone?: string;
}

// After a true result the caller may read email and phone as plain strings.
const isComplete = (profile: Profile): profile is Required<Profile> =>
  // An empty string counts as missing, so each field is compared with "" too.
  profile.email !== undefined && profile.email !== "" &&
  profile.phone !== undefined && profile.phone !== "";`,
    junior: `interface Profile {
  name: string;
  email?: string;
  phone?: string;
}

const isComplete = (profile: Profile): profile is Required<Profile> => {
  if (profile.email === undefined || profile.email === "") {
    return false;
  }
  if (profile.phone === undefined || profile.phone === "") {
    return false;
  }
  return true;
};`,
    senior: `interface Profile {
  name: string;
  email?: string;
  phone?: string;
}

const isComplete = (profile: Profile): profile is Required<Profile> =>
  Boolean(profile.email && profile.phone);`,
    hiddenTests: [
      { call: 'isComplete({ name: "Bo", phone: "555 0101" })', expected: false },
      { call: 'isComplete({ name: "Bo", email: "bo@example.com", phone: "" })', expected: false },
      { call: 'isComplete({ name: "Cy", email: "cy@example.com", phone: "0" })', expected: true },
      { call: '[{ name: "A", email: "a@example.com", phone: "1" }, { name: "B" }, { name: "C", email: "c@example.com", phone: "3" }].filter(isComplete).map((p) => p.name)', expected: ['A', 'C'] },
    ],
    hiddenTypeTests: [
      { code: 'const __g: (p: Profile) => p is Required<Profile> = isComplete;', label: 'isComplete is a type predicate' },
    ],
  },
  'ts-easy3-receipt-total': {
    solution: `const parseLine = (line: string) => {
  const [name, qty, cents] = line.split(",");
  return { name, qty: Number(qty), cents: Number(cents) };
};

// The type is read off the function, so it changes when parseLine does.
type Line = ReturnType<typeof parseLine>;

const orderTotal = (lines: readonly Line[]): number =>
  // The 0 is the total of an empty receipt, and reduce needs it to start from.
  lines.reduce((total, line) => total + line.qty * line.cents, 0);`,
    junior: `const parseLine = (line: string) => {
  const [name, qty, cents] = line.split(",");
  return { name, qty: Number(qty), cents: Number(cents) };
};

type Line = ReturnType<typeof parseLine>;

const orderTotal = (lines: readonly Line[]): number => {
  let total = 0;
  for (const line of lines) {
    const cost = line.qty * line.cents;
    total = total + cost;
  }
  return total;
};`,
    senior: `const parseLine = (line: string) => {
  const [name, qty, cents] = line.split(",");
  return { name, qty: Number(qty), cents: Number(cents) };
};

type Line = ReturnType<typeof parseLine>;

const lineCost = ({ qty, cents }: Line): number => qty * cents;

const orderTotal = (lines: readonly Line[]): number =>
  lines.reduce((total, line) => total + lineCost(line), 0);`,
    hiddenTests: [
      { call: 'orderTotal([parseLine("a,1,1"), parseLine("b,2,2"), parseLine("c,3,3")])', expected: 14 },
      { call: 'orderTotal([parseLine("gift,5,0")])', expected: 0 },
      { call: 'orderTotal(Object.freeze([parseLine("x,10,99")]))', expected: 990 },
    ],
    hiddenTypeTests: [
      { code: 'const __m: Line = { name: "x", qty: 1 };', label: 'a line needs its price', rejects: true },
    ],
  },

  /* ── generic constraints ──────────────────────────────────────────── */
  'ts-easy3-newest-version': {
    solution: `const latest = <T extends { id: string; version: number }>(records: readonly T[]): T[] => {
  const byId = new Map<string, T>();
  for (const record of records) {
    const kept = byId.get(record.id);
    // Strictly higher, so a tie keeps the record that arrived first.
    if (kept === undefined || record.version > kept.version) {
      // set on a key the Map already holds keeps the key in its first place.
      byId.set(record.id, record);
    }
  }
  return [...byId.values()];
};`,
    junior: `const latest = <T extends { id: string; version: number }>(records: readonly T[]): T[] => {
  const result: T[] = [];
  for (const record of records) {
    let found = -1;
    for (let i = 0; i < result.length; i++) {
      if (result[i].id === record.id) {
        found = i;
      }
    }
    if (found === -1) {
      result.push(record);
    } else if (record.version > result[found].version) {
      result[found] = record;
    }
  }
  return result;
};`,
    senior: `const latest = <T extends { readonly id: string; readonly version: number }>(records: readonly T[]): T[] => {
  const byId = new Map<string, T>();
  for (const record of records) {
    if (record.version > (byId.get(record.id)?.version ?? -Infinity)) byId.set(record.id, record);
  }
  return Array.from(byId.values());
};`,
    hiddenTests: [
      { call: 'latest([{ id: "b", version: 1 }, { id: "a", version: 5 }, { id: "b", version: 4 }, { id: "c", version: 1 }, { id: "a", version: 2 }]).map((r) => r.id + r.version)', expected: ['b4', 'a5', 'c1'] },
      { call: 'latest([{ id: "a", version: 1 }, { id: "b", version: 1 }, { id: "a", version: 9 }]).map((r) => r.id)', expected: ['a', 'b'] },
      { call: 'latest([{ id: "z", version: 1, v: "old" }, { id: "z", version: 2, v: "mid" }, { id: "z", version: 2, v: "late" }])[0].v', expected: 'mid' },
      { call: 'latest([{ id: "a", version: 0 }])', expected: [{ id: 'a', version: 0 }] },
      { call: 'latest([{ id: "a", version: 0 }, { id: "a", version: 3 }])', expected: [{ id: 'a', version: 3 }] },
    ],
  },
  'ts-easy3-swap-in-the-edit': {
    solution: `// map returns a new array of the same length, so the order and the caller's list stay as they were.
const replaceById = <T extends { id: number }>(items: readonly T[], edited: T): T[] =>
  items.map((item) => (item.id === edited.id ? edited : item));`,
    junior: `const replaceById = <T extends { id: number }>(items: readonly T[], edited: T): T[] => {
  const result: T[] = [];
  for (const item of items) {
    if (item.id === edited.id) {
      result.push(edited);
    } else {
      result.push(item);
    }
  }
  return result;
};`,
    senior: `const replaceById = <T extends { readonly id: number }>(items: readonly T[], edited: T): T[] => {
  const index = items.findIndex(({ id }) => id === edited.id);
  return index === -1 ? [...items] : items.with(index, edited);
};`,
    hiddenTests: [
      { call: '(() => { const a = { id: 1 }; const b = { id: 2 }; const out = replaceById([a, b], { id: 2 }); return out[0] === a; })()', expected: true },
      { call: '(() => { const list = [{ id: 1 }]; return replaceById(list, { id: 5 }) !== list; })()', expected: true },
      { call: 'replaceById([{ id: 4, v: "a" }, { id: 5, v: "b" }, { id: 6, v: "c" }], { id: 6, v: "z" }).map((x) => x.v)', expected: ['a', 'b', 'z'] },
      { call: 'replaceById(Object.freeze([{ id: 0, v: 1 }, { id: 1, v: 2 }]), { id: 0, v: 9 })', expected: [{ id: 0, v: 9 }, { id: 1, v: 2 }] },
    ],
  },

  /* ── for and tuples ───────────────────────────────────────────────── */
  'ts-easy3-route-legs': {
    solution: `const legs = (stops: readonly string[]): [string, string][] => {
  // Annotated as pairs: without it, [a, b] would widen to string[].
  const pairs: [string, string][] = [];
  // Stop one short of the end, so stops[i + 1] always exists.
  for (let i = 0; i < stops.length - 1; i++) {
    pairs.push([stops[i], stops[i + 1]]);
  }
  return pairs;
};`,
    junior: `const legs = (stops: readonly string[]): [string, string][] => {
  const pairs: [string, string][] = [];
  if (stops.length < 2) {
    return pairs;
  }
  for (let i = 1; i < stops.length; i++) {
    const from = stops[i - 1];
    const to = stops[i];
    pairs.push([from, to]);
  }
  return pairs;
};`,
    senior: `const legs = (stops: readonly string[]): [string, string][] =>
  stops.slice(1).map((to, i): [string, string] => [stops[i], to]);`,
    hiddenTests: [
      { call: 'legs(["a", "b", "c", "d"]).length', expected: 3 },
      { call: 'legs(["x", "y", "z", "w"])[2]', expected: ['z', 'w'] },
      { call: 'legs(Object.freeze(["p", "q"]))', expected: [['p', 'q']] },
    ],
  },
  'ts-easy3-every-nth': {
    solution: `const everyNth = <T>(items: readonly T[], n: number): T[] => {
  const picked: T[] = [];
  // Below 1, i += n would never move forward.
  if (n < 1) return picked;
  // Position n, counting from 1, is index n - 1; each step jumps n places.
  for (let i = n - 1; i < items.length; i += n) {
    picked.push(items[i]);
  }
  return picked;
};`,
    junior: `const everyNth = <T>(items: readonly T[], n: number): T[] => {
  const picked: T[] = [];
  if (n < 1) {
    return picked;
  }
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    count = count + 1;
    if (count === n) {
      picked.push(items[i]);
      count = 0;
    }
  }
  return picked;
};`,
    senior: `const everyNth = <T>(items: readonly T[], n: number): T[] =>
  n < 1 ? [] : items.filter((_, index) => (index + 1) % n === 0);`,
    hiddenTests: [
      { call: 'everyNth([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 2)', expected: [1, 3, 5, 7, 9] },
      { call: 'everyNth(["a", "b", "c"], 3)', expected: ['c'] },
      { call: 'everyNth([1, 2, 3], -2)', expected: [] },
      { call: 'everyNth([], 2)', expected: [] },
    ],
  },

  /* ── keyof ────────────────────────────────────────────────────────── */
  'ts-easy3-setting-or-default': {
    solution: `interface Settings {
  theme: "light" | "dark";
  fontSize: number;
  sounds: boolean;
}

const DEFAULTS: Settings = { theme: "light", fontSize: 16, sounds: true };

// Settings[K] is the type of the one setting asked for, so each call gets its own type.
const settingOr = <K extends keyof Settings>(saved: Partial<Settings>, key: K): Settings[K] =>
  // ?? falls back only when nothing is saved: a saved false or 0 stays.
  saved[key] ?? DEFAULTS[key];`,
    junior: `interface Settings {
  theme: "light" | "dark";
  fontSize: number;
  sounds: boolean;
}

const DEFAULTS: Settings = { theme: "light", fontSize: 16, sounds: true };

const settingOr = <K extends keyof Settings>(saved: Partial<Settings>, key: K): Settings[K] => {
  const value: Settings[K] | undefined = saved[key];
  if (value === undefined) {
    return DEFAULTS[key];
  }
  return value;
};`,
    senior: `interface Settings {
  theme: "light" | "dark";
  fontSize: number;
  sounds: boolean;
}

const DEFAULTS: Readonly<Settings> = { theme: "light", fontSize: 16, sounds: true };

function settingOr<K extends keyof Settings>(saved: Readonly<Partial<Settings>>, key: K): Settings[K] {
  return saved[key] ?? DEFAULTS[key];
}`,
    hiddenTests: [
      { call: 'settingOr({ theme: "dark", fontSize: 12 }, "theme")', expected: 'dark' },
      { call: 'settingOr({ theme: "dark" }, "fontSize")', expected: 16 },
      { call: 'settingOr({ fontSize: undefined }, "fontSize")', expected: 16 },
      { call: '(() => { settingOr({ sounds: false, fontSize: 30 }, "sounds"); return [DEFAULTS.sounds, DEFAULTS.fontSize]; })()', expected: [true, 16] },
    ],
  },
  'ts-easy3-change-one-field': {
    solution: `interface Product {
  name: string;
  price: number;
  inStock: boolean;
}

// Product[K] ties the value to the key: a price takes a number, a name takes text.
const setField = <K extends keyof Product>(product: Product, key: K, value: Product[K]): Product =>
  // Spread first, then the computed key, so the new value wins.
  ({ ...product, [key]: value });`,
    junior: `interface Product {
  name: string;
  price: number;
  inStock: boolean;
}

const setField = <K extends keyof Product>(product: Product, key: K, value: Product[K]): Product => {
  const copy: Product = { ...product };
  copy[key] = value;
  return copy;
};`,
    senior: `interface Product {
  name: string;
  price: number;
  inStock: boolean;
}

function setField<K extends keyof Product>(product: Readonly<Product>, key: K, value: Product[K]): Product {
  return Object.assign({}, product, { [key]: value });
}`,
    hiddenTests: [
      { call: '(() => { const p = { name: "a", price: 1, inStock: true }; return setField(p, "name", "b") !== p; })()', expected: true },
      { call: 'Object.keys(setField({ name: "a", price: 1, inStock: true }, "name", "z"))', expected: ['name', 'price', 'inStock'] },
      { call: 'setField(setField({ name: "a", price: 1, inStock: true }, "price", 5), "name", "z")', expected: { name: 'z', price: 5, inStock: true } },
      { call: 'setField({ name: "a", price: 1, inStock: true }, "price", 0)', expected: { name: 'a', price: 0, inStock: true } },
    ],
    hiddenTypeTests: [
      { code: 'setField({ name: "a", price: 1, inStock: true }, "name", 3);', label: 'the name takes text', rejects: true },
    ],
  },

  /* ── spread and objects ───────────────────────────────────────────── */
  'ts-easy3-pin-to-top': {
    solution: `const pinToTop = (chats: readonly string[], chat: string): string[] => {
  // A chat that is not in the list stays out of it.
  if (!chats.includes(chat)) return [...chats];
  // filter builds the rest in its old order; the spread puts it after the pinned chat.
  return [chat, ...chats.filter((other) => other !== chat)];
};`,
    junior: `const pinToTop = (chats: readonly string[], chat: string): string[] => {
  const rest: string[] = [];
  let found = false;
  for (const other of chats) {
    if (other === chat) {
      found = true;
    } else {
      rest.push(other);
    }
  }
  if (found) {
    return [chat, ...rest];
  }
  return rest;
};`,
    senior: `const pinToTop = (chats: readonly string[], chat: string): string[] =>
  chats.includes(chat) ? [chat, ...chats.filter((other) => other !== chat)] : [...chats];`,
    hiddenTests: [
      { call: 'pinToTop(Object.freeze(["a", "b", "c", "d"]), "c")', expected: ['c', 'a', 'b', 'd'] },
      { call: '(() => { const chats = ["a", "b"]; return pinToTop(chats, "x") !== chats; })()', expected: true },
      { call: 'pinToTop(["solo"], "solo")', expected: ['solo'] },
      { call: 'pinToTop(["a", "b", "c"], "b")', expected: ['b', 'a', 'c'] },
    ],
  },
  'ts-easy3-move-house': {
    solution: `interface Address {
  street: string;
  city: string;
}

interface User {
  name: string;
  address: Address;
}

const moveTo = (user: User, city: string): User => ({
  ...user,
  // A second spread: without it the new user would share the old address object.
  address: { ...user.address, city },
});`,
    junior: `interface Address {
  street: string;
  city: string;
}

interface User {
  name: string;
  address: Address;
}

const moveTo = (user: User, city: string): User => {
  const address: Address = {
    street: user.address.street,
    city: city,
  };
  const moved: User = {
    name: user.name,
    address: address,
  };
  return moved;
};`,
    senior: `interface Address {
  street: string;
  city: string;
}

interface User {
  name: string;
  address: Address;
}

const moveTo = ({ address, ...rest }: Readonly<User>, city: string): User => ({
  ...rest,
  address: { ...address, city },
});`,
    hiddenTests: [
      { call: '(() => { const u = { name: "Cy", address: { street: "3 Row", city: "Hull" } }; return moveTo(u, "Ely") !== u; })()', expected: true },
      { call: 'moveTo({ name: "Dee", address: { street: "", city: "" } }, "Wells")', expected: { name: 'Dee', address: { street: '', city: 'Wells' } } },
      { call: '(() => { const u = { name: "Eve", address: { street: "5 Lane", city: "Kent" } }; const moved = moveTo(u, "Ayr"); return [u.name, u.address.street, u.address.city, moved.address.street]; })()', expected: ['Eve', '5 Lane', 'Kent', '5 Lane'] },
    ],
  },
  'ts-easy3-rank-the-scores': {
    solution: `const ranked = (scores: Record<string, number>): [string, number][] =>
  // Object.entries builds a new array, so sorting it leaves scores alone.
  // b minus a puts the most points first; a tie gives 0 and keeps the order.
  Object.entries(scores).sort((a, b) => b[1] - a[1]);`,
    junior: `const ranked = (scores: Record<string, number>): [string, number][] => {
  const pairs: [string, number][] = [];
  for (const name of Object.keys(scores)) {
    pairs.push([name, scores[name]]);
  }
  pairs.sort((a, b) => {
    if (a[1] > b[1]) {
      return -1;
    }
    if (a[1] < b[1]) {
      return 1;
    }
    return 0;
  });
  return pairs;
};`,
    senior: `const ranked = (scores: Readonly<Record<string, number>>): [string, number][] =>
  Object.entries(scores).sort(([, a], [, b]) => b - a);`,
    hiddenTests: [
      { call: 'ranked({ a: 10, b: 9, c: 100, d: 2 }).map(([name]) => name)', expected: ['c', 'a', 'b', 'd'] },
      { call: 'ranked({ x: -1, y: 1 })', expected: [['y', 1], ['x', -1]] },
      { call: '(() => { const scores = { a: 1, b: 2 }; ranked(scores); return Object.keys(scores); })()', expected: ['a', 'b'] },
      { call: 'ranked({ a: 3, b: 3, c: 3, d: 3, e: 3, f: 3, g: 3, h: 3 }).map(([name]) => name)', expected: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
    ],
  },

  /* ── sort and strings ─────────────────────────────────────────────── */
  'ts-easy3-sort-ignoring-case': {
    solution: `const sortTitles = (titles: readonly string[]): string[] =>
  // Copy first: sort works in place, and the parameter is read-only.
  [...titles].sort((a, b) => {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    if (left < right) return -1;
    if (left > right) return 1;
    // 0 for titles that differ only in case keeps them in their order.
    return 0;
  });`,
    junior: `const sortTitles = (titles: readonly string[]): string[] => {
  const copy: string[] = [];
  for (const title of titles) {
    copy.push(title);
  }
  copy.sort((a, b) => {
    if (a.toLowerCase() < b.toLowerCase()) {
      return -1;
    }
    if (a.toLowerCase() > b.toLowerCase()) {
      return 1;
    }
    return 0;
  });
  return copy;
};`,
    senior: `const byLowerCase = (a: string, b: string): number => {
  const [left, right] = [a.toLowerCase(), b.toLowerCase()];
  return left < right ? -1 : left > right ? 1 : 0;
};

const sortTitles = (titles: readonly string[]): string[] => titles.toSorted(byLowerCase);`,
    hiddenTests: [
      { call: 'sortTitles(["the Hobbit", "The Road", "the end"])', expected: ['the end', 'the Hobbit', 'The Road'] },
      { call: 'sortTitles(Object.freeze(["c", "B", "a"]))', expected: ['a', 'B', 'c'] },
      { call: 'sortTitles(["ab", "AA", "Ac"])', expected: ['AA', 'ab', 'Ac'] },
      { call: 'sortTitles(["b", "B", "a", "A"])', expected: ['a', 'A', 'b', 'B'] },
      { call: 'sortTitles(["b", "B", "b", "B", "a", "A", "a", "A"])', expected: ['a', 'A', 'a', 'A', 'b', 'B', 'b', 'B'] },
    ],
  },

  /* ── while ────────────────────────────────────────────────────────── */
  'ts-easy3-retry-delays': {
    solution: `const retryDelays = (first: number, cap: number): readonly number[] => {
  const delays: number[] = [];
  // Doubling 0 or a negative wait never passes the cap, so the loop would never end.
  if (first <= 0) return delays;
  let wait = first;
  while (wait <= cap) {
    delays.push(wait);
    wait *= 2;
  }
  // A mutable array is assignable to readonly number[]; the caller sees only the read-only type.
  return delays;
};`,
    junior: `const retryDelays = (first: number, cap: number): readonly number[] => {
  const delays: number[] = [];
  if (first <= 0) {
    return delays;
  }
  let wait = first;
  let fits = wait <= cap;
  while (fits) {
    delays.push(wait);
    wait = wait * 2;
    fits = wait <= cap;
  }
  return delays;
};`,
    senior: `const retryDelays = (first: number, cap: number): readonly number[] => {
  const delays: number[] = [];
  for (let wait = first; first > 0 && wait <= cap; wait *= 2) delays.push(wait);
  return Object.freeze(delays);
};`,
    hiddenTests: [
      { call: 'retryDelays(1, 10)', expected: [1, 2, 4, 8] },
      { call: 'retryDelays(5, 5)', expected: [5] },
      { call: 'retryDelays(-10, 100)', expected: [] },
      { call: 'retryDelays(300, 299)', expected: [] },
    ],
  },
  'ts-easy3-read-headers': {
    solution: `const readHeaders = (lines: readonly string[]): Record<string, string> => {
  const headers: Record<string, string> = {};
  let i = 0;
  // The blank line ends the headers; everything after it is the body.
  while (i < lines.length && lines[i] !== "") {
    const line = lines[i];
    // Only the first ": " separates: a value may hold its own.
    const at = line.indexOf(": ");
    headers[line.slice(0, at).toLowerCase()] = line.slice(at + 2);
    i++;
  }
  return headers;
};`,
    junior: `const readHeaders = (lines: readonly string[]): Record<string, string> => {
  const headers: Record<string, string> = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === "") {
      break;
    }
    const parts = line.split(": ");
    const name = parts[0].toLowerCase();
    const value = parts.slice(1).join(": ");
    headers[name] = value;
    i = i + 1;
  }
  return headers;
};`,
    senior: `const readHeaders = (lines: readonly string[]): Record<string, string> => {
  const end = lines.indexOf("");
  const block = end === -1 ? lines : lines.slice(0, end);
  return Object.fromEntries(
    block.map((line) => {
      const at = line.indexOf(": ");
      return [line.slice(0, at).toLowerCase(), line.slice(at + 2)];
    }),
  );
};`,
    hiddenTests: [
      { call: 'readHeaders(["ACCEPT: */*", "User-Agent: shark/1.0", ""])', expected: { accept: '*/*', 'user-agent': 'shark/1.0' } },
      { call: 'readHeaders([])', expected: {} },
      { call: 'readHeaders(["Retry-After: 120", "", "", "X: y"])', expected: { 'retry-after': '120' } },
      { call: 'readHeaders(["Date: Mon, 01 Jan 2024 10:00:00 GMT"])', expected: { date: 'Mon, 01 Jan 2024 10:00:00 GMT' } },
    ],
  },

  /* ── destructuring ────────────────────────────────────────────────── */
  'ts-easy3-passed-the-mark': {
    solution: `const passed = (scores: Record<string, number>, mark: number): string[] => {
  const names: string[] = [];
  // Destructuring the entry names both halves of the [name, score] pair.
  for (const [name, score] of Object.entries(scores)) {
    if (score >= mark) names.push(name);
  }
  return names;
};`,
    junior: `const passed = (scores: Record<string, number>, mark: number): string[] => {
  const names: string[] = [];
  const entries = Object.entries(scores);
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const name = entry[0];
    const score = entry[1];
    if (score >= mark) {
      names.push(name);
    }
  }
  return names;
};`,
    senior: `const passed = (scores: Readonly<Record<string, number>>, mark: number): string[] =>
  Object.entries(scores)
    .filter(([, score]) => score >= mark)
    .map(([name]) => name);`,
    hiddenTests: [
      { call: 'passed({ Zed: 99, Amy: 99, Kai: 0 }, 99)', expected: ['Zed', 'Amy'] },
      { call: 'passed({ Ada: 0 }, 0)', expected: ['Ada'] },
      { call: 'passed({ a: 51, b: 50, c: 49, d: 100 }, 50)', expected: ['a', 'b', 'd'] },
    ],
  },
  'ts-easy3-order-line': {
    solution: `interface Order {
  id: number;
  customer: { name: string; email: string };
  items: string[];
}

// customer: { name } is a nested pattern: it reads order.customer.name and creates no customer variable.
const orderLine = ({ id, customer: { name }, items }: Order): string => {
  const word = items.length === 1 ? "item" : "items";
  return \`#\${id} \${name}, \${items.length} \${word}\`;
};`,
    junior: `interface Order {
  id: number;
  customer: { name: string; email: string };
  items: string[];
}

const orderLine = (order: Order): string => {
  const { id, customer, items } = order;
  const { name } = customer;
  let word = "items";
  if (items.length === 1) {
    word = "item";
  }
  return "#" + id + " " + name + ", " + items.length + " " + word;
};`,
    senior: `interface Order {
  id: number;
  customer: { name: string; email: string };
  items: string[];
}

const counted = (count: number, word: string): string => \`\${count} \${word}\${count === 1 ? "" : "s"}\`;

const orderLine = ({ id, customer: { name }, items: { length } }: Order): string =>
  \`#\${id} \${name}, \${counted(length, "item")}\`;`,
    hiddenTests: [
      { call: 'orderLine({ id: 0, customer: { name: "Eve", email: "" }, items: ["x", "y", "z", "w"] })', expected: '#0 Eve, 4 items' },
      { call: 'orderLine({ id: 45, customer: { name: "Fay", email: "fay@example.com" }, items: ["one"] })', expected: '#45 Fay, 1 item' },
      { call: 'orderLine({ id: 9, customer: { name: "Gus", email: "gus@example.com" }, items: ["a", "a"] })', expected: '#9 Gus, 2 items' },
    ],
  },

  /* ── Map and Set ──────────────────────────────────────────────────── */
  'ts-easy3-squares-visited': {
    solution: `const visited = (path: readonly [number, number][]): number => {
  // Strings compare by value; two [x, y] arrays never do.
  const seen = new Set<string>();
  for (const [x, y] of path) {
    // The comma keeps [1, 23] and [12, 3] apart.
    seen.add(\`\${x},\${y}\`);
  }
  return seen.size;
};`,
    junior: `const visited = (path: readonly [number, number][]): number => {
  const seen = new Set<string>();
  for (let i = 0; i < path.length; i++) {
    const x = path[i][0];
    const y = path[i][1];
    const key = x + "," + y;
    seen.add(key);
  }
  return seen.size;
};`,
    senior: `const visited = (path: readonly (readonly [number, number])[]): number =>
  new Set(path.map(([x, y]) => \`\${x},\${y}\`)).size;`,
    hiddenTests: [
      { call: 'visited([[-1, 0], [1, 0], [0, -1], [0, 1], [-1, 0]])', expected: 4 },
      { call: 'visited([[0, 0], [0, 0], [0, 1], [0, 0], [0, 1]])', expected: 2 },
      { call: 'visited([[1, 23], [12, 3]])', expected: 2 },
    ],
  },

  /* ── two pointers ─────────────────────────────────────────────────── */
  'ts-easy3-pages-as-ranges': {
    solution: `const toRanges = (pages: readonly number[]): string => {
  const runs: string[] = [];
  let start = 0;
  while (start < pages.length) {
    let end = start;
    // end moves on while the next page follows straight after the one at end.
    while (end + 1 < pages.length && pages[end + 1] === pages[end] + 1) end++;
    runs.push(start === end ? \`\${pages[start]}\` : \`\${pages[start]}-\${pages[end]}\`);
    // The next run starts just past this one.
    start = end + 1;
  }
  return runs.join(", ");
};`,
    junior: `const toRanges = (pages: readonly number[]): string => {
  let text = "";
  let start = 0;
  while (start < pages.length) {
    let end = start;
    while (end + 1 < pages.length && pages[end + 1] === pages[end] + 1) {
      end = end + 1;
    }
    let run = String(pages[start]);
    if (end > start) {
      run = run + "-" + pages[end];
    }
    if (text !== "") {
      text = text + ", ";
    }
    text = text + run;
    start = end + 1;
  }
  return text;
};`,
    senior: `const toRanges = (pages: readonly number[]): string => {
  const runs: string[] = [];
  for (let start = 0, end = 0; start < pages.length; start = ++end) {
    while (pages[end + 1] === pages[end] + 1) end++;
    runs.push(start === end ? String(pages[start]) : \`\${pages[start]}-\${pages[end]}\`);
  }
  return runs.join(", ");
};`,
    hiddenTests: [
      { call: 'toRanges([9, 10, 12, 13, 14, 20])', expected: '9-10, 12-14, 20' },
      { call: 'toRanges([1, 2, 4])', expected: '1-2, 4' },
      { call: 'toRanges([100, 101])', expected: '100-101' },
      { call: 'toRanges([0, 2, 3])', expected: '0, 2-3' },
    ],
  },
  'ts-easy3-alternate-playlists': {
    solution: `const alternate = <T>(a: readonly T[], b: readonly T[]): T[] => {
  const mixed: T[] = [];
  let i = 0;
  let j = 0;
  // Go on until both lists are used up; each index moves only when its list gives an item.
  while (i < a.length || j < b.length) {
    // Test the index, not the item: "" and 0 are items too.
    if (i < a.length) mixed.push(a[i++]);
    if (j < b.length) mixed.push(b[j++]);
  }
  return mixed;
};`,
    junior: `const alternate = <T>(a: readonly T[], b: readonly T[]): T[] => {
  const mixed: T[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    mixed.push(a[i]);
    mixed.push(b[j]);
    i = i + 1;
    j = j + 1;
  }
  while (i < a.length) {
    mixed.push(a[i]);
    i = i + 1;
  }
  while (j < b.length) {
    mixed.push(b[j]);
    j = j + 1;
  }
  return mixed;
};`,
    senior: `const alternate = <T>(a: readonly T[], b: readonly T[]): T[] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, k) => k)
    .flatMap((k) => [...a.slice(k, k + 1), ...b.slice(k, k + 1)]);`,
    hiddenTests: [
      { call: 'alternate([], [])', expected: [] },
      { call: 'alternate([0, 0, 0], [7])', expected: [0, 7, 0, 0] },
      { call: 'alternate(["", "b"], ["c", ""])', expected: ['', 'c', 'b', ''] },
      { call: '(() => { const a = [1, 2]; const b = [3]; alternate(a, b); return [a, b]; })()', expected: [[1, 2], [3]] },
    ],
  },

  /* ── type guards and narrowing ────────────────────────────────────── */
  'ts-easy3-check-the-json': {
    solution: `interface User {
  name: string;
  age: number;
}

// The compiler trusts a true result from a predicate, so the checks have to be real.
const isUser = (value: unknown): value is User =>
  // typeof null is "object", so null needs its own check.
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  typeof value.name === "string" &&
  "age" in value &&
  typeof value.age === "number";

const readUser = (text: string): User | null => {
  // unknown, not any: nothing can use the value before isUser has checked it.
  const value: unknown = JSON.parse(text);
  return isUser(value) ? value : null;
};`,
    junior: `interface User {
  name: string;
  age: number;
}

const isUser = (value: unknown): value is User => {
  if (typeof value !== "object") {
    return false;
  }
  if (value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string") {
    return false;
  }
  if (typeof record.age !== "number") {
    return false;
  }
  return true;
};

const readUser = (text: string): User | null => {
  const value: unknown = JSON.parse(text);
  if (isUser(value)) {
    return value;
  }
  return null;
};`,
    senior: `interface User {
  name: string;
  age: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isUser = (value: unknown): value is User =>
  isRecord(value) && typeof value.name === "string" && typeof value.age === "number";

const readUser = (text: string): User | null => {
  const value: unknown = JSON.parse(text);
  return isUser(value) ? value : null;
};`,
    hiddenTests: [
      { call: 'readUser("[]")', expected: null },
      { call: 'readUser(JSON.stringify({ name: "Cy", age: 41, admin: true }))', expected: { name: 'Cy', age: 41, admin: true } },
      { call: 'readUser(JSON.stringify("Ada"))', expected: null },
      { call: 'isUser({ name: null, age: 1 })', expected: false },
      { call: 'readUser("42")', expected: null },
    ],
    hiddenTypeTests: [
      { code: 'const __g: (value: unknown) => value is User = isUser;', label: 'isUser is a type predicate' },
    ],
  },
  'ts-easy3-data-or-error': {
    solution: `type Reply = { data: string[] } | { error: string };

const errorsOf = (replies: readonly Reply[]): string[] =>
  replies
    // "error" in reply narrows the union to the error shape; the predicate carries that to map.
    .filter((reply): reply is { error: string } => "error" in reply)
    .map((reply) => reply.error);`,
    junior: `type Reply = { data: string[] } | { error: string };

const errorsOf = (replies: readonly Reply[]): string[] => {
  const messages: string[] = [];
  for (const reply of replies) {
    if ("error" in reply) {
      messages.push(reply.error);
    }
  }
  return messages;
};`,
    senior: `type Reply = { data: string[] } | { error: string };

type Failure = Extract<Reply, { error: string }>;

const isFailure = (reply: Reply): reply is Failure => "error" in reply;

const errorsOf = (replies: readonly Reply[]): string[] => replies.filter(isFailure).map(({ error }) => error);`,
    hiddenTests: [
      { call: 'errorsOf([{ error: "A" }, { data: ["b"] }, { error: "C" }, { data: [] }, { error: "E" }])', expected: ['A', 'C', 'E'] },
      { call: 'errorsOf([{ data: ["error"] }])', expected: [] },
      { call: 'errorsOf([{ error: "x" }, { error: "x" }])', expected: ['x', 'x'] },
    ],
  },

  /* ── literal types and unions ─────────────────────────────────────── */
  'ts-easy3-next-light': {
    solution: `type Light = "red" | "green" | "amber";

// Record<Light, Light>: a missing light or a misspelt one is a compile error.
const NEXT: Record<Light, Light> = {
  red: "green",
  green: "amber",
  amber: "red",
};

const nextLight = (light: Light, steps: number): Light => {
  let current = light;
  for (let step = 0; step < steps; step++) {
    current = NEXT[current];
  }
  return current;
};`,
    junior: `type Light = "red" | "green" | "amber";

const NEXT: Record<Light, Light> = { red: "green", green: "amber", amber: "red" };

const nextLight = (light: Light, steps: number): Light => {
  let current: Light = light;
  let count = 0;
  while (count < steps) {
    current = NEXT[current];
    count = count + 1;
  }
  return current;
};`,
    senior: `type Light = "red" | "green" | "amber";

const NEXT: Readonly<Record<Light, Light>> = { red: "green", green: "amber", amber: "red" };

const nextLight = (light: Light, steps: number): Light =>
  Array.from({ length: steps }).reduce<Light>((current) => NEXT[current], light);`,
    hiddenTests: [
      { call: 'nextLight("green", 2)', expected: 'red' },
      { call: 'nextLight("amber", 5)', expected: 'green' },
      { call: 'nextLight("red", 7)', expected: 'green' },
      { call: 'NEXT.amber', expected: 'red' },
    ],
  },
  'ts-easy3-all-in-celsius': {
    solution: `type Reading =
  | { unit: "C"; value: number }
  | { unit: "F"; value: number };

const toCelsius = (readings: readonly Reading[]): number[] =>
  readings.map((reading) => {
    // A Celsius reading passes through as it is, unrounded.
    if (reading.unit === "C") return reading.value;
    const celsius = ((reading.value - 32) * 5) / 9;
    return Math.round(celsius * 10) / 10;
  });`,
    junior: `type Reading =
  | { unit: "C"; value: number }
  | { unit: "F"; value: number };

const toCelsius = (readings: readonly Reading[]): number[] => {
  const result: number[] = [];
  for (const reading of readings) {
    if (reading.unit === "F") {
      const celsius = (reading.value - 32) * 5 / 9;
      result.push(Math.round(celsius * 10) / 10);
    } else {
      result.push(reading.value);
    }
  }
  return result;
};`,
    senior: `type Reading =
  | { unit: "C"; value: number }
  | { unit: "F"; value: number };

const fromFahrenheit = (value: number): number => Math.round(((value - 32) * 5 / 9) * 10) / 10;

const toCelsius = (readings: readonly Reading[]): number[] =>
  readings.map(({ unit, value }) => (unit === "C" ? value : fromFahrenheit(value)));`,
    hiddenTests: [
      { call: 'toCelsius([{ unit: "F", value: 32 }, { unit: "F", value: 50 }, { unit: "C", value: 0 }])', expected: [0, 10, 0] },
      { call: 'toCelsius([{ unit: "F", value: -40 }])', expected: [-40] },
      { call: 'toCelsius([{ unit: "F", value: 100 }])', expected: [37.8] },
    ],
  },
};
