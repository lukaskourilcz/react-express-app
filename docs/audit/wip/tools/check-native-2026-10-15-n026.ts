import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {gradeCheck} from '../../../../lib/learning-paths/grade';
const check=LEARNING_PATHS.find(p=>p.id==='fde')!.modules.find(m=>m.id==='fde-v1-m06')!.activities.find(a=>a.kind==='check')!;const questions=check.questions!;const keys=questions.map(q=>q.correct);assert.deepEqual(keys,[0,0,0,0]);assert.equal(gradeCheck(check,keys,keys).state,'verified_pass');for(let i=0;i<4;i++){const answers=[...keys];answers[i]=1;const result=gradeCheck(check,keys,answers);assert.equal(result.state,'needs_revision');assert.equal(result.keyWithheld,false);}
// Small arithmetic/set examples support the explicit contracts; they do not
// simulate actual money movement, an atomic transaction or an MCP connection.
const currencies=['USD','EUR','GBP'];assert(currencies.includes('EUR'));assert(!currencies.includes('CAD'));
const client=['2026-07-28','2025-11-25'],server=['2025-11-25'];assert.deepEqual(client.filter(v=>server.includes(v)),['2025-11-25']);assert.deepEqual(['unknown'].filter(v=>server.includes(v)),[]);
const priorBalance=24050,manualRefund=24050,approved=24050;assert.equal(priorBalance-manualRefund,0);assert(approved>priorBalance-manualRefund);
assert(questions[0].prompt.en.includes('no stateful lookups'));assert(questions[2].prompt.en.includes('Company policy'));assert(questions[3].prompt.en.includes('reserves no balance'));
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:[...questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),{id:check.id,contentHash:nativeContentHash(check),gradingHash:nativeGradingHash(check)}],checks:['four source keys and immediate exercise feedback','fixed enum, common-version intersection and exhausted-balance arithmetic','modern MCP2026-07-28 and legacy SHOULD-disconnect behavior checked manually against primary versioned specifications','approval and atomic live-state enforcement are explicit scenario policies, not executed financial, auth, database or tool-server acceptance']},null,2),{mode:0o600});
console.log('PASS five tool-boundary bindings and bounded contract examples; protocol/policy review is manual');
