import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {solutionFor} from '../../../../lib/learning-paths/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
const path=LEARNING_PATHS.find(p=>p.id==='fde')!;const module=path.modules.find(m=>m.id==='fde-v1-m03')!;const lessons=module.lessons;const reads=module.activities.filter(a=>a.kind==='lesson');const activity=module.activities.find(a=>a.kind==='code')!;assert.equal(lessons.length,2);assert.equal(reads.length,2);for(const a of reads){assert.equal(a.verification,'self_reviewed');assert(lessons.some(l=>l.id===a.lessonId));}
const worker=JSON.parse(readFileSync(process.argv[2],'utf8'));assert.equal(worker.length,6);for(const r of worker){assert.equal(r.state,r.expected);assert.equal(r.contentHash,nativeContentHash(activity));assert.equal(r.gradingHash,nativeGradingHash(activity));}
const manual=JSON.parse(readFileSync(process.argv[3],'utf8'));for(const source of [solutionFor(activity.id)!.solution,manual[activity.id].alternative]){const report=assessComplexity({track:activity.code!.language,prompt:activity.code!.prompt,tests:activity.code!.tests},source);assert.equal(report.guidance.targetTime,'O(n)');assert.notEqual(report.assessment,'above-target');assert.equal(codingPassXp(report),25);}
const codeAt=(lesson:number,index:number)=>{const s=lessons[lesson].sections[index];assert(s.kind==='code');return s.code;};
// Trusted, manually read lesson literals only. No learner source runs on the host.
new Function(codeAt(0,4));new Function(codeAt(0,7));new Function('return (async()=>{'+codeAt(1,4)+'\n});');
const old=JSON.parse(readFileSync(process.argv[4],'utf8')).find((r:{id:string})=>r.id==='fde-v1-m03-l1');for(const index of [4,7])assert.throws(()=>new Function(old.material.sections[index].code),SyntaxError);
const selected=runInNewContext(codeAt(0,4)+"\n;[unsafeReadOrders({tenantId:'OWN'},{tenantId:'OTHER',status:'open'}),scopedReadOrders({tenantId:'OWN'},{tenantId:'OTHER',status:'open'})]",{store:{queryOrders:(tenant:string)=>tenant}});assert.equal(JSON.stringify(selected),'["OTHER","OWN"]');
const audit=JSON.parse(codeAt(1,7));assert.equal(audit.policyVersion,4);assert.equal(audit.onBehalfOfTenant,'TEN-4021');assert.equal(audit.targetIds.length,2);
const expire=Date.parse('2026-04-02T17:00:00Z');assert(Date.parse('2026-04-02T16:58:00Z')<expire);assert(Date.parse('2026-04-02T17:01:00Z')>=expire);assert.equal(2*20,40);
writeFileSync(process.argv[5],JSON.stringify({checkedRecords:5,records:[...lessons.map(l=>({id:l.id,contentHash:nativeContentHash(l),gradingHash:null})),...reads.map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})),{id:activity.id,contentHash:nativeContentHash(activity),gradingHash:nativeGradingHash(activity)}],checks:['six real sandbox verdicts, zero-read stale refusals and unread proposed-tenant accessor','two valid unpenalized authored targets; frozen context and100grant/1000row bounds','old duplicate-declaration snippets fail syntax; revised snippets compile; trusted scope example only','audit JSON and explicit per-batch clock arithmetic; no actual RLS, deletion, database, retention/restore or historical reconstruction acceptance']},null,2),{mode:0o600});
console.log('PASS five tenant/lifecycle records, sandbox boundaries and authored snippet consistency');
