import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {solutionFor} from '../../../../lib/learning-paths/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
const path=LEARNING_PATHS.find(p=>p.id==='fde')!;const module=path.modules.find(m=>m.id==='fde-v1-m09')!;const lessons=module.lessons;const reads=module.activities.filter(a=>a.kind==='lesson');const activity=module.activities.find(a=>a.kind==='code')!;assert.equal(lessons.length,2);assert.equal(reads.length,2);for(const a of reads){assert.equal(a.verification,'self_reviewed');assert(lessons.some(l=>l.id===a.lessonId));}
const worker=JSON.parse(readFileSync(process.argv[2],'utf8'));assert.equal(worker.length,6);for(const r of worker){assert.equal(r.state,r.expected);assert.equal(r.contentHash,nativeContentHash(activity));assert.equal(r.gradingHash,nativeGradingHash(activity));}
const manual=JSON.parse(readFileSync(process.argv[3],'utf8'));for(const source of [solutionFor(activity.id)!.solution,manual[activity.id].alternative]){const report=assessComplexity({track:activity.code!.language,prompt:activity.code!.prompt,tests:activity.code!.tests},source);assert.equal(report.guidance.targetTime,null);assert.equal(codingPassXp(report),25);}
// Trusted authored snippets only; no learner code or live dependency executes in host V8.
const snippets=lessons.flatMap(l=>l.sections.filter(s=>s.kind==='code'));
const log=snippets.find(s=>s.kind==='code'&&s.code.includes('triage.completed'));assert(log?.kind==='code');const events:unknown[]=[];runInNewContext(log.code,{log:{info:(e:unknown)=>events.push(e)},ctx:{requestId:'R',tenantId:'T'}});assert.equal(events.length,1);assert.equal(JSON.stringify(events).includes('ticketBody'),false);
const retry=snippets.find(s=>s.kind==='code'&&s.code.includes('const attemptMs'));assert(retry?.kind==='code');assert.equal(runInNewContext(retry.code+'\n;spent'),9600);
assert.equal((95*0+5*8000)/100,400);assert.equal(0.05*9000,450);assert.equal(1/2,0.5);assert.equal(8610-8540,70);assert.equal(8940-(12+31+8610+180+88),19);assert.equal(Math.round(1/156*1000)/10,0.6);
writeFileSync(process.argv[4],JSON.stringify({checkedRecords:5,records:[...lessons.map(l=>({id:l.id,contentHash:nativeContentHash(l),gradingHash:null})),...reads.map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})),{id:activity.id,contentHash:nativeContentHash(activity),gradingHash:nativeGradingHash(activity)}],checks:['six real sandbox verdicts: window equality, zero retries, status policy, synchronous primitive errors, cooldown boundaries, independent instances and frozen inputs','two no-target/base25 analyses; stateful attempt budget is not a fabricated input-size target','trusted structured-log recorder and separate9600ms retry arithmetic, valid400msmean counterexample and slice denominators','no real dependency timing, incident recovery, distributed concurrency, schema migration, logging privacy implementation or release safety evidence']},null,2),{mode:0o600});
console.log('PASS five operations records, bounded circuit sandbox and authored arithmetic');
