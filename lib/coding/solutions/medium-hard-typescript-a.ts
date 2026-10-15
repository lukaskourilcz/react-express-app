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
    junior: "interface Line {\n  sku: string;\n  priceCents: number;\n  quantity: number;\n}\n\ntype Discount =\n  | { kind: \"percent\"; percent: number }\n  | { kind: \"fixed\"; cents: number }\n  | { kind: \"two-for-one\"; sku: string };\n\nconst totalCents = (lines: readonly Line[], discounts: readonly Discount[]): number => {\n  const subtotal = lines.reduce((total, line) => total + line.priceCents * line.quantity, 0);\n  return discounts.reduce((total, discount) => {\n    let amount: number;\n    switch (discount.kind) {\n      case \"percent\":\n        amount = Math.round(total * discount.percent / 100);\n        break;\n      case \"fixed\":\n        amount = discount.cents;\n        break;\n      case \"two-for-one\":\n        amount = lines.reduce((sum, line) => line.sku === discount.sku\n          ? sum + Math.floor(line.quantity / 2) * line.priceCents : sum, 0);\n        break;\n      default: {\n        const unhandled: never = discount;\n        return unhandled;\n      }\n    }\n    return Math.max(0, total - amount);\n  }, subtotal);\n};",
    senior: "interface Line {\n  sku: string;\n  priceCents: number;\n  quantity: number;\n}\n\ntype Discount =\n  | { kind: \"percent\"; percent: number }\n  | { kind: \"fixed\"; cents: number }\n  | { kind: \"two-for-one\"; sku: string };\n\nconst assertNever = (value: never): never => {\n  throw new Error(`Unhandled discount: ${JSON.stringify(value)}`);\n};\n\nconst freeItemsCents = (lines: readonly Line[], sku: string): number =>\n  lines.reduce(\n    (sum, line) => (line.sku === sku ? sum + Math.floor(line.quantity / 2) * line.priceCents : sum),\n    0,\n  );\n\nconst saving = (total: number, discount: Discount, lines: readonly Line[]): number => {\n  switch (discount.kind) {\n    case \"percent\": return Math.round((total * discount.percent) / 100);\n    case \"fixed\": return discount.cents;\n    case \"two-for-one\": return freeItemsCents(lines, discount.sku);\n    default: {\n      const unhandled: never = discount;\n      return assertNever(unhandled);\n    }\n  }\n};\n\nconst totalCents = (lines: readonly Line[], discounts: readonly Discount[]): number =>\n  discounts.reduce(\n    (total, discount) => Math.max(0, total - saving(total, discount, lines)),\n    lines.reduce((sum, { priceCents, quantity }) => sum + priceCents * quantity, 0),\n  );",
    hiddenTests: [
      { call: "[totalCents([{sku:'x',priceCents:1,quantity:1}],[{kind:'percent',percent:50}]),totalCents([{sku:'x',priceCents:3,quantity:1}],[{kind:'percent',percent:50}])]", expected: [0, 1] },
      { call: "totalCents([{sku:'',priceCents:100,quantity:1},{sku:'',priceCents:100,quantity:1}],[{kind:'two-for-one',sku:''}])", expected: 200 },
      { call: "(()=>{const line=Object.freeze({sku:' tea ',priceCents:100,quantity:4}),lines=Object.freeze([line]),discount=Object.freeze({kind:'two-for-one',sku:' tea '}),discounts=Object.freeze([discount,discount]);return [totalCents(lines,discounts),line.quantity,line.priceCents,lines[0]===line,discounts[0]===discount];})()", expected: [0, 4, 100, true, true] },
      { call: "totalCents(Array.from({length:1000},()=>({sku:'x',priceCents:1000000,quantity:1000})),[{kind:'percent',percent:0},{kind:'fixed',cents:1}])", expected: 999999999999 },

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
    junior: "interface Page<T> {\n  items: T[];\n  next: string | null;\n}\n\nconst pageAfter = <T extends { id: string }>(items: readonly T[], cursor: string | null, size: number): Page<T> => {\n  let start = 0;\n  if (cursor !== null) {\n    const index = items.findIndex((item) => item.id === cursor);\n    if (index === -1) return { items: [], next: null };\n    start = index + 1;\n  }\n  const page = items.slice(start, start + size);\n  let next: string | null = null;\n  if (start + size < items.length) next = page[page.length - 1].id;\n  return { items: page, next };\n};",
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
      { call: "(()=>{const meta={},a=Object.freeze({id:'',meta}),b=Object.freeze({id:' x ',meta}),input=Object.freeze([a,b]),first=pageAfter(input,null,1),again=pageAfter(input,null,1);first.items.push(b);first.next='changed';return [first!==again,first.items!==again.items,again.items[0]===a,again.items[0].meta===meta,again.next,input.length,pageAfter(input,'',1).items[0]===b];})()", expected: [true, true, true, true, "", 2, true] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({id:'p'+i}))),seen=[];let cursor=null,pages=0;do{const page=pageAfter(input,cursor,137);seen.push(...page.items);cursor=page.next;pages++;}while(cursor!==null&&pages<20);return [pages,seen.length,seen.every((item,i)=>item===input[i]),cursor,input.length];})()", expected: [8, 1000, true, null, 1000] },
      { call: "(()=>{const input=Object.freeze([{id:'__proto__'},{id:' x '},{id:'x'}]);return [pageAfter(input,'__proto__',1).next,pageAfter(input,' x ',1).items[0]===input[2],pageAfter(input,' X ',1).items.length];})()", expected: [" x ", true, 0] },
      { call: "(()=>{const input=Object.freeze([{id:'a'}]),a=pageAfter(input,'missing',1),b=pageAfter(input,'a',1000000000),c=pageAfter(input,null,1000000000);a.items.push({id:'later'});return [a!==b,b.items.length,b.next,c.items[0]===input[0],c.next,input.length,pageAfter([],null,1)!==pageAfter([],null,1)];})()", expected: [true, 0, null, true, null, 1, true] },

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
    senior: "interface Message {\n  from: string;\n  text: string;\n}\n\nconst groupRuns = <T>(items: readonly T[], keyOf: (item: T) => string): [key: string, run: T[]][] => {\n  const runs: [key: string, run: T[]][] = [];\n  for (const item of items) {\n    const key = keyOf(item);\n    const last = runs.at(-1);\n    if (last !== undefined && last[0] === key) last[1].push(item);\n    else runs.push([key, [item]]);\n  }\n  return runs;\n};",
    hiddenTests: [
      { call: "(()=>{const objects=[Object.freeze({}),Object.freeze({}),Object.freeze({}),Object.freeze({})],input=Object.freeze(objects.slice()),seen=[],keys=['','','x',''];let calls=0;const out=groupRuns(input,function(value){seen.push([value,arguments.length]);return keys[calls++];});return [calls,seen.every((row,i)=>row[0]===objects[i]&&row[1]===1),out.map(([key,run])=>[key,run.length]),out[0][1][0]===objects[0],out[2][1][0]===objects[3],input.length];})()", expected: [4, true, [["", 2], ["x", 1], ["", 1]], true, true, 4] },
      { call: "(()=>{const input=Object.freeze([1,2,1]),a=groupRuns(input,String),b=groupRuns(input,String);a[0][1].push(99);a.push(['later',[]]);return [a!==b,a[0]!==b[0],a[0][1]!==b[0][1],b[0][1]!==b[2][1],b[0][1],input.length,groupRuns([],String)!==groupRuns([],String)];})()", expected: [true, true, true, true, [1], 3, true] },
      { call: "(()=>{const marker={},seen=[];try{groupRuns([1,2,3],value=>{seen.push(value);if(value===2)throw marker;return 'x';});return false;}catch(error){return error===marker&&seen.join(',')==='1,2';}})()", expected: true },
      { call: "(()=>{let calls=0;const input=Object.freeze(Array.from({length:1000},(_,i)=>i)),out=groupRuns(input,()=>{calls++;return '__proto__';});return [out.length,out[0][0],out[0][1].length,out[0][1][999],calls];})()", expected: [1, "__proto__", 1000, 999, 1000] },

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
    senior: "type Reading = [date: string, value: number];\n\nconst fillDays = (readings: readonly Reading[]): Reading[] => {\n  const totals = new Map<string, number>();\n  let first = \"\";\n  let last = \"\";\n  for (const [date, value] of readings) {\n    totals.set(date, (totals.get(date) ?? 0) + value);\n    if (first === \"\" || date < first) first = date;\n    if (last === \"\" || date > last) last = date;\n  }\n  const filled: Reading[] = [];\n  if (first === \"\") return filled;\n  const day = new Date(first + \"T00:00:00Z\");\n  let text = first;\n  while (text <= last) {\n    filled.push([text, totals.get(text) ?? 0]);\n    day.setUTCDate(day.getUTCDate() + 1);\n    text = day.toISOString().slice(0, 10);\n  }\n  return filled;\n};",
    hiddenTests: [
      { call: "(()=>{const first=Object.freeze(['2026-01-01',7]),last=Object.freeze(['2026-01-03',9]),input=Object.freeze([last,first]),out=fillDays(input),again=fillDays(input);out[0][1]=99;out.push(['2026-01-04',0]);return [out!==input,out!==again,out[0]!==first,out[2]!==last,again[0][1],again.length,input[0]===last,first[1],last[1]];})()", expected: [true, true, true, true, 7, 3, true, 7, 9] },
      { call: "(()=>{const readings=Object.freeze([Object.freeze(['2000-02-28',-2]),Object.freeze(['2000-03-01',5]),Object.freeze(['2000-02-28',2])]);return fillDays(readings);})()", expected: [["2000-02-28", 0], ["2000-02-29", 0], ["2000-03-01", 5]] },
      { call: "(()=>{const input=Array.from({length:1000},()=>['1000-01-01',1000000000]),out=fillDays(input),empty=fillDays([]);return [out,empty!==fillDays([]),input.length,input[0][1]];})()", expected: [[["1000-01-01", 1000000000000]], true, 1000, 1000000000] },
      { call: "(()=>{const out=fillDays([['2024-09-26',2],['2022-01-01',1]]);return [out.length,out[0],out[999],out[424][0]];})()", expected: [1000, ["2022-01-01", 1], ["2024-09-26", 2], "2023-03-01"] },

      { call: 'fillDays([["2024-02-28", 1], ["2024-03-01", 1]]).map(([date]) => date)', expected: ['2024-02-28', '2024-02-29', '2024-03-01'] },
      { call: 'fillDays([["2026-01-01", 2], ["2025-12-31", 1]])', expected: [['2025-12-31', 1], ['2026-01-01', 2]] },
      { call: 'fillDays([["2100-02-28", 1], ["2100-03-01", 1]]).map(([date]) => date)', expected: ['2100-02-28', '2100-03-01'] },
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
    solution: "interface Column<T> {\n  key: keyof T;\n  header: string;\n  align?: \"left\" | \"right\";\n}\n\ntype Formats<T> = { [K in keyof T]?: (value: T[K]) => string };\n\nconst printTable = <T>(rows: readonly T[], columns: readonly Column<T>[], formats: Formats<T> = {}): string => {\n  // With key typed as K, formats[key] is a function of T[K] (or undefined),\n  // and row[key] is a T[K], so the call below type-checks.\n  const cellText = <K extends keyof T>(row: T, key: K): string => {\n    const format = Object.hasOwn(formats, key) ? formats[key] : undefined;\n    return format ? format(row[key]) : String(row[key]);\n  };\n  // Every cell's text first: a formatted value can be wider than the raw one.\n  const body = rows.map((row) => columns.map((column) => cellText(row, column.key)));\n  const widths = columns.map((column, index) =>\n    Math.max(column.header.length, ...body.map((cells) => cells[index].length)));\n  const pad = (text: string, index: number): string =>\n    columns[index].align === \"right\" ? text.padStart(widths[index]) : text.padEnd(widths[index]);\n  // Padding the last column on the left side leaves spaces at the end: trim them.\n  const line = (cells: readonly string[]): string => cells.map(pad).join(\" | \").trimEnd();\n  const rule = widths.map((width) => \"-\".repeat(width)).join(\"-+-\");\n  return [line(columns.map((column) => column.header)), rule, ...body.map(line)].join(\"\\n\");\n};",
    junior: "interface Column<T> {\n  key: keyof T;\n  header: string;\n  align?: \"left\" | \"right\";\n}\n\ntype Formats<T> = { [K in keyof T]?: (value: T[K]) => string };\n\nconst printTable = <T>(rows: readonly T[], columns: readonly Column<T>[], formats: Formats<T> = {}): string => {\n  const cellText = <K extends keyof T>(row: T, key: K): string => {\n    const format = Object.hasOwn(formats, key) ? formats[key] : undefined;\n    if (format === undefined) {\n      return String(row[key]);\n    }\n    return format(row[key]);\n  };\n\n  const body: string[][] = [];\n  for (const row of rows) {\n    const cells: string[] = [];\n    for (const column of columns) {\n      cells.push(cellText(row, column.key));\n    }\n    body.push(cells);\n  }\n\n  const widths: number[] = [];\n  for (let i = 0; i < columns.length; i++) {\n    let width = columns[i].header.length;\n    for (const cells of body) {\n      if (cells[i].length > width) {\n        width = cells[i].length;\n      }\n    }\n    widths.push(width);\n  }\n\n  const makeLine = (cells: string[]): string => {\n    const padded: string[] = [];\n    for (let i = 0; i < cells.length; i++) {\n      if (columns[i].align === \"right\") {\n        padded.push(cells[i].padStart(widths[i]));\n      } else {\n        padded.push(cells[i].padEnd(widths[i]));\n      }\n    }\n    return padded.join(\" | \").trimEnd();\n  };\n\n  const headers: string[] = [];\n  for (const column of columns) {\n    headers.push(column.header);\n  }\n  const dashes: string[] = [];\n  for (const width of widths) {\n    dashes.push(\"-\".repeat(width));\n  }\n\n  const lines: string[] = [makeLine(headers), dashes.join(\"-+-\")];\n  for (const cells of body) {\n    lines.push(makeLine(cells));\n  }\n  return lines.join(\"\\n\");\n};",
    senior: "interface Column<T> {\n  key: keyof T;\n  header: string;\n  align?: \"left\" | \"right\";\n}\n\ntype Formats<T> = { [K in keyof T]?: (value: T[K]) => string };\n\nconst PAD = {\n  left: (text: string, width: number) => text.padEnd(width),\n  right: (text: string, width: number) => text.padStart(width),\n} satisfies Record<NonNullable<Column<unknown>[\"align\"]>, (text: string, width: number) => string>;\n\nconst printTable = <T>(rows: readonly T[], columns: readonly Column<T>[], formats: Formats<T> = {}): string => {\n  const text = <K extends keyof T>(row: T, key: K): string => {\n    const format = Object.hasOwn(formats, key) ? formats[key] : undefined;\n    return format === undefined ? String(row[key]) : format(row[key]);\n  };\n  const grid = [columns.map(({ header }) => header), ...rows.map((row) => columns.map(({ key }) => text(row, key)))];\n  const widths = columns.map((_, i) => Math.max(...grid.map((cells) => cells[i].length)));\n  const line = (cells: readonly string[]) =>\n    cells.map((cell, i) => PAD[columns[i].align ?? \"left\"](cell, widths[i])).join(\" | \").trimEnd();\n  const [header, ...body] = grid.map(line);\n  return [header, widths.map((width) => \"-\".repeat(width)).join(\"-+-\"), ...body].join(\"\\n\");\n};",
    hiddenTests: [
      { call: "(()=>{let calls=0;const seen=[],rows=Object.freeze([Object.freeze({a:1}),Object.freeze({a:2})]),columns=Object.freeze([Object.freeze({key:'a',header:'A'}),Object.freeze({key:'a',header:'B',align:'right'})]),formats=Object.freeze({a:function(value){seen.push([value,arguments.length]);return String(++calls)}});return [printTable(rows,columns,formats),calls,seen,rows.length,columns.length];})()", expected: ["A | B\n--+--\n1 | 2\n3 | 4", 4, [[1, 1], [1, 1], [2, 1], [2, 1]], 2, 2] },
      { call: "(()=>{const sym=Symbol('key'),row=Object.freeze({constructor:'x',toString:'yy',['__proto__']:'z',[sym]:'s'}),columns=Object.freeze([{key:'constructor',header:'C'},{key:'toString',header:'T'},{key:'__proto__',header:'P'},{key:sym,header:'S'}]),inherited=Object.create({[sym]:()=>{throw 'inherited'}});return [printTable([row],columns),printTable([row],columns,inherited)];})()", expected: ["C | T  | P | S\n--+----+---+--\nx | yy | z | s", "C | T  | P | S\n--+----+---+--\nx | yy | z | s"] },
      { call: "(()=>{return [printTable([],[]),printTable([{a:1},{a:2}],[]),printTable([{a:'a'}],[{key:'a',header:'\ud83d\ude00',align:'right'}]),printTable([{a:' x '}],[{key:'a',header:'H'}]),printTable([{a:9}],[{key:'a',header:'N'}],{a:()=>''})];})()", expected: ["\n", "\n\n\n", "\ud83d\ude00\n--\n a", "H\n---\n x", "N\n-\n"] },
      { call: "(()=>{const marker={},seen=[];let calls=0;try{printTable([{a:1},{a:2}],[{key:'a',header:'A'},{key:'a',header:'B'}],{a:function(value){seen.push([value,arguments.length]);if(++calls===2)throw marker;return String(value)}})}catch(error){return [error===marker,calls,seen]}return false;})()", expected: [true, 2, [[1, 1], [1, 1]]] },
      { call: "(()=>{let calls=0;const rows=Object.freeze(Array.from({length:100},()=>Object.freeze({a:1}))),columns=Object.freeze(Array.from({length:20},()=>Object.freeze({key:'a',header:'H'}))),text=printTable(rows,columns,{a:()=>{calls++;return '1'}}),lines=text.split('\\n');return [calls,lines.length,lines.every(line=>line.length===77),rows.length,columns.length];})()", expected: [2000, 102, true, 100, 20] },

      { call: 'printTable([{ n: 0, ok: false, note: null }], [{ key: "n", header: "N" }, { key: "ok", header: "OK" }, { key: "note", header: "Note" }])', expected: 'N | OK    | Note\n--+-------+-----\n0 | false | null' },
      { call: 'printTable([{ n: 0 }, { n: 12 }], [{ key: "n", header: "N", align: "right" }], { n: (v) => (v === 0 ? "none" : String(v)) })', expected: '   N\n----\nnone\n  12' },
      { call: 'printTable([{ name: "Tea", price: 350 }], [{ key: "name", header: "Item" }], { price: () => "unused" })', expected: 'Item\n----\nTea' },
      { call: 'printTable([{ a: "x", b: 1 }, { a: "yy", b: 22 }], [{ key: "a", header: "A", align: "right" }, { key: "b", header: "B" }])', expected: ' A | B\n---+---\n x | 1\nyy | 22' },
      { call: 'printTable([{ tag: "a" }], [{ key: "tag", header: "Tag" }, { key: "tag", header: "Again", align: "right" }])', expected: 'Tag | Again\n----+------\na   |     a' },
      { call: '(() => { const columns = [{ key: "a", header: "A" }]; printTable([{ a: 1 }], columns); return columns; })()', expected: [{ key: 'a', header: 'A' }] },
    ],
    hiddenTypeTests: [
      {"code": "const __auditKey=Symbol(); const __auditRows: readonly {[__auditKey]:number}[]=[{[__auditKey]:3}]; const __auditColumns: readonly Column<{[__auditKey]:number}>[]=[{key:__auditKey,header:\"N\"}]; const __auditText:string=printTable(__auditRows,__auditColumns,{[__auditKey]:value=>value.toFixed(1)});"},

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
      { call: '(() => { const stock = { north: {}, south: {}, east: { tea: 3 } }; allocate([["tea", 2]], stock); return stock; })()', expected: { north: {}, south: {}, east: { tea: 3 } } },
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
    solution: "interface Edit {\n  start: number;\n  end: number;\n  insert: string;\n}\n\ntype EditResult =\n  | { ok: true; text: string }\n  | { ok: false; reason: \"out-of-range\"; edit: number }\n  | { ok: false; reason: \"overlap\"; edits: [number, number] };\n\nconst applyEdits = (text: string, edits: readonly Edit[]): EditResult => {\n  // 1. Every edit has to fit the text before anything else is looked at.\n  const invalid = edits.findIndex((edit) => !(Number.isInteger(edit.start) && Number.isInteger(edit.end) && 0 <= edit.start && edit.start <= edit.end && edit.end <= text.length));\n  if (invalid !== -1) return { ok: false, reason: \"out-of-range\", edit: invalid };\n\n  // 2. A sorted copy that remembers where each edit sat in the caller's list.\n  // sort is stable, so two edits with the same start keep their list order.\n  const sorted = edits.map((edit, index) => ({ ...edit, index })).sort((a, b) => a.start - b.start);\n  for (let i = 1; i < sorted.length; i++) {\n    const previous = sorted[i - 1];\n    const edit = sorted[i];\n    // Sorted by start, so any overlap shows up between neighbours.\n    if (edit.start < previous.end || edit.start === previous.start) {\n      return { ok: false, reason: \"overlap\", edits: [previous.index, edit.index] };\n    }\n  }\n\n  // 3. One pass over the original text: every offset refers to it.\n  const parts: string[] = [];\n  let from = 0;\n  for (const edit of sorted) {\n    parts.push(text.slice(from, edit.start), edit.insert);\n    from = edit.end;\n  }\n  parts.push(text.slice(from));\n  return { ok: true, text: parts.join(\"\") };\n};",
    junior: "interface Edit {\n  start: number;\n  end: number;\n  insert: string;\n}\n\ntype EditResult =\n  | { ok: true; text: string }\n  | { ok: false; reason: \"out-of-range\"; edit: number }\n  | { ok: false; reason: \"overlap\"; edits: [number, number] };\n\ninterface Numbered {\n  start: number;\n  end: number;\n  insert: string;\n  index: number;\n}\n\nconst applyEdits = (text: string, edits: readonly Edit[]): EditResult => {\n  for (let i = 0; i < edits.length; i++) {\n    const edit = edits[i];\n    const fits = Number.isInteger(edit.start) && Number.isInteger(edit.end) && edit.start >= 0 && edit.start <= edit.end && edit.end <= text.length;\n    if (!fits) {\n      return { ok: false, reason: \"out-of-range\", edit: i };\n    }\n  }\n\n  const sorted: Numbered[] = [];\n  for (let i = 0; i < edits.length; i++) {\n    sorted.push({ start: edits[i].start, end: edits[i].end, insert: edits[i].insert, index: i });\n  }\n  sorted.sort((a, b) => a.start - b.start);\n\n  for (let i = 1; i < sorted.length; i++) {\n    const previous = sorted[i - 1];\n    const current = sorted[i];\n    if (current.start < previous.end) {\n      return { ok: false, reason: \"overlap\", edits: [previous.index, current.index] };\n    }\n    if (current.start === previous.start) {\n      return { ok: false, reason: \"overlap\", edits: [previous.index, current.index] };\n    }\n  }\n\n  const parts: string[] = [];\n  let position = 0;\n  for (const edit of sorted) {\n    parts.push(text.slice(position, edit.start));\n    parts.push(edit.insert);\n    position = edit.end;\n  }\n  parts.push(text.slice(position));\n  return { ok: true, text: parts.join(\"\") };\n};",
    senior: "interface Edit {\n  start: number;\n  end: number;\n  insert: string;\n}\n\ntype EditResult =\n  | { ok: true; text: string }\n  | { ok: false; reason: \"out-of-range\"; edit: number }\n  | { ok: false; reason: \"overlap\"; edits: [number, number] };\n\nconst inRange = (length: number) => ({ start, end }: Edit): boolean => Number.isInteger(start) && Number.isInteger(end) && 0 <= start && start <= end && end <= length;\nconst conflicts = (previous: Edit, next: Edit): boolean => next.start < previous.end || next.start === previous.start;\n\nconst applyEdits = (text: string, edits: readonly Edit[]): EditResult => {\n  const invalid = edits.findIndex((edit) => !inRange(text.length)(edit));\n  if (invalid >= 0) return { ok: false, reason: \"out-of-range\", edit: invalid };\n\n  const order = edits.map((_, index) => index).sort((a, b) => edits[a].start - edits[b].start);\n  const clash = order.findIndex((index, i) => i > 0 && conflicts(edits[order[i - 1]], edits[index]));\n  if (clash > 0) return { ok: false, reason: \"overlap\", edits: [order[clash - 1], order[clash]] };\n\n  const parts: string[] = [];\n  let from = 0;\n  for (const index of order) {\n    const edit = edits[index];\n    parts.push(text.slice(from, edit.start), edit.insert);\n    from = edit.end;\n  }\n  parts.push(text.slice(from));\n  return { ok: true, text: parts.join(\"\") };\n};",
    hiddenTests: [
      { call: "[applyEdits('abcd',[{start:0.5,end:1.5,insert:'x'}]),applyEdits('abcd',[{start:0,end:NaN,insert:''}]),applyEdits('abcd',[{start:Infinity,end:Infinity,insert:''}])]", expected: [{"ok": false, "reason": "out-of-range", "edit": 0}, {"ok": false, "reason": "out-of-range", "edit": 0}, {"ok": false, "reason": "out-of-range", "edit": 0}] },
      { call: "applyEdits('abcd',[{start:0,end:3,insert:''},{start:1,end:2,insert:''},{start:0,end:0.5,insert:''}])", expected: {"ok": false, "reason": "out-of-range", "edit": 2} },
      { call: "(()=>{const a=Object.freeze({start:1,end:3,insert:'X'}),b=Object.freeze({start:4,end:4,insert:'!'}),edits=Object.freeze([b,a]),out=applyEdits('A\ud83e\udd88B',edits);return [out,edits[0]===b,edits[1]===a,a.start,a.end];})()", expected: [{"ok": true, "text": "AXB!"}, true, true, 1, 3] },
      { call: "(()=>{const text='x'.repeat(1000),edits=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({start:999-i,end:1000-i,insert:'abc'}))),out=applyEdits(text,edits);return [out.ok&&out.text==='abc'.repeat(1000),edits[0].start,edits[999].start];})()", expected: [true, 999, 0] },

      { call: 'applyEdits("abcdefgh", [{ start: 6, end: 7, insert: "" }, { start: 4, end: 7, insert: "" }, { start: 0, end: 1, insert: "" }])', expected: { ok: false, reason: 'overlap', edits: [1, 0] } },
      { call: 'applyEdits("abcdef", [{ start: 1, end: 1, insert: "x" }, { start: 3, end: 4, insert: "y" }, { start: 1, end: 2, insert: "z" }])', expected: { ok: false, reason: 'overlap', edits: [0, 2] } },
      { call: '[applyEdits("abc", [{ start: 2, end: 1, insert: "" }]), applyEdits("abc", [{ start: -1, end: 0, insert: "" }])]', expected: [{ ok: false, reason: 'out-of-range', edit: 0 }, { ok: false, reason: 'out-of-range', edit: 0 }] },
      { call: 'applyEdits("abc", [{ start: 3, end: 3, insert: "!" }, { start: 0, end: 0, insert: "¡" }])', expected: { ok: true, text: '¡abc!' } },
      { call: '(() => { const edits = [{ start: 2, end: 3, insert: "c" }, { start: 0, end: 1, insert: "z" }]; applyEdits("a+b", edits); return edits.map((edit) => edit.start); })()', expected: [2, 0] },
      { call: 'applyEdits("abc", [{ start: 0, end: 2, insert: "" }, { start: 1, end: 2, insert: "" }, { start: 0, end: 5, insert: "" }])', expected: { ok: false, reason: 'out-of-range', edit: 2 } },
      { call: '(() => { const text = "a".repeat(200); const edits = Array.from({ length: 200 }, (_, i) => ({ start: 199 - i, end: 200 - i, insert: "b" })); const result = applyEdits(text, edits); return result.ok && result.text === "b".repeat(200); })()', expected: true },
      { call: 'applyEdits("one two", [{ start: 3, end: 3, insert: "," }, { start: 0, end: 3, insert: "1" }])', expected: { ok: true, text: '1, two' } },
      { call: 'applyEdits("abc", [{ start: 5, end: 6, insert: "" }, { start: 4, end: 9, insert: "" }])', expected: { ok: false, reason: 'out-of-range', edit: 0 } },
    ],
    hiddenTypeTests: [
      { code: 'applyEdits("a", [{ start: "0", end: 1, insert: "" }]);', rejects: true },
      { code: 'const __edits: readonly Edit[] = [{ start: 0, end: 0, insert: "x" }]; applyEdits("a", __edits);' },
    ],
  },
};
