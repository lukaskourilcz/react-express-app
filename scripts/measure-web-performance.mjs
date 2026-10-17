// Bounded read-only browser lab. Never submits forms, logs in, or writes APIs.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const origin = new URL(args.url || 'https://devshark.app').origin;
const routes = (args.routes || '/,/quiz,/learn,/coding,/leaderboard,/premium,/topics/javascript-closures,/big-o').split(',');
const samples = Number(args.samples || 2), output = args.output || '/tmp/devshark-performance-2026-10-17/production-before.json';
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
const results = [];
try {
 for (const profile of ['mobile','desktop']) for (const path of routes) for (let sample=0;sample<samples;sample++) {
  const context = await browser.newContext({ viewport: profile==='mobile'?{width:390,height:844}:{width:1440,height:1000}, deviceScaleFactor:1, isMobile:profile==='mobile', hasTouch:profile==='mobile', colorScheme:'light', reducedMotion:'reduce', serviceWorkers:'block' });
  const page = await context.newPage(), cdp=await context.newCDPSession(page);let blockedWrites=0;
  await cdp.send('Network.enable');
  await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
  cdp.on('Fetch.requestPaused', async e=>{
   const url=new URL(e.request.url);
   if (!['GET','HEAD','OPTIONS'].includes(e.request.method) || (url.origin!==origin&&!url.hostname.endsWith('fonts.gstatic.com'))) {
    if(!['GET','HEAD','OPTIONS'].includes(e.request.method))blockedWrites++;
    await cdp.send('Fetch.failRequest',{requestId:e.requestId,errorReason:'BlockedByClient'}).catch(()=>{});
   } else await cdp.send('Fetch.continueRequest',{requestId:e.requestId}).catch(()=>{});
  });
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:profile==='mobile'?150:20,downloadThroughput:(profile==='mobile'?1.6:10)*1e6/8,uploadThroughput:750000});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile==='mobile'?4:1});
  await page.addInitScript(()=>{
   localStorage.setItem('devquiz:color-mode','light');
   window.__lab={lcp:0,cls:0,interactions:[]};
   new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lab.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
   new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__lab.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
   new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.interactionId)window.__lab.interactions.push({name:e.name,duration:e.duration,inputDelay:e.processingStart-e.startTime});}).observe({type:'event',durationThreshold:16,buffered:true});
  });
  for(const cache of ['cold-browser','repeat-browser']) {
   let diskHits=0;const listener=e=>{if(e.response.fromDiskCache||e.response.fromPrefetchCache)diskHits++;};cdp.on('Network.responseReceived',listener);
   const started=Date.now();await page.goto(origin+path,{waitUntil:'load',timeout:60000});await page.waitForTimeout(profile==='mobile'?5000:2500);
   const measurement=await page.evaluate(()=>{
    const n=performance.getEntriesByType('navigation')[0];const resources=performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,kind:r.initiatorType,start:r.startTime,duration:r.duration,ttfb:r.responseStart-r.requestStart,download:r.responseEnd-r.responseStart,transfer:r.transferSize,encoded:r.encodedBodySize,decoded:r.decodedBodySize,serverTiming:r.serverTiming.map(t=>({name:t.name,duration:t.duration}))}));
    return {navigation:{ttfb:n.responseStart-n.requestStart,dns:n.domainLookupEnd-n.domainLookupStart,connect:n.connectEnd-n.connectStart,tls:n.secureConnectionStart?n.connectEnd-n.secureConnectionStart:0,download:n.responseEnd-n.responseStart,domContentLoaded:n.domContentLoadedEventEnd,load:n.loadEventEnd},...window.__lab,resources,heading:document.querySelector('h1')?.textContent?.trim(),buttons:[...document.querySelectorAll('button')].map(b=>b.getAttribute('aria-label')||b.textContent?.trim()).slice(0,20)};
   });
   // Local-only appearance/menu changes; no quiz/start/submit or sign-in action.
   const control=page.getByRole('button',{name:/^(Open navigation menu|Appearance)$/}).first();
   if(await control.count()){await control.click();await page.waitForTimeout(250);measurement.interactions=await page.evaluate(()=>window.__lab.interactions);await page.keyboard.press('Escape');}
   cdp.off('Network.responseReceived',listener);
   const row={profile,path,sample,cache,elapsed:Date.now()-started,diskHits,blockedWrites,...measurement};results.push(row);writeFileSync(output,JSON.stringify({environment:{origin,time:new Date().toISOString(),platform:os.platform(),arch:os.arch(),chrome:browser.version(),network:'mobile150ms/1.6Mbps/CPU4;desktop20ms/10Mbps/CPU1; simulated via CDP',samples,scope:'anonymous,essential consent,read-only; cold browser is NOT proven cold server; EventTiming is lab interaction latency, NOT field INP'},results},null,2)+'\n');
   console.log(profile,path,sample,cache,'TTFB',Math.round(row.navigation.ttfb),'LCP',Math.round(row.lcp),'CLS',row.cls.toFixed(3),'cacheHits',diskHits);
  }
  await context.close();
 }
} finally {await browser.close();}
