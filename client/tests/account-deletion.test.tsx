import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AccountDeletionCard } from '../src/components/Profile';
import { server } from './mocks/server';

// Deleting an account ends a paid subscription at once without a refund
// (review finding product-4): the card and the confirmation say so.
const auth = vi.hoisted(() => ({
  value: { user: { id: 'user-1' } as { id: string } | null, isAuthenticated: true, isLoading: false, signOut: async () => undefined },
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value, getUserProfile: () => ({}) }));
afterEach(() => { auth.value = { ...auth.value, user: { id: 'user-1' }, isAuthenticated: true }; });

// jsdom has no modal dialogs; the confirmation opens one.
const proto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
proto.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
proto.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };

const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const plan = (body: unknown) => server.use(http.get('*/api/user/*', ({ request }) => new URL(request.url).searchParams.get('op') === 'entitlement'
  ? HttpResponse.json(body as never)
  : undefined));

function renderCard(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LanguageProvider>{node}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PREMIUM_LINE = 'Your Premium subscription ends at once and is not refunded. Within 14 days of your first payment, withdraw on the cancellation page first to get that payment back.';

describe('deleting an account', () => {
  it('tells a paying account that Premium ends without a refund, and links the withdrawal', async () => {
    plan({ ...FREE, tier: 'premium', source: 'provider', currentPeriodEnd: '2026-11-12T10:00:00.000Z', billingAccount: true, subscriptionLive: true });
    renderCard(<AccountDeletionCard />);
    expect(await screen.findByText(PREMIUM_LINE, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the cancellation page' })).toHaveAttribute('href', '/premium/cancel?action=withdraw');
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    expect(await screen.findByText(new RegExp(`multiplayer records\\. This action cannot be undone\\. ${PREMIUM_LINE.replace(/[.]/g, '\\.')}`))).toBeInTheDocument();
  });

  it('says nothing about Premium to an account that pays for nothing', async () => {
    plan({ ...FREE, billingAccount: false, subscriptionLive: false });
    renderCard(<AccountDeletionCard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete my account' }));
    expect(await screen.findByText(/This action cannot be undone\.$/)).toBeInTheDocument();
    expect(screen.queryByText(PREMIUM_LINE, { exact: false })).toBeNull();
  });
});
