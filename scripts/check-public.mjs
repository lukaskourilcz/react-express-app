import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
const dir = 'client/dist';
const sitemap = new JSDOM(readFileSync(`${dir}/sitemap.xml`, 'utf8'), { contentType: 'application/xml' });
const urls = [...sitemap.window.document.querySelectorAll('loc')].map(node => new URL(node.textContent));
assert.equal(urls.length, 11, 'Home plus five guides in two languages');
for (const url of urls) {
  const file = path.join(dir, url.pathname, 'index.html');
  const doc = new JSDOM(readFileSync(file, 'utf8')).window.document;
  assert.equal(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'), url.href);
  assert.equal(doc.querySelectorAll('h1').length, 1, `${url}: one static h1`);
  if (url.pathname !== '/') {
    const lang = url.pathname.startsWith('/cs/') ? 'cs' : 'en';
    assert.equal(doc.documentElement.lang, lang);
    assert.equal(doc.querySelectorAll('details').length, 3, 'Practice is present without JS');
    assert.equal(doc.querySelectorAll('link[hreflang]').length, 2);
    for (const alternate of doc.querySelectorAll('link[hreflang]')) assert(existsSync(path.join(dir, new URL(alternate.href).pathname, 'index.html')));
    const schema = JSON.parse(doc.querySelector('#public-schema').textContent);
    assert.equal(schema['@type'], 'LearningResource'); assert.equal(schema.url, url.href); assert.equal(schema.inLanguage, lang);
    assert.equal(schema.name, doc.title); assert.equal(schema.isAccessibleForFree, true);
    if (url.hostname === 'devshark.app') { assert(doc.querySelector('pre code')); assert(!url.pathname.includes('capitals')); }
    else assert(!url.pathname.includes('react-hooks'));
    assert.equal(doc.querySelector('.ss-topic-cta').getAttribute('href').startsWith('/quiz?category='), true);
  }
}
assert(readFileSync(`${dir}/robots.txt`, 'utf8').includes(`Sitemap: ${urls[0].origin}/sitemap.xml`));
assert(!existsSync(`${dir}/mockServiceWorker.js`), 'Mocks must never ship with the app');
assert(!readdirSync(`${dir}/assets`).some(file => /storybook|mocks|\.stories\./i.test(file)));
console.log(`Public HTML passed: ${urls.length} URLs, locale pairs, canonical, schema, teaching content and product isolation.`);
