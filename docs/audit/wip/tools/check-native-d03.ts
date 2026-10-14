// Reproducible execution evidence; this never assigns editorial scores.
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { pathById,activityIn } from '../../../../lib/learning-paths/catalog';
import { gradePathCode } from '../../../../lib/learning-paths/grade';
import { solutionFor } from '../../../../lib/learning-paths/solutions';
const path=pathById('dsa-foundations')!;
const candidates={
 'dsa-v1-d03-frequency-map':{
  alternative:'const countFrequencies=values=>values.reduce((map,value)=>{map.set(value,map.has(value)?map.get(value)+1:1);return map;},new Map());',
  'wrong-count-one':'const countFrequencies=values=>new Map(values.map(value=>[value,1]));',
  'wrong-string-keys':'function countFrequencies(values){const out=new Map();for(const value of values){const key=String(value);out.set(key,(out.get(key)||0)+1);}return out;}',
  'wrong-mutates':'function countFrequencies(values){const out=new Map();for(const value of values)out.set(value,(out.get(value)||0)+1);values.length=0;return out;}',
 },
 'dsa-v1-d03-first-unique':{
  alternative:'function firstUnique(values){const counts=new Map();for(const value of values)counts.set(value,(counts.get(value)||0)+1);for(const[value,count]of counts)if(count===1)return value;return null;}',
  'wrong-first-value':'const firstUnique=values=>values.length?values[0]:null;',
  'wrong-index-of':'const firstUnique=values=>{for(const value of values)if(values.indexOf(value)===values.lastIndexOf(value))return value;return null;};',
  'wrong-mutates':'function firstUnique(values){const counts=new Map();for(const value of values)counts.set(value,(counts.get(value)||0)+1);let found=null;for(const value of values)if(counts.get(value)===1){found=value;break;}values.length=0;return found;}',
 },
 'dsa-v1-d03-set-intersection':{
  'wrong-forged-nan':'Number.isNaN=()=>true;function intersection(left,right){const pool=new Set(right),taken=new Set(),out=[];for(const value of left)if(pool.has(value)&&!taken.has(value)){taken.add(value);out.push(value!==value?\"forgedNaN\":value);}return out;}',
  'alternative-fast':'const intersection=(left,right)=>{const remaining=new Set(right);return left.filter(value=>remaining.delete(value));};',
  alternative:'const intersection=(left,right)=>[...new Set(left)].filter(value=>new Set(right).has(value));',
  'wrong-index-of':'const intersection=(left,right)=>left.filter((value,index)=>right.indexOf(value)!==-1&&left.indexOf(value)===index);',
  'wrong-duplicates':'const intersection=(left,right)=>left.filter(value=>right.includes(value));',
  'wrong-right-order':'const intersection=(left,right)=>[...new Set(right)].filter(value=>left.includes(value));',
  'wrong-empty-reuse':'const intersection=(left,right)=>left.length?[...new Set(left)].filter(value=>right.includes(value)):left;',
 },
};
const results=[];
for(const[id,manual]of Object.entries(candidates)){
 const activity=activityIn(path,id)!.activity;
 for(const[label,source]of Object.entries({reference:solutionFor(id)!.solution,starter:activity.code!.starter,...manual})){
  const result=await gradePathCode(activity,activity.code!,source);
  const expected=label === "starter" || label.startsWith("wrong-") ? "needs_revision" : "verified_pass";
  assert.equal(result.state,expected,`${id}/${label}`);
  results.push({id,label,state:result.state,expected,outcome:result.code.outcome,criteria:result.criteria});
 }
}
writeFileSync(process.argv[2],JSON.stringify(results,null,2),{mode:0o600});
console.log(JSON.stringify(results.map(({id,label,state})=>({id,label,state})),null,2));
