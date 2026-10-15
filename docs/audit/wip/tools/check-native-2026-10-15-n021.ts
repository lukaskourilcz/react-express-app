import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash,nativeGradingHash} from '../../../../lib/learning-paths/audit';
import {gradeArtifact,gradeCheck} from '../../../../lib/learning-paths/grade';
const path=LEARNING_PATHS.find(p=>p.id==='fde')!;const module=path.modules.find(m=>m.id==='fde-v1-m01')!;
const check=module.activities.find(a=>a.id==='fde-v1-m01-checks')!;const questions=check.questions!.slice(1);assert.equal(questions.length,3);assert.deepEqual(questions.map(q=>q.correct),[0,0,0]);
const keys=check.questions!.map(q=>q.correct);assert.equal(gradeCheck(check,keys,keys).state,'verified_pass');for(let i=0;i<4;i++){const answers=[...keys];answers[i]=1;const result=gradeCheck(check,keys,answers);assert.equal(result.state,'needs_revision');assert.equal(result.keyWithheld,false);}
const artifact=module.activities.find(a=>a.id==='fde-v1-m01-scope-brief')!;const fields=artifact.artifact!.fields;assert.equal(fields.length,7);assert(fields.every(f=>f.required));for(const id of artifact.artifact!.rubricDimensions)assert(path.rubric.dimensions.some(d=>d.id===id));
// Deliberately content-free values prove only the documented structural limit.
// No filled box is promoted into a verified baseline or good scope by this run.
const filled=Object.fromEntries(fields.map(f=>[f.id,f.kind==='list'?['x']:'x']));assert.equal(gradeArtifact(artifact,filled).state,'self_reviewed');
for(const field of fields){const missing={...filled};delete missing[field.id];assert.equal(gradeArtifact(artifact,missing).state,'needs_revision');const tooLong={...filled,[field.id]:field.kind==='list'?['x'.repeat(field.maxLength+1)]:'x'.repeat(field.maxLength+1)};assert.equal(gradeArtifact(artifact,tooLong).state,'needs_revision');}
const empty={...filled,workflow:'   '};assert.equal(gradeArtifact(artifact,empty).state,'needs_revision');assert.equal(artifact.verification,'self_reviewed');
assert(artifact.artifact!.brief.en.includes('baseline note is hypothetical'));assert(artifact.artifact!.fields.find(f=>f.id==='baseline')!.help.en.includes('not yet measured'));
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:[...questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),...[check,artifact].map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)}))],checks:['exercise threshold and immediate wrong-answer review','all seven artifact fields required; missing/over-cap/blank fail','content-free complete fields remain self-reviewed, never semantic verification','rubric links resolve; hypothetical baseline distinguished from one observed ticket','mechanism and policy-gate answers were manually read, not empirically proven by this test']},null,2),{mode:0o600});
console.log('PASS five discovery bindings, check feedback and honest artifact structural limits');
