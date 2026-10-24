// A Learn level's coding step opens at once (#587 paths walk). Its workbench
// and editor were asked for only when the step began, and the step then went
// through Suspense, whose reveal React held back for up to 300 ms more: about
// 360 ms (guest) and 500 ms (signed in) from Finish to the editor with local
// assets. The code now starts loading on the level's last question, and the
// step draws the workbench as soon as it is in.
import { beforeAll, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { LessonRunner } from '../src/components/learn/LessonRunner';
import type { RoadmapPlayable } from '../src/types/quiz';
import { server } from './mocks/server';

const loads = vi.hoisted(() => ({ workbench: 0 }));
vi.mock('../src/coding/loadWorkbench', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/coding/loadWorkbench')>();
  return { ...actual, preloadTaskWorkbench: () => { loads.workbench += 1; return actual.preloadTaskWorkbench(); } };
});
vi.mock('../src/coding/Editor', () => ({
  Editor: ({ ariaLabel, value }: { ariaLabel: string; value?: string }) => <textarea aria-label={ariaLabel} value={value ?? ''} readOnly />,
}));
vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const question = (id: string) => ({ id, tags: [], introduction: '', question: `Question ${id}?`, options: ['Option A', 'Option B'], category: 'javascript', difficulty: 1 });
const TASK = {
  id: 'js-digit-sum', track: 'javascript', level: 1, tier: 'foundations', difficulty: 1, focus: 'loops', title: 'Digit sum', verify: 'tests',
  estimatedMinutes: 5, free: true, prompt: 'Sum the digits.', starter: 'const digitSum = (n) => 0;', hints: ['Use % 10.'], approach: [],
  tests: [{ call: 'digitSum(12)', label: 'two digits' }],
};
const PLAYABLE = {
  kind: 'level', topic: 'javascript', ref: 1, title: 'Level 1 title', passPct: 50, sessionId: 'session-1',
  questions: [question('q-1'), question('q-2')], coding: [{ task: TASK, session: 'code-session-1' }],
} as unknown as RoadmapPlayable;

it('loads the workbench on the last question and draws the coding step with it', async () => {
  server.use(
    http.post('*/api/quiz/roadmap', ({ request }) => (new URL(request.url).searchParams.get('resource') === 'answer'
      ? HttpResponse.json({ selectedIndex: 0, correctAnswer: 0, isCorrect: true, explanation: 'Because.' })
      : HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 }))),
  );
  const t = ((key: string) => key) as never;
  await act(async () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <MemoryRouter>
        <LanguageProvider>
          <LessonRunner playable={PLAYABLE} skipIntro topicColor="#0a7" hasNext={false} nextLabel="Next"
            onExit={() => {}} onFinished={() => {}} onNext={() => {}} onReplay={() => {}} t={t} />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
  // The first of two questions: nothing of the workbench yet.
  fireEvent.click(await screen.findByRole('radio', { name: /Option A/ }));
  expect(loads.workbench).toBe(0);
  fireEvent.click(await screen.findByRole('button', { name: 'roadmap.continue' }));
  // The last question: the workbench starts loading.
  fireEvent.click(await screen.findByRole('radio', { name: /Option A/ }));
  expect(loads.workbench).toBeGreaterThan(0);
  const { preloadTaskWorkbench } = await import('../src/coding/loadWorkbench');
  await act(async () => { await preloadTaskWorkbench(); });
  // Finish turns to the step, and the workbench is there in that commit.
  await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'roadmap.finish' })); });
  expect(screen.getByRole('textbox', { name: 'Your code' })).toBeInTheDocument();
});
