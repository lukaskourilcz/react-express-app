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
      { call: 'Object.keys(toPreviews([{ id: 2, title: "T", body: "B", author: "A" }])[0]).sort()', expected: ['id', 'title'] },
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
    junior: "const flip = <A, B>([first, second]: [A, B]): [B, A] => {\n  const flipped: [B, A] = [second, first];\n  return flipped;\n};",
    senior: `function flip<A, B>([first, second]: readonly [A, B]): [B, A] {
  return [second, first];
}`,
    hiddenTypeTests: [{"code": "const __auditExact: [true, 'a'] = flip(['a' as const, true as const]);"}, {"code": "const __auditPair: [number, string] = flip<number, string>([1, \"a\"]);", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{const record=Object.freeze({a:1}),array=Object.freeze([2]),input=Object.freeze([record,array]),a=flip(input),b=flip(input);a.push(3);return [a!==b,b!==input,b.length,b[0]===array,b[1]===record,input[0]===record,a.length];})()", expected: [true, true, 2, true, true, true, 3] },
      { call: "(()=>{const fn=()=>1,symbol=Symbol('x'),pairs=[[fn,symbol],[undefined,NaN],[-0,null]];return pairs.every(pair=>{const result=flip(Object.freeze(pair));return result.length===2&&Object.is(result[0],pair[1])&&Object.is(result[1],pair[0]);});})()", expected: true },
      { call: "(()=>{const value=Object.freeze({}),pair=Object.freeze([value,value]),a=flip(pair),b=flip(pair);return a!==b&&a[0]===value&&a[1]===value;})()", expected: true },

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
    junior: "const splitHeader = (rows: string[][]): { header: string[]; body: string[][] } => {\n  const [header = [], ...remainingRows] = rows;\n  const body = remainingRows;\n  return { header: header, body: body };\n};",
    senior: `interface Table {
  header: string[];
  body: string[][];
}

const splitHeader = ([header = [], ...body]: readonly string[][]): Table => ({ header, body });`,
    hiddenTypeTests: [{"code": "const __auditWrongBody: string[] = splitHeader([[\"a\"]]).body;", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{const header=Object.freeze([' h ','\ud83e\udd88']),row=Object.freeze(['','1']),rows=Object.freeze([header,row]),a=splitHeader(rows),b=splitHeader(rows);a.body.push(['new']);return [a!==b,a.header===header,a.body[0]===row,a.body!==rows,a.body!==b.body,b.body.length,rows.length,Object.keys(a).sort().join(',')];})()", expected: [true, true, true, true, true, 1, 2, "body,header"] },
      { call: "(()=>{const row=Object.freeze([]),rows=Object.freeze([row]),out=splitHeader(rows);return [out.header===row,out.body.length,out.body!==row];})()", expected: [true, 0, true] },
      { call: "(()=>{const a=splitHeader(Object.freeze([])),b=splitHeader(Object.freeze([]));a.header.push('x');a.body.push(['y']);return [a.header!==a.body,a.header!==b.header,a.body!==b.body,b.header.length,b.body.length];})()", expected: [true, true, true, 0, 0] },
      { call: "(()=>{const rows=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze([String(i)]))),out=splitHeader(rows);return [out.header===rows[0],out.body.length,out.body[998]===rows[999],rows.length];})()", expected: [true, 999, true, 1000] },

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
    junior: "interface ApiUser {\n  user_name: string;\n  avatar_url?: string;\n}\n\ninterface Profile {\n  name: string;\n  avatar: string | null;\n}\n\nconst toProfile = (raw: ApiUser): Profile => {\n  const { user_name: name, avatar_url: avatar = null } = raw;\n  const profile: Profile = { name: name, avatar: avatar };\n  return profile;\n};",
    senior: "interface ApiUser {\n  user_name: string;\n  avatar_url?: string;\n}\ninterface Profile {\n  name: string;\n  avatar: string | null;\n}\nfunction toProfile(raw: ApiUser): Profile {\n  const { user_name: name, avatar_url: avatar = null } = raw;\n  return { name, avatar };\n}",
    hiddenTypeTests: [{"code": "const __auditOptional: Profile = toProfile({user_name:\"a\",avatar_url:undefined});"}, {"code": "toProfile({user_name:\"a\",avatar_url:42});", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{const raw=Object.assign(Object.create(null),{user_name:' Ada \ud83e\udd88 ',avatar_url:' /a.png ',extra:'ignore'});Object.freeze(raw);const a=toProfile(raw),b=toProfile(raw);a.name='changed';return [a!==b,b.name,b.avatar,raw.user_name,Object.keys(b).sort().join(','),Object.getPrototypeOf(b)===Object.prototype];})()", expected: [true, " Ada \ud83e\udd88 ", " /a.png ", " Ada \ud83e\udd88 ", "avatar,name", true] },
      { call: "[toProfile(Object.freeze({user_name:'',avatar_url:undefined})),toProfile(Object.freeze({user_name:'x',avatar_url:''})),toProfile(Object.freeze({user_name:'x'}))]", expected: [{"name": "", "avatar": null}, {"name": "x", "avatar": ""}, {"name": "x", "avatar": null}] },
      { call: "(()=>{const name='x'.repeat(200),avatar='y'.repeat(200),out=toProfile({user_name:name,avatar_url:avatar});return [out.name===name,out.avatar===avatar];})()", expected: [true, true] },

      { call: 'toProfile({ user_name: "dee", avatar_url: undefined })', expected: { name: 'dee', avatar: null } },
      { call: 'Object.keys(toProfile({ user_name: "e", avatar_url: "/e.png" })).sort()', expected: ['avatar', 'name'] },
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
    hiddenTypeTests: [{"code": "routeNames(42,new Map<string,string>());", "rejects": true}],
    hiddenTests: [
      { call: "routeNames('-prg--xyz-',new Map([['PRG','Prague'],['','Gap']]))", expected: ["Gap", "Prague", "Gap", "xyz", "Gap"] },
      { call: "routeNames(' prg -\u00df-__proto__-x',new Map([[' PRG ','SpacePrague'],['SS','DoubleS'],['__PROTO__','ProtoAirport'],['X','']]))", expected: ["SpacePrague", "DoubleS", "ProtoAirport", ""] },
      { call: "(()=>{const map=new Map([['P','Place']]),out=routeNames('p-'.repeat(1000),map);return [out.length,out.slice(0,1000).every(x=>x==='Place'),out[1000],map.size,map.get('P')];})()", expected: [1001, true, "", 1, "Place"] },
      { call: "(()=>{const map=new Map([['','Empty']]),a=routeNames('',map),b=routeNames('',map);a.push('x');return [a!==b,b.length,a.length,map.get('')];})()", expected: [true, 0, 1, "Empty"] },

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
    hiddenTypeTests: [{"code": "const __auditSource: ReadonlySet<string> = new Set([\"a\"]); toggle(__auditSource,\"b\").add(\"c\");"}],
    hiddenTests: [
      { call: "[...toggle(new Set(['z','a']), 'm')]", expected: ["z", "a", "m"] },
      { call: "[...toggle(new Set([' A ','a','','A']), 'a')]", expected: [" A ", "", "A"] },
      { call: "(()=>{const input=Object.freeze(new Set(['z','a'])),a=toggle(input,'z'),b=toggle(input,'z');a.add('changed');return [a instanceof Set,a!==input,a!==b,[...input],[...b],a.size];})()", expected: [true, true, true, ["z", "a"], ["a"], 2] },
      { call: "(()=>{const input=new Set(Array.from({length:1000},(_,i)=>String(999-i))),out=toggle(input,'1000');return [input.size,out.size,[...out][0],[...out][1000],out.has('1000'),input.has('1000')];})()", expected: [1000, 1001, "999", "1000", true, false] },

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
    junior: "const basketTotal = (prices: ReadonlyMap<string, number>, basket: string[]): number =>\n  basket.reduce((total, product) => {\n    const price = prices.get(product);\n    if (price === undefined) {\n      throw new Error(\"No price for \" + product);\n    }\n    return total + price;\n  }, 0);",
    senior: `const priceOf = (prices: ReadonlyMap<string, number>, product: string): number => {
  const price = prices.get(product);
  if (price === undefined) throw new Error(\`No price for \${product}\`);
  return price;
};

const basketTotal = (prices: ReadonlyMap<string, number>, basket: readonly string[]): number =>
  basket.reduce((total, product) => total + priceOf(prices, product), 0);`,
    hiddenTypeTests: [{"code": "basketTotal(new Map<string,string>([[\"a\",\"1\"]]),[\"a\"]);", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{try{basketTotal(new Map(),['z','a']);return false;}catch(e){return e instanceof Error&&e.message==='No price for z';}})()", expected: true },
      { call: "(()=>{const prices=new Map([['',0],[' A ',7],['a',11],['__proto__',13]]),basket=Object.freeze(['',' A ','a','__proto__',' A ']),before=JSON.stringify([...prices]),out=basketTotal(prices,basket);return [out,JSON.stringify([...prices])===before,basket.length,basket[0]];})()", expected: [38, true, 5, ""] },
      { call: "(()=>{try{basketTotal(new Map(),['']);return false;}catch(e){return e instanceof Error&&e.message==='No price for ';}})()", expected: true },
      { call: "basketTotal(new Map([['a',1000000000]]),Object.freeze(Array(1000).fill('a')))", expected: 1000000000000 },

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
    junior: "interface Todo {\n  id: number;\n  text: string;\n  done: boolean;\n}\n\n// The spread copies the todo, then done: true overwrites one property of the copy.\nconst markDone = (todos: readonly Todo[], id: number): Todo[] => {\n  const result: Todo[] = [];\n  for (const todo of todos) {\n    if (todo.id === id) {\n      const changed: Todo = { ...todo, done: true };\n      result.push(changed);\n    } else result.push(todo);\n  }\n  return result;\n};",
    senior: `interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const markDone = (todos: readonly Todo[], id: number): Todo[] =>
  todos.map((todo) => (todo.id === id && !todo.done ? { ...todo, done: true } : todo));`,
    hiddenTypeTests: [{"code": "const __auditTodos: readonly Todo[] = [Object.freeze({id:1,text:\"a\",done:true})]; const __auditDone: Todo[] = markDone(__auditTodos,1);"}],
    hiddenTests: [
      { call: "(()=>{const nested=Object.freeze({tag:'x'}),key=Symbol('meta'),match=Object.assign(Object.create(null),{id:1,text:'',done:false,nested});match[key]=nested;Object.defineProperty(match,'__proto__',{value:nested,enumerable:true});Object.freeze(match);const other=Object.freeze({id:2,text:'x',done:false}),input=Object.freeze([match,other]),a=markDone(input,1),b=markDone(input,1);a[0].text='changed';return [a!==input,a!==b,a[0]!==match,a[0]!==b[0],a[1]===other,b[0].nested===nested,b[0][key]===nested,Object.hasOwn(b[0],'__proto__'),b[0].__proto__===nested,Object.getPrototypeOf(b[0])===Object.prototype,match.text,b[0].done];})()", expected: [true, true, true, true, true, true, true, true, true, true, "", true] },
      { call: "(()=>{const a=Object.freeze({id:0,text:'a',done:false}),b=Object.freeze({id:0,text:'b',done:true}),input=Object.freeze([a,b]),out=markDone(input,0);return [out.length,out[0]!==a,out[1].done&&out[1].text===b.text,out.every(x=>x.done),a.done,b.done];})()", expected: [2, true, true, true, false, true] },
      { call: "(()=>{const item=Object.freeze({id:1,text:'x',done:false}),input=Object.freeze([item]),a=markDone(input,9),empty=markDone([],9);a.push(item);return [a!==input,a[0]===item,input.length,empty!==markDone([],9),empty.length];})()", expected: [true, true, 1, true, 0] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({id:i,text:String(i),done:false,meta:i}))),out=markDone(input,999);return [out.length,out[0]===input[0],out[999]!==input[999],out[999].done,out[999].meta,input[999].done];})()", expected: [1000, true, true, true, 999, false] },

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
    junior: "interface Note {\n  readonly title: string;\n  readonly tags: readonly string[];\n}\n\nconst addTag = (note: Note, tag: string): Note => {\n  for (const existing of note.tags) {\n    if (existing === tag) return note;\n  }\n  return { ...note, tags: [...note.tags, tag] };\n};",
    senior: `interface Note {
  readonly title: string;
  readonly tags: readonly string[];
}

const addTag = (note: Note, tag: string): Note =>
  note.tags.includes(tag) ? note : { ...note, tags: [...note.tags, tag] };`,
    hiddenTests: [
      { call: "(()=>{const extra=Object.freeze({}),sym=Symbol('meta'),note=Object.assign(Object.create(null),{title:' Ideas \ud83e\udd88 ',tags:Object.freeze(['','work','work']),extra});Object.defineProperty(note,'__proto__',{value:extra,enumerable:true});note[sym]=extra;Object.freeze(note);const out=addTag(note,'WORK');return [out!==note,out.tags!==note.tags,out.tags,addTag(note,'work')===note,out.extra===extra,out[sym]===extra,Object.hasOwn(out,'__proto__'),out.__proto__===extra,Object.getPrototypeOf(out)===Object.prototype,note.title,note.tags.length];})()", expected: [true, true, ["", "work", "work", "WORK"], true, true, true, true, true, true, " Ideas \ud83e\udd88 ", 3] },
      { call: "(()=>{const inherited={ignored:'no'},note=Object.assign(Object.create(inherited),{title:'',tags:Object.freeze([])}),out=addTag(note,'');return [out.tags,addTag(out,'')===out,Object.hasOwn(out,'ignored'),note.tags.length];})()", expected: [[""], true, false, 0] },
      { call: "(()=>{const note={title:'t',tags:Object.freeze(Array.from({length:1000},(_,i)=>String(i)))};for(let i=0;i<100;i++)note['extra'+i]=i;Object.freeze(note);const out=addTag(note,'new');return [out.tags.length,out.tags[1000],out.extra99,note.tags.length,Object.keys(out).length];})()", expected: [1001, "new", 99, 1000, 102] },

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
    solution: "interface Folder {\n  name: string;\n  parent: Folder | null;\n}\n\nconst pathOf = (folder: Folder): string => {\n  const names: string[] = [];\n  let current: Folder | null = folder;\n  // The null check narrows current to Folder inside the loop.\n  while (current !== null) {\n    names.push(current.name);\n    current = current.parent;\n  }\n  return names.reverse().join(\"/\");\n};",
    junior: "interface Folder {\n  name: string;\n  parent: Folder | null;\n}\n\nconst pathOf = (folder: Folder): string => {\n  const upward: string[] = [];\n  let current: Folder | null = folder;\n  while (current !== null) {\n    upward.push(current.name);\n    current = current.parent;\n  }\n  const downward: string[] = [];\n  for (let i = upward.length - 1; i >= 0; i--) {\n    downward.push(upward[i]);\n  }\n  return downward.join(\"/\");\n};",
    senior: "interface Folder {\n  name: string;\n  parent: Folder | null;\n}\n\nconst pathOf = (folder: Folder): string => {\n  const names: string[] = [];\n  let current: Folder | null = folder;\n  while (current !== null) {\n    names.push(current.name);\n    current = current.parent;\n  }\n  names.reverse();\n  return names.join(\"/\");\n};",
    hiddenTypeTests: [{"code": "pathOf(null);", "rejects": true}],
    hiddenTests: [
      { call: "[pathOf({name:'child',parent:{name:'',parent:null}}),pathOf({name:'',parent:{name:'',parent:null}}),pathOf({name:'',parent:null})]", expected: ["/child", "/", ""] },
      { call: "pathOf({name:'./leaf',parent:{name:' a/b ',parent:{name:'\ud83e\udd88',parent:null}}})", expected: "\ud83e\udd88/ a/b /./leaf" },
      { call: "(()=>{const root=Object.freeze({name:'',parent:null}),leaf=Object.freeze({name:' x ',parent:root});return [pathOf(leaf),leaf.parent===root,root.name,leaf.name];})()", expected: ["/ x ", true, "", " x "] },
      { call: "(()=>{let node=null;const names=[];for(let i=0;i<1000;i++){const name=i%2===0?'':String(i);names.push(name);node=Object.freeze({name,parent:node});}const out=pathOf(node);return [out===names.join('/'),out.split('/').length,node.name];})()", expected: [true, 1000, "999"] },

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
    junior: "const playlistSeconds = (tracks: string[]): number =>\n  tracks.reduce((total, track) => {\n    const parts = track.split(\":\");\n    const minutes = Number(parts[0]);\n    const seconds = Number(parts[1]);\n    return total + minutes * 60 + seconds;\n  }, 0);",
    senior: `const toSeconds = (track: string): number => {
  const [minutes, seconds] = track.split(":").map(Number);
  return minutes * 60 + seconds;
};

const playlistSeconds = (tracks: readonly string[]): number =>
  tracks.reduce((total, track) => total + toSeconds(track), 0);`,
    hiddenTypeTests: [{"code": "playlistSeconds([null]);", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{const input=Object.freeze(['000001:01','72:00','0:00']),out=playlistSeconds(input);return [out,input.length,input[0],input[1]];})()", expected: [4381, 3, "000001:01", "72:00"] },
      { call: "playlistSeconds(Object.freeze(Array(1000).fill('999999:59')))", expected: 59999999000 },
      { call: "(()=>{const input=['2:00','1:00','2:00'],a=playlistSeconds(input),b=playlistSeconds(input);return [a,b,input];})()", expected: [300, 300, ["2:00", "1:00", "2:00"]] },

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
    junior: "type Priority = \"high\" | \"medium\" | \"low\";\n\ninterface Task {\n  title: string;\n  priority: Priority;\n}\n\nconst RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };\nconst byPriority = (tasks: readonly Task[]): Task[] => {\n  const result: Task[] = [];\n  for (const task of tasks) result.push(task);\n  result.sort((left, right) => RANK[left.priority] - RANK[right.priority]);\n  return result;\n};",
    senior: "type Priority = \"high\" | \"medium\" | \"low\";\n\ninterface Task {\n  title: string;\n  priority: Priority;\n}\n\nconst RANK: Readonly<Record<Priority, number>> = { high: 0, medium: 1, low: 2 };\nfunction byPriority(tasks: readonly Task[]): Task[] {\n  return tasks.toSorted((left, right) => RANK[left.priority] - RANK[right.priority]);\n}",
    hiddenTypeTests: [{"code": "const __auditTasks: readonly Task[] = [{title:\"a\",priority:\"high\"}]; const __auditSorted: Task[] = byPriority(__auditTasks);"}],
    hiddenTests: [
      { call: "(()=>{const extra=Object.freeze({}),a=Object.freeze({title:'same',priority:'low',extra}),b=Object.freeze({title:'same',priority:'high',extra}),c=Object.freeze({title:'same',priority:'high',extra}),input=Object.freeze([a,b,c,b]),out=byPriority(input),again=byPriority(input);out.push(a);return [out!==input,out!==again,again.length,again[0]===b,again[1]===c,again[2]===b,again[3]===a,again[0].extra===extra,input[0]===a];})()", expected: [true, true, 4, true, true, true, true, true, true] },
      { call: "(()=>{const item=Object.freeze({title:'',priority:'medium'}),input=Object.freeze([item]),out=byPriority(input),empty=byPriority([]);out.push(item);return [out!==input,out[0]===item,input.length,empty!==byPriority([]),empty.length];})()", expected: [true, true, 1, true, 0] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({title:String(i),priority:['low','high','medium'][i%3]}))),out=byPriority(input);const groups=['high','medium','low'];let ok=true,offset=0;for(const p of groups){for(const task of input)if(task.priority===p){ok=ok&&out[offset]===task;offset++;}}return [out.length,offset,ok,input[0].priority];})()", expected: [1000, 1000, true, "low"] },

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
    hiddenTypeTests: [{"code": "const __auditGuard: (value:string)=>value is Accent = isAccent;"}, {"code": "ACCENTS.push(\"teal\");", "rejects": true}],
    hiddenTests: [
      { call: "['teal ','coral\\t','gold\\n','TEAL','tealcoral','teal','coral','gold'].map(isAccent)", expected: [false, false, false, false, false, true, true, true] },
      { call: "(()=>{const before=JSON.stringify(ACCENTS);for(let i=0;i<30;i++){isAccent('other');isAccent('coral');}return [JSON.stringify(ACCENTS)===before,isAccent('x'.repeat(200)),isAccent('__proto__'),isAccent('constructor')];})()", expected: [true, false, false, false] },
      { call: "[' teAL ','golden','coral reef','\\u0074eal',''].map(isAccent)", expected: [false, false, false, true, false] },

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
    junior: "type Result = { ok: true; value: number } | { ok: false; error: string };\n\nconst firstError = (results: Result[]): string | null => {\n  for (const result of results) {\n    if (result.ok === false) {\n      return result.error;\n    }\n  }\n  return null;\n};",
    senior: "type Result = { ok: true; value: number } | { ok: false; error: string };\n\nconst firstError = (results: readonly Result[]): string | null => {\n  for (const result of results) {\n    if (result.ok === false) return result.error;\n  }\n  return null;\n};",
    hiddenTypeTests: [{"code": "firstError([{ok:true,value:\"x\"}]);", "rejects": true}],
    hiddenTests: [
      { call: "firstError(Object.freeze([Object.freeze({ok:true,value:0}),Object.freeze({ok:false,error:'  \ud83e\udd88  '}),Object.freeze({ok:false,error:'later'})]))", expected: "  \ud83e\udd88  " },
      { call: "(()=>{const error=Object.freeze({ok:false,error:' '}),input=Object.freeze([error]);return [firstError(input),input[0]===error,error.error];})()", expected: [" ", true, " "] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze(i===999?{ok:false,error:''}:{ok:true,value:i})));return [firstError(input),firstError(input.slice(0,999)),input.length,input[999].error];})()", expected: ["", null, 1000, ""] },

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
