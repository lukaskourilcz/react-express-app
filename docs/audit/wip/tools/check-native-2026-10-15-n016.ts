import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {LEARNING_PATHS} from '../../../../lib/learning-paths/catalog';
import {nativeContentHash} from '../../../../lib/learning-paths/audit';
const all=LEARNING_PATHS.find(p=>p.id==='fde')!.modules.flatMap(m=>m.activities.flatMap(a=>a.questions??[]));
const questions=all.filter(q=>['fde-v1-diagnostic-q2','fde-v1-diagnostic-q3','fde-v1-diagnostic-q4','fde-v1-diagnostic-q5','fde-v1-diagnostic-q6'].includes(q.id));assert.equal(questions.length,5);assert.deepEqual(questions.map(q=>q.correct),[2,1,0,2,1]);
// An illustrative in-memory atomic claim models the stated idempotency contract;
// it is not a real payment call, database transaction or operational acceptance test.
const claims=new Map<string,Promise<{invoice:number}>>();let writes=0;const create=(key:string)=>{if(claims.has(key))return claims.get(key)!;const pending=Promise.resolve().then(()=>({invoice:++writes}));claims.set(key,pending);return pending;};
const invoices=await Promise.all([create('order-1'),create('order-1'),create('order-1')]);assert.equal(writes,1);assert(invoices.every(i=>i===invoices[0]));await create('fresh-retry-key');assert.equal(writes,2);
// Execute only the individually read authored mapper/handler contexts with stubs.
const mapping=new Function(questions[1].context!.code+';return {toCustomer,findByVat};')();const customers=[{customer_id:1,name:'A',vat_id:''},{customer_id:2,name:'B',vat_id:''},{customer_id:3,name:'C',vat_id:null}].map(mapping.toCustomer);assert.deepEqual(customers.map((c:any)=>c.vatId),['','',null]);assert.deepEqual(mapping.findByVat(customers,'').map((c:any)=>c.externalId),[1,2]);
const tenantA='tenant-a',tenantB='tenant-b',caseB={id:'case-b',tenantId:tenantB};const req={body:{tenantId:tenantB,caseId:caseB.id}};const session={tenantId:tenantA};const db={cases:{findOne:async(filter:any)=>filter.id===caseB.id&&filter.tenantId===tenantB?caseB:null}};let returned:any;
const run=new Function('requireSession','db',questions[2].context!.code.replace('export default ','')+';return handler;')(async()=>session,db);
await run(req,{json:(value:any)=>{returned=value;}});assert.equal(returned,caseB);
const scoped=new Function('requireSession','db',questions[2].context!.code.replace('export default ','').replace('tenantId, id: caseId','tenantId: session.tenantId, id: caseId')+';return handler;')(async()=>session,db);
await scoped(req,{json:(value:any)=>{returned=value;}});assert.equal(returned,null);
// Q5/Q6 have no executable context. Their conclusions were manually checked
// against the stated Vite exposure/code-only rollback contracts and primary docs.
assert(questions[3].prompt.en.includes('Vite-built'));assert(questions[3].explanation.en.includes('VITE-prefixed'));assert(questions[4].prompt.en.includes('without restoring data, changing schema or running migrations'));
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:questions.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null})),checks:['illustrative same-key concurrent claim versus fresh key, not a payment/database test','actual CSV empty-string mapping and array matches','actual unrestricted handler context with stubbed tenant data and scoped repair','manual Vite primary-document check and explicit code-only schema compatibility reasoning; metadata assertions are not independent correctness proof']},null,2),{mode:0o600});
console.log('PASS five FDE diagnostic records: authored contexts and explicit source/contract limits');
