import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {solutionFor} from '../../../../lib/learning-paths/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
const path=LEARNING_PATHS.find(p=>p.id==='fde')!;const module=path.modules.find(m=>m.id==='fde-v1-m07')!;const lessons=module.lessons;const reads=module.activities.filter(a=>a.kind==='lesson');const activity=module.activities.find(a=>a.kind==='code')!;assert.equal(lessons.length,2);assert.equal(reads.length,2);for(const a of reads){assert.equal(a.verification,'self_reviewed');assert(lessons.some(l=>l.id===a.lessonId));}
const worker=JSON.parse(readFileSync(process.argv[2],'utf8'));assert.equal(worker.length,6);for(const r of worker){assert.equal(r.state,r.expected);assert.equal(r.contentHash,nativeContentHash(activity));assert.equal(r.gradingHash,nativeGradingHash(activity));}
const manual=JSON.parse(readFileSync(process.argv[3],'utf8'));for(const source of [solutionFor(activity.id)!.solution,manual[activity.id].alternative]){const report=assessComplexity({track:activity.code!.language,prompt:activity.code!.prompt,tests:activity.code!.tests},source);assert.equal(report.guidance.targetTime,'O(n log n)');assert.notEqual(report.assessment,'above-target');assert.equal(codingPassXp(report),25);}
const codeAt=(lesson:number,index:number)=>{const s=lessons[lesson].sections[index];assert(s.kind==='code');return s.code;};
// Manually read trusted educational literals only, never learner host execution.
new Function(codeAt(0,2));const report=runInNewContext(codeAt(1,3)+'\n;report');assert.equal(report.total,36);assert.equal(report.answered,24);assert.equal(report.correct,22);assert.equal(Math.round(22/36*10000)/10000,report.accuracy);assert.equal(Math.round(22/24*10000)/10000,report.accuracyWhenAnswered);
assert.equal(Math.round(17/24*100)/100,0.71);assert.equal(18/24,0.75);assert.equal(Math.round(20/24*100)/100,0.83);assert.equal(21/24,0.875);assert.equal(Math.round(8/12*100)/100,0.67);assert.equal(9/12,0.75);
const times=[...Array(95).fill(400),...Array(5).fill(30000)];assert.equal(times.reduce((a,b)=>a+b,0)/100,1880);assert.equal(times[Math.ceil(0.95*100)-1],400);assert.equal(times[Math.ceil(0.99*100)-1],30000);assert.equal(times[94]+0.05*(times[95]-times[94]),1880);
assert(1/2<2/3);assert(2/2>2/3);assert(0.144/24>0.144/36);
writeFileSync(process.argv[4],JSON.stringify({checkedRecords:5,records:[...lessons.map(l=>({id:l.id,contentHash:nativeContentHash(l),gradingHash:null})),...reads.map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})),{id:activity.id,contentHash:nativeContentHash(activity),gradingHash:nativeGradingHash(activity)}],checks:['six real sandbox verdicts, special dictionary ids/slices, invalid report refusals, frozen rates and1000slice/2000prediction bounds','two valid unpenalized authored target analyses','actual count-compatible development/held-out rates,1880ms mean and stated nearest-rank/interpolated percentiles','conditional accuracy non-monotonicity and cost denominator arithmetic; no real dataset split, model run, calibration, statistical significance or production performance acceptance']},null,2),{mode:0o600});
console.log('PASS five evaluation records, sandbox metrics and explicit count/quantile examples');
