import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {solutionFor} from '../../../../lib/learning-paths/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
const path=LEARNING_PATHS.find(p=>p.id==='fde')!;const module=path.modules.find(m=>m.id==='fde-v1-m04')!;const lessons=module.lessons;const reads=module.activities.filter(a=>a.kind==='lesson');const activity=module.activities.find(a=>a.kind==='code')!;assert.equal(lessons.length,2);assert.equal(reads.length,2);for(const a of reads){assert.equal(a.verification,'self_reviewed');assert(lessons.some(l=>l.id===a.lessonId));}
const worker=JSON.parse(readFileSync(process.argv[2],'utf8'));assert.equal(worker.length,6);for(const r of worker){assert.equal(r.state,r.expected);assert.equal(r.contentHash,nativeContentHash(activity));assert.equal(r.gradingHash,nativeGradingHash(activity));}
const manual=JSON.parse(readFileSync(process.argv[3],'utf8'));for(const source of [solutionFor(activity.id)!.solution,manual[activity.id].alternative]){const report=assessComplexity({track:activity.code!.language,prompt:activity.code!.prompt,tests:activity.code!.tests},source);assert.equal(report.guidance.targetTime,'O(n)');assert.notEqual(report.assessment,'above-target');assert.equal(codingPassXp(report),25);}
const codeAt=(lesson:number,index:number)=>{const s=lessons[lesson].sections[index];assert(s.kind==='code');return s.code;};
// Manually reviewed trusted lesson/reference literals only; no learner host execution.
const old=JSON.parse(readFileSync(process.argv[4],'utf8')).find((r:{id:string})=>r.id==='fde-v1-m04-l1');const prior=runInNewContext(old.material.sections[3].code+"\n;routeTicket({formCategory:'toString'}).decidedBy");assert.equal(prior,'rule');
const route=runInNewContext(codeAt(0,3)+"\n;['billing','bug-report','how-to','other','toString','__proto__','constructor'].map(formCategory=>routeTicket({formCategory}))");assert.equal(JSON.stringify(route),JSON.stringify([{queue:'billing',decidedBy:'rule'},{queue:'engineering',decidedBy:'rule'},{queue:'support',decidedBy:'rule'},...Array.from({length:4},()=>({queue:'triage',decidedBy:'operator'}))]));
const combined=codeAt(0,3)+'\n'+solutionFor(activity.id)!.solution+'\n'+codeAt(0,6)+'\n;triage';
for(const [category,confidence,ticketId,queue,reason] of [['bug',0.8,'A','engineering',undefined],['other',0.8,'A','triage',undefined],['billing',0.2,'A','triage','low-confidence'],['billing',0.8,'B','triage','ticket-mismatch']] as const){const triage=runInNewContext(combined,{model:{classify:async()=>JSON.stringify({ticketId,category,confidence})}});const result=await triage({id:'A',formCategory:'other',body:'fixture'});assert.equal(result.queue,queue);assert.equal(result.reason,reason);}
const failed=runInNewContext(combined,{model:{classify:async()=>{throw new Error('fixture failure');}}});assert.equal((await failed({id:'A',formCategory:'other',body:''})).reason,'model-failed');
const partial=runInNewContext(codeAt(1,6)+'\n;validateTriage');assert.equal(partial('plain').reason,'no-json-object');assert.equal(partial('{oops}').reason,'unparsable-json');
assert.equal(Math.round(268/300*1000)/10,89.3);assert.equal(300-268,32);
writeFileSync(process.argv[5],JSON.stringify({checkedRecords:5,records:[...lessons.map(l=>({id:l.id,contentHash:nativeContentHash(l),gradingHash:null})),...reads.map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})),{id:activity.id,contentHash:nativeContentHash(activity),gradingHash:nativeGradingHash(activity)}],checks:['six real sandbox verdicts for structural validator and two valid unpenalized targets','trusted routing prototype counterexample, category-to-queue binding, low-confidence/mismatched-ticket/provider-error fallbacks','89.3% authored sample arithmetic and partial parser failures','no real model/provider latency, calibration, output protocol, business accuracy or architecture benchmark acceptance']},null,2),{mode:0o600});
console.log('PASS five architecture/validator records, real sandbox and trusted routing examples');
