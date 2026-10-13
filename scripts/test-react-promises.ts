// The learner engine's private promise scheduler, with expected results kept
// in the host. These exercise cancellation/rejection semantics the React
// suites rely on, not an approximation that treats every job as a success.
import assert from 'node:assert/strict';
import { newQuickJSWASMModuleFromVariant } from 'quickjs-emscripten';
import variant from '@jitl/quickjs-singlefile-cjs-release-sync';
import { REACT_PROMISE_SOURCE } from '../lib/coding/react-promise-source';

const module = await newQuickJSWASMModuleFromVariant(variant);
function run(source: string, second?: string) {
  const runtime = module.newRuntime();
  runtime.setMemoryLimit(32 * 1024 * 1024);
  runtime.setInterruptHandler(() => Date.now() > expires);
  const expires = Date.now() + 1000;
  const vm = runtime.newContext();
  const events: { type: string; reason: string }[] = [];
  const schedule = vm.newFunction('schedule', () => vm.undefined);
  const report = vm.newFunction('report', (type, _promise, reason) => {
    const message = vm.getProp(reason,'message');
    const text = vm.typeof(message) === 'string' ? vm.getString(message) : String(vm.dump(reason));
    message.dispose();
    events.push({ type: vm.getString(type), reason: text });
    return vm.undefined;
  });
  vm.setProp(vm.global,'schedule',schedule); schedule.dispose();
  vm.setProp(vm.global,'report',report); report.dispose();
  const evaluate = (text: string) => {
    const evaluated = vm.evalCode(text);
    if (evaluated.error) { const message = vm.dump(evaluated.error); evaluated.error.dispose(); throw new Error(JSON.stringify(message)); }
    const value = vm.dump(evaluated.value); evaluated.value.dispose(); return value;
  };
  try {
    evaluate(`var kernel=(${REACT_PROMISE_SOURCE})(schedule,report); var Promise=kernel.Promise; var trace=[]; ${source}; kernel.flush();`);
    const first = [...events];
    if (second) evaluate(`${second}; kernel.flush();`);
    return { trace: evaluate('trace'), first, events };
  } finally { vm.dispose(); runtime.dispose(); }
}

assert.deepEqual(run(`Promise.resolve(2).then(value=>value*3).then(value=>trace.push(value));`).trace,[6]);
assert.deepEqual(run(`Promise.resolve({then(resolve,reject){resolve(3);reject('ignored');throw new Error('ignored');}}).then(value=>trace.push(value));`), { trace: [3], first: [], events: [] });
assert.deepEqual(run(`Promise.all([Promise.resolve(1),2,Promise.resolve(3)]).then(value=>trace.push(value));`).trace,[[1,2,3]]);
assert.deepEqual(run(`Promise.allSettled([Promise.reject('abort'),2]).then(value=>trace.push(value));`).trace,[[{status:'rejected',reason:'abort'},{status:'fulfilled',value:2}]]);
assert.deepEqual(run(`Promise.any([Promise.reject('abort'),Promise.resolve(2)]).then(value=>trace.push(value));`).trace,[2]);
assert.deepEqual(run(`Promise.reject('abort').catch(error=>trace.push(error));`).events,[]);
// A then without an error callback handles the parent and rejects its child.
assert.deepEqual(run(`Promise.reject('abort').then(value=>value);`).events,[{type:'unhandled',reason:'abort'}]);
assert.deepEqual(run(`Promise.resolve(1).then(()=>{throw new Error('callback');});`).events,[{type:'unhandled',reason:'callback'}]);
const late = run(`var rejected=Promise.reject('late');`, `rejected.catch(error=>trace.push(error));`);
assert.deepEqual(late.first,[{type:'unhandled',reason:'late'}]);
assert.deepEqual(late.events,[{type:'unhandled',reason:'late'},{type:'handled',reason:'late'}]);
assert.deepEqual(late.trace,['late']);
assert.deepEqual(run(`Promise.resolve(4).finally(()=>Promise.resolve(9)).then(value=>trace.push(value));`).trace,[4]);
assert.deepEqual(run(`Promise.reject('abort').finally(()=>{});`).events,[{type:'unhandled',reason:'abort'}]);
assert.deepEqual(run(`var resolveSelf;var self=new Promise(resolve=>{resolveSelf=resolve});resolveSelf(self);`).events,[{type:'unhandled',reason:'A promise cannot resolve itself'}]);
assert.deepEqual(run(`var value=Promise.resolve(7);Object.defineProperty(value,'then',{value:()=>{throw new Error('public then');}});kernel.subscribe(value,result=>trace.push(result),()=>{});`).trace,[7]);
console.log('PASS React promise kernel: ordering, assimilation, once-only settlement, children, finally, self-resolution, private subscriptions and late handling');
