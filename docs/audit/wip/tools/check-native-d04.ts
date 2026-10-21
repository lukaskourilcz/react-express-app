import {writeFileSync} from 'node:fs';
import {buildSandboxWorker} from '../../../../scripts/build-sandbox-worker.mjs';
import assert from 'node:assert/strict';
import {pathById,activityIn} from '../../../../lib/learning-paths/catalog';
import {gradePathCode} from '../../../../lib/learning-paths/grade';
import {solutionFor} from '../../../../lib/learning-paths/solutions';
await buildSandboxWorker();
const path=pathById('dsa-foundations')!;
const candidates={
 'dsa-v1-d04-stack-api':{
 alternative:'function createStack(){let top=null,length=0;return {push(value){top={value,next:top};length++;},pop(){if(!top)return null;const value=top.value;top=top.next;length--;return value;},peek(){return top?top.value:null;},size(){return length;}};}',
 'wrong-copy-object':'function createStack(){const a=[];const copy=v=>v&&typeof v==="object"?{...v}:v;return {push(v){a.push(v);},pop(){return a.length?copy(a.pop()):null;},peek(){return a.length?copy(a[a.length-1]):null;},size(){return a.length;}};}',
 'wrong-falsey':'function createStack(){const a=[];return {push(v){a.push(v);},pop(){return a.pop()||null;},peek(){return a[a.length-1]||null;},size(){return a.length;}};}',
 'wrong-fifo':'function createStack(){const a=[];return {push(v){a.push(v);},pop(){return a.length?a.shift():null;},peek(){return a.length?a[0]:null;},size(){return a.length;}};}',
 'wrong-shared':'const shared=[];function createStack(){return {push(v){shared.push(v);},pop(){return shared.length?shared.pop():null;},peek(){return shared.length?shared[shared.length-1]:null;},size(){return shared.length;}};}',
 },
 'dsa-v1-d04-head-index-queue':{
 alternative:'function createQueue(){const a=newQueueBuffer();let head=0;return {enqueue(v){a[a.length]=v;},dequeue(){if(head>=a.length)return null;return a[head++];},size(){return a.length-head;}};}',
 'alternative-definition':'function createQueue(){const a=newQueueBuffer();let h=0;return {enqueue(value){Object.defineProperty(a,String(a.length),{value,writable:true,enumerable:true,configurable:true});},dequeue(){return h<a.length?a[h++]:null;},size(){return a.length-h;}};}',
 'wrong-copy-object':'function createQueue(){const a=newQueueBuffer();let h=0;return {enqueue(v){a.push(v);},dequeue(){if(h>=a.length)return null;const v=a[h++];return v&&typeof v==="object"?{...v}:v;},size(){return a.length-h;}};}',
 'wrong-falsey':'function createQueue(){const a=newQueueBuffer();let h=0;return {enqueue(v){a.push(v);},dequeue(){return h<a.length?a[h++]||null:null;},size(){return a.length-h;}};}',
 'wrong-many-definitions':'function createQueue(){const a=newQueueBuffer();let h=0;return {enqueue(value){a.push(value);for(let i=0;i<10;i++)Object.defineProperty(a,String(a.length-1),{value,writable:true,enumerable:true,configurable:true});},dequeue(){if(h>=a.length)return null;const v=a[h];a[h++]=null;return v;},size(){return a.length-h;}};}',
 'wrong-movement':'function createQueue(){const a=newQueueBuffer();let length=0;return {enqueue(v){a.push(v);length++;},dequeue(){if(!length)return null;const v=a[0];for(let i=1;i<length;i++)a[i-1]=a[i];length--;a.length=length;return v;},size(){return length;}};}',
 },
 'dsa-v1-d04-balanced-brackets':{
 alternative:'function isBalanced(text){const open=[];const left="([{",right=")]}";for(const c of text){const index=left.indexOf(c);if(index!==-1)open.push(index);else if(open.pop()!==right.indexOf(c))return false;}return !open.length;}',
 'wrong-counts':'function isBalanced(text){return ["()","[]","{}"].every(pair=>[...text].filter(c=>c===pair[0]).length===[...text].filter(c=>c===pair[1]).length);}',
 'wrong-depth-only':'function isBalanced(text){let count=0;for(const c of text){count+="([{ ".includes(c)?1:-1;if(count<0)return false;}return count===0;}',
 'wrong-ignores-leftover':'function isBalanced(text){const open=[],partners={")":"(","]":"[","}":"{"};for(const c of text){if(c in partners){if(open.pop()!==partners[c])return false;}else open.push(c);}return true;}',
 }
};
const results=[];for(const[id,manual]of Object.entries(candidates)){const activity=activityIn(path,id)!.activity;for(const[label,source]of Object.entries({reference:solutionFor(id)!.solution,starter:activity.code!.starter,...manual})){const result=await gradePathCode(activity,activity.code!,source);const expected=label === "starter" || label.startsWith("wrong-") ? "needs_revision" : "verified_pass"; assert.equal(result.state,expected,`${id}/${label}`); results.push({id,label,state:result.state,expected,outcome:result.code.outcome,source});}}
writeFileSync(process.argv[2],JSON.stringify(results,null,2),{mode:0o600});console.log(JSON.stringify(results.map(({id,label,state})=>({id,label,state}))));
