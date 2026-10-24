// A Learn map level that opens with a reading asks for the lesson with the
// press, while the reader's code is still loading, and the reader then takes
// that answer instead of asking again (perf baseline #587 C19 follow-up).
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Roadmap from '../src/components/Roadmap';
import { server } from './mocks/server';

const gate = vi.hoisted(() => {
  let open = () => {};
  const arrived = new Promise<void>((resolve) => { open = resolve; });
  return { arrived, open: () => open() };
});
vi.mock('../src/components/learn/LearnLesson', async (importOriginal) => {
  await gate.arrived;
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

const PROSE = 'Count the operations as the input grows.';
const LESSON = { id: 'dsa-v1-d01-l1', title: 'Complexity Basics', sources: [], sections: [{ kind: 'prose', body: PROSE }] };
const level = (n: number, lessonId?: string) => ({ level: n, title: `Level ${n} title`, difficulty: 1 as const, questionCount: 8, ...(lessonId ? { lessonId } : {}) });

describe('opening a map level with a reading', () => {
  it('asks for the lesson before the reader’s code is in, and only once', async () => {
    const lessonReads: string[] = [];
    server.use(http.get('*/api/quiz/roadmap', ({ request }) => {
      const params = new URL(request.url).searchParams;
      const resource = params.get('resource');
      if (resource === 'learning-path-catalog') return HttpResponse.json({ versions: {}, paths: [] });
      if (resource === 'lesson') {
        lessonReads.push(params.get('id') ?? '');
        return HttpResponse.json({ lesson: LESSON, hash: 'fixture-hash' });
      }
      const levels = Array.from({ length: 6 }, (_, i) => level(i + 1, i === 0 ? LESSON.id : undefined));
      return HttpResponse.json({ topics: ['javascript'], structure: { javascript: { levels, checkpoints: [] } } } as never);
    }));
    await act(async () => render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/learn']}>
          <LanguageProvider><Roadmap /></LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ));
    const node = await screen.findByRole('button', { name: /^Level 1: Level 1 title/ });
    fireEvent.click(node);
    await waitFor(() => expect(lessonReads).toEqual([LESSON.id]));
    expect(screen.queryByText(PROSE)).not.toBeInTheDocument();

    gate.open();
    expect(await screen.findByText(PROSE, undefined, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start the questions' })).toBeInTheDocument();
    expect(lessonReads).toEqual([LESSON.id]);
  });
});
