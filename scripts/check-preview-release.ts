// Uses a private, temporary Vercel access link. Never print or persist cookies,
// access URLs, sessions, source, credentials or full error response bodies.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { solutionFor } from '../lib/coding/solutions';

const access=JSON.parse(readFileSync(process.argv[2],'utf8')) as {url:string};
const origin=new URL(access.url).origin;
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN});
const context=await browser.newContext();
try {
  const page=await context.newPage();
  try {await page.goto(access.url,{waitUntil:'domcontentloaded',timeout:30000});}
  catch {throw new Error('Temporary preview access could not be established');}
  for(const path of ['/api/health','/big-o','/learn/big-o']) {
    const response=await context.request.get(origin+path);
    assert.equal(response.status(),200,`${path}: HTTP ${response.status()}`);
    console.log(`PASS preview ${path}: HTTP 200`);
  }
  for(const id of ['react-counter','js-double-numbers']) {
    const opened=await context.request.get(`${origin}/api/quiz/roadmap?resource=coding-task&id=${id}&lang=en`);
    assert.equal(opened.status(),200,`${id}: task HTTP ${opened.status()}`);
    const task=await opened.json();
    for(const [kind,code,expected] of [
      ['reference',solutionFor(id)!.solution,'passed'],
      ['wrong',id==='react-counter'?'export default function App(){return <p>wrong</p>;}':'const double = ns => ns;','failed'],
    ]) {
      const submitted=await context.request.post(`${origin}/api/quiz/roadmap?resource=coding-submit`,{data:{session:task.session,code,runCount:1,hintsUsed:0,durationMs:30000,lang:'en'},timeout:50000});
      const result=await submitted.json();
      assert.equal(submitted.status(),200,`${id} ${kind}: HTTP ${submitted.status()}, error ${result.error?.code??'none'}`);
      assert.equal(result.verdict,expected,`${id} ${kind}: ${result.verdict??'missing verdict'}`);
      assert.equal(result.xpAwarded,0,'signed-out preview grading creates no XP');
      assert.equal(result.progress,null,'signed-out preview grading creates no progress');
      console.log(`PASS preview ${id} ${kind}: ${expected}, 0 XP, no progress`);
    }
  }
} finally {await context.close();await browser.close();}
