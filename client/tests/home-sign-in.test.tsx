import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Home from '../src/components/Home';
import { server } from './mocks/server';
import { settingsHandler } from './mocks/handlers';

const auth = vi.hoisted(() => ({
  value: { user: null, isAuthenticated: false, isLoading: false },
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value }));
const openSignIn = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/signInDialog', async (importOriginal) => ({ ...(await importOriginal<object>()), openSignIn }));
vi.mock('../src/lib/billing', () => ({ useBilling: () => ({ known: true, enabled: false, launchOffer: false }) }));

// The hero's sign-in link opens the sign-in dialog, where Google comes first
// and an email and password follow. The dialog's Google button keeps the
// Back-from-Google recovery (tests/sign-in-dialog.test.tsx).
it('opens the sign-in dialog from the hero link', () => {
  server.use(settingsHandler);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><MemoryRouter><LanguageProvider><Home /></LanguageProvider></MemoryRouter></QueryClientProvider>);
  const link = screen.getByRole('button', { name: 'Sign in or create an account' });
  expect(link).toHaveAttribute('aria-haspopup', 'dialog');
  fireEvent.click(link);
  expect(openSignIn).toHaveBeenCalledTimes(1);
  expect(link).toBeEnabled();
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

// The landing page told every visitor "Progress saves to your account." A
// guest's progress stays in this browser, and the GitHub garden is off.
it('says where progress is kept, for a guest and for an account, and promises no garden', async () => {
  server.use(settingsHandler);
  const renderHome = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    return render(<QueryClientProvider client={client}><MemoryRouter><LanguageProvider><Home /></LanguageProvider></MemoryRouter></QueryClientProvider>);
  };
  const guest = renderHome();
  expect(screen.getByText('You’re not signed in, so this progress stays on this device only. Signing in starts from your account’s progress instead.')).toBeInTheDocument();
  expect(screen.queryByText('Progress saves to your account.')).toBeNull();
  expect(screen.getByText('Loops, array methods, types and components with real tests.')).toBeInTheDocument();
  expect(screen.queryByText(/GitHub garden/)).toBeNull();
  guest.unmount();

  const signedOut = auth.value;
  auth.value = { ...signedOut, user: { id: 'user-1' } as never, isAuthenticated: true };
  try {
    renderHome();
    expect(screen.getByText('Progress saves to your account.')).toBeInTheDocument();
    expect(screen.queryByText(/stays on this device only/)).toBeNull();
  } finally {
    auth.value = signedOut;
  }
});
