import { CODING_TASKS } from '../lib/coding/catalog';
import { solutionFor } from '../lib/coding/solutions';
import { runReactSuite,prepareReactRuntime } from '../lib/coding/react-runner';
import { withHiddenCases } from '../lib/coding/react-hidden';
import { lockDownRealm } from '../lib/coding/realm-lockdown';

await prepareReactRuntime();
lockDownRealm();
const log=console.log.bind(console);
console.error=console.warn=()=>{};
let checked=0,failed=0;
for(const task of CODING_TASKS) {
  if(task.track!=='react'||task.verify!=='tests'||!task.suite||!new RegExp(process.env.CODING_ONLY??'').test(task.id)) continue;
  const solution=solutionFor(task.id); if(!solution) throw new Error(`Missing ${task.id}`);
  for(const [name,source] of Object.entries({reference:solution.solution,...(process.env.REACT_ALL_VARIANTS==='1'?{junior:solution.junior,senior:solution.senior}:{})})) {
    if(!source) continue;
    const result=await runReactSuite({suite:withHiddenCases(task.suite,solution.hiddenSuite),appSource:source}); checked++;
    if(result.compileError||result.failed) { failed++; log(JSON.stringify({task:task.id,name,error:result.compileError,cases:result.cases.filter(one=>one.status==='fail').map(one=>({name:one.name,error:one.error}))})); }
    else log(`PASS ${task.id} ${name}`);
  }
}
log(`React engine: ${checked} solutions, ${failed} failures`);
process.exit(failed?1:0);
