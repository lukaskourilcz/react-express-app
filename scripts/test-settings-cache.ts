// Synthetic provider only: no credentials, database, accounts or network writes.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
process.env.SUPABASE_URL = 'https://performance-fixture.supabase.co';
process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
process.env.SUPABASE_ANON_KEY = 'fake-public-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-key';
let reads=0,writes=0,release=()=>{},responseValue:unknown;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 assert.equal(u.hostname,'performance-fixture.supabase.co');assert.equal(u.pathname,'/rest/v1/app_settings');
 if(init?.method==='POST'){writes++;return new Response(null,{status:201});}
 reads++;await new Promise<void>(resolve=>{const prior=release;release=()=>{prior();resolve();};});
 return Response.json([{value:responseValue}]);
};
try{
 const{getGameSettings,saveGameSettings,setGameSettingsForTests,DEFAULT_SETTINGS}=await import('../lib/settings-store');
 responseValue=DEFAULT_SETTINGS;setGameSettingsForTests(null);
 const requests=Array.from({length:8},()=>getGameSettings());await new Promise(r=>setTimeout(r,20));const concurrentReads=reads;release();await Promise.all(requests);
 const expected=Number(process.env.EXPECT_SETTINGS_READS||1);assert.equal(concurrentReads,expected);assert.deepEqual(await getGameSettings(),await requests[0]);assert.equal(reads,expected);
 // A read begun before a successful save must never repopulate the cache
 // with its old answer after the write completes.
 if(!process.env.BASELINE_SETTINGS_ONLY){
  setGameSettingsForTests(null);release=()=>{};const oldRead=getGameSettings();await new Promise(r=>setTimeout(r,10));
  const fresh={...DEFAULT_SETTINGS,quiz:{...DEFAULT_SETTINGS.quiz,maxCount:31}};await saveGameSettings(fresh);release();await oldRead;assert.equal((await getGameSettings()).quiz.maxCount,31);assert.equal(writes,1);
  // Concurrent failures share one request, settle safely, and reset can retry.
  setGameSettingsForTests(null);let failures=0;globalThis.fetch=async()=>{failures++;throw new Error('synthetic outage');};
  const failed=await Promise.all(Array.from({length:5},()=>getGameSettings()));assert.ok(failures < 5, `outage requests must be coalesced, including SDK retries: ${failures}`);assert.ok(failed.every(v=>v===DEFAULT_SETTINGS));
  // A read that fails after a good one serves the owner's settings, not the
  // defaults: a database blip must not switch Play back on.
  setGameSettingsForTests(null);const owner={...DEFAULT_SETTINGS,features:{...DEFAULT_SETTINGS.features,multiplayer:false}};let down=false;
  globalThis.fetch=async()=>{if(down)throw new Error('synthetic outage');return Response.json([{value:owner}]);};
  assert.equal((await getGameSettings()).features.multiplayer,false,'the owner switched Play off');
  const realNow=Date.now;const later=realNow()+60_000;Date.now=()=>later;down=true;
  try{assert.equal((await getGameSettings()).features.multiplayer,false,'an outage after the cache expired keeps the last known settings');}finally{Date.now=realNow;}
 }
 const result={concurrentCallers:8,providerReads:concurrentReads,expectedReads:expected,staleReadCannotOverwriteSave:!process.env.BASELINE_SETTINGS_ONLY,outageShared:!process.env.BASELINE_SETTINGS_ONLY};
 if(process.env.SETTINGS_RESULT_FILE)writeFileSync(process.env.SETTINGS_RESULT_FILE,JSON.stringify(result,null,2)+'\n');console.log('PASS settings provider contract',result);
}finally{globalThis.fetch=originalFetch;}
