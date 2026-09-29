import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
const dir = 'client/dist';
const sitemap = new JSDOM(readFileSync(`${dir}/sitemap.xml`, 'utf8'), { contentType: 'application/xml' });
const urls = [...sitemap.window.document.querySelectorAll('loc')].map(node => new URL(node.textContent));
assert.equal(urls.length, 14, 'Home, five guides in two languages, /premium, /premium/cancel and /daily');
// The app pages with public HTML (#222, #239). /premium/success stays out: a
// Stripe return means nothing to anyone else, and the app marks it noindex.
const APP_PAGES = ['/premium', '/premium/cancel', '/daily'];
assert.deepEqual(urls.filter(url => APP_PAGES.includes(url.pathname)).map(url => url.pathname), APP_PAGES);
assert(!urls.some(url => url.pathname.startsWith('/premium/success')), 'the checkout return page is never listed');
const tiers = readFileSync('shared/tiers.ts', 'utf8');
const price = (plan) => tiers.match(new RegExp(`${plan}: '([0-9.]+)'`))?.[1];
for (const url of urls) {
  const file = path.join(dir, url.pathname, 'index.html');
  const doc = new JSDOM(readFileSync(file, 'utf8')).window.document;
  assert.equal(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'), url.href);
  assert.equal(doc.querySelector('meta[property="og:url"]')?.getAttribute('content'), url.href, `${url}: og:url matches the canonical`);
  // Link previews on LinkedIn, Slack and iMessage need an absolute image URL.
  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
    assert.match(doc.querySelector(selector)?.getAttribute('content') ?? '', /^https:\/\/devshark\.app\//, `${url}: ${selector} is absolute`);
  }
  assert.equal(url.hostname, 'devshark.app');
  if (url.pathname === '/') continue;
  assert.equal(doc.querySelectorAll('h1').length, 1, `${url}: one static h1`);
  if (APP_PAGES.includes(url.pathname)) {
    assert.equal(doc.documentElement.lang, 'en');
    assert.equal(doc.querySelectorAll('link[hreflang]').length, 0, `${url}: English only`);
    const text = doc.querySelector('#root').textContent;
    if (url.pathname === '/premium') {
      const schema = JSON.parse(doc.querySelector('#public-schema').textContent);
      assert.equal(schema['@type'], 'LearningResource'); assert.equal(schema.url, url.href); assert.equal(schema.name, doc.title);
      assert.equal(schema.isAccessibleForFree, false, 'Premium is the paid subscription');
      assert.deepEqual(schema.offers.map(offer => offer.price), [price('monthly'), price('annual')], 'the offers carry the prices from shared/tiers.ts');
      assert(schema.offers.every(offer => offer.priceSpecification.valueAddedTaxIncluded === true), 'every price includes VAT');
      assert.match(text, new RegExp(`${price('monthly').replace('.', '\\.')}`), `${url}: the monthly price is in the HTML`);
      assert.match(text, new RegExp(`${price('annual').replace('.', '\\.')}`), `${url}: the annual price is in the HTML`);
      assert.match(text, /VAT included/, `${url}: prices say VAT included`);
      assert.match(text, /renews automatically/i, `${url}: auto-renewal is stated before purchase`);
      assert.match(text, /lose my 14-day right of withdrawal/, `${url}: the waiver sentence is stated before purchase`);
      assert(doc.querySelector('a[href="/terms"]') && doc.querySelector('a[href="/premium/cancel"]'), `${url}: links to the Terms and the cancellation page`);
    } else if (url.pathname === '/premium/cancel') {
      assert(!doc.querySelector('#public-schema'), `${url}: no structured data`);
      assert.match(text, /Withdraw from the contract/, `${url}: both options are named without JavaScript`);
    } else if (url.pathname === '/daily') {
      assert.equal(doc.querySelector('meta[property="og:image"]').getAttribute('content'), 'https://devshark.app/og/daily.png');
      assert(existsSync(`${dir}/og/daily.png`), '/daily has its share image');
      assert(!doc.querySelector('[role="radio"], .ss-radio-card'), '/daily holds no question in its HTML');
    }
    continue;
  }
  const lang = url.pathname.startsWith('/cs/') ? 'cs' : 'en';
  assert.equal(doc.documentElement.lang, lang);
  assert.equal(doc.querySelectorAll('details').length, 3, 'Practice is present without JS');
  assert.equal(doc.querySelectorAll('link[hreflang]').length, 2);
  for (const alternate of doc.querySelectorAll('link[hreflang]')) assert(existsSync(path.join(dir, new URL(alternate.href).pathname, 'index.html')));
  const schema = JSON.parse(doc.querySelector('#public-schema').textContent);
  assert.equal(schema['@type'], 'LearningResource'); assert.equal(schema.url, url.href); assert.equal(schema.inLanguage, lang);
  // A guide is free to read without an account; Premium is not a guide.
  assert.equal(schema.name, doc.title); assert.equal(schema.isAccessibleForFree, true);
  assert(doc.querySelector('pre code'), `${url}: the guide carries its code example`);
  assert.equal(doc.querySelector('.ss-topic-cta').getAttribute('href').startsWith('/quiz?category='), true);
}
// #239: every coding task and every day in the window has its own head and
// share image, and none of those pages carries a question, an answer or a
// solution.
const index = readFileSync('shared/coding-index.ts', 'utf8');
const tasks = [...index.matchAll(/\{"id":"([^"]+)","track":"([^"]+)"/g)].map(([, id, track]) => ({ id, track }));
assert(tasks.length > 700, 'the coding index was read');
const free = tasks.filter(({ id }) => new RegExp(`"id":"${id}"[^\n]*"free":true`).test(index)).length;
for (const { id, track } of tasks) {
  const file = path.join(dir, 'coding', track, id, 'index.html');
  assert(existsSync(file), `${id} has its page head`);
  const html = readFileSync(file, 'utf8');
  assert(html.includes(`<meta property="og:image" content="https://devshark.app/og/coding/${id}.png" />`), `${id}: its own og:image`);
  assert(html.includes(`${free} of ${tasks.length} coding tasks are free`), `${id}: the free count comes from the catalogue`);
  assert(!/solution|expected|hiddenTests/i.test(html.slice(html.indexOf('<div id="root">'))), `${id}: no task body in the HTML`);
  assert(existsSync(path.join(dir, 'og', 'coding', `${id}.png`)), `${id}: its image exists`);
}
const days = readdirSync(`${dir}/daily`).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name));
assert(days.length >= 30, 'the question of the day has dated pages');
for (const day of days) {
  const html = readFileSync(`${dir}/daily/${day}/index.html`, 'utf8');
  assert(html.includes(`content="https://devshark.app/og/daily/${day}.png"`), `${day}: its own og:image`);
  assert(existsSync(`${dir}/og/daily/${day}.png`), `${day}: its image exists`);
  assert(!/ss-radio-card|correctAnswer|explanation/.test(html), `${day}: no question in the HTML`);
}
assert(readFileSync(`${dir}/robots.txt`, 'utf8').includes(`Sitemap: ${urls[0].origin}/sitemap.xml`));
assert(!existsSync(`${dir}/mockServiceWorker.js`), 'Mocks must never ship with the app');
assert(!readdirSync(`${dir}/assets`).some(file => /storybook|mocks|\.stories\./i.test(file)));
console.log(`Public HTML passed: ${urls.length} URLs, locale pairs, canonical, schema, teaching content, the Premium terms, ${tasks.length} coding share pages and ${days.length} question-of-the-day pages.`);
