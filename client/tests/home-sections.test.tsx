// The home page's sections after the UX audit of 23 October 2026 (U5, #577):
// one section-title size, the FDE section's two columns and stats, and the
// topic grid that turns to two tiles a row on a phone.
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import Home from '../src/components/Home';
import { server } from './mocks/server';
import { settingsHandler } from './mocks/handlers';

const auth = vi.hoisted(() => ({ value: { user: null, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value }));
vi.mock('../src/lib/billing', () => ({ useBilling: () => ({ known: true, enabled: false, launchOffer: false }) }));

const freeEntitlement = http.get('*/api/user/*', ({ request }) => new URL(request.url).searchParams.get('op') === 'entitlement'
  ? HttpResponse.json({ tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null })
  : undefined);

beforeEach(() => {
  server.use(
    settingsHandler,
    freeEntitlement,
    http.get('*/api/quiz/roadmap', ({ request }) => new URL(request.url).searchParams.get('resource') === 'learning-path-catalog'
      ? HttpResponse.json({ versions: {}, paths: [] })
      : undefined),
  );
});

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><LanguageProvider><Home /></LanguageProvider></MemoryRouter></QueryClientProvider>);
}

// shell-public-16: home's h2s were 24, 28 and 36px, each set somewhere else.
it('gives every home section title the one shared section-title class', () => {
  renderHome();
  const titles = screen.getAllByRole('heading', { level: 2 });
  expect(titles.map((title) => title.textContent)).toEqual(expect.arrayContaining([
    'Pick a topic.', 'Inside JavaScript', 'Forward Deployed Engineer', 'Free and Premium',
  ]));
  for (const title of titles) {
    expect(title, title.textContent ?? '').toHaveClass('ss-section-title');
    expect(title.getAttribute('style') ?? '').not.toMatch(/font-size/);
  }
  // The table's first column no longer repeats the plans title.
  expect(within(screen.getByRole('table')).getAllByRole('columnheader')[0]).toHaveTextContent('Feature');
});
