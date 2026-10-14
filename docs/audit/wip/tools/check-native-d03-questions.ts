import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathById,activityIn } from '../../../../lib/learning-paths/catalog';
const questions=activityIn(pathById('dsa-foundations')!,'dsa-v1-d03-checks')!.activity.questions!;
const countResult=new Function(questions[2].context!.code+';return [seen.size,counts.get("a")];')();
assert.deepEqual(countResult,[4,3]);
const misses=[];
for(const[n,m]of [[0,5],[2,3],[3,5]]){
 let comparisons=0;
 const banned=Array.from({length:m},(_,i)=>i);
 banned.includes=(value:number)=>{for(const item of banned){comparisons++;if(item===value)return true;}return false;};
 const tags=Array.from({length:n},()=>-1);
 const result=new Function('tags','banned',questions[1].context!.code+';return flagged(tags,banned);')(tags,banned);
 assert.deepEqual(result,[]);assert.equal(comparisons,n*m);
 misses.push({n,m,comparisons});
}
const obj:Record<PropertyKey,unknown>={};obj.b=1;obj['10']=1;obj.a=1;obj['2']=1;obj[Symbol('key')]=1;
const keys=Reflect.ownKeys(obj).map(key=>typeof key==='symbol'?'symbol':key);
assert.deepEqual(keys,['2','10','b','a','symbol']);
const identity={};const map=new Map<unknown,number>([[1,1],['1',1],[NaN,1],[NaN,2],[-0,1],[0,2],[identity,1],[{},1]]);
assert.equal(map.size,6);assert.equal(map.get(NaN),2);assert.equal(map.get(0),2);
writeFileSync(process.argv[2],JSON.stringify({countResult,misses,keys,mapSize:map.size,nanCount:map.get(NaN),zeroCount:map.get(0)},null,2),{mode:0o600});
console.log('PASS D03 question/lesson probes: [4,3], nm miss comparisons, own-key order and SameValueZero identities');
