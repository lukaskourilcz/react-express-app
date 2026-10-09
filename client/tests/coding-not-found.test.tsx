// A Coding address with nothing behind it gets a page that says so (C3-17):
// a heading, a line about why, a way back, and no entry in search results.
// A bad track used to show Play's "Check the code and try again" with no
// heading; an unknown task, "Could not load this task" with a Try again that
// could only fail the same way. The task API answers in its real shapes.
import { beforeAll, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { CodingTaskScreen, CodingTrackScreen } from '../src/components/coding/CodingSection';
import { preloadPath } from '../src/lib/routePreload';
import { queryClient } from '../src/lib/queryClient';
import { server } from './mocks/server';

vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));
vi.mock('../src/coding/CodingWorkbench', () => ({ CodingWorkbench: () => <p>the workbench</p> }));

beforeAll(() => preloadPath('/coding/javascript/js-digit-sum'));

/** The task API answering every id with `status` and `code`; counts the asks. */
function taskAnswers(status: number, code: string, message: string) {
  const asked: string[] = [];
  server.use(http.get('*/api/quiz/roadmap', ({ request }) => {
    asked.push(new URL(request.url).searchParams.get('id') ?? '');
    return HttpResponse.json({ error: { code, message } }, { status });
  }));
  return asked;
}

async function mount(path: string) {
  // The app's own client, so the task query's retry rule is the real one.
  queryClient.clear();
  await act(async () => render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>
          <Routes>
            <Route path="/coding/:track" element={<CodingTrackScreen />} />
            <Route path="/coding/:track/:taskId" element={<CodingTaskScreen />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  ));
}

const noindex = () => document.head.querySelector('meta[name="robots"][content="noindex"]');

it('names a track that does not exist and leads back to Coding', async () => {
  await mount('/coding/nope');
  expect(screen.getByRole('heading', { level: 1, name: 'That track does not exist.' })).toBeInTheDocument();
  expect(screen.getByText(/The address may be old or incomplete/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Coding' })).toHaveAttribute('href', '/coding');
  expect(screen.queryByText(/Check the code and try again/)).toBeNull();
  expect(noindex()).not.toBeNull();
});

it('names a challenge that does not exist, asks once, and leads back to its track', async () => {
  const asked = taskAnswers(404, 'not_found', 'Unknown task');
  await mount('/coding/javascript/no-such-task');
  expect(await screen.findByRole('heading', { level: 1, name: 'That challenge does not exist.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to the list' })).toHaveAttribute('href', '/coding/javascript');
  expect(screen.getByRole('link', { name: 'Back to Coding' })).toHaveAttribute('href', '/coding');
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  expect(screen.queryByText('Could not load this task.')).toBeNull();
  expect(noindex()).not.toBeNull();
  expect(asked).toEqual(['no-such-task']);
});

it('says a retired challenge was retired', async () => {
  const asked = taskAnswers(410, 'task_retired', 'This challenge was retired from the active catalogue');
  await mount('/coding/javascript/js-old-task');
  expect(await screen.findByRole('heading', { level: 1, name: 'That challenge was retired.' })).toBeInTheDocument();
  expect(asked).toEqual(['js-old-task']);
});

it('names an unknown track in a task address too', async () => {
  taskAnswers(404, 'not_found', 'Unknown task');
  await mount('/coding/nope/js-digit-sum');
  expect(screen.getByRole('heading', { level: 1, name: 'That track does not exist.' })).toBeInTheDocument();
});

it('still offers Try again when the task could not load for another reason', async () => {
  taskAnswers(500, 'db_error', 'Could not load coding progress');
  await mount('/coding/javascript/js-digit-sum');
  expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent('Could not load this task.');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(noindex()).toBeNull();
});
