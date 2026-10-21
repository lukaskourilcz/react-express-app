import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash} from '../../../../lib/learning-paths/audit';
const all=LEARNING_PATHS.find(p=>p.id==='fde')!.modules.flatMap(m=>m.activities.flatMap(a=>a.questions??[]));
const ids=['fde-v1-diagnostic-q7','fde-v1-diagnostic-q8','fde-v1-diagnostic-q9','fde-v1-diagnostic-q10','fde-v1-diagnostic-q11'];
const questions=ids.map(id=>all.find(q=>q.id===id)!);assert(questions.every(Boolean));assert.deepEqual(questions.map(q=>q.correct),[2,0,3,1,0]);
// Only the metric arithmetic is executable evidence. The UI/retention/hold-out
// conclusions were individually read against the scenario and primary sources;
// there is no fabricated application, model evaluation or physical UI probe.
const billing={total:60,correct:24},other={total:940,correct:916};
assert.equal(billing.correct/billing.total,0.4);assert.equal((billing.correct+other.correct)/(billing.total+other.total),0.94);assert.equal(billing.total/(billing.total+other.total),0.06);
assert(0.94>=0.9);assert(0.94<0.95);assert(916/940>0.97&&916/940<0.98);
const manualChecks={
 'fde-v1-diagnostic-q7':'Error must be distinguishable from loading/empty; user retry can coexist with visible backed-off automatic retries.',
 'fde-v1-diagnostic-q8':'Confirmation or visible optimistic reversal addresses the stated false success; toast duration and silent retries do not.',
 'fde-v1-diagnostic-q9':'The stated dual objective requires prevention and recovery; confirmation alone may help prevention but cannot undo a completed deletion.',
 'fde-v1-diagnostic-q10':'Integer-consistent slice counts pass the stated aggregate threshold; a stricter aggregate threshold can reject this particular result.',
 'fde-v1-diagnostic-q11':'All 120 cases influenced tuning; selecting 24 afterwards does not create untouched evaluation data.',
};
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),manualChecks,checks:['consistent 940/1000 overall and 24/60 billing arithmetic','explicit 95% counterexample to the old any-threshold claim','other conclusions are manual scenario/primary-document checks; source binding is not correctness or independent approval']},null,2),{mode:0o600});
console.log('PASS exact five-record bindings and slice arithmetic; UI/hold-out review remains manual');
