import assert from 'node:assert/strict';
import {LEARNING_PATHS} from '../lib/learning-paths/catalog';
import {gradeCheck} from '../lib/learning-paths/grade';
import { DOMAIN_PROJECT_CHECK } from './fixtures/domain-check-fixture';
import {activityDomainScores, diagnosticCompetencies, diagnosticEvidence} from '../lib/learning-paths/competencies';

export function diagnosticCompetencyContracts() {
  const path=LEARNING_PATHS.find(p=>p.id==='fde')!;
  const activity=path.modules.flatMap(m=>m.activities).find(a=>a.id===path.diagnosticActivityId)!;
  const key=activity.questions!.map(q=>q.correct);
  const answers=key.map((v,i)=>i<2?(v+1)%4:v);
  const graded=gradeCheck(activity,key,answers);
  assert.equal(graded.state,'verified_pass');assert.equal(graded.score,0.8333);
  const counts=diagnosticEvidence(activity,graded.verdicts);
  const report=diagnosticCompetencies(path,counts);
  const byId=new Map(report.map(r=>[r.competencyId,r]));
  assert.deepEqual(byId.get('integration'),{competencyId:'integration',state:'gap',score:0.3333,assessedItems:3});
  assert.deepEqual(byId.get('handoff'),{competencyId:'handoff',state:'demonstrated',score:1,assessedItems:3});
  assert.deepEqual(byId.get('operations'),{competencyId:'operations',state:'demonstrated',score:1,assessedItems:2});
  assert.deepEqual(byId.get('python-reading'),{competencyId:'python-reading',state:'not_assessed',score:null,assessedItems:0});
  // Q5 contributes to both boundaries and operations, not merely its primary area.
  const multi=gradeCheck(activity,key,key.map((v,i)=>i===4?(v+1)%4:v));
  const multiReport=diagnosticCompetencies(path,diagnosticEvidence(activity,multi.verdicts));
  for(const id of ['boundaries','operations']) assert.deepEqual(multiReport.find(r=>r.competencyId===id),{competencyId:id,state:'gap',score:0.5,assessedItems:2});
  const legacyCases: (Record<string, number> | null)[] = [null,{}, {score:1}, {integration:1}, {'diagnostic:v1:integration:items':3}, {'diagnostic:v1:integration:items':3,'diagnostic:v1:integration:correct':4}];
  for(const legacy of legacyCases) {
    assert(diagnosticCompetencies(path,legacy).every(r=>r.state==='not_assessed'&&r.assessedItems===0&&r.score===null));
  }
  assert.throws(()=>diagnosticEvidence(activity,graded.verdicts.slice(1)),/Incomplete/);
  assert.throws(()=>diagnosticEvidence(activity,[...graded.verdicts.slice(1),graded.verdicts[1]]),/Incomplete/);
  assert.equal(activityDomainScores(activity,counts),null);
  // A domain-gated check keeps only its own domains' scores. No published
  // check has domains since E5 (#496) retired DSA Foundations, so the retired
  // final stands in as a private fixture.
  const gated=DOMAIN_PROJECT_CHECK;
  assert.deepEqual(activityDomainScores(gated,{...counts,[gated.domains![0]]:0.5}),{[gated.domains![0]]:0.5});
  assert.equal(graded.keyWithheld,false);assert(graded.verdicts.every(v=>v.correctIndex!==undefined&&v.explanation));
  assert.equal(activity.purpose,'diagnostic');assert(path.modules.find(m=>m.activities.includes(activity))?.optional);
  console.log('PASS diagnostic: overall pass with a real gap, multi-tag counts, unassessed legacy data and private storage namespace');
}
