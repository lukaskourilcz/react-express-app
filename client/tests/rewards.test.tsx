import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useT } from '../src/i18n/LanguageContext';
import Shop, { earnRows, ledgerLabel } from '../src/components/Shop';
import { SocialProfiles } from '../src/components/SocialProfiles';
import { closeUpgradeSheet, useUpgradeRequest } from '../src/lib/upgradeSheet';
import type { EarnSummary, WalletResponse } from '../src/lib/rewards';
import { DEFAULT_COIN_SETTINGS } from '../../shared/rewards';
import { server } from './mocks/server';

// Invented fixtures only; the shapes are the real op=wallet and op=shop ones.
const auth = vi.hoisted(() => ({ value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value }));
const signIn = () => { auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }; };
const signOut = () => { auth.value = { user: null, isAuthenticated: false, isLoading: false }; };
afterEach(() => { signOut(); closeUpgradeSheet(); });

const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const PREMIUM = { ...FREE, tier: 'premium', source: 'manual' };

const progress = (over: Partial<NonNullable<EarnSummary['progress']>> = {}): NonNullable<EarnSummary['progress']> => ({
  premium: false, todayXpCoins: 40, streak: 4,
  topics: [{ id: 'javascript', passed: 21, total: 25 }, { id: 'html', passed: 30, total: 30 }],
  projects: [{ id: 'js-evolving-calculator', passed: 4, total: 10 }],
  earned: [], ...over,
});

const wallet = (over: Partial<WalletResponse> = {}): WalletResponse => ({
  subject: 'webdev',
  balance: 1240,
  entries: [
    { eventId: 'signup:user-1', amount: 200, reason: 'signup', reference: null, createdAt: '2026-09-20T10:00:00Z' },
    { eventId: 'xp:quiz:a1', amount: 12, reason: 'verified-xp', reference: 'quiz:a1', createdAt: '2026-09-21T10:00:00Z' },
  ],
  cosmetics: [],
  welcome: { granted: false, coins: 200 },
  earn: { rules: DEFAULT_COIN_SETTINGS, progress: progress() },
  ...over,
});

const shop = {
  enabled: false, cashCheckoutEnabled: false, testMode: true, policyUrl: '',
  items: [
    { sku: 'mug', variants: [], availability: 'unconfigured', price: null, variantStock: [{ variant: '', free: 0 }] },
    { sku: 't-shirt', variants: ['S', 'M'], availability: 'unconfigured', price: null, variantStock: [] },
  ],
  crown: { available: true, tokenPrice: 1200 },
  protection: { available: true, tokenPrice: 250, cap: 2 },
};

function routes(opts: { plan?: unknown; wallet?: unknown; walletStatus?: number; social?: (body: unknown) => void } = {}) {
  server.use(
    http.get('*/api/settings', () => HttpResponse.json({ coins: DEFAULT_COIN_SETTINGS })),
    http.get('*/api/user/*', ({ request }) => {
      const op = new URL(request.url).searchParams.get('op');
      if (op === 'entitlement') return HttpResponse.json((opts.plan ?? FREE) as never);
      if (op === 'wallet') return HttpResponse.json((opts.wallet ?? wallet()) as never, { status: opts.walletStatus ?? 200 });
      if (op === 'shop') return HttpResponse.json(shop);
      if (op === 'orders') return HttpResponse.json({ orders: [] });
      return undefined;
    }),
    http.post('*/api/user/*', async ({ request }) => {
      const body = await request.json();
      opts.social?.(body);
      return HttpResponse.json({ granted: true, coins: 5 });
    }),
  );
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}><MemoryRouter><LanguageProvider>{children}</LanguageProvider></MemoryRouter></QueryClientProvider>;
}
const tHook = () => renderHook(() => useT(), { wrapper }).result.current;

describe('How to earn', () => {
  it('turns progress into the live lines of the handoff', () => {
    const t = tHook();
    const rows = earnRows({ rules: DEFAULT_COIN_SETTINGS, progress: progress() }, t, true);
    const labels = rows.map((row) => row.label);
    expect(labels).toContain('Streak 7 days: 4 of 7');
    expect(labels).toContain('JavaScript: 21 of 25 levels');
    expect(labels).toContain('Expression engine: 4 of 10 stages');
    expect(rows.find((row) => row.key === 'xp')?.figure).toBe('Today: 40 of 400');
    expect(rows.find((row) => row.key === 'welcome')?.figure).toBe('Received');
    // A finished topic that has not paid is not listed as in progress.
    expect(labels.some((label) => label.startsWith('HTML:'))).toBe(false);
    // Every milestone says Premium; the XP and welcome coins go to everyone.
    expect(rows.filter((row) => row.key.startsWith('streak-')).every((row) => row.premium)).toBe(true);
    expect(rows.find((row) => row.key === 'xp')?.premium).toBeFalsy();
  });

  it('marks paid milestones as earned and shows only the rules before progress loads', () => {
    const t = tHook();
    const earned = earnRows({ rules: DEFAULT_COIN_SETTINGS, progress: progress({ streak: 9, earned: ['streak:7', 'topic:html'] }) }, t, false);
    expect(earned.find((row) => row.key === 'streak-7')).toMatchObject({ done: true, figure: 'Earned' });
    expect(earned.find((row) => row.key === 'topic:html')).toMatchObject({ label: 'Finished HTML', done: true });
    expect(earned.find((row) => row.key === 'welcome')?.figure).toBe('+200');
    const rulesOnly = earnRows({ rules: DEFAULT_COIN_SETTINGS, progress: null }, t, false);
    expect(rulesOnly.map((row) => row.label)).toEqual(expect.arrayContaining([
      'Streak 7 days', 'Pass every level of a Learn topic', 'Finish an evolving project', 'Finish a short path', 'Top three of the month',
    ]));
  });
});

