// The Challenge's "Relaxed pace" switch looked the same on and off: only a
// pressed track card had a selected style, and this one is a checkbox. On, it
// now takes the selected card's accent and shows a check, so the state is
// never colour alone.
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Challenge from '../src/components/Challenge';
import { server } from './mocks/server';
import { addSheet } from './css';

vi.mock('../src/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/auth')>()),
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

const BOARD = {
  top: [{ id: 'run-1', name: 'Harbour reader', score: 42, createdAt: '2026-09-25T10:00:00Z' }],
  champion: { id: 'run-1', name: 'Harbour reader', score: 42, createdAt: '2026-09-25T10:00:00Z' },
};

describe('Challenge topics and the single clock', () => {
  it('defaults to every topic, allows a smaller mix, and refuses an empty selection', async () => {
    server.use(http.get('*/api/quiz/challenge', () => HttpResponse.json(BOARD)));
    addSheet('deepEnd');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    await act(async () => render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[{ pathname: '/challenge', key: 'relaxed' }]}>
          <LanguageProvider><Challenge /></LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ));
    expect(screen.queryByRole('checkbox', { name: /Relaxed pace/ })).toBeNull();
    // The lead says the clock once; no stat row repeats it (questions-10).
    expect(screen.getByText(/each question has 90 seconds/)).toBeInTheDocument();
    expect(screen.queryByText('90 s')).toBeNull();
    const topics = screen.getAllByRole('button', { pressed: true });
    expect(topics.length).toBeGreaterThan(10);
    topics.forEach(topic => fireEvent.click(topic));
    // Start stays in the Tab order and says why it cannot start.
    const start = screen.getByRole('button', { name: 'Start' });
    expect(start).toHaveAttribute('aria-disabled', 'true');
    expect(start).toHaveAccessibleDescription('Choose at least one topic to start.');
    fireEvent.click(topics[0]);
    expect(topics[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Start' })).not.toHaveAttribute('aria-disabled');
  });

  // UX audit U2, questions-10: the Quiz setup's layout, with a Select all /
  // Deselect all link on the label row and the top scores under the panel.
  it('selects or clears every topic from one link, and lists the top scores under the panel', async () => {
    server.use(http.get('*/api/quiz/challenge', () => HttpResponse.json(BOARD)));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    await act(async () => render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[{ pathname: '/challenge', key: 'setup' }]}>
          <LanguageProvider><Challenge /></LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ));
    expect(screen.getByRole('heading', { level: 1, name: 'Biggest Shark Challenge' })).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Choose your topics' });
    const pressed = () => group.querySelectorAll('[aria-pressed="true"]').length;
    const all = group.querySelectorAll('button').length;
    expect(pressed()).toBe(all);
    fireEvent.click(screen.getByRole('button', { name: 'Deselect all' }));
    expect(pressed()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(pressed()).toBe(all);

    const board = await screen.findByRole('region', { name: 'Top scores' });
    expect(document.querySelector('.challenge-setup__panel')!.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(board).toHaveTextContent('Harbour reader');
    expect(board).toHaveTextContent('42');
  });
});
