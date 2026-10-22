import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { storeFakeSession, localAuth } from './fake-session';
import { pathById, publicManifest, activitySummary } from '../../lib/learning-paths/catalog';
import { pathInventory } from '../../shared/learning-paths';

const path = pathById('fde')!;const manifest = publicManifest(path);
const module = path.modules.find(one => one.id === 'fde-v1-ip04')!;
const reading = module.activities.find(one => one.kind === 'lesson')!;
const lesson = module.lessons.find(one => one.id === reading.lessonId)!;
const enrollment = { enrollmentId: 'LOCALINTERVIEW000000', pathId: 'fde', curriculumVersion: 1, status: 'active', baseTrackAtEnrollment: 'fullstack', startedAt: '2026-10-22T00:00:00Z', updatedAt: '2026-10-22T00:00:00Z' };
for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: optional shelf and original case-bank links remain usable`, async ({ page }) => {
    await storeFakeSession(page);await localAuth(page);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.addInitScript(mode => {localStorage.setItem('devquiz:color-mode',mode);localStorage.setItem('devshark:consent',JSON.stringify({version:1,analytics:false,marketing:false,decidedAt:Date.now()}));},theme);
    const writes: string[]=[];const errors: string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/**',route=>{
      const request=route.request();const url=new URL(request.url());const op=url.searchParams.get('op')??url.pathname.split('/').pop();const resource=url.searchParams.get('resource');
      if(request.method()!=='GET')writes.push(resource??op??'unknown');
      if(resource==='learning-path-catalog')return route.fulfill({json:{versions:{fde:1},paths:[{manifest,availability:'available',inventory:pathInventory(manifest)}]}});
      if(op==='entitlement')return route.fulfill({json:{tier:'premium',source:'manual',currentPeriodEnd:null,cancelAtPeriodEnd:false,inGrace:false,validUntil:null}});
      if(op==='learning-path-enrollment')return route.fulfill({json:{enrollments:[enrollment]}});
      if(op==='learning-path-progress')return route.fulfill({json:{enrollment,modules:[],competencies:[],recommendedBridges:[],nextActivityId:manifest.modules[0].activities[0].id,guidedComplete:false,artifacts:{submitted:0,total:pathInventory(manifest).artifacts},dueActivityIds:[]}});
      if(resource==='learning-path-start') {
        expect(request.postDataJSON().activityId).toBe(reading.id);
        return route.fulfill({json:{attemptId:'local-reading',session:'local-session',expiresAt:'2099-01-01T00:00:00Z',activity:activitySummary(reading),purpose:'exercise',lesson,draft:null,previous:null}});
      }
      return route.fulfill({status:503,json:{error:{code:'fixture',message:'Local test fixture'}}});
    });
    await page.goto('/learn/forward-deployed-engineer/path');
    const shelf=page.locator('[aria-labelledby="path-shelf-interview-prep"]');await expect(shelf).toBeVisible();
    for(const id of ['ip01','ip02','ip03','ip04'])await expect(shelf.locator(`a[href="/learn/forward-deployed-engineer/path/fde-v1-${id}"]`)).toHaveCount(1);
    for(const width of [360,390,430,768,1024,1280,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
    await page.goto(`/learn/forward-deployed-engineer/path/${module.id}?activity=${reading.id}`);
    const bank=page.getByRole('table').first();await expect(bank).toBeVisible();
    const links=bank.locator('a');await expect(links).toHaveCount(12);
    for(const link of await links.all())expect(await link.getAttribute('href')).toMatch(/^\/learn\/forward-deployed-engineer\/path\/fde-v1-m02\?activity=fde-v1-m02-cases-/);
    await expect(page.locator('#main-content')).toBeFocused();await links.first().focus();await expect(links.first()).toBeFocused();
    for(const width of [360,390,430,768,1024,1280,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
    expect((await new AxeBuilder({page}).include('.lp-page').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
    expect(writes).toEqual(['learning-path-start']);expect(errors).toEqual([]);
  });
}
