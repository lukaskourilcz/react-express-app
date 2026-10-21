import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash,nativeGradingHash } from '../../../../lib/learning-paths/audit';
import { solutionFor } from '../../../../lib/learning-paths/solutions';
import { assessComplexity } from '../../../../lib/coding/complexity';
import { codingPassXp } from '../../../../shared/coding-complexity';
const path=LEARNING_PATHS.find(p=>p.id==='dsa-foundations')!;
const sorting=path.modules.find(m=>m.id==='dsa-v1-d08')!.activities.filter(a=>a.kind==='code');
assert.equal(sorting.length,3);
const manual=JSON.parse(readFileSync(process.argv[2],'utf8')) as Record<string,Record<string,string>>;
const worker=JSON.parse(readFileSync(process.argv[3],'utf8')) as {id:string;state:string;expected:string;contentHash:string;gradingHash:string}[];
assert.equal(worker.length,18);
for(const result of worker){const activity=sorting.find(a=>a.id===result.id)!;assert.equal(result.state,result.expected);assert.equal(result.contentHash,nativeContentHash(activity));assert.equal(result.gradingHash,nativeGradingHash(activity));}
let rewards=0;
for(const activity of sorting){
 const target=activity.id.endsWith('merge-sort')?'O(n log n)':'O(n²)';
 for(const source of [solutionFor(activity.id)!.solution,manual[activity.id].alternative]){
  const report=assessComplexity({track:'javascript',prompt:activity.code!.prompt,tests:activity.code!.tests},source);
  assert.equal(report.guidance.targetTime,target);assert.notEqual(report.assessment,'above-target');assert.equal(codingPassXp(report),25);rewards++;
 }
}
assert.equal(rewards,6);
const questions=path.modules.find(m=>m.id==='dsa-v1-d09')!.activities.flatMap(a=>a.questions??[]).slice(0,2);
assert.deepEqual(questions.map(q=>q.id),['dsa-v1-d09-q1','dsa-v1-d09-q2']);
type Node={value:number;left:Node|null;right:Node|null};
const height=(node:Node|null):number=>node===null?-1:1+Math.max(height(node.left),height(node.right));
const size=(node:Node|null):number=>node===null?0:1+size(node.left)+size(node.right);
const leaf={value:7,left:null,right:null};assert.equal(height(leaf),0);assert.equal(size(leaf),1);
assert.deepEqual(questions[0].options.flatMap((o,i)=>o.en==='Height 0 and size 1'?[i]:[]),[questions[0].correct]);
// Only the individually read literal tree context executes on this host.
const tree=new Function(questions[1].context!.code+'\nreturn tree;')() as Node;
const allValues=(node:Node|null):number[]=>node===null?[]:[node.value,...allValues(node.left),...allValues(node.right)];
assert(allValues(tree).includes(10));
const visited:number[]=[];let node:Node|null=tree;while(node){visited.push(node.value);if(node.value===10)break;node=10<node.value?node.left:node.right;}
assert.equal(node,null);assert.deepEqual(visited,[8,12]);assert.equal(tree.left!.right!.value,10);assert(tree.left!.right!.value>=tree.value);
assert.equal(questions[1].correct,0);assert(questions[1].explanation.en.includes('goes right at 8'));
assert(process.argv[4]);
writeFileSync(process.argv[4],JSON.stringify({checkedRecords:5,records:[
 ...sorting.map(a=>({id:a.id,contentHash:nativeContentHash(a),gradingHash:nativeGradingHash(a)})),
 ...questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),
],rewardAnalyses:rewards,checks:['eighteen exact-hash sandbox verdicts','six authored-target/base-25 analyses, unknown unpenalized',
 'explicit single-node edge-height convention','actual misplaced-descendant tree and right-then-left search trace'],
},null,2),{mode:0o600});
console.log('PASS five native records: three sorting exercises, authored targets and two tree questions');
