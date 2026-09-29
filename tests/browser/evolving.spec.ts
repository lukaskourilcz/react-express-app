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
    // App.tsx moves the focus to <main> 230 ms after every change of path.
    // Wait for that move, or it can take the focus from the editor or the
    // preview in the middle of a fill.
    const main=page.locator('#main-content');
    await expect(main).toBeFocused();
    await expect(page.locator('.cd-editor')).toBeHidden();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath('mobile-pending.png')});
    // Waiting is the default, never a dead end: the editor, Run and Submit
    // work at phone width without the page scrolling sideways.
    await page.getByRole('button',{name:'Use the editor on this screen'}).click();
    await expect(page.locator('.cd-editor')).toBeVisible();
    await expect(page.getByRole('button',{name:'Run',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath('mobile-editor.png')});
    await page.setViewportSize({width:1440,height:900});
    const source=solutionFor(first)!.solution;
    // Focus the editor and wait until CodeMirror has taken the focus (the
    // cm-focused class) before filling. CodeMirror handles a focus 10 ms
    // later and writes its own caret into the page; right after the resize
    // that write could land after fill's select-all, and the solution went in
    // at the caret, in front of the starter, which then shadowed it.
    // focus() does not wait for the resize to unhide the editor; the
    // visibility check does.
    const editor=page.locator('.cm-content');
    await expect(editor).toBeVisible();
    await editor.focus();
    await expect(page.locator('.cm-editor')).toHaveClass(/\bcm-focused\b/);
    await editor.fill(source);
    await expect(editor).not.toContainText('return <main />');
    const run=page.getByRole('button',{name:lang==='en'?'Run':'Spustit',exact:true});
    await run.click();
    await expect(page.getByRole('tab',{name:/1\/1/})).toBeVisible({timeout:25_000});
    await page.getByRole('button',{name:lang==='en'?'Submit':'Odevzdat',exact:true}).click();
    const next=page.locator('a[href="/coding/react/react-evolving-form-1"]').last();
    await expect(next).toBeVisible();
    await next.click();
    await expect(page).toHaveURL(/\/react-evolving-form-1$/);
    await expect(main).toBeFocused();
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
