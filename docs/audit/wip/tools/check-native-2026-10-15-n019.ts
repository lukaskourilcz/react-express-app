import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash} from '../../../../lib/learning-paths/audit';
const all=LEARNING_PATHS.find(p=>p.id==='fde')!.modules.flatMap(m=>m.activities.flatMap(a=>a.questions??[]));
const ids=['fde-v1-bridge-incident-q3','fde-v1-bridge-incident-q4','fde-v1-bridge-python-q1','fde-v1-bridge-python-q2','fde-v1-bridge-python-q3'];
const questions=ids.map(id=>all.find(q=>q.id===id)!);assert(questions.every(Boolean));assert.deepEqual(questions.map(q=>q.correct),[0,0,0,0,0]);
const python=JSON.parse(readFileSync(process.argv[2],'utf8')) as {checkedRecords:number;records:{id:string;contentHash:string}[]};assert.equal(python.checkedRecords,3);for(const row of python.records)assert.equal(nativeContentHash(questions.find(q=>q.id===row.id)!),row.contentHash);
// Incident conclusions are manual timeline/assumption readings, not an actual
// rollback, notification, data-retention or alert-delivery exercise.
assert(questions[0].prompt.en.includes('schema-compatible'));assert(questions[1].context!.code.includes('one of them went out by email'));
writeFileSync(process.argv[3],JSON.stringify({checkedRecords:5,records:questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),pythonVersion:(python as any).pythonVersion,checks:['three exact-hash authored Python context checks run locally','rollback compatibility and known-good availability are explicit assumptions','already delivered replies persist as consequences; process cleanup is not invented','incident review is manual, not live operational acceptance; no server-side Python or static type-checker run']},null,2),{mode:0o600});
console.log('PASS five exact native bindings with three local Python checks and bounded incident reasoning');
