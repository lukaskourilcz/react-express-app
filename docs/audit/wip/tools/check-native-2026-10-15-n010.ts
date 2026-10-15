import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash,nativeGradingHash } from '../../../../lib/learning-paths/audit';
import { pathCodeAttemptVersion } from '../../../../lib/learning-paths/session';
import { solutionFor } from '../../../../lib/learning-paths/solutions';
import { assessComplexity } from '../../../../lib/coding/complexity';
import { codingPassXp } from '../../../../shared/coding-complexity';
const manifest=JSON.parse(readFileSync(process.argv[2],'utf8')).targets as Record<string,{target:string;note:string}>;
const candidates=JSON.parse(readFileSync(process.argv[3],'utf8')) as Record<string,Record<string,string>>;
const worker=JSON.parse(readFileSync(process.argv[4],'utf8')) as {id:string;contentHash:string;gradingHash:string;state:string;expected:string}[];
const before=JSON.parse(readFileSync(process.argv[5],'utf8')) as {id:string;contentHash:string;gradingHash:string;material:{code:{prompt:{en:string}}}}[];
assert.equal(Object.keys(manifest).length,5);assert.equal(worker.length,36);
const path=LEARNING_PATHS.find(p=>p.id==='dsa-foundations')!;
const records=[];let analyses=0;
for(const [id,spec] of Object.entries(manifest)){
 const activity=path.modules.flatMap(m=>m.activities).find(a=>a.id===id)!;
 const old=before.find(r=>r.id===id)!;
 for(const result of worker.filter(r=>r.id===id)){assert.equal(result.state,result.expected);assert.equal(result.contentHash,nativeContentHash(activity));assert.equal(result.gradingHash,nativeGradingHash(activity));}
 for(const source of [solutionFor(id)!.solution,candidates[id].alternative]){
  const report=assessComplexity({track:'javascript',prompt:activity.code!.prompt,tests:activity.code!.tests},source);
  assert.equal(report.guidance.targetTime,spec.target,id);assert.notEqual(report.assessment,'above-target',id);assert.equal(codingPassXp(report),25,id);analyses++;
 }
 const prior=structuredClone(activity);prior.code!.prompt.en=old.material.code.prompt.en;
 assert.equal(nativeContentHash(prior),old.contentHash,id+' prior English hash');
 assert.equal(nativeGradingHash(prior),old.gradingHash,id+' prior grading hash');
 assert.notEqual(pathCodeAttemptVersion(prior,path.rubric.version),pathCodeAttemptVersion(activity,path.rubric.version),id+' target changes invalidate the prior sealed coding attempt');
 records.push({id,contentHash:nativeContentHash(activity),gradingHash:nativeGradingHash(activity),previousHash:old.contentHash,previousGradingHash:old.gradingHash,target:spec.target});
}
assert.equal(analyses,10);assert(process.argv[6]);
writeFileSync(process.argv[6],JSON.stringify({checkedRecords:5,uniqueCoverageAdded:0,records,verdicts:36,rewardAnalyses:analyses,
 checks:['five applicable authored targets and explicit input models','36 exact-hash expected sandbox verdicts','10 valid base-25 analyses, unknown unpenalized','prior sealed coding version changes for every edited brief'],
},null,2),{mode:0o600});
console.log('PASS five native goal revisions: 36 worker verdicts, ten base-reward analyses and five stale-version changes; zero new unique reviews');
