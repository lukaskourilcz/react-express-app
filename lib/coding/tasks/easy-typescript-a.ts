// The Easy band of the TypeScript track, first wave (#226).
//
// Before this wave the matrix listed 17 TypeScript tags as short. Five had no
// Easy challenge at all: utility types, generic constraints, destructuring,
// Map and Set, and two pointers. Each gets three. Filter, keyof, map, spread,
// while, reduce, sort, strings and type guards each sat at one and get two
// more; readonly, literal types and Record sat at two. Two more challenges
// thicken the most used Medium tag, for...of, and narrowing.
//
// Every challenge is graded twice, like the rest of the TypeScript track: the
// runtime checks test what the code does, and the type checks, run by the
// compiler, test what its types promise. Several are type-level first: the
// learner declares `Pick`, `Exclude`, `Record<keyof …>`, a readonly shape or a
// type predicate, and a type check only passes when the type is right.
//
// Same rules as the JavaScript waves: one technique per challenge (two focus
// tags at most), ten minutes or less, and a starter that fails its own checks.
// The first focus tag names the documentation page that ends the hint ladder.
// Solutions live in `../solutions/easy-typescript-a.ts`, and `EASY_BAND` in
// `../catalog.ts` lists this file. English only: there is no Czech overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';

export const EASY_TYPESCRIPT_A_TASKS: CodingTaskSource[] = [
  /* ── utility types ────────────────────────────────────────────────── */
  {
    id: 'ts-easy2-draft-post',
    track: 'typescript',
    topic: 'typescript',
    level: 18,
    tier: 1,
    focus: ['utility-types', 'filter'],
    title: 'What the draft still needs',
    prompt: 'A blog editor saves drafts before every field is filled in. `Post` has a `title`, a `body` and a list of `tags`. Write `missingFields(draft: Partial<Post>): string[]`, returning the names of the fields the draft does not have yet, in the order `title`, `body`, `tags`. `Partial<Post>` is `Post` with every property optional, so `{ title: "Hi" }` is a valid draft. A field counts as missing only when it is `undefined`: an empty title is still a title.',
    starter: `interface Post {
  title: string;
  body: string;
  tags: string[];
}

const missingFields = (draft) => {

};

// Scratch pad. Change this and press Run.
console.log(missingFields({ title: "Hi" }));
`,
    skeleton: `interface Post {
  title: string;
  body: string;
  tags: string[];
}

const FIELDS = ["title", "body", "tags"] as const;

const missingFields = (draft: Partial<Post>): string[] => {
  // keep the field names the draft leaves undefined
};`,
    hints: ['`Partial<Post>` gives you a type where `title`, `body` and `tags` may each be absent. List the three field names in an array and `filter` it: keep a name when `draft[name]` is `undefined`.'],
    approach: [
      'Type the parameter as `Partial<Post>`. Every property becomes optional, so any subset of the fields type-checks.',
      'Put the field names in an array, in the order the answer needs.',
      'Filter that array, keeping a name when `draft[name] === undefined`, and return what is left.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'missingFields({ title: "Hi" })', expected: ['body', 'tags'] },
      { call: 'missingFields({ body: "Text", tags: ["ts"] })', expected: ['title'] },
      { call: 'missingFields({ title: "Hi", body: "Text", tags: [] })', expected: [], label: 'a finished draft needs nothing' },
      { call: 'missingFields({})', expected: ['title', 'body', 'tags'], label: 'an empty draft needs everything', edge: true },
      { call: 'missingFields({ title: "", tags: [] })', expected: ['body'], label: 'an empty title is still a title', edge: true },
    ],
    typeTests: [
      { code: 'missingFields({ tags: ["ts"] });', label: 'a draft with only some fields is accepted' },
      { code: 'const __names: string[] = missingFields({});', label: 'gives back a list of names' },
      { code: 'missingFields({ title: 42 });', label: 'a title is still text', rejects: true },
      { code: 'missingFields({ author: "Ada" });', label: 'a field Post does not have is refused', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-article-previews',
    track: 'typescript',
    topic: 'typescript',
    level: 19,
    tier: 2,
    focus: ['utility-types', 'map'],
    title: 'Article previews',
    prompt: 'A news page lists articles as cards that show only the `id` and the `title`. Declare `type Preview = Pick<Article, "id" | "title">`, then write `toPreviews(articles: Article[]): Preview[]`, returning one preview per article in the same order. A preview carries those two properties and nothing else, so the `body` and the `author` stay behind. `Article` is declared for you.',
    starter: `interface Article {
  id: number;
  title: string;
  body: string;
  author: string;
}

const toPreviews = (articles) => {

};

// Scratch pad. Change this and press Run.
console.log(toPreviews([{ id: 1, title: "Hello", body: "Long text", author: "Ada" }]));
`,
    skeleton: `interface Article {
  id: number;
  title: string;
  body: string;
  author: string;
}

type Preview = Pick<Article, "id" | "title">;

const toPreviews = (articles: Article[]): Preview[] => {
  // one { id, title } object per article
};`,
    hints: ['`Pick<Article, "id" | "title">` builds a type with just those two properties. `map` gives one result per article. Build each result from the two properties: returning the whole article would keep the body.'],
    approach: [
      'Declare `Preview` with `Pick`. The second type argument is a union of the keys to keep.',
      'Map over the articles.',
      'For each one, return a new object holding only `id` and `title`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'toPreviews([{ id: 1, title: "Hello", body: "Long text", author: "Ada" }])', expected: [{ id: 1, title: 'Hello' }] },
      { call: 'toPreviews([{ id: 4, title: "Tides", body: "b", author: "Bo" }, { id: 2, title: "Reefs", body: "c", author: "Cy" }])', expected: [{ id: 4, title: 'Tides' }, { id: 2, title: 'Reefs' }], label: 'the order stays' },
      { call: 'toPreviews([])', expected: [], label: 'no articles', edge: true },
      { call: 'toPreviews([{ id: 0, title: "", body: "", author: "" }])', expected: [{ id: 0, title: '' }], label: 'an empty title stays', edge: true },
    ],
    typeTests: [
      { code: 'const __p: Preview = { id: 1, title: "Hi" };', label: 'a preview has an id and a title' },
      { code: 'const __list: Preview[] = toPreviews([{ id: 1, title: "Hi", body: "b", author: "a" }]);', label: 'gives back previews' },
      { code: 'const __q: Preview = { id: 1, title: "Hi", body: "b" };', label: 'a preview has no body', rejects: true },
      { code: 'toPreviews([{ id: 1, title: "Hi" }]);', label: 'the input is whole articles', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-only-weekdays',
    track: 'typescript',
    topic: 'typescript',
    level: 18,
    tier: 2,
    focus: ['utility-types', 'type-guards'],
    title: 'Only on weekdays',
    prompt: '`Day` is a union of seven short day names, `"mon"` to `"sun"`. Declare `type Weekday = Exclude<Day, "sat" | "sun">`, which leaves the five working days. Then write `isWeekday(day: Day): day is Weekday`, returning `true` from Monday to Friday and `false` at the weekend. The return type tells the compiler that a day which passes the check is a `Weekday`.',
    starter: `type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const isWeekday = (day) => {

};

// Scratch pad. Change this and press Run.
console.log(isWeekday("mon"), isWeekday("sat"));
`,
    skeleton: `type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type Weekday = Exclude<Day, "sat" | "sun">;

const isWeekday = (day: Day): day is Weekday => {
  // true unless it is the weekend
};`,
    hints: ['`Exclude<Day, "sat" | "sun">` removes two members from the union, so you never write the five working days out by hand. At runtime the check is plain: a day is a weekday when it is neither `"sat"` nor `"sun"`.'],
    approach: [
      'Declare `Weekday` with `Exclude`.',
      'Give `isWeekday` the return type `day is Weekday`. That is a type predicate: wherever the call returns `true`, the compiler narrows `day` to a `Weekday`.',
      'Return `day !== "sat" && day !== "sun"`.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'isWeekday("mon")', expected: true },
      { call: 'isWeekday("wed")', expected: true },
      { call: 'isWeekday("sat")', expected: false },
      { call: 'isWeekday("fri")', expected: true, label: 'Friday still counts', edge: true },
      { call: 'isWeekday("sun")', expected: false, label: 'Sunday is the weekend', edge: true },
    ],
    typeTests: [
      { code: 'const __w: Weekday = "fri";', label: 'Friday is a Weekday' },
      { code: 'const __d = "sat" as Day; if (isWeekday(__d)) { const __x: Weekday = __d; }', label: 'a day that passes the check is a Weekday' },
      { code: 'const __s: Weekday = "sun";', label: 'Sunday is not a Weekday', rejects: true },
      { code: 'isWeekday("monday");', label: 'only the short day names are accepted', rejects: true },
    ],
  },

  /* ── generic constraints ──────────────────────────────────────────── */
  {
    id: 'ts-easy2-longer-of-two',
    track: 'typescript',
    topic: 'typescript',
    level: 15,
    tier: 1,
    focus: ['constraints'],
    title: 'The longer of two',
    prompt: 'Write `longer<T extends { length: number }>(a: T, b: T): T`, returning whichever argument has the greater `length`, or `a` when the two tie. The constraint lets the function read `.length` on anything that has one, so the same function works for two strings and for two arrays, and the caller gets back the type they passed in.',
    starter: `const longer = (a, b) => {

};

// Scratch pad. Change this and press Run.
console.log(longer("tea", "coffee"));
`,
    skeleton: `const longer = <T extends { length: number }>(a: T, b: T): T => {
  // compare the two lengths
};`,
    hints: ['`T extends { length: number }` accepts strings, arrays and any object with a numeric `length`. Inside the function you may read `a.length` and `b.length`, and returning `a` or `b` keeps the caller’s own type.'],
    approach: [
      'Add the type parameter with its constraint: `<T extends { length: number }>`.',
      'Compare `b.length` with `a.length`.',
      'Return `b` only when it is strictly longer, so a tie gives back `a`.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'longer("tea", "coffee")', expected: 'coffee' },
      { call: 'longer([1, 2, 3], [4])', expected: [1, 2, 3] },
      { call: 'longer("ab", "cd")', expected: 'ab', label: 'a tie gives the first', edge: true },
      { call: 'longer("", "x")', expected: 'x', label: 'an empty string is the shortest', edge: true },
      { call: 'longer([], [])', expected: [], label: 'two empty arrays', edge: true },
    ],
    typeTests: [
      { code: 'const __s: string = longer("a", "bc");', label: 'two strings give a string' },
      { code: 'const __n: number[] = longer([1], [2, 3]);', label: 'two arrays give an array' },
      { code: 'longer(10, 20);', label: 'a number has no length', rejects: true },
      { code: 'const __x: string = longer([1], [2]);', label: 'arrays do not come back as text', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-only-active',
    track: 'typescript',
    topic: 'typescript',
    level: 15,
    tier: 2,
    focus: ['constraints', 'filter'],
    title: 'Only the active ones',
    prompt: 'Users, products and sessions all carry an `active` flag. Write `onlyActive<T extends { active: boolean }>(items: T[]): T[]`, keeping the items whose `active` is `true`, in their original order. Each item keeps its other properties: filtering users gives back users, not bare `{ active: boolean }` objects.',
    starter: `const onlyActive = (items) => {

};

// Scratch pad. Change this and press Run.
console.log(onlyActive([{ name: "ada", active: true }, { name: "bo", active: false }]));
`,
    skeleton: `const onlyActive = <T extends { active: boolean }>(items: T[]): T[] => {
  // keep the active items
};`,
    hints: ['Without a type parameter the result would be `{ active: boolean }[]`, and the caller would lose every other property. With `T extends { active: boolean }` you can read `item.active` and still return `T[]`.'],
    approach: [
      'Declare `T` with the constraint `{ active: boolean }`.',
      'Filter the items on `item.active`.',
      'Return the filtered array. `filter` keeps the element type, so it is already a `T[]`.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'onlyActive([{ name: "ada", active: true }, { name: "bo", active: false }])', expected: [{ name: 'ada', active: true }] },
      { call: 'onlyActive([{ id: 1, active: true }, { id: 2, active: true }])', expected: [{ id: 1, active: true }, { id: 2, active: true }] },
      { call: 'onlyActive([{ active: false }])', expected: [], label: 'nothing active', edge: true },
      { call: 'onlyActive([])', expected: [], label: 'no items', edge: true },
      { call: '(() => { const items = [{ active: false }, { active: true }]; onlyActive(items); return items.length; })()', expected: 2, label: 'the input keeps every item', edge: true },
    ],
    typeTests: [
      { code: 'const __users: { name: string; active: boolean }[] = onlyActive([{ name: "ada", active: true }]);', label: 'the caller’s own type comes back' },
      { code: 'onlyActive([{ name: "ada" }]);', label: 'something without an active flag is refused', rejects: true },
      { code: 'onlyActive([{ active: "yes" }]);', label: 'the flag is a boolean', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-cheapest-offer',
    track: 'typescript',
    topic: 'typescript',
    level: 15,
    tier: 2,
    focus: ['constraints', 'reduce'],
    title: 'The cheapest offer',
    prompt: 'Write `cheapest<T extends { price: number }>(items: T[]): T | null`, returning the item with the lowest `price`, or `null` for an empty list. Find it with `reduce`. On a tie the first of the equal items wins. Return the item itself, with all its properties, rather than its price.',
    starter: `const cheapest = (items) => {

};

// Scratch pad. Change this and press Run.
console.log(cheapest([{ name: "a", price: 3 }, { name: "b", price: 1 }]));
`,
    skeleton: `const cheapest = <T extends { price: number }>(items: T[]): T | null => {
  if (/* no items */) return null;
  return items.reduce((best, item) => /* the cheaper of the two */);
};`,
    hints: ['`reduce` with no starting value begins with the first item as `best`, and throws on an empty array, so check the length first. Swap `best` for `item` only when `item.price` is strictly lower, and the first of two equal prices stays.'],
    approach: [
      'Constrain `T` to `{ price: number }`, so you can read `item.price` and still return the caller’s type.',
      'Return `null` when the list is empty.',
      'Reduce the list, keeping `item` when its price is lower than `best.price` and `best` otherwise.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'cheapest([{ name: "a", price: 3 }, { name: "b", price: 1 }, { name: "c", price: 2 }])', expected: { name: 'b', price: 1 } },
      { call: 'cheapest([{ id: 7, price: 10 }])', expected: { id: 7, price: 10 }, label: 'one item' },
      { call: 'cheapest([])', expected: null, label: 'no items', edge: true },
      { call: 'cheapest([{ name: "x", price: 2 }, { name: "y", price: 2 }])', expected: { name: 'x', price: 2 }, label: 'the first wins a tie', edge: true },
      { call: 'cheapest([{ name: "a", price: 5 }, { name: "free", price: 0 }])', expected: { name: 'free', price: 0 }, label: 'a free item is the cheapest', edge: true },
    ],
    typeTests: [
      { code: 'const __c: { name: string; price: number } | null = cheapest([{ name: "a", price: 1 }]);', label: 'the item keeps its name' },
      { code: 'cheapest([{ name: "a" }]);', label: 'an item needs a price', rejects: true },
      { code: 'const __p: number = cheapest([{ price: 1 }]);', label: 'it gives back an item, not a price', rejects: true },
    ],
  },

  /* ── destructuring ────────────────────────────────────────────────── */
  {
    id: 'ts-easy2-flip-a-pair',
    track: 'typescript',
    topic: 'typescript',
    level: 4,
    tier: 1,
    focus: ['destructuring', 'tuples'],
    title: 'Flip a pair',
    prompt: 'Write `flip<A, B>([first, second]: [A, B]): [B, A]`, taking a tuple of two items and returning a new tuple with them the other way round. Pull the two items out with array destructuring in the parameter list. The types swap too: flipping `[1, "a"]` gives `["a", 1]`, typed `[string, number]`.',
    starter: `const flip = (pair) => {

};

// Scratch pad. Change this and press Run.
console.log(flip([1, "a"]));
`,
    skeleton: `const flip = <A, B>([first, second]: [A, B]): [B, A] => {
  // return them the other way round
};`,
    hints: ['Destructuring in the parameter list names both items at once: `([first, second]: [A, B])`. The annotation goes after the whole pattern, not inside it.'],
    approach: [
      'Declare two type parameters, one for each position.',
      'Destructure the tuple in the parameter list and annotate the pattern as `[A, B]`.',
      'Return `[second, first]`, typed `[B, A]`.',
    ],
    verify: 'tests',
    estimatedMinutes: 5,
    tests: [
      { call: 'flip([1, "a"])', expected: ['a', 1] },
      { call: 'flip(["x", true])', expected: [true, 'x'] },
      { call: 'flip([0, 0])', expected: [0, 0], label: 'the same value twice', edge: true },
      { call: 'flip([null, "n"])', expected: ['n', null], label: 'null is a value too', edge: true },
      { call: '(() => { const pair = [1, 2]; flip(pair); return pair; })()', expected: [1, 2], label: 'the pair handed in is not changed', edge: true },
    ],
    typeTests: [
      { code: 'const __f: [string, number] = flip([1, "a"]);', label: 'the types swap places' },
      { code: 'const __g: [number, string] = flip([1, "a"]);', label: 'the old order is gone', rejects: true },
      { code: 'flip([1, 2, 3]);', label: 'a pair has two items', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-header-and-rows',
    track: 'typescript',
    topic: 'typescript',
    level: 5,
    tier: 1,
    focus: ['destructuring'],
    title: 'Header row and the rest',
    prompt: 'A CSV file parsed into rows starts with a row of column names. Write `splitHeader(rows: string[][]): { header: string[]; body: string[][] }`, returning the first row as `header` and every later row in `body`. Use one array destructuring with a rest element, and give the header a default of `[]`, so a file with no rows at all gives two empty lists.',
    starter: `const splitHeader = (rows) => {

};

// Scratch pad. Change this and press Run.
console.log(splitHeader([["name", "age"], ["Ada", "36"]]));
`,
    skeleton: `const splitHeader = (rows: string[][]): { header: string[]; body: string[][] } => {
  const [/* the first row, [] when there is none */, /* ...every other row */] = rows;
  return { header, body };
};`,
    hints: ['In `const [first, ...rest] = list`, `first` takes item 0 and `rest` collects every item after it into a new array. A default after `=` inside the pattern applies when the item is missing.'],
    approach: [
      'Destructure `rows` into a first element and a rest element.',
      'Give the first element a default of `[]`.',
      'Return `{ header, body }`. The rest element is a new array, so `rows` stays as it was.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'splitHeader([["name", "age"], ["Ada", "36"], ["Bo", "9"]])', expected: { header: ['name', 'age'], body: [['Ada', '36'], ['Bo', '9']] } },
      { call: 'splitHeader([["id"]])', expected: { header: ['id'], body: [] }, label: 'a header with no data' },
      { call: 'splitHeader([])', expected: { header: [], body: [] }, label: 'an empty file', edge: true },
      { call: '(() => { const rows = [["a"], ["1"]]; splitHeader(rows); return rows.length; })()', expected: 2, label: 'the rows handed in keep their header', edge: true },
    ],
    typeTests: [
      { code: 'const __h: string[] = splitHeader([["a"]]).header;', label: 'the header is a row of text' },
      { code: 'const __b: string[][] = splitHeader([["a"], ["1"]]).body;', label: 'the body is a list of rows' },
      { code: 'splitHeader(["a", "b"]);', label: 'each row is an array', rejects: true },
      { code: 'const __wrong: string = splitHeader([]).header;', label: 'the header is not one string', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-fields-from-the-api',
    track: 'typescript',
    topic: 'typescript',
    level: 9,
    tier: 2,
    focus: ['destructuring', 'optional'],
    title: 'Fields from the API',
    prompt: 'An API sends each user as `{ user_name: string; avatar_url?: string }`, and the app wants `{ name: string; avatar: string | null }`. Declare the two shapes as `ApiUser` and `Profile`, then write `toProfile(raw: ApiUser): Profile` with one object destructuring that renames both fields and gives a missing avatar the default `null`. An empty `avatar_url` is still a value the API sent, so it stays.',
    starter: `const toProfile = (raw) => {

};

// Scratch pad. Change this and press Run.
console.log(toProfile({ user_name: "ada", avatar_url: "/ada.png" }));
`,
    skeleton: `interface ApiUser {
  user_name: string;
  avatar_url?: string;
}

interface Profile {
  name: string;
  avatar: string | null;
}

const toProfile = (raw: ApiUser): Profile => {
  const { /* user_name as name */, /* avatar_url as avatar, null when missing */ } = raw;
  return { name, avatar };
};`,
    hints: ['`const { user_name: name } = raw` reads `user_name` into a variable called `name`. Add `= null` after the new name, and the default applies when the property is missing or `undefined`, but not when it is an empty string.'],
    approach: [
      'Declare `ApiUser` with an optional `avatar_url`, and `Profile` with `avatar: string | null`.',
      'In the body, destructure `raw`, renaming `user_name` to `name` and `avatar_url` to `avatar` with a default of `null`.',
      'Return `{ name, avatar }`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'toProfile({ user_name: "ada", avatar_url: "/ada.png" })', expected: { name: 'ada', avatar: '/ada.png' } },
      { call: 'toProfile({ user_name: "bo" })', expected: { name: 'bo', avatar: null }, label: 'no avatar gives null' },
      { call: 'toProfile({ user_name: "cy", avatar_url: "" })', expected: { name: 'cy', avatar: '' }, label: 'an empty URL is kept', edge: true },
      { call: 'toProfile({ user_name: "", avatar_url: "/x.png" })', expected: { name: '', avatar: '/x.png' }, label: 'an empty name is kept', edge: true },
    ],
    typeTests: [
      { code: 'const __p: Profile = toProfile({ user_name: "ada" });', label: 'the avatar may be left out' },
      { code: 'const __a: string = toProfile({ user_name: "ada" }).avatar;', label: 'the avatar may be null', rejects: true },
      { code: 'toProfile({ name: "ada" });', label: 'the input uses the API’s field names', rejects: true },
    ],
  },

  /* ── Map and Set ──────────────────────────────────────────────────── */
  {
    id: 'ts-easy2-airport-names',
    track: 'typescript',
    topic: 'typescript',
    level: 10,
    tier: 1,
    focus: ['map-set', 'strings'],
    title: 'Airport codes to names',
    prompt: 'A flight route is written as airport codes joined by dashes, such as `"PRG-LHR-JFK"`. Write `routeNames(route: string, airports: Map<string, string>): string[]`, splitting the route on `-` and looking each code up in the `Map`. The Map’s keys are in capitals, so `"prg"` finds `"PRG"`. A code the Map does not know stays exactly as it was written, and an empty route gives an empty list.',
    starter: `const routeNames = (route: string, airports: Map<string, string>): string[] => {

};

// Scratch pad. Change this and press Run.
const airports = new Map([["PRG", "Prague"], ["LHR", "London Heathrow"]]);
console.log(routeNames("PRG-LHR", airports));
`,
    skeleton: `const routeNames = (route: string, airports: Map<string, string>): string[] => {
  if (route === "") return [];
  return route.split("-").map((code) => /* the name, or the code as written */);
};`,
    hints: ['`airports.get(key)` gives the name or `undefined`, and `??` swaps `undefined` for a fallback. `"".split("-")` gives `[""]`, not `[]`, so answer an empty route before you split.'],
    approach: [
      'Return `[]` for an empty route.',
      'Split the route on `"-"`.',
      'Map each code to `airports.get(code.toUpperCase())`, falling back to the code itself with `??`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'routeNames("PRG-LHR", new Map([["PRG", "Prague"], ["LHR", "London Heathrow"]]))', expected: ['Prague', 'London Heathrow'] },
      { call: 'routeNames("prg-lhr", new Map([["PRG", "Prague"], ["LHR", "London Heathrow"]]))', expected: ['Prague', 'London Heathrow'], label: 'lower-case codes still match' },
      { call: 'routeNames("PRG-XYZ", new Map([["PRG", "Prague"]]))', expected: ['Prague', 'XYZ'], label: 'an unknown code stays' },
      { call: 'routeNames("", new Map([["PRG", "Prague"]]))', expected: [], label: 'an empty route', edge: true },
      { call: 'routeNames("abc", new Map())', expected: ['abc'], label: 'an unknown code keeps its own case', edge: true },
    ],
    typeTests: [
      { code: 'const __n: string[] = routeNames("PRG", new Map([["PRG", "Prague"]]));', label: 'gives back names' },
      { code: 'routeNames("PRG", { PRG: "Prague" });', label: 'the airports come in a Map, not an object', rejects: true },
      { code: 'routeNames("PRG", new Map([["PRG", 1]]));', label: 'the names are text', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-select-and-deselect',
    track: 'typescript',
    topic: 'typescript',
    level: 9,
    tier: 2,
    focus: ['map-set', 'readonly'],
    title: 'Select and deselect',
    prompt: 'A photo grid keeps the ids of the selected photos in a `Set`. Write `toggle(selected: ReadonlySet<string>, id: string): Set<string>`, returning a new Set with `id` removed when it was selected and added when it was not. The parameter is a `ReadonlySet`, so `add` and `delete` do not exist on it: copy it into a new `Set` and change the copy.',
    starter: `const toggle = (selected, id) => {

};

// Scratch pad. Change this and press Run.
console.log([...toggle(new Set(["a"]), "b")]);
`,
    skeleton: `const toggle = (selected: ReadonlySet<string>, id: string): Set<string> => {
  const next = new Set(selected);
  // delete id when next has it, add it otherwise
  return next;
};`,
    hints: ['`new Set(selected)` copies a Set, and the copy has `add` and `delete`. `has` tells you which of the two to call.'],
    approach: [
      'Type the parameter as `ReadonlySet<string>`. It promises the caller that their Set is left alone.',
      'Copy it with `new Set(selected)`.',
      'If the copy has `id`, delete it; otherwise add it. Return the copy.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: '[...toggle(new Set(["a"]), "b")]', expected: ['a', 'b'] },
      { call: '[...toggle(new Set(["a", "b"]), "a")]', expected: ['b'] },
      { call: '[...toggle(new Set(), "a")]', expected: ['a'], label: 'nothing selected yet', edge: true },
      { call: '(() => { const selected = new Set(["a"]); toggle(selected, "a"); return [...selected]; })()', expected: ['a'], label: 'the Set handed in is not changed', edge: true },
    ],
    typeTests: [
      { code: 'const __next: Set<string> = toggle(new Set(["a"]), "b");', label: 'gives back a Set you can change' },
      { code: 'const __t: (selected: ReadonlySet<string>, id: string) => Set<string> = toggle;', label: 'accepts a read-only Set' },
      { code: '(new Set(["a"]) as ReadonlySet<string>).add("b");', label: 'a ReadonlySet has no add', rejects: true },
      { code: 'toggle(new Set([1]), "a");', label: 'the ids are text', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-price-the-basket',
    track: 'typescript',
    topic: 'typescript',
    level: 10,
    tier: 2,
    focus: ['map-set', 'reduce'],
    title: 'Price the basket',
    prompt: 'A shop keeps its prices in cents in a `Map` from product name to price. Write `basketTotal(prices: ReadonlyMap<string, number>, basket: string[]): number`, adding up the price of every product in the basket with `reduce`. A product named twice is paid for twice. When a product has no price, the basket cannot be priced: throw an `Error` with the message `No price for <product>`, such as `No price for cake`.',
    starter: `const basketTotal = (prices: ReadonlyMap<string, number>, basket: string[]): number => {

};

// Scratch pad. Change this and press Run.
const prices = new Map([["tea", 350], ["cake", 420]]);
console.log(basketTotal(prices, ["tea", "cake", "tea"]));
`,
    skeleton: `const basketTotal = (prices: ReadonlyMap<string, number>, basket: string[]): number =>
  basket.reduce((total, product) => {
    const price = /* the product's price, or undefined */;
    // throw when there is no price
    return /* the new total */;
  }, 0);`,
    hints: ['`prices.get(product)` is typed `number | undefined`. Check for `undefined` before you add, and after the check the compiler knows the price is a number. Start `reduce` at `0` so an empty basket totals 0.'],
    approach: [
      'Reduce the basket, starting the total at `0`.',
      'Read each product’s price with `get`. When it is `undefined`, throw an `Error` whose message names the product.',
      'Otherwise return the total plus the price.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'basketTotal(new Map([["tea", 350], ["cake", 420]]), ["tea", "cake", "tea"])', expected: 1120 },
      { call: 'basketTotal(new Map([["tea", 350]]), ["tea"])', expected: 350 },
      { call: 'basketTotal(new Map([["tea", 350]]), [])', expected: 0, label: 'an empty basket', edge: true },
      { call: '(() => { try { return basketTotal(new Map([["tea", 350]]), ["tea", "cake"]); } catch (error) { return error.message; } })()', expected: 'No price for cake', label: 'a product with no price', edge: true },
      { call: 'basketTotal(new Map([["gift", 0]]), ["gift"])', expected: 0, label: 'a free product still has a price', edge: true },
    ],
    typeTests: [
      { code: 'const __t: number = basketTotal(new Map([["tea", 350]]), ["tea"]);', label: 'gives back a number' },
      { code: 'const __f: (prices: ReadonlyMap<string, number>, basket: string[]) => number = basketTotal;', label: 'accepts a read-only Map' },
      { code: 'basketTotal({ tea: 350 }, ["tea"]);', label: 'the prices come in a Map', rejects: true },
    ],
  },

  /* ── two pointers ─────────────────────────────────────────────────── */
  {
    id: 'ts-easy2-trim-blank-lines',
    track: 'typescript',
    topic: 'typescript',
    level: 22,
    tier: 2,
    focus: ['two-pointer', 'while'],
    title: 'Trim blank lines',
    prompt: 'Write `trimBlank(lines: readonly string[]): string[]`, returning the lines without the blank ones at the start and at the end. A blank line is empty or holds only spaces. Blank lines between two lines of text stay. Keep one index at each end, move each inward in a `while` loop for as long as it points at a blank line, then copy what lies between them with `slice`.',
    starter: `const trimBlank = (lines: readonly string[]): string[] => {

};

// Scratch pad. Change this and press Run.
console.log(trimBlank(["", "Dear Ada,", "", "Thanks!", "  "]));
`,
    skeleton: `const isBlank = (line: string): boolean => line.trim() === "";

const trimBlank = (lines: readonly string[]): string[] => {
  let start = 0;
  let end = lines.length - 1;
  while (/* start is in range and its line is blank */) start++;
  while (/* end has not passed start and its line is blank */) end--;
  return lines.slice(start, end + 1);
};`,
    hints: ['Check the index before you read the line: when every line is blank, `start` walks off the end, and `lines[start]` is then `undefined`. `slice(start, end + 1)` includes the line at `end`.'],
    approach: [
      'Start `start` at 0 and `end` at the last index.',
      'Move `start` forward while it is inside the list and its line is blank. Move `end` back while it is still at or after `start` and its line is blank.',
      'Return `lines.slice(start, end + 1)`, a copy of the lines between them.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'trimBlank(["", "Dear Ada,", "", "Thanks!", "  "])', expected: ['Dear Ada,', '', 'Thanks!'] },
      { call: 'trimBlank(["a", "b"])', expected: ['a', 'b'], label: 'nothing to trim' },
      { call: 'trimBlank(["", " ", ""])', expected: [], label: 'only blank lines', edge: true },
      { call: 'trimBlank([])', expected: [], label: 'no lines', edge: true },
      { call: 'trimBlank(["  x  ", ""])', expected: ['  x  '], label: 'a line of text keeps its own spaces', edge: true },
    ],
    typeTests: [
      { code: 'const __out: string[] = trimBlank(["", "a"]);', label: 'gives back an ordinary array' },
      { code: 'const __f: (lines: readonly string[]) => string[] = trimBlank;', label: 'accepts a read-only list' },
      { code: 'trimBlank("a\\nb");', label: 'the input is a list of lines, not one string', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-free-on-both',
    track: 'typescript',
    topic: 'typescript',
    level: 22,
    tier: 2,
    focus: ['two-pointer', 'readonly'],
    title: 'Free on both calendars',
    prompt: 'Two people list the days of the month they are free, each list sorted from low to high with no repeats. Write `freeBoth(mine: readonly number[], yours: readonly number[]): number[]`, returning the days on both lists, in order. Walk the two lists together with one index each. When the two days match, keep the day and move both indexes; otherwise move only the index that points at the smaller day.',
    starter: `const freeBoth = (mine: readonly number[], yours: readonly number[]): number[] => {

};

// Scratch pad. Change this and press Run.
console.log(freeBoth([1, 4, 9, 12], [2, 4, 12, 20]));
`,
    skeleton: `const freeBoth = (mine: readonly number[], yours: readonly number[]): number[] => {
  const both: number[] = [];
  let i = 0;
  let j = 0;
  while (i < mine.length && j < yours.length) {
    // equal: keep it and move both; otherwise move the index at the smaller day
  }
  return both;
};`,
    hints: ['Both lists are sorted, so the smaller of the two current days cannot turn up later in the other list. Step past it and compare again. Stop as soon as either list runs out.'],
    approach: [
      'Start an index at 0 in each list, and an empty result.',
      'While both indexes are in range, compare `mine[i]` with `yours[j]`.',
      'Equal: push the day and move both. Otherwise move only the index at the smaller day.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'freeBoth([1, 4, 9, 12], [2, 4, 12, 20])', expected: [4, 12] },
      { call: 'freeBoth([3, 5], [1, 2, 3, 4, 5])', expected: [3, 5], label: 'lists of different lengths' },
      { call: 'freeBoth([1, 2], [3, 4])', expected: [], label: 'no day in common', edge: true },
      { call: 'freeBoth([], [1])', expected: [], label: 'one list is empty', edge: true },
      { call: 'freeBoth([7], [7])', expected: [7], label: 'a single shared day', edge: true },
    ],
    typeTests: [
      { code: 'const __days: number[] = freeBoth([1], [1]);', label: 'gives back an ordinary array' },
      { code: 'const __f: (mine: readonly number[], yours: readonly number[]) => number[] = freeBoth;', label: 'both lists may be read-only' },
      { code: 'freeBoth(["1"], [1]);', label: 'the days are numbers', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-where-a-value-sits',
    track: 'typescript',
    topic: 'typescript',
    level: 23,
    tier: 2,
    focus: ['two-pointer', 'tuples'],
    title: 'Where a value starts and ends',
    prompt: 'A sorted list keeps equal values next to each other. Write `spanOf(sorted: readonly number[], value: number): [number, number] | null`, returning the first and the last index of `value` as a tuple, or `null` when the value is not in the list. Put one index at each end and move each inward for as long as it does not point at the value.',
    starter: `const spanOf = (sorted: readonly number[], value: number): [number, number] | null => {

};

// Scratch pad. Change this and press Run.
console.log(spanOf([1, 2, 2, 2, 5], 2));
`,
    skeleton: `const spanOf = (sorted: readonly number[], value: number): [number, number] | null => {
  let start = 0;
  let end = sorted.length - 1;
  // move start forward, then end back, until each reaches the value
  // when start has passed end, the value is not there
};`,
    hints: ['Walk `start` forward while it is at or before `end` and `sorted[start]` is not the value. Then walk `end` back while `sorted[end]` is not the value. If `start` ends up past `end`, the value was never there.'],
    approach: [
      'Start `start` at 0 and `end` at the last index.',
      'Move `start` right while `start <= end` and `sorted[start] !== value`. Then move `end` left while `sorted[end] !== value`.',
      'Return `null` when `start > end`, and `[start, end]` otherwise.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'spanOf([1, 2, 2, 2, 5], 2)', expected: [1, 3] },
      { call: 'spanOf([1, 3, 5], 5)', expected: [2, 2], label: 'a value that appears once' },
      { call: 'spanOf([1, 3, 5], 4)', expected: null, label: 'not in the list', edge: true },
      { call: 'spanOf([], 1)', expected: null, label: 'an empty list', edge: true },
      { call: 'spanOf([7, 7, 7], 7)', expected: [0, 2], label: 'every item matches', edge: true },
    ],
    typeTests: [
      { code: 'const __span: [number, number] | null = spanOf([1], 1);', label: 'gives back a pair of indexes or null' },
      { code: 'const __first: number = spanOf([1], 1)[0];', label: 'check for null before reading the pair', rejects: true },
      { code: 'spanOf(["1"], 1);', label: 'the list holds numbers', rejects: true },
    ],
  },

  /* ── keyof ────────────────────────────────────────────────────────── */
  {
    id: 'ts-easy2-sort-by-a-column',
    track: 'typescript',
    topic: 'typescript',
    level: 16,
    tier: 2,
    focus: ['keyof', 'sort'],
    title: 'Sort by a column',
    prompt: 'A table shows `Player` rows with a `name`, a `score` and a `country`. Write `sortRows(rows: readonly Player[], column: keyof Player): Player[]`, returning a new array sorted from low to high by the chosen column: numbers by value, text in character order. `keyof Player` is the union `"name" | "score" | "country"`, so a column that does not exist will not compile. Rows with equal values keep their order.',
    starter: `interface Player {
  name: string;
  score: number;
  country: string;
}

const sortRows = (rows, column) => {

};

// Scratch pad. Change this and press Run.
console.log(sortRows([{ name: "Bo", score: 3, country: "SE" }, { name: "Ada", score: 7, country: "GB" }], "name"));
`,
    skeleton: `interface Player {
  name: string;
  score: number;
  country: string;
}

const sortRows = (rows: readonly Player[], column: keyof Player): Player[] =>
  [...rows].sort((a, b) => {
    // compare a[column] with b[column] using < and >
  });`,
    hints: ['`a[column]` is typed `string | number`, and `<` and `>` compare two numbers by value and two strings by character code. Return `-1`, `1` or `0`. Copy with `[...rows]` first: the parameter is readonly, so `rows.sort` does not compile.'],
    approach: [
      'Type `column` as `keyof Player`.',
      'Copy the rows, then sort the copy with a comparator.',
      'In the comparator, return `-1` when `a[column] < b[column]`, `1` when it is greater, and `0` for a tie.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'sortRows([{ name: "Cy", score: 5, country: "CZ" }, { name: "Ada", score: 9, country: "GB" }, { name: "Bo", score: 2, country: "SE" }], "name").map((row) => row.name)', expected: ['Ada', 'Bo', 'Cy'] },
      { call: 'sortRows([{ name: "Cy", score: 5, country: "CZ" }, { name: "Ada", score: 9, country: "GB" }, { name: "Bo", score: 2, country: "SE" }], "score").map((row) => row.name)', expected: ['Bo', 'Cy', 'Ada'], label: 'scores sort by value' },
      { call: 'sortRows([{ name: "A", score: 10, country: "X" }, { name: "B", score: 9, country: "X" }], "score").map((row) => row.name)', expected: ['B', 'A'], label: 'ten comes after nine', edge: true },
      { call: 'sortRows([{ name: "First", score: 1, country: "GB" }, { name: "Second", score: 2, country: "GB" }], "country").map((row) => row.name)', expected: ['First', 'Second'], label: 'equal values keep their order', edge: true },
      { call: 'sortRows([], "name")', expected: [], label: 'no rows', edge: true },
    ],
    typeTests: [
      { code: 'const __r: Player[] = sortRows([{ name: "a", score: 1, country: "x" }], "score");', label: 'gives back players' },
      { code: 'sortRows([], "age");', label: 'a column Player does not have is refused', rejects: true },
      { code: 'sortRows([{ name: "a" }], "name");', label: 'each row is a whole Player', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-column-headings',
    track: 'typescript',
    topic: 'typescript',
    level: 20,
    tier: 2,
    focus: ['keyof', 'record'],
    title: 'A heading for every column',
    prompt: 'A contact table needs a heading for each column. Declare `const LABELS: Record<keyof Contact, string>` holding the headings `Full name`, `Email` and `Phone number`. With that type, leaving out a column, or adding one `Contact` does not have, is a compile error. Then write `headings(columns: (keyof Contact)[]): string[]`, returning the heading of each column in the order asked.',
    starter: `interface Contact {
  name: string;
  email: string;
  phone: string;
}

const headings = (columns) => {

};

// Scratch pad. Change this and press Run.
console.log(headings(["email", "name"]));
`,
    skeleton: `interface Contact {
  name: string;
  email: string;
  phone: string;
}

const LABELS: Record<keyof Contact, string> = {
  // one heading per column
};

const headings = (columns: (keyof Contact)[]): string[] => {
  // look up each column in LABELS
};`,
    hints: ['`Record<keyof Contact, string>` is an object type with exactly the keys `name`, `email` and `phone`, each holding a string. `LABELS[column]` is then a string for any column the function accepts.'],
    approach: [
      'Declare `LABELS` with the `Record` type and one heading per key.',
      'Type the parameter as `(keyof Contact)[]`.',
      'Map each column to `LABELS[column]`.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'headings(["email", "name"])', expected: ['Email', 'Full name'] },
      { call: 'headings(["name", "email", "phone"])', expected: ['Full name', 'Email', 'Phone number'] },
      { call: 'headings(["phone"])', expected: ['Phone number'] },
      { call: 'headings([])', expected: [], label: 'no columns', edge: true },
      { call: 'headings(["name", "name"])', expected: ['Full name', 'Full name'], label: 'a column asked for twice', edge: true },
    ],
    typeTests: [
      { code: 'const __l: Record<keyof Contact, string> = LABELS;', label: 'every column has a heading' },
      { code: 'const __h: string[] = headings(["name"]);', label: 'gives back text' },
      { code: 'headings(["age"]);', label: 'a column Contact does not have is refused', rejects: true },
      { code: 'const __missing: Record<keyof Contact, string> = { name: "Full name", email: "Email" };', label: 'a Record needs every key', rejects: true },
    ],
  },

  /* ── spread ───────────────────────────────────────────────────────── */
  {
    id: 'ts-easy2-tick-off-a-todo',
    track: 'typescript',
    topic: 'typescript',
    level: 7,
    tier: 1,
    focus: ['spread', 'map'],
    title: 'Tick off a todo',
    prompt: 'Write `markDone(todos: readonly Todo[], id: number): Todo[]`, returning a new list in which the todo with that `id` has `done: true` and every other todo is unchanged. Build the changed todo as a new object with spread, so the caller’s todos stay as they were. An id that matches nothing gives back an equal list. `Todo` is declared for you.',
    starter: `interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const markDone = (todos: readonly Todo[], id: number): Todo[] => {

};

// Scratch pad. Change this and press Run.
console.log(markDone([{ id: 1, text: "Buy milk", done: false }], 1));
`,
    skeleton: `interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const markDone = (todos: readonly Todo[], id: number): Todo[] =>
  todos.map((todo) => /* a new todo with done: true for the matching id, the todo itself otherwise */);`,
    hints: ['In `{ ...todo, done: true }` the spread copies every property first, and `done: true` then overwrites one of them. Writing `todo.done = true` would change the caller’s object as well.'],
    approach: [
      'Map over the todos.',
      'For the todo whose `id` matches, return a spread copy with `done` set to `true`.',
      'Return every other todo as it is.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'markDone([{ id: 1, text: "Milk", done: false }, { id: 2, text: "Eggs", done: false }], 2)', expected: [{ id: 1, text: 'Milk', done: false }, { id: 2, text: 'Eggs', done: true }] },
      { call: 'markDone([{ id: 1, text: "Milk", done: true }], 1)', expected: [{ id: 1, text: 'Milk', done: true }], label: 'done stays done' },
      { call: 'markDone([{ id: 1, text: "Milk", done: false }], 9)', expected: [{ id: 1, text: 'Milk', done: false }], label: 'no todo has that id', edge: true },
      { call: 'markDone([], 1)', expected: [], label: 'no todos', edge: true },
      { call: '(() => { const todos = [{ id: 1, text: "Milk", done: false }]; markDone(todos, 1); return todos[0].done; })()', expected: false, label: 'the caller’s todo is not changed', edge: true },
    ],
    typeTests: [
      { code: 'const __t: Todo[] = markDone([{ id: 1, text: "a", done: false }], 1);', label: 'gives back todos' },
      { code: 'markDone([{ id: 1, text: "a" }], 1);', label: 'every todo has a done flag', rejects: true },
      { code: 'markDone([{ id: 1, text: "a", done: false }], "1");', label: 'the id is a number', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-add-a-tag',
    track: 'typescript',
    topic: 'typescript',
    level: 9,
    tier: 2,
    focus: ['spread', 'readonly'],
    title: 'Add a tag to a read-only note',
    prompt: 'Declare an interface `Note` with a `title` string and a list of `tags`, both `readonly`, and type the list as `readonly string[]`, so `note.tags.push(...)` is a compile error. Write `addTag(note: Note, tag: string): Note`, returning a new note whose tags end with `tag`, built with spread for the note and for its tags. When the note already has the tag, return the note unchanged.',
    starter: `const addTag = (note, tag) => {

};

// Scratch pad. Change this and press Run.
console.log(addTag({ title: "Ideas", tags: ["work"] }, "urgent"));
`,
    skeleton: `interface Note {
  readonly title: string;
  readonly tags: readonly string[];
}

const addTag = (note: Note, tag: string): Note => {
  if (/* the note has the tag already */) return note;
  return { /* every property of note */, tags: [/* the old tags */, tag] };
};`,
    hints: ['Two spreads do it: one copies the note’s properties into a new object, the other copies its tags into a new array with the tag added at the end. `includes` works on a readonly array, because it changes nothing.'],
    approach: [
      'Declare `Note` with `readonly` on both properties and `readonly string[]` for the tags.',
      'Return `note` itself when `note.tags.includes(tag)`.',
      'Otherwise return a spread copy of the note whose `tags` is a spread copy of the old tags plus the new one.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'addTag({ title: "Ideas", tags: ["work"] }, "urgent")', expected: { title: 'Ideas', tags: ['work', 'urgent'] } },
      { call: 'addTag({ title: "Ideas", tags: [] }, "home")', expected: { title: 'Ideas', tags: ['home'] }, label: 'the first tag', edge: true },
      { call: 'addTag({ title: "Ideas", tags: ["work"] }, "work")', expected: { title: 'Ideas', tags: ['work'] }, label: 'a tag the note already has', edge: true },
      { call: '(() => { const note = { title: "Ideas", tags: ["work"] }; addTag(note, "urgent"); return note.tags; })()', expected: ['work'], label: 'the note handed in is not changed', edge: true },
    ],
    typeTests: [
      { code: 'const __n: Note = addTag({ title: "a", tags: [] }, "b");', label: 'gives back a Note' },
      { code: 'const __note: Note = { title: "a", tags: [] }; __note.tags.push("b");', label: 'a note’s tags are read-only', rejects: true },
      { code: 'const __note2: Note = { title: "a", tags: [] }; __note2.title = "b";', label: 'a note’s title is read-only', rejects: true },
      { code: 'addTag({ title: "a", tags: [] }, 1);', label: 'a tag is text', rejects: true },
    ],
  },

  /* ── while, reduce, sort and strings ──────────────────────────────── */
  {
    id: 'ts-easy2-path-to-the-root',
    track: 'typescript',
    topic: 'typescript',
    level: 11,
    tier: 2,
    focus: ['while', 'narrowing'],
    title: 'Path up to the root',
    prompt: 'Each `Folder` has a `name` and a `parent`, which is another folder, or `null` for the root. Write `pathOf(folder: Folder): string`, returning every name from the root down to the folder, joined with `/`. Walk up with a `while` loop that follows `parent` until it reaches `null`. The condition `current !== null` narrows `current` to a `Folder` inside the loop, so reading `current.name` compiles.',
    starter: `interface Folder {
  name: string;
  parent: Folder | null;
}

const pathOf = (folder: Folder): string => {

};

// Scratch pad. Change this and press Run.
const home = { name: "home", parent: null };
const docs = { name: "docs", parent: home };
console.log(pathOf({ name: "cv.pdf", parent: docs }));
`,
    skeleton: `interface Folder {
  name: string;
  parent: Folder | null;
}

const pathOf = (folder: Folder): string => {
  const names: string[] = [];
  let current: Folder | null = folder;
  while (/* current is a folder */) {
    // put its name in front, then step up to its parent
  }
  return names.join("/");
};`,
    hints: ['Type the loop variable as `Folder | null` so it can hold the root’s `null` parent. Add each name at the front with `unshift`, or collect them and reverse once at the end.'],
    approach: [
      'Start `current` at the folder, typed `Folder | null`.',
      'While `current !== null`, put `current.name` at the front of a list and move to `current.parent`.',
      'Join the names with `/`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'pathOf({ name: "cv.pdf", parent: { name: "docs", parent: { name: "home", parent: null } } })', expected: 'home/docs/cv.pdf' },
      { call: 'pathOf({ name: "b", parent: { name: "a", parent: null } })', expected: 'a/b' },
      { call: 'pathOf({ name: "home", parent: null })', expected: 'home', label: 'the root on its own', edge: true },
      { call: 'pathOf({ name: "notes.txt", parent: { name: "My Files", parent: null } })', expected: 'My Files/notes.txt', label: 'a name with a space', edge: true },
    ],
    typeTests: [
      { code: 'const __p: string = pathOf({ name: "a", parent: null });', label: 'gives back text' },
      { code: 'pathOf({ name: "a" });', label: 'every folder says what its parent is', rejects: true },
      { code: 'pathOf({ name: "a", parent: "root" });', label: 'a parent is a folder or null', rejects: true },
      { code: 'const __f: Folder = { name: "a", parent: null }; const __up: string = __f.parent.name;', label: 'a parent may be null, so check before reading it', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-playlist-length',
    track: 'typescript',
    topic: 'typescript',
    level: 13,
    tier: 1,
    focus: ['reduce', 'strings'],
    title: 'Playlist length',
    prompt: 'Track lengths are written as minutes and seconds, such as `"3:05"`. Write `playlistSeconds(tracks: string[]): number`, adding up the length of every track in seconds with `reduce`. `playlistSeconds(["3:05", "0:55"])` gives 240. Minutes can run past 59, as in `"72:00"`, and an empty playlist lasts 0 seconds.',
    starter: `const playlistSeconds = (tracks: string[]): number => {

};

// Scratch pad. Change this and press Run.
console.log(playlistSeconds(["3:05", "0:55"]));
`,
    skeleton: `const playlistSeconds = (tracks: string[]): number =>
  tracks.reduce((total, track) => {
    const [minutes, seconds] = /* split the track on ":" and turn both parts into numbers */;
    return /* the total plus this track in seconds */;
  }, 0);`,
    hints: ['`"3:05".split(":")` gives `["3", "05"]`, which is still text, and `Number("05")` is 5. Start `reduce` at `0`: without it an empty list throws, and the first track stays a string.'],
    approach: [
      'Reduce the tracks with a starting total of `0`.',
      'Split each track on `:` and turn both parts into numbers with `Number`.',
      'Add `minutes * 60 + seconds` to the total.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'playlistSeconds(["3:05", "0:55"])', expected: 240 },
      { call: 'playlistSeconds(["4:00"])', expected: 240 },
      { call: 'playlistSeconds([])', expected: 0, label: 'an empty playlist', edge: true },
      { call: 'playlistSeconds(["72:00"])', expected: 4320, label: 'minutes past 59', edge: true },
      { call: 'playlistSeconds(["0:09", "0:01"])', expected: 10, label: 'leading zeros', edge: true },
    ],
    typeTests: [
      { code: 'const __s: number = playlistSeconds(["1:00"]);', label: 'gives back a number' },
      { code: 'playlistSeconds([180]);', label: 'the tracks are written as text', rejects: true },
      { code: 'const __t: string = playlistSeconds([]);', label: 'the total is a number', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-most-urgent-first',
    track: 'typescript',
    topic: 'typescript',
    level: 8,
    tier: 2,
    focus: ['sort', 'literal-types'],
    title: 'Most urgent first',
    prompt: 'Declare `type Priority = "high" | "medium" | "low"` and an interface `Task` with a `title` string and a `priority`. Write `byPriority(tasks: readonly Task[]): Task[]`, returning a new list with the high tasks first, then medium, then low, each group in its original order. Sorting the words alphabetically would give high, low, medium, so rank them with a `Record<Priority, number>` and compare the ranks.',
    starter: `const byPriority = (tasks) => {

};

// Scratch pad. Change this and press Run.
console.log(byPriority([{ title: "Water plants", priority: "low" }, { title: "Pay rent", priority: "high" }]));
`,
    skeleton: `type Priority = "high" | "medium" | "low";

interface Task {
  title: string;
  priority: Priority;
}

const RANK: Record<Priority, number> = { /* high first */ };

const byPriority = (tasks: readonly Task[]): Task[] => {
  // copy, then sort by rank
};`,
    hints: ['Give each priority a number, `high: 0`, `medium: 1`, `low: 2`, and subtract the ranks in the comparator. `sort` keeps equal items in their original order, and `[...tasks]` gives you an array you are allowed to sort.'],
    approach: [
      'Declare `Priority` as a union of the three words, and `Task` with a `title` and a `priority`.',
      'Declare `RANK: Record<Priority, number>` with high 0, medium 1 and low 2.',
      'Copy the tasks and sort the copy by `RANK[a.priority] - RANK[b.priority]`.',
    ],
    verify: 'tests',
    estimatedMinutes: 10,
    tests: [
      { call: 'byPriority([{ title: "Water plants", priority: "low" }, { title: "Pay rent", priority: "high" }, { title: "Email Bo", priority: "medium" }]).map((task) => task.title)', expected: ['Pay rent', 'Email Bo', 'Water plants'] },
      { call: 'byPriority([{ title: "x", priority: "medium" }, { title: "y", priority: "low" }]).map((task) => task.title)', expected: ['x', 'y'], label: 'medium comes before low' },
      { call: 'byPriority([{ title: "a", priority: "low" }, { title: "b", priority: "high" }, { title: "c", priority: "low" }, { title: "d", priority: "high" }]).map((task) => task.title)', expected: ['b', 'd', 'a', 'c'], label: 'the same priority keeps its order', edge: true },
      { call: 'byPriority([])', expected: [], label: 'no tasks', edge: true },
    ],
    typeTests: [
      { code: 'const __p: Priority = "medium";', label: 'medium is a priority' },
      { code: 'const __sorted: Task[] = byPriority([{ title: "a", priority: "low" }]);', label: 'gives back tasks' },
      { code: 'const __bad: Priority = "urgent";', label: 'urgent is not one of the three', rejects: true },
      { code: 'byPriority([{ title: "a", priority: "soon" }]);', label: 'a task’s priority is one of the three words', rejects: true },
    ],
  },

  /* ── type guards, narrowing and for...of ──────────────────────────── */
  {
    id: 'ts-easy2-theme-colour',
    track: 'typescript',
    topic: 'typescript',
    level: 12,
    tier: 2,
    focus: ['type-guards', 'literal-types'],
    title: 'Is it a theme colour?',
    prompt: 'A theme offers three accent colours, listed once as `const ACCENTS = ["teal", "coral", "gold"] as const`. `as const` keeps the exact words, and `type Accent = (typeof ACCENTS)[number]` turns them into the union `"teal" | "coral" | "gold"`. Write `isAccent(value: string): value is Accent`, returning `true` for exactly those three words. A user setting that passes the check can then be stored as an `Accent` with no cast.',
    starter: `const ACCENTS = ["teal", "coral", "gold"] as const;
type Accent = (typeof ACCENTS)[number];

const isAccent = (value) => {

};

// Scratch pad. Change this and press Run.
console.log(isAccent("teal"), isAccent("pink"));
`,
    skeleton: `const ACCENTS = ["teal", "coral", "gold"] as const;
type Accent = (typeof ACCENTS)[number];

const isAccent = (value: string): value is Accent => {
  // true when ACCENTS holds the value
};`,
    hints: ['`ACCENTS.includes(value)` does not compile: the array only accepts its three words, and `value` can be any string. Widen the array for the check, `(ACCENTS as readonly string[]).includes(value)`, or compare the value with each word in turn.'],
    approach: [
      'Type the parameter as `string` and the return type as `value is Accent`.',
      'Check whether the value is one of the three words.',
      'Return the result. A caller who writes `if (isAccent(setting))` can use `setting` as an `Accent` inside the `if`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'isAccent("teal")', expected: true },
      { call: 'isAccent("gold")', expected: true },
      { call: 'isAccent("pink")', expected: false },
      { call: 'isAccent("Teal")', expected: false, label: 'the case has to match', edge: true },
      { call: 'isAccent("")', expected: false, label: 'an empty setting', edge: true },
    ],
    typeTests: [
      { code: 'const __setting = "coral" as string; if (isAccent(__setting)) { const __a: Accent = __setting; }', label: 'a value that passes is an Accent' },
      { code: 'const __no: Accent = "pink";', label: 'pink is not an accent', rejects: true },
      { code: 'isAccent(3);', label: 'the value is text', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-first-error',
    track: 'typescript',
    topic: 'typescript',
    level: 11,
    tier: 2,
    focus: ['narrowing', 'for-of'],
    title: 'The first error',
    prompt: 'A batch job reports one `Result` per step: `{ ok: true; value: number }` when the step worked and `{ ok: false; error: string }` when it failed. Write `firstError(results: Result[]): string | null`, walking the results with `for...of` and returning the first error message, or `null` when every step worked. `result.error` only compiles after a check on `result.ok` has narrowed the union to the failed shape.',
    starter: `type Result = { ok: true; value: number } | { ok: false; error: string };

const firstError = (results: Result[]): string | null => {

};

// Scratch pad. Change this and press Run.
console.log(firstError([{ ok: true, value: 1 }, { ok: false, error: "disk full" }]));
`,
    skeleton: `type Result = { ok: true; value: number } | { ok: false; error: string };

const firstError = (results: Result[]): string | null => {
  for (const result of results) {
    // when this step failed, return its error
  }
  return null;
};`,
    hints: ['`ok` is the tag of the union. Inside `if (!result.ok)` the compiler knows `result` is `{ ok: false; error: string }`, so `result.error` is a string. Return from inside the loop as soon as you find one.'],
    approach: [
      'Loop over the results with `for...of`.',
      'Check `result.ok`. When it is `false`, return `result.error`.',
      'After the loop, return `null`.',
    ],
    verify: 'tests',
    estimatedMinutes: 6,
    tests: [
      { call: 'firstError([{ ok: true, value: 1 }, { ok: false, error: "disk full" }])', expected: 'disk full' },
      { call: 'firstError([{ ok: false, error: "timeout" }, { ok: false, error: "disk full" }])', expected: 'timeout', label: 'the first of two errors' },
      { call: 'firstError([{ ok: true, value: 1 }, { ok: true, value: 2 }])', expected: null, label: 'every step worked' },
      { call: 'firstError([])', expected: null, label: 'no steps', edge: true },
      { call: 'firstError([{ ok: false, error: "" }])', expected: '', label: 'an empty message is still an error', edge: true },
    ],
    typeTests: [
      { code: 'const __e: string | null = firstError([]);', label: 'gives back a message or null' },
      { code: 'const __s: string = firstError([]);', label: 'check for null before using the message', rejects: true },
      { code: 'firstError([{ ok: false }]);', label: 'a failed step has a message', rejects: true },
    ],
  },
  {
    id: 'ts-easy2-build-a-query',
    track: 'typescript',
    topic: 'typescript',
    level: 20,
    tier: 2,
    focus: ['for-of', 'record'],
    title: 'Build a query string',
    prompt: 'Write `toQuery(params: Record<string, string | number>): string`, turning an object into a URL query string such as `"page=2&sort=new"`. Walk `Object.entries(params)` with `for...of`, destructuring each `[key, value]` pair, and encode both with `encodeURIComponent`, so a space becomes `%20` and an `&` inside a value becomes `%26`. Pairs keep the object’s key order, and an empty object gives an empty string.',
    starter: `const toQuery = (params: Record<string, string | number>): string => {

};

// Scratch pad. Change this and press Run.
console.log(toQuery({ page: 2, sort: "new" }));
`,
    skeleton: `const toQuery = (params: Record<string, string | number>): string => {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    // push "key=value", both encoded
  }
  return pairs.join("&");
};`,
    hints: ['`Object.entries` gives `[key, value]` pairs you can destructure in the loop head. `encodeURIComponent` takes a number as well as a string. `join("&")` on an empty list gives `""`.'],
    approach: [
      'Collect the pairs in an array of strings.',
      'Loop over `Object.entries(params)` with `for...of`, and push the encoded key, an `=` and the encoded value for each pair.',
      'Join the pairs with `&`.',
    ],
    verify: 'tests',
    estimatedMinutes: 8,
    tests: [
      { call: 'toQuery({ page: 2, sort: "new" })', expected: 'page=2&sort=new' },
      { call: 'toQuery({ q: "deep end" })', expected: 'q=deep%20end', label: 'a space is encoded' },
      { call: 'toQuery({})', expected: '', label: 'no parameters', edge: true },
      { call: 'toQuery({ tag: "a&b" })', expected: 'tag=a%26b', label: 'an ampersand inside a value is encoded', edge: true },
      { call: 'toQuery({ n: 0 })', expected: 'n=0', label: 'zero is a value', edge: true },
    ],
    typeTests: [
      { code: 'const __q: string = toQuery({ page: 2 });', label: 'gives back text' },
      { code: 'toQuery({ page: true });', label: 'a value is text or a number', rejects: true },
      { code: 'toQuery({ page: [2] });', label: 'a value is one piece of text or one number', rejects: true },
    ],
  },
];
