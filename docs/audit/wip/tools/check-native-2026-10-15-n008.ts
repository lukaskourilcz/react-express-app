import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash, nativeGradingHash } from '../../../../lib/learning-paths/audit';
import { gradeCheck } from '../../../../lib/learning-paths/grade';
const module = LEARNING_PATHS.find(p=>p.id==='dsa-foundations')!.modules.find(m=>m.id==='dsa-v1-d08')!;
const [l1,l2] = module.lessons;
const snippets = module.lessons.flatMap(l=>l.sections.flatMap(s=>s.kind==='code'?[s.code]:[]));
type Sort = (values:number[],compare:(a:number,b:number)=>number)=>number[];
// Only these individually read authored contexts run on the host.
const selection = new Function(snippets.find(s=>s.startsWith('const selectionSort'))+'\nreturn selectionSort;')() as Sort;
const insertion = new Function(snippets.find(s=>s.startsWith('const insertionSort'))+'\nreturn insertionSort;')() as Sort;
const mergeSource=snippets.find(s=>s.startsWith('const merge ='))!;
const merge = new Function(mergeSource+'\nreturn merge;')() as (a:number[],b:number[],compare:(a:number,b:number)=>number)=>number[];
const mergeSort = new Function(mergeSource+'\n'+snippets.find(s=>s.startsWith('const mergeSort'))+'\nreturn mergeSort;')() as Sort;
for(const n of [0,1,2,4,8,16]) {
 for(const [values,expected] of [[Array.from({length:n},(_,i)=>i),Math.max(0,n-1)],[Array.from({length:n},(_,i)=>n-i),n*(n-1)/2]] as [number[],number][]) {
  let calls=0;const input=[...values];assert.equal(insertion(input,(a,b)=>{calls++;return a-b;}),input);assert.equal(calls,expected===0?0:expected);
  calls=0;selection([...values],(a,b)=>{calls++;return a-b;});assert.equal(calls,n<2?0:n*(n-1)/2);
 }
}
const traces=l1.sections.flatMap(s=>s.kind==='trace'?[s.trace]:[]);
assert.equal(traces.length,2);
assert.deepEqual(traces[0].frames.map(f=>f.counter?.value),[0,3,3,5,6,6]);
assert.deepEqual(traces[0].frames.map(f=>f.cells),[
 ['4','2','7','1'],['4','2','7','1'],['1','2','7','4'],['1','2','7','4'],['1','2','7','4'],['1','2','4','7'],
]);
assert.deepEqual(traces[1].frames.map(f=>f.counter?.value),[0,1,2,3,3,5,6]);
assert.deepEqual(traces[1].frames.map(f=>f.cells),[
 ['4','2','7','1'],['4','2','7','1'],['2','4','7','1'],['2','4','7','1'],['2','4','1','7'],['2','1','4','7'],['1','2','4','7'],
]);
let mergeCalls=0;
assert.deepEqual(merge([2,5,8],[1,4,9],(a,b)=>{mergeCalls++;return a-b;}),[1,2,4,5,8,9]);
assert.equal(mergeCalls,5);
const mergeTrace=l2.sections.find(s=>s.kind==='trace');assert(mergeTrace?.kind==='trace');
assert.deepEqual(mergeTrace.trace.frames.map(f=>f.counter?.value),[0,1,2,3,4,5,5]);
mergeCalls=0;mergeSort([1,2,3,4,5,6,7,8],(a,b)=>{mergeCalls++;return a-b;});assert.equal(mergeCalls,12);
let worst=0;
const permutations=(values:number[]):number[][]=>values.length===0?[[]]:values.flatMap((value,index)=>permutations(values.filter((_,i)=>i!==index)).map(rest=>[value,...rest]));
for(const input of permutations([1,2,3,4,5,6,7,8])) {
 let count=0;mergeSort(input,(a,b)=>{count++;return a-b;});worst=Math.max(worst,count);
}
assert.equal(worst,17);
assert.deepEqual(merge([],[],(a,b)=>a-b),[]);
// A sorted array distinguishes total write claims: insertion writes n-1
// saved elements while a strict early-exit adjacent bubble pass swaps none.
const sorted=[1,2,3,4,5,6,7,8];let insertionWrites=0;
insertion(new Proxy([...sorted],{set(target,key,value){if(typeof key==='string'&&/^\d+$/.test(key))insertionWrites++;return Reflect.set(target,key,value);}}),(a,b)=>a-b);
assert.equal(insertionWrites,7);
let bubbleSwaps=0;for(let i=0;i<sorted.length-1;i++)if(sorted[i]>sorted[i+1])bubbleSwaps++;
assert.equal(bubbleSwaps,0);
const reads=module.activities.filter(a=>a.kind==='lesson');assert.equal(reads.length,2);
for(const read of reads){assert.equal(read.verification,'self_reviewed');assert(module.lessons.some(l=>l.id===read.lessonId));}
const check=module.activities.find(a=>a.id==='dsa-v1-d08-checks')!;
const key=check.questions!.map(q=>q.correct);assert.equal(key.length,4);assert.equal(gradeCheck(check,key,key).state,'verified_pass');
for(let i=0;i<4;i++){const answers=[...key];answers[i]=(answers[i]+1)%4;const result=gradeCheck(check,key,answers);assert.equal(result.state,'needs_revision');assert.equal(result.keyWithheld,false);}
assert(process.argv[2]);
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:[
 ...[l1,l2].map(l=>({id:l.id,contentHash:nativeContentHash(l),gradingHash:null})),
 ...[...reads,check].map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})),
],checks:['actual authored comparison counts','all three trace sequences','12 sorted and 17 worst comparisons across all eight-value permutations',
 'empty merge and sorted-input write counterexample','two self-reviewed links and four-question threshold',
 'cost/storage generalization is manual, not timing or heap measurement']},null,2),{mode:0o600});
console.log('PASS five native sorting lesson/reading/check records: counts, traces, write caveat and linked feedback');
