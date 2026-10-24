// The lesson reader (LearnLesson with LessonBody, its code runner, the terms
// bar and LearningPaths.css) is not part of the Learn map's chunk: only DSA
// levels open with a reading, and the reader loads when one is about to open
// (perf baseline #587 C19).
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Roadmap from '../src/components/Roadmap';
import { server } from './mocks/server';

const loads = vi.hoisted(() => ({ reader: 0 }));
vi.mock('../src/components/learn/LearnLesson', async (importOriginal) => {
  loads.reader += 1;
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

const LESSON = { id: 'dsa-v1-d01-l1', title: 'Complexity Basics', sources: [], sections: [{ kind: 'prose', body: 'Count the operations as the input grows.' }] };
const level = (n: number, lessonId?: string) => ({ level: n, title: `Level ${n} title`, difficulty: 1 as const, questionCount: 8, ...(lessonId ? { lessonId } : {}) });

async function renderMap(withReading: boolean) {
  server.use(http.get('*/api/quiz/roadmap', ({ request }) => {
    const resource = new URL(request.url).searchParams.get('resource');
    if (resource === 'learning-path-catalog') return HttpResponse.json({ versions: {}, paths: [] });
    if (resource === 'lesson') return HttpResponse.json({ lesson: LESSON, hash: 'fixture-hash' });
    const levels = Array.from({ length: 6 }, (_, i) => level(i + 1, withReading && i === 0 ? LESSON.id : undefined));
    return HttpResponse.json({ topics: ['javascript'], structure: { javascript: { levels, checkpoints: [] } } } as never);
  }));
  await act(async () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <MemoryRouter initialEntries={['/learn']}>
        <LanguageProvider><Roadmap /></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  return screen.findByRole('button', { name: /^Level 1: Level 1 title/ });
}

// One module graph for the file: the reader's first load is the one counted.
describe('the lesson reader’s code', () => {
  it('is not loaded with the map, nor for a level without a reading', async () => {
    const node = await renderMap(false);
    fireEvent.focusIn(node);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
    expect(loads.reader).toBe(0);
  });

  it('starts loading when a level with a reading takes focus, and the reading opens', async () => {
    const node = await renderMap(true);
    expect(loads.reader).toBe(0);
    fireEvent.focusIn(node);
    await waitFor(() => expect(loads.reader).toBe(1));
    fireEvent.click(node);
    expect(await screen.findByRole('heading', { name: 'Complexity Basics', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start the questions' })).toBeInTheDocument();
  });
});
