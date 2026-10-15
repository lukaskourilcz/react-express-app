import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {gradeCheck} from '../../../../lib/learning-paths/grade';
const check=LEARNING_PATHS.find(p=>p.id==='fde')!.modules.find(m=>m.id==='fde-v1-m02')!.activities.find(a=>a.kind==='check')!;
const questions=check.questions!;assert.equal(questions.length,4);assert.deepEqual(questions.map(q=>q.correct),[0,0,0,0]);
const keys=questions.map(q=>q.correct);assert.equal(gradeCheck(check,keys,keys).state,'verified_pass');for(let i=0;i<4;i++){const answers=[...keys];answers[i]=1;const result=gradeCheck(check,keys,answers);assert.equal(result.state,'needs_revision');assert.equal(result.keyWithheld,false);}
// Deterministic illustration of the expressly declared immutable-id keyset,
// not an assertion about arbitrary vendor cursor implementations or snapshots.
const before=[1,2,3,4,5,6,7,8],first=before.slice(0,3),after=before.filter(id=>id!==2);assert.equal(first.at(-1),3);assert.deepEqual(after.slice(3,6),[5,6,7]);assert.deepEqual(after.filter(id=>id>3).slice(0,3),[4,5,6]);assert(!after.filter(id=>id>3).includes(2));
const event=JSON.parse(questions[3].context!.code);const retry={...event,deliveryId:'dlv-new',deliveredAt:'2026-03-02T02:15:07Z'};const next={...retry,ticket:{...retry.ticket,version:4}};
const rowKey=(e:any)=>JSON.stringify([e.ticket.id,e.ticket.version]);const hash=(e:any)=>createHash('sha256').update(JSON.stringify(e)).digest('hex');assert.equal(rowKey(event),rowKey(retry));assert.notEqual(rowKey(event),rowKey(next));assert.notEqual(hash(event),hash(retry));assert.equal(event.ticket.id,next.ticket.id);
// HTTP conclusions are manual primary-RFC checks; parsing an illustrative
// delay or naming a method is not a real server/retry/side-effect probe.
assert(questions[0].prompt.en.includes('bounded retry budget'));assert(questions[1].explanation.en.includes('does not promise'));assert.equal(Number('2')*1000,2000);
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:[...questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),{id:check.id,contentHash:nativeContentHash(check),gradingHash:nativeGradingHash(check)}],checks:['keyset-versus-offset deletion example under explicit immutable-id contract','actual literal webhook version key versus changed delivery metadata/full hash','four-question exercise threshold and feedback','HTTP safety/idempotence/429 limits are manual RFC readings, not simulated provider acceptance']},null,2),{mode:0o600});
console.log('PASS five integration bindings, bounded pagination/dedup examples and exercise review');
