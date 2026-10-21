import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {gradeCheck} from '../../../../lib/learning-paths/grade';
const check=LEARNING_PATHS.find(p=>p.id==='fde')!.modules.find(m=>m.id==='fde-v1-m07')!.activities.find(a=>a.kind==='check')!;const questions=check.questions!;const keys=questions.map(q=>q.correct);assert.deepEqual(keys,[2,2,1,0]);assert.equal(gradeCheck(check,keys,keys).state,'verified_pass');for(let i=0;i<4;i++){const answers=[...keys];answers[i]=(answers[i]+1)%4;const result=gradeCheck(check,keys,answers);assert.equal(result.state,'needs_revision');assert.equal(result.keyWithheld,false);}
const total=400,answered=total*0.6,correct=answered*0.95;assert.equal(answered,240);assert.equal(correct,228);assert.equal(answered-correct,12);assert.equal(total-answered,160);assert.equal(correct/total,0.57);
const baseline=[8,9,10],candidate=[11,12,7];assert.equal(baseline.reduce((a,b)=>a+b),27);assert.equal(candidate.reduce((a,b)=>a+b),30);assert.deepEqual(candidate.map((n,i)=>n-baseline[i]),[3,3,-3]);assert.equal((11-8)+(12-9),6);
assert.equal(Math.round(22/24*1000)/10,91.7);assert.equal(Math.round(24/36*1000)/10,66.7);assert.equal(Math.round(22/36*1000)/10,61.1);assert.equal(27/36,0.75);assert.equal(36-24,12);
// Abstaining more is not inherently monotonic: remove a correct answer and
// conditional accuracy falls; remove a wrong answer and it rises.
assert(1/2<2/3);assert(2/2>2/3);assert(Number.isNaN(0/0));
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:[...questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),{id:check.id,contentHash:nativeContentHash(check),gradingHash:nativeGradingHash(check)}],checks:['228 correct/12 wrong/160 abstentions at stipulated hypothetical rates','explicit twelve-per-slice counts: six combined gains minus three losses','conditional accuracy/coverage/correct-yield denominators and non-monotonic counterexample','exercise feedback and mixed keys; leakage/uncertainty conclusions manually read, not a significance test, production forecast or model run']},null,2),{mode:0o600});
console.log('PASS five evaluation bindings and all stated count/denominator examples');
