import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {gradeCheck} from '../../../../lib/learning-paths/grade';
import {solutionFor} from '../../../../lib/learning-paths/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
const dsa=LEARNING_PATHS.find(p=>p.id==='dsa-foundations')!.modules.find(m=>m.id==='dsa-v1-d10')!;
const codes=dsa.activities.filter(a=>a.kind==='code');assert.equal(codes.length,3);
const manual=JSON.parse(readFileSync(process.argv[2],'utf8')) as Record<string,Record<string,string>>;
const worker=JSON.parse(readFileSync(process.argv[3],'utf8')) as {id:string;state:string;expected:string;contentHash:string;gradingHash:string}[];
assert.equal(worker.length,18);for(const result of worker){const activity=codes.find(a=>a.id===result.id)!;assert.equal(result.state,result.expected);assert.equal(result.contentHash,nativeContentHash(activity));assert.equal(result.gradingHash,nativeGradingHash(activity));}
let rewards=0;for(const activity of codes)for(const source of [solutionFor(activity.id)!.solution,manual[activity.id].alternative]){const report=assessComplexity({track:'javascript',prompt:activity.code!.prompt,tests:activity.code!.tests},source);const target=activity.id.endsWith('record-index')?'O(log n)':'O(n)';assert.equal(report.guidance.targetTime,target);assert.notEqual(report.assessment,'above-target',activity.id);assert.equal(codingPassXp(report),25);rewards++;}assert.equal(rewards,6);
const check=dsa.activities.find(a=>a.kind==='check')!;const keys=check.questions!.map(q=>q.correct);assert.equal(keys.length,10);assert.equal(gradeCheck(check,keys,keys).state,'verified_pass');assert.equal(gradeCheck(check,keys,keys).keyWithheld,false);
for(let i=0;i<10;i++){const answers=[...keys];answers[i]=1;assert.equal(gradeCheck(check,keys,answers).state,'verified_pass');}
const spread=[...keys];spread[0]=1;spread[2]=1;assert.equal(gradeCheck(check,keys,spread).state,'verified_pass');
for(const domain of check.domains!){const answers=[...keys];check.questions!.forEach((q,i)=>{if(q.domain===domain)answers[i]=1;});const result=gradeCheck(check,keys,answers);assert.equal(result.state,'needs_revision');assert.equal(result.keyWithheld,true);assert(result.verdicts.every(v=>!('correctIndex' in v)&&!('explanation' in v)));assert(result.failedDomains.includes(domain));}
const question=LEARNING_PATHS.find(p=>p.id==='fde')!.modules.flatMap(m=>m.activities.flatMap(a=>a.questions??[])).find(q=>q.id==='fde-v1-diagnostic-q1')!;assert.equal(question.correct,0);
const pages=[Array(500).fill('a'),[],Array(500).fill('b'),Array(23).fill('c')];
const vendor=()=>{let calls=0;return {get calls(){return calls;},contacts:async({cursor}:{cursor:string|null})=>{const index=cursor===null?0:Number(cursor);calls++;assert(index<4);return {items:pages[index],next_cursor:index===3?null:String(index+1)};}};};
// Only this individually read authored API-job context executes here, with a deterministic stub vendor.
const brokenVendor=vendor();const broken=await new Function('vendor',question.context!.code+';return pullContacts();')(brokenVendor);assert.equal(broken.length,500);assert.equal(brokenVendor.calls,2);
const fixedVendor=vendor();const fixed=await new Function('vendor',question.context!.code.replace('page.items.length < 500','page.next_cursor === null')+';return pullContacts();')(fixedVendor);assert.equal(fixed.length,1023);assert.equal(fixedVendor.calls,4);
writeFileSync(process.argv[4],JSON.stringify({checkedRecords:5,records:[...codes,check].map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})).concat([{id:question.id,contentHash:nativeContentHash(question),gradingHash:null as any}]),rewardAnalyses:rewards,checks:['eighteen exact-hash sandbox verdicts and six valid base-25 analyses','all ten single misses and cross-domain 80% pass; each failed domain rejects 80%','cursor-only termination continues through an empty nonfinal page','same-session proof is neither editorial scoring nor authenticated activity acceptance']},null,2),{mode:0o600});
console.log('PASS five final DSA/first FDE records: sandbox contracts, domain feedback and pagination');
