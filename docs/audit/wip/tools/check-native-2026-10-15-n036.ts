import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {solutionFor} from '../../../../lib/learning-paths/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
const path=LEARNING_PATHS.find(p=>p.id==='fde')!;const module=path.modules.find(m=>m.id==='fde-v1-m06')!;const lessons=module.lessons;const reads=module.activities.filter(a=>a.kind==='lesson');const activity=module.activities.find(a=>a.kind==='code')!;assert.equal(lessons.length,2);assert.equal(reads.length,2);for(const a of reads){assert.equal(a.verification,'self_reviewed');assert(lessons.some(l=>l.id===a.lessonId));}
const worker=JSON.parse(readFileSync(process.argv[2],'utf8'));assert.equal(worker.length,6);for(const r of worker){assert.equal(r.state,r.expected);assert.equal(r.contentHash,nativeContentHash(activity));assert.equal(r.gradingHash,nativeGradingHash(activity));}
const manual=JSON.parse(readFileSync(process.argv[3],'utf8'));for(const source of [solutionFor(activity.id)!.solution,manual[activity.id].alternative]){const report=assessComplexity({track:activity.code!.language,prompt:activity.code!.prompt,tests:activity.code!.tests},source);assert.equal(report.guidance.targetTime,null);assert.equal(codingPassXp(report),25);}
const codeAt=(lesson:number,index:number)=>{const s=lessons[lesson].sections[index];assert(s.kind==='code');return s.code;};
// Trusted authored illustration only, not learner code or real financial execution.
new Function(codeAt(0,3));const run=runInNewContext(codeAt(1,2)+'\n;run');let tries=0,waits=0;const result=await run({maxAttempts:3,handler:async()=>{if(++tries<2)throw new Error('transient');return 7;},shouldRetry:()=>true,waitBeforeRetry:async()=>{waits++;}},{});assert.equal(JSON.stringify(result),' {"ok":true,"value":7,"attempts":2}'.trim());assert.equal(tries,2);assert.equal(waits,1);
const refused=await run({maxAttempts:3,handler:async()=>{throw new Error('unsafe');},shouldRetry:()=>false,waitBeforeRetry:async()=>{throw new Error('unexpected wait');}},{});assert.equal(refused.attempts,1);assert.equal(refused.reason,'tool_failed');assert.equal(4**3,64);assert.equal(3**3,27);
const client=['2026-07-28','2025-03-26'],server=['2025-03-26'];assert.deepEqual(client.filter(v=>server.includes(v)),['2025-03-26']);assert.equal(24050-24050,0);assert(24050>0);
writeFileSync(process.argv[4],JSON.stringify({checkedRecords:5,records:[...lessons.map(l=>({id:l.id,contentHash:nativeContentHash(l),gradingHash:null})),...reads.map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})),{id:activity.id,contentHash:nativeContentHash(activity),gradingHash:nativeGradingHash(activity)}],checks:['six real sandbox verdicts including prototype key, argument snapshot, empty-error and failed-key lifecycle probes','two no-target/base25 analyses; no single misleading stateful dispatcher target is invented','trusted async safe-retry illustration and64/27 attempt arithmetic','versioned MCP semantics manually reviewed; no actual protocol connection, durable concurrency, approval identity, balance transaction or provider effect']},null,2),{mode:0o600});
console.log('PASS five tool-boundary records, sandbox state and trusted async budget examples');
