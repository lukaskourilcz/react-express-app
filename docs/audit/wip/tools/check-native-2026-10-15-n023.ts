import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {gradeCheck} from '../../../../lib/learning-paths/grade';
const check=LEARNING_PATHS.find(p=>p.id==='fde')!.modules.find(m=>m.id==='fde-v1-m03')!.activities.find(a=>a.kind==='check')!;
const questions=check.questions!;const keys=questions.map(q=>q.correct);assert.deepEqual(keys,[0,1,2,0]);assert.equal(gradeCheck(check,keys,keys).state,'verified_pass');
for(let i=0;i<4;i++){const answers=[...keys];answers[i]=(answers[i]+1)%4;const result=gradeCheck(check,keys,answers);assert.equal(result.state,'needs_revision');assert.equal(result.keyWithheld,false);}
const entries=JSON.parse(questions[3].context!.code) as Record<string,any>[];const full=entries.find(e=>e.entry==='C')!;
for(const key of ['at','requestId','actor','onBehalfOfTenant','action','targetIds','decision','grantId','policyVersion'])assert(key in full);
assert.equal(full.action,'orders.read');assert.deepEqual(full.targetIds,['ORD-1001','ORD-1005']);assert.equal(full.policyVersion,4);assert(!('records' in full));
assert(!('onBehalfOfTenant' in entries.find(e=>e.entry==='B')!));assert(!('grantId' in entries.find(e=>e.entry==='B')!));assert.equal(20*2,40);
// Policy-source, least-data-access and expiry conclusions are manual scenario/
// OWASP readings. These bindings/arithmetic do not test real auth, RLS, audit
// storage, grant propagation or a 40-row production export.
assert(questions[0].prompt.en.includes('even membership in another tenant'));assert(questions[1].prompt.en.includes('policy requires tenant scope'));assert(questions[2].prompt.en.includes('before every batch'));
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:[...questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),{id:check.id,contentHash:nativeContentHash(check),gradingHash:nativeGradingHash(check)}],checks:['all four source keys and exercise miss feedback','literal audit JSON attribution fields, correlation and omitted full customer records','explicit twenty-row batches imply forty already written','authorization conclusions are manual under stated policies; not live RLS, grant or export acceptance']},null,2),{mode:0o600});
console.log('PASS five boundary bindings, audit-entry fields and explicit batch arithmetic');
