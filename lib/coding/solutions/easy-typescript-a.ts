// Server-only reference solutions and hidden tests for lib/coding/tasks/easy-typescript-a.ts.
// Never import from client code. The hidden tests aim at the shortcut each
// visible set leaves open: a hard-coded answer, a changed input, a value or a
// shape the visible tests never used, and the case the technique exists for.

import type { CodingSolution } from '../types';

export const EASY_TYPESCRIPT_A_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── utility types ────────────────────────────────────────────────── */
  'ts-easy2-draft-post': {
    solution: `interface Post {
  title: string;
  body: string;
  tags: string[];
}

// The order of this list is the order of the answer.
const FIELDS = ["title", "body", "tags"] as const;

const missingFields = (draft: Partial<Post>): string[] =>
  // Only undefined is missing: an empty title or an empty tag list was filled in.
  FIELDS.filter((field) => draft[field] === undefined);`,
    junior: `interface Post {
  title: string;
  body: string;
  tags: string[];
}

const missingFields = (draft: Partial<Post>): string[] => {
  const missing: string[] = [];
  if (draft.title === undefined) {
    missing.push("title");
  }
  if (draft.body === undefined) {
    missing.push("body");
  }
  if (draft.tags === undefined) {
    missing.push("tags");
  }
  return missing;
};`,
    senior: `interface Post {
  title: string;
  body: string;
  tags: string[];
}

const missingFields = (draft: Partial<Post>): (keyof Post)[] =>
  (["title", "body", "tags"] as const).filter((field) => draft[field] === undefined);`,
    hiddenTests: [
      { call: 'missingFields({ tags: [] })', expected: ['title', 'body'] },
      { call: 'missingFields({ body: "" })', expected: ['title', 'tags'] },
      { call: 'missingFields({ title: "T", body: "B" })', expected: ['tags'] },
      { call: 'missingFields({ title: undefined, body: "B", tags: ["a"] })', expected: ['title'] },
    ],
  },
  'ts-easy2-article-previews': {
    solution: `interface Article {
  id: number;
  title: string;
  body: string;
  author: string;
}

type Preview = Pick<Article, "id" | "title">;

// A new object per article: the body and the author never reach the card.
const toPreviews = (articles: Article[]): Preview[] =>
  articles.map(({ id, title }) => ({ id, title }));`,
    junior: `interface Article {
  id: number;
  title: string;
  body: string;
  author: string;
}

type Preview = Pick<Article, "id" | "title">;

const toPreviews = (articles: Article[]): Preview[] => {
  const previews: Preview[] = [];
  for (const article of articles) {
    const preview: Preview = { id: article.id, title: article.title };
    previews.push(preview);
  }
  return previews;
};`,
    senior: `interface Article {
  id: number;
  title: string;
  body: string;
  author: string;
}

type Preview = Pick<Article, "id" | "title">;

const toPreview = ({ id, title }: Article): Preview => ({ id, title });

const toPreviews = (articles: readonly Article[]): Preview[] => articles.map(toPreview);`,
    hiddenTests: [
      { call: 'toPreviews([{ id: 7, title: "A", body: "", author: "" }, { id: 3, title: "B", body: "x", author: "y" }, { id: 7, title: "C", body: "z", author: "w" }])', expected: [{ id: 7, title: 'A' }, { id: 3, title: 'B' }, { id: 7, title: 'C' }] },
      { call: 'Object.keys(toPreviews([{ id: 2, title: "T", body: "B", author: "A" }])[0])', expected: ['id', 'title'] },
      { call: '(() => { const list = [{ id: 1, title: "x", body: "y", author: "z" }]; toPreviews(list); return list[0]; })()', expected: { id: 1, title: 'x', body: 'y', author: 'z' } },
    ],
  },
  'ts-easy2-only-weekdays': {
    solution: `type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type Weekday = Exclude<Day, "sat" | "sun">;

// The predicate return type is what lets a caller use the day as a Weekday.
const isWeekday = (day: Day): day is Weekday => day !== "sat" && day !== "sun";`,
    junior: `type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type Weekday = Exclude<Day, "sat" | "sun">;

const isWeekday = (day: Day): day is Weekday => {
  if (day === "sat") {
    return false;
  }
  if (day === "sun") {
    return false;
  }
  return true;
};`,
    senior: `type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type Weekday = Exclude<Day, "sat" | "sun">;

const WEEKEND: ReadonlySet<Day> = new Set<Day>(["sat", "sun"]);

const isWeekday = (day: Day): day is Weekday => !WEEKEND.has(day);`,
    hiddenTests: [
      { call: '["mon", "tue", "wed", "thu", "fri", "sat", "sun"].filter(isWeekday)', expected: ['mon', 'tue', 'wed', 'thu', 'fri'] },
      { call: 'isWeekday("tue")', expected: true },
      { call: 'isWeekday("thu")', expected: true },
    ],
    hiddenTypeTests: [
      { code: 'const __sat: Weekday = "sat";', label: 'Saturday is not a Weekday', rejects: true },
      { code: 'const __mon: Weekday = "mon";', label: 'Monday is a Weekday' },
    ],
  },

  /* ── generic constraints ──────────────────────────────────────────── */
  'ts-easy2-longer-of-two': {
    solution: `// Strictly longer, so a tie keeps the first argument.
const longer = <T extends { length: number }>(a: T, b: T): T => (b.length > a.length ? b : a);`,
    junior: `const longer = <T extends { length: number }>(a: T, b: T): T => {
  const lengthOfA = a.length;
  const lengthOfB = b.length;
  if (lengthOfB > lengthOfA) {
    return b;
  }
  return a;
};`,
    senior: `function longer<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}`,
    hiddenTests: [
      { call: 'longer("same", "four")', expected: 'same' },
      { call: 'longer(["a"], ["b", "c"])', expected: ['b', 'c'] },
      { call: 'longer("abc", "")', expected: 'abc' },
      { call: 'longer({ length: 2 }, { length: 5 })', expected: { length: 5 } },
    ],
  },
  'ts-easy2-only-active': {
    solution: `// T keeps whatever else the caller's items carry; the constraint only promises the flag.
const onlyActive = <T extends { active: boolean }>(items: T[]): T[] => items.filter((item) => item.active);`,
    junior: `const onlyActive = <T extends { active: boolean }>(items: T[]): T[] => {
  const kept: T[] = [];
  for (const item of items) {
    if (item.active === true) {
      kept.push(item);
    }
  }
  return kept;
};`,
    senior: `function onlyActive<T extends { active: boolean }>(items: readonly T[]): T[] {
  return items.filter(({ active }) => active);
}`,
    hiddenTests: [
      { call: 'onlyActive([{ id: 3, active: true }, { id: 1, active: false }, { id: 2, active: true }]).map((item) => item.id)', expected: [3, 2] },
      { call: '(() => { const a = { active: true }; return onlyActive([a])[0] === a; })()', expected: true },
      { call: 'onlyActive([{ sku: "x", active: false }, { sku: "y", active: false }])', expected: [] },
    ],
  },
  'ts-easy2-cheapest-offer': {
    solution: `const cheapest = <T extends { price: number }>(items: T[]): T | null => {
  // reduce with no starting value throws on an empty array.
  if (items.length === 0) return null;
  // Strictly lower, so the first of two equal prices stays.
  return items.reduce((best, item) => (item.price < best.price ? item : best));
};`,
    junior: `const cheapest = <T extends { price: number }>(items: T[]): T | null => {
  if (items.length === 0) {
    return null;
  }
  let best = items[0];
  for (let i = 1; i < items.length; i++) {
    if (items[i].price < best.price) {
      best = items[i];
    }
  }
  return best;
};`,
    senior: `const cheapest = <T extends { price: number }>(items: readonly T[]): T | null =>
  items.reduce<T | null>((best, item) => (best === null || item.price < best.price ? item : best), null);`,
    hiddenTests: [
      { call: 'cheapest([{ name: "a", price: 4 }, { name: "b", price: 4 }, { name: "c", price: 3 }, { name: "d", price: 3 }])', expected: { name: 'c', price: 3 } },
      { call: 'cheapest([{ name: "z", price: 1 }, { name: "y", price: 9 }])', expected: { name: 'z', price: 1 } },
      { call: 'cheapest([{ name: "free", price: 0 }, { name: "a", price: 5 }])', expected: { name: 'free', price: 0 } },
      { call: '(() => { const one = { price: 5 }; return cheapest([{ price: 6 }, one]) === one; })()', expected: true },
    ],
  },

  /* ── destructuring ────────────────────────────────────────────────── */
  'ts-easy2-flip-a-pair': {
    solution: `// The pattern [first, second] is annotated as a whole, after the brackets.
const flip = <A, B>([first, second]: [A, B]): [B, A] => [second, first];`,
    junior: `const flip = <A, B>(pair: [A, B]): [B, A] => {
  const first = pair[0];
  const second = pair[1];
  const flipped: [B, A] = [second, first];
  return flipped;
};`,
    senior: `function flip<A, B>([first, second]: readonly [A, B]): [B, A] {
  return [second, first];
}`,
    hiddenTests: [
      { call: 'flip(["", 1])', expected: [1, ''] },
      { call: 'flip([[1], { a: 2 }])', expected: [{ a: 2 }, [1]] },
      { call: '(() => { const pair = [1, 2]; return flip(pair) !== pair; })()', expected: true },
    ],
  },
  'ts-easy2-header-and-rows': {
    solution: `const splitHeader = (rows: string[][]): { header: string[]; body: string[][] } => {
  // The default covers a file with no rows; the rest element is a new array.
  const [header = [], ...body] = rows;
  return { header, body };
};`,
    junior: `const splitHeader = (rows: string[][]): { header: string[]; body: string[][] } => {
  let header: string[] = [];
  const body: string[][] = [];
  for (let i = 0; i < rows.length; i++) {
    if (i === 0) {
      header = rows[i];
    } else {
      body.push(rows[i]);
    }
  }
  return { header: header, body: body };
};`,
    senior: `interface Table {
  header: string[];
  body: string[][];
}

const splitHeader = ([header = [], ...body]: readonly string[][]): Table => ({ header, body });`,
    hiddenTests: [
      { call: 'splitHeader([[], ["x"]])', expected: { header: [], body: [['x']] } },
      { call: '(() => { const rows = [["h"], ["1"], ["2"]]; return splitHeader(rows).body !== rows; })()', expected: true },
      { call: 'splitHeader([["a", "b"], ["1", "2"], ["3", "4"], ["5", "6"]]).body.length', expected: 3 },
      { call: 'splitHeader([["a"], [], ["1"]])', expected: { header: ['a'], body: [[], ['1']] } },
    ],
  },
  'ts-easy2-fields-from-the-api': {
    solution: `interface ApiUser {
  user_name: string;
  avatar_url?: string;
}

interface Profile {
  name: string;
  avatar: string | null;
}

const toProfile = (raw: ApiUser): Profile => {
  // A destructuring default applies to undefined only, so an empty URL survives.
  const { user_name: name, avatar_url: avatar = null } = raw;
  return { name, avatar };
};`,
    junior: `interface ApiUser {
  user_name: string;
  avatar_url?: string;
}

interface Profile {
  name: string;
  avatar: string | null;
}

const toProfile = (raw: ApiUser): Profile => {
  const name = raw.user_name;
  let avatar: string | null = null;
  if (raw.avatar_url !== undefined) {
    avatar = raw.avatar_url;
  }
  return { name: name, avatar: avatar };
};`,
    senior: `interface ApiUser {
  user_name: string;
  avatar_url?: string;
}

interface Profile {
  name: string;
  avatar: string | null;
}

const toProfile = ({ user_name, avatar_url }: ApiUser): Profile => ({ name: user_name, avatar: avatar_url ?? null });`,
    hiddenTests: [
      { call: 'toProfile({ user_name: "dee", avatar_url: undefined })', expected: { name: 'dee', avatar: null } },
      { call: 'Object.keys(toProfile({ user_name: "e", avatar_url: "/e.png" }))', expected: ['name', 'avatar'] },
      { call: 'toProfile({ user_name: "f g", avatar_url: "https://x.dev/f.png" })', expected: { name: 'f g', avatar: 'https://x.dev/f.png' } },
    ],
  },

  /* ── Map and Set ──────────────────────────────────────────────────── */
  'ts-easy2-airport-names': {
    solution: `const routeNames = (route: string, airports: Map<string, string>): string[] => {
  // "".split("-") is [""], which would look up one empty code.
  if (route === "") return [];
  // Look up in capitals, but fall back to the code exactly as it was written.
  return route.split("-").map((code) => airports.get(code.toUpperCase()) ?? code);
};`,
    junior: `const routeNames = (route: string, airports: Map<string, string>): string[] => {
  const names: string[] = [];
  if (route === "") {
    return names;
  }
  const codes = route.split("-");
  for (const code of codes) {
    const key = code.toUpperCase();
    const name = airports.get(key);
    if (name === undefined) {
      names.push(code);
    } else {
      names.push(name);
    }
  }
  return names;
};`,
    senior: `const routeNames = (route: string, airports: ReadonlyMap<string, string>): string[] =>
  route ? route.split("-").map((code) => airports.get(code.toUpperCase()) ?? code) : [];`,
    hiddenTests: [
      { call: 'routeNames("JFK-PRG-JFK", new Map([["JFK", "New York JFK"], ["PRG", "Prague"]]))', expected: ['New York JFK', 'Prague', 'New York JFK'] },
      { call: 'routeNames("PrG", new Map([["PRG", "Prague"]]))', expected: ['Prague'] },
      { call: 'routeNames("LHR", new Map([["LHR", ""]]))', expected: [''] },
      { call: 'routeNames("ab-cd", new Map())', expected: ['ab', 'cd'] },
    ],
  },
  'ts-easy2-select-and-deselect': {
    solution: `const toggle = (selected: ReadonlySet<string>, id: string): Set<string> => {
  // The copy is ours to change; the caller's Set stays as it was.
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};`,
    junior: `const toggle = (selected: ReadonlySet<string>, id: string): Set<string> => {
  const next = new Set<string>();
  for (const one of selected) {
    next.add(one);
  }
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};`,
    senior: `const toggle = (selected: ReadonlySet<string>, id: string): Set<string> => {
  const next = new Set(selected);
  if (!next.delete(id)) next.add(id);
  return next;
};`,
    hiddenTests: [
      { call: '(() => { const selected = new Set(["a"]); return toggle(selected, "b") !== selected; })()', expected: true },
      { call: '[...toggle(toggle(new Set(["x"]), "y"), "y")]', expected: ['x'] },
      { call: 'toggle(new Set(["a", "b", "c"]), "b").size', expected: 2 },
      { call: '[...toggle(new Set([""]), "")]', expected: [] },
    ],
  },
  'ts-easy2-price-the-basket': {
    solution: `const basketTotal = (prices: ReadonlyMap<string, number>, basket: string[]): number =>
  basket.reduce((total, product) => {
    const price = prices.get(product);
    // A missing price is undefined; a free product's price is 0 and still counts.
    if (price === undefined) throw new Error(\`No price for \${product}\`);
    return total + price;
  }, 0);`,
    junior: `const basketTotal = (prices: ReadonlyMap<string, number>, basket: string[]): number => {
  let total = 0;
  for (let i = 0; i < basket.length; i++) {
    const product = basket[i];
    if (!prices.has(product)) {
      throw new Error("No price for " + product);
    }
    const price = prices.get(product) as number;
    total = total + price;
  }
  return total;
};`,
    senior: `const priceOf = (prices: ReadonlyMap<string, number>, product: string): number => {
  const price = prices.get(product);
  if (price === undefined) throw new Error(\`No price for \${product}\`);
  return price;
};

const basketTotal = (prices: ReadonlyMap<string, number>, basket: readonly string[]): number =>
  basket.reduce((total, product) => total + priceOf(prices, product), 0);`,
    hiddenTests: [
      { call: 'basketTotal(new Map([["a", 1], ["b", 10], ["c", 100]]), ["c", "b", "a", "a"])', expected: 112 },
      { call: '(() => { try { basketTotal(new Map(), ["x"]); return "no error"; } catch (error) { return error instanceof Error; } })()', expected: true },
      { call: '(() => { try { return basketTotal(new Map([["tea", 350]]), ["cake", "tea"]); } catch (error) { return error.message; } })()', expected: 'No price for cake' },
      { call: 'basketTotal(new Map([["tea", 350]]), ["tea", "tea", "tea"])', expected: 1050 },
    ],
  },

  /* ── two pointers ─────────────────────────────────────────────────── */
  'ts-easy2-trim-blank-lines': {
    solution: `const isBlank = (line: string): boolean => line.trim() === "";

const trimBlank = (lines: readonly string[]): string[] => {
  let start = 0;
  let end = lines.length - 1;
  // Check the index first: on an all-blank list, start walks off the end.
  while (start < lines.length && isBlank(lines[start])) start++;
  while (end >= start && isBlank(lines[end])) end--;
  // slice copies, and end + 1 keeps the line at end.
  return lines.slice(start, end + 1);
};`,
    junior: `const trimBlank = (lines: readonly string[]): string[] => {
  let start = 0;
  while (start < lines.length && lines[start].trim() === "") {
    start = start + 1;
  }
  let end = lines.length - 1;
  while (end >= start && lines[end].trim() === "") {
    end = end - 1;
  }
  const kept: string[] = [];
  for (let i = start; i <= end; i++) {
    kept.push(lines[i]);
  }
  return kept;
};`,
    senior: `const trimBlank = (lines: readonly string[]): string[] => {
  const blank = (index: number): boolean => lines[index].trim() === "";
  let start = 0;
  let end = lines.length;
  while (start < end && blank(start)) start++;
  while (end > start && blank(end - 1)) end--;
  return lines.slice(start, end);
};`,
    hiddenTests: [
      { call: 'trimBlank(["", "", "a", "", "", "b", "", ""])', expected: ['a', '', '', 'b'] },
      { call: '(() => { const lines = ["", "a", ""]; trimBlank(lines); return lines; })()', expected: ['', 'a', ''] },
      { call: 'trimBlank(["x"])', expected: ['x'] },
      { call: 'trimBlank(["   ", "x"])', expected: ['x'] },
    ],
  },
  'ts-easy2-free-on-both': {
    solution: `const freeBoth = (mine: readonly number[], yours: readonly number[]): number[] => {
  const both: number[] = [];
  let i = 0;
  let j = 0;
  // Both lists are sorted, so the smaller day cannot appear later in the other list.
  while (i < mine.length && j < yours.length) {
    if (mine[i] === yours[j]) {
      both.push(mine[i]);
      i++;
      j++;
    } else if (mine[i] < yours[j]) {
      i++;
    } else {
      j++;
    }
  }
  return both;
};`,
    junior: `const freeBoth = (mine: readonly number[], yours: readonly number[]): number[] => {
  const both: number[] = [];
  let i = 0;
  let j = 0;
  while (i < mine.length && j < yours.length) {
    const myDay = mine[i];
    const yourDay = yours[j];
    if (myDay === yourDay) {
      both.push(myDay);
      i = i + 1;
      j = j + 1;
    } else if (myDay < yourDay) {
      i = i + 1;
    } else {
      j = j + 1;
    }
  }
  return both;
};`,
    senior: `const freeBoth = (mine: readonly number[], yours: readonly number[]): number[] => {
  const both: number[] = [];
  for (let i = 0, j = 0; i < mine.length && j < yours.length; ) {
    const diff = mine[i] - yours[j];
    if (diff === 0) both.push(mine[i]);
    if (diff <= 0) i++;
    if (diff >= 0) j++;
  }
  return both;
};`,
    hiddenTests: [
      { call: 'freeBoth([1, 2, 3, 4, 5, 6], [2, 4, 6, 8])', expected: [2, 4, 6] },
      { call: 'freeBoth([10, 20, 30], [5, 10, 15, 20, 25, 30, 35])', expected: [10, 20, 30] },
      { call: '(() => { const mine = [1, 2]; const yours = [2, 3]; freeBoth(mine, yours); return [mine, yours]; })()', expected: [[1, 2], [2, 3]] },
      { call: 'freeBoth([31], [1, 31])', expected: [31] },
    ],
  },
  'ts-easy2-where-a-value-sits': {
    solution: `const spanOf = (sorted: readonly number[], value: number): [number, number] | null => {
  let start = 0;
  let end = sorted.length - 1;
  while (start <= end && sorted[start] !== value) start++;
  // start passed end: the value is not in the list.
  if (start > end) return null;
  // start found the value, so end stops at start at the latest.
  while (sorted[end] !== value) end--;
  return [start, end];
};`,
    junior: `const spanOf = (sorted: readonly number[], value: number): [number, number] | null => {
  let first = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] === value) {
      first = i;
      break;
    }
  }
  if (first === -1) {
    return null;
  }
  let last = first;
  for (let i = sorted.length - 1; i >= first; i--) {
    if (sorted[i] === value) {
      last = i;
      break;
    }
  }
  return [first, last];
};`,
    senior: `const spanOf = (sorted: readonly number[], value: number): [number, number] | null => {
  const start = sorted.indexOf(value);
  return start === -1 ? null : [start, sorted.lastIndexOf(value)];
};`,
    hiddenTests: [
      { call: 'spanOf([0, 0, 1], 0)', expected: [0, 1] },
      { call: 'spanOf([1, 2, 3], 1)', expected: [0, 0] },
      { call: 'spanOf([1, 2, 3], 3)', expected: [2, 2] },
      { call: 'spanOf([2, 4, 4, 6, 6, 6, 8], 6)', expected: [3, 5] },
    ],
  },

  /* ── keyof ────────────────────────────────────────────────────────── */
  'ts-easy2-sort-by-a-column': {
    solution: `interface Player {
  name: string;
  score: number;
  country: string;
}

const sortRows = (rows: readonly Player[], column: keyof Player): Player[] =>
  // A readonly array has no sort, so sort a copy. < and > compare numbers by
  // value and strings by character code, and sort keeps ties in order.
  [...rows].sort((a, b) => {
    if (a[column] < b[column]) return -1;
    if (a[column] > b[column]) return 1;
    return 0;
  });`,
    junior: `interface Player {
  name: string;
  score: number;
  country: string;
}

const sortRows = (rows: readonly Player[], column: keyof Player): Player[] => {
  const copy: Player[] = [];
  for (const row of rows) {
    copy.push(row);
  }
  copy.sort((a, b) => {
    const left = a[column];
    const right = b[column];
    if (left < right) {
      return -1;
    } else if (left > right) {
      return 1;
    } else {
      return 0;
    }
  });
  return copy;
};`,
    senior: `interface Player {
  name: string;
  score: number;
  country: string;
}

const sortRows = (rows: readonly Player[], column: keyof Player): Player[] =>
  [...rows].sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0));`,
    hiddenTests: [
      { call: '(() => { const rows = [{ name: "B", score: 1, country: "X" }, { name: "A", score: 2, country: "Y" }]; sortRows(rows, "name"); return rows.map((row) => row.name); })()', expected: ['B', 'A'] },
      { call: 'sortRows([{ name: "a", score: 0, country: "SE" }, { name: "b", score: 0, country: "CZ" }, { name: "c", score: 0, country: "GB" }], "country").map((row) => row.country)', expected: ['CZ', 'GB', 'SE'] },
      { call: 'sortRows([{ name: "a", score: -1, country: "X" }, { name: "b", score: 0, country: "X" }, { name: "c", score: -5, country: "X" }], "score").map((row) => row.score)', expected: [-5, -1, 0] },
    ],
  },
  'ts-easy2-column-headings': {
    solution: `interface Contact {
  name: string;
  email: string;
  phone: string;
}

// The Record type makes a missing or an extra heading a compile error.
const LABELS: Record<keyof Contact, string> = {
  name: "Full name",
  email: "Email",
  phone: "Phone number",
};

const headings = (columns: (keyof Contact)[]): string[] => columns.map((column) => LABELS[column]);`,
    junior: `interface Contact {
  name: string;
  email: string;
  phone: string;
}

const LABELS: Record<keyof Contact, string> = {
  name: "Full name",
  email: "Email",
  phone: "Phone number",
};

const headings = (columns: (keyof Contact)[]): string[] => {
  const result: string[] = [];
  for (const column of columns) {
    const label = LABELS[column];
    result.push(label);
  }
  return result;
};`,
    senior: `interface Contact {
  name: string;
  email: string;
  phone: string;
}

const LABELS = { name: "Full name", email: "Email", phone: "Phone number" } as const satisfies Record<keyof Contact, string>;

const headings = (columns: readonly (keyof Contact)[]): string[] => columns.map((column) => LABELS[column]);`,
    hiddenTests: [
      { call: 'headings(["phone", "email", "name"])', expected: ['Phone number', 'Email', 'Full name'] },
      { call: 'Object.keys(LABELS).sort()', expected: ['email', 'name', 'phone'] },
      { call: 'headings(["email", "email", "phone"])', expected: ['Email', 'Email', 'Phone number'] },
    ],
  },

  /* ── spread ───────────────────────────────────────────────────────── */
  'ts-easy2-tick-off-a-todo': {
    solution: `interface Todo {
  id: number;
  text: string;
  done: boolean;
}

// The spread copies the todo, then done: true overwrites one property of the copy.
const markDone = (todos: readonly Todo[], id: number): Todo[] =>
  todos.map((todo) => (todo.id === id ? { ...todo, done: true } : todo));`,
    junior: `interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const markDone = (todos: readonly Todo[], id: number): Todo[] => {
  const result: Todo[] = [];
  for (const todo of todos) {
    if (todo.id === id) {
      const changed: Todo = { id: todo.id, text: todo.text, done: true };
      result.push(changed);
    } else {
      result.push(todo);
    }
  }
  return result;
};`,
    senior: `interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const markDone = (todos: readonly Todo[], id: number): Todo[] =>
  todos.map((todo) => (todo.id === id && !todo.done ? { ...todo, done: true } : todo));`,
    hiddenTests: [
      { call: '(() => { const todos = [{ id: 1, text: "a", done: false }]; return markDone(todos, 1) !== todos; })()', expected: true },
      { call: 'markDone([{ id: 3, text: "c", done: false }, { id: 1, text: "a", done: false }, { id: 2, text: "b", done: true }], 1)', expected: [{ id: 3, text: 'c', done: false }, { id: 1, text: 'a', done: true }, { id: 2, text: 'b', done: true }] },
      { call: '(() => { const todo = { id: 1, text: "a", done: false }; const [next] = markDone([todo], 1); return [todo.done, next.done, next === todo]; })()', expected: [false, true, false] },
    ],
  },
  'ts-easy2-add-a-tag': {
    solution: `interface Note {
  readonly title: string;
  readonly tags: readonly string[];
}

const addTag = (note: Note, tag: string): Note => {
  // includes changes nothing, so it is allowed on a readonly array.
  if (note.tags.includes(tag)) return note;
  // A new note and a new tag list: the caller's note is never touched.
  return { ...note, tags: [...note.tags, tag] };
};`,
    junior: `interface Note {
  readonly title: string;
  readonly tags: readonly string[];
}

const addTag = (note: Note, tag: string): Note => {
  for (const existing of note.tags) {
    if (existing === tag) {
      return note;
    }
  }
  const tags: string[] = [];
  for (const existing of note.tags) {
    tags.push(existing);
  }
  tags.push(tag);
  return { title: note.title, tags: tags };
};`,
    senior: `interface Note {
  readonly title: string;
  readonly tags: readonly string[];
}

const addTag = (note: Note, tag: string): Note =>
  note.tags.includes(tag) ? note : { ...note, tags: [...note.tags, tag] };`,
    hiddenTests: [
      { call: '(() => { const note = { title: "a", tags: ["x"] }; return addTag(note, "x") === note; })()', expected: true },
      { call: '(() => { const note = { title: "a", tags: ["x"] }; const next = addTag(note, "y"); return [next === note, next.tags === note.tags]; })()', expected: [false, false] },
      { call: 'addTag({ title: "t", tags: ["a", "b"] }, "c")', expected: { title: 't', tags: ['a', 'b', 'c'] } },
    ],
    hiddenTypeTests: [
      { code: 'const __held: Note = { title: "a", tags: [] }; __held.tags = ["b"];', label: 'the tags property cannot be reassigned', rejects: true },
    ],
  },

  /* ── while, reduce, sort and strings ──────────────────────────────── */
  'ts-easy2-path-to-the-root': {
    solution: `interface Folder {
  name: string;
  parent: Folder | null;
}

const pathOf = (folder: Folder): string => {
  const names: string[] = [];
  // Typed Folder | null so it can hold the root's null parent.
  let current: Folder | null = folder;
  // Inside the loop the check has narrowed current to a Folder.
  while (current !== null) {
    names.unshift(current.name);
    current = current.parent;
  }
  return names.join("/");
};`,
    junior: `interface Folder {
  name: string;
  parent: Folder | null;
}

const pathOf = (folder: Folder): string => {
  const upward: string[] = [];
  let current: Folder | null = folder;
  while (current !== null) {
    upward.push(current.name);
    current = current.parent;
  }
  let path = "";
  for (let i = upward.length - 1; i >= 0; i--) {
    if (path !== "") {
      path = path + "/";
    }
    path = path + upward[i];
  }
  return path;
};`,
    senior: `interface Folder {
  name: string;
  parent: Folder | null;
}

const pathOf = (folder: Folder): string => {
  let path = folder.name;
  let up = folder.parent;
  while (up) {
    path = \`\${up.name}/\${path}\`;
    up = up.parent;
  }
  return path;
};`,
    hiddenTests: [
      { call: 'pathOf({ name: "e", parent: { name: "d", parent: { name: "c", parent: { name: "b", parent: { name: "a", parent: null } } } } })', expected: 'a/b/c/d/e' },
      { call: '(() => { const root = { name: "r", parent: null }; return [pathOf({ name: "x", parent: root }), pathOf({ name: "y", parent: root })]; })()', expected: ['r/x', 'r/y'] },
      { call: '(() => { const folder = { name: "c", parent: { name: "b", parent: { name: "a", parent: null } } }; pathOf(folder); return folder.parent.parent.name; })()', expected: 'a' },
    ],
  },
  'ts-easy2-playlist-length': {
    solution: `const playlistSeconds = (tracks: string[]): number =>
  // Starting at 0 keeps an empty playlist from throwing and the total a number.
  tracks.reduce((total, track) => {
    const [minutes, seconds] = track.split(":").map(Number);
    return total + minutes * 60 + seconds;
  }, 0);`,
    junior: `const playlistSeconds = (tracks: string[]): number => {
  let total = 0;
  for (const track of tracks) {
    const parts = track.split(":");
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    total = total + minutes * 60 + seconds;
  }
  return total;
};`,
    senior: `const toSeconds = (track: string): number => {
  const [minutes, seconds] = track.split(":").map(Number);
  return minutes * 60 + seconds;
};

const playlistSeconds = (tracks: readonly string[]): number =>
  tracks.reduce((total, track) => total + toSeconds(track), 0);`,
    hiddenTests: [
      { call: 'playlistSeconds(["1:01", "1:01", "1:01"])', expected: 183 },
      { call: 'playlistSeconds(["10:59", "0:01"])', expected: 660 },
      { call: 'playlistSeconds(["0:00"])', expected: 0 },
      { call: 'playlistSeconds(["123:45"])', expected: 7425 },
    ],
  },
  'ts-easy2-most-urgent-first': {
    solution: `type Priority = "high" | "medium" | "low";

interface Task {
  title: string;
  priority: Priority;
}

// Alphabetical order would put low before medium, so each word gets a rank.
const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const byPriority = (tasks: readonly Task[]): Task[] =>
  [...tasks].sort((a, b) => RANK[a.priority] - RANK[b.priority]);`,
    junior: `type Priority = "high" | "medium" | "low";

interface Task {
  title: string;
  priority: Priority;
}

const byPriority = (tasks: readonly Task[]): Task[] => {
  const result: Task[] = [];
  for (const task of tasks) {
    if (task.priority === "high") {
      result.push(task);
    }
  }
  for (const task of tasks) {
    if (task.priority === "medium") {
      result.push(task);
    }
  }
  for (const task of tasks) {
    if (task.priority === "low") {
      result.push(task);
    }
  }
  return result;
};`,
    senior: `type Priority = "high" | "medium" | "low";

interface Task {
  title: string;
  priority: Priority;
}

const ORDER: readonly Priority[] = ["high", "medium", "low"];

const byPriority = (tasks: readonly Task[]): Task[] =>
  [...tasks].sort((a, b) => ORDER.indexOf(a.priority) - ORDER.indexOf(b.priority));`,
    hiddenTests: [
      { call: 'byPriority([{ title: "a", priority: "medium" }, { title: "b", priority: "medium" }]).map((task) => task.title)', expected: ['a', 'b'] },
      { call: '(() => { const tasks = [{ title: "a", priority: "low" }, { title: "b", priority: "high" }]; byPriority(tasks); return tasks.map((task) => task.title); })()', expected: ['a', 'b'] },
      { call: 'byPriority([{ title: "1", priority: "low" }, { title: "2", priority: "medium" }, { title: "3", priority: "high" }, { title: "4", priority: "medium" }, { title: "5", priority: "low" }, { title: "6", priority: "high" }]).map((task) => task.title)', expected: ['3', '6', '2', '4', '1', '5'] },
    ],
  },

  /* ── type guards, narrowing and for...of ──────────────────────────── */
  'ts-easy2-theme-colour': {
    solution: `const ACCENTS = ["teal", "coral", "gold"] as const;
type Accent = (typeof ACCENTS)[number];

// ACCENTS.includes only accepts its three words, so widen it for the check.
const isAccent = (value: string): value is Accent => (ACCENTS as readonly string[]).includes(value);`,
    junior: `const ACCENTS = ["teal", "coral", "gold"] as const;
type Accent = (typeof ACCENTS)[number];

const isAccent = (value: string): value is Accent => {
  for (const accent of ACCENTS) {
    if (accent === value) {
      return true;
    }
  }
  return false;
};`,
    senior: `const ACCENTS = ["teal", "coral", "gold"] as const;
type Accent = (typeof ACCENTS)[number];

const ACCENT_SET: ReadonlySet<string> = new Set(ACCENTS);

const isAccent = (value: string): value is Accent => ACCENT_SET.has(value);`,
    hiddenTests: [
      { call: '["teal", "coral", "gold", "red"].filter(isAccent)', expected: ['teal', 'coral', 'gold'] },
      { call: 'isAccent("coral")', expected: true },
      { call: 'isAccent(" teal")', expected: false },
      { call: 'isAccent("tealcoral")', expected: false },
    ],
  },
  'ts-easy2-first-error': {
    solution: `type Result = { ok: true; value: number } | { ok: false; error: string };

const firstError = (results: Result[]): string | null => {
  for (const result of results) {
    // After !result.ok the compiler knows this result has an error.
    if (!result.ok) return result.error;
  }
  return null;
};`,
    junior: `type Result = { ok: true; value: number } | { ok: false; error: string };

const firstError = (results: Result[]): string | null => {
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.ok === false) {
      return result.error;
    }
  }
  return null;
};`,
    senior: `type Result = { ok: true; value: number } | { ok: false; error: string };
type Failure = Extract<Result, { ok: false }>;

const firstError = (results: readonly Result[]): string | null =>
  results.find((result): result is Failure => !result.ok)?.error ?? null;`,
    hiddenTests: [
      { call: 'firstError([{ ok: false, error: "a" }, { ok: true, value: 1 }, { ok: false, error: "b" }])', expected: 'a' },
      { call: 'firstError([{ ok: true, value: 0 }, { ok: true, value: -1 }, { ok: false, error: "late" }])', expected: 'late' },
      { call: 'firstError([{ ok: true, value: 5 }])', expected: null },
    ],
  },
  'ts-easy2-build-a-query': {
    solution: `const toQuery = (params: Record<string, string | number>): string => {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    // Encode both halves: a space, an & or an = would otherwise break the string.
    pairs.push(\`\${encodeURIComponent(key)}=\${encodeURIComponent(value)}\`);
  }
  return pairs.join("&");
};`,
    junior: `const toQuery = (params: Record<string, string | number>): string => {
  let query = "";
  const keys = Object.keys(params);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i > 0) {
      query = query + "&";
    }
    query = query + encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
  }
  return query;
};`,
    senior: `const toQuery = (params: Readonly<Record<string, string | number>>): string =>
  Object.entries(params)
    .map(([key, value]) => \`\${encodeURIComponent(key)}=\${encodeURIComponent(value)}\`)
    .join("&");`,
    hiddenTests: [
      { call: 'toQuery({ "first name": "Ada", age: 36 })', expected: 'first%20name=Ada&age=36' },
      { call: 'toQuery({ a: "", b: "x" })', expected: 'a=&b=x' },
      { call: 'toQuery({ path: "a/b?c=d" })', expected: 'path=a%2Fb%3Fc%3Dd' },
      { call: 'toQuery({ price: 9.5 })', expected: 'price=9.5' },
    ],
  },
};
