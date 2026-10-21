import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {gradeCheck} from '../../../../lib/learning-paths/grade';
const check=LEARNING_PATHS.find(p=>p.id==='fde')!.modules.find(m=>m.id==='fde-v1-m08')!.activities.find(a=>a.kind==='check')!;
const questions=check.questions!;const keys=questions.map(q=>q.correct);assert.deepEqual(keys,[2,0,1,3]);
assert.equal(gradeCheck(check,keys,keys).state,'verified_pass');
for(let i=0;i<4;i++){const answers=[...keys];answers[i]=(answers[i]+1)%4;const result=gradeCheck(check,keys,answers);assert.equal(result.state,'needs_revision');assert.equal(result.keyWithheld,false);}
assert(questions[0].prompt.en.includes('50 EUR'));assert(questions[1].prompt.en.includes('no export tool'));assert(questions[2].prompt.en.includes('ignores any model-supplied tenant'));assert(questions[3].prompt.en.includes('tested restore window'));
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:[...questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),{id:check.id,contentHash:nativeContentHash(check),gradingHash:nativeGradingHash(check)}],checks:['four distinct source keys, exercise threshold and immediate review','explicit policy premises checked; correctness of security distinctions read manually against OWASP guidance','no real refund, model, export, tenant authorization or restore operation executed']},null,2),{mode:0o600});
console.log('PASS five security bindings, exercise outcomes and explicit scenario premises');
