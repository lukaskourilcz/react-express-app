import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  value: {
    user: { id: 'user-1' } as { id: string } | null, isAuthenticated: true, isLoading: false,
    signOut: vi.fn(async (_scope?: 'local' | 'global') => undefined),
  },
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value, getUserProfile: () => ({}) }));
afterEach(() => { auth.value = { ...auth.value, user: { id: 'user-1' }, isAuthenticated: true }; });

// jsdom has no modal dialogs; the confirmation opens one.
const proto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
proto.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
proto.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };

const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const NOT_CONNECTED = { available: true, status: 'not_connected', accountLogin: null, repoFullName: null, defaultBranch: null, lastCommitAt: null, queued: 0, lastError: null };
/** Which account reads the card made. */
const requests: string[] = [];
/** The plan and, beside it, the GitHub garden connection (the card reads both). */
const plan = (body: unknown, github: unknown = NOT_CONNECTED) => server.use(http.get('*/api/user/*', ({ request }) => {
  const op = new URL(request.url).searchParams.get('op');
  if (op) requests.push(op);
  if (op === 'entitlement') return HttpResponse.json(body as never);
  if (op === 'github-connection') return HttpResponse.json(github as never);
  return undefined;
}));

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

  it('says the GitHub app keeps its access when one is installed, and only then', async () => {
    const GITHUB_LINE = 'The devShark app you installed on GitHub keeps access to the repositories you gave it until you uninstall it on GitHub.';
    plan({ ...FREE, billingAccount: false, subscriptionLive: false }, { ...NOT_CONNECTED, status: 'connected', accountLogin: 'learner', repoFullName: 'learner/garden', defaultBranch: 'main' });
    const view = renderCard(<AccountDeletionCard />);
    // The garden card beside this one would have loaded the connection already.
    await waitFor(() => expect(requests).toContain('github-connection'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete my account' }));
    expect(await screen.findByText(`multiplayer records. This action cannot be undone. ${GITHUB_LINE}`, { exact: false })).toBeInTheDocument();
    view.unmount();

    // Garden switched off on this deployment: nothing to uninstall.
    plan({ ...FREE, billingAccount: false, subscriptionLive: false }, { ...NOT_CONNECTED, available: false });
    renderCard(<AccountDeletionCard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete my account' }));
    expect(await screen.findByText(/This action cannot be undone\.$/)).toBeInTheDocument();
    expect(screen.queryByText(GITHUB_LINE, { exact: false })).toBeNull();
  });

  it('forgets the account’s data on this device after the deletion and keeps the device’s settings', async () => {
    plan({ ...FREE, billingAccount: false, subscriptionLive: false });
    server.use(http.delete('*/api/user/*', () => HttpResponse.json({ ok: true })));
    localStorage.setItem('devquiz:roadmap:v2', JSON.stringify({ html: { levels: { 1: { passed: true, bestPct: 100 } }, checkpoints: {} } }));
    localStorage.setItem('devshark:coding:draft:html-1', 'const secret = 1;');
    localStorage.setItem('devshark:referral', JSON.stringify({ code: 'ABCD2345', savedAt: Date.now() }));
    localStorage.setItem('devquiz:color-mode', 'dark');
    localStorage.setItem('devquiz.lang', 'en');
    sessionStorage.setItem('devshark:voucher-prefill', 'LAUNCH55');
    renderCard(<AccountDeletionCard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete my account' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete my account' }));
    await waitFor(() => expect(localStorage.getItem('devquiz:roadmap:v2')).toBeNull());
    expect(localStorage.getItem('devshark:coding:draft:html-1')).toBeNull();
    expect(localStorage.getItem('devshark:referral')).toBeNull();
    expect(sessionStorage.getItem('devshark:voucher-prefill')).toBeNull();
    expect(localStorage.getItem('devquiz:color-mode')).toBe('dark');
    expect(localStorage.getItem('devquiz.lang')).toBe('en');
    sessionStorage.clear();
  });
});

describe('signing out on every device', () => {
  it('sits in the account area and signs out with the global scope', async () => {
    auth.value.signOut.mockClear();
    plan({ ...FREE, billingAccount: false, subscriptionLive: false });
    renderCard(<AccountDeletionCard />);
    expect(screen.getByText(/Log out in the account menu signs out only this browser\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out on all devices' }));
    await waitFor(() => expect(auth.value.signOut).toHaveBeenCalledWith('global'));
    expect(auth.value.signOut).toHaveBeenCalledTimes(1);
  });

  it('says so when the sign-out fails', async () => {
    auth.value.signOut.mockClear();
    auth.value.signOut.mockRejectedValueOnce(new Error('offline'));
    plan({ ...FREE, billingAccount: false, subscriptionLive: false });
    renderCard(<AccountDeletionCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out on all devices' }));
    expect(await screen.findByText('Sign-out failed. Check your connection and try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out on all devices' })).toBeEnabled();
  });
});
