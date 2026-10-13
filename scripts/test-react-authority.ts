import assert from 'node:assert/strict';
import { runReactSuite } from '../lib/coding/react-runner';

const suite=`import React from 'react';
import {render} from '@testing-library/react';
import App from './App';
test('trusted DOM observation',()=>{const {container}=render(<App/>);expect(container.textContent).toBe('correct');});
test('trusted synchronous assertion',()=>{render(<App/>);expect(['wrong'].every(value=>value==='correct')).toBe(true);});
test('trusted asynchronous assertion',async()=>{render(<App/>);await Promise.resolve();expect('wrong'.includes('correct')).toBe(true);});`;
const attempts=[
  `try { Array.prototype.every=()=>true; String.prototype.includes=()=>true; } catch {}`,
  `try { Object.defineProperty(Object.getPrototypeOf(document.body),'textContent',{get:()=> 'correct'}); } catch {}`,
  `for(const symbol of Object.getOwnPropertySymbols(document.body)) {try {document.body[symbol]._textContent='correct';}catch{}}`,
  `try { Promise.prototype.then=function(resolve){resolve();return this;}; } catch {}`,
  `try { React.useState=()=>[true,()=>{}]; } catch {}`,
  `try { const owner=React.createElement('p')._owner; owner.stateNode.expect=()=>({toBe(){}}); } catch {}`,
  `try { window.document.defaultView.expect=()=>({toBe(){}}); } catch {}`,
  `try { require('@testing-library/react').configure({asyncWrapper:async()=>undefined}); } catch {}`,
  `try { document.createElement.constructor('return process')().stdout.write('passed'); } catch {}`,
];
for(const attack of attempts) {
  const result=await runReactSuite({suite,appSource:`import React from 'react';${attack}\nexport default function App(){return <p>wrong</p>;}`});
  assert.equal(result.compileError,null,attack);
  assert.deepEqual(result.cases.map(one=>one.status),['fail','fail','fail'],attack);
}
const privateDOM=await runReactSuite({suite:`import {inspect} from './App';test('DOM capabilities expose no implementation, realm or prototype',()=>{expect(inspect()).toEqual({symbols:0,implementation:'undefined',realm:'undefined',owner:'undefined',testing:'blocked'});});`,appSource:`import React from 'react';export function inspect(){let testing='blocked';try{require('@testing-library/react');testing='reached';}catch{}return {symbols:Object.getOwnPropertySymbols(document.body).length,implementation:typeof document.body._impl,realm:typeof document.defaultView,owner:typeof React.createElement('div')._owner,testing};}export default function App(){return null;}`});
assert.equal(privateDOM.compileError,null);assert.equal(privateDOM.failed,0,JSON.stringify(privateDOM));
const rejection=await runReactSuite({suite:`import React from 'react';import {render} from '@testing-library/react';import App from './App';test('downlevelled detached async rejection remains observable',async()=>{const seen=[];const listener=event=>{seen.push(event.reason.message);event.preventDefault();};window.addEventListener('unhandledrejection',listener);try{render(<App/>);await new Promise(resolve=>setTimeout(resolve,20));}finally{window.removeEventListener('unhandledrejection',listener);}expect(seen).toEqual(['detached']);});`,appSource:`import React,{useEffect} from 'react';export default function App(){useEffect(()=>{void(async()=>{await Promise.resolve();throw new Error('detached');})();},[]);return null;}`});
assert.equal(rejection.compileError,null);assert.equal(rejection.failed,0,JSON.stringify(rejection));
console.log('PASS React authority: DOM, intrinsics, modules, elements, synchronous/async assertions and detached rejections');
