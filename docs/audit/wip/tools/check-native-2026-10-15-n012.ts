import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash,nativeGradingHash } from '../../../../lib/learning-paths/audit';
import { solutionFor } from '../../../../lib/learning-paths/solutions';
import { assessComplexity } from '../../../../lib/coding/complexity';
import { codingPassXp } from '../../../../shared/coding-complexity';
import { gradeCheck } from '../../../../lib/learning-paths/grade';
const module=LEARNING_PATHS.find(p=>p.id==='dsa-foundations')!.modules.find(m=>m.id==='dsa-v1-d09')!;
const coding=module.activities.filter(a=>a.kind==='code');assert.equal(coding.length,3);
const manual=JSON.parse(readFileSync(process.argv[2],'utf8')) as Record<string,Record<string,string>>;
const worker=JSON.parse(readFileSync(process.argv[3],'utf8')) as {id:string;state:string;expected:string;contentHash:string;gradingHash:string}[];
assert.equal(worker.length,18);
for(const result of worker){const activity=coding.find(a=>a.id===result.id)!;assert.equal(result.state,result.expected);assert.equal(result.contentHash,nativeContentHash(activity));assert.equal(result.gradingHash,nativeGradingHash(activity));}
let rewards=0;
for(const activity of coding)for(const source of [solutionFor(activity.id)!.solution,manual[activity.id].alternative]){
 const report=assessComplexity({track:'javascript',prompt:activity.code!.prompt,tests:activity.code!.tests},source);
 assert.equal(report.guidance.targetTime,'O(n)');assert.notEqual(report.assessment,'above-target');assert.equal(codingPassXp(report),25);rewards++;
}
assert.equal(rewards,6);
const read=module.activities.find(a=>a.id==='dsa-v1-d09-l2-read')!;assert.equal(read.lessonId,module.lessons[1].id);assert.equal(read.verification,'self_reviewed');assert(read.summary.en.includes('O(h + 1)'));
const check=module.activities.find(a=>a.id==='dsa-v1-d09-checks')!;const keys=check.questions!.map(q=>q.correct);assert.equal(keys.length,4);assert.equal(gradeCheck(check,keys,keys).state,'verified_pass');
for(let i=0;i<4;i++){const answers=[...keys];answers[i]=(answers[i]+1)%4;const result=gradeCheck(check,keys,answers);assert.equal(result.state,'needs_revision');assert.equal(result.keyWithheld,false);}
writeFileSync(process.argv[4],JSON.stringify({checkedRecords:5,records:[...coding,read,check].map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})),rewardAnalyses:rewards,checks:['eighteen exact-hash sandbox verdicts','six authored-target/base-25 analyses, unknown unpenalized','linked self-reviewed BST reading and four-question feedback threshold','input descriptor/identity preservation; 128-node frozen traversals and fractional BST chain']},null,2),{mode:0o600});
console.log('PASS five native tree activity records: real worker verdicts, authored targets and check feedback');
