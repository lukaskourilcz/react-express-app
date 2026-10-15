// Server-only reference solutions and hidden tests for lib/coding/tasks/typescript-loops.ts.
// Never import from client code.

import type { CodingSolution } from '../types';

export const TYPESCRIPT_LOOP_SOLUTIONS: Record<string, CodingSolution> = {
  "ts-inferred-total": {
    solution: `const totalLength = (words: string[]): number => {
  let total = 0;
  for (const word of words) total += word.length;
  return total;
};`,
    junior: "const totalLength = (words: string[]): number => {\n  let total = 0;\n  for (const word of words) {\n    const wordLength = word.length;\n    total = total + wordLength;\n  }\n  return total;\n};",
    senior: "function totalLength(words: string[]): number {\n  let total = 0;\n  for (const { length } of words) total += length;\n  return total;\n}",
    hiddenTests: [
      { call: "totalLength(Object.freeze(['\ud83e\udd88','e\u0301','\ud800','   ','']))", expected: 8 },
      { call: "(()=>{const words=Object.freeze(Array(1000).fill('x'.repeat(1000)));return [totalLength(words),words.length,words[0].length];})()", expected: [1000000, 1000, 1000] },
      { call: "[totalLength(['','0','\\n',' ']),totalLength([])]", expected: [3, 0] },

      { call: "totalLength([\"ab\", \"cde\", \"f\"])", expected: 6 },
      { call: "totalLength([\"   \"])", expected: 3 },
    ],
  },
  "ts-take-turns": {
    solution: `const takeTurns = (waiting: string[], turns: number): string[] => {
  const queue = [...waiting];
  const served: string[] = [];
  while (served.length < turns) {
    const next = queue.shift();
    if (next === undefined) break;
    served.push(next);
    queue.push(next);
  }
  return served;
};`,
    junior: `const takeTurns = (waiting: string[], turns: number): string[] => {
  const served: string[] = [];
  if (waiting.length === 0) {
    return served;
  }
  let position = 0;
  for (let turn = 0; turn < turns; turn += 1) {
    served.push(waiting[position]);
    position = position + 1;
    if (position === waiting.length) {
      position = 0;
    }
  }
  return served;
};`,
    senior: `const takeTurns = (waiting: string[], turns: number): string[] => {
  if (waiting.length === 0) return [];
  // Turn n goes to person n modulo the group size, so no queue has to be rotated.
  return Array.from({ length: turns }, (_, turn) => waiting[turn % waiting.length]);
};`,
    hiddenTests: [
      { call: "takeTurns(Object.freeze(['','\ud83e\udd88','']),5)", expected: ["", "\ud83e\udd88", "", "", "\ud83e\udd88"] },
      { call: "(()=>{const input=Object.freeze(['a','a','b']),out=takeTurns(input,4),again=takeTurns(input,4),zero=takeTurns(input,0),empty=takeTurns([],10000);out.push('changed');return [again,input.join(','),out!==again,zero!==takeTurns(input,0),empty!==takeTurns([],0),empty.length];})()", expected: [["a", "a", "b", "a"], "a,a,b", true, true, true, 0] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>String(i))),output=takeTurns(input,10000);return [output.length,output[999],output[1000],output[9999],input.length];})()", expected: [10000, "999", "0", "999", 1000] },

      { call: "(() => { const waiting = [\"ada\", \"bo\"]; takeTurns(waiting, 3); return waiting; })()", expected: ["ada", "bo"] },
      { call: "takeTurns([\"a\", \"b\", \"c\"], 7)", expected: ["a", "b", "c", "a", "b", "c", "a"] },
    ],
  },
  "ts-pad-a-readonly-list": {
    solution: `const padScores = (scores: readonly number[], size: number): number[] => {
  const padded = [...scores];
  while (padded.length < size) padded.push(0);
  return padded;
};`,
    junior: `const padScores = (scores: readonly number[], size: number): number[] => {
  const padded: number[] = [];
  for (const score of scores) {
    padded.push(score);
  }
  for (let i = padded.length; i < size; i += 1) {
    padded.push(0);
  }
  return padded;
};`,
    senior: `const padScores = (scores: readonly number[], size: number): number[] => {
  // Clamp at zero so a list already longer than size is copied unchanged.
  const missing = Math.max(0, size - scores.length);
  return scores.concat(Array.from({ length: missing }, () => 0));
};`,
    hiddenTypeTests: [{"code": "const __auditPadded = padScores([1,2] as const,4); __auditPadded.push(3);"}],
    hiddenTests: [
      { call: "(()=>{const input=Object.freeze([NaN,Infinity,-Infinity,-0]),a=padScores(input,2),b=padScores(input,4);a.push(9);return [a!==input,a!==b,b.length,b.every((x,i)=>Object.is(x,input[i])),input.length,a.length];})()", expected: [true, true, 4, true, 4, 5] },
      { call: "(()=>{const a=padScores(Object.freeze([]),0),b=padScores(Object.freeze([]),0);a.push(1);return [a!==b,a.length,b.length,Object.is(padScores([-0],3)[1],0)];})()", expected: [true, 1, 0, true] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>i)),out=padScores(input,10000);return [out.length,out[999],out.slice(1000).every(x=>Object.is(x,0)),input.length];})()", expected: [10000, 999, true, 1000] },
      { call: "(()=>{const input=Object.freeze(Array(10000).fill(3)),out=padScores(input,0);out[0]=4;return [out.length,input[0],out[0]];})()", expected: [10000, 3, 4] },

      { call: "(() => { const scores = [1, 2]; padScores(scores, 4); return scores; })()", expected: [1, 2] },
      { call: "padScores([5, 5], 2)", expected: [5, 5] },
    ],
  },
  "ts-lowest-and-highest": {
    solution: `const minMax = (values: number[]): [number, number] => {
  if (values.length === 0) return [0, 0];
  let low = values[0];
  let high = values[0];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] < low) low = values[i];
    if (values[i] > high) high = values[i];
  }
  return [low, high];
};`,
    junior: "const minMax = (values: number[]): [number, number] => {\n  if (values.length === 0) return [0, 0];\n  let lowest = values[0];\n  let highest = values[0];\n  for (let index = 1; index < values.length; index += 1) {\n    const value = values[index];\n    if (value < lowest) lowest = value;\n    if (value > highest) highest = value;\n  }\n  return [lowest, highest];\n};",
    senior: "function minMax(values: number[]): [number, number] {\n  if (values.length === 0) return [0, 0];\n  let [low, high] = [values[0], values[0]];\n  for (const value of values) {\n    if (value < low) low = value;\n    if (value > high) high = value;\n  }\n  return [low, high];\n}",
    hiddenTests: [
      { call: "(()=>{const input=Object.freeze([3.5,-2.25,1.1]),a=minMax(input),b=minMax(input),empty=minMax([]);a[0]=123;return [b,a!==b,input.join(','),empty.length,empty!==minMax([])];})()", expected: [[-2.25, 3.5], true, "3.5,-2.25,1.1", 2, true] },
      { call: "(()=>{const a=minMax([-0,0]),b=minMax([0,-0]);return [Object.is(a[0],-0),Object.is(a[1],-0),Object.is(b[0],0),Object.is(b[1],0)];})()", expected: [true, true, true, true] },
      { call: "minMax(Object.freeze(Array.from({length:10000},(_,i)=>i%2===0?1000000000000-i:-1000000000000+i)))", expected: [-999999999999, 1000000000000] },

      { call: "minMax([0, 0, 0])", expected: [0, 0] },
      { call: "minMax([2, 9, -4, 7])", expected: [-4, 9] },
    ],
  },
  "ts-total-expenses": {
    solution: "interface Expenses {\n  rent: number;\n  food: number;\n  travel: number;\n}\n\nconst totalExpenses = (expenses: Expenses): number => {\n  let total = 0;\n  for (const key in expenses) {\n    if (!Object.hasOwn(expenses, key)) continue;\n    if (key !== \"rent\" && key !== \"food\" && key !== \"travel\") continue;\n    total += expenses[key as keyof Expenses];\n  }\n  return total;\n};",
    junior: "interface Expenses {\n  rent: number;\n  food: number;\n  travel: number;\n}\n\nconst totalExpenses = (expenses: Expenses): number => {\n  let total = 0;\n  for (const key in expenses) {\n    const isExpense = key === \"rent\" || key === \"food\" || key === \"travel\";\n    if (isExpense && Object.hasOwn(expenses, key)) {\n      const amount = expenses[key as keyof Expenses];\n      total = total + amount;\n    }\n  }\n  return total;\n};",
    senior: "interface Expenses {\n  rent: number;\n  food: number;\n  travel: number;\n}\n\nfunction totalExpenses(expenses: Expenses): number {\n  let total = 0;\n  for (const key in expenses) {\n    if (Object.hasOwn(expenses, key) && [\"rent\", \"food\", \"travel\"].includes(key)) {\n      total += expenses[key as keyof Expenses];\n    }\n  }\n  return total;\n}",
    hiddenTypeTests: [{"code": "const __auditWrongKey: keyof Expenses = \"bonus\";", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{const input=Object.assign(Object.create({extra:100,food:999}),{rent:1.5,food:2.5,travel:-1,bonus:50,label:'ignore'});Object.freeze(input);return [totalExpenses(input),input.food,input.bonus];})()", expected: [3, 2.5, 50] },
      { call: "(()=>{const input=Object.create(null);Object.assign(input,{rent:100,food:20,travel:30,__proto__:999,constructor:999});Object.defineProperty(input,'__proto__',{value:999,enumerable:true});Object.freeze(input);return [totalExpenses(input),Object.getPrototypeOf(input)===null];})()", expected: [150, true] },
      { call: "(()=>{const input={rent:1,food:2,travel:3};for(let i=0;i<997;i++)input['extra'+i]=100;Object.freeze(input);return totalExpenses(input);})()", expected: 6 },
      { call: "(()=>{const x={travel:0.1,rent:1000000000,food:-1000000000};return Math.abs(totalExpenses(Object.freeze(x))-0.1)<0.000001;})()", expected: true },

      { call: "totalExpenses({ rent: 10, food: 20, travel: 30 })", expected: 60 },
      { call: "totalExpenses({ rent: -5, food: 5, travel: 0 })", expected: 0 },
    ],
  },
  "ts-path-length": {
    solution: `type Point = { x: number; y: number };

const pathLength = (points: Point[]): number => {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
};`,
    junior: `type Point = { x: number; y: number };

const pathLength = (points: Point[]): number => {
  let total = 0;
  let previous: Point | null = null;
  for (const point of points) {
    if (previous !== null) {
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      total = total + distance;
    }
    previous = point;
  }
  return total;
};`,
    senior: "type Point = { x: number; y: number };\n\nconst pathLength = (points: Point[]): number => {\n  let total = 0;\n  for (let i = 1; i < points.length; i += 1) {\n    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);\n  }\n  return total;\n};",
    hiddenTypeTests: [{"code": "const __auditText: string = pathLength([{x:0,y:0}]);", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{const points=Object.freeze([Object.freeze({x:0,y:0}),Object.freeze({x:1,y:1}),Object.freeze({x:2,y:1})]),actual=pathLength(points),expected=Math.SQRT2+1;return [Number.isFinite(actual)&&Math.abs(actual-expected)<=1e-7+1e-9*Math.abs(expected),points.length,points[1].x];})()", expected: [true, 3, 1] },
      { call: "(()=>{const meta={},points=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({x:3*i,y:4*i,meta}))),actual=pathLength(points);return [Number.isFinite(actual)&&Math.abs(actual-4995)<=1e-7+1e-9*4995,points.length,points[0].meta===meta,points[999].x];})()", expected: [true, 1000, true, 2997] },
      { call: "(()=>{const a=Object.freeze(Object.assign(Object.create(null),{x:-1.5,y:2.25})),b=Object.freeze({x:1.5,y:6.25}),points=Object.freeze([a,b]),actual=pathLength(points);return [Number.isFinite(actual)&&Math.abs(actual-5)<=1e-7+1e-9*5,points[0]===a,a.x,b.y];})()", expected: [true, true, -1.5, 6.25] },
      {"call": "(()=>{const actual=pathLength([{ x: 0, y: 0 }, { x: 6, y: 8 }, { x: 6, y: 8 }]);return Number.isFinite(actual)&&Math.abs(actual-(10))<=1e-7+1e-9*Math.abs(10);})()", "expected": true},
      {"call": "(()=>{const actual=pathLength([{ x: 0, y: 0 }, { x: 0, y: 5 }, { x: 0, y: 0 }]);return Number.isFinite(actual)&&Math.abs(actual-(10))<=1e-7+1e-9*Math.abs(10);})()", "expected": true},
    ],
  },
  "ts-mixed-total": {
    solution: `const mixedTotal = (values: (string | number)[]): number => {
  let total = 0;
  for (const value of values) total += typeof value === "string" ? value.length : value;
  return total;
};`,
    junior: `const mixedTotal = (values: (string | number)[]): number => {
  let total = 0;
  for (const value of values) {
    if (typeof value === "string") {
      total = total + value.length;
    } else {
      total = total + value;
    }
  }
  return total;
};`,
    senior: "const mixedTotal = (values: (string | number)[]): number => {\n  let total = 0;\n  for (const value of values) {\n    if (typeof value === \"number\") total += value;\n    else total += value.length;\n  }\n  return total;\n};",
    hiddenTypeTests: [{"code": "mixedTotal([null]);", "rejects": true}],
    hiddenTests: [
      { call: "mixedTotal(['\ud83e\udd88','e\u0301','  ','12',-1])", expected: 7 },
      { call: "(()=>{const values=Object.freeze([1000000000000,0.0001,-1000000000000]),actual=mixedTotal(values),expected=(1000000000000+0.0001)-1000000000000;return [Object.is(actual,expected),values.length,values[0]];})()", expected: [true, 3, 1000000000000] },
      { call: "(()=>{const input=Object.freeze(Array(1000).fill('x'.repeat(200)));return [mixedTotal(input),input.length,input[0].length,Object.is(mixedTotal([-0]),0)];})()", expected: [200000, 1000, 200, true] },

      { call: "mixedTotal([10, \"\", 5])", expected: 15 },
      { call: "mixedTotal([\"abcd\"])", expected: 4 },
    ],
  },
  "ts-only-the-files": {
    solution: `interface FileEntry {
  kind: "file";
  name: string;
  size: number;
}

interface FolderEntry {
  kind: "folder";
  name: string;
}

type Entry = FileEntry | FolderEntry;

const isFile = (entry: Entry): entry is FileEntry => entry.kind === "file";

const onlyFiles = (entries: Entry[]): FileEntry[] => entries.filter(isFile);`,
    junior: `interface FileEntry {
  kind: "file";
  name: string;
  size: number;
}

interface FolderEntry {
  kind: "folder";
  name: string;
}

type Entry = FileEntry | FolderEntry;

const isFile = (entry: Entry): entry is FileEntry => {
  if (entry.kind === "file") {
    return true;
  }
  return false;
};

const onlyFiles = (entries: Entry[]): FileEntry[] => {
  const files: FileEntry[] = [];
  for (const entry of entries) {
    if (isFile(entry)) {
      files.push(entry);
    }
  }
  return files;
};`,
    senior: `interface FileEntry {
  kind: "file";
  name: string;
  size: number;
}

interface FolderEntry {
  kind: "folder";
  name: string;
}

type Entry = FileEntry | FolderEntry;

const isFile = (entry: Entry): entry is FileEntry => entry.kind === "file";

// flatMap acts as a typed filter: the guard narrows entry, and an empty array drops a folder.
const onlyFiles = (entries: Entry[]): FileEntry[] => entries.flatMap((entry) => (isFile(entry) ? [entry] : []));`,
    hiddenTests: [
      { call: "(()=>{const meta={},file=Object.freeze({kind:'file',name:'same',size:0,meta}),other=Object.freeze({kind:'file',name:'same',size:0}),folder=Object.freeze({kind:'folder',name:'same'}),input=Object.freeze([file,folder,other,file]),a=onlyFiles(input),b=onlyFiles(input);a.push(file);return [a!==input,a!==b,b.length,b[0]===file,b[1]===other,b[2]===file,b[0].meta===meta,input[1]===folder];})()", expected: [true, true, 3, true, true, true, true, true] },
      { call: "(()=>{const a=onlyFiles([]),b=onlyFiles([{kind:'folder',name:''}]);a.push({kind:'file',name:'',size:0});return [a.length,b.length,b!==onlyFiles([]),isFile({kind:'file',name:'',size:0}),isFile({kind:'folder',name:''})];})()", expected: [1, 0, true, true, false] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze(i%2?{kind:'file',name:String(i),size:1000000000000}:{kind:'folder',name:String(i)}))),out=onlyFiles(input);return [out.length,out.every((x,i)=>x===input[i*2+1]),input.length];})()", expected: [500, true, 1000] },

      {
        call: "onlyFiles([{ kind: \"file\", name: \"a\", size: 1 }, { kind: \"file\", name: \"b\", size: 2 }])",
        expected: [{ kind: "file", name: "a", size: 1 }, { kind: "file", name: "b", size: 2 }],
      },
      { call: "onlyFiles([{ kind: \"folder\", name: \"x\" }, { kind: \"folder\", name: \"y\" }])", expected: [] },
    ],
    hiddenTypeTests: [
      { code: "const __only: FileEntry[] = [{ kind: \"file\", name: \"a\", size: 1 } as Entry].filter(isFile);" },
      { code: "const __name: string = onlyFiles([])[0].name;" },
    ],
  },
  "ts-count-a-status": {
    solution: `enum Status {
  Todo = "todo",
  Doing = "doing",
  Done = "done",
}

const countStatus = (items: Status[], wanted: Status): number =>
  items.reduce((count, item) => (item === wanted ? count + 1 : count), 0);`,
    junior: "enum Status {\n  Todo = \"todo\",\n  Doing = \"doing\",\n  Done = \"done\",\n}\n\nconst countStatus = (items: Status[], wanted: Status): number =>\n  items.reduce((count, item) => {\n    if (item === wanted) return count + 1;\n    return count;\n  }, 0);",
    senior: "enum Status {\n  Todo = \"todo\",\n  Doing = \"doing\",\n  Done = \"done\",\n}\n\nconst countStatus = (items: Status[], wanted: Status): number =>\n  items.reduce((count, item) => count + (item === wanted ? 1 : 0), 0);",
    hiddenTypeTests: [{"code": "countStatus([1],Status.Done);", "rejects": true}],
    hiddenTests: [
      { call: "(()=>{const items=Object.freeze([Status.Todo,Status.Done,Status.Doing,Status.Done]);return [countStatus(items,Status.Done),countStatus(items,Status.Todo),items.join(','),Status.Todo,Status.Doing,Status.Done];})()", expected: [2, 1, "todo,done,doing,done", "todo", "doing", "done"] },
      { call: "(()=>{const items=Object.freeze(Array.from({length:1000},(_,i)=>[Status.Todo,Status.Doing,Status.Done][i%3]));return [countStatus(items,Status.Todo),countStatus(items,Status.Doing),countStatus(items,Status.Done),items.length];})()", expected: [334, 333, 333, 1000] },
      { call: "[Status.Todo,Status.Doing,Status.Done].map(status=>countStatus([],status))", expected: [0, 0, 0] },

      { call: "countStatus([Status.Todo, Status.Done, Status.Todo, Status.Todo], Status.Todo)", expected: 3 },
      { call: "countStatus([Status.Done], Status.Doing)", expected: 0 },
    ],
  },
  "ts-chunk-a-list": {
    solution: `const chunk = <T>(items: T[], size: number): T[][] => {
  const groups: T[][] = [];
  for (let start = 0; start < items.length; start += size) groups.push(items.slice(start, start + size));
  return groups;
};`,
    junior: "const chunk = <T>(items: T[], size: number): T[][] => {\n  const groups: T[][] = [];\n  for (let start = 0; start < items.length; start += size) {\n    const group = items.slice(start, start + size);\n    groups.push(group);\n  }\n  return groups;\n};",
    senior: "const chunk = <T>(items: T[], size: number): T[][] => {\n  const groups: T[][] = [];\n  for (let start = 0; start < items.length; start += size) groups.push(items.slice(start, start + size));\n  return groups;\n};",
    hiddenTypeTests: [{"code": "const __auditOut: (number | null)[][] = chunk([1,null],2);"}],
    hiddenTests: [
      { call: "(()=>{const object=Object.freeze({}),fn=()=>{throw Error('called');},symbol=Symbol('x'),input=Object.freeze([object,fn,undefined,symbol,null]),a=chunk(input,2),b=chunk(input,2);a[0].push('later');return [a!==b,a[0]!==b[0],a[0]!==a[1],b[0][0]===object,b[0][1]===fn,b[1][0]===undefined,b[1][1]===symbol,b[2][0]===null,input.length];})()", expected: [true, true, true, true, true, true, true, true, 5] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>i)),out=chunk(input,333);return [out.map(group=>group.length),out[3][0],out.flat().every((x,i)=>x===i),input.length];})()", expected: [[333, 333, 333, 1], 999, true, 1000] },
      { call: "(()=>{const a=chunk([],1),b=chunk([1],1000000000);a.push([2]);b[0].push(3);return [a, b,chunk([],1).length];})()", expected: [[[2]], [[1, 3]], 0] },

      { call: "chunk([1, 2, 3, 4, 5, 6], 3)", expected: [[1, 2, 3], [4, 5, 6]] },
      { call: "chunk([1, 2, 3, 4, 5, 6, 7], 3)", expected: [[1, 2, 3], [4, 5, 6], [7]] },
    ],
  },
  "ts-zip-two-lists": {
    solution: `const zip = <A, B>(left: A[], right: B[]): [A, B][] => {
  const pairs: [A, B][] = [];
  const count = Math.min(left.length, right.length);
  for (let i = 0; i < count; i += 1) pairs.push([left[i], right[i]]);
  return pairs;
};`,
    junior: "const zip = <A, B>(left: A[], right: B[]): [A, B][] => {\n  const pairs: [A, B][] = [];\n  for (let i = 0; i < left.length && i < right.length; i += 1) {\n    const pair: [A, B] = [left[i], right[i]];\n    pairs.push(pair);\n  }\n  return pairs;\n};",
    senior: "const zip = <A, B>(left: A[], right: B[]): [A, B][] => {\n  const pairs: [A, B][] = [];\n  const count = Math.min(left.length, right.length);\n  for (let i = 0; i < count; i += 1) pairs.push([left[i], right[i]]);\n  return pairs;\n};",
    hiddenTypeTests: [{"code": "const __auditOut: [number | null,undefined][] = zip([1,null],[undefined]);"}],
    hiddenTests: [
      { call: "(()=>{const object=Object.freeze({}),fn=()=>{throw Error('called');},symbol=Symbol('x'),left=Object.freeze([object,undefined]),right=Object.freeze([fn,symbol,null]),a=zip(left,right),b=zip(left,right);a[0][0]='changed';a.push(['later',0]);return [a!==b,a[0]!==b[0],b[0]!==b[1],b[0][0]===object,b[0][1]===fn,b[1][0]===undefined,b[1][1]===symbol,left.length,right.length,left[0]===object];})()", expected: [true, true, true, true, true, true, true, 2, 3, true] },
      { call: "(()=>{const left=Object.freeze(Array(1000).fill(null)),right=Object.freeze([undefined]),out=zip(left,right);return [out.length,out[0][0]===null,out[0][1]===undefined,left.length,right.length,zip(left,[]).length,zip([],right).length];})()", expected: [1, true, true, 1000, 1, 0, 0] },
      { call: "(()=>{const a=zip([],[]),b=zip([],[]);a.push([1,2]);return [a!==b,b.length,a.length];})()", expected: [true, 0, 1] },

      { call: "zip([1, 2, 3], [\"a\", \"b\", \"c\"])", expected: [[1, "a"], [2, "b"], [3, "c"]] },
      { call: "zip([], [])", expected: [] },
    ],
  },
  "ts-group-by-key": {
    solution: "const groupBy = <T, K extends PropertyKey>(items: T[], keyOf: (item: T) => K): Partial<Record<K, T[]>> => {\n  // Only observed groups exist; no prototype members can masquerade as groups.\n  const groups = Object.create(null) as Partial<Record<K, T[]>>;\n  for (const item of items) {\n    const key = keyOf(item);\n    const group = groups[key];\n    if (group === undefined) groups[key] = [item];\n    else group.push(item);\n  }\n  return groups;\n};",
    junior: "const groupBy = <T, K extends PropertyKey>(items: T[], keyOf: (item: T) => K): Partial<Record<K, T[]>> => {\n  const groups = Object.create(null) as Partial<Record<K, T[]>>;\n  for (const item of items) {\n    const key = keyOf(item);\n    const previous = groups[key];\n    if (previous !== undefined) {\n      previous.push(item);\n    } else {\n      groups[key] = [item];\n    }\n  }\n  return groups;\n};",
    senior: "const groupBy = <T, K extends PropertyKey>(items: T[], keyOf: (item: T) => K): Partial<Record<K, T[]>> => {\n  const groups = Object.create(null) as Partial<Record<K, T[]>>;\n  for (const item of items) {\n    const key = keyOf(item);\n    (groups[key] ??= []).push(item);\n  }\n  return groups;\n};",
    hiddenTypeTests: [{"code": "const __auditKey = Symbol(); const __auditGroups = groupBy([{payload:1}],()=>__auditKey); const __auditMaybe: {payload:number}[] | undefined = __auditGroups[__auditKey];"}],
    hiddenTests: [
      { call: "(()=>{const input=Object.freeze(['constructor','__proto__','toString']),out=groupBy(input,x=>x),empty=groupBy([],()=> 'constructor');return [Object.keys(out).sort(),input.every(key=>Object.hasOwn(out,key)&&out[key][0]===key),empty.constructor===undefined,empty.toString===undefined,empty.__proto__===undefined,Reflect.ownKeys(empty).length];})()", expected: [["__proto__", "constructor", "toString"], true, true, true, true, 0] },
      { call: "(()=>{const a=Symbol('same'),b=Symbol('same'),keys=[1,'1',-0,0,a,b],out=groupBy([0,1,2,3,4,5],item=>keys[item]);return [out['1'],out['0'],out[a],out[b],out[a]!==out[b],Object.getOwnPropertySymbols(out).length];})()", expected: [[0, 1], [2, 3], [4], [5], true, 2] },
      { call: "(()=>{const input=Object.freeze([Object.freeze({}),Object.freeze({}),Object.freeze({})]),seen=[],keys=['a','b','a'];let calls=0;const out=groupBy(input,function(item){seen.push([item,arguments.length]);return keys[calls++];}),again=groupBy(input,item=>item===input[1]?'b':'a');out.a.push(input[0]);return [calls,seen.every((row,i)=>row[0]===input[i]&&row[1]===1),out!==again,out.a!==again.a,again.a.length,again.a[0]===input[0],again.a[1]===input[2],input.length];})()", expected: [3, true, true, true, 2, true, true, 3] },
      { call: "(()=>{const marker={},seen=[];let thrown=false;try{groupBy([1,2,3],item=>{seen.push(item);if(item===2)throw marker;return 'x';});}catch(error){thrown=error===marker;}let emptyCalls=0;const empty=groupBy([],()=>{emptyCalls++;return 'x';});return [thrown,seen,emptyCalls,Reflect.ownKeys(empty).length];})()", expected: [true, [1, 2], 0, 0] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>i)),out=groupBy(input,item=>item%2);return [out[0].length,out[1].length,out[0][499],out[1][499],input.length,out[0]!==out[1]];})()", expected: [500, 500, 998, 999, 1000, true] },

      { call: "groupBy([\"aa\", \"b\", \"cc\"], w => w.length)", expected: { 1: ["b"], 2: ["aa", "cc"] } },
      { call: "groupBy([1, 2, 3], () => \"all\")", expected: { all: [1, 2, 3] } },
    ],
  },
  "ts-write-reduce": {
    solution: `const myReduce = <T, U>(items: T[], step: (acc: U, item: T) => U, initial: U): U => {
  let acc = initial;
  for (let i = 0; i < items.length; i += 1) acc = step(acc, items[i]);
  return acc;
};`,
    junior: "const myReduce = <T, U>(items: T[], step: (acc: U, item: T) => U, initial: U): U => {\n  let result = initial;\n  for (let i = 0; i < items.length; i += 1) {\n    const next = step(result, items[i]);\n    result = next;\n  }\n  return result;\n};",
    senior: "const myReduce = <T, U>(items: T[], step: (acc: U, item: T) => U, initial: U): U => {\n  let acc = initial;\n  for (let i = 0; i < items.length; i += 1) acc = step(acc, items[i]);\n  return acc;\n};",
    hiddenTypeTests: [{"code": "const __auditFn = (n:number) => n; const __auditOut: typeof __auditFn = myReduce([1], (acc,n)=>acc, __auditFn);"}],
    hiddenTests: [
      { call: "(()=>{const initial={sum:0},seen=[];let current=initial,ok=true,calls=0;const out=myReduce(Object.freeze([1,2,3]),function(acc,item){ok=ok&&arguments.length===2&&acc===current;seen.push(item);calls++;current={sum:acc.sum+item};return current;},initial);return [ok,calls,seen,out===current,out.sum,initial.sum];})()", expected: [true, 3, [1, 2, 3], true, 6, 0] },
      { call: "(()=>{const fn=()=>{throw Error('called');},symbol=Symbol('initial');let calls=0;const never=()=>{calls++;throw Error('step called');};return [myReduce([],never,fn)===fn,myReduce([],never,symbol)===symbol,myReduce([],never,undefined)===undefined,calls];})()", expected: [true, true, true, 0] },
      { call: "(()=>{const marker={},seen=[];try{myReduce([1,2,3],(acc,item)=>{seen.push(item);if(item===2)throw marker;return acc+item;},0);return false;}catch(error){return error===marker&&seen.join(',')==='1,2';}})()", expected: true },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>i)),initial=[0];initial.length=0;const out=myReduce(input,(acc,item)=>{acc.push(item);return acc;},initial);return [out===initial,out.length,out.every((item,i)=>item===i),input.length,input[0]];})()", expected: [true, 1000, true, 1000, 0] },

      { call: "myReduce([1, 2, 3, 4], (acc, n) => Math.max(acc, n), 0)", expected: 4 },
      { call: "myReduce([\"x\", \"y\"], (acc, s) => acc + s.length, 0)", expected: 2 },
    ],
  },
  "ts-pluck-all": {
    solution: `const pluckAll = <T, K extends keyof T>(items: T[], keys: K[]): T[K][][] =>
  items.map(item => keys.map(key => item[key]));`,
    junior: "const pluckAll = <T, K extends keyof T>(items: T[], keys: K[]): T[K][][] => {\n  return items.map((item) => {\n    return keys.map((key) => {\n      const value = item[key];\n      return value;\n    });\n  });\n};",
    senior: `const pluckAll = <T, K extends keyof T>(items: T[], keys: K[]): T[K][][] => {
  // Naming the row builder keeps the nested map readable and states the T[K][] row type once.
  const row = (item: T): T[K][] => keys.map((key) => item[key]);
  return items.map(row);
};`,
    hiddenTypeTests: [{"code": "const __auditKey=Symbol(); const __auditItems: {value?:string; [__auditKey]:symbol}[]=[{[__auditKey]:Symbol()}]; const __auditMaybe:(string|undefined)[][]=pluckAll(__auditItems,[\"value\"]); const __auditSymbols:symbol[][]=pluckAll(__auditItems,[__auditKey]);"}],
    hiddenTests: [
      { call: "(()=>{const key=Symbol('key'),meta={},arr=Object.freeze([1]),fn=()=>{throw 'opaque'},row=Object.freeze({[key]:meta,a:arr,b:fn}),input=Object.freeze([row,row]),keys=Object.freeze([key,'a',key,'b']),out=pluckAll(input,keys),again=pluckAll(input,keys);out[0].push(meta);return [again.length,again[0][0]===meta,again[0][1]===arr,again[0][2]===meta,again[0][3]===fn,out!==again,out[0]!==out[1],again[0]!==again[1],again[0].length,keys.length,input[0]===row];})()", expected: [2, true, true, true, true, true, true, true, 4, 4, true] },
      { call: "(()=>{const marker={},input=Object.freeze([Object.freeze(Object.create({value:marker})),Object.freeze({})]),keys=Object.freeze(['value','value']),out=pluckAll(input,keys),empty=pluckAll(input,[]);empty[0].push(marker);return [out[0][0]===marker,out[0][1]===marker,out[1][0]===undefined,Object.hasOwn(out[1],0),out[1].length,empty[0]!==empty[1],empty[1].length,input.length];})()", expected: [true, true, true, true, 2, true, 0, 2] },
      { call: "(()=>{const marker={},input=Object.freeze(Array.from({length:100},()=>Object.freeze([marker]))),keys=Object.freeze(Array(20).fill(0)),out=pluckAll(input,keys),a=pluckAll([],keys),b=pluckAll([],keys);a.push([]);return [out.length,out.every(row=>row.length===20&&row.every(value=>value===marker)),new Set(out).size,a!==b,b.length,input.length,keys.length];})()", expected: [100, true, 100, true, 0, 100, 20] },

      { call: "pluckAll([{ a: 1, b: 2, c: 3 }], [\"a\", \"c\"])", expected: [[1, 3]] },
      { call: "pluckAll([{ a: 1 }, { a: 2 }, { a: 3 }], [\"a\"])", expected: [[1], [2], [3]] },
    ],
  },
  "ts-apply-patches-in-order": {
    solution: "interface Profile {\n  name: string;\n  age: number;\n  city: string;\n}\n\nconst applyPatches = (profile: Profile, patches: Partial<Profile>[]): Profile => {\n  let current = profile;\n  for (const patch of patches) {\n    const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));\n    current = { ...current, ...defined };\n  }\n  return current;\n};",
    junior: "interface Profile {\n  name: string;\n  age: number;\n  city: string;\n}\n\nconst applyPatches = (profile: Profile, patches: Partial<Profile>[]): Profile => {\n  let current = profile;\n  for (const patch of patches) {\n    const next: Profile = { ...current };\n    if (Object.hasOwn(patch, \"name\") && patch.name !== undefined) next.name = patch.name;\n    if (Object.hasOwn(patch, \"age\") && patch.age !== undefined) next.age = patch.age;\n    if (Object.hasOwn(patch, \"city\") && patch.city !== undefined) next.city = patch.city;\n    current = next;\n  }\n  return current;\n};",
    senior: "interface Profile {\n  name: string;\n  age: number;\n  city: string;\n}\n\nconst applyPatches = (profile: Profile, patches: Partial<Profile>[]): Profile =>\n  patches.reduce<Profile>((current, patch) => {\n    const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));\n    return { ...current, ...defined };\n  }, profile);",
    hiddenTypeTests: [{"code": "const __auditPatch:Partial<Profile>={age:undefined}; const __auditProfile:Profile=applyPatches({name:\"x\",age:1,city:\"y\"},[__auditPatch]);"}],
    hiddenTests: [
      { call: "(()=>{const sym=Symbol('meta'),meta={},profile=Object.freeze({name:'A',age:1,city:'X',extra:meta,[sym]:meta,['__proto__']:meta}),none=applyPatches(profile,[]),one=applyPatches(profile,[Object.freeze({})]),again=applyPatches(profile,[Object.freeze({})]);one.age=9;return [none===profile,one!==profile,one!==again,again.extra===meta,again[sym]===meta,Object.hasOwn(again,'__proto__'),again.__proto__===meta,Object.getPrototypeOf(again)===Object.prototype,profile.age,again.age];})()", expected: [true, true, true, true, true, true, true, true, 1, 1] },
      { call: "(()=>{const profile=Object.freeze({name:'A',age:1,city:'X'}),inherited=Object.freeze(Object.create({name:'ignored',age:99})),patches=Object.freeze([Object.freeze({name:'',age:0}),Object.freeze({name:undefined,age:undefined,city:' '}),inherited]),out=applyPatches(profile,patches);return [out.name,out.age,out.city,profile.name,profile.age,patches[1].name===undefined];})()", expected: ["", 0, " ", "A", 1, true] },
      { call: "(()=>{const meta={},profile={name:'A',age:1,city:'X'};for(let i=0;i<100;i++)profile['x'+i]=meta;Object.freeze(profile);const patches=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({age:i}))),out=applyPatches(profile,patches);return [out.age,Reflect.ownKeys(out).length,Array.from({length:100},(_,i)=>out['x'+i]===meta).every(Boolean),profile.age,patches.length];})()", expected: [999, 103, true, 1, 1000] },

      {
        call: "(() => { const profile = { name: \"Ada\", age: 36, city: \"London\" }; applyPatches(profile, [{ age: 1 }]); return profile.age; })()",
        expected: 36,
      },
      {
        call: "applyPatches({ name: \"Ada\", age: 36, city: \"London\" }, [{ name: \"Bo\" }, { age: 9 }, { city: \"Oslo\" }])",
        expected: { name: "Bo", age: 9, city: "Oslo" },
      },
    ],
  },
  "ts-score-by-player": {
    solution: "interface Round {\n  player: string;\n  points: number;\n}\n\nconst scoreByPlayer = (rounds: Round[]): Partial<Record<string, number>> => {\n  const totals = Object.create(null) as Partial<Record<string, number>>;\n  for (const round of rounds) totals[round.player] = (totals[round.player] ?? 0) + round.points;\n  return totals;\n};",
    junior: "interface Round {\n  player: string;\n  points: number;\n}\n\nconst scoreByPlayer = (rounds: Round[]): Partial<Record<string, number>> => {\n  const totals = Object.create(null) as Partial<Record<string, number>>;\n  for (const round of rounds) {\n    const player = round.player;\n    const previous = totals[player];\n    const start = previous === undefined ? 0 : previous;\n    totals[player] = start + round.points;\n  }\n  return totals;\n};",
    senior: "interface Round {\n  player: string;\n  points: number;\n}\n\nconst scoreByPlayer = (rounds: Round[]): Partial<Record<string, number>> =>\n  rounds.reduce<Partial<Record<string, number>>>((totals, { player, points }) => {\n    totals[player] = (totals[player] ?? 0) + points;\n    return totals;\n  }, Object.create(null) as Partial<Record<string, number>>);",
    hiddenTypeTests: [{"code": "const __auditLookup=(key:string):number|undefined=>scoreByPlayer([])[key];"}],
    hiddenTests: [
      { call: "(()=>{const input=Object.freeze(['constructor','__proto__','toString',''].map(player=>Object.freeze({player,points:1}))),out=scoreByPlayer(input),empty=scoreByPlayer([]);return [input.every(round=>Object.hasOwn(out,round.player)&&out[round.player]===1),Reflect.ownKeys(out).length,empty.constructor===undefined,empty.__proto__===undefined,empty.toString===undefined,Reflect.ownKeys(empty).length];})()", expected: [true, 4, true, true, true, 0] },
      { call: "(()=>{const input=Object.freeze([Object.freeze({player:' x ',points:-0}),Object.freeze({player:'x',points:0.5}),Object.freeze({player:'x',points:-0.25}),Object.freeze({player:'X',points:2})]),a=scoreByPlayer(input),b=scoreByPlayer(input);a.x=99;return [Object.is(b[' x '],0),b.x,b.X,a!==b,input[1].points,input.length];})()", expected: [true, 0.25, 2, true, 0.5, 4] },
      { call: "(()=>{const input=Object.freeze([{player:'p',points:1000000000},{player:'p',points:0.0000001},{player:'p',points:-1000000000}]),out=scoreByPlayer(input);let expected=0;for(const round of input)expected+=round.points;return [out.p===expected,Object.hasOwn(out,'p'),out.absent===undefined];})()", expected: [true, true, true] },
      { call: "(()=>{const input=Object.freeze(Array.from({length:1000},(_,i)=>Object.freeze({player:'p'+i%10,points:1}))),out=scoreByPlayer(input);return [Object.keys(out).length,Object.values(out).every(total=>total===100),input.length,scoreByPlayer([])!==scoreByPlayer([])];})()", expected: [10, true, 1000, true] },

      {
        call: "scoreByPlayer([{ player: \"a\", points: 1 }, { player: \"b\", points: 2 }, { player: \"a\", points: 3 }, { player: \"b\", points: 4 }])",
        expected: { a: 4, b: 6 },
      },
      { call: "scoreByPlayer([{ player: \"solo\", points: 2.5 }])", expected: { solo: 2.5 } },
    ],
  },
  "ts-freeze-a-copy": {
    solution: `type Frozen<T> = { readonly [K in keyof T]: T[K] };

const freezeCopy = <T extends object>(source: T): Frozen<T> => {
  const copy = {} as { [K in keyof T]: T[K] };
  for (const [key, value] of Object.entries(source)) copy[key as keyof T] = value;
  return Object.freeze(copy);
};`,
    junior: `type Frozen<T> = { readonly [K in keyof T]: T[K] };

const freezeCopy = <T extends object>(source: T): Frozen<T> => {
  const copy = {} as { [K in keyof T]: T[K] };
  const keys = Object.keys(source) as (keyof T)[];
  for (const key of keys) {
    const value = source[key];
    copy[key] = value;
  }
  Object.freeze(copy);
  return copy;
};`,
    senior: `type Frozen<T> = { readonly [K in keyof T]: T[K] };

// A shallow spread copies the own enumerable keys, so the caller's object is never the one frozen.
const freezeCopy = <T extends object>(source: T): Frozen<T> => Object.freeze({ ...source });`,
    hiddenTests: [
      { call: "Object.isFrozen(freezeCopy({}))", expected: true },
      { call: "freezeCopy({ x: 1, y: 2, z: 3 })", expected: { x: 1, y: 2, z: 3 } },
    ],
    hiddenTypeTests: [
      { code: "const __b: string = freezeCopy({ a: 1, b: \"x\" }).b;" },
      { code: "freezeCopy({ a: 1 }).b;", rejects: true },
    ],
  },
  "ts-values-of-a-type": {
    solution: `type TypeName = "string" | "number" | "boolean";

type OfType<N extends TypeName> = N extends "string" ? string : N extends "number" ? number : boolean;

const ofType = <N extends TypeName>(values: unknown[], name: N): OfType<N>[] =>
  values.filter((value): value is OfType<N> => typeof value === name);`,
    junior: `type TypeName = "string" | "number" | "boolean";

type OfType<N extends TypeName> = N extends "string" ? string : N extends "number" ? number : boolean;

const ofType = <N extends TypeName>(values: unknown[], name: N): OfType<N>[] => {
  const found: OfType<N>[] = [];
  for (const value of values) {
    if (typeof value === name) {
      found.push(value as OfType<N>);
    }
  }
  return found;
};`,
    senior: `type TypeName = "string" | "number" | "boolean";

type OfType<N extends TypeName> = N extends "string" ? string : N extends "number" ? number : boolean;

// A guard factory: hasType("number") is a reusable predicate typed for that one name.
const hasType = <N extends TypeName>(name: N) => (value: unknown): value is OfType<N> => typeof value === name;

const ofType = <N extends TypeName>(values: unknown[], name: N): OfType<N>[] => values.filter(hasType(name));`,
    hiddenTests: [
      { call: "ofType([1, 2, 3], \"boolean\")", expected: [] },
      { call: "ofType([\"a\", true, \"b\"], \"string\")", expected: ["a", "b"] },
    ],
    hiddenTypeTests: [
      { code: "const __flags: boolean[] = ofType([true], \"boolean\");" },
    ],
  },
  "ts-memoized-run": {
    solution: `type Output<F> = F extends (arg: number) => infer R ? R : never;

const runMemoized = <F extends (arg: number) => unknown>(fn: F, inputs: number[]): Output<F>[] => {
  const cache = new Map<number, Output<F>>();
  const results: Output<F>[] = [];
  for (const input of inputs) {
    if (!cache.has(input)) cache.set(input, fn(input) as Output<F>);
    results.push(cache.get(input) as Output<F>);
  }
  return results;
};`,
    junior: `type Output<F> = F extends (arg: number) => infer R ? R : never;

const runMemoized = <F extends (arg: number) => unknown>(fn: F, inputs: number[]): Output<F>[] => {
  const cache: { [input: number]: Output<F> } = {};
  const results: Output<F>[] = [];
  for (const input of inputs) {
    if (!(input in cache)) {
      const output = fn(input) as Output<F>;
      cache[input] = output;
    }
    results.push(cache[input]);
  }
  return results;
};`,
    senior: `type Output<F> = F extends (arg: number) => infer R ? R : never;

const runMemoized = <F extends (arg: number) => unknown>(fn: F, inputs: number[]): Output<F>[] => {
  const cache = new Map<number, Output<F>>();
  return inputs.map((input) => {
    // has() rather than get() ?? ..., so a cached undefined or null still counts as a hit.
    if (cache.has(input)) return cache.get(input) as Output<F>;
    const output = fn(input) as Output<F>;
    cache.set(input, output);
    return output;
  });
};`,
    hiddenTests: [
      { call: "runMemoized(n => n * n, [3, 3, 3])", expected: [9, 9, 9] },
      { call: "(() => { let calls = 0; runMemoized(n => { calls += 1; return n; }, [5, 6, 7]); return calls; })()", expected: 3 },
    ],
    hiddenTypeTests: [
      { code: "const __flags: boolean[] = runMemoized(n => n > 0, [1]);" },
      { code: "runMemoized((s: string) => s, [1]);", rejects: true },
    ],
  },
  "ts-tag-every-id": {
    solution: `type Tag<P extends string> = \`\${P}-\${number}\`;

const tagAll = <P extends string>(prefix: P, ids: number[]): Tag<P>[] => {
  const tags: Tag<P>[] = [];
  for (const id of ids) tags.push(\`\${prefix}-\${id}\`);
  return tags;
};`,
    junior: `type Tag<P extends string> = \`\${P}-\${number}\`;

const tagAll = <P extends string>(prefix: P, ids: number[]): Tag<P>[] => {
  const tags: Tag<P>[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const tag: Tag<P> = \`\${prefix}-\${id}\`;
    tags.push(tag);
  }
  return tags;
};`,
    senior: `type Tag<P extends string> = \`\${P}-\${number}\`;

// The arrow's return annotation gives the template literal its Tag<P> type instead of plain string.
const tagAll = <P extends string>(prefix: P, ids: number[]): Tag<P>[] => ids.map((id): Tag<P> => \`\${prefix}-\${id}\`);`,
    hiddenTests: [
      { call: "tagAll(\"item\", [1, 2, 3])", expected: ["item-1", "item-2", "item-3"] },
      { call: "tagAll(\"v\", [42])", expected: ["v-42"] },
    ],
    hiddenTypeTests: [
      { code: "const __items: `item-${number}`[] = tagAll(\"item\", []);" },
      { code: "const __plain: string[] = tagAll(\"item\", [1]);" },
    ],
  },
  "ts-pair-with-a-sum": {
    solution: `const pairWithSum = (sorted: readonly number[], target: number): [number, number] | null => {
  let left = 0;
  let right = sorted.length - 1;
  while (left < right) {
    const sum = sorted[left] + sorted[right];
    if (sum === target) return [sorted[left], sorted[right]];
    if (sum < target) left += 1;
    else right -= 1;
  }
  return null;
};`,
    junior: `const pairWithSum = (sorted: readonly number[], target: number): [number, number] | null => {
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const sum = sorted[i] + sorted[j];
      if (sum === target) {
        return [sorted[i], sorted[j]];
      }
    }
  }
  return null;
};`,
    senior: `const pairWithSum = (sorted: readonly number[], target: number): [number, number] | null => {
  // The list is sorted, so each value's partner can be binary-searched among the later values.
  const hasLater = (wanted: number, from: number): boolean => {
    let low = from;
    let high = sorted.length - 1;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      if (sorted[middle] === wanted) return true;
      if (sorted[middle] < wanted) low = middle + 1;
      else high = middle - 1;
    }
    return false;
  };
  for (const [index, value] of sorted.entries()) {
    if (hasLater(target - value, index + 1)) return [value, target - value];
  }
  return null;
};`,
    hiddenTests: [
      { call: "pairWithSum([1, 2, 4, 5], 6)", expected: [1, 5] },
      { call: "pairWithSum([1, 2, 3], 7)", expected: null },
      { call: "pairWithSum([1, 3, 4], 6)", expected: null },
    ],
  },
  "ts-binary-search": {
    solution: `const binarySearch = (sorted: readonly number[], target: number): number => {
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (sorted[middle] === target) return middle;
    if (sorted[middle] < target) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
};`,
    junior: `const binarySearch = (sorted: readonly number[], target: number): number => {
  let low = 0;
  let high = sorted.length - 1;
  let found = -1;
  while (low <= high && found === -1) {
    const middle = Math.floor((low + high) / 2);
    const middleValue = sorted[middle];
    if (middleValue === target) {
      found = middle;
    } else if (middleValue < target) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
};`,
    senior: `const binarySearch = (sorted: readonly number[], target: number): number => {
  const search = (low: number, high: number): number => {
    if (low > high) return -1;
    const middle = (low + high) >>> 1; // integer midpoint without Math.floor
    if (sorted[middle] === target) return middle;
    return sorted[middle] < target ? search(middle + 1, high) : search(low, middle - 1);
  };
  return search(0, sorted.length - 1);
};`,
    hiddenTests: [
      { call: "binarySearch(Array.from({ length: 1000 }, (_, i) => i * 2), 998)", expected: 499 },
      { call: "binarySearch([1, 3, 5, 7, 9, 11], 11)", expected: 5 },
      { call: "binarySearch([2, 4, 6], 1)", expected: -1 },
    ],
  },
};
