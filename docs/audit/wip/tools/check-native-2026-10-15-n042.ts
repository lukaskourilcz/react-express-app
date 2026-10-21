import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {LEARNING_PATHS,publicManifest} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {solutionFor} from '../../../../lib/learning-paths/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
import {gradeCheck} from '../../../../lib/learning-paths/grade';
import {diagnosticCompetencies,diagnosticEvidence} from '../../../../lib/learning-paths/competencies';
import {pathGuidedComplete} from '../../../../shared/learning-paths';
const path=LEARNING_PATHS.find(p=>p.id==='fde')!;
const activities=path.modules.flatMap(m=>m.activities);
const diagnostic=activities.find(a=>a.id==='fde-v1-diagnostic-check')!;
const evaluation=activities.find(a=>a.id==='fde-v1-c01-evaluation')!;
const change=activities.find(a=>a.id==='fde-v1-c01-change-request')!;
const discovery=activities.find(a=>a.id==='fde-v1-m01-checks')!;
const question=discovery.questions!.find(q=>q.id==='fde-v1-m01-q3')!;
const worker=JSON.parse(readFileSync(process.argv[2],'utf8'));assert.equal(worker.length,14);
const manual=JSON.parse(readFileSync(process.argv[3],'utf8'));
for(const a of [evaluation,change]){const results=worker.filter((r:{activityId?:string;id:string})=>(r.activityId??r.id)===a.id);assert.equal(results.length,a===evaluation?8:6);for(const r of results){assert.equal(r.state,r.expected);assert.equal(r.contentHash,nativeContentHash(a));assert.equal(r.gradingHash,nativeGradingHash(a));}for(const source of [solutionFor(a.id)!.solution,manual[a.id].alternative]){const report=assessComplexity({track:a.code!.language,prompt:a.code!.prompt,tests:a.code!.tests},source);assert.equal(report.guidance.targetTime,a===evaluation?null:'O(n log n)');assert.notEqual(report.assessment,'above-target');assert.equal(codingPassXp(report),25);}}
const key=diagnostic.questions!.map(q=>q.correct);assert.deepEqual(key,[0,2,1,0,2,1,2,0,3,1,0,2]);
const grade=gradeCheck(diagnostic,key,key.map((v,i)=>i<2?(v+1)%4:v));assert.equal(grade.state,'verified_pass');assert.equal(grade.score,0.8333);assert.equal(grade.keyWithheld,false);assert(grade.verdicts.every(v=>v.correctIndex!==undefined&&v.explanation));
const report=diagnosticCompetencies(path,diagnosticEvidence(diagnostic,grade.verdicts));assert.deepEqual(report.find(r=>r.competencyId==='integration'),{competencyId:'integration',state:'gap',score:0.3333,assessedItems:3});assert(report.some(r=>r.state==='not_assessed'&&r.assessedItems===0));assert(diagnosticCompetencies(path,null).every(r=>r.state==='not_assessed'));
const module=path.modules.find(m=>m.activities.includes(diagnostic))!;assert(module.optional);assert.equal(module.requires.length,0);assert.equal(pathGuidedComplete(publicManifest(path),new Map([[diagnostic.id,'verified_pass']])),false);
assert.equal(discovery.questions!.length,4);const discoveryKey=discovery.questions!.map(q=>q.correct);assert.equal(gradeCheck(discovery,discoveryKey,discoveryKey).state,'verified_pass');assert.equal(gradeCheck(discovery,discoveryKey,[1,...discoveryKey.slice(1)]).state,'needs_revision');assert(JSON.stringify(question).includes('31 March 2027'));assert(JSON.stringify(path.modules.find(m=>m.id==='fde-v1-m01')!.lessons).includes('31 March 2027'));assert.equal(question.correct,0);
// Before/after source binding verifies that all diagnostic child questions and
// the other discovery questions retain their individually reviewed content.
const before=new Map(JSON.parse(readFileSync(process.argv[4],'utf8')).map((r:{id:string;contentHash:string})=>[r.id,r.contentHash]));for(const q of [...diagnostic.questions!,...discovery.questions!.filter(q=>q!==question)])assert.equal(nativeContentHash(q),before.get(q.id));
const records=[diagnostic,evaluation,change,question,discovery].map(r=>({id:r.id,contentHash:nativeContentHash(r),gradingHash:r===question?null:nativeGradingHash(r as typeof diagnostic)}));
writeFileSync(process.argv[5],JSON.stringify({checkedRecords:5,uniqueCoverageAdded:3,records,checks:['fourteen real sandbox verdicts; fractional median, inherited maps, prototype slices, exact.02regression, budget-first getters and restricted shared metadata','four valid base25 analyses; change request has authored sorting target and evaluation keeps two cost axes explicit','actual per-item diagnostic report with overall10/12 andintegration1/3; optionality and complete review preserved','discovery date/provenance revision and parent check; all other individually reviewed questions retain exact hashes','no real model, timing measurement, generalization test, source authority, enrollment, UAT or independent review']},null,2),{mode:0o600});
console.log('PASS final five native readings: three new records and two explicit revisions, fourteen sandbox verdicts');
