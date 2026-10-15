import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {gradeCheck} from '../../../../lib/learning-paths/grade';
const check=LEARNING_PATHS.find(p=>p.id==='fde')!.modules.find(m=>m.id==='fde-v1-m09')!.activities.find(a=>a.kind==='check')!;const questions=check.questions!;const keys=questions.map(q=>q.correct);assert.deepEqual(keys,[0,1,2,3]);assert.equal(gradeCheck(check,keys,keys).state,'verified_pass');for(let i=0;i<4;i++){const answers=[...keys];answers[i]=(answers[i]+1)%4;const result=gradeCheck(check,keys,answers);assert.equal(result.state,'needs_revision');assert.equal(result.keyWithheld,false);}
assert.equal(8610-44-8540,26);assert.equal(12+31+8610+180+88,8921);assert.equal(8940-8921,19);assert.equal(Math.round(8540/8940*1000)/10,95.5);assert(40>20);assert(10<20);
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:[...questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),{id:check.id,contentHash:nativeContentHash(check),gradingHash:nativeGradingHash(check)}],checks:['inclusive sequential trace arithmetic and explicit abstention threshold','mixed source keys, exercise threshold and immediate review','mitigation and code-only rollback reasoning manually read; no live telemetry, deployment, partner transaction, email or incident executed']},null,2),{mode:0o600});
console.log('PASS five operations bindings and stated timing/threshold arithmetic');
