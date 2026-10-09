// A read that fails says the read failed. The Coding screens used to answer a
// failed load of the challenge run, the FullStack progress and the saved
// challenges with "Could not save the collection" (C3-12), and the track page
// answered a failed progress load with "0 passed" (C5-5). Each screen is drawn
// against the real hooks, with the API answered by MSW in the real shapes.
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { ChallengeRunPlanner } from '../src/components/coding/ChallengeRunPlanner';
import { CodingTaskScreen, CodingTrackScreen, FullStackScreen } from '../src/components/coding/CodingSection';
import Collection from '../src/components/Collection';
import { preloadPath } from '../src/lib/routePreload';
import { server } from './mocks/server';

vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }),
}));
vi.mock('../src/coding/CodingWorkbench', () => ({ CodingWorkbench: ({ saveAction }: { saveAction?: ReactNode }) => <div>the workbench{saveAction}</div> }));

const PREMIUM = { tier: 'premium', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const DOWN = () => HttpResponse.json({ error: { code: 'db_error', message: 'Could not load' } }, { status: 500 });
const TASK = {
  task: { id: 'js-digit-sum', track: 'javascript', starter: '// starter', title: { en: 'Digit sum', cs: '' } },
  session: 'session-1', locked: null, progress: null, draft: null, signedIn: true,
};

/** The account reads these screens make; `failing` ops answer 500. */
function answer(failing: string[]) {
  const seen: string[] = [];
  server.use(
    http.all('*/api/user/*', ({ request }) => {
      const op = new URL(request.url).searchParams.get('op') ?? '';
      seen.push(`${request.method} ${op}`);
      if (failing.includes(`${request.method} ${op}`)) return DOWN();
      if (op === 'entitlement') return HttpResponse.json(PREMIUM);
      if (op === 'coding-progress') return HttpResponse.json({ tasks: { 'js-digit-sum': { status: 'passed', passes: 1, reviewStage: 0, nextReviewAt: null, revealCount: 0, bestPassedAt: null } }, due: [], javascriptLevelsCleared: 0, passedByTrack: {} });
      if (op === 'practice-session') return HttpResponse.json({ session: null });
      if (op === 'coding-bookmarks') return HttpResponse.json({ saved: [], collections: [] });
      return HttpResponse.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 });
    }),
    http.get('*/api/quiz/roadmap', () => HttpResponse.json(TASK)),
  );
  return seen;
}

let visits = 0;
async function mountAt(path: string, route: string, page: ReactNode, search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await act(async () => render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: path, search, key: `load-failure-${++visits}` }]}>
        <LanguageProvider><Routes><Route path={route} element={page} /></Routes></LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
}

beforeAll(async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  await preloadPath('/coding/javascript/js-digit-sum');
});
afterEach(() => { visits += 1; });

it('says the challenge run could not load, and loads it again on Try again', async () => {
  const seen = answer(['GET practice-session']);
  await mountAt('/coding', '/coding', <ChallengeRunPlanner signedIn />);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Could not load your challenge run.');
  expect(alert).not.toHaveTextContent(/save/i);
  server.use(http.get('*/api/user/*', ({ request }) => new URL(request.url).searchParams.get('op') === 'practice-session'
    ? HttpResponse.json({ session: null })
    : DOWN()));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })));
  expect(await screen.findByRole('button', { name: 'Start the run' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(seen.filter((one) => one === 'GET practice-session')).toHaveLength(1);
});

it('says FullStack progress could not load, not that a collection did not save', async () => {
  answer(['GET coding-progress']);
  await mountAt('/coding/fullstack', '/coding/fullstack', <FullStackScreen />);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Could not load your progress.');
  expect(alert).not.toHaveTextContent(/save|collection/i);
});

it('says the saved challenges could not load on a task page, and offers to load them again', async () => {
  const seen = answer(['GET coding-bookmarks']);
  await mountAt('/coding/javascript/js-digit-sum', '/coding/:track/:taskId', <CodingTaskScreen />);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Could not load your saved challenges.');
  expect(alert).not.toHaveTextContent(/save the collection/);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })));
  expect(seen.filter((one) => one === 'GET coding-bookmarks').length).toBeGreaterThan(1);
});

it('still says a star that did not save did not save', async () => {
  answer(['PUT coding-bookmarks']);
  await mountAt('/coding/javascript/js-digit-sum', '/coding/:track/:taskId', <CodingTaskScreen />);
  await act(async () => fireEvent.click(await screen.findByRole('button', { name: /Save this challenge/ })));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the collection. Try again.');
});

it('says the saved challenges could not load in Collection, not that a task did not', async () => {
  answer(['GET coding-bookmarks']);
  await mountAt('/collection', '/collection', <Collection />, '?tab=challenges');
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Could not load your saved challenges.');
  expect(alert).not.toHaveTextContent('Could not load this task.');
});

it('says a track page’s progress could not load instead of showing nothing passed', async () => {
  answer(['GET coding-progress']);
  await mountAt('/coding/javascript', '/coding/:track', <CodingTrackScreen />);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Could not load your progress.');
  expect(screen.getByRole('heading', { level: 1, name: 'JavaScript' })).toBeInTheDocument();
  // No count, no rows: either would claim "0 passed" and "Open" for a passed task.
  expect(screen.queryByText(/\d+ of \d+ passed/)).toBeNull();
  expect(screen.queryByRole('link', { name: /Digit sum/ })).toBeNull();
  answer([]);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })));
  const row = await screen.findByRole('link', { name: /Digit sum/ });
  expect(row).toHaveTextContent('Passed');
  expect(screen.getAllByText(/^1 of \d+ passed$/).length).toBeGreaterThan(0);
  expect(screen.queryByRole('alert')).toBeNull();
});
