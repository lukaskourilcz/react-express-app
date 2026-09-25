import assert from 'node:assert/strict';
import { runInSandbox } from '../lib/coding/sandbox';
import { handleCodingSubmit } from '../lib/coding/handlers';
import { encodeCodingSession } from '../lib/quiz-tokens';

const attacks = [
  ['replace comparison', 'globalThis.__deepEqual=()=>true; function answer(){return 0}'],
  ['replace expected answer', 'globalThis.__expect=[0]; function answer(){return 0}'],
  ['replace evaluator', 'globalThis.eval=()=>1; function answer(){return 0}'],
  ['replace intrinsic equality', 'Object.is=()=>true; function answer(){return 0}'],
  ['replace serializer', 'JSON.stringify=()=>\'[ {"pass":true,"actual":"1","error":null} ]\'; function answer(){return 0}'],
  ['forge completion', 'function answer(){globalThis.__done=true;globalThis.__out=\'[ {"pass":true,"actual":"1","error":null} ]\';return new Promise(()=>{})}'],
  ['replace promise combinator', 'Promise.all=()=>Promise.resolve([{ok:true,value:1}]);function answer(){return 0}'],
  ['poison prototype serializer', 'Array.prototype.toJSON=()=>[{pass:true,actual:"1",error:null}];function answer(){return 0}'],
  ['read controller closure', 'function answer(){return __expect[0]}'],
  ['read caller arguments', 'function answer(){return answer.caller.arguments[0]}'],
] as const;
for (const [name, code] of attacks) {
  const run = await runInSandbox({ code, calls: ['answer()'], expectations: [1] });
  assert(!run.results.some(result => result.pass === true), `${name}: forged a pass`);
  console.log(`PASS integrity: ${name}`);
}
const special = await runInSandbox({code:'function answer(){return {a:undefined,b:[NaN,Infinity,-Infinity,-0]}}',calls:['answer()'],expectations:[{a:undefined,b:[NaN,Infinity,-Infinity,-0]}]});
assert.equal(special.results[0]?.pass, true);
const clean = await runInSandbox({code:'function answer(){return 1}',calls:['answer()'],expectations:[1]});
assert.equal(clean.results[0]?.pass, true, 'an attack must not poison the next run');
console.log('PASS integrity: lossless values and fresh run');

// Hidden checks run in the same program as the visible ones. What they print
// must never reach the learner: a console.log inside the function would
// otherwise hand back every hidden input after Submit.
const echo = 'const echo = x => { console.log("saw", x); return x; };';
const everyCall = await runInSandbox({ code: echo, calls: ['echo(1)', 'echo(2)', 'echo(424242)'], expectations: [1, 2, 424242] });
assert.deepEqual(everyCall.logs, ['saw 1', 'saw 2', 'saw 424242'], 'without a split every call is shown');
const split = await runInSandbox({ code: echo, calls: ['echo(1)', 'echo(2)', 'echo(424242)'], expectations: [1, 2, 424242], shownCalls: 2 });
assert.deepEqual(split.results.map((result) => result.pass), [true, true, true], 'hidden calls are still graded');
assert.deepEqual(split.logs, ['saw 1', 'saw 2'], 'a hidden call prints nothing the learner sees');
const later = await runInSandbox({
  code: 'const echo = async x => { await new Promise((done) => setTimeout(done, x === 424242 ? 1 : 50)); console.log("after", x); return x; };',
  calls: ['echo(1)', 'echo(424242)'], expectations: [1, 424242], shownCalls: 1,
});
assert.deepEqual(later.results.map((result) => result.pass), [true, true]);
assert.deepEqual(later.logs, ['after 1'], 'a hidden call cannot print before a slower shown call settles');
const hung = await runInSandbox({
  code: 'const echo = x => { console.log("saw", x); if (x === 424242) while (true) {} return x; };',
  calls: ['echo(1)', 'echo(424242)'], expectations: [1, 424242], shownCalls: 1, deadlineMs: 300,
});
assert.equal(hung.timedOut, true);
assert(!hung.logs.some((line) => line.includes('424242')), 'a hidden call that hangs still prints nothing');
console.log('PASS integrity: hidden calls print nothing the learner sees');

// The same through the Submit handler: js-digit-sum has three hidden checks
// (99999, 305 and 10). An anonymous submit grades without a database.
const response = { statusCode: 200, body: null as null | { verdict?: string; hidden?: unknown; logs?: string[] }, setHeader() {}, status(code: number) { this.statusCode = code; return this; }, json(body: never) { this.body = body; return this; } };
await handleCodingSubmit({
  method: 'POST', headers: {},
  body: {
    session: encodeCodingSession({ taskId: 'js-digit-sum', track: 'javascript', userId: null }),
    code: 'const digitSum = n => { console.log("digitSum of", n); let total = 0; while (n > 0) { total += n % 10; n = Math.floor(n / 10); } return total; };',
  },
} as never, response as never, null);
assert.equal(response.statusCode, 200, JSON.stringify(response.body));
assert.equal(response.body?.verdict, 'passed');
assert.deepEqual(response.body?.hidden, { passed: 3, total: 3 });
assert.deepEqual(response.body?.logs, ['digitSum of 493', 'digitSum of 1234', 'digitSum of 0', 'digitSum of 7', 'digitSum of 1000'], 'Submit returns only the visible calls\' console output');
console.log('PASS integrity: Submit shows the visible checks\' console only');
