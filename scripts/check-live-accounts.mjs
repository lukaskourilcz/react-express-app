// Explicit operator smoke test. Only locally supplied, marked disposable users
// can be used; this script never accepts an owner's normal account for deletion.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(process.env.SMOKE_ACCOUNT_FILE, 'utf8'));
const base = process.env.SMOKE_BASE_URL || 'https://devshark.app';
const users = config.users;
assert(users.length === 2 && users.every(u => /^launch-audit-.*@example\.invalid$/.test(u.email)));
const tokens = [];
const sessions = [];
const checked = [];
const check = name => { checked.push(name); console.log('PASS ' + name); };
async function json(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(50_000) });
  const data = await response.json();
  return { status: response.status, data };
}
async function api(index, path, body, method = body ? 'POST' : 'GET', expected = 200) {
  const result = await json(base + path, { method, headers: { Authorization: 'Bearer ' + tokens[index], 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal(result.status, expected, `${path}: HTTP ${result.status} (${result.data.error?.code ?? 'unexpected response'})`);
  return result.data;
}
try {
  for (const u of users) {
    const signed = await json(config.url + '/auth/v1/token?grant_type=password', {method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({email:u.email,password:u.password})});
    assert.equal(signed.status, 200, 'Fixture sign-in failed');
    assert.equal(signed.data.user.id, u.id);
    assert.equal(signed.data.user.app_metadata.launch_audit, '2026-09-15');
    tokens.push(signed.data.access_token);
    sessions.push(signed.data);
  }
  writeFileSync('/tmp/devshark-launch-sessions.json', JSON.stringify({ ...config, tokens, sessions }), {mode:0o600});
  check('two independently authenticated disposable users');
  await api(0, '/api/admin/questions', undefined, 'GET', 403);
  await api(1, '/api/admin/questions', undefined, 'GET', 403);
  check('non-admin denial for both accounts');
  const id = 'js-evolving-calculator-1-start';
  for(let i=0;i<2;i++) await api(i,'/api/user/coding-draft',{id,code:`// launch audit ${i}`,user_id:users[1-i].id});
  for(let i=0;i<2;i++) assert.equal((await api(i,`/api/user/coding-draft?id=${id}&user_id=${users[1-i].id}`)).code,`// launch audit ${i}`);
  const rls = await json(config.url+'/rest/v1/coding_drafts?select=user_id,task_id&task_id=eq.'+id,{headers:{apikey:config.key,Authorization:'Bearer '+tokens[1]}});
  assert([200,403].includes(rls.status)); if(rls.status===200) assert(rls.data.every(row=>row.user_id===users[1].id));
  check('draft isolation through API; direct Data API access is isolated or denied');
  const task = await api(0,`/api/quiz/roadmap?resource=coding-task&id=${id}`);
  assert(task.session);
  await api(1,'/api/quiz/roadmap?resource=coding-submit',{session:task.session,code:'function calculate(s){return Number(s)}'},'POST',403);
  check('sealed coding session rejects another authenticated account');
  for (const mode of ['multiplayer','classroom']) {
    const room=await api(0,'/api/play/create',{host_name:'Launch audit host',mode,count:5,categories:['javascript'],duration_s:0});
    const joined=await api(1,'/api/play/join',{code:room.code,display_name:'Launch audit player'});
    assert(joined.questions.every(q=>!('correct_index' in q)&&!('explanation' in q)));
    await api(1,'/api/play/control',{code:room.code,action:'start'},'POST',403);
    await api(0,'/api/play/control',{code:room.code,action:'start'});
    const host=await api(0,`/api/play/state?code=${room.code}`);
    assert.equal(host.participants.length,2);
    assert(host.match.questions.every(q=>mode==='classroom'?Number.isInteger(q.correct_index):!('correct_index'in q)));
    for(let q=0;q<host.match.questions.length;q++) {
      await api(1,'/api/play/answer',{code:room.code,question_idx:q,selected_idx:0});
      if(q===0){ const duplicate=await api(1,'/api/play/answer',{code:room.code,question_idx:q,selected_idx:1});assert.equal(duplicate.advanced,false); }
      if(mode==='multiplayer') await api(0,'/api/play/answer',{code:room.code,question_idx:q,selected_idx:0});
      else await api(0,'/api/play/control',{code:room.code,action:'advance'});
    }
    const finished=await api(1,`/api/play/state?code=${room.code}`);
    assert.equal(finished.match.status,'finished');
    assert(finished.match.questions.every(q=>Number.isInteger(q.correct_index)));
    check(`${mode}: create, join, host permissions, hidden answers, retry, progression and finish`);
  }
} finally {
  const cleanup=[];
  for(let i=0;i<tokens.length && !process.env.SMOKE_KEEP_FIXTURES;i++) {
    try {
      const current=await json(config.url+'/auth/v1/user',{headers:{apikey:config.key,Authorization:'Bearer '+tokens[i]}});
      assert.equal(current.data.id,users[i].id);
      assert.equal(current.data.app_metadata.launch_audit,'2026-09-15');
      await api(i,'/api/user/delete-account',{confirmation:'DELETE'},'DELETE');
      const rejected=await json(config.url+'/auth/v1/user',{headers:{apikey:config.key,Authorization:'Bearer '+tokens[i]}});
      assert(rejected.status>=400,'Deleted account token still authenticates');
      cleanup.push(true);check(`disposable account ${i+1} deletion and token rejection`);
    } catch(error) {cleanup.push(false);console.error('Cleanup needs attention for fixture '+(i+1)+': '+error.message);process.exitCode=1;}
  }
  writeFileSync('artifacts/live-account-check.json',JSON.stringify({timestamp:new Date().toISOString(),base,checks:checked,cleanup},null,2));
}
