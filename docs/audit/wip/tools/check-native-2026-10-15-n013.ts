import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash} from '../../../../lib/learning-paths/audit';
const activity=LEARNING_PATHS.find(p=>p.id==='dsa-foundations')!.modules.find(m=>m.id==='dsa-v1-d10')!.activities.find(a=>a.kind==='check')!;
const questions=activity.questions!.slice(0,5);assert.equal(questions.length,5);assert.deepEqual(questions.map(q=>q.correct),[0,0,0,0,0]);
// Execute only the individually read literal question contexts, including their intentional defects.
const report=new Function(questions[0].context!.code+';return report;')();
for(const n of [0,1,2,7,16])for(const m of [0,1,33]){const spans=Array.from({length:n},()=>({start:0,end:1}));let reads=0;const measured=new Proxy(spans,{get(t,p){if(typeof p==='string'&&/^\d+$/.test(p))reads++;return Reflect.get(t,p);}});const notes=Array.from({length:m},(_,i)=>'note'+i);const result=report(measured,notes);assert.equal(reads,n<2?0:n*(n-1));assert.equal(result.length,n*(n-1)/2+m);assert.deepEqual(result.slice(result.length-m),m?notes:[]);}
const buildRuns=new Function(questions[1].context!.code+';return buildRuns;')();
for(const values of [[],[1],[1,1,1],[1,2,1,2,1,2],[NaN,NaN]]){const result=buildRuns(values);assert.equal(result.reduce((sum:number,run:any[])=>sum+run.length,0),values.length);assert.deepEqual(result.flat(),values);}
assert.equal(buildRuns([1,2,1,2,1,2]).length,6);
const map=new Map<string,()=>number>();const object:Record<string,()=>number>={};for(const [i,id]of ['first','305','12','toString'].entries()){const handler=()=>i;map.set(id,handler);object[id]=handler;}
assert.deepEqual([...map.keys()],['first','305','12','toString']);assert.deepEqual(Object.keys(object),['12','305','first','toString']);assert.equal(map.get('toString')!(),3);assert.equal(new Map().get('toString'),undefined);assert.equal(typeof ({} as any).toString,'function');
const balanced=new Function(questions[3].context!.code+';return balanced;')();
assert.deepEqual(['())',')(','(()','()()'].map(s=>balanced(s)),[true,false,false,true]);assert.equal([].pop(),undefined);
const brokenSearch=new Function(questions[4].context!.code+';return search;')();const fixedSearch=new Function(questions[4].context!.code.replace('low < high','low <= high')+';return search;')();
assert.equal(brokenSearch([2],2),-1);assert.equal(brokenSearch([1,3,5,7],7),-1);
for(const values of [[],[2],[1,3,5,7],[1,1,2,3,3],[-2.5,-1,0,0.5,8]])for(const target of [...values,-3,9]){const index=fixedSearch(values,target);if(values.includes(target))assert.equal(values[index],target);else assert.equal(index,-1);}
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),checks:['triangular pair reads plus independent notes','returned run slots and alternating-value counterexample','Map insertion and integer-index object order with inherited-name key','all four parenthesis choices through the intentionally broken checker','closed-interval singleton failure and repaired search examples; complexity bounds remain manual cost-model reasoning']},null,2),{mode:0o600});
console.log('PASS five foundation-assessment question contexts and option distinctions');
