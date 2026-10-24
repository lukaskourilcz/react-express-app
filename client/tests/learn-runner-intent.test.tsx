// The level runner's chunk loads when the learner is about to open a step,
// not with the map and not only on the click (perf baseline #587 C28).
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import type { RoadmapStructure } from '../src/types/quiz';
import { server } from './mocks/server';

const loads = vi.hoisted(() => ({ runner: 0 }));
vi.mock('../src/components/learn/LessonRunner', async (importOriginal) => {
  loads.runner += 1;
  return importOriginal();
});
vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 720, bottom: 600, width: 720, height: 600, toJSON: () => ({}) } as DOMRect);
});
afterEach(() => {
  Reflect.deleteProperty(navigator, 'connection');
});

const level = (n: number) => ({ level: n, title: `Level ${n} title`, difficulty: 1 as const, questionCount: 8 });
const STRUCTURE = {
  topics: ['javascript'],
  structure: { javascript: { levels: Array.from({ length: 6 }, (_, i) => level(i + 1)), checkpoints: [] } },
} as unknown as RoadmapStructure;

async function renderMap() {
  server.use(http.get('*/api/quiz/roadmap', ({ request }) => (new URL(request.url).searchParams.get('resource') === 'learning-path-catalog'
    ? HttpResponse.json({ versions: {}, paths: [] })
    : HttpResponse.json(STRUCTURE as never))));
  const { default: Roadmap } = await import('../src/components/Roadmap');
  await act(async () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <MemoryRouter initialEntries={['/learn']}>
        <LanguageProvider><Roadmap /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  return screen.findByRole('button', { name: /^Level 1: Level 1 title/ });
}

describe('the level runner’s code', () => {
  // One module graph for the file: the first load is the one counted.
  it('is not loaded with the map, and a visitor saving data does not get it for focusing a step', async () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    const node = await renderMap();
    expect(loads.runner).toBe(0);
    fireEvent.focusIn(node);
    // A locked level is no intent to open anything.
    fireEvent.pointerDown(screen.getByRole('button', { name: /^Level 2: Level 2 title, Locked/ }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
    expect(loads.runner).toBe(0);
  });

  it('starts loading when a level takes focus, before any click', async () => {
    const node = await renderMap();
    expect(loads.runner).toBe(0);
    fireEvent.focusIn(node);
    await waitFor(() => expect(loads.runner).toBe(1));
  });
});
