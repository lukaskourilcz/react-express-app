import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CODING_TASKS, playable } from '../../lib/coding/catalog';
import { solutionFor } from '../../lib/coding/solutions';

// Real built editor/iframe/navigation with deterministic API fixtures. Actual
// server grading is independently covered by test:coding and test:react-isolation.
// The languages loop over what the app ships (ENABLED_LANGS in the client's
// LanguageContext); a stored Czech preference renders English today.
for (const lang of ['en']) for (const theme of ['light', 'dark']) {
  test(`${lang} ${theme}: React stage handoff, rerun and accessible workbench`, async ({ page }, info) => {
    test.setTimeout(60_000);
    page.on('pageerror',error=>console.error(error.message));
    await page.setViewportSize({width:360,height:900});
    await page.emulateMedia({colorScheme:theme as 'light'|'dark',reducedMotion:'reduce'});
    await page.addInitScript(({lang,theme})=>{
      try {localStorage.setItem('devquiz.lang',lang);localStorage.setItem('devquiz:color-mode',theme);} catch {}
    },{lang,theme});
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url());
      if(url.searchParams.get('resource')==='coding-task') {
        const task=CODING_TASKS.find(task=>task.id===url.searchParams.get('id'))!;
        return route.fulfill({json:{task:playable(task),session:task.id,locked:null,progress:null,draft:null,signedIn:true}});
      }
      if(url.searchParams.get('resource')==='coding-submit') return route.fulfill({json:{verdict:'passed',results:[{pass:true,actual:null,error:null}],hidden:null,check:null,logs:[],codeError:null,design:null,designReference:null,failureHint:null,puzzle:null,progress:null,firstPass:false,xpAwarded:0,applied:false,github:null}});
      if(url.searchParams.get('resource')==='coding-approaches') return route.fulfill({json:{taskId:url.searchParams.get('id'),approaches:[]}});
      return route.continue();
    });
    const first='react-evolving-form-1-start';
    await page.goto(`/coding/react/${first}`);
    await expect(page.getByRole('heading',{level:1})).toBeVisible();
    await expect(page.locator('.cd-editor')).toBeHidden();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath('mobile-pending.png')});
    await page.setViewportSize({width:1440,height:900});
    const source=solutionFor(first)!.solution;
    await page.locator('.cm-content').fill(source);
    const run=page.getByRole('button',{name:lang==='en'?'Run':'Spustit',exact:true});
    await run.click();
    await expect(page.getByRole('tab',{name:/1\/1/})).toBeVisible({timeout:25_000});
    await page.getByRole('button',{name:lang==='en'?'Submit':'Odevzdat',exact:true}).click();
    const next=page.locator('a[href="/coding/react/react-evolving-form-1"]').last();
    await expect(next).toBeVisible();
    await next.click();
    await expect(page).toHaveURL(/\/react-evolving-form-1$/);
    await expect(page.locator('.cm-content')).toContainText('useState');
    await run.click();
    await expect(page.getByRole('tab',{name:/2\/2/})).toBeVisible({timeout:25_000});
    await page.getByRole('tab',{name:lang==='en'?'Preview':'Náhled',exact:true}).click();
    const preview=page.frameLocator('.cd-frame');
    await preview.getByLabel('Email',{exact:true}).fill('keyboard@example.com');
    await preview.getByLabel('Email',{exact:true}).press('Enter');
    await expect(preview.getByText('Email accepted',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const a11y=await new AxeBuilder({page}).include('.cd-workbench').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(a11y.violations).toEqual([]);
    await page.screenshot({path:info.outputPath('workbench.png')});
  });
}
