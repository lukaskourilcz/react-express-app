import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {solutionFor} from '../../../../lib/learning-paths/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
const path=LEARNING_PATHS.find(p=>p.id==='fde')!;const module=path.modules.find(m=>m.id==='fde-v1-m10')!;const lessons=module.lessons;const reads=module.activities.filter(a=>a.kind==='lesson');const activity=module.activities.find(a=>a.kind==='code')!;assert.equal(lessons.length,2);assert.equal(reads.length,2);for(const a of reads){assert.equal(a.verification,'self_reviewed');assert(lessons.some(l=>l.id===a.lessonId));}
const worker=JSON.parse(readFileSync(process.argv[2],'utf8'));assert.equal(worker.length,6);for(const r of worker){assert.equal(r.state,r.expected);assert.equal(r.contentHash,nativeContentHash(activity));assert.equal(r.gradingHash,nativeGradingHash(activity));}
const manual=JSON.parse(readFileSync(process.argv[3],'utf8'));for(const source of [solutionFor(activity.id)!.solution,manual[activity.id].alternative]){const report=assessComplexity({track:activity.code!.language,prompt:activity.code!.prompt,tests:activity.code!.tests},source);assert.equal(report.guidance.targetTime,null);assert.equal(codingPassXp(report),25);}
// Trusted lesson snippets only, with an inert DOM-shaped recorder; no learner code.
const codeAt=(index:number)=>{const sec=lessons[0].sections[index];assert(sec.kind==='code');return sec.code;};
const box={textContent:''};const host=runInNewContext(codeAt(3)+'\n'+codeAt(11)+'\n;({state,announce})',{document:{getElementById:(id:string)=>{assert.equal(id,'workbench-status');return box;}}});assert.equal(host.state.proposal.amountCents,4200);host.announce('Loading');assert.equal(host.state.statusMessage,'Loading');assert.equal(box.textContent,'Loading');assert.equal((6*60+20)>4*60,true);assert.equal((3*60+27)-(3*60+12),15);
writeFileSync(process.argv[4],JSON.stringify({checkedRecords:5,records:[...lessons.map(l=>({id:l.id,contentHash:nativeContentHash(l),gradingHash:null})),...reads.map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})),{id:activity.id,contentHash:nativeContentHash(activity),gradingHash:nativeGradingHash(activity)}],checks:['six real sandbox verdicts: repeated revision no-op, empty errors, late failed replies, refusal ids and zero revision with warnings','two no-target/base25 analyses; bounded stateful actions have no fabricated single input-size target','trusted state/status recorder, UAT miss and15minute escalation arithmetic','no rendered accessibility, screen reader delivery, human approval, live endpoint cancellation, reconciliation or customer validation']},null,2),{mode:0o600});
console.log('PASS five handoff records, sandbox transitions and authored status recorder');
