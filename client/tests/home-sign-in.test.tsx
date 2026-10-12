import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Home from '../src/components/Home';
import { server } from './mocks/server';
import { settingsHandler } from './mocks/handlers';
import { http, HttpResponse } from 'msw';

const auth = vi.hoisted(() => ({
  value: { user: null, isAuthenticated: false, isLoading: false },
}));
const freeEntitlementHandler = http.get('*/api/user/*', ({ request }) => new URL(request.url).searchParams.get('op') === 'entitlement'
  ? HttpResponse.json({ tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null })
  : undefined);
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value }));
const openSignIn = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/signInDialog', async (importOriginal) => ({ ...(await importOriginal<object>()), openSignIn }));
vi.mock('../src/lib/billing', () => ({ useBilling: () => ({ known: true, enabled: false, launchOffer: false }) }));

// The hero's sign-in link opens the sign-in dialog, where Google comes first
// and an email and password follow. The dialog's Google button keeps the
// Back-from-Google recovery (tests/sign-in-dialog.test.tsx).
it('opens the sign-in dialog from the hero link', () => {
  server.use(settingsHandler, freeEntitlementHandler);
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
  server.use(settingsHandler, freeEntitlementHandler);
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

// The homepage focuses on choosing a path; progress-storage details live in Learn.
it('keeps progress-storage copy off the homepage for guests and accounts', async () => {
  server.use(settingsHandler, freeEntitlementHandler);
  const renderHome = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    return render(<QueryClientProvider client={client}><MemoryRouter><LanguageProvider><Home /></LanguageProvider></MemoryRouter></QueryClientProvider>);
  };
  const guest = renderHome();
  expect(screen.queryByText(/stays on this device only/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Start learning JavaScript' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'What does this return?' })).toHaveTextContent('2 ** 3;');
  expect(screen.queryByRole('textbox', { name: 'Your code' })).toBeNull();
  expect(screen.queryByText('Progress saves to your account.')).toBeNull();
  expect(screen.getByText('Loops, array methods, types and components with real tests.')).toBeInTheDocument();
  expect(screen.queryByText(/GitHub garden/)).toBeNull();
  guest.unmount();

  const signedOut = auth.value;
  auth.value = { ...signedOut, user: { id: 'user-1' } as never, isAuthenticated: true };
  try {
    renderHome();
    expect(screen.queryByText('Progress saves to your account.')).toBeNull();
    expect(screen.queryByText(/stays on this device only/)).toBeNull();
  } finally {
    auth.value = signedOut;
  }
});

// Topic selection changes both the preview and the destination of its action.
it('starts the selected learning path from its renamed action', async () => {
  server.use(settingsHandler, freeEntitlementHandler);
  function Where() {
    const location = useLocation();
    return <p data-testid="location">{location.pathname + location.search}</p>;
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/']}><LanguageProvider><Routes>
    <Route path="/" element={<Home />} /><Route path="/learn" element={<Where />} />
  </Routes></LanguageProvider></MemoryRouter></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Learn TypeScript' }));
  const path = screen.getByRole('list', { name: 'Learn path for TypeScript' });
  expect(within(path).getAllByRole('listitem')).toHaveLength(6);
  expect(within(path).getByText('Basic Types')).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'What does this return?' })).toHaveTextContent('2 ** 3;');
  expect(screen.queryByRole('button', { name: 'Start learning JavaScript' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Start learning TypeScript' }));
  expect(await screen.findByTestId('location')).toHaveTextContent('/learn?topic=typescript');
});

it.each([
  ['B 8', 'Correct.'],
  ['A 6', 'Incorrect. The answer is 8.'],
])('answers the restored JavaScript sample once: %s', (answer, feedback) => {
  server.use(settingsHandler, freeEntitlementHandler);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><MemoryRouter><LanguageProvider><Home /></LanguageProvider></MemoryRouter></QueryClientProvider>);
  const sample = screen.getByRole('group', { name: 'What does this return?' });
  expect(within(sample).getAllByRole('button')).toHaveLength(4);
  const card = within(sample.parentElement!);
  expect(card.queryByRole('status')).toBeNull();
  fireEvent.click(within(sample).getByRole('button', { name: answer }));
  expect(card.getByRole('status')).toHaveTextContent(feedback);
  expect(card.getByRole('status')).toHaveTextContent('The ** operator is exponentiation');
  for (const option of within(sample).getAllByRole('button')) expect(option).toBeDisabled();
  expect(screen.queryByRole('region', { name: 'devShark product video' })).toBeNull();
});
