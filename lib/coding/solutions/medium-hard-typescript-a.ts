// Server-only reference solutions and hidden tests for
// lib/coding/tasks/medium-hard-typescript-a.ts. Never import from client code.
// The hidden runtime tests aim at the shortcut each visible set leaves open:
// the technique the task combines, a value or shape the visible checks never
// used, and the case a plausible wrong answer gets wrong. The hidden type
// tests close the gaps the visible type tests leave.

import type { CodingSolution } from '../types';

export const MEDIUM_HARD_TYPESCRIPT_A_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── Medium ───────────────────────────────────────────────────────── */
  'ts-mh-apply-discounts': {
    solution: `interface Line {
  sku: string;
  priceCents: number;
  quantity: number;
}

type Discount =
  | { kind: "percent"; percent: number }
  | { kind: "fixed"; cents: number }
  | { kind: "two-for-one"; sku: string };

// How many cents one discount takes off the running total.
const saving = (total: number, discount: Discount, lines: readonly Line[]): number => {
  // The switch narrows discount: inside each case only that kind's fields exist.
  switch (discount.kind) {
    case "percent":
      return Math.round((total * discount.percent) / 100);
    case "fixed":
      return discount.cents;
    case "two-for-one": {
      const { sku } = discount;
      // Line by line: 3 teas pay for 2, so Math.floor(3 / 2) of them are free.
      return lines
        .filter((line) => line.sku === sku)
        .reduce((free, line) => free + Math.floor(line.quantity / 2) * line.priceCents, 0);
    }
    default: {
      // Every kind has a case, so nothing reaches here. A new kind in Discount
      // would make this assignment a compile error.
      const unhandled: never = discount;
      return unhandled;
    }
  }
};

const totalCents = (lines: readonly Line[], discounts: readonly Discount[]): number => {
  const subtotal = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  // In the order listed, and never below 0 after any one of them.
  return discounts.reduce((total, discount) => Math.max(0, total - saving(total, discount, lines)), subtotal);
};`,
    junior: `interface Line {
  sku: string;
  priceCents: number;
  quantity: number;
}

type Discount =
  | { kind: "percent"; percent: number }
  | { kind: "fixed"; cents: number }
  | { kind: "two-for-one"; sku: string };

const totalCents = (lines: readonly Line[], discounts: readonly Discount[]): number => {
  let total = 0;
  for (const line of lines) {
    total = total + line.priceCents * line.quantity;
  }

  for (const discount of discounts) {
    let saving = 0;
    if (discount.kind === "percent") {
      saving = Math.round((total * discount.percent) / 100);
    } else if (discount.kind === "fixed") {
      saving = discount.cents;
    } else if (discount.kind === "two-for-one") {
      for (const line of lines) {
        if (line.sku === discount.sku) {
          const freeItems = Math.floor(line.quantity / 2);
          saving = saving + freeItems * line.priceCents;
        }
      }
    } else {
      const unhandled: never = discount;
      return unhandled;
    }
    total = total - saving;
    if (total < 0) {
      total = 0;
    }
  }
  return total;
};`,
    senior: `interface Line {
  sku: string;
  priceCents: number;
  quantity: number;
}

type Discount =
  | { kind: "percent"; percent: number }
  | { kind: "fixed"; cents: number }
  | { kind: "two-for-one"; sku: string };

const assertNever = (value: never): never => {
  throw new Error(\`Unhandled discount: \${JSON.stringify(value)}\`);
};

const freeItemsCents = (lines: readonly Line[], sku: string): number =>
  lines.reduce(
    (sum, line) => (line.sku === sku ? sum + Math.floor(line.quantity / 2) * line.priceCents : sum),
    0,
  );

const saving = (total: number, discount: Discount, lines: readonly Line[]): number => {
  switch (discount.kind) {
    case "percent": return Math.round((total * discount.percent) / 100);
    case "fixed": return discount.cents;
    case "two-for-one": return freeItemsCents(lines, discount.sku);
    default: return assertNever(discount);
  }
};

const totalCents = (lines: readonly Line[], discounts: readonly Discount[]): number =>
  discounts.reduce(
    (total, discount) => Math.max(0, total - saving(total, discount, lines)),
    lines.reduce((sum, { priceCents, quantity }) => sum + priceCents * quantity, 0),
  );`,
    hiddenTests: [
      { call: 'totalCents([{ sku: "tea", priceCents: 999, quantity: 1 }], [{ kind: "percent", percent: 15 }])', expected: 849 },
      { call: 'totalCents([{ sku: "tea", priceCents: 300, quantity: 5 }, { sku: "tea", priceCents: 200, quantity: 2 }], [{ kind: "two-for-one", sku: "tea" }])', expected: 1100 },
      { call: 'totalCents([{ sku: "tea", priceCents: 300, quantity: 1 }, { sku: "cake", priceCents: 400, quantity: 2 }], [{ kind: "two-for-one", sku: "tea" }])', expected: 1100 },
      { call: 'totalCents([{ sku: "book", priceCents: 1000, quantity: 1 }], [{ kind: "percent", percent: 10 }, { kind: "percent", percent: 10 }])', expected: 810 },
      { call: 'totalCents([{ sku: "pen", priceCents: 150, quantity: 2 }], [{ kind: "fixed", cents: 1000 }, { kind: "percent", percent: 10 }, { kind: "fixed", cents: 5 }])', expected: 0 },
      { call: 'totalCents(Object.freeze([Object.freeze({ sku: "a", priceCents: 100, quantity: 2 })]), Object.freeze([{ kind: "percent", percent: 25 }]))', expected: 150 },
      { call: 'totalCents([{ sku: "mug", priceCents: 800, quantity: 4 }], [{ kind: "two-for-one", sku: "mug" }, { kind: "percent", percent: 50 }, { kind: "fixed", cents: 100 }])', expected: 700 },
    ],
    hiddenTypeTests: [
      { code: 'totalCents([], [{ kind: "two-for-one", sku: 5 }]);', rejects: true },
      { code: 'totalCents([{ sku: "a", priceCents: "1", quantity: 1 }], []);', rejects: true },
    ],
  },
  'ts-mh-page-after-cursor': {
    solution: `interface Page<T> {
  items: T[];
  next: string | null;
}

// T extends { id: string }: every item has an id to compare, and the page
// hands back the items with all their other fields.
const pageAfter = <T extends { id: string }>(items: readonly T[], cursor: string | null, size: number): Page<T> => {
  let start = 0;
  // null means the first page. Any string, "" included, is an id to find.
  if (cursor !== null) {
    const index = items.findIndex((item) => item.id === cursor);
    if (index === -1) return { items: [], next: null }; // a stale cursor
    start = index + 1;
  }
  // slice makes a new array and stops at the end of the list on its own.
  const page = items.slice(start, start + size);
  // More items follow only when the page stops before the list does.
  const hasMore = start + size < items.length;
  return { items: page, next: hasMore ? page[page.length - 1].id : null };
};`,
    junior: `interface Page<T> {
  items: T[];
  next: string | null;
}

const pageAfter = <T extends { id: string }>(items: readonly T[], cursor: string | null, size: number): Page<T> => {
  let start = 0;
  if (cursor !== null) {
    let found = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === cursor) {
        found = i;
        break;
      }
    }
    if (found === -1) {
      return { items: [], next: null };
    }
    start = found + 1;
  }

  const page: T[] = [];
  for (let i = start; i < items.length && page.length < size; i++) {
    page.push(items[i]);
  }

  let next: string | null = null;
  const lastIndex = start + page.length - 1;
  if (page.length > 0 && lastIndex < items.length - 1) {
    next = page[page.length - 1].id;
  }
  return { items: page, next: next };
};`,
    senior: `interface Page<T> {
  items: T[];
  next: string | null;
}

const pageAfter = <T extends { id: string }>(items: readonly T[], cursor: string | null, size: number): Page<T> => {
  const start = cursor === null ? 0 : items.findIndex(({ id }) => id === cursor) + 1;
  if (cursor !== null && start === 0) return { items: [], next: null };
  const end = start + size;
  const page = items.slice(start, end);
  return { items: page, next: end < items.length ? page.at(-1)!.id : null };
};`,
    hiddenTests: [
      { call: 'pageAfter([{ id: "" }, { id: "x" }], "", 1)', expected: { items: [{ id: 'x' }], next: null } },
      { call: 'pageAfter([{ id: "" }, { id: "x" }], null, 1)', expected: { items: [{ id: '' }], next: '' } },
      { call: '(() => { const list = Array.from({ length: 23 }, (_, i) => ({ id: "u" + i })); const seen = []; let cursor = null; let pages = 0; do { const page = pageAfter(list, cursor, 5); seen.push(...page.items.map((item) => item.id)); cursor = page.next; pages += 1; } while (cursor !== null && pages < 50); return [pages, seen.join(",") === list.map((item) => item.id).join(",")]; })()', expected: [5, true] },
      { call: 'pageAfter(Object.freeze([{ id: "a" }, { id: "b" }, { id: "c" }]), "a", 1)', expected: { items: [{ id: 'b' }], next: 'b' } },
      { call: '(() => { const list = [{ id: "a" }, { id: "b" }]; const page = pageAfter(list, null, 5); page.items.push({ id: "z" }); return list.length; })()', expected: 2 },
      { call: 'pageAfter([{ id: "a" }, { id: "b" }, { id: "c" }], "a", 10)', expected: { items: [{ id: 'b' }, { id: 'c' }], next: null } },
    ],
    hiddenTypeTests: [
      { code: 'const __names: string[] = pageAfter([{ id: "a", name: "Ada" }], "a", 1).items.map((item) => item.name);' },
      { code: 'pageAfter([{ id: "a" }], 5, 1);', rejects: true },
    ],
  },
  'ts-mh-group-runs': {
    solution: `interface Message {
  from: string;
  text: string;
}

// T is whatever the items are; each run hands the same type back.
const groupRuns = <T>(items: readonly T[], keyOf: (item: T) => string): [string, T[]][] => {
  // Typed up front, so [key, [item]] below is read as a pair.
  const runs: [string, T[]][] = [];
  for (const item of items) {
    const key = keyOf(item);
    const last = runs[runs.length - 1];
    // Only the last run can grow. Compare with ===, so "" is a key like any other.
    if (last !== undefined && last[0] === key) {
      last[1].push(item);
    } else {
      runs.push([key, [item]]);
    }
  }
  return runs;
};`,
    junior: `interface Message {
  from: string;
  text: string;
}

const groupRuns = <T>(items: readonly T[], keyOf: (item: T) => string): [string, T[]][] => {
  const runs: [string, T[]][] = [];
  let currentKey = "";
  let currentItems: T[] = [];
  let started = false;

  for (const item of items) {
    const key = keyOf(item);
    if (started && key === currentKey) {
      currentItems.push(item);
    } else {
      if (started) {
        runs.push([currentKey, currentItems]);
      }
      currentKey = key;
      currentItems = [item];
      started = true;
    }
  }

  if (started) {
    runs.push([currentKey, currentItems]);
  }
  return runs;
};`,
    senior: `interface Message {
  from: string;
  text: string;
}

const groupRuns = <T>(items: readonly T[], keyOf: (item: T) => string): [key: string, run: T[]][] =>
  items.reduce<[key: string, run: T[]][]>((runs, item) => {
    const key = keyOf(item);
    const last = runs.at(-1);
    if (last?.[0] === key) last[1].push(item);
    else runs.push([key, [item]]);
    return runs;
  }, []);`,
    hiddenTests: [
      { call: 'groupRuns(["a", "b", "c"], (s) => (s === "c" ? "x" : ""))', expected: [['', ['a', 'b']], ['x', ['c']]] },
      { call: 'groupRuns([..."aabbbaacc"], (c) => c).map(([key, run]) => key + run.length).join(" ")', expected: 'a2 b3 a2 c2' },
      { call: '(() => { const list = [1, 2]; const runs = groupRuns(list, () => "k"); runs[0][1].push(3); return list; })()', expected: [1, 2] },
      { call: 'groupRuns(Object.freeze([3, 3, 4]), String)', expected: [['3', [3, 3]], ['4', [4]]] },
      { call: 'groupRuns([{ at: 1, level: "info" }, { at: 2, level: "info" }, { at: 3, level: "error" }], (entry) => entry.level).map(([level, run]) => [level, run.map((entry) => entry.at)])', expected: [['info', [1, 2]], ['error', [3]]] },
    ],
    hiddenTypeTests: [
      { code: 'const [__key, __run] = groupRuns([true], (b) => String(b))[0]; const __flags: boolean[] = __run;' },
      { code: 'const __flat: Message[] = groupRuns([{ from: "Ada", text: "Hi" }], (message) => message.from);', rejects: true },
    ],
  },
  'ts-mh-check-a-form': {
    solution: `type Check<V> = (value: V) => string | null;
type Rules<T> = { [K in keyof T]?: readonly Check<T[K]>[] };
type Errors<T> = Partial<Record<keyof T, string>>;

const checkForm = <T extends object>(values: T, rules: Rules<T>): Errors<T> => {
  const errors: Errors<T> = {};
  // for...in gives each key as a key of T, so rules[key] and values[key]
  // line up: the checks for a field accept exactly that field's type.
  for (const key in rules) {
    const checks = rules[key];
    if (!checks) continue;
    for (const check of checks) {
      const message = check(values[key]);
      // A later check may assume this one passed, so stop at the first message.
      if (message !== null) {
        errors[key] = message;
        break;
      }
    }
  }
  return errors;
};`,
    junior: `type Check<V> = (value: V) => string | null;
type Rules<T> = { [K in keyof T]?: readonly Check<T[K]>[] };
type Errors<T> = Partial<Record<keyof T, string>>;

const checkForm = <T extends object>(values: T, rules: Rules<T>): Errors<T> => {
  const errors: Errors<T> = {};
  for (const key in rules) {
    const checks = rules[key];
    if (checks === undefined) {
      continue;
    }
    const value = values[key];
    let index = 0;
    while (index < checks.length) {
      const message = checks[index](value);
      if (message !== null) {
        errors[key] = message;
        index = checks.length;
      } else {
        index = index + 1;
      }
    }
  }
  return errors;
};`,
    senior: `type Check<V> = (value: V) => string | null;
type Rules<T> = { [K in keyof T]?: readonly Check<T[K]>[] };
type Errors<T> = Partial<Record<keyof T, string>>;

const firstMessage = <V>(checks: readonly Check<V>[], value: V): string | null => {
  for (const check of checks) {
    const message = check(value);
    if (message !== null) return message;
  }
  return null;
};

const checkForm = <T extends object>(values: T, rules: Rules<T>): Errors<T> => {
  const errors: Errors<T> = {};
  for (const key in rules) {
    const message = firstMessage(rules[key] ?? [], values[key]);
    if (message !== null) errors[key] = message;
  }
  return errors;
};`,
    hiddenTests: [
      { call: '(() => { let calls = 0; checkForm({ name: "" }, { name: [() => "Required", () => { calls += 1; return null; }] }); return calls; })()', expected: 0 },
      { call: 'checkForm({ a: 1 }, { a: [] })', expected: {} },
      { call: 'checkForm({ a: 1 }, { a: undefined })', expected: {} },
      { call: 'checkForm({ tags: ["x"] }, { tags: [(v) => (Array.isArray(v) && v.length > 1 ? null : "Pick two tags")] })', expected: { tags: 'Pick two tags' } },
      { call: 'checkForm({ first: "Ada", last: "" }, { first: [(v) => (v ? null : "Required")], last: [(v) => (v ? null : "Required")] })', expected: { last: 'Required' } },
      { call: 'checkForm(Object.freeze({ code: "12" }), Object.freeze({ code: [(v) => (/^\\d{4}$/.test(v) ? null : "Four digits")] }))', expected: { code: 'Four digits' } },
    ],
    hiddenTypeTests: [
      { code: 'const __errors: Partial<Record<"email" | "age", string>> = checkForm({ email: "", age: 1 }, {});' },
      { code: 'checkForm({ email: "" }, { email: [(email: string) => 5] });', rejects: true },
    ],
  },
  'ts-mh-release-notes': {
    solution: `const COMMIT_TYPES = ["feat", "fix", "docs"] as const;
type CommitType = (typeof COMMIT_TYPES)[number];
type Notes = Record<CommitType | "other", string[]>;

// A type guard: when it returns true, the compiler treats value as a CommitType.
// Comparing with each listed type means "toString" is never mistaken for one.
const isCommitType = (value: string): value is CommitType =>
  COMMIT_TYPES.some((type) => type === value);

const releaseNotes = (subjects: readonly string[]): Notes => {
  // A new object every call, so two calls never share a list.
  const notes: Notes = { feat: [], fix: [], docs: [], other: [] };
  for (const subject of subjects) {
    const colon = subject.indexOf(": ");
    const summary = colon === -1 ? "" : subject.slice(colon + 2);
    let type = colon === -1 ? "" : subject.slice(0, colon);
    let scope = "";
    // "feat(search)": the scope sits between "(" and the closing ")".
    if (type.endsWith(")")) {
      const open = type.indexOf("(");
      scope = open === -1 ? "" : type.slice(open + 1, -1);
      type = open === -1 || scope === "" ? "" : type.slice(0, open);
    }
    if (summary !== "" && isCommitType(type)) {
      // Narrowed: type is a CommitType here, so notes[type] is one of the lists.
      notes[type].push(scope === "" ? summary : scope + ": " + summary);
    } else {
      notes.other.push(subject);
    }
  }
  return notes;
};`,
    junior: `const COMMIT_TYPES = ["feat", "fix", "docs"] as const;
type CommitType = (typeof COMMIT_TYPES)[number];
type Notes = Record<CommitType | "other", string[]>;

const isCommitType = (value: string): value is CommitType => {
  for (const type of COMMIT_TYPES) {
    if (type === value) {
      return true;
    }
  }
  return false;
};

const releaseNotes = (subjects: readonly string[]): Notes => {
  const notes: Notes = { feat: [], fix: [], docs: [], other: [] };
  for (const subject of subjects) {
    const colon = subject.indexOf(": ");
    if (colon === -1) {
      notes.other.push(subject);
      continue;
    }
    const head = subject.slice(0, colon);
    const summary = subject.slice(colon + 2);
    let type = head;
    let scope = "";
    const open = head.indexOf("(");
    if (open !== -1 && head.endsWith(")")) {
      type = head.slice(0, open);
      scope = head.slice(open + 1, head.length - 1);
      if (scope === "") {
        notes.other.push(subject);
        continue;
      }
    }
    if (summary === "" || !isCommitType(type)) {
      notes.other.push(subject);
      continue;
    }
    let note = summary;
    if (scope !== "") {
      note = scope + ": " + summary;
    }
    notes[type].push(note);
  }
  return notes;
};`,
    senior: `const COMMIT_TYPES = ["feat", "fix", "docs"] as const;
type CommitType = (typeof COMMIT_TYPES)[number];
type Notes = Record<CommitType | "other", string[]>;

const isCommitType = (value: string): value is CommitType =>
  (COMMIT_TYPES as readonly string[]).includes(value);

const SUBJECT = /^(?<type>[^\\s():]+)(?:\\((?<scope>[^()]+)\\))?: (?<summary>.+)$/s;

const releaseNotes = (subjects: readonly string[]): Notes => {
  const notes: Notes = { feat: [], fix: [], docs: [], other: [] };
  for (const subject of subjects) {
    const { type = "", scope, summary = "" } = SUBJECT.exec(subject)?.groups ?? {};
    if (isCommitType(type)) notes[type].push(scope ? \`\${scope}: \${summary}\` : summary);
    else notes.other.push(subject);
  }
  return notes;
};`,
    hiddenTests: [
      { call: '[isCommitType("toString"), isCommitType("constructor"), isCommitType("fix"), isCommitType("")]', expected: [false, false, true, false] },
      { call: 'releaseNotes(["fix(parser): handle \\"a: b\\""])', expected: { feat: [], fix: ['parser: handle "a: b"'], docs: [], other: [] } },
      { call: 'releaseNotes(["Feat: shout", "feat(): empty scope", "feat (ui): space", "hasOwnProperty: x"]).other', expected: ['Feat: shout', 'feat(): empty scope', 'feat (ui): space', 'hasOwnProperty: x'] },
      { call: 'releaseNotes(["docs(readme): add a badge", "docs: typo"]).docs', expected: ['readme: add a badge', 'typo'] },
      { call: '(() => { const notes = releaseNotes([]); notes.feat.push("x"); return releaseNotes([]).feat; })()', expected: [] },
      { call: 'releaseNotes(["feat(api): add limits", "chore(deps): bump", "fix: tidy"])', expected: { feat: ['api: add limits'], fix: ['tidy'], docs: [], other: ['chore(deps): bump'] } },
    ],
    hiddenTypeTests: [
      { code: 'releaseNotes(["feat: x"]).other.push(5);', rejects: true },
      { code: 'const __value: string = "feat"; if (isCommitType(__value)) { const __narrowed: CommitType = __value; }' },
    ],
  },
  'ts-mh-fill-missing-days': {
    solution: `type Reading = [date: string, value: number];

const fillDays = (readings: readonly Reading[]): Reading[] => {
  // One total per day, so two readings for the same day add up.
  const totals = new Map<string, number>();
  for (const [date, value] of readings) {
    totals.set(date, (totals.get(date) ?? 0) + value);
  }

  // YYYY-MM-DD sorts as text in date order.
  const days = [...totals.keys()].sort();
  if (days.length === 0) return [];

  const filled: Reading[] = [];
  const last = days[days.length - 1];
  // Midnight UTC: stepping a day in UTC never meets a clock change.
  const day = new Date(days[0] + "T00:00:00Z");
  let text = days[0];
  while (text <= last) {
    filled.push([text, totals.get(text) ?? 0]);
    day.setUTCDate(day.getUTCDate() + 1);
    text = day.toISOString().slice(0, 10);
  }
  return filled;
};`,
    junior: `type Reading = [date: string, value: number];

const fillDays = (readings: readonly Reading[]): Reading[] => {
  const totals = new Map<string, number>();
  let first = "";
  let last = "";
  for (const reading of readings) {
    const date = reading[0];
    const value = reading[1];
    const before = totals.get(date);
    if (before === undefined) {
      totals.set(date, value);
    } else {
      totals.set(date, before + value);
    }
    if (first === "" || date < first) {
      first = date;
    }
    if (last === "" || date > last) {
      last = date;
    }
  }

  const filled: Reading[] = [];
  if (first === "") {
    return filled;
  }

  const day = new Date(first + "T00:00:00Z");
  let text = first;
  while (text <= last) {
    let value = 0;
    const total = totals.get(text);
    if (total !== undefined) {
      value = total;
    }
    const reading: Reading = [text, value];
    filled.push(reading);
    day.setUTCDate(day.getUTCDate() + 1);
    text = day.toISOString().slice(0, 10);
  }
  return filled;
};`,
    senior: `type Reading = [date: string, value: number];

const DAY_MS = 24 * 60 * 60 * 1000;
const toTime = (date: string): number => Date.parse(\`\${date}T00:00:00Z\`);
const toDate = (time: number): string => new Date(time).toISOString().slice(0, 10);

const fillDays = (readings: readonly Reading[]): Reading[] => {
  const totals = new Map<string, number>();
  for (const [date, value] of readings) totals.set(date, (totals.get(date) ?? 0) + value);
  if (totals.size === 0) return [];

  const times = [...totals.keys()].map(toTime);
  const first = Math.min(...times);
  const count = (Math.max(...times) - first) / DAY_MS + 1;
  return Array.from({ length: count }, (_, i): Reading => {
    const date = toDate(first + i * DAY_MS);
    return [date, totals.get(date) ?? 0];
  });
};`,
    hiddenTests: [
      { call: 'fillDays([["2024-02-28", 1], ["2024-03-01", 1]]).map(([date]) => date)', expected: ['2024-02-28', '2024-02-29', '2024-03-01'] },
      { call: 'fillDays([["2026-01-01", 2], ["2025-12-31", 1]])', expected: [['2025-12-31', 1], ['2026-01-01', 2]] },
      { call: 'fillDays([["2026-03-28", 1], ["2026-03-30", 1]]).map(([date]) => date)', expected: ['2026-03-28', '2026-03-29', '2026-03-30'] },
      { call: '(() => { const days = fillDays([["2026-01-01", 1], ["2026-12-31", 1]]); return [days.length, days[58][0], days[59][0]]; })()', expected: [365, '2026-02-28', '2026-03-01'] },
      { call: 'fillDays([["2026-03-02", -3], ["2026-03-01", 1], ["2026-03-02", 1]])', expected: [['2026-03-01', 1], ['2026-03-02', -2]] },
      { call: 'fillDays(Object.freeze([Object.freeze(["2026-07-02", 5]), Object.freeze(["2026-06-30", 1])]))', expected: [['2026-06-30', 1], ['2026-07-01', 0], ['2026-07-02', 5]] },
    ],
    hiddenTypeTests: [
      { code: 'fillDays([["2026-03-01"]]);', rejects: true },
      { code: 'const __readings: readonly Reading[] = []; fillDays(__readings);' },
    ],
  },

  /* ── Hard ─────────────────────────────────────────────────────────── */
  'ts-mh-print-table': {
    solution: `interface Column<T> {
  key: keyof T;
  header: string;
  align?: "left" | "right";
}

type Formats<T> = { [K in keyof T]?: (value: T[K]) => string };

const printTable = <T>(rows: readonly T[], columns: readonly Column<T>[], formats: Formats<T> = {}): string => {
  // With key typed as K, formats[key] is a function of T[K] (or undefined),
  // and row[key] is a T[K], so the call below type-checks.
  const cellText = <K extends keyof T>(row: T, key: K): string => {
    const format = formats[key];
    return format ? format(row[key]) : String(row[key]);
  };
  // Every cell's text first: a formatted value can be wider than the raw one.
  const body = rows.map((row) => columns.map((column) => cellText(row, column.key)));
  const widths = columns.map((column, index) =>
    Math.max(column.header.length, ...body.map((cells) => cells[index].length)));
  const pad = (text: string, index: number): string =>
    columns[index].align === "right" ? text.padStart(widths[index]) : text.padEnd(widths[index]);
  // Padding the last column on the left side leaves spaces at the end: trim them.
  const line = (cells: readonly string[]): string => cells.map(pad).join(" | ").trimEnd();
  const rule = widths.map((width) => "-".repeat(width)).join("-+-");
  return [line(columns.map((column) => column.header)), rule, ...body.map(line)].join("\\n");
};`,
    junior: `interface Column<T> {
  key: keyof T;
  header: string;
  align?: "left" | "right";
}

type Formats<T> = { [K in keyof T]?: (value: T[K]) => string };

const printTable = <T>(rows: readonly T[], columns: readonly Column<T>[], formats: Formats<T> = {}): string => {
  const cellText = <K extends keyof T>(row: T, key: K): string => {
    const format = formats[key];
    if (format === undefined) {
      return String(row[key]);
    }
    return format(row[key]);
  };

  const body: string[][] = [];
  for (const row of rows) {
    const cells: string[] = [];
    for (const column of columns) {
      cells.push(cellText(row, column.key));
    }
    body.push(cells);
  }

  const widths: number[] = [];
  for (let i = 0; i < columns.length; i++) {
    let width = columns[i].header.length;
    for (const cells of body) {
      if (cells[i].length > width) {
        width = cells[i].length;
      }
    }
    widths.push(width);
  }

  const makeLine = (cells: string[]): string => {
    const padded: string[] = [];
    for (let i = 0; i < cells.length; i++) {
      if (columns[i].align === "right") {
        padded.push(cells[i].padStart(widths[i]));
      } else {
        padded.push(cells[i].padEnd(widths[i]));
      }
    }
    return padded.join(" | ").trimEnd();
  };

  const headers: string[] = [];
  for (const column of columns) {
    headers.push(column.header);
  }
  const dashes: string[] = [];
  for (const width of widths) {
    dashes.push("-".repeat(width));
  }

  const lines: string[] = [makeLine(headers), dashes.join("-+-")];
  for (const cells of body) {
    lines.push(makeLine(cells));
  }
  return lines.join("\\n");
};`,
    senior: `interface Column<T> {
  key: keyof T;
  header: string;
  align?: "left" | "right";
}

type Formats<T> = { [K in keyof T]?: (value: T[K]) => string };

const PAD = {
  left: (text: string, width: number) => text.padEnd(width),
  right: (text: string, width: number) => text.padStart(width),
} satisfies Record<NonNullable<Column<unknown>["align"]>, (text: string, width: number) => string>;

const printTable = <T>(rows: readonly T[], columns: readonly Column<T>[], formats: Formats<T> = {}): string => {
  const text = <K extends keyof T>(row: T, key: K): string => formats[key]?.(row[key]) ?? String(row[key]);
  const grid = [columns.map(({ header }) => header), ...rows.map((row) => columns.map(({ key }) => text(row, key)))];
  const widths = columns.map((_, i) => Math.max(...grid.map((cells) => cells[i].length)));
  const line = (cells: readonly string[]) =>
    cells.map((cell, i) => PAD[columns[i].align ?? "left"](cell, widths[i])).join(" | ").trimEnd();
  const [header, ...body] = grid.map(line);
  return [header, widths.map((width) => "-".repeat(width)).join("-+-"), ...body].join("\\n");
};`,
    hiddenTests: [
      { call: 'printTable([{ n: 0, ok: false, note: null }], [{ key: "n", header: "N" }, { key: "ok", header: "OK" }, { key: "note", header: "Note" }])', expected: 'N | OK    | Note\n--+-------+-----\n0 | false | null' },
      { call: 'printTable([{ n: 0 }, { n: 12 }], [{ key: "n", header: "N", align: "right" }], { n: (v) => (v === 0 ? "none" : String(v)) })', expected: '   N\n----\nnone\n  12' },
      { call: 'printTable([{ name: "Tea", price: 350 }], [{ key: "name", header: "Item" }], { price: () => "unused" })', expected: 'Item\n----\nTea' },
      { call: 'printTable([{ a: "x", b: 1 }, { a: "yy", b: 22 }], [{ key: "a", header: "A", align: "right" }, { key: "b", header: "B" }])', expected: ' A | B\n---+---\n x | 1\nyy | 22' },
      { call: 'printTable([{ tag: "a" }], [{ key: "tag", header: "Tag" }, { key: "tag", header: "Again", align: "right" }])', expected: 'Tag | Again\n----+------\na   |     a' },
      { call: '(() => { const columns = [{ key: "a", header: "A" }]; printTable([{ a: 1 }], columns); return columns; })()', expected: [{ key: 'a', header: 'A' }] },
    ],
    hiddenTypeTests: [
      { code: 'printTable([{ name: "Tea" }], [{ key: "name" }]);', rejects: true },
      { code: 'printTable([{ name: "Tea" }], [{ key: "name", header: "Name" }], { name: (value) => value.length });', rejects: true },
    ],
  },
  'ts-mh-pick-from-warehouses': {
    solution: `type Warehouse = "north" | "south" | "east";
const WAREHOUSES: readonly Warehouse[] = ["north", "south", "east"];

type Stock = Readonly<Record<Warehouse, Readonly<Record<string, number>>>>;
type OrderLine = readonly [sku: string, quantity: number];
type PickItem = [warehouse: Warehouse, sku: string, quantity: number];
type Allocation =
  | { ok: true; picks: PickItem[] }
  | { ok: false; short: Record<string, number> };

const allocate = (order: readonly OrderLine[], stock: Stock): Allocation => {
  // Check the whole order first, so nothing is picked for an order that cannot ship.
  const wanted: Record<string, number> = {};
  for (const [sku, quantity] of order) wanted[sku] = (wanted[sku] ?? 0) + quantity;
  const short: Record<string, number> = {};
  for (const sku of Object.keys(wanted)) {
    const held = WAREHOUSES.reduce((sum, warehouse) => sum + (stock[warehouse][sku] ?? 0), 0);
    if (held < wanted[sku]) short[sku] = wanted[sku] - held;
  }
  if (Object.keys(short).length > 0) return { ok: false, short };

  // Our own counts: stock is Readonly, and the caller's copy must not change.
  const left: Record<Warehouse, Record<string, number>> = {
    north: { ...stock.north },
    south: { ...stock.south },
    east: { ...stock.east },
  };
  const picks: PickItem[] = [];
  for (const [sku, quantity] of order) {
    // find gives a Warehouse or undefined; the check below narrows it.
    const whole = WAREHOUSES.find((warehouse) => (left[warehouse][sku] ?? 0) >= quantity);
    if (whole !== undefined) {
      picks.push([whole, sku, quantity]); // one parcel is cheaper than two
      left[whole][sku] -= quantity;
      continue;
    }
    // No single warehouse holds it: take what each has, in order.
    let needed = quantity;
    for (const warehouse of WAREHOUSES) {
      const take = Math.min(needed, left[warehouse][sku] ?? 0);
      if (take === 0) continue;
      picks.push([warehouse, sku, take]);
      left[warehouse][sku] -= take;
      needed -= take;
    }
  }
  return { ok: true, picks };
};`,
    junior: `type Warehouse = "north" | "south" | "east";
const WAREHOUSES: readonly Warehouse[] = ["north", "south", "east"];

type Stock = Readonly<Record<Warehouse, Readonly<Record<string, number>>>>;
type OrderLine = readonly [sku: string, quantity: number];
type PickItem = [warehouse: Warehouse, sku: string, quantity: number];
type Allocation =
  | { ok: true; picks: PickItem[] }
  | { ok: false; short: Record<string, number> };

const allocate = (order: readonly OrderLine[], stock: Stock): Allocation => {
  const left: Record<Warehouse, Record<string, number>> = { north: {}, south: {}, east: {} };
  for (const warehouse of WAREHOUSES) {
    for (const sku of Object.keys(stock[warehouse])) {
      left[warehouse][sku] = stock[warehouse][sku];
    }
  }

  const countOf = (warehouse: Warehouse, sku: string): number => {
    const count = left[warehouse][sku];
    if (count === undefined) {
      return 0;
    }
    return count;
  };

  const wanted: Record<string, number> = {};
  for (const line of order) {
    const sku = line[0];
    const quantity = line[1];
    if (wanted[sku] === undefined) {
      wanted[sku] = 0;
    }
    wanted[sku] = wanted[sku] + quantity;
  }

  const short: Record<string, number> = {};
  let anyShort = false;
  for (const sku of Object.keys(wanted)) {
    let held = 0;
    for (const warehouse of WAREHOUSES) {
      held = held + countOf(warehouse, sku);
    }
    if (held < wanted[sku]) {
      short[sku] = wanted[sku] - held;
      anyShort = true;
    }
  }
  if (anyShort) {
    return { ok: false, short: short };
  }

  const picks: PickItem[] = [];
  for (const line of order) {
    const sku = line[0];
    const quantity = line[1];

    let whole: Warehouse | undefined = undefined;
    for (const warehouse of WAREHOUSES) {
      if (whole === undefined && countOf(warehouse, sku) >= quantity) {
        whole = warehouse;
      }
    }

    if (whole !== undefined) {
      picks.push([whole, sku, quantity]);
      left[whole][sku] = countOf(whole, sku) - quantity;
    } else {
      let needed = quantity;
      for (const warehouse of WAREHOUSES) {
        const available = countOf(warehouse, sku);
        let take = available;
        if (needed < available) {
          take = needed;
        }
        if (take > 0) {
          picks.push([warehouse, sku, take]);
          left[warehouse][sku] = available - take;
          needed = needed - take;
        }
      }
    }
  }
  return { ok: true, picks: picks };
};`,
    senior: `type Warehouse = "north" | "south" | "east";
const WAREHOUSES: readonly Warehouse[] = ["north", "south", "east"];

type Stock = Readonly<Record<Warehouse, Readonly<Record<string, number>>>>;
type OrderLine = readonly [sku: string, quantity: number];
type PickItem = [warehouse: Warehouse, sku: string, quantity: number];
type Allocation =
  | { ok: true; picks: PickItem[] }
  | { ok: false; short: Record<string, number> };

const sumBy = <T>(items: readonly T[], value: (item: T) => number): number =>
  items.reduce((sum, item) => sum + value(item), 0);

const allocate = (order: readonly OrderLine[], stock: Stock): Allocation => {
  const left = new Map(WAREHOUSES.map((warehouse): [Warehouse, Map<string, number>] => [warehouse, new Map(Object.entries(stock[warehouse]))]));
  const count = (warehouse: Warehouse, sku: string) => left.get(warehouse)?.get(sku) ?? 0;
  const take = (warehouse: Warehouse, sku: string, quantity: number): PickItem => {
    left.get(warehouse)?.set(sku, count(warehouse, sku) - quantity);
    return [warehouse, sku, quantity];
  };

  const skus = [...new Set(order.map(([sku]) => sku))];
  const shortfalls = skus
    .map((sku): [string, number] => [
      sku,
      sumBy(order, ([s, q]) => (s === sku ? q : 0)) - sumBy(WAREHOUSES, (w) => count(w, sku)),
    ])
    .filter(([, missing]) => missing > 0);
  if (shortfalls.length > 0) return { ok: false, short: Object.fromEntries(shortfalls) };

  const picks = order.flatMap(([sku, quantity]): PickItem[] => {
    const whole = WAREHOUSES.find((warehouse) => count(warehouse, sku) >= quantity);
    if (whole) return [take(whole, sku, quantity)];
    let needed = quantity;
    return WAREHOUSES.flatMap((warehouse) => {
      const amount = Math.min(needed, count(warehouse, sku));
      needed -= amount;
      return amount > 0 ? [take(warehouse, sku, amount)] : [];
    });
  });
  return { ok: true, picks };
};`,
    hiddenTests: [
      { call: 'allocate([["tea", 2], ["tea", 2]], { north: { tea: 3 }, south: {}, east: {} })', expected: { ok: false, short: { tea: 1 } } },
      { call: 'allocate([["a", 2], ["b", 1], ["c", 1]], { north: { a: 1 }, south: { c: 1 }, east: {} })', expected: { ok: false, short: { a: 1, b: 1 } } },
      { call: 'allocate([["tea", 3]], { north: { tea: 0 }, south: { tea: 2 }, east: { tea: 1 } })', expected: { ok: true, picks: [['south', 'tea', 2], ['east', 'tea', 1]] } },
      { call: 'allocate([["tea", 2], ["tea", 2]], { north: { tea: 3 }, south: { tea: 2 }, east: {} })', expected: { ok: true, picks: [['north', 'tea', 2], ['south', 'tea', 2]] } },
      { call: 'allocate([["tea", 1], ["tea", 1]], Object.freeze({ north: Object.freeze({ tea: 1 }), south: Object.freeze({ tea: 1 }), east: Object.freeze({}) }))', expected: { ok: true, picks: [['north', 'tea', 1], ['south', 'tea', 1]] } },
      { call: 'allocate([["jam", 4], ["tea", 1]], { north: { jam: 1, tea: 1 }, south: { jam: 1 }, east: { jam: 2 } })', expected: { ok: true, picks: [['north', 'jam', 1], ['south', 'jam', 1], ['east', 'jam', 2], ['north', 'tea', 1]] } },
    ],
    hiddenTypeTests: [
      { code: 'const __place: Warehouse = "west";', rejects: true },
      { code: 'allocate([["tea", 1]], { north: {}, south: {}, east: {}, west: {} });', rejects: true },
    ],
  },
  'ts-mh-import-rows': {
    solution: `type Parsers = Record<string, (cell: string) => unknown>;
type Row<S extends Parsers> = { [K in keyof S]: ReturnType<S[K]> };

interface ImportResult<S extends Parsers> {
  rows: Row<S>[];
  errors: string[];
}

const importRows = <S extends Parsers>(text: string, schema: S): ImportResult<S> => {
  const lines = text.split("\\n");
  // trim() also removes the "\\r" a Windows file leaves at the end of a line.
  const header = lines[0].split("\\t").map((name) => name.trim());
  const keys = Object.keys(schema);
  const missing = keys.filter((key) => !header.includes(key));
  if (missing.length > 0) return { rows: [], errors: missing.map((key) => "Missing column: " + key) };

  const columns = keys.map((key) => header.indexOf(key));
  const rows: Row<S>[] = [];
  const errors: string[] = [];
  lines.forEach((line, index) => {
    if (index === 0 || line.trim() === "") return; // the header, or a blank line
    const cells = line.split("\\t");
    const row: Record<string, unknown> = {};
    let rejected = false;
    keys.forEach((key, k) => {
      const cell = (cells[columns[k]] ?? "").trim();
      try {
        row[key] = schema[key](cell);
      } catch (error) {
        // error is unknown: only an Error is known to carry a message.
        const message = error instanceof Error ? error.message : String(error);
        errors.push("Line " + (index + 1) + ", " + key + ": " + message);
        rejected = true;
      }
    });
    // Every parser has run on every key, which the compiler cannot see: say so once.
    if (!rejected) rows.push(row as Row<S>);
  });
  return { rows, errors };
};`,
    junior: `type Parsers = Record<string, (cell: string) => unknown>;
type Row<S extends Parsers> = { [K in keyof S]: ReturnType<S[K]> };

interface ImportResult<S extends Parsers> {
  rows: Row<S>[];
  errors: string[];
}

const importRows = <S extends Parsers>(text: string, schema: S): ImportResult<S> => {
  const lines = text.split("\\n");
  const header: string[] = [];
  for (const name of lines[0].split("\\t")) {
    header.push(name.trim());
  }

  const keys = Object.keys(schema);
  const errors: string[] = [];
  for (const key of keys) {
    if (header.indexOf(key) === -1) {
      errors.push("Missing column: " + key);
    }
  }
  if (errors.length > 0) {
    return { rows: [], errors: errors };
  }

  const rows: Row<S>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      continue;
    }
    const lineNumber = i + 1;
    const cells = line.split("\\t");
    const row: Record<string, unknown> = {};
    let ok = true;
    for (const key of keys) {
      const column = header.indexOf(key);
      let cell = "";
      if (column < cells.length) {
        cell = cells[column].trim();
      }
      const parse = schema[key];
      try {
        row[key] = parse(cell);
      } catch (error) {
        let message = "";
        if (error instanceof Error) {
          message = error.message;
        } else {
          message = String(error);
        }
        errors.push("Line " + lineNumber + ", " + key + ": " + message);
        ok = false;
      }
    }
    if (ok) {
      rows.push(row as Row<S>);
    }
  }
  return { rows: rows, errors: errors };
};`,
    senior: `type Parsers = Record<string, (cell: string) => unknown>;
type Row<S extends Parsers> = { [K in keyof S]: ReturnType<S[K]> };

interface ImportResult<S extends Parsers> {
  rows: Row<S>[];
  errors: string[];
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const importRows = <S extends Parsers>(text: string, schema: S): ImportResult<S> => {
  const [headerLine, ...records] = text.split("\\n");
  const header = headerLine.split("\\t").map((name) => name.trim());
  const keys = Object.keys(schema);
  const missing = keys.filter((key) => !header.includes(key));
  if (missing.length) return { rows: [], errors: missing.map((key) => \`Missing column: \${key}\`) };

  const rows: Row<S>[] = [];
  const errors: string[] = [];
  records.forEach((line, i) => {
    if (!line.trim()) return;
    const cells = line.split("\\t");
    const failures: string[] = [];
    const entries = keys.map((key) => {
      try {
        return [key, schema[key]((cells[header.indexOf(key)] ?? "").trim())] as const;
      } catch (error) {
        failures.push(\`Line \${i + 2}, \${key}: \${messageOf(error)}\`);
        return [key, undefined] as const;
      }
    });
    if (failures.length) errors.push(...failures);
    else rows.push(Object.fromEntries(entries) as Row<S>);
  });
  return { rows, errors };
};`,
    hiddenTests: [
      { call: '(() => { const bad = () => { throw new Error("bad"); }; return importRows("a\\tb\\nx\\ty", { a: bad, b: bad }); })()', expected: { rows: [], errors: ['Line 2, a: bad', 'Line 2, b: bad'] } },
      { call: 'importRows("a\\nx", { a: () => { throw "nope"; } })', expected: { rows: [], errors: ['Line 2, a: nope'] } },
      { call: 'importRows("a\\tb\\nx", { a: String, b: (cell) => (cell === "" ? null : cell) })', expected: { rows: [{ a: 'x', b: null }], errors: [] } },
      { call: 'importRows("z\\n1", { b: String, a: String })', expected: { rows: [], errors: ['Missing column: b', 'Missing column: a'] } },
      { call: 'importRows("name\\tprice\\r\\nTea\\t2\\r\\n", { name: String, price: Number })', expected: { rows: [{ name: 'Tea', price: 2 }], errors: [] } },
      { call: 'importRows(" name \\t price\\nTea\\t1", { name: String, price: Number })', expected: { rows: [{ name: 'Tea', price: 1 }], errors: [] } },
      { call: 'importRows("", { name: String })', expected: { rows: [], errors: ['Missing column: name'] } },
      { call: '(() => { const age = (cell) => { const n = Number(cell); if (!Number.isInteger(n) || n < 0) throw new RangeError("not an age"); return n; }; return importRows("age\\tname\\n30\\tAda\\n-1\\tBo\\n\\n7\\tCy", { name: String, age }); })()', expected: { rows: [{ name: 'Ada', age: 30 }, { name: 'Cy', age: 7 }], errors: ['Line 3, age: not an age'] } },
    ],
    hiddenTypeTests: [
      { code: 'const __errors: string[] = importRows("", {}).errors;' },
      { code: 'importRows("", { name: String }).rows[0].age;', rejects: true },
    ],
  },
  'ts-mh-apply-edits': {
    solution: `interface Edit {
  start: number;
  end: number;
  insert: string;
}

type EditResult =
  | { ok: true; text: string }
  | { ok: false; reason: "out-of-range"; edit: number }
  | { ok: false; reason: "overlap"; edits: [number, number] };

const applyEdits = (text: string, edits: readonly Edit[]): EditResult => {
  // 1. Every edit has to fit the text before anything else is looked at.
  const invalid = edits.findIndex((edit) => !(0 <= edit.start && edit.start <= edit.end && edit.end <= text.length));
  if (invalid !== -1) return { ok: false, reason: "out-of-range", edit: invalid };

  // 2. A sorted copy that remembers where each edit sat in the caller's list.
  // sort is stable, so two edits with the same start keep their list order.
  const sorted = edits.map((edit, index) => ({ ...edit, index })).sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const edit = sorted[i];
    // Sorted by start, so any overlap shows up between neighbours.
    if (edit.start < previous.end || edit.start === previous.start) {
      return { ok: false, reason: "overlap", edits: [previous.index, edit.index] };
    }
  }

  // 3. One pass over the original text: every offset refers to it.
  let result = "";
  let from = 0;
  for (const edit of sorted) {
    result += text.slice(from, edit.start) + edit.insert;
    from = edit.end;
  }
  return { ok: true, text: result + text.slice(from) };
};`,
    junior: `interface Edit {
  start: number;
  end: number;
  insert: string;
}

type EditResult =
  | { ok: true; text: string }
  | { ok: false; reason: "out-of-range"; edit: number }
  | { ok: false; reason: "overlap"; edits: [number, number] };

interface Numbered {
  start: number;
  end: number;
  insert: string;
  index: number;
}

const applyEdits = (text: string, edits: readonly Edit[]): EditResult => {
  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    const fits = edit.start >= 0 && edit.start <= edit.end && edit.end <= text.length;
    if (!fits) {
      return { ok: false, reason: "out-of-range", edit: i };
    }
  }

  const sorted: Numbered[] = [];
  for (let i = 0; i < edits.length; i++) {
    sorted.push({ start: edits[i].start, end: edits[i].end, insert: edits[i].insert, index: i });
  }
  sorted.sort((a, b) => a.start - b.start);

  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (current.start < previous.end) {
      return { ok: false, reason: "overlap", edits: [previous.index, current.index] };
    }
    if (current.start === previous.start) {
      return { ok: false, reason: "overlap", edits: [previous.index, current.index] };
    }
  }

  const parts: string[] = [];
  let position = 0;
  for (const edit of sorted) {
    parts.push(text.slice(position, edit.start));
    parts.push(edit.insert);
    position = edit.end;
  }
  parts.push(text.slice(position));
  return { ok: true, text: parts.join("") };
};`,
    senior: `interface Edit {
  start: number;
  end: number;
  insert: string;
}

type EditResult =
  | { ok: true; text: string }
  | { ok: false; reason: "out-of-range"; edit: number }
  | { ok: false; reason: "overlap"; edits: [number, number] };

const inRange = (length: number) => ({ start, end }: Edit): boolean => 0 <= start && start <= end && end <= length;
const conflicts = (previous: Edit, next: Edit): boolean => next.start < previous.end || next.start === previous.start;

const applyEdits = (text: string, edits: readonly Edit[]): EditResult => {
  const invalid = edits.findIndex((edit) => !inRange(text.length)(edit));
  if (invalid >= 0) return { ok: false, reason: "out-of-range", edit: invalid };

  const order = edits.map((_, index) => index).sort((a, b) => edits[a].start - edits[b].start);
  const clash = order.findIndex((index, i) => i > 0 && conflicts(edits[order[i - 1]], edits[index]));
  if (clash > 0) return { ok: false, reason: "overlap", edits: [order[clash - 1], order[clash]] };

  const { out, from } = order.reduce(
    (acc, index) => ({ out: acc.out + text.slice(acc.from, edits[index].start) + edits[index].insert, from: edits[index].end }),
    { out: "", from: 0 },
  );
  return { ok: true, text: out + text.slice(from) };
};`,
    hiddenTests: [
      { call: 'applyEdits("abcdefgh", [{ start: 6, end: 7, insert: "" }, { start: 4, end: 7, insert: "" }, { start: 0, end: 1, insert: "" }])', expected: { ok: false, reason: 'overlap', edits: [1, 0] } },
      { call: 'applyEdits("abcdef", [{ start: 1, end: 1, insert: "x" }, { start: 3, end: 4, insert: "y" }, { start: 1, end: 2, insert: "z" }])', expected: { ok: false, reason: 'overlap', edits: [0, 2] } },
      { call: '[applyEdits("abc", [{ start: 2, end: 1, insert: "" }]), applyEdits("abc", [{ start: -1, end: 0, insert: "" }])]', expected: [{ ok: false, reason: 'out-of-range', edit: 0 }, { ok: false, reason: 'out-of-range', edit: 0 }] },
      { call: 'applyEdits("abc", [{ start: 3, end: 3, insert: "!" }, { start: 0, end: 0, insert: "¡" }])', expected: { ok: true, text: '¡abc!' } },
      { call: '(() => { const edits = [{ start: 2, end: 3, insert: "c" }, { start: 0, end: 1, insert: "z" }]; applyEdits("a+b", edits); return edits.map((edit) => edit.start); })()', expected: [2, 0] },
      { call: 'applyEdits("abc", [{ start: 0, end: 2, insert: "" }, { start: 1, end: 2, insert: "" }, { start: 0, end: 5, insert: "" }])', expected: { ok: false, reason: 'out-of-range', edit: 2 } },
      { call: '(() => { const text = "a".repeat(200); const edits = Array.from({ length: 200 }, (_, i) => ({ start: 199 - i, end: 200 - i, insert: "b" })); const result = applyEdits(text, edits); return result.ok && result.text === "b".repeat(200); })()', expected: true },
      { call: 'applyEdits("one two", [{ start: 3, end: 3, insert: "," }, { start: 0, end: 3, insert: "1" }])', expected: { ok: true, text: '1, two' } },
    ],
    hiddenTypeTests: [
      { code: 'applyEdits("a", [{ start: "0", end: 1, insert: "" }]);', rejects: true },
      { code: 'const __edits: readonly Edit[] = [{ start: 0, end: 0, insert: "x" }]; applyEdits("a", __edits);' },
    ],
  },
};
