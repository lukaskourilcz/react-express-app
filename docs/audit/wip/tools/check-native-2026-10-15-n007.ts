import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash, nativeGradingHash } from '../../../../lib/learning-paths/audit';
import { codingTaskById } from '../../../../lib/coding/active';
import { solutionFor } from '../../../../lib/coding/solutions';
import { gradePathCode, codeFromReusedTask } from '../../../../lib/learning-paths/grade';
import { assessComplexity } from '../../../../lib/coding/complexity';
import { codingPassXp } from '../../../../shared/coding-complexity';
const path = LEARNING_PATHS.find(p => p.id === 'dsa-foundations')!;
const activity = path.modules.find(m => m.id === 'dsa-v1-d07')!.activities.find(a => a.id === 'dsa-v1-d07-binary-search')!;
const task = codingTaskById(activity.reuseTaskId!)!;
assert.equal(task.id, 'js-binary-search');
assert.equal(task.tier, 3);
assert(activity.summary.en.includes('shared coding reward rules'));
assert(!activity.summary.en.includes('no coding XP'));
const revealed = solutionFor(task.id)!;
const manual = JSON.parse(readFileSync(process.argv[2], 'utf8'))[task.id] as Record<string, string>;
const worker = [];
for (const [label, source] of Object.entries({ reference:revealed.solution,junior:revealed.junior!,senior:revealed.senior!,starter:task.starter,...manual })) {
  const result = await gradePathCode(activity, codeFromReusedTask(task), source);
  const expected = label === 'starter' || label.startsWith('wrong-') ? 'needs_revision' : 'verified_pass';
  assert.equal(result.state, expected, label);
  if (expected === 'verified_pass') assert.equal(codingPassXp(assessComplexity(task,source)),25);
  worker.push({label,state:result.state,expected});
}
assert.equal(worker.length,8);
const module = path.modules.find(m => m.id === 'dsa-v1-d08')!;
const questions = module.activities.flatMap(a => a.questions ?? []);
assert.equal(questions.length,4);
const snippets = module.lessons.flatMap(l => l.sections.flatMap(s => s.kind === 'code' ? [s.code] : []));
// Host execution is restricted to these individually read authored snippets.
const insertionSource = snippets.find(s => s.startsWith('const insertionSort'))!;
const insertion = new Function(insertionSource+'\nreturn insertionSort;')() as (a:any[],compare:(a:any,b:any)=>number)=>any[];
const selection = new Function(questions[2].context!.code+'\nreturn selectionSort;')() as typeof insertion;
const mergeSource = snippets.find(s => s.startsWith('const merge ='))!;
const merge = new Function(mergeSource+'\nreturn merge;')() as (a:any[],b:any[],compare:(a:any,b:any)=>number)=>any[];
const merges: number[] = [];
const mergeSort = new Function('merge',questions[3].context!.code+'\nreturn mergeSort;')((a:any[],b:any[],cmp:(a:any,b:any)=>number)=>{
  merges.push(a.length+b.length);return merge(a,b,cmp);
}) as typeof insertion;
const report = [{customer:'A',date:1},{customer:'B',date:1},{customer:'C',date:0}];
const byDate = (a:any,b:any) => a.date-b.date;
assert.deepEqual(insertion([...report],byDate).map(r=>r.customer),['C','A','B']);
assert.deepEqual(mergeSort([...report],byDate).map(r=>r.customer),['C','A','B']);
assert.deepEqual(selection([...report],byDate).map(r=>r.customer),['C','B','A']);
for (const values of [[1,2,3,4,5,6,7,8],[8,7,6,5,4,3,2,1],[1,1,1,1,1,1,1,1]]) {
  let calls=0; const input=[...values];
  assert.equal(selection(input,(a,b)=>{calls++;return a-b;}),input);
  assert.equal(calls,28);
}
const pairs: number[][]=[];
selection([3,2,1],(a,b)=>{pairs.push([a,b]);return a-b;});
assert.deepEqual(pairs,[[2,3],[1,2],[3,2]]);
const original=[3,1,2];
assert.equal(insertion(original,(a,b)=>a-b),original);
const mergeInput=Object.freeze([8,7,6,5,4,3,2,1]);
merges.length=0;
const sorted=mergeSort(mergeInput as unknown as any[],(a,b)=>a-b);
assert.deepEqual(sorted,[1,2,3,4,5,6,7,8]);
assert.notEqual(sorted,mergeInput);
assert.deepEqual(merges.slice().sort((a,b)=>a-b),[2,2,2,2,4,4,8]);
for (const size of [2,4,8]) assert.equal(merges.filter(n=>n===size).reduce((a,b)=>a+b,0),8);
for (const q of questions) assert.equal(q.correct,0);
assert(process.argv[3]);
writeFileSync(process.argv[3],JSON.stringify({checkedRecords:5,
 records:[{id:activity.id,contentHash:nativeContentHash(activity),gradingHash:nativeGradingHash(activity)},...questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null}))],
 worker,checks:['eight canonical task verdicts through native grading; base reward analysis, not live XP writes',
 'actual stable/unstable implementations and reference order','selection comparison counts and repeated identity pair',
 'in-place versus fresh output','three merge levels of eight elements; auxiliary-space argument remains manual, no heap measurement'],
},null,2),{mode:0o600});
console.log('PASS five native records: canonical binary reuse and four individually reviewed sorting questions');
