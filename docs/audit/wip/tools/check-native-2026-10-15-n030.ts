import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {gradeCheck} from '../../../../lib/learning-paths/grade';
const check=LEARNING_PATHS.find(p=>p.id==='fde')!.modules.find(m=>m.id==='fde-v1-m10')!.activities.find(a=>a.kind==='check')!;const questions=check.questions!;const keys=questions.map(q=>q.correct);assert.deepEqual(keys,[1,3,0,2]);assert.equal(gradeCheck(check,keys,keys).state,'verified_pass');for(let i=0;i<4;i++){const answers=[...keys];answers[i]=(answers[i]+1)%4;const result=gradeCheck(check,keys,answers);assert.equal(result.state,'needs_revision');assert.equal(result.keyWithheld,false);}
const observed=6*60+20,target=4*60,baseline=8*60;assert(observed>target);assert(observed<baseline);
// A ten-case sample has a median; representativeness is a separate question.
const times=[180,220,260,300,360,400,420,440,500,600];assert.equal((times[4]+times[5])/2,observed);
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:[...questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),{id:check.id,contentHash:nativeContentHash(check),gradingHash:nativeGradingHash(check)}],checks:['timing target/baseline and an illustrative ten-case median, not actual UAT observations','mixed source keys and immediate exercise review','waiver authority, runbook gaps, irreversible confirmation and product-evidence distinctions manually reviewed; no rollout, refund or customer validation executed']},null,2),{mode:0o600});
console.log('PASS five handoff bindings, stated timing comparison and exercise review');
