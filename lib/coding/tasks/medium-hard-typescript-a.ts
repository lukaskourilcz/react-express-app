// The Medium and Hard band of the TypeScript track, first wave (#226).
//
// Every challenge here combines two to four techniques the Easy band already
// taught: the technique-coverage contract (`scripts/coding-coverage.ts`) only
// lets a Medium or Hard challenge carry a focus tag that at least three Easy
// TypeScript challenges carry. Tier 3 reads Medium and tier 4 reads Hard,
// through `difficultyOf`; nothing sets an authored difficulty.
//
// A TypeScript challenge is graded twice, by its runtime checks and by the
// compiler, and both halves have hidden checks on the server. Each hint ladder
// ends in the documentation page of the first focus tag. Solutions live in
// `../solutions/medium-hard-typescript-a.ts`, and `MEDIUM_HARD_BAND` in
// `../catalog.ts` lists this file, which keeps these challenges out of every
// Learn level's quota. English only: there is no Czech overlay.
//
// Task bodies only: prompts, starters, visible tests, hints. No solutions.

import type { CodingTaskSource } from '../types';

export const MEDIUM_HARD_TYPESCRIPT_A_TASKS: CodingTaskSource[] = [
  /* ── Medium ───────────────────────────────────────────────────────── */
  {
    id: 'ts-mh-apply-discounts',
    track: 'typescript',
    topic: 'typescript',
    level: 12,
    tier: 3,
    focus: ['unions', 'narrowing', 'reduce', 'readonly'],
    title: 'Apply the discounts',
    prompt: 'A checkout holds its lines and a list of discounts. Each discount is one member of the union `Discount`, told apart by its `kind`. `"percent"` takes that percentage off the running total, rounded to the nearest cent with `Math.round`. `"fixed"` takes a number of cents off. `"two-for-one"` makes every second item of one `sku` free, line by line, so a line of 3 teas pays for 2. Write `totalCents(lines: readonly Line[], discounts: readonly Discount[]): number`. Add up the lines with `reduce`, then apply the discounts in the order they are listed with a second `reduce`, using a `switch` on `kind` to work out each saving. The total never goes below 0: a discount that would take it lower stops at 0. End the `switch` with a `default` branch that assigns the discount to a variable of type `never`, so the compiler complains the day someone adds a kind without a branch for it.',
    starter: `interface Line {
  sku: string;
  priceCents: number;
  quantity: number;
}

type Discount =
  | { kind: "percent"; percent: number }
  | { kind: "fixed"; cents: number }
  | { kind: "two-for-one"; sku: string };

const totalCents = (lines, discounts) => {

};

// Scratch pad. Change this and press Run.
console.log(totalCents([{ sku: "tea", priceCents: 350, quantity: 2 }], [{ kind: "percent", percent: 10 }]));
`,
    skeleton: `const saving = (total: number, discount: Discount, lines: readonly Line[]): number => {
  switch (discount.kind) {
    case "percent":
      return /* discount.percent of total, rounded to a cent */;
    case "fixed":
      return /* discount.cents */;
    case "two-for-one":
      return /* the free items of discount.sku, line by line */;
    default: {
      const unhandled: never = discount;
      return unhandled;
    }
  }
};

const totalCents = (lines: readonly Line[], discounts: readonly Discount[]): number => {
  const subtotal = /* reduce over the lines */;
  return discounts.reduce((total, discount) => /* never below 0 */, subtotal);
};`,
    hints: [
      'Inside `case "percent":` the compiler knows the discount has a `percent` and no `cents`. That is narrowing: checking the tag of a union tells TypeScript which member you hold.',
      'A line with `quantity` items has `Math.floor(quantity / 2)` free ones. `Math.max(0, total - saving)` keeps the total from going below 0 after each discount.',
    ],
    approach: [
      'Add up `priceCents * quantity` over the lines with `reduce`, starting from 0.',
      'Write a `saving(total, discount, lines)` function with a `switch` on `discount.kind`, one `case` per kind, and a `default` that assigns `discount` to a `never` variable.',
      'Call `reduce` on the discounts, starting from the subtotal. Each step returns `Math.max(0, total - saving(total, discount, lines))`, so the discounts apply in the order listed.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'totalCents([{ sku: "tea", priceCents: 350, quantity: 2 }, { sku: "cake", priceCents: 400, quantity: 1 }], [])', expected: 1100, label: 'no discounts: the subtotal' },
      { call: 'totalCents([{ sku: "tea", priceCents: 350, quantity: 2 }, { sku: "cake", priceCents: 400, quantity: 1 }], [{ kind: "percent", percent: 10 }])', expected: 990 },
      { call: 'totalCents([{ sku: "tea", priceCents: 350, quantity: 3 }, { sku: "cake", priceCents: 400, quantity: 1 }], [{ kind: "two-for-one", sku: "tea" }])', expected: 1100, label: '3 teas pay for 2' },
      { call: 'totalCents([{ sku: "book", priceCents: 1000, quantity: 1 }], [{ kind: "fixed", cents: 200 }, { kind: "percent", percent: 50 }])', expected: 400, label: 'in the order listed', edge: true },
      { call: 'totalCents([{ sku: "book", priceCents: 1000, quantity: 1 }], [{ kind: "percent", percent: 50 }, { kind: "fixed", cents: 200 }])', expected: 300, label: 'the other order gives another total', edge: true },
      { call: 'totalCents([{ sku: "pen", priceCents: 150, quantity: 1 }], [{ kind: "fixed", cents: 500 }])', expected: 0, label: 'never below 0', edge: true },
      { call: 'totalCents([], [{ kind: "percent", percent: 10 }])', expected: 0, label: 'an empty basket', edge: true },
    ],
    typeTests: [
      { code: 'const __total: number = totalCents([], []);', label: 'gives back a number of cents' },
      { code: 'const __lines: readonly Line[] = []; totalCents(__lines, []);', label: 'a readonly list of lines is accepted' },
      { code: 'totalCents([], [{ kind: "percent", cents: 10 }]);', label: 'a percent discount has a percent', rejects: true },
      { code: 'totalCents([], [{ kind: "coupon", code: "SPRING" }]);', label: 'there is no other kind', rejects: true },
    ],
  },
  {
    id: 'ts-mh-page-after-cursor',
    track: 'typescript',
    topic: 'typescript',
    level: 15,
    tier: 3,
    focus: ['constraints', 'slice', 'narrowing'],
    title: 'The page after a cursor',
    prompt: 'An API hands out a long list one page at a time. Instead of a page number, the client sends a cursor: the `id` of the last item it already has, or `null` for the first page. A page number slips when new items arrive at the top; a cursor keeps its place. Write `pageAfter<T extends { id: string }>(items: readonly T[], cursor: string | null, size: number): Page<T>`. With `null`, start at the first item. Otherwise start right after the item whose `id` is the cursor, and when no item has that id, the cursor is stale: return an empty page with `next: null`. Take at most `size` items with `slice`; `size` is at least 1. `next` is the id of the last item on the page when more items follow it, and `null` on the last page. Compare the cursor with `null` itself, because an empty string is an id like any other. The constraint `T extends { id: string }` is what lets you read `item.id`, and the page still keeps every other field of `T`.',
    starter: `interface Page<T> {
  items: T[];
  next: string | null;
}

const pageAfter = (items, cursor, size) => {

};

// Scratch pad. Change this and press Run.
console.log(pageAfter([{ id: "a" }, { id: "b" }, { id: "c" }], null, 2));
`,
    skeleton: `const pageAfter = <T extends { id: string }>(items: readonly T[], cursor: string | null, size: number): Page<T> => {
  let start = 0;
  if (cursor !== null) {
    // find the cursor's index; a stale cursor gives an empty page
    // the page starts right after it
  }
  const page = /* at most size items from start */;
  // more items follow when start + size is still inside the list
  return { items: page, next: /* the last id on the page, or null */ };
};`,
    hints: [
      '`findIndex` gives -1 when nothing matches, which is how you spot a stale cursor. `slice(start, start + size)` never runs past the end of the list, and it gives a new array, so the caller’s list stays as it was.',
      '`if (cursor)` treats `""` as if it were `null`. `if (cursor !== null)` narrows `string | null` to `string` and keeps the empty id.',
    ],
    approach: [
      'Work out where the page starts: 0 for a `null` cursor, otherwise one past the index of the item with that id.',
      'Return `{ items: [], next: null }` when the cursor matches no item.',
      'Slice at most `size` items from the start. `next` is the id of the last one when `start + size` is less than the length of the list, and `null` otherwise.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'pageAfter([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }], null, 2)', expected: { items: [{ id: 'a' }, { id: 'b' }], next: 'b' } },
      { call: 'pageAfter([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }], "b", 2)', expected: { items: [{ id: 'c' }, { id: 'd' }], next: 'd' } },
      { call: 'pageAfter([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }], "d", 2)', expected: { items: [{ id: 'e' }], next: null }, label: 'the last page has no next', edge: true },
      { call: 'pageAfter([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }], "b", 2)', expected: { items: [{ id: 'c' }, { id: 'd' }], next: null }, label: 'a full page that ends the list', edge: true },
      { call: 'pageAfter([{ id: "a" }, { id: "b" }], "b", 2)', expected: { items: [], next: null }, label: 'after the last item', edge: true },
      { call: 'pageAfter([{ id: "a" }, { id: "b" }], "zz", 2)', expected: { items: [], next: null }, label: 'a stale cursor', edge: true },
      { call: 'pageAfter([{ id: "a", name: "Ada" }, { id: "b", name: "Bo" }], null, 5)', expected: { items: [{ id: 'a', name: 'Ada' }, { id: 'b', name: 'Bo' }], next: null }, label: 'every field is kept' },
    ],
    typeTests: [
      { code: 'const __page: Page<{ id: string; name: string }> = pageAfter([{ id: "a", name: "Ada" }], null, 2);', label: 'the page keeps the item type' },
      { code: 'pageAfter([{ name: "Ada" }], null, 2);', label: 'every item needs an id', rejects: true },
      { code: 'pageAfter([{ id: 1 }], null, 2);', label: 'the id is a string', rejects: true },
      { code: 'const __next: string = pageAfter([{ id: "a" }], null, 1).next;', label: 'next can be null', rejects: true },
    ],
  },
  {
    id: 'ts-mh-group-runs',
    track: 'typescript',
    topic: 'typescript',
    level: 14,
    tier: 3,
    focus: ['generics', 'tuples', 'for-of'],
    title: 'One bubble per sender',
    prompt: 'A chat window draws the messages one person sends in a row as one bubble, and starts a new bubble when someone else writes. Write `groupRuns<T>(items: readonly T[], keyOf: (item: T) => string): [string, T[]][]`, returning one `[key, items]` pair for every run of neighbouring items that share a key, in order. A key that comes back later starts a new run, so this is not the same as grouping by key. Walk the items once with `for...of` and compare each item’s key with the key of the last run. Because the function is generic, the items in each run keep their own type, whether they are messages, numbers or log lines. Leave `items` unchanged.',
    starter: `interface Message {
  from: string;
  text: string;
}

const groupRuns = (items, keyOf) => {

};

// Scratch pad. Change this and press Run.
console.log(groupRuns([{ from: "Ada", text: "Hi" }, { from: "Ada", text: "Free now?" }, { from: "Bo", text: "Yes" }], (message) => message.from));
`,
    skeleton: `const groupRuns = <T>(items: readonly T[], keyOf: (item: T) => string): [string, T[]][] => {
  const runs: [string, T[]][] = [];
  for (const item of items) {
    const key = keyOf(item);
    const last = runs[runs.length - 1];
    // same key as the last run: add the item to it
    // otherwise: start a new run of [key, [item]]
  }
  return runs;
};`,
    hints: [
      'Type the result before you fill it: `const runs: [string, T[]][] = []`. Without the annotation, `[key, [item]]` would be read as an array of mixed values, not a pair.',
      'Only the last run can grow. Check that there is a last run at all before you compare keys, and compare with `===`: a key of `""` is still a key.',
    ],
    approach: [
      'Start an empty list of runs typed `[string, T[]][]`.',
      'For each item, work out its key and look at the last run.',
      'If there is a last run and its key is the same, push the item into that run’s list. Otherwise push a new pair, `[key, [item]]`.',
    ],
    verify: 'tests',
    estimatedMinutes: 15,
    tests: [
      { call: 'groupRuns([{ from: "Ada", text: "Hi" }, { from: "Ada", text: "Free now?" }, { from: "Bo", text: "Yes" }], (message) => message.from)', expected: [['Ada', [{ from: 'Ada', text: 'Hi' }, { from: 'Ada', text: 'Free now?' }]], ['Bo', [{ from: 'Bo', text: 'Yes' }]]] },
      { call: 'groupRuns([{ from: "Ada", text: "Hi" }, { from: "Bo", text: "Hey" }, { from: "Ada", text: "Lunch?" }], (message) => message.from)', expected: [['Ada', [{ from: 'Ada', text: 'Hi' }]], ['Bo', [{ from: 'Bo', text: 'Hey' }]], ['Ada', [{ from: 'Ada', text: 'Lunch?' }]]], label: 'a key that comes back starts a new run' },
      { call: 'groupRuns([1, 1, 2, 3, 3, 3], (n) => String(n))', expected: [['1', [1, 1]], ['2', [2]], ['3', [3, 3, 3]]] },
      { call: 'groupRuns([], (n) => String(n))', expected: [], label: 'no items', edge: true },
      { call: 'groupRuns(["a"], (s) => s)', expected: [['a', ['a']]], label: 'one item', edge: true },
      { call: 'groupRuns(["x", "y", "z"], () => "all")', expected: [['all', ['x', 'y', 'z']]], label: 'one key for everything', edge: true },
    ],
    typeTests: [
      { code: 'const __runs: [string, Message[]][] = groupRuns([{ from: "Ada", text: "Hi" }], (message) => message.from);', label: 'runs of messages hold messages' },
      { code: 'const __numbers: [string, number[]][] = groupRuns([1, 2], (n) => String(n));', label: 'runs of numbers hold numbers' },
      { code: 'groupRuns([1, 2], (n) => n);', label: 'the key is a string', rejects: true },
      { code: 'const __wrong: [string, string[]][] = groupRuns([1, 2], (n) => String(n));', label: 'numbers do not come back as text', rejects: true },
    ],
  },
  {
    id: 'ts-mh-check-a-form',
    track: 'typescript',
    topic: 'typescript',
    level: 18,
    tier: 3,
    focus: ['keyof', 'utility-types', 'generics'],
    title: 'Check a sign-up form',
    prompt: 'A form library lets every field list its own checks. A check takes the field’s value and returns a message when something is wrong, or `null` when the value is fine. The types in the starter describe it. `Rules<T>` maps each key of the form `T` to a list of checks for that field’s own type, `T[K]`, so a check on `age` receives a number and a check on `email` receives a string. Write `checkForm<T extends object>(values: T, rules: Rules<T>): Errors<T>`. For every field that has checks, run them in order and stop at the first message: that message is the field’s error, and the checks after it do not run, because a later check may assume the earlier ones passed. A field with no checks, or whose checks all return `null`, does not appear in the result. `Errors<T>` is `Partial<Record<keyof T, string>>`, so an error may be missing for any field.',
    starter: `type Check<V> = (value: V) => string | null;
type Rules<T> = { [K in keyof T]?: readonly Check<T[K]>[] };
type Errors<T> = Partial<Record<keyof T, string>>;

const checkForm = (values, rules) => {

};

// Scratch pad. Change this and press Run.
console.log(checkForm({ email: "ada", age: 17 }, {
  email: [(email) => (email.includes("@") ? null : "Enter an email address")],
  age: [(age) => (age >= 18 ? null : "You must be 18 or over")],
}));
`,
    skeleton: `const checkForm = <T extends object>(values: T, rules: Rules<T>): Errors<T> => {
  const errors: Errors<T> = {};
  for (const key in rules) {
    const checks = rules[key];
    // no checks for this field: move on
    // run each check on values[key]; the first message is the error, then stop
  }
  return errors;
};`,
    hints: [
      '`for (const key in rules)` gives each key as a key of `T`, so `rules[key]` is the list of checks for that field and `values[key]` is a value of the type those checks accept. No cast is needed.',
      'A `for...of` loop over the checks can stop with `break` as soon as one returns a message. Compare the result with `null`: a message is any string.',
    ],
    approach: [
      'Start an empty `Errors<T>` object.',
      'Loop over the keys of `rules`. Skip a key whose list is missing.',
      'Run the checks on `values[key]` in order. At the first result that is not `null`, store it under `key` and stop checking that field.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'checkForm({ email: "ada", password: "secret" }, { email: [(v) => (v.includes("@") ? null : "Enter an email address")], password: [(v) => (v.length >= 8 ? null : "Use at least 8 characters")] })', expected: { email: 'Enter an email address', password: 'Use at least 8 characters' } },
      { call: 'checkForm({ email: "ada@example.com", password: "correct horse" }, { email: [(v) => (v.includes("@") ? null : "Enter an email address")], password: [(v) => (v.length >= 8 ? null : "Use at least 8 characters")] })', expected: {}, label: 'nothing wrong' },
      { call: 'checkForm({ name: "" }, { name: [(v) => (v === "" ? "Enter your name" : null), (v) => (v.length < 2 ? "Too short" : null)] })', expected: { name: 'Enter your name' }, label: 'the first message wins' },
      { call: 'checkForm({ name: "A" }, { name: [(v) => (v === "" ? "Enter your name" : null), (v) => (v.length < 2 ? "Too short" : null)] })', expected: { name: 'Too short' }, label: 'a later check runs when the earlier ones pass' },
      { call: 'checkForm({ email: "x", nickname: "" }, { email: [(v) => (v.includes("@") ? null : "Enter an email address")] })', expected: { email: 'Enter an email address' }, label: 'a field without checks is never reported', edge: true },
      { call: 'checkForm({ age: 0 }, { age: [(v) => (v >= 18 ? null : "You must be 18 or over")] })', expected: { age: 'You must be 18 or over' }, label: '0 is a value to check', edge: true },
      { call: 'checkForm({ email: "" }, {})', expected: {}, label: 'no rules at all', edge: true },
    ],
    typeTests: [
      { code: 'checkForm({ email: "", age: 17 }, { age: [(age) => (age < 18 ? "Too young" : null)] });', label: 'a check on age receives a number' },
      { code: 'checkForm({ email: "" }, { email: [(email: number) => null] });', label: 'a check takes the field’s own type', rejects: true },
      { code: 'checkForm({ email: "" }, { phone: [] });', label: 'only the form’s own fields have checks', rejects: true },
      { code: 'const __error: string = checkForm({ email: "" }, {}).email;', label: 'an error may be missing', rejects: true },
    ],
  },
  {
    id: 'ts-mh-release-notes',
    track: 'typescript',
    topic: 'typescript',
    level: 20,
    tier: 3,
    focus: ['type-guards', 'literal-types', 'record', 'strings'],
    title: 'Release notes from commits',
    prompt: 'Many teams write commit subjects in one shape, `type(scope): summary`, such as `feat(search): filter by date` or `fix: crash on an empty basket`. The shape is: the type, then optionally a scope in round brackets that is not empty, then a colon and a space, then a summary that is not empty. Write two functions. `isCommitType(value: string): value is CommitType` is a type guard, true only for the types listed in `COMMIT_TYPES`. `releaseNotes(subjects: readonly string[]): Notes` sorts the subjects into sections. `Notes` is a `Record` with one list per commit type plus `"other"`, and every list is there even when it is empty. A subject in the shape whose type passes the guard adds its note to that type’s list: the summary, with the scope and a colon in front when there is a scope, as in `"search: filter by date"`. Everything else, an unknown type like `chore` or text that is not in the shape at all, goes to `"other"` exactly as written. Keep the order the subjects came in.',
    starter: `const COMMIT_TYPES = ["feat", "fix", "docs"] as const;
type CommitType = (typeof COMMIT_TYPES)[number];
type Notes = Record<CommitType | "other", string[]>;

const isCommitType = (value) => {

};

const releaseNotes = (subjects) => {

};

// Scratch pad. Change this and press Run.
console.log(releaseNotes(["feat(search): filter by date", "chore: bump deps"]));
`,
    skeleton: `const isCommitType = (value: string): value is CommitType =>
  /* is value one of COMMIT_TYPES? */;

const releaseNotes = (subjects: readonly string[]): Notes => {
  const notes: Notes = { feat: [], fix: [], docs: [], other: [] };
  for (const subject of subjects) {
    const colon = subject.indexOf(": ");
    // no ": ", or nothing after it: other
    // the text before it is the type, maybe followed by (scope)
    // a known type: push the note into notes[type]; otherwise: other
  }
  return notes;
};`,
    hints: [
      '`COMMIT_TYPES` is a readonly tuple of three literal types, so `COMMIT_TYPES.includes(value)` refuses a plain `string`. `COMMIT_TYPES.some((type) => type === value)` compares each one with the text. Inside `if (isCommitType(type))` the compiler knows `type` is a `CommitType`, which is what lets you write `notes[type]`.',
      '`indexOf(": ")` finds the first colon followed by a space, so a summary may hold another one. When the text before it ends with `)`, the scope sits between the `(` and that last character.',
    ],
    approach: [
      'Write the guard: return whether any entry of `COMMIT_TYPES` equals `value`, with the return type `value is CommitType`.',
      'Build a fresh `Notes` object with four empty lists on every call.',
      'For each subject, find `": "`. Split the text before it into a type and an optional scope, and check that neither the summary nor a bracketed scope is empty.',
      'If the shape holds and the type passes `isCommitType`, push `scope ? scope + ": " + summary : summary` into that type’s list. Otherwise push the subject into `other`.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'releaseNotes(["feat(search): filter by date", "fix: crash on an empty basket", "docs: explain the cache"])', expected: { feat: ['search: filter by date'], fix: ['crash on an empty basket'], docs: ['explain the cache'], other: [] } },
      { call: 'releaseNotes(["chore: bump deps", "Merge branch main"])', expected: { feat: [], fix: [], docs: [], other: ['chore: bump deps', 'Merge branch main'] }, label: 'unknown types and other text go to other' },
      { call: 'releaseNotes(["fix: a", "fix(ui): b", "fix: c"])', expected: { feat: [], fix: ['a', 'ui: b', 'c'], docs: [], other: [] }, label: 'the order is kept' },
      { call: 'releaseNotes(["feat: ", "feat:tight"])', expected: { feat: [], fix: [], docs: [], other: ['feat: ', 'feat:tight'] }, label: 'no summary, or no space after the colon', edge: true },
      { call: 'releaseNotes([])', expected: { feat: [], fix: [], docs: [], other: [] }, label: 'every section is there', edge: true },
      { call: 'isCommitType("docs")', expected: true },
      { call: 'isCommitType("chore")', expected: false, edge: true },
    ],
    typeTests: [
      { code: 'const __guard: (value: string) => value is CommitType = isCommitType;', label: 'isCommitType is a type guard' },
      { code: 'const __fixes: string[] = releaseNotes([]).fix;', label: 'each section is a list of text' },
      { code: 'const __type: CommitType = "chore";', label: 'only the listed types', rejects: true },
      { code: 'releaseNotes([]).chore;', label: 'there is no section for other types', rejects: true },
    ],
  },
  {
    id: 'ts-mh-fill-missing-days',
    track: 'typescript',
    topic: 'typescript',
    level: 10,
    tier: 3,
    focus: ['tuples', 'map-set', 'while'],
    title: 'Fill in the missing days',
    prompt: 'A sales chart needs one point per day, but the database only returns the days that had sales. Each reading is a labelled tuple, `[date: string, value: number]`, with the date written `YYYY-MM-DD`. Write `fillDays(readings: readonly Reading[]): Reading[]`, returning one reading for every day from the earliest date to the latest, in date order, with `0` for a day that has no reading. Readings may arrive in any order, and two readings for the same day add up, so collect them in a `Map` first. Then walk from the first day to the last with a `while` loop. To step one day, make a date at midnight UTC with `new Date(date + "T00:00:00Z")`, add a day with `setUTCDate(getUTCDate() + 1)`, and read the text back with `toISOString().slice(0, 10)`. Working in UTC means a clock change can never skip or repeat a day. No readings give an empty list.',
    starter: `type Reading = [date: string, value: number];

const fillDays = (readings) => {

};

// Scratch pad. Change this and press Run.
console.log(fillDays([["2026-03-01", 4], ["2026-03-04", 2]]));
`,
    skeleton: `const fillDays = (readings: readonly Reading[]): Reading[] => {
  const totals = new Map<string, number>();
  // add every reading to totals, so a repeated day sums up

  const days = [...totals.keys()].sort();
  // no days: return []

  const filled: Reading[] = [];
  const day = new Date(days[0] + "T00:00:00Z");
  const last = days[days.length - 1];
  let text = days[0];
  while (/* text has not passed last */) {
    // push [text, the total for text or 0]
    // step day by one and read text back
  }
  return filled;
};`,
    hints: [
      'Dates written `YYYY-MM-DD` sort correctly as text, so `sort()` on the keys puts them in date order, and `text <= last` compares them the same way.',
      '`totals.get(date) ?? 0` gives 0 for a day with no reading. Type the result as `Reading[]` before you push into it, so `[text, value]` is read as a pair and not as an array of mixed values.',
    ],
    approach: [
      'Collect the readings in a `Map` from date to total, adding to the value already there.',
      'Sort the dates. With none, return an empty list.',
      'Starting at the earliest date, push `[date, total or 0]` and step one day in UTC, while the date is not past the latest one.',
    ],
    verify: 'tests',
    estimatedMinutes: 20,
    tests: [
      { call: 'fillDays([["2026-03-01", 4], ["2026-03-04", 2]])', expected: [['2026-03-01', 4], ['2026-03-02', 0], ['2026-03-03', 0], ['2026-03-04', 2]] },
      { call: 'fillDays([["2026-03-03", 1], ["2026-03-01", 5]])', expected: [['2026-03-01', 5], ['2026-03-02', 0], ['2026-03-03', 1]], label: 'readings in any order' },
      { call: 'fillDays([["2026-03-01", 2], ["2026-03-01", 3]])', expected: [['2026-03-01', 5]], label: 'the same day adds up', edge: true },
      { call: 'fillDays([["2026-01-30", 1], ["2026-02-02", 1]])', expected: [['2026-01-30', 1], ['2026-01-31', 0], ['2026-02-01', 0], ['2026-02-02', 1]], label: 'across the end of a month' },
      { call: 'fillDays([["2026-05-05", 0]])', expected: [['2026-05-05', 0]], label: 'one reading', edge: true },
      { call: 'fillDays([])', expected: [], label: 'no readings', edge: true },
    ],
    typeTests: [
      { code: 'const __days: Reading[] = fillDays([["2026-03-01", 4]]);', label: 'gives back readings' },
      { code: 'const [__day, __amount]: [string, number] = fillDays([["2026-03-01", 4]])[0];', label: 'each reading is a date and a number' },
      { code: 'fillDays([[4, "2026-03-01"]]);', label: 'the date comes first', rejects: true },
      { code: 'const __asText: string = fillDays([])[0][1];', label: 'the value is a number', rejects: true },
    ],
  },

  /* ── Hard ─────────────────────────────────────────────────────────── */
  {
    id: 'ts-mh-print-table',
    track: 'typescript',
    topic: 'typescript',
    level: 17,
    tier: 4,
    focus: ['keyof', 'generics', 'optional', 'strings'],
    title: 'Print a table',
    prompt: 'A command-line tool prints its results as a text table. Write `printTable<T>(rows: readonly T[], columns: readonly Column<T>[], formats: Formats<T> = {}): string`. A `Column<T>` names a key of the row type, a header, and an optional `align`, `"left"` or `"right"`, that is left when it is missing. `Formats<T>` is a mapped type: for any key `K` of `T` it may hold a function that turns a `T[K]` into text, so a format for `price` receives a number when `price` is a number. A cell’s text is its format’s result when its key has one, and `String(value)` otherwise. Lay the table out like this. Each column is as wide as its longest text, header included. Pad every header and cell to that width with spaces, `padEnd` for left and `padStart` for right. Join the cells of a line with `" | "`. The second line is a rule: dashes as wide as each column, joined with `"-+-"`. One line per row follows, and the lines are joined with `"\\n"`. No line ends with a space, so trim the end of each line. A table with no rows is its header line and its rule.',
    starter: `interface Column<T> {
  key: keyof T;
  header: string;
  align?: "left" | "right";
}

type Formats<T> = { [K in keyof T]?: (value: T[K]) => string };

const printTable = (rows, columns, formats = {}) => {

};

// Scratch pad. Change this and press Run.
console.log(printTable(
  [{ name: "Tea", price: 350 }, { name: "Cake", price: 1250 }],
  [{ key: "name", header: "Item" }, { key: "price", header: "Price", align: "right" }],
  { price: (cents) => (cents / 100).toFixed(2) },
));
`,
    skeleton: `const printTable = <T>(rows: readonly T[], columns: readonly Column<T>[], formats: Formats<T> = {}): string => {
  const cellText = <K extends keyof T>(row: T, key: K): string => {
    const format = formats[key];
    // the format's text when there is one, String(row[key]) otherwise
  };
  const body = rows.map((row) => columns.map((column) => cellText(row, column.key)));
  const widths = columns.map((column, index) => /* the longest of the header and every body[r][index] */);
  const pad = (text: string, index: number): string => /* padStart or padEnd to widths[index] */;
  const line = (cells: readonly string[]): string => /* pad, join with " | ", trim the end */;
  const rule = /* dashes per width, joined with "-+-" */;
  return [/* the header line, the rule, then one line per row */].join("\\n");
};`,
    hints: [
      'Read `formats[key]` with `key` typed as a type parameter `K extends keyof T`. The compiler then knows the format takes a `T[K]`, and `row[key]` is a `T[K]`, so the call type-checks. The format is optional, so check that it is there before you call it.',
      'Work out every cell’s text first, then the widths, then the padding: a formatted price can be wider than the number it came from. `Math.max(header.length, ...lengths)` handles a table with no rows too.',
    ],
    approach: [
      'Turn every row into a list of cell texts, one per column, using the column’s format when there is one.',
      'Work out each column’s width from its header and its cells.',
      'Write a `line` function that pads each text by its column’s `align`, joins them with `" | "` and trims the end.',
      'Return the header line, the rule of dashes joined with `"-+-"`, and one line per row, joined with new lines.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: 'printTable([{ name: "Tea", price: 350 }, { name: "Cake", price: 1250 }], [{ key: "name", header: "Item" }, { key: "price", header: "Price", align: "right" }], { price: (cents) => (cents / 100).toFixed(2) })', expected: 'Item | Price\n-----+------\nTea  |  3.50\nCake | 12.50' },
      { call: 'printTable([{ city: "Oslo", people: 709000 }, { city: "Bergen", people: 291000 }], [{ key: "city", header: "City" }, { key: "people", header: "People", align: "right" }])', expected: 'City   | People\n-------+-------\nOslo   | 709000\nBergen | 291000', label: 'no formats: String(value)' },
      { call: 'printTable([{ id: 7 }], [{ key: "id", header: "Order number", align: "right" }])', expected: 'Order number\n------------\n           7', label: 'the header sets the width' },
      { call: 'printTable([{ a: 1, b: 2 }], [{ key: "b", header: "B" }, { key: "a", header: "A" }])', expected: 'B | A\n--+--\n2 | 1', label: 'columns in the order given' },
      { call: 'printTable([{ a: "x", b: "" }, { a: "longer", b: "y" }], [{ key: "a", header: "A" }, { key: "b", header: "B" }])', expected: 'A      | B\n-------+--\nx      |\nlonger | y', label: 'no line ends with a space', edge: true },
      { call: 'printTable([], [{ key: "name", header: "Name" }, { key: "qty", header: "Qty" }])', expected: 'Name | Qty\n-----+----', label: 'no rows: the header and the rule', edge: true },
    ],
    typeTests: [
      { code: 'printTable([{ name: "Tea", price: 350 }], [{ key: "price", header: "Price", align: "right" }], { price: (cents) => (cents / 100).toFixed(2) });', label: 'a format receives its column’s own type' },
      { code: 'const __text: string = printTable([{ name: "Tea" }], [{ key: "name", header: "Name" }]);', label: 'gives back text' },
      { code: 'printTable([{ name: "Tea" }], [{ key: "size", header: "Size" }]);', label: 'a column names a key of the row', rejects: true },
      { code: 'printTable([{ name: "Tea", price: 350 }], [], { price: (cents: string) => cents });', label: 'the format for a number takes a number', rejects: true },
      { code: 'printTable([{ name: "Tea" }], [{ key: "name", header: "Name", align: "center" }]);', label: 'left or right, nothing else', rejects: true },
    ],
  },
  {
    id: 'ts-mh-pick-from-warehouses',
    track: 'typescript',
    topic: 'typescript',
    level: 20,
    tier: 4,
    focus: ['record', 'tuples', 'narrowing', 'utility-types'],
    title: 'Pick an order from warehouses',
    prompt: 'A shop keeps stock in three warehouses. `Stock` is a `Readonly` `Record` from each `Warehouse` to how many of each sku it holds, and a sku a warehouse does not list counts as 0. Write `allocate(order: readonly OrderLine[], stock: Stock): Allocation`, where an order line is a tuple `[sku, quantity]` and the result says where to pick each line. First check that the order can be filled at all: add up, for each sku, what the order asks for and what the three warehouses hold. When any sku is short, pick nothing and return `{ ok: false, short }`, where `short` maps every short sku to how many are missing. Otherwise go through the lines in order. When one warehouse holds the whole line, pick all of it there, from the first such warehouse in `WAREHOUSES` order: one parcel is cheaper than two. When none does, take what each warehouse holds, in `WAREHOUSES` order, until the line is complete, and skip a warehouse that has none. Each pick is a tuple `[warehouse, sku, quantity]`. Stock picked for one line is gone for the next, and a sku can appear on more than one line, so keep your own copy of the counts: `stock` itself never changes. `Allocation` is a union told apart by `ok`, so a caller reads `picks` only after checking it.',
    starter: `type Warehouse = "north" | "south" | "east";
const WAREHOUSES: readonly Warehouse[] = ["north", "south", "east"];

type Stock = Readonly<Record<Warehouse, Readonly<Record<string, number>>>>;
type OrderLine = readonly [sku: string, quantity: number];
type PickItem = [warehouse: Warehouse, sku: string, quantity: number];
type Allocation =
  | { ok: true; picks: PickItem[] }
  | { ok: false; short: Record<string, number> };

const allocate = (order, stock) => {

};

// Scratch pad. Change this and press Run.
console.log(allocate([["tea", 3]], { north: { tea: 2 }, south: { tea: 5 }, east: {} }));
`,
    skeleton: `const allocate = (order: readonly OrderLine[], stock: Stock): Allocation => {
  // 1. what the order asks for and what the warehouses hold, per sku
  // 2. any sku short: return { ok: false, short }

  const left: Record<Warehouse, Record<string, number>> = {
    north: { ...stock.north },
    south: { ...stock.south },
    east: { ...stock.east },
  };
  const picks: PickItem[] = [];
  for (const [sku, quantity] of order) {
    const whole = WAREHOUSES.find((warehouse) => /* holds the whole line */);
    if (whole !== undefined) {
      // one pick, and take it off left[whole]
    } else {
      // take from each warehouse in order until the line is complete
    }
  }
  return { ok: true, picks };
};`,
    hints: [
      '`left[warehouse][sku] ?? 0` reads a count that may not be listed. `WAREHOUSES.find(...)` gives a `Warehouse` or `undefined`; checking `whole !== undefined` narrows it to a `Warehouse` you can pick from.',
      'Because every line is checked before any picking starts, a line that no single warehouse can hold can always be completed by taking from all three in turn.',
    ],
    approach: [
      'Add up the quantity ordered per sku, and what the three warehouses hold of it. Collect every sku that is short, with how many are missing, and return them before picking anything.',
      'Copy the counts into a `left` record you are free to change.',
      'For each line, find the first warehouse whose count covers it. If there is one, pick the whole line there and subtract it.',
      'Otherwise walk `WAREHOUSES`, take the smaller of what is still needed and what is left, push a pick when that is more than 0, and subtract.',
    ],
    verify: 'tests',
    estimatedMinutes: 40,
    tests: [
      { call: 'allocate([["tea", 3]], { north: { tea: 2 }, south: { tea: 5 }, east: { tea: 9 } })', expected: { ok: true, picks: [['south', 'tea', 3]] }, label: 'the first warehouse that holds the whole line' },
      { call: 'allocate([["tea", 5]], { north: { tea: 2 }, south: { tea: 1 }, east: { tea: 3 } })', expected: { ok: true, picks: [['north', 'tea', 2], ['south', 'tea', 1], ['east', 'tea', 2]] }, label: 'split in warehouse order when none holds it all' },
      { call: 'allocate([["tea", 2], ["cake", 1], ["tea", 2]], { north: { tea: 3, cake: 1 }, south: { tea: 1 }, east: {} })', expected: { ok: true, picks: [['north', 'tea', 2], ['north', 'cake', 1], ['north', 'tea', 1], ['south', 'tea', 1]] }, label: 'stock picked for one line is gone for the next' },
      { call: 'allocate([["tea", 4], ["jam", 2]], { north: { tea: 1 }, south: { tea: 2, jam: 5 }, east: {} })', expected: { ok: false, short: { tea: 1 } }, label: 'short: nothing is picked' },
      { call: 'allocate([["mug", 1]], { north: {}, south: {}, east: {} })', expected: { ok: false, short: { mug: 1 } }, label: 'a sku nobody stocks', edge: true },
      { call: '(() => { const stock = { north: { tea: 2 }, south: {}, east: {} }; allocate([["tea", 2]], stock); return stock; })()', expected: { north: { tea: 2 }, south: {}, east: {} }, label: 'stock is not changed', edge: true },
      { call: 'allocate([], { north: {}, south: {}, east: {} })', expected: { ok: true, picks: [] }, label: 'an empty order', edge: true },
    ],
    typeTests: [
      { code: 'const __result = allocate([["tea", 2]], { north: { tea: 5 }, south: {}, east: {} }); if (__result.ok) { const __picks: [Warehouse, string, number][] = __result.picks; }', label: 'picks are there once ok is true' },
      { code: 'const __other = allocate([], { north: {}, south: {}, east: {} }); if (!__other.ok) { const __short: Record<string, number> = __other.short; }', label: 'short is there once ok is false' },
      { code: 'allocate([["tea", 2]], { north: {}, south: {}, east: {} }).picks;', label: 'check ok before reading picks', rejects: true },
      { code: 'allocate([["tea", 2]], { north: {}, south: {} });', label: 'stock covers every warehouse', rejects: true },
      { code: 'allocate([["tea", "2"]], { north: {}, south: {}, east: {} });', label: 'a quantity is a number', rejects: true },
    ],
  },
  {
    id: 'ts-mh-import-rows',
    track: 'typescript',
    topic: 'typescript',
    level: 19,
    tier: 4,
    focus: ['utility-types', 'keyof', 'strings', 'narrowing'],
    title: 'Import a spreadsheet',
    prompt: 'People paste spreadsheets into an admin page as tab-separated text: a header line with the column names, then one record per line, with the cells separated by a tab, `"\\t"`. Write `importRows<S extends Parsers>(text: string, schema: S): ImportResult<S>`. The schema gives every column the program needs a parser: a function from the cell’s text to a value, which throws when the text is not acceptable. `Row<S>` uses `ReturnType` to give each key the type its parser returns, so a schema of `{ name: String, price: Number }` makes rows of `{ name: string; price: number }`. The rules: split the text into lines on `"\\n"`, numbered from 1 with the header as line 1. A line that is empty or only spaces is skipped, but still counted. The header may list its columns in any order and may have extra ones, which are ignored; trim each header name. If a schema key has no column, return no rows and one error per missing key, in schema order: `"Missing column: price"`. For every record, hand each parser its cell, trimmed; a cell past the end of a short line is `""`. A parser that throws rejects the record: it is left out of `rows`, and every rejected cell adds an error `"Line 3, price: <message>"`, in schema order. The message is the error’s `message` when it is an `Error`, and `String(error)` for anything else. Rows keep the order of their lines. TypeScript cannot follow a loop that fills in every key of `Row<S>`, so build each row as a `Record<string, unknown>` and tell the compiler once, with `as Row<S>`, after every parser has run.',
    starter: `type Parsers = Record<string, (cell: string) => unknown>;
type Row<S extends Parsers> = { [K in keyof S]: ReturnType<S[K]> };

interface ImportResult<S extends Parsers> {
  rows: Row<S>[];
  errors: string[];
}

const importRows = (text, schema) => {

};

// Scratch pad. Change this and press Run.
console.log(importRows("name\\tprice\\nTea\\t3.5\\nCake\\t12", { name: String, price: Number }));
`,
    skeleton: `const importRows = <S extends Parsers>(text: string, schema: S): ImportResult<S> => {
  const lines = text.split("\\n");
  const header = lines[0].split("\\t").map((name) => name.trim());
  const keys = Object.keys(schema);
  // any key missing from the header: return { rows: [], errors: ["Missing column: key", ...] }

  const rows: Row<S>[] = [];
  const errors: string[] = [];
  lines.forEach((line, index) => {
    // skip the header and blank lines; the line number is index + 1
    const cells = line.split("\\t");
    const row: Record<string, unknown> = {};
    let rejected = false;
    for (const key of keys) {
      const cell = /* the cell under this key's column, trimmed, or "" */;
      try {
        row[key] = schema[key](cell);
      } catch (error) {
        // narrow error: Error has a message, anything else goes through String
      }
    }
    // keep the row only if nothing was rejected
  });
  return { rows, errors };
};`,
    hints: [
      'A `catch` clause hands you an `unknown`, because JavaScript can throw anything. `error instanceof Error` narrows it to an `Error`, whose `message` you can read; `String(error)` covers a thrown string.',
      'Look up each key’s column once with `header.indexOf(key)`. `cells[column] ?? ""` gives the empty text a short line leaves out, and `trim()` also takes the `"\\r"` a Windows file leaves at the end of every line.',
    ],
    approach: [
      'Split the text into lines and the first line into trimmed header names. Return one "Missing column" error per schema key the header lacks.',
      'For every later line that is not blank, split it into cells and give each schema key’s parser its trimmed cell inside `try`.',
      'In `catch`, narrow the error and push `Line N, key: message`, and remember that the record was rejected.',
      'Push the row, cast once with `as Row<S>`, only when no parser threw.',
    ],
    verify: 'tests',
    estimatedMinutes: 40,
    tests: [
      { call: 'importRows("name\\tprice\\nTea\\t3.5\\nCake\\t12", { name: String, price: Number })', expected: { rows: [{ name: 'Tea', price: 3.5 }, { name: 'Cake', price: 12 }], errors: [] } },
      { call: 'importRows("sku\\tprice\\tname\\nA1\\t2\\tJam", { name: String, price: Number })', expected: { rows: [{ name: 'Jam', price: 2 }], errors: [] }, label: 'columns in any order, extra ones ignored' },
      { call: 'importRows("name\\nTea", { name: String, price: Number })', expected: { rows: [], errors: ['Missing column: price'] }, label: 'a missing column', edge: true },
      { call: '(() => { const price = (cell) => { const value = Number(cell); if (cell === "" || Number.isNaN(value)) throw new Error("not a number"); return value; }; return importRows("name\\tprice\\nTea\\tcheap\\nCake\\t12\\nPie\\t", { name: String, price }); })()', expected: { rows: [{ name: 'Cake', price: 12 }], errors: ['Line 2, price: not a number', 'Line 4, price: not a number'] }, label: 'a rejected cell leaves its record out' },
      { call: 'importRows("name\\tqty\\n\\n  Tea \\t 2 \\n   \\nCake\\t1\\n", { name: String, qty: Number })', expected: { rows: [{ name: 'Tea', qty: 2 }, { name: 'Cake', qty: 1 }], errors: [] }, label: 'blank lines skipped, cells trimmed', edge: true },
      { call: '(() => { const qty = (cell) => { if (!/^\\d+$/.test(cell)) throw new Error("whole numbers only"); return Number(cell); }; return importRows("name\\tqty\\n\\nTea\\t1.5", { name: String, qty }); })()', expected: { rows: [], errors: ['Line 3, qty: whole numbers only'] }, label: 'a blank line still counts', edge: true },
    ],
    typeTests: [
      { code: 'const __rows: { name: string; price: number }[] = importRows("", { name: (cell: string) => cell, price: (cell: string) => Number(cell) }).rows;', label: 'each key gets its parser’s return type' },
      { code: 'const __wrong: { price: string }[] = importRows("", { price: (cell: string) => Number(cell) }).rows;', label: 'a number parser does not give text', rejects: true },
      { code: 'importRows("", { price: 5 });', label: 'every schema value is a parser', rejects: true },
      { code: 'importRows("", { price: (cell: number) => cell });', label: 'a parser takes the cell’s text', rejects: true },
    ],
  },
  {
    id: 'ts-mh-apply-edits',
    track: 'typescript',
    topic: 'typescript',
    level: 12,
    tier: 4,
    focus: ['unions', 'narrowing', 'sort', 'readonly'],
    title: 'Apply edits to a file',
    prompt: 'A formatter or a linter’s quick fix does not hand back a new file. It hands back a list of edits, each one replacing the text from `start` up to, but not including, `end` with `insert`, and every offset refers to the original text. An insertion has `start === end`, and a deletion has an empty `insert`. Write `applyEdits(text: string, edits: readonly Edit[]): EditResult`. First check each edit in list order: it needs `0 <= start <= end <= text.length`, and the first one that fails gives `{ ok: false, reason: "out-of-range", edit: index }`. Two edits conflict when one starts before the other ends, or when they start at the same offset, because then their order would be a guess. Sort a copy of the edits by `start`, remembering each one’s index in the list you were given: `edits` is readonly, and the caller’s order must survive. Walk the sorted copy, and the first time an edit starts before the previous one ends, or at the same offset, return `{ ok: false, reason: "overlap", edits: [previous index, this index] }`. Otherwise build the new text in one pass: the original text up to each edit’s start, then its `insert`, then carry on from its `end`. `EditResult` is a union told apart by `ok` and then by `reason`, so a caller can read `text` only after checking `ok`, and `edits` only after checking the reason.',
    starter: `interface Edit {
  start: number;
  end: number;
  insert: string;
}

type EditResult =
  | { ok: true; text: string }
  | { ok: false; reason: "out-of-range"; edit: number }
  | { ok: false; reason: "overlap"; edits: [number, number] };

const applyEdits = (text, edits) => {

};

// Scratch pad. Change this and press Run.
console.log(applyEdits("let x = 1;", [{ start: 4, end: 5, insert: "count" }]));
`,
    skeleton: `const applyEdits = (text: string, edits: readonly Edit[]): EditResult => {
  // 1. the first edit outside 0 <= start <= end <= text.length

  const sorted = edits
    .map((edit, index) => ({ ...edit, index }))
    .sort(/* by start */);

  // 2. walk sorted: an edit that starts before the previous end, or at the same start

  let result = "";
  let from = 0;
  for (const edit of sorted) {
    // the text from \`from\` to edit.start, then edit.insert; carry on from edit.end
  }
  return { ok: true, text: result + text.slice(from) };
};`,
    hints: [
      '`[...edits].sort(...)` or `edits.map(...).sort(...)` sorts a new array; `edits.sort(...)` would reorder the caller’s list, and the `readonly` type refuses it. `sort` is stable, so edits with the same start keep their list order.',
      'Every result you return must match one member of `EditResult` exactly. Write the literal `ok: false` and `reason: "overlap"` in the object, so the compiler can tell which member it is.',
    ],
    approach: [
      'Find the first edit, in list order, whose `start` and `end` are not both inside the text with `start <= end`, and return it as `out-of-range`.',
      'Pair each edit with its index, and sort that copy by `start`.',
      'Walk the sorted copy. When an edit’s start is before the previous edit’s end, or equal to the previous start, return both indexes as `overlap`.',
      'Build the text: for each sorted edit, append the original text since the last edit’s end, then the insert, and at the end append the rest of the original.',
    ],
    verify: 'tests',
    estimatedMinutes: 35,
    tests: [
      { call: 'applyEdits("let x = 1;", [{ start: 4, end: 5, insert: "count" }])', expected: { ok: true, text: 'let count = 1;' } },
      { call: 'applyEdits("a+b", [{ start: 2, end: 3, insert: "c" }, { start: 0, end: 1, insert: "z" }])', expected: { ok: true, text: 'z+c' }, label: 'every offset refers to the original text' },
      { call: 'applyEdits("hello world", [{ start: 5, end: 5, insert: "," }, { start: 0, end: 1, insert: "H" }, { start: 6, end: 11, insert: "there" }])', expected: { ok: true, text: 'Hello, there' }, label: 'an insertion and two replacements' },
      { call: 'applyEdits("abcd", [{ start: 2, end: 4, insert: "Z" }, { start: 0, end: 2, insert: "" }])', expected: { ok: true, text: 'Z' }, label: 'an edit may start where another ends', edge: true },
      { call: 'applyEdits("abcdef", [{ start: 0, end: 3, insert: "X" }, { start: 2, end: 4, insert: "Y" }])', expected: { ok: false, reason: 'overlap', edits: [0, 1] }, label: 'overlapping edits' },
      { call: 'applyEdits("abc", [{ start: 1, end: 1, insert: "x" }, { start: 1, end: 2, insert: "y" }])', expected: { ok: false, reason: 'overlap', edits: [0, 1] }, label: 'two edits at the same offset', edge: true },
      { call: 'applyEdits("abc", [{ start: 0, end: 1, insert: "" }, { start: 2, end: 9, insert: "" }])', expected: { ok: false, reason: 'out-of-range', edit: 1 }, label: 'an edit past the end', edge: true },
      { call: 'applyEdits("same", [])', expected: { ok: true, text: 'same' }, label: 'no edits', edge: true },
    ],
    typeTests: [
      { code: 'const __result = applyEdits("a", []); if (__result.ok) { const __text: string = __result.text; }', label: 'text is there once ok is true' },
      { code: 'const __other = applyEdits("a", []); if (!__other.ok && __other.reason === "overlap") { const __pair: [number, number] = __other.edits; }', label: 'the pair is there for an overlap' },
      { code: 'applyEdits("a", []).text;', label: 'check ok before reading text', rejects: true },
      { code: 'const __third = applyEdits("a", []); if (!__third.ok) { const __index: number = __third.edit; }', label: 'check the reason before reading edit', rejects: true },
      { code: 'applyEdits("a", [{ start: 0, end: 1 }]);', label: 'every edit has an insert', rejects: true },
    ],
  },
];
