import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {codingTaskById} from '../../../../lib/coding/active';
import {solutionFor} from '../../../../lib/coding/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
const candidates=JSON.parse(readFileSync(process.argv[2] ?? 'docs/audit/wip/coding/candidates-2026-10-15-b001.json','utf8')) as Record<string,Record<string,string>>;
let total=0;
for(const[id,manual]of Object.entries(candidates)){
 const task=codingTaskById(id)!,solution=solutionFor(id)!;
 for(const[label,code]of Object.entries({reference:solution.solution,junior:solution.junior!,senior:solution.senior!,alternative:manual.alternative})){
  const result=assessComplexity(task,code);
  assert.equal(result.guidance.targetTime,'O(n)',id);
  assert.notEqual(result.assessment,'above-target',id+'/'+label);
  assert.equal(codingPassXp(result),25,id+'/'+label);
  total++;console.log(JSON.stringify({id,label,time:result.time,assessment:result.assessment,xp:codingPassXp(result)}));
 }
}
assert.equal(total,Object.keys(candidates).length*4);
if(candidates['js-largest-number']?.['alternative-sorting-copy']) {
const task=codingTaskById('js-largest-number')!;
const report=assessComplexity(task,candidates['js-largest-number']['alternative-sorting-copy']);
assert.equal(report.guidance.targetTime,'O(n)');
assert.equal(codingPassXp(report),report.assessment==='above-target'?15:25);
console.log(JSON.stringify({id:task.id,label:'alternative-sorting-copy',time:report.time,assessment:report.assessment,xp:codingPassXp(report)}));
console.log('PASS correct slower alternative reward rule');
}
console.log('PASS '+total+' selected authored O(n)/base-25-XP no-false-penalty checks');
