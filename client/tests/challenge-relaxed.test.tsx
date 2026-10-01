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

describe('the relaxed pace switch', () => {
  it('shows when it is on, with the selected accent and a check', async () => {
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
    const relaxed = await screen.findByRole('checkbox', { name: /Relaxed pace/ });
    const check = relaxed.querySelector('.de-track-card__check')!;
    expect(check).toHaveAttribute('aria-hidden', 'true');
    expect(check.querySelector('svg')).not.toBeNull();

    expect(relaxed).toHaveAttribute('aria-checked', 'false');
    expect(getComputedStyle(check).opacity).toBe('0');
    expect(getComputedStyle(relaxed).getPropertyValue('background')).toBe('var(--color-background-surface)');

    fireEvent.click(relaxed);
    expect(relaxed).toHaveAttribute('aria-checked', 'true');
    expect(getComputedStyle(check).opacity).toBe('1');
    expect(getComputedStyle(relaxed).getPropertyValue('background')).toBe('var(--brand-accent-soft)');
    expect(getComputedStyle(relaxed).getPropertyValue('box-shadow')).toBe('inset 0 0 0 1px var(--brand-accent)');
  });
});
