// The code highlighter (prism-light) starts loading when the learner reaches
// for a step of a topic whose questions carry code, beside the level runner's
// chunk, and not only when the first code question draws (perf baseline #587
// C28). A topic whose questions carry no code, and a visitor saving data, do
// not get it for a focus. What the preloader itself loads is pinned in
// code-highlighter-preload.test.tsx.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { RoadmapStructure } from '../src/types/quiz';
import { server } from './mocks/server';

const loads = vi.hoisted(() => ({ prism: 0 }));
vi.mock('../src/components/CodeBlock', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/components/CodeBlock')>()),
  preloadCodeHighlighter: () => { loads.prism += 1; },
}));
vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
beforeEach(() => {
  loads.prism = 0;
  window.localStorage.clear();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 720, bottom: 600, width: 720, height: 600, toJSON: () => ({}) } as DOMRect);
});
afterEach(() => {
  Reflect.deleteProperty(navigator, 'connection');
  window.history.replaceState(null, '', '/');
});

const level = (n: number) => ({ level: n, title: `Level ${n} title`, difficulty: 1 as const, questionCount: 8 });
const structureOf = (topic: string) => ({
  topics: [topic],
  structure: { [topic]: { levels: Array.from({ length: 6 }, (_, i) => level(i + 1)), checkpoints: [] } },
} as unknown as RoadmapStructure);

async function renderMap(topic: string) {
  server.use(http.get('*/api/quiz/roadmap', ({ request }) => (new URL(request.url).searchParams.get('resource') === 'learning-path-catalog'
    ? HttpResponse.json({ versions: {}, paths: [] })
    : HttpResponse.json(structureOf(topic) as never))));
  // The map reads its topic from the address the browser shows.
  window.history.replaceState(null, '', `/learn?topic=${topic}`);
  const { default: Roadmap } = await import('../src/components/Roadmap');
  const { LanguageProvider } = await import('../src/i18n/LanguageContext');
  await act(async () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <MemoryRouter initialEntries={[`/learn?topic=${topic}`]}>
        <LanguageProvider><Roadmap /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  return screen.findByRole('button', { name: /^Level 1: Level 1 title/ });
}
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });

describe('the code highlighter on the Learn map', () => {
  it('starts loading when a level of a code topic takes focus, before any click', async () => {
    const node = await renderMap('javascript');
    await settle();
    expect(loads.prism).toBe(0);
    fireEvent.focusIn(node);
    await waitFor(() => expect(loads.prism).toBeGreaterThan(0));
  });

  it('starts loading when a mouse rests on a level of a code topic', async () => {
    const node = await renderMap('javascript');
    await settle();
    const over = new MouseEvent('pointerover', { bubbles: true });
    Object.defineProperty(over, 'pointerType', { value: 'mouse' });
    fireEvent(node, over);
    await waitFor(() => expect(loads.prism).toBeGreaterThan(0));
  });

  it('is not loaded for a topic whose questions carry no code', async () => {
    const node = await renderMap('css');
    fireEvent.focusIn(node);
    await settle();
    expect(loads.prism).toBe(0);
  });

  it('is not loaded for a focus when the visitor saves data', async () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    const node = await renderMap('javascript');
    fireEvent.focusIn(node);
    await settle();
    expect(loads.prism).toBe(0);
  });
});