describe('ledger lines', () => {
  it('say what each credit was for', () => {
    const t = tHook();
    expect(ledgerLabel({ reason: 'verified-xp', reference: 'learn:abc:html:L3' }, t)).toBe('Learn');
    expect(ledgerLabel({ reason: 'verified-xp', reference: 'coding:abc:js-digit-sum' }, t)).toBe('Coding challenge');
    expect(ledgerLabel({ reason: 'milestone', reference: 'streak:30' }, t)).toBe('30-day streak');
    expect(ledgerLabel({ reason: 'milestone', reference: 'month-top:2026-08' }, t)).toBe('Top three, August 2026');
    expect(ledgerLabel({ reason: 'purchase', reference: 'streak-protection' }, t)).toBe('Streak protection');
    expect(ledgerLabel({ reason: 'signup', reference: null }, t)).toBe('Welcome');
  });
});

describe('the Rewards screen', () => {
  it('shows a free account the merchandise with the upgrade sheet, never an address form', async () => {
    signIn();
    routes({ plan: FREE });
    render(<Shop />, { wrapper });
    expect(screen.getByRole('heading', { level: 1, name: 'Rewards' })).toBeInTheDocument();
    await screen.findByText('1,240');
    expect(screen.getByRole('heading', { name: 'How to earn' })).toBeInTheDocument();
    await screen.findByText('Premium members redeem coins for merchandise.');
    const sheet = renderHook(() => useUpgradeRequest());
    const redeem = (await screen.findAllByRole('button', { name: 'Redeem' }))[0];
    expect(redeem).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(redeem);
    expect(sheet.result.current).toMatchObject({ kind: 'merch-redemption', ref: 'mug' });
    expect(screen.queryByLabelText('Postcode')).toBeNull();
  });

  it('keeps the sections in the order of the handoff', async () => {
    signIn();
    routes({ plan: PREMIUM, wallet: wallet({ earn: { rules: DEFAULT_COIN_SETTINGS, progress: progress({ premium: true }) } }) });
    render(<Shop />, { wrapper });
    await screen.findByText('1,240');
    await screen.findByRole('heading', { name: 'Crown and streak protection' });
    const headings = screen.getAllByRole('heading', { level: 2 }).map((one) => one.textContent);
    expect(headings.slice(0, 4)).toEqual(['Your coins', 'How to earn', 'Merchandise', 'Crown and streak protection']);
    expect(screen.queryByText('Premium members redeem coins for merchandise.')).toBeNull();
  });

  it('shows the last lines of the ledger and the rest on request', async () => {
    signIn();
    const entries = Array.from({ length: 7 }, (_, i) => ({
      eventId: `xp:quiz:q${i}`, amount: 10 + i, reason: 'verified-xp', reference: `quiz:q${i}`, createdAt: '2026-09-21T10:00:00Z',
    }));
    routes({ wallet: wallet({ entries }) });
    render(<Shop />, { wrapper });
    const toggle = await screen.findByRole('button', { name: 'Show all 7' });
    const list = document.getElementById('rw-ledger')!;
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(list).getAllByRole('listitem')).toHaveLength(7);
  });

  it('asks a signed-out visitor to sign in and still explains how to earn', async () => {
    signOut();
    routes();
    render(<Shop />, { wrapper });
    expect(screen.getByText(/Sign in to see your coins/)).toBeInTheDocument();
    expect(screen.getByText('Streak 7 days')).toBeInTheDocument();
  });

  it('offers a retry when the coins cannot load', async () => {
    signIn();
    routes({ wallet: { error: { code: 'db_error' } }, walletStatus: 500 });
    render(<Shop />, { wrapper });
    expect(await screen.findByText('Your coins could not load.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('Find devShark elsewhere', () => {
  it('renders nothing until the owner records a profile', () => {
    routes();
    const { container } = render(<SocialProfiles profiles={{ linkedin: null, instagram: null, threads: null }} />, { wrapper });
    expect(container).toBeEmptyDOMElement();
  });

  it('links out without a reward by default', async () => {
    signIn();
    const posted = vi.fn();
    routes({ social: posted });
    render(<SocialProfiles profiles={{ linkedin: 'https://www.linkedin.com/company/example', instagram: null, threads: null }} />, { wrapper });
    const link = screen.getByRole('link', { name: /LinkedIn/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByText(/Thanks for visiting/)).toBeNull();
    expect(screen.queryByText(/follow/i)).toBeNull();
    link.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(link);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(posted).not.toHaveBeenCalled();
  });

  it('thanks a signed-in visitor when the owner sets a grant, naming only the platform', async () => {
    signIn();
    const posted = vi.fn();
    routes({ social: posted });
    server.use(http.get('*/api/settings', () => HttpResponse.json({ coins: { ...DEFAULT_COIN_SETTINGS, socialVisitGrant: 5 } })));
    render(<SocialProfiles profiles={{ linkedin: null, instagram: 'https://www.instagram.com/example', threads: null }} />, { wrapper });
    await screen.findByText('Thanks for visiting: 5 coins the first time you open each profile.');
    const link = screen.getByRole('link', { name: /Instagram/ });
    link.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(link);
    await waitFor(() => expect(posted).toHaveBeenCalledWith({ claim: 'social', platform: 'instagram' }));
    expect(await screen.findByText('Thanks for visiting. +5 coins.')).toBeInTheDocument();
  });
});
