// The document head per route (lib/routeHead.ts, applied by App.tsx on every
// navigation): the tab title, the prerendered head of a share page, and the
// not-found page's noindex line.
import { beforeEach, describe, expect, it } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../src/i18n/LanguageContext';
import { applyRouteHead, readShareHead, type ShareHead } from '../src/lib/routeHead';
import { NotFoundPage } from '../src/components/PublicInfoPages';

const { result: language } = renderHook(() => useLanguage(), { wrapper: LanguageProvider });
const visit = (pathname: string, shareHead: ShareHead | null = null) => {
  const { t, lang } = language.current;
  applyRouteHead(pathname, t, lang, shareHead);
};
const meta = (selector: string) => document.querySelector(selector)?.getAttribute('content');
const canonical = () => document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
const robots = () => [...document.querySelectorAll('meta[name="robots"]')].map((node) => node.getAttribute('content'));

// The app shell's head (client/index.html), with no page of its own.
const SHELL_HEAD = `
  <title>devShark</title>
  <meta name="description" content="shell description" />
  <meta property="og:title" content="devShark" />
  <meta property="og:description" content="shell description" />
  <meta name="twitter:title" content="devShark" />
  <meta name="twitter:description" content="shell description" />`;

beforeEach(() => {
  document.head.innerHTML = SHELL_HEAD;
  window.history.replaceState(null, '', '/');
});

describe('the tab title', () => {
  it.each([
    ['/quiz', 'Quiz · devShark'],
    ['/learn', 'Learn · devShark'],
    ['/curation', 'How we curate · devShark'],
    ['/roadmap/specializations/fde', 'Forward Deployed Engineer · devShark'],
    ['/roadmap/specializations/fde/m03', 'Forward Deployed Engineer · devShark'],
    ['/roadmap/paths/dsa-foundations', 'DSA Foundations · devShark'],
    ['/roadmap/paths/dsa-foundations/d04', 'DSA Foundations · devShark'],
    ['/play/ABCD', 'Live match · devShark'],
    ['/coding/javascript', 'Coding · devShark'],
    ['/daily', 'Question of the day · devShark'],
    ['/no-such-page', 'Page not found · devShark'],
    ['/roadmap/paths/not-a-path', 'Page not found · devShark'],
  ])('%s reads "%s"', (pathname, title) => {
    visit(pathname);
    expect(document.title).toBe(title);
    expect(meta('meta[property="og:title"]')).toBe(title);
  });
});

describe('a share page opened directly', () => {
  const TASK = '/coding/javascript/js-double-numbers';
  const TASK_URL = `https://devshark.app${TASK}`;
  const TASK_TITLE = 'Double the numbers · JavaScript coding challenge · devShark';
  const TASK_TEXT = 'An easy JavaScript coding challenge on devShark, graded on the server.';
  // What vite.config.ts writes into that page's index.html.
  const prerendered = (path: string, title: string, description: string) => {
    document.head.innerHTML = SHELL_HEAD
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace(/content="shell description"/g, `content="${description}"`)
      .replace(/content="devShark"/g, `content="${title}"`)
      + `<link rel="canonical" href="https://devshark.app${path}" /><meta property="og:url" content="https://devshark.app${path}" />`;
    window.history.replaceState(null, '', path);
    return readShareHead();
  };

  it('keeps the head the build wrote for a coding task', () => {
    const head = prerendered(TASK, TASK_TITLE, TASK_TEXT);
    expect(head).not.toBeNull();
    visit(TASK, head);
    expect(document.title).toBe(TASK_TITLE);
    expect(meta('meta[name="description"]')).toBe(TASK_TEXT);
    expect(meta('meta[property="og:title"]')).toBe(TASK_TITLE);
    expect(meta('meta[name="twitter:description"]')).toBe(TASK_TEXT);
    expect(canonical()).toBe(TASK_URL);
    expect(meta('meta[property="og:url"]')).toBe(TASK_URL);
  });

  it('keeps the head of a dated question of the day', () => {
    const head = prerendered('/daily/2026-09-29', 'JavaScript question of the day, 29 September 2026 · devShark', 'One question a day.');
    visit('/daily/2026-09-29', head);
    expect(document.title).toBe('JavaScript question of the day, 29 September 2026 · devShark');
    expect(canonical()).toBe('https://devshark.app/daily/2026-09-29');
  });

  it('writes other routes as before, and puts the page’s head back on the way back', () => {
    const head = prerendered(TASK, TASK_TITLE, TASK_TEXT);
    visit(TASK, head);
    visit('/quiz', head);
    expect(document.title).toBe('Quiz · devShark');
    expect(canonical()).toBeNull();
    expect(meta('meta[name="description"]')).not.toBe(TASK_TEXT);
    // Another task reached inside the app has no head of its own here.
    visit('/coding/javascript/js-other-task', head);
    expect(document.title).toBe('Coding · devShark');
    visit(TASK, head);
    expect(document.title).toBe(TASK_TITLE);
    expect(canonical()).toBe(TASK_URL);
  });

  it('is not read from the plain shell', () => {
    window.history.replaceState(null, '', TASK);
    expect(readShareHead()).toBeNull();
    // A canonical for another address is not this page's head either.
    document.head.insertAdjacentHTML('beforeend', '<link rel="canonical" href="https://devshark.app/" />');
    expect(readShareHead()).toBeNull();
  });
});

describe('the not-found page', () => {
  it('asks search engines not to index it while it shows, and only then', () => {
    visit('/no-such-page');
    expect(robots()).toEqual([]);
    const page = render(<MemoryRouter><LanguageProvider><NotFoundPage /></LanguageProvider></MemoryRouter>);
    expect(robots()).toEqual(['noindex']);
    // The shell rewrites the head after the page has drawn; the line stays.
    visit('/no-such-page');
    expect(robots()).toEqual(['noindex']);
    page.unmount();
    expect(robots()).toEqual([]);
    visit('/quiz');
    expect(robots()).toEqual([]);
  });
});
