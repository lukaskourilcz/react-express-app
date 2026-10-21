import assert from 'node:assert/strict';
import { compileReactLearner } from '../lib/coding/react-transpile';
import { runReactSuite } from '../lib/coding/react-runner';

export const SPREAD_PROBE_SOURCE = `const __sharkSpreadData='authored';
export function probe(){
  const trace=[], symbol=Symbol('own');
  const source={constructor:1,toString:'ordinary',['__proto__']:'data',[symbol]:4};
  Object.defineProperty(source,'hidden',{value:10});
  Object.defineProperty(source,'a',{enumerable:true,get(){trace.push('get-a');return 3;}});
  const result={...source,end:(trace.push('last'),2),...{constructor:9}};
  const descriptor=Object.getOwnPropertyDescriptor(result,'a');
  return {constructor:result.constructor,own:Object.hasOwn(result,'constructor'),toString:result.toString,
    protoValue:result['__proto__'],safePrototype:Object.getPrototypeOf(result)===Object.prototype,
    symbol:result[symbol],hidden:Object.hasOwn(result,'hidden'),trace,collision:__sharkSpreadData,
    data:descriptor.value===3&&descriptor.get===undefined&&descriptor.writable&&descriptor.enumerable&&descriptor.configurable,
    frozen:Object.isFrozen(Object.prototype),nullish:Object.keys({...null,...undefined,...false}).length};
}
export function dictionary(){const counts=['constructor','toString','__proto__','constructor'].reduce((counts,key)=>({...counts,[key]:(Object.hasOwn(counts,key)?counts[key]:0)+1}),{});return [Object.keys(counts),counts.constructor,counts.toString,counts['__proto__']];}
export async function later(){await Promise.resolve();return probe().constructor;}
export default function App(){return null;}`;

export const SPREAD_PROBE_SUITE = `import{probe,dictionary,later}from'./App';
test('spread creates own data without mutating frozen dependencies',()=>{
  expect(probe()).toEqual({constructor:9,own:true,toString:'ordinary',protoValue:'data',safePrototype:true,
    symbol:4,hidden:false,trace:['get-a','last'],collision:'authored',data:true,frozen:true,nullish:0});
});
test('ordinary dictionary keys can shadow frozen inherited names',()=>{
  expect(dictionary()).toEqual([['constructor','toString','__proto__'],2,1,1]);
});
test('async lowering still uses controlled promises',async()=>{expect(await later()).toBe(9);});`;

export async function reactSpreadContracts(): Promise<void> {
  const compiled = compileReactLearner(SPREAD_PROBE_SOURCE);
  assert.match(compiled, /__awaiter/, 'async must remain downleveled');
  assert.doesNotMatch(compiled, /Object\.assign\(/, 'spread uses property creation');
  assert.match(compileReactLearner('export const copy = x => Object.assign({}, x);', false), /Object\.assign\(/,
    'an authored Object.assign retains its own semantics');
  const valid = await runReactSuite({ appSource: SPREAD_PROBE_SOURCE, suite: SPREAD_PROBE_SUITE });
  assert.equal(valid.compileError, null, JSON.stringify(valid));
  assert.equal(valid.total, 3);
  assert.equal(valid.failed, 0, JSON.stringify(valid));
  const wrong = await runReactSuite({ appSource: SPREAD_PROBE_SOURCE.replace('...{constructor:9}', '...{constructor:8}'), suite: SPREAD_PROBE_SUITE });
  assert.equal(wrong.compileError, null, JSON.stringify(wrong));
  assert.equal(wrong.total, 3);
  assert.equal(wrong.failed, 2, JSON.stringify(wrong));
  console.log('PASS isolated spread: own reserved keys, getters, symbols, ordering, descriptors, helper collision and controlled async; wrong values fail.');
}
