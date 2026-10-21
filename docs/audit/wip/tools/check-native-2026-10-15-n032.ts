import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {solutionFor} from '../../../../lib/learning-paths/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
const path=LEARNING_PATHS.find(p=>p.id==='fde')!;const module=path.modules.find(m=>m.id==='fde-v1-m02')!;const lessons=module.lessons;const reads=module.activities.filter(a=>a.kind==='lesson');const activity=module.activities.find(a=>a.kind==='code')!;assert.equal(lessons.length,2);assert.equal(reads.length,2);for(const a of reads){assert.equal(a.verification,'self_reviewed');assert(lessons.some(l=>l.id===a.lessonId));}
const worker=JSON.parse(readFileSync(process.argv[2],'utf8'));assert.equal(worker.length,6);for(const r of worker){assert.equal(r.state,r.expected);assert.equal(r.contentHash,nativeContentHash(activity));assert.equal(r.gradingHash,nativeGradingHash(activity));}
const manual=JSON.parse(readFileSync(process.argv[3],'utf8'));for(const source of [solutionFor(activity.id)!.solution,manual[activity.id].alternative]){const report=assessComplexity({track:activity.code!.language,prompt:activity.code!.prompt,tests:activity.code!.tests},source);assert.equal(report.guidance.targetTime,'O(n log n)');assert.notEqual(report.assessment,'above-target');assert.equal(codingPassXp(report),25);}
const codeAt=(lesson:number,index:number)=>{const s=lessons[lesson].sections[index];assert(s.kind==='code');return s.code;};
// Only these manually read authored examples run in a host VM, never learner code.
const unicode=runInNewContext(codeAt(0,9)+"\n;[a===b,a.normalize('NFC')===b.normalize('NFC'),'CUS-12\\u00a0'.trim(),'CUS-12\\u200b'.trim()]");assert.equal(JSON.stringify(unicode),JSON.stringify([false,true,'CUS-12','CUS-12\u200b']));
const mapped=runInNewContext(codeAt(0,6)+"\n;[toRecord({id:' A ',customerId:' C ',subject:' hi '}),toRecord({id:'A',customerId:null})]");assert.equal(JSON.stringify(mapped),JSON.stringify([{ok:true,record:{id:'A',customerId:'C',subject:'hi'}},{ok:false,reason:'no customer id'}]));
assert.equal(JSON.parse('9007199254740993'),9007199254740992);assert.equal(JSON.parse('"9007199254740993"'),'9007199254740993');
const delays=runInNewContext(codeAt(1,9)+'\n;[nextDelay(0,0),nextDelay(2,500),nextDelay(2,null),nextDelay(10,null)]',{Math:{min:Math.min,random:()=>0.5},Number});assert.equal(JSON.stringify(delays),'[0,500,2000,15000]');
new Function(codeAt(1,2)); // Syntax only: no database or transaction is provided/executed.
writeFileSync(process.argv[4],JSON.stringify({checkedRecords:5,records:[...lessons.map(l=>({id:l.id,contentHash:nativeContentHash(l),gradingHash:null})),...reads.map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})),{id:activity.id,contentHash:nativeContentHash(activity),gradingHash:nativeGradingHash(activity)}],checks:['six real sandbox verdicts; per-page retries,1000-ticket boundary, UTF16 text sorting and frozen pages','two valid unpenalized authored-target analyses','actual trusted Unicode/partial mapper/backoff examples and JSON precision, not learner host execution','transaction sketch syntax only; HTTP/atomicity distinctions manually read against primary specifications, no network/provider/database operation']},null,2),{mode:0o600});
console.log('PASS five integration records, sandbox behavior and trusted Unicode/number/backoff examples');
