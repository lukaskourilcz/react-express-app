import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
// Operator-only live check, using the disposable sessions from check-live-accounts.
const config=JSON.parse(readFileSync(process.env.SMOKE_SESSION_FILE,'utf8'));
assert(config.sessions.length===2 && config.sessions.every(s=>s.user.app_metadata.launch_audit==='2026-09-15' && /^launch-audit-.*@example\.invalid$/.test(s.user.email)));
const base=process.env.SMOKE_BASE_URL;
assert(base,'Set SMOKE_BASE_URL to the authorized deployment');
const browser=await chromium.launch({...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),headless:true});
const contexts=[];const pages=[];const checks=[];
async function api(path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+config.tokens[0],'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert.equal(r.status,200);return r.json();}
try{
 for(let i=0;i<2;i++){
  const context=await browser.newContext();contexts.push(context);
  await context.addInitScript(({session})=>{localStorage.setItem('sb-rvlybcjdpafwyeuojvhl-auth-token',JSON.stringify(session));localStorage.setItem('lang','en');},{session:config.sessions[i]});
  pages.push(await context.newPage());
 }
 for(const mode of ['multiplayer','classroom']){
  const room=await api('/api/play/create',{host_name:'Launch audit host',mode,count:5,categories:['javascript'],duration_s:0});
  await pages[0].goto(base+'/play/'+room.code);
  await pages[0].getByRole('button',{name:/Start.*5/i}).waitFor({timeout:30000});
  await pages[1].goto(base+'/play/'+room.code);
  await pages[1].getByText('Launch audit 1',{exact:true}).first().waitFor({timeout:30000});
  if(mode==='classroom')await contexts[1].setOffline(true);
  await pages[0].getByRole('button',{name:/Start.*5/i}).click();
  if(mode==='classroom'){
   await pages[0].getByRole('radio').first().waitFor();
   await contexts[1].setOffline(false);
   await pages[1].getByRole('radio').first().waitFor({timeout:30000});
   await pages[1].reload();
   console.log('PASS browser reconnect and reload during running Classroom');
  }
  for(let q=0;q<5;q++){
   await pages[1].getByRole('radio').first().waitFor({timeout:30000});
   const previous=await pages[1].getByRole('radiogroup').getAttribute('aria-labelledby');
   const question=await pages[1].locator('[id="'+previous+'"]').innerText();
   const recorded=pages[1].waitForResponse(r=>r.url().includes('/api/play/answer')&&r.request().method()==='POST');
   await pages[1].getByRole('radio').first().click();
   assert.equal((await recorded).status(),200);
   if(mode==='multiplayer')await pages[0].getByRole('radio').first().click();
   else await pages[0].getByRole('button',{name:q===4?/Show results/i:/Next question/i}).click();
   await pages[1].waitForFunction(old=>{const g=document.querySelector('[role="radiogroup"]');return !g||document.getElementById(g.getAttribute('aria-labelledby'))?.innerText!==old;},question,{timeout:15000});
  }
  await pages[1].getByRole('button',{name:/Leave|Back|Play again/i}).first().waitFor({timeout:30000});
  const state=await api('/api/play/state?code='+room.code);assert.equal(state.match.status,'finished');
  checks.push(mode);console.log('PASS browser '+mode);
 }
}catch(e){for(let i=0;i<pages.length;i++){writeFileSync('artifacts/live-browser-'+i+'.txt',await pages[i].locator('body').innerText());await pages[i].screenshot({path:'artifacts/live-browser-'+i+'.png',fullPage:true});}throw e;}
finally{await browser.close();writeFileSync('artifacts/live-browser-results.json',JSON.stringify({checks},null,2));}
