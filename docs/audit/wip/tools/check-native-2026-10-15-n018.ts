import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {solutionFor} from '../../../../lib/learning-paths/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
const path=LEARNING_PATHS.find(p=>p.id==='fde')!;const activities=path.modules.flatMap(m=>m.activities);
const ids=['fde-v1-diagnostic-debug-js','fde-v1-diagnostic-debug-ts'];const codes=ids.map(id=>activities.find(a=>a.id===id)!);
const manual=JSON.parse(readFileSync(process.argv[2],'utf8')) as Record<string,Record<string,string>>;
const worker=JSON.parse(readFileSync(process.argv[3],'utf8')) as {id:string;state:string;expected:string;contentHash:string;gradingHash:string}[];
assert.equal(worker.length,12);for(const result of worker){const activity=codes.find(a=>a.id===result.id)!;assert.equal(result.state,result.expected);assert.equal(result.contentHash,nativeContentHash(activity));assert.equal(result.gradingHash,nativeGradingHash(activity));}
let rewards=0;for(const activity of codes)for(const source of [solutionFor(activity.id)!.solution,manual[activity.id].alternative]){const report=assessComplexity({track:activity.code!.language,prompt:activity.code!.prompt,tests:activity.code!.tests},source);assert.equal(report.guidance.targetTime,'O(n)');assert.notEqual(report.assessment,'above-target',activity.id);assert.equal(codingPassXp(report),25);rewards++;}assert.equal(rewards,4);
const questions=['fde-v1-diagnostic-q12','fde-v1-bridge-incident-q1','fde-v1-bridge-incident-q2'].map(id=>activities.flatMap(a=>a.questions??[]).find(q=>q.id===id)!);assert.deepEqual(questions.map(q=>q.correct),[2,0,0]);
// Illustrate precisely the shared-slug ownership mismatch, not a real service,
// alert-delivery, tenant-data or cache-deployment acceptance test.
const article={tenant:'CALDERA',slug:'setup'};const slugCache=new Map([[article.slug,article]]);const requestedTenant='NORTHWIND';assert.notEqual(slugCache.get('setup')!.tenant,requestedTenant);const scoped=new Map([[article.tenant+':'+article.slug,article]]);assert.equal(scoped.get(requestedTenant+':setup'),undefined);
writeFileSync(process.argv[4],JSON.stringify({checkedRecords:5,records:[...codes.map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})),...questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null}))],rewardAnalyses:rewards,checks:['twelve expected exact-hash real sandbox verdicts including TypeScript compiler checks','four valid target/base-25 analyses, unknown unpenalized','illustrative slug collision and tenant-scoped miss','manual demo-evidence and timeline reasoning; no live tenant, alert, provider or operational acceptance']},null,2),{mode:0o600});
console.log('PASS five FDE diagnostic/incident records: sandbox behavior, types, targets and bounded evidence');
