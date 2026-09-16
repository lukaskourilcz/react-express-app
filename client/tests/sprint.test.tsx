import { expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Sprint from '../src/components/Sprint';
import { server } from './mocks/server';
import { sprintHandlers } from './mocks/handlers';

// The sprint screen's real states, driven through its real API contract: the
// board before a run, a run being played one answer at a time, and the finished
// run. Every score here comes back from the (mocked) server; the screen never
// computes one, which is the rule the test is protecting.

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LanguageProvider>
          <Sprint />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it('shows the sprint board before a run', async () => {
  server.use(sprintHandlers.board);
  mount();
  expect(await screen.findByText('Workshop sprinter')).toBeVisible();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('says the board is not switched on yet rather than failing', async () => {
  server.use(sprintHandlers.boardMigrationRequired);
  mount();
  expect(await screen.findByText(/not switched on yet/i)).toBeVisible();
  // A missing board is not an error state: the run is still offered.
  expect(screen.getByRole('button', { name: /start the sprint/i })).toBeVisible();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('recovers the board from a server failure through Retry', async () => {
  server.use(sprintHandlers.boardError);
  mount();
  expect(await screen.findByRole('alert')).toBeVisible();
  server.use(sprintHandlers.board);
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));
  expect(await screen.findByText('Workshop sprinter')).toBeVisible();
});

it('scores a run from the server, pays the combo step, and ends with the missed question', async () => {
  server.use(sprintHandlers.board, sprintHandlers.batch, sprintHandlers.grade, sprintHandlers.complete);
  mount();

  fireEvent.click(await screen.findByRole('button', { name: /start the sprint/i }));

  // First question. The clock is a timer with an accessible reading in seconds,
  // so it is not a colour-only cue.
  expect(await screen.findByText('Sprint question 1', undefined, { timeout: 4000 })).toBeVisible();
  expect(screen.getByRole('timer')).toHaveAccessibleName(/seconds left in the sprint/i);
  expect(screen.getByText('Combo')).toBeVisible();

  // Four correct answers, each read from the server's verdict.
  for (let n = 1; n <= 4; n++) {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`right ${n}$`) }));
    expect(await screen.findByText(`Sprint question ${n + 1}`)).toBeVisible();
  }
  expect(screen.getByText('4', { selector: '.de-combo__count' })).toBeVisible();

  // The fifth in a row reaches the first combo step and buys three seconds.
  fireEvent.click(screen.getByRole('button', { name: /right 5$/ }));
  expect(await screen.findByText('+3 s')).toBeVisible();

  // A wrong answer costs ten seconds, in words as well as in colour, and
  // empties the combo.
  fireEvent.click(screen.getByRole('button', { name: /wrong 6$/ }));
  expect(await screen.findByText('−10 s')).toBeVisible();
  expect(screen.getByText('0', { selector: '.de-combo__count' })).toBeVisible();

  // The last question drains the buffer, which cannot be refilled, so the run
  // ends with what it has — and the score shown is the server's, not the
  // screen's running count.
  fireEvent.click(screen.getByRole('button', { name: /right 7$/ }));
  expect(await screen.findByRole('heading', { name: /time's up/i })).toBeVisible();
  await waitFor(() => expect(screen.getByText(/6 correct · 1 wrong/)).toBeVisible());
  expect(screen.getByText(/what you missed/i)).toBeVisible();
  expect(screen.getByText(/correct answer: right 6/i)).toBeVisible();
});
