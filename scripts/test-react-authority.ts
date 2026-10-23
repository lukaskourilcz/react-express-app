import assert from 'node:assert/strict';
import { runReactSuite } from '../lib/coding/react-runner';
import { guestResultLine, readGuestResult, serializeGuestResult } from '../lib/coding/react-guest';
import { LOG_LINE_CUT, MAX_LOG_LINE_CHARS } from '../shared/coding-evaluate';
import { reactSpreadContracts } from './react-spread-contract';
import { runInNewContext } from 'node:vm';
import { lockDownRealm } from '../lib/coding/realm-lockdown';
import { reactRecordContracts } from './react-record-contract';

await reactSpreadContracts();
await reactRecordContracts();

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
const classes=await runReactSuite({suite:`import React from 'react';import{render,fireEvent}from'@testing-library/react';import App from './App';test('class state and callbacks remain supported',()=>{const{container}=render(<App/>);expect(container.textContent).toContain('0');fireEvent.click(container.querySelector('button'));fireEvent.click(container.querySelector('button'));expect(container.querySelector('p').textContent).toBe('2');expect(container.querySelector('span').textContent).toBe('2');});`,appSource:`import React from 'react';export default class App extends React.Component{constructor(props){super(props);this.state={count:0};this.last=0;}add(){this.setState(state=>({count:state.count+1}),function(){this.last=this.state.count;this.forceUpdate();});}render(){return <main><p>{this.state.count}</p><span>{this.last}</span><button onClick={()=>this.add()}>Add</button></main>;}}`});
assert.equal(classes.compileError,null,JSON.stringify(classes));assert.equal(classes.failed,0,JSON.stringify(classes));

// IME confirmation is a native keyboard-event flag. A correct handler must
// see it through nativeEvent and a native listener, without gaining write
// access to the host event or any grading capability.
const compositionSuite = `import React from 'react';
import {render,fireEvent,within} from '@testing-library/react';
import App from './App';
test('composing Enter stays pending and a normal Enter commits',()=>{
  const view=render(<App/>),q=within(view.container),input=q.getByLabelText('Draft');
  fireEvent.change(input,{target:{value:'日本語'}});
  expect(fireEvent.keyDown(input,{key:'Enter',isComposing:true})).toBe(true);
  expect(input.value).toBe('日本語');expect(q.getByLabelText('Committed').textContent).toBe('0');
  expect(fireEvent.keyDown(input,{key:'Enter',isComposing:false})).toBe(false);
  expect(input.value).toBe('');expect(q.getByLabelText('Committed').textContent).toBe('1');
});
test('native listeners observe the same read-only composition flag',()=>{
  const view=render(<App/>),q=within(view.container);
  const composing=new KeyboardEvent('keydown',{key:'x',bubbles:true,cancelable:true,isComposing:true});
  fireEvent(window,composing);expect(composing.isComposing).toBe(true);
  expect(q.getByLabelText('Native flag').textContent).toBe('true');
  fireEvent.keyDown(window,{key:'x',isComposing:false});
  expect(q.getByLabelText('Native flag').textContent).toBe('false');
});`;
const compositionApp = `import React,{useEffect,useState} from 'react';
export default function App(){
  const[value,setValue]=useState(''),[committed,setCommitted]=useState(0),[flag,setFlag]=useState('unset');
  useEffect(()=>{const listener=event=>{try{event.isComposing=false;}catch{}setFlag(String(event.isComposing));};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[]);
  return <main><label>Draft<input value={value} onChange={event=>setValue(event.target.value)} onKeyDown={event=>{if(event.nativeEvent.isComposing)return;if(event.key==='Enter'){event.preventDefault();setCommitted(n=>n+1);setValue('');}}}/></label><output aria-label="Committed">{committed}</output><output aria-label="Native flag">{flag}</output></main>;
}`;
const composition=await runReactSuite({suite:compositionSuite,appSource:compositionApp});
assert.equal(composition.compileError,null,JSON.stringify(composition));
assert.deepEqual(composition.cases.map(one=>one.status),['pass','pass'],JSON.stringify(composition));
const prematureComposition=await runReactSuite({suite:compositionSuite,appSource:compositionApp.replace('if(event.nativeEvent.isComposing)return;','')});
assert.equal(prematureComposition.compileError,null,JSON.stringify(prematureComposition));
assert.deepEqual(prematureComposition.cases.map(one=>one.status),['fail','pass'],JSON.stringify(prematureComposition));

// Error text a component produces is cut before it reaches the verdict. A
// failed `toBe` on 300 000 rendered characters, or a message thrown that
// long, made the verdict line too long for the API to read, and the learner's
// own mistake was answered as a grader outage.
const longSuite=`import React from 'react';import {render} from '@testing-library/react';import App from './App';test('shows the word',()=>{const {container}=render(<App/>);expect(container.textContent).toBe('word');});`;
for(const appSource of [
  `export default function App(){return <p>{'w'.repeat(300000)}</p>;}`,
  `throw new Error('q'.repeat(300000));export default function App(){return null;}`,
  `export default function App(){throw new Error('r'.repeat(300000));}`,
]) {
  const result=await runReactSuite({suite:longSuite,appSource});
  assert.equal(result.failed,1,appSource);
  for(const text of [result.compileError,...result.cases.map(one=>one.error)]) assert.ok((text??'').length<=MAX_LOG_LINE_CHARS+LOG_LINE_CUT.length,`${appSource}: ${(text??'').length} characters`);
  const nonce='a'.repeat(48);
  assert.equal(readGuestResult(guestResultLine(nonce,serializeGuestResult(result)),nonce,longSuite).failed,1,appSource);
}

console.log('PASS React authority: DOM, intrinsics, modules, elements, synchronous/async assertions, detached rejections and long error text');

// The guest freezes every standard built-in before learner code runs
// (lib/coding/realm-lockdown.ts). The list is checked against the names a
// fresh realm of this Node has: SuppressedError, DisposableStack and
// AsyncDisposableStack arrived with Node 24 and were left writable. Last in
// this file, because it freezes this process.
lockDownRealm();
const notBuiltIns=new Set(['Infinity','NaN','undefined','globalThis','eval','console','WebAssembly']);
const realmNames=(runInNewContext('Object.getOwnPropertyNames(globalThis)') as string[]).filter(name=>!notBuiltIns.has(name));
assert.ok(realmNames.includes('Object')&&realmNames.length>50,'the fresh realm lists its built-ins');
for(const name of realmNames) {
  const value=(globalThis as Record<string,unknown>)[name] as {prototype?:unknown}|undefined;
  assert.ok(value!==undefined,`${name} exists here`);
  assert.ok(Object.isFrozen(value)||value===Error,`${name} is frozen`);
  if(value.prototype&&typeof value.prototype==='object') assert.ok(Object.isFrozen(value.prototype),`${name}.prototype is frozen`);
}
console.log(`PASS React authority: realm lockdown freezes all ${realmNames.length} built-ins of this Node`);
