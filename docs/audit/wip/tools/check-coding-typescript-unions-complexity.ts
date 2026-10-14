import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {codingTaskById} from '../../../../lib/coding/active';
import {solutionFor} from '../../../../lib/coding/solutions';
import {assessComplexity} from '../../../../lib/coding/complexity';
import {codingPassXp} from '../../../../shared/coding-complexity';
const candidates=JSON.parse(readFileSync('docs/audit/wip/coding/candidates-2026-10-14-typescript-unions.json','utf8')) as Record<string,Record<string,string>>;
let total=0;for(const[id,manual]of Object.entries(candidates)){const task=codingTaskById(id)!,solution=solutionFor(id)!;
for(const[label,code]of Object.entries({reference:solution.solution,junior:solution.junior!,senior:solution.senior!,alternative:manual.alternative})){
 const result=assessComplexity(task,code);assert(result.guidance.targetTime,id);assert.notEqual(result.assessment,'above-target',id+'/'+label);assert.equal(codingPassXp(result),25,id+'/'+label);total++;console.log(JSON.stringify({id,label,time:result.time,assessment:result.assessment,target:result.guidance.targetTime}));
}}
assert.equal(total,20);console.log('PASS twenty selected authored-goal/25 XP checks');
