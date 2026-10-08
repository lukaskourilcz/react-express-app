import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { ChallengeRunPlanner } from '../src/components/coding/ChallengeRunPlanner';

// Design audit P1.6: on the Coding home the planner is one row until opened,
// and opening it shows the same form as before.
const practice = vi.hoisted(() => ({ start: null as null | ((input: unknown, callbacks: { onSuccess: (data: unknown) => void }) => void) }));
const mutate = vi.fn((input: unknown, callbacks: { onSuccess: (data: unknown) => void }) => practice.start?.(input, callbacks));
vi.mock('../src/coding/practice', () => ({
  usePracticeSession: () => ({ data: { session: null }, isError: false, refetch: () => {} }),
  useStartSession: () => ({ mutate, isPending: false }),
  useAdvanceSession: () => ({ mutate: vi.fn(), isPending: false }),
}));

beforeEach(() => { mutate.mockClear(); practice.start = null; });

const mount = (collapsible = true) => render(
  <MemoryRouter initialEntries={['/coding']}>
    <LanguageProvider>
      <Routes>
        <Route path="/coding" element={<ChallengeRunPlanner signedIn collapsible={collapsible} />} />
        <Route path="/coding/:track/:taskId" element={<h1>Task page</h1>} />
      </Routes>
    </LanguageProvider>
  </MemoryRouter>,
);

it('starts collapsed to one row and opens the form on click', () => {
  mount();
  const toggle = screen.getByRole('button', { name: /Challenge run/ });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('group', { name: 'Track' })).toBeNull();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('heading', { level: 2, name: /Challenge run/ })).toBeInTheDocument();
  expect(document.getElementById(toggle.getAttribute('aria-controls') ?? '')?.querySelector('form')).not.toBeNull();
});

// Audit C3-1: the button was a type="button" with an empty onClick, so a
// press sent nothing and the run never started.
it('Start the run sends the chosen options and opens the first task', async () => {
  practice.start = (_input, { onSuccess }) => onSuccess({
    session: { sessionId: 's1', minutes: 10, topic: 'javascript', queue: ['js-sum-array'], position: 0, order: 'random', status: 'active', scheduledFor: null, estimatedMinutes: 5 },
  });
  mount(false);
  fireEvent.click(screen.getByRole('button', { name: 'JavaScript', pressed: false }));
  fireEvent.click(screen.getByRole('button', { name: '5 challenges' }));
  fireEvent.click(screen.getByRole('radio', { name: /Shuffled/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Start the run' }));
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(mutate.mock.calls[0][0]).toEqual({ count: 5, order: 'random', topic: 'javascript' });
  expect(await screen.findByRole('heading', { level: 1, name: 'Task page' })).toBeInTheDocument();
});
