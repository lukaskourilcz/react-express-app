// Read-only native/worker differential evidence for GitHub #422.
// Bundle with esbuild (platform=node, format=esm, packages=external) and run
// from the repository root. A mismatch deliberately exits 1; this is not a
// passing CI gate while the documented engine gap remains unresolved.
// Comparison-call counts are implementation-dependent and are not asserted.
import {runChecks} from '../../../../lib/coding/sandbox';
const code=`const inspect=mode=>{
 let input, writes=[];
 if(mode==='empty') input=Object.freeze([]);
 if(mode==='singleton') input=Object.freeze([1]);
 if(mode==='sorted') input=Object.freeze([0,1]);
 if(mode==='unsorted') input=Object.freeze([1,0]);
 if(mode==='equal') input=Object.freeze([1,1]);
 if(mode==='holes') input=Object.freeze(Array(2));
 if(mode==='trailing-value') {input=Array(2); input[1]=1;Object.freeze(input);}
 if(mode==='leading-value') {input=Array(2); input[0]=1;Object.freeze(input);}
 if(mode==='readonly-index') {input=[0,1];Object.defineProperty(input,'0',{writable:false});}
 if(mode==='readonly-swap') {input=[1,0];Object.defineProperty(input,'0',{writable:false});}
 if(mode==='generic-readonly') {input={length:1};Object.defineProperty(input,'0',{value:1,enumerable:true,writable:false,configurable:true});}
 if(mode==='setter') {input={length:2,1:2};Object.defineProperty(input,'0',{enumerable:true,configurable:true,get(){return 1;},set(v){writes.push(v);}});}
 if(mode==='proxy-false') input=new Proxy([0,1],{set(){writes.push('set');return false;}});
 let outcome='returned';try{Array.prototype.sort.call(input,(a,b)=>a-b);}catch(e){outcome=e.name;}
 return [outcome,Array.from({length:input.length},(_,i)=>i in input?input[i]:'hole'),writes];
};`;
const inspect=Function('"use strict";'+code+';return inspect;')();
const modes=['empty','singleton','sorted','unsorted','equal','holes','trailing-value','leading-value','readonly-index','readonly-swap','generic-readonly','setter','proxy-false'];
const tests=modes.map(mode=>({call:'inspect('+JSON.stringify(mode)+')',expected:inspect(mode)}));
const result=await runChecks({code,visible:tests,hidden:[],shuffle:list=>[...list]});
console.log(JSON.stringify({node:process.version,cases:modes.map((mode,i)=>({mode,expected:tests[i].expected,...result.visible.results[i]}))},null,2));

if (result.visible.codeError || result.visible.results.some(check => !check.pass)) process.exitCode = 1;
