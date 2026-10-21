/** Server-only reference solutions and hidden assertions for the FDE
 * diagnostic. Never imported from client code, and never from `../catalog`.
 *
 * Both activities hand the learner working-looking code that is already
 * broken, so the hidden assertions target the half-fix: the loop bound
 * corrected while the caller's array is still written into, the copy made
 * while the last page is still dropped, and a narrowing repaired for the
 * rejected state alone. The type assertions guard the other shortcut —
 * widening the parameter until the compiler stops objecting. */

import type { PathCodeSolution } from '../types';

export const FDE_DIAGNOSTIC_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-diagnostic-debug-js': {
    solution: [
      'const collectAll = async (fetchPage, known) => {',
      '  const out = [...known];',
      '  const first = await fetchPage(1);',
      '  out.push(...first.items);',
      '',
      '  let page = 2;',
      '  while (page <= first.pageCount) {',
      '    const next = await fetchPage(page);',
      '    out.push(...next.items);',
      '    page += 1;',
      '  }',
      '',
      '  return out;',
      '};',
    ].join('\n'),
    hiddenTests: [
      { call: "(() => {const snap=items=>items.map(item=>[item,Object.getPrototypeOf(item),Object.getOwnPropertyDescriptors(item)]);const unchanged=before=>before.every(([item,p,d])=>Object.getPrototypeOf(item)===p&&Reflect.ownKeys(item).length===Reflect.ownKeys(d).length&&Reflect.ownKeys(d).every(k=>{const a=d[k],b=Object.getOwnPropertyDescriptor(item,k);return b&&Object.is(a.value,b.value)&&a.get===b.get&&a.set===b.set&&a.writable===b.writable&&a.enumerable===b.enumerable&&a.configurable===b.configurable;}));const a=Object.freeze({id:1}),b=Object.freeze({id:2});const known=Object.freeze([a]);const pages=[Object.freeze([b,a]),Object.freeze([])];const before=snap([known,...pages,a,b]);return collectAll(n=>Promise.resolve({items:pages[n-1],pageCount:2}),known).then(result=>[result!==known,result[0]===a,result[1]===b,result[2]===a,unchanged(before)]);})()", expected: [true, true, true, true, true], criterion: "no-mutation", async: true },
      { call: "(() => {let active=false;const requested=[];const fetch=n=>{if(active)throw Error(\"overlapping requests\");active=true;requested.push(n);return new Promise(resolve=>setTimeout(()=>{active=false;resolve({items:[n],pageCount:4});},20));};return collectAll(fetch,[]).then(result=>[result,requested]);})()", expected: [[1, 2, 3, 4], [1, 2, 3, 4]], criterion: "core", async: true },
      { call: "(() => {const pages=Array.from({length:100},(_,p)=>Object.freeze(Array.from({length:100},(_,i)=>p*100+i)));const known=Object.freeze(Array.from({length:1000},(_,i)=>-i));return collectAll(n=>Promise.resolve({items:pages[n-1],pageCount:100}),known).then(result=>[result.length,result[999],result[1000],result[10999]]);})()", expected: [11000, -999, 0, 9999], criterion: "core", async: true },
      { call: "(() => {const fetch=()=>Promise.resolve({items:[],pageCount:1});return Promise.all([collectAll(fetch,[]),collectAll(fetch,[])]).then(([a,b])=>a!==b&&a.length===0&&b.length===0);})()", expected: true, criterion: "no-mutation", async: true },
      {
        call: "__collect([['a'], ['b'], ['c'], ['d'], ['e'], ['f']], []).then(function (r) { return r.result; })",
        expected: ['a', 'b', 'c', 'd', 'e', 'f'],
        async: true,
      },
      {
        call: "__collect([['a'], ['b', 'c', 'd']], []).then(function (r) { return r.result; })",
        expected: ['a', 'b', 'c', 'd'],
        async: true,
      },
      {
        call: "__collect([['a'], ['b'], ['c']], []).then(function (r) { return r.requested; })",
        expected: [1, 2, 3],
        async: true,
      },
      {
        call: "__collect([[], ['b'], []], ['x']).then(function (r) { return r.result; })",
        expected: ['x', 'b'],
        async: true,
      },
      {
        call: "__collect([['a'], ['b']], ['x', 'y']).then(function (r) { return r.callerUnchanged; })",
        expected: true,
        async: true,
        criterion: 'no-mutation',
      },
      {
        call: "__collect([['a'], ['b']], ['x', 'y']).then(function (r) { return r.sameArray; })",
        expected: false,
        async: true,
        criterion: 'no-mutation',
      },
      {
        call: "__collect([['a', 'b']], ['x']).then(function (r) { return r.callerUnchanged && r.result.length === 3; })",
        expected: true,
        async: true,
        criterion: 'no-mutation',
      },
    ],
  },
  'fde-v1-diagnostic-debug-ts': {
    solution: [
      "type SyncOutcome =",
      "  | { state: 'applied'; recordId: string }",
      "  | { state: 'queued'; recordId: string; retryAfterMs: number }",
      "  | { state: 'rejected'; recordId: string; error: string };",
      '',
      'const describeOutcome = (outcome: SyncOutcome): string => {',
      "  if (outcome.state === 'applied') {",
      "    return 'applied ' + outcome.recordId;",
      '  }',
      '',
      "  if (outcome.state === 'queued') {",
      "    return 'queued ' + outcome.recordId + ' in ' + outcome.retryAfterMs + 'ms';",
      '  }',
      '',
      "  return 'rejected ' + outcome.recordId + ': ' + outcome.error;",
      '};',
    ].join('\n'),
    hiddenTests: [
      { call: "(() => {const snap=items=>items.map(item=>[item,Object.getPrototypeOf(item),Object.getOwnPropertyDescriptors(item)]);const unchanged=before=>before.every(([item,p,d])=>Object.getPrototypeOf(item)===p&&Reflect.ownKeys(item).length===Reflect.ownKeys(d).length&&Reflect.ownKeys(d).every(k=>{const a=d[k],b=Object.getOwnPropertyDescriptor(item,k);return b&&Object.is(a.value,b.value)&&a.get===b.get&&a.set===b.set&&a.writable===b.writable&&a.enumerable===b.enumerable&&a.configurable===b.configurable;}));const input=Object.freeze({state:\"rejected\",recordId:\"\",error:\"\"});const before=snap([input]);const result=describeOutcome(input);return [result,unchanged(before)];})()", expected: ["rejected : ", true], criterion: "core" },
      { call: "describeOutcome(Object.freeze({state:\"queued\",recordId:\" a\\n\ud83d\ude00 \",retryAfterMs:Number.MAX_SAFE_INTEGER,error:\"ignored\"}))", expected: "queued  a\n\ud83d\ude00  in 9007199254740991ms", criterion: "discriminant" },
      { call: "describeOutcome({state:\"rejected\",recordId:\"r\".repeat(10000),error:\"e\".repeat(10000)}) === \"rejected \"+\"r\".repeat(10000)+\": \"+\"e\".repeat(10000)", expected: true, criterion: "core" },
      { call: "(() => {const snap=items=>items.map(item=>[item,Object.getPrototypeOf(item),Object.getOwnPropertyDescriptors(item)]);const unchanged=before=>before.every(([item,p,d])=>Object.getPrototypeOf(item)===p&&Reflect.ownKeys(item).length===Reflect.ownKeys(d).length&&Reflect.ownKeys(d).every(k=>{const a=d[k],b=Object.getOwnPropertyDescriptor(item,k);return b&&Object.is(a.value,b.value)&&a.get===b.get&&a.set===b.set&&a.writable===b.writable&&a.enumerable===b.enumerable&&a.configurable===b.configurable;}));const input={state:\"applied\",recordId:\"\ud83d\ude00e\u0301\",retryAfterMs:0,error:\"LEFTOVER\"};const before=snap([input]);const result=describeOutcome(input);return [result,unchanged(before)];})()", expected: ["applied \ud83d\ude00e\u0301", true], criterion: "discriminant" },
      {
        call: "describeOutcome({ state: 'queued', recordId: 'q-1', retryAfterMs: 1500 })",
        expected: 'queued q-1 in 1500ms',
      },
      {
        call: "describeOutcome({ state: 'rejected', recordId: 'x-9', error: 'CROSS_TENANT' })",
        expected: 'rejected x-9: CROSS_TENANT',
        criterion: 'discriminant',
      },
      {
        call: "[{ state: 'rejected', recordId: 'a', error: 'E1' }, { state: 'queued', recordId: 'b', retryAfterMs: 10 }, { state: 'applied', recordId: 'c' }].map(function (one) { return describeOutcome(one); })",
        expected: ['rejected a: E1', 'queued b in 10ms', 'applied c'],
        criterion: 'discriminant',
      },
      {
        call: "describeOutcome({ state: 'applied', recordId: 'r-10', error: 'LEFTOVER' })",
        expected: 'applied r-10',
        criterion: 'discriminant',
      },
      {
        call: "typeof describeOutcome({ state: 'rejected', recordId: 'r-11', error: 'BAD_REQUEST' })",
        expected: 'string',
      },
      {
        call: "describeOutcome({ state: 'queued', recordId: 'r-12', retryAfterMs: 250 }) === describeOutcome({ state: 'queued', recordId: 'r-12', retryAfterMs: 400 })",
        expected: false,
      },
    ],
    hiddenTypeTests: [
      {
        code: "const __hidden1: string = describeOutcome({ state: 'rejected', recordId: 'r-1', error: 'E' });",
        label: 'a rejected outcome describes to text',
      },
      {
        code: "const __hidden2: string = describeOutcome({ state: 'queued', recordId: 'r-2', retryAfterMs: 10 });",
        label: 'a queued outcome describes to text',
      },
      {
        code: "describeOutcome({ recordId: 'r-3' });",
        label: 'an outcome without a state is not a SyncOutcome',
        rejects: true,
      },
      {
        code: "describeOutcome('applied');",
        label: 'a bare string is not a SyncOutcome',
        rejects: true,
      },
      {
        code: "describeOutcome({ state: 'applied', recordId: 'r-4', retryAfterMs: 10 });",
        label: 'an applied outcome carries no retry delay',
        rejects: true,
      },
    ],
  },
};
