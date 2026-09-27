import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { ChallengeRunPlanner } from '../src/components/coding/ChallengeRunPlanner';

// Design audit P1.6: on the Coding home the planner is one row until opened,
// and opening it shows the same form as before.
vi.mock('../src/coding/practice', () => ({
  usePracticeSession: () => ({ data: { session: null }, isError: false, refetch: () => {} }),
  useStartSession: () => ({ mutate: vi.fn(), isPending: false }),
  useAdvanceSession: () => ({ mutate: vi.fn(), isPending: false }),
}));

const mount = () => render(
  <MemoryRouter><LanguageProvider><ChallengeRunPlanner signedIn collapsible /></LanguageProvider></MemoryRouter>,
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
