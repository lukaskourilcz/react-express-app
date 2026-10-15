// Server-only reference solutions and hidden tests for lib/coding/tasks/easy-typescript-b.ts.
// Never import from client code. The hidden tests aim at the shortcut each
// visible set leaves open: a hard-coded answer, a changed input, a value or a
// shape the visible tests never used, and the case the technique exists for.

import type { CodingSolution } from '../types';

export const EASY_TYPESCRIPT_B_SOLUTIONS: Record<string, CodingSolution> = {
  /* ── utility types ────────────────────────────────────────────────── */
  'ts-easy3-save-a-new-todo': {
    solution: "interface Todo {\n  id: number;\n  title: string;\n  done: boolean;\n}\n\n// Omit removes id from the view; it does not strip wider objects at runtime.\ntype NewTodo = Omit<Todo, \"id\">;\n\nconst addTodo = (todos: readonly Todo[], draft: NewTodo): Todo[] => {\n  // Starting from 0 means an empty list hands out id 1.\n  const id = Math.max(0, ...todos.map((todo) => todo.id)) + 1;\n  // A new array, so the list passed in keeps its length.\n  return [...todos, { ...draft, id }];\n};",
    junior: "interface Todo {\n  id: number;\n  title: string;\n  done: boolean;\n}\n\ntype NewTodo = Omit<Todo, \"id\">;\n\nconst addTodo = (todos: readonly Todo[], draft: NewTodo): Todo[] => {\n  let highest = 0;\n  for (const todo of todos) {\n    if (todo.id > highest) {\n      highest = todo.id;\n    }\n  }\n  const todo: Todo = { ...draft, id: highest + 1 };\n  const next: Todo[] = [...todos];\n  next.push(todo);\n  return next;\n};",
    senior: "interface Todo {\n  id: number;\n  title: string;\n  done: boolean;\n}\n\ntype NewTodo = Omit<Todo, \"id\">;\n\nconst nextId = (todos: readonly Todo[]): number =>\n  todos.reduce((highest, todo) => Math.max(highest, todo.id), 0) + 1;\n\nconst addTodo = (todos: readonly Todo[], draft: NewTodo): Todo[] => [\n  ...todos,\n  { ...draft, id: nextId(todos) },\n];",
    hiddenTests: [
      { call: "(()=>{const sym=Symbol('meta'),meta={},draft=Object.freeze({id:999,title:'',done:false,extra:meta,[sym]:meta,['__proto__']:meta}),old=Object.freeze({id:7,title:'old',done:true}),input=Object.freeze([old]),a=addTodo(input,draft),b=addTodo(input,draft);a[1].title='later';a.push(old);return [a!==input,a!==b,a[0]===old,b[0]===old,b[1]!==draft,b[1]!==a[1],b[1].id,b[1].extra===meta,b[1][sym]===meta,Object.hasOwn(b[1],'__proto__'),b[1].__proto__===meta,Object.getPrototypeOf(b[1])===Object.prototype,b[1].title,draft.id,input.length];})()", expected: [true, true, true, true, true, true, 8, true, true, true, true, true, "", 999, 1] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({id:i%2?1:1000000000,title:String(i),done:false}))),draft=Object.freeze(Object.assign(Object.create(null),{title:'new',done:true})),out=addTodo(input,draft);return [out.length,out.slice(0,1000).every((todo,i)=>todo===input[i]),out[1000].id,input[0].id,Reflect.ownKeys(draft)];})()", expected: [1001, true, 1000000001, 1000000000, ["title", "done"]] },
      { call: "(()=>{const meta={},draft={title:'new',done:false};for(let i=0;i<100;i++)draft['x'+i]=meta;Object.freeze(draft);const a=addTodo([],draft),b=addTodo([],draft);return [a!==b,a[0]!==b[0],a[0].id,Reflect.ownKeys(a[0]).length,Array.from({length:100},(_,i)=>a[0]['x'+i]===meta).every(Boolean),!Object.hasOwn(draft,'id')];})()", expected: [true, true, 1, 103, true, true] },

      { call: 'addTodo(Object.freeze([{ id: 2, title: "x", done: false }]), { title: "y", done: true })', expected: [{ id: 2, title: 'x', done: false }, { id: 3, title: 'y', done: true }] },
      { call: 'addTodo([{ id: 10, title: "a", done: false }, { id: 11, title: "b", done: false }, { id: 4, title: "c", done: false }], { title: "d", done: false })[3]', expected: { id: 12, title: 'd', done: false } },
      { call: '(() => { const draft = { title: "z", done: false }; addTodo([], draft); return draft; })()', expected: { title: 'z', done: false } },
      { call: 'addTodo([{ id: 1, title: "a", done: false }], { title: "a", done: false }).length', expected: 2 },
    ],
    hiddenTypeTests: [
      {"code": "const __auditWide={id:999,title:\"x\",done:false}; const __auditDraft:NewTodo=__auditWide; const __auditSource:readonly Todo[]=[]; const __auditOut:Todo[]=addTodo(__auditSource,__auditDraft); __auditOut.push({id:1,title:\"y\",done:true});"},

      { code: 'const __n: NewTodo = { title: "a", done: false, id: 1 };', label: 'NewTodo has no id', rejects: true },
    ],
  },
  'ts-easy3-only-the-clicks': {
    solution: "type UiEvent =\n  | { kind: \"click\"; x: number; y: number }\n  | { kind: \"key\"; key: string };\n\n// Extract keeps the union members that fit the shape: here, only the click.\ntype Click = Extract<UiEvent, { kind: \"click\" }>;\n\nconst clicks = (events: readonly UiEvent[]): Click[] =>\n  // This explicit predicate types the filtered array as Click[].\n  events.filter((event): event is Click => event.kind === \"click\");",
    junior: "type UiEvent =\n  | { kind: \"click\"; x: number; y: number }\n  | { kind: \"key\"; key: string };\n\ntype Click = Extract<UiEvent, { kind: \"click\" }>;\n\nconst clicks = (events: readonly UiEvent[]): Click[] => {\n  return events.filter((event): event is Click => {\n    return event.kind === \"click\";\n  });\n};",
    senior: `type UiEvent =
  | { kind: "click"; x: number; y: number }
  | { kind: "key"; key: string };

type Click = Extract<UiEvent, { kind: "click" }>;

const isClick = (event: UiEvent): event is Click => event.kind === "click";

const clicks = (events: readonly UiEvent[]): Click[] => events.filter(isClick);`,
    hiddenTypeTests: [{"code": "const __auditInput: readonly UiEvent[]=[{kind:\"click\",x:1,y:2}]; const __auditOutput:Click[]=clicks(__auditInput); __auditOutput.push({kind:\"click\",x:0,y:0}); const __auditKind:\"click\"=__auditOutput[0].kind;"}],
    hiddenTests: [
      { call: "(()=>{const meta={},a=Object.freeze({kind:'click',x:-0,y:NaN,meta}),key=Object.freeze({kind:'key',key:'Enter'}),input=Object.freeze([a,key,a]),out=clicks(input),again=clicks(input);out.pop();return [again[0]===a,again[1]===a,again[0].meta===meta,Object.is(again[0].x,-0),Number.isNaN(again[0].y),out!==input,out!==again,input.length,again.length];})()", expected: [true, true, true, true, true, true, true, 3, 2] },
      { call: "(()=>{const a=Object.freeze(Object.assign(Object.create({kind:'click'}),{x:Infinity,y:-Infinity})),input=Object.freeze([a]),out=clicks(input),none=Object.freeze([{kind:'key',key:''}]),empty=clicks(none),again=clicks(none);empty.push(a);return [out[0]===a,out[0].x===Infinity,out[0].y===-Infinity,empty!==again,again.length,none.length,clicks([])!==clicks([])];})()", expected: [true, true, true, true, 0, 1, true] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze(i%2?{kind:'key',key:String(i)}:{kind:'click',x:i,y:0}))),out=clicks(input);return [out.length,out.every((event,i)=>event===input[2*i]),input.length];})()", expected: [500, true, 1000] },

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
      { call: "(()=>{return [isComplete({name:'',email:' ',phone:'\\t'}),isComplete({name:'',email:'0',phone:'0'}),isComplete({name:'x',email:'\u00e9',phone:'\ud83d\ude00'}),isComplete({name:'x',email:'',phone:' '})];})()", expected: [true, true, true, false] },
      { call: "(()=>{const meta={},profile=Object.freeze(Object.assign(Object.create({email:' ',phone:'0'}),{name:'',meta})),empty=Object.freeze(Object.assign(Object.create(null),{name:'x',email:undefined,phone:'p'}));return [isComplete(profile),isComplete(profile),profile.meta===meta,Reflect.ownKeys(profile),isComplete(empty),empty.email===undefined];})()", expected: [true, true, true, ["name", "meta"], false, true] },
      { call: "(()=>{const values=[undefined,'',' ','0','\u00e9'];return values.map(email=>values.map(phone=>{const p=Object.freeze({name:'x',email,phone});return isComplete(p)===(email!==undefined&&email!==''&&phone!==undefined&&phone!=='');})).every(row=>row.every(Boolean));})()", expected: true },

      { call: 'isComplete({ name: "Bo", phone: "555 0101" })', expected: false },
      { call: 'isComplete({ name: "Bo", email: "bo@example.com", phone: "" })', expected: false },
      { call: 'isComplete({ name: "Cy", email: "cy@example.com", phone: "0" })', expected: true },
      { call: '[{ name: "A", email: "a@example.com", phone: "1" }, { name: "B" }, { name: "C", email: "c@example.com", phone: "3" }].filter(isComplete).map((p) => p.name)', expected: ['A', 'C'] },
    ],
    hiddenTypeTests: [
      {"code": "const __audit:Profile={name:\"x\"}; if(isComplete(__audit)){const __phone:string=__audit.phone; const __full:Required<Profile>=__audit;}"},

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
    junior: "const parseLine = (line: string) => {\n  const [name, qty, cents] = line.split(\",\");\n  return { name, qty: Number(qty), cents: Number(cents) };\n};\n\ntype Line = ReturnType<typeof parseLine>;\n\nconst orderTotal = (lines: readonly Line[]): number => {\n  return lines.reduce((total, line) => {\n    const cost = line.qty * line.cents;\n    return total + cost;\n  }, 0);\n};",
    senior: `const parseLine = (line: string) => {
  const [name, qty, cents] = line.split(",");
  return { name, qty: Number(qty), cents: Number(cents) };
};

type Line = ReturnType<typeof parseLine>;

const lineCost = ({ qty, cents }: Line): number => qty * cents;

const orderTotal = (lines: readonly Line[]): number =>
  lines.reduce((total, line) => total + lineCost(line), 0);`,
    hiddenTests: [
      { call: "(()=>{const meta={},a=Object.freeze({name:' x ',qty:2,cents:125,meta}),b=Object.freeze({name:'',qty:0,cents:99,meta}),input=Object.freeze([a,b,a]),first=orderTotal(input),second=orderTotal(input);return [first,second,input[0]===a,a.qty,a.cents,b.qty,a.meta===meta];})()", expected: [500, 500, true, 2, 125, 0, true] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},()=>Object.freeze({name:'x',qty:1000000,cents:1000000})));return [orderTotal(input),input[0].qty,input.length,Number.isSafeInteger(orderTotal(input))];})()", expected: [1000000000000000, 1000000, 1000, true] },
      { call: "(()=>{return [Object.is(orderTotal([]),0),Object.is(orderTotal([{name:'x',qty:0,cents:0}]),0),orderTotal([parseLine('tea,0002,000350')])];})()", expected: [true, true, 700] },

      { call: 'orderTotal([parseLine("a,1,1"), parseLine("b,2,2"), parseLine("c,3,3")])', expected: 14 },
      { call: 'orderTotal([parseLine("gift,5,0")])', expected: 0 },
      { call: 'orderTotal(Object.freeze([parseLine("x,10,99")]))', expected: 990 },
    ],
    hiddenTypeTests: [
      {"code": "const __auditInput:readonly Line[]=[parseLine(\"x,1,2\")]; const __auditTotal:number=orderTotal(__auditInput);"},

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
    junior: "const latest = <T extends { id: string; version: number }>(records: readonly T[]): T[] => {\n  const byId = new Map<string, T>();\n  for (const record of records) {\n    const previous = byId.get(record.id);\n    if (previous === undefined) {\n      byId.set(record.id, record);\n    } else if (record.version > previous.version) {\n      byId.set(record.id, record);\n    }\n  }\n  return Array.from(byId.values());\n};",
    senior: "const latest = <T extends { readonly id: string; readonly version: number }>(records: readonly T[]): T[] => {\n  const byId = new Map<string, T>();\n  for (const record of records) {\n    const previous = byId.get(record.id);\n    if (previous === undefined || record.version > previous.version) byId.set(record.id, record);\n  }\n  return [...byId.values()];\n};",
    hiddenTypeTests: [{"code": "const __auditInput: readonly {id:string;version:number;payload:symbol}[] = [{id:\"a\",version:0,payload:Symbol()}]; const __auditSymbol: symbol = latest(__auditInput)[0].payload;"}],
    hiddenTests: [
      { call: "(()=>{const records=Object.freeze(['constructor','__proto__','','2','1','toString'].map(id=>Object.freeze({id,version:0}))),out=latest(records);return [out.map(x=>x.id),out.every((x,i)=>x===records[i]),records.length];})()", expected: [["constructor", "__proto__", "", "2", "1", "toString"], true, 6] },
      { call: "(()=>{const old=Object.freeze({id:'a',version:1}),winner=Object.freeze({id:'a',version:3,meta:{}}),tie=Object.freeze({id:'a',version:3}),other=Object.freeze({id:'b',version:2}),input=Object.freeze([old,other,winner,tie]),a=latest(input),b=latest(input);a.pop();return [a!==b,b[0]===winner,b[1]===other,b[0].meta===winner.meta,input[0]===old,input.length];})()", expected: [true, true, true, true, true, 4] },
      { call: "(()=>{const records=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({id:'k'+i%10,version:i}))),out=latest(records);return [out.length,out.every((record,i)=>record===records[990+i]),records[0].version,latest([])!==latest([])];})()", expected: [10, true, 0, true] },
      { call: "latest([{id:' x ',version:1000000000},{id:'x',version:0},{id:' x ',version:999999999}]).map(x=>[x.id,x.version])", expected: [[" x ", 1000000000], ["x", 0]] },

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
    senior: "const replaceById = <T extends { readonly id: number }>(items: readonly T[], edited: T): T[] =>\n  items.map((item) => item.id === edited.id ? edited : item);",
    hiddenTypeTests: [{"code": "const __auditInput: readonly {id:number;payload:symbol}[] = [{id:1,payload:Symbol()}]; const __auditSymbol: symbol = replaceById(__auditInput,{id:1,payload:Symbol()})[0].payload;"}],
    hiddenTests: [
      { call: "(()=>{const a=Object.freeze({id:0}),b=Object.freeze({id:1}),c=Object.freeze({id:-0}),edited=Object.freeze({id:0}),input=Object.freeze([a,b,c]),out=replaceById(input,edited);return [out[0]===edited,out[1]===b,out[2]===edited,input[0]===a,input[2]===c];})()", expected: [true, true, true, true, true] },
      { call: "(()=>{const meta={},record=Object.freeze({id:-1,meta}),edited=Object.freeze({id:9,meta}),input=Object.freeze([record]),a=replaceById(input,edited),b=replaceById(input,edited);a.push(edited);return [a!==input,a!==b,b[0]===record,b[0].meta===meta,b.length,input.length,replaceById([],edited)!==replaceById([],edited)];})()", expected: [true, true, true, true, 1, 1, true] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({id:i%2,n:i}))),edited=Object.freeze({id:0,n:-1}),out=replaceById(input,edited);return [out.length,out.every((item,i)=>i%2?item===input[i]:item===edited),input[0].n,input[998].n];})()", expected: [1000, true, 0, 998] },

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
    senior: "function legs(stops: readonly string[]): [string, string][] {\n  const pairs: [string, string][] = [];\n  for (let from = 0; from + 1 < stops.length; from += 1) {\n    pairs.push([stops[from], stops[from + 1]]);\n  }\n  return pairs;\n}",
    hiddenTypeTests: [{"code": "const __auditLegs: [string,string][] = legs(['','x'] as const);"}],
    hiddenTests: [
      { call: "legs(Object.freeze(['',' B ','','\ud83e\udd88']))", expected: [["", " B "], [" B ", ""], ["", "\ud83e\udd88"]] },
      { call: "(()=>{const input=Object.freeze(['a','a','a']),a=legs(input),b=legs(input);a[0][1]='changed';a.push(['x','y']);return [a!==b,b[0]!==b[1],b[0]!==a[0],b,input.join(',')];})()", expected: [true, true, true, [["a", "a"], ["a", "a"]], "a,a,a"] },
      { call: "(()=>{const a=legs([]),b=legs(['']);a.push(['x','y']);return [a!==legs([]),b!==legs(['']),b.length,a.length];})()", expected: [true, true, 0, 1] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>String(i))),out=legs(input);return [out.length,out[0],out[998],new Set(out).size,input.length];})()", expected: [999, ["0", "1"], ["998", "999"], 999, 1000] },

      { call: 'legs(["a", "b", "c", "d"]).length', expected: 3 },
      { call: 'legs(["x", "y", "z", "w"])[2]', expected: ['z', 'w'] },
      { call: 'legs(Object.freeze(["p", "q"]))', expected: [['p', 'q']] },
    ],
  },
  'ts-easy3-every-nth': {
    solution: "const everyNth = <T>(items: readonly T[], step: number): T[] => {\n  const picked: T[] = [];\n  // Below 1, i += step would never move forward.\n  if (step < 1) return picked;\n  // Position step, counting from 1, is index step - 1; each step jumps step places.\n  for (let i = step - 1; i < items.length; i += step) {\n    picked.push(items[i]);\n  }\n  return picked;\n};",
    junior: "const everyNth = <T>(items: readonly T[], step: number): T[] => {\n  const result: T[] = [];\n  if (step < 1) return result;\n  for (let index = step - 1; index < items.length; index += step) {\n    result.push(items[index]);\n  }\n  return result;\n};",
    senior: "const everyNth = <T>(items: readonly T[], step: number): T[] => {\n  const result: T[] = [];\n  if (step < 1) return result;\n  for (let index = step - 1; index < items.length; index += step) result.push(items[index]);\n  return result;\n};",
    hiddenTypeTests: [{"code": "const __auditInput: readonly (null | undefined)[] = [null,undefined]; const __auditOut: (null | undefined)[] = everyNth(__auditInput,1);"}],
    hiddenTests: [
      { call: "(()=>{const object=Object.freeze({}),fn=()=>{throw Error('called');},symbol=Symbol('x'),input=Object.freeze([0,object,null,fn,undefined,symbol]),out=everyNth(input,2);out.push('later');return [out[0]===object,out[1]===fn,out[2]===symbol,out.length,input.length,everyNth(input,1)!==input];})()", expected: [true, true, true, 4, 6, true] },
      { call: "(()=>{const input=Object.freeze([undefined,null]),a=everyNth(input,1),b=everyNth(input,1);return [a!==b,a.length,a[0]===undefined,a[1]===null,everyNth(input,-1000000000),everyNth(input,1000000000),everyNth([],0)!==everyNth([],0)];})()", expected: [true, 2, true, true, [], [], true] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>i)),out=everyNth(input,333);return [out,input.length,input[0]];})()", expected: [[332, 665, 998], 1000, 0] },

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
    hiddenTypeTests: [{"code": "settingOr({fontSize:null},\"fontSize\");", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{const saved=Object.freeze({fontSize:undefined,theme:'dark',sounds:false}),before=Reflect.ownKeys(saved);const values=[settingOr(saved,'fontSize'),settingOr(saved,'theme'),settingOr(saved,'sounds')];return [values,Reflect.ownKeys(saved),before,saved.fontSize===undefined,DEFAULTS.theme,DEFAULTS.fontSize,DEFAULTS.sounds];})()", expected: [[16, "dark", false], ["fontSize", "theme", "sounds"], ["fontSize", "theme", "sounds"], true, "light", 16, true] },
      { call: "(()=>{const saved=Object.freeze(Object.create({fontSize:-0,sounds:false})),empty=Object.freeze(Object.create(null));return [Object.is(settingOr(saved,'fontSize'),-0),settingOr(saved,'sounds'),settingOr(empty,'theme'),settingOr(empty,'fontSize'),settingOr(empty,'sounds'),Reflect.ownKeys(saved).length,Reflect.ownKeys(empty).length];})()", expected: [true, false, "light", 16, true, 0, 0] },
      { call: "(()=>{const meta={valueOf(){throw 'opaque'}},saved={fontSize:-0.5};for(let i=0;i<100;i++)saved['x'+i]=meta;Object.freeze(saved);const values=[settingOr(saved,'sounds'),settingOr(saved,'fontSize'),settingOr(saved,'theme')];return [values,Reflect.ownKeys(saved).length,saved.x99===meta,!Object.hasOwn(saved,'sounds'),!Object.hasOwn(saved,'theme')];})()", expected: [[true, -0.5, "light"], 101, true, true, true] },

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
    senior: "interface Product {\n  name: string;\n  price: number;\n  inStock: boolean;\n}\n\nfunction setField<K extends keyof Product>(product: Readonly<Product>, key: K, value: Product[K]): Product {\n  return { ...product, [key]: value };\n}",
    hiddenTests: [
      { call: "(()=>{const s=Symbol('meta'),meta={},proto={inherited:9},p=Object.create(proto);Object.assign(p,{name:'Mug',price:-0,inStock:false});Object.defineProperty(p,'__proto__',{value:meta,enumerable:true});p[s]=meta;p.extra=meta;Object.freeze(p);const out=setField(p,'price',-0);return [out!==p,Object.getPrototypeOf(out)===Object.prototype,Object.hasOwn(out,'__proto__'),out.__proto__===meta,out[s]===meta,out.extra===meta,!Object.hasOwn(out,'inherited'),Object.is(out.price,-0),Object.is(p.price,-0)];})()", expected: [true, true, true, true, true, true, true, true, true] },
      { call: "(()=>{const p=Object.freeze(Object.assign(Object.create(null),{name:'',price:-0.5,inStock:false})),a=setField(p,'name',''),b=setField(p,'inStock',true);a.name='later';return [a!==b,b.name,p.name,b.price,b.inStock,p.inStock,Object.getPrototypeOf(b)===Object.prototype];})()", expected: [true, "", "", -0.5, true, false, true] },
      { call: "(()=>{const meta={},p={name:'x',price:1,inStock:true};for(let i=0;i<100;i++)p['x'+i]=meta;Object.freeze(p);const out=setField(p,'price',1000000000);return [Reflect.ownKeys(out).length,Array.from({length:100},(_,i)=>out['x'+i]===meta).every(Boolean),p.price,out.price];})()", expected: [103, true, 1, 1000000000] },

      { call: '(() => { const p = { name: "a", price: 1, inStock: true }; return setField(p, "name", "b") !== p; })()', expected: true },
      { call: 'Object.keys(setField({ name: "a", price: 1, inStock: true }, "name", "z"))', expected: ['name', 'price', 'inStock'] },
      { call: 'setField(setField({ name: "a", price: 1, inStock: true }, "price", 5), "name", "z")', expected: { name: 'z', price: 5, inStock: true } },
      { call: 'setField({ name: "a", price: 1, inStock: true }, "price", 0)', expected: { name: 'a', price: 0, inStock: true } },
    ],
    hiddenTypeTests: [
      {"code": "setField({name:\"x\",price:1,inStock:true},\"inStock\",\"false\");", "rejects": true},

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
    hiddenTypeTests: [{"code": "const __auditPinned = pinToTop([\"a\",\"b\"] as const,\"a\"); __auditPinned.push(\"c\");"}],
    hiddenTests: [
      { call: "pinToTop(Object.freeze(['','a','','b','a','']), '')", expected: ["", "a", "b", "a"] },
      { call: "[pinToTop(['A','a',' A ','a'],'a'),pinToTop(['A','a'],' A ')]", expected: [["a", "A", " A "], ["A", "a"]] },
      { call: "(()=>{const input=Object.freeze(['a','b']),a=pinToTop(input,'a'),b=pinToTop(input,'x'),empty=pinToTop(Object.freeze([]),'');a.push('c');b[0]='changed';return [a!==input,b!==input,empty!==pinToTop([],''),input.join(','),a.length,b.length,empty.length];})()", expected: [true, true, true, "a,b", 3, 2, 0] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>i%2?'other':'pin')),out=pinToTop(input,'pin');return [out.length,out[0],out.slice(1).every(x=>x==='other'),input.length];})()", expected: [501, "pin", true, 1000] },

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
    junior: "interface Address {\n  street: string;\n  city: string;\n}\n\ninterface User {\n  name: string;\n  address: Address;\n}\n\nconst moveTo = (user: User, city: string): User => {\n  const address: Address = { ...user.address, city };\n  const moved: User = { ...user, address };\n  return moved;\n};",
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
      { call: "(()=>{const nested=Object.freeze({x:1}),key=Symbol('meta'),address=Object.assign(Object.create(null),{street:' s ',city:' old ',zone:nested}),user=Object.assign(Object.create(null),{name:'',address,prefs:nested});user[key]=nested;Object.defineProperty(address,'__proto__',{value:nested,enumerable:true});Object.freeze(address);Object.freeze(user);const a=moveTo(user,' new '),b=moveTo(user,' new ');a.name='changed';return [a!==user,a!==b,a.address!==address,a.address!==b.address,b.name,b.address.street,b.address.city,b.prefs===nested,b[key]===nested,b.address.zone===nested,Object.hasOwn(b.address,'__proto__'),b.address.__proto__===nested,Object.getPrototypeOf(b.address)===Object.prototype,user.name,address.city];})()", expected: [true, true, true, true, "", " s ", " new ", true, true, true, true, true, true, "", " old "] },
      { call: "(()=>{const user=Object.freeze({name:'\ud83e\udd88',address:Object.freeze({street:'',city:'same'})}),a=moveTo(user,'same');a.address.street='new';return [a!==user,a.address!==user.address,user.address.street,a.address.city];})()", expected: [true, true, "", "same"] },
      { call: "(()=>{const address={street:'s',city:'c'},user={name:'a',address};for(let i=0;i<100;i++){address['a'+i]=i;user['u'+i]=i;}Object.freeze(address);Object.freeze(user);const out=moveTo(user,'z');return [out.u99,out.address.a99,Object.keys(out).length,Object.keys(out.address).length,out.address.city,address.city];})()", expected: [99, 99, 102, 102, "z", "c"] },

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
    hiddenTypeTests: [{"code": "const __auditBad: [number,string][] = ranked({a:1});", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{const scores=Object.assign(Object.create({inherited:999}),{b:2,a:2});Object.defineProperty(scores,'hidden',{value:1000,enumerable:false});scores[Symbol('meta')]=1001;Object.freeze(scores);return ranked(scores);})()", expected: [["b", 2], ["a", 2]] },
      { call: "(()=>{const scores=Object.create(null);scores.z=5;scores['10']=5;scores['2']=5;scores.__proto__=5;return ranked(Object.freeze(scores)).map(([name])=>name);})()", expected: ["2", "10", "z", "__proto__"] },
      { call: "(()=>{const input=Object.freeze({a:-0,b:0}),a=ranked(input),b=ranked(input);a[0][1]=99;a.push(['later',1]);return [a!==b,a[0]!==b[0],a[0]!==a[1],b.length,Object.is(b[0][1],-0),Object.is(input.a,-0),ranked({})!==ranked({})];})()", expected: [true, true, true, 2, true, true, true] },
      { call: "(()=>{const scores=Object.fromEntries(Array.from({length:1000},(_,i)=>['p'+i,i%2]));Object.freeze(scores);const out=ranked(scores);return [out.length,out[0][0],out[499][0],out[500][0],out[999][0],scores.p0];})()", expected: [1000, "p1", "p999", "p0", "p998", 0] },

      { call: 'ranked({ a: 10, b: 9, c: 100, d: 2 }).map(([name]) => name)', expected: ['c', 'a', 'b', 'd'] },
      { call: 'ranked({ x: -1, y: 1 })', expected: [['y', 1], ['x', -1]] },
      { call: '(() => { const scores = { a: 1, b: 2 }; ranked(scores); return Object.keys(scores); })()', expected: ['a', 'b'] },
      { call: 'ranked({ a: 3, b: 3, c: 3, d: 3, e: 3, f: 3, g: 3, h: 3 }).map(([name]) => name)', expected: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
      { call: 'ranked({ Zed: 4, Amy: 4, Kit: 9 })', expected: [['Kit', 9], ['Zed', 4], ['Amy', 4]] },
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
    // 0 for equal lower-case keys keeps their input order.
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
      { call: "sortTitles(Object.freeze(['Z',' z','a',' A ','',' ']))", expected: ["", " ", " A ", " z", "a", "Z"] },
      { call: "sortTitles(['\ud83e\udd88','\u00e9','\u00e4','Zebra','\u00c4','a','\ud800'])", expected: ["a", "Zebra", "\u00e4", "\u00c4", "\u00e9", "\ud800", "\ud83e\udd88"] },
      { call: "sortTitles(['\u0130','i','I','e\u0301','\u00e9'])", expected: ["e\u0301", "i", "I", "\u0130", "\u00e9"] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>['B','b','A','a'][i%4])),out=sortTitles(input),empty=sortTitles([]),single=Object.freeze(['x']),one=sortTitles(single);one.push('y');return [out.length,out.every((x,i)=>i<500?x===(i%2?'a':'A'):x===(i%2?'b':'B')),input[0],out!==input,empty!==sortTitles([]),one!==single,one.length];})()", expected: [1000, true, "B", true, true, true, 2] },

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
    senior: "function retryDelays(first: number, cap: number): readonly number[] {\n  const delays: number[] = [];\n  if (first <= 0) return Object.freeze(delays);\n  let wait = first;\n  while (wait <= cap) {\n    delays.push(wait);\n    wait *= 2;\n  }\n  return Object.freeze(delays);\n}",
    hiddenTypeTests: [{"code": "const __auditMutable: number[] = retryDelays(1,8);", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{const a=retryDelays(1,8),b=retryDelays(5,5),c=retryDelays(0,100);return [Array.isArray(a),a,b,c];})()", expected: [true, [1, 2, 4, 8], [5], []] },
      { call: "(()=>{const result=retryDelays(1,1000000000);return [result.length,result[0],result[result.length-1],result.every((x,i)=>x===2**i)];})()", expected: [30, 1, 536870912, true] },
      { call: "[retryDelays(1,-1),retryDelays(-1,-1),retryDelays(1000000000,1000000000),retryDelays(1000000000,999999999)]", expected: [[], [], [1000000000], []] },

      { call: 'retryDelays(1, 10)', expected: [1, 2, 4, 8] },
      { call: 'retryDelays(5, 5)', expected: [5] },
      { call: 'retryDelays(-10, 100)', expected: [] },
      { call: 'retryDelays(300, 299)', expected: [] },
    ],
  },
  'ts-easy3-read-headers': {
    solution: "const readHeaders = (lines: readonly string[]): Partial<Record<string, string>> => {\n  const headers = Object.create(null) as Partial<Record<string, string>>;\n  let i = 0;\n  while (i < lines.length && lines[i] !== \"\") {\n    const line = lines[i];\n    const at = line.indexOf(\": \");\n    headers[line.slice(0, at).toLowerCase()] = line.slice(at + 2);\n    i += 1;\n  }\n  return headers;\n};",
    junior: "const readHeaders = (lines: readonly string[]): Partial<Record<string, string>> => {\n  const headers = Object.create(null) as Partial<Record<string, string>>;\n  let i = 0;\n  while (i < lines.length) {\n    const line = lines[i];\n    if (line === \"\") break;\n    const at = line.indexOf(\": \");\n    const name = line.slice(0, at).toLowerCase();\n    const value = line.slice(at + 2);\n    headers[name] = value;\n    i += 1;\n  }\n  return headers;\n};",
    senior: "const readHeaders = (lines: readonly string[]): Partial<Record<string, string>> => {\n  const end = lines.indexOf(\"\");\n  const block = end === -1 ? lines : lines.slice(0, end);\n  return Object.assign(Object.create(null), Object.fromEntries(\n    block.map((line) => {\n      const at = line.indexOf(\": \");\n      return [line.slice(0, at).toLowerCase(), line.slice(at + 2)];\n    }),\n  ));\n};",
    hiddenTypeTests: [{"code": "const __auditLookup=(key:string):string|undefined=>readHeaders([])[key]; const __auditInput:readonly string[]=[\"A: 1\"]; readHeaders(__auditInput);"}],
    hiddenTests: [
      { call: "(()=>{const lines=Object.freeze(['__proto__: p','CONSTRUCTOR: c','Host: first','host:  last: value  ','Empty: ','']);const out=readHeaders(lines),none=readHeaders([]);return [Object.hasOwn(out,'__proto__'),out.__proto__,Object.hasOwn(out,'constructor'),out.constructor,out.host,out.empty,none.constructor===undefined,none.toString===undefined,Reflect.ownKeys(none).length];})()", expected: [true, "p", true, "c", " last: value  ", "", true, true, 0] },
      { call: "(()=>{let reads=0;const lines=['A: 1',''];Object.defineProperty(lines,2,{get(){reads++;throw 'body'},enumerable:true});Object.freeze(lines);const a=readHeaders(lines),b=readHeaders(lines);a.a='changed';return [reads,a!==b,b.a,lines[0],lines.length];})()", expected: [0, true, "1", "A: 1", 3] },
      { call: "(()=>{const a=readHeaders(Object.freeze([''])),b=readHeaders([]);a.new='later';return [a!==b,Reflect.ownKeys(b).length,readHeaders(['A: ','a: 0']).a];})()", expected: [true, 0, "0"] },
      { call: "(()=>{const lines=Object.freeze(Array.from({length:1000},(_,i)=>'X-'+i+': '+i)),out=readHeaders(lines);return [Object.keys(out).length,out['x-999'],lines[0],lines.length];})()", expected: [1000, "999", "X-0: 0", 1000] },

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
    junior: "const passed = (scores: Record<string, number>, mark: number): string[] => {\n  const names: string[] = [];\n  for (const [name, score] of Object.entries(scores)) {\n    if (score >= mark) names.push(name);\n  }\n  return names;\n};",
    senior: `const passed = (scores: Readonly<Record<string, number>>, mark: number): string[] =>
  Object.entries(scores)
    .filter(([, score]) => score >= mark)
    .map(([name]) => name);`,
    hiddenTypeTests: [{"code": "const __auditScores:Readonly<Record<string,number>>={a:1}; const __auditNames:string[]=passed(__auditScores,1);"}],
    hiddenTests: [
      { call: "(()=>{const sym=Symbol('ignore'),scores=Object.create({inherited:100});scores['10']=9;scores['2']=7;scores.z=3;scores.a=2;scores[sym]=100;Object.defineProperty(scores,'hidden',{value:100,enumerable:false});Object.freeze(scores);return [passed(scores,2),scores.z,Object.getOwnPropertySymbols(scores).length];})()", expected: [["2", "10", "z", "a"], 3, 1] },
      { call: "(()=>{const scores=Object.freeze(Object.assign(Object.create(null),{' x ':-0,x:0.5,X:-0.25})),a=passed(scores,0),b=passed(scores,0);a.push('changed');const empty=passed({},0),again=passed({},0);empty.push('x');return [b,a!==b,empty!==again,again.length,Object.is(scores[' x '],-0)];})()", expected: [[" x ", "x"], true, true, 0, true] },
      { call: "(()=>{const scores=Object.freeze(Object.fromEntries(Array.from({length:1000},(_,i)=>['p'+i,i-500]))),out=passed(scores,0);return [out.length,out[0],out[499],Object.keys(scores).length];})()", expected: [500, "p500", "p999", 1000] },

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
    junior: "interface Order {\n  id: number;\n  customer: { name: string; email: string };\n  items: string[];\n}\nconst orderLine = ({ id, customer: { name }, items }: Order): string => {\n  let word = \"items\";\n  if (items.length === 1) word = \"item\";\n  return `#${id} ${name}, ${items.length} ${word}`;\n};",
    senior: "interface Order {\n  id: number;\n  customer: { name: string; email: string };\n  items: string[];\n}\n\nconst counted = (count: number, word: string): string => `${count} ${word}${count === 1 ? \"\" : \"s\"}`;\n\nconst orderLine = ({ id, customer: { name }, items }: Order): string =>\n  `#${id} ${name}, ${counted(items.length, \"item\")}`;",
    hiddenTypeTests: [{"code": "orderLine({id:1,customer:{name:\"a\",email:\"e\"},items:[1]});", "rejects": true}],
    hiddenTests: [
      { call: "[orderLine({id:1,customer:{name:' Ada ',email:'private@example.test'},items:['','x']}),orderLine({id:0,customer:{name:'',email:''},items:[]})]", expected: ["#1  Ada , 2 items", "#0 , 0 items"] },
      { call: "(()=>{const items=Array(5);items[2]='';Object.freeze(items);const customer=Object.freeze({name:'\ud83e\udd88',email:'do-not-print'}),order=Object.freeze({id:9,customer,items});const output=orderLine(order);return [output,items.length,2 in items,0 in items,order.customer===customer];})()", expected: ["#9 \ud83e\udd88, 5 items", 5, true, false, true] },
      { call: "orderLine(Object.freeze({id:1000000000,customer:Object.freeze({name:'\ud83e\udd88',email:''}),items:Object.freeze(Array(10000).fill('same'))}))", expected: "#1000000000 \ud83e\udd88, 10000 items" },

      { call: 'orderLine({ id: 0, customer: { name: "Eve", email: "" }, items: ["x", "y", "z", "w"] })', expected: '#0 Eve, 4 items' },
      { call: 'orderLine({ id: 45, customer: { name: "Fay", email: "fay@example.com" }, items: ["one"] })', expected: '#45 Fay, 1 item' },
      { call: 'orderLine({ id: 9, customer: { name: "Gus", email: "gus@example.com" }, items: ["a", "a"] })', expected: '#9 Gus, 2 items' },
    ],
  },

  /* ── Map and Set ──────────────────────────────────────────────────── */
  'ts-easy3-squares-visited': {
    solution: "const visited = (path: readonly [number, number][]): number => {\n  // Strings compare by value; distinct [x, y] arrays compare by identity.\n  const seen = new Set<string>();\n  for (const [x, y] of path) {\n    // The comma keeps [1, 23] and [12, 3] apart.\n    seen.add(`${x},${y}`);\n  }\n  return seen.size;\n};",
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
    hiddenTypeTests: [{"code": "const __auditText: string = visited([[0,0]]);", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{const a=Object.freeze([1,23]),b=Object.freeze([12,3]),path=Object.freeze([a,a,Object.freeze([1,23]),b]);return [visited(path),path.length,path[0]===a,path[3]===b];})()", expected: [2, 4, true, true] },
      { call: "[visited(Object.freeze([Object.freeze([0,-0]),Object.freeze([-0,0])])),visited([[-1000000000,1000000000],[1000000000,-1000000000]])]", expected: [1, 2] },
      { call: "(()=>{const path=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze([i%100,Math.floor(i/100)%2])));return [visited(path),path.length,path[999][0],path[999][1]];})()", expected: [200, 1000, 99, 1] },

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
      { call: "(()=>{const proto=Object.freeze({name:' inherited ',age:NaN}),value=Object.freeze(Object.create(proto)),array=Object.assign([],{name:'',age:Infinity});return [isUser(value),isUser(array),isUser({name:'x',age:-1.5}),isUser(Object.assign(()=>0,{age:1})),value.name,Number.isNaN(value.age)];})()", expected: [true, true, true, false, " inherited ", true] },
      { call: "(()=>{const user=readUser('{\"name\":\"\",\"age\":1e400,\"extra\":{\"x\":1},\"__proto__\":{\"safe\":true}}');return [user!==null,user.name,user.age===Infinity,user.extra.x,Object.hasOwn(user,'__proto__'),Object.getPrototypeOf(user)===Object.prototype];})()", expected: [true, "", true, 1, true, true] },
      { call: "[isUser({name:new String('x'),age:1}),isUser({name:'x',age:new Number(1)}),isUser(null),isUser([]),isUser(Object.freeze(Object.assign(Object.create(null),{name:'\ud83e\udd88',age:0})))]", expected: [false, false, false, false, true] },
      { call: "(()=>{const text=JSON.stringify({name:'x'.repeat(200),age:0,extra:Array(1000).fill(1)}),out=readUser(text);return [out.name.length,out.extra.length,text.length<=10000];})()", expected: [200, 1000, true] },

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
    hiddenTypeTests: [{"code": "const __auditRead: readonly Reply[] = [{error:\"x\"}]; const __auditOut: string[] = errorsOf(__auditRead); __auditOut.push(\"y\");"}],
    hiddenTests: [
      { call: "errorsOf([Object.freeze({error:' x '}),Object.freeze(Object.assign(Object.create(null),{error:''})),Object.freeze({data:Object.freeze(['error'])}),Object.freeze({error:'\ud83e\udd88'}),Object.freeze({error:' x '})])", expected: [" x ", "", "\ud83e\udd88", " x "] },
      { call: "(()=>{const data=Object.freeze(['a']),reply=Object.freeze({data}),err=Object.freeze({error:'x'}),input=Object.freeze([reply,err]),out=errorsOf(input),again=errorsOf(input);out.push('later');return [out!==again,again,input[0]===reply,reply.data===data,data.length,errorsOf([])!==errorsOf([])];})()", expected: [true, ["x"], true, true, 1, true] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze(i%2?{error:String(i)}:{data:[]}))),out=errorsOf(input);return [out.length,out[0],out[499],input.length];})()", expected: [500, "1", "999", 1000] },

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
    senior: "type Light = \"red\" | \"green\" | \"amber\";\n\n// Record<Light, Light>: a missing light or a misspelt one is a compile error.\nconst NEXT: Record<Light, Light> = {\n  red: \"green\",\n  green: \"amber\",\n  amber: \"red\",\n};\n\nfunction nextLight(light: Light, steps: number): Light {\n  let current = light;\n  let remaining = steps;\n  while (remaining > 0) {\n    current = NEXT[current];\n    remaining -= 1;\n  }\n  return current;\n}",
    hiddenTypeTests: [{"code": "nextLight(\"red\", \"2\");", "rejects": true}],
    hiddenTests: [
      { call: "['red','green','amber'].map(light=>nextLight(light,10000))", expected: ["green", "amber", "red"] },
      { call: "(()=>{const out=[];for(const start of ['red','green','amber']){let current=start;for(let i=0;i<30;i++){out.push(nextLight(start,i)===current);current=NEXT[current];}}return out.every(Boolean);})()", expected: true },
      { call: "(()=>{const before=[NEXT.red,NEXT.green,NEXT.amber];nextLight('red',9999);nextLight('green',0);return [NEXT.red===before[0],NEXT.green===before[1],NEXT.amber===before[2],nextLight('amber',0)];})()", expected: [true, true, true, "amber"] },

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
    junior: "type Reading =\n  | { unit: \"C\"; value: number }\n  | { unit: \"F\"; value: number };\n\nconst toCelsius = (readings: readonly Reading[]): number[] =>\n  readings.map((reading) => {\n    if (reading.unit === \"C\") return reading.value;\n    const celsius = (reading.value - 32) * 5 / 9;\n    return Math.round(celsius * 10) / 10;\n  });",
    senior: `type Reading =
  | { unit: "C"; value: number }
  | { unit: "F"; value: number };

const fromFahrenheit = (value: number): number => Math.round(((value - 32) * 5 / 9) * 10) / 10;

const toCelsius = (readings: readonly Reading[]): number[] =>
  readings.map(({ unit, value }) => (unit === "C" ? value : fromFahrenheit(value)));`,
    hiddenTypeTests: [{"code": "const __auditInput: readonly Reading[] = [{unit:\"F\",value:32}]; toCelsius(__auditInput).push(1);"}],
    hiddenTests: [
      { call: "(()=>{const input=Object.freeze([Object.freeze({unit:'F',value:50}),Object.freeze({unit:'C',value:-3.25})]),a=toCelsius(input),b=toCelsius(input);a.push(99);return [a!==b,b,input[0].value,input[1].value,input.length,toCelsius([])!==toCelsius([])];})()", expected: [true, [10, -3.25], 50, -3.25, 2, true] },
      { call: "(()=>{const out=toCelsius([{unit:'C',value:-0},{unit:'F',value:31.99},{unit:'F',value:32}]);return [Object.is(out[0],-0),Object.is(out[1],-0),Object.is(out[2],0)];})()", expected: [true, true, true] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({unit:i%2?'C':'F',value:i%2?0.123456:212}))),out=toCelsius(input);return [out.length,out.every((x,i)=>x===(i%2?0.123456:100)),input[0].value];})()", expected: [1000, true, 212] },

      { call: 'toCelsius([{ unit: "F", value: 32 }, { unit: "F", value: 50 }, { unit: "C", value: 0 }])', expected: [0, 10, 0] },
      { call: 'toCelsius([{ unit: "F", value: -40 }])', expected: [-40] },
      { call: 'toCelsius([{ unit: "F", value: 100 }])', expected: [37.8] },
    ],
  },
};
