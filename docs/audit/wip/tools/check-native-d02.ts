import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathById, activityIn } from '../../../../lib/learning-paths/catalog';
import { gradePathCode } from '../../../../lib/learning-paths/grade';
import { solutionFor } from '../../../../lib/learning-paths/solutions';
// Compile this repository-relative audit runner and pass two private output files.
// It checks execution evidence only and never assigns editorial scores.
const path=pathById('dsa-foundations')!;
const candidates={
 'dsa-v1-d02-reverse-in-place': {
  alternative:'function reverseInPlace(values){for(let i=0,j=values.length-1;i<j;i++,j--){[values[i],values[j]]=[values[j],values[i]];}return values;}',
  'copy-valid':'function reverseInPlace(values){const out=values.slice().reverse();for(let i=0;i<out.length;i++)values[i]=out[i];return values;}',
  'builtin-valid':'const reverseInPlace=values=>values.reverse();',
  'definition-valid':'function reverseInPlace(values){const out=values.slice().reverse();for(let i=0;i<out.length;i++)Object.defineProperty(values,String(i),{value:out[i],writable:true,enumerable:true,configurable:true});return values;}',
  'wrong-copy-only':'const reverseInPlace=values=>values.slice().reverse();',
  'wrong-no-change':'const reverseInPlace=values=>values;',
  'wrong-excess-definitions':'function reverseInPlace(values){const out=values.slice().reverse();for(let round=0;round<3;round++)for(let i=0;i<out.length;i++)Object.defineProperty(values,String(i),{value:out[i],writable:true,enumerable:true,configurable:true});return values;}',
  'wrong-delete-replace':'function reverseInPlace(values){const out=values.slice().reverse();for(let i=0;i<out.length;i++){delete values[i];values[i]=out[i];}return values;}',
 },
 'dsa-v1-d02-palindrome-two-pointer': {
  alternative:'function isPalindrome(text){let left=0,right=text.length-1;for(;left<right;left++,right--){if(text.charCodeAt(left)!==text.charCodeAt(right))return false;}return true;}',
  'copy-valid':'const isPalindrome=text=>text===text.split("").reverse().join("");',
  'wrong-ignore-case':'const isPalindrome=text=>{text=text.toLowerCase();return text===text.split("").reverse().join("");};',
  'wrong-empty':'const isPalindrome=text=>text.length>0&&text===text.split("").reverse().join("");',
  'wrong-outer-pair':'const isPalindrome=text=>text.length<2||text[0]===text[text.length-1];',
 },
 'dsa-v1-d02-dedupe-sorted': {
  alternative:'function removeDuplicatesSorted(sorted){let count=0,last;for(let i=0;i<sorted.length;i++){const value=sorted[i];if(count===0||value!==last){sorted[count++]=value;last=value;}}return count;}',
  'copy-valid':'function removeDuplicatesSorted(sorted){const values=[...new Set(sorted)];for(let i=0;i<values.length;i++)sorted[i]=values[i];return values.length;}',
  'wrong-count-only':'const removeDuplicatesSorted=sorted=>new Set(sorted).size;',
  'wrong-reversed-prefix':'function removeDuplicatesSorted(sorted){const values=[...new Set(sorted)].reverse();for(let i=0;i<values.length;i++)sorted[i]=values[i];return values.length;}',
  'wrong-length':'const removeDuplicatesSorted=sorted=>sorted.length;',
 },
};
const results=[];
for(const[id,manual] of Object.entries(candidates)){
 const activity=activityIn(path,id)!.activity;assert(activity.code);
 for(const[label,source] of Object.entries({reference:solutionFor(id)!.solution,starter:activity.code.starter,...manual})){
  const result=await gradePathCode(activity,activity.code,source);
  const expected=label==='starter'||label.startsWith('wrong-')?'needs_revision':'verified_pass';
  assert.equal(result.state,expected,`${id}/${label}`);
  results.push({id,label,state:result.state,expected,criteria:result.criteria,outcome:result.code.outcome});
 }
}
writeFileSync(process.argv[2],JSON.stringify(results,null,2),{mode:0o600});
console.log(`PASS native D02: ${results.length}/${results.length} individually selected candidate verdicts`);
const questions=activityIn(path,'dsa-v1-d02-checks')!.activity.questions!;
const mutation = new Function(questions[0].context!.code+';return numbers;')();
assert.deepEqual(mutation,[2,3]);
const counts=[0,1,5,10].map(n=>{
 let writes=0;const input=Array.from({length:n},(_,i)=>i);
 const view=new Proxy(input,{set(target,key,value){if(/^\d+$/.test(String(key)))writes++;target[key as unknown as number]=value;return true;}});
 new Function('queue',questions[1].context!.code+';return drain(queue);')(view);
 assert.equal(writes,n===0?0:n*(n-1)/2);
 return {n,writes};
});
let comparisons=0;
const palSource=questions[3].context!.code.replace('if (text[left] !== text[right])','if ((comparisons++, text[left] !== text[right]))');
const counted=new Function('comparisons',palSource+';return [isPalindrome("abcdcba"), comparisons];')(comparisons);
assert.deepEqual(counted,[true,3]);
writeFileSync(process.argv[3],JSON.stringify({mutation,counts,palindrome:counted,space:'Three fixed local values and bounded section indices; no copied array or recursive stack.'},null,2),{mode:0o600});
console.log('PASS native D02 question probes: mutation [2,3], triangular shift moves, three palindrome comparisons');
