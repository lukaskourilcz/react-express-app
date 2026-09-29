import { expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Home from '../src/components/Home';
import { server } from './mocks/server';
import { settingsHandler } from './mocks/handlers';

// The press leaves for Google: the promise settles only when the page unloads.
const auth = vi.hoisted(() => ({
  value: { user: null, isAuthenticated: false, isLoading: false, signInWithGoogle: () => new Promise<void>(() => {}) },
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value }));
vi.mock('../src/lib/billing', () => ({ useBilling: () => ({ known: true, enabled: false, launchOffer: false }) }));

it('gives the sign-in link back when Back restores the home page from the browser cache', async () => {
  server.use(settingsHandler);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><MemoryRouter><LanguageProvider><Home /></LanguageProvider></MemoryRouter></QueryClientProvider>);
  const link = screen.getByRole('button', { name: 'Sign in with Google' });
  fireEvent.click(link);
  await waitFor(() => expect(link).toBeDisabled());
  expect(link).toHaveTextContent('Sign in to start');
  // An ordinary page show (a first load) changes nothing.
  act(() => { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false })); });
  expect(link).toBeDisabled();
  act(() => { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
  await waitFor(() => expect(link).toBeEnabled());
  expect(link).toHaveTextContent('Sign in with Google');
});

// The tile says "Daily challenge": one question set for everyone a day, which
// is the quiz's daily mode, not the survival Challenge it used to open.
it('opens the daily challenge from the Daily challenge tile', async () => {
  server.use(settingsHandler);
  function Where() {
    const location = useLocation();
    return <p data-testid="location">{location.pathname + location.search}</p>;
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <LanguageProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: /^Daily challenge/ }));
  expect(await screen.findByTestId('location')).toHaveTextContent('/quiz?mode=daily');
});
