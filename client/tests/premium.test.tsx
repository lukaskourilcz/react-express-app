import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { apiFetch, friendlyError, isPremiumRequired } from '../src/lib/api';
import { closeUpgradeSheet, useUpgradeRequest } from '../src/lib/upgradeSheet';
import { useLocks } from '../src/lib/locks';
import { buildToday } from '../src/lib/today';
import UpgradeSheet from '../src/components/UpgradeSheet';
import { server } from './mocks/server';

const auth = vi.hoisted(() => ({ value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false } }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => auth.value }));

const signIn = () => { auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }; };
const signOut = () => { auth.value = { user: null, isAuthenticated: false, isLoading: false }; };
afterEach(() => { signOut(); closeUpgradeSheet(); });

const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const PREMIUM = { ...FREE, tier: 'premium', source: 'manual' };
const plan = (body: unknown, status = 200) =>
  http.get('*/api/user/*', ({ request }) => new URL(request.url).searchParams.get('op') === 'entitlement'
    ? HttpResponse.json(body as never, { status })
    : undefined);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}><MemoryRouter><LanguageProvider>{children}</LanguageProvider></MemoryRouter></QueryClientProvider>;
}

describe('the 402 contract in the API client', () => {
  it('opens the upgrade sheet once, in one place, and never shows a raw error', async () => {
    server.use(http.get('*/api/test', () => HttpResponse.json(
      { error: { code: 'premium_required', message: 'Premium opens this', kind: 'coding-task', ref: 'js-palindrome' } },
      { status: 402 },
    )));
    const sheet = renderHook(() => useUpgradeRequest());
    const error = await apiFetch('/api/test').catch((e: unknown) => e);
    expect(isPremiumRequired(error)).toBe(true);
    expect(friendlyError(error)).toMatch(/Premium opens this/);
    expect(sheet.result.current).toMatchObject({ kind: 'coding-task', ref: 'js-palindrome' });
  });
  it('leaves other refusals alone', async () => {
    server.use(http.get('*/api/test', () => HttpResponse.json({ error: { code: 'prerequisite_not_met' } }, { status: 403 })));
    const sheet = renderHook(() => useUpgradeRequest());
    await apiFetch('/api/test').catch(() => undefined);
    expect(sheet.result.current).toBeNull();
  });
});

describe('locks mirror the server', () => {
  const react13 = { kind: 'learn-level', topic: 'react', level: 13 } as const;
  const react12 = { kind: 'learn-level', topic: 'react', level: 12 } as const;
  const html = { kind: 'learn-level', topic: 'html', level: 6 } as const;

  it('locks Premium content for a signed-in free account and keeps the free tier open', async () => {
    signIn();
    server.use(plan(FREE));
    const { result } = renderHook(() => useLocks(), { wrapper });
    expect(result.current.loading).toBe(true);
    // No flash of locks: before the plan loads nothing reads as locked.
    expect(result.current.lockOf(react13)).toBe('unknown');
    await waitFor(() => expect(result.current.tier).toBe('free'));
    expect(result.current.lockOf(react13)).toBe('locked');
    expect(result.current.lockOf(react12)).toBe('open');
    expect(result.current.lockOf(html)).toBe('open');
    expect(result.current.lockOf({ kind: 'coding-task', taskId: 'js-digit-sum' })).toBe('open');
    expect(result.current.lockOf({ kind: 'coding-task', taskId: 'js-palindrome' })).toBe('locked');
  });
  it('opens everything for a Premium account', async () => {
    signIn();
    server.use(plan(PREMIUM));
    const { result } = renderHook(() => useLocks(), { wrapper });
    await waitFor(() => expect(result.current.tier).toBe('premium'));
    expect(result.current.lockOf(react13)).toBe('open');
    expect(result.current.lockOf({ kind: 'learning-path', pathId: 'fde' })).toBe('open');
  });
  it('keeps a signed-out preview unblocked and makes no request', async () => {
    signOut();
    const { result } = renderHook(() => useLocks(), { wrapper });
    expect(result.current.tier).toBe('free');
    expect(result.current.lockOf(react13)).toBe('preview');
  });
  it('reads as unknown, not locked, when the plan cannot load', async () => {
    signIn();
    server.use(plan({ error: { code: 'db_error' } }, 500));
    const { result } = renderHook(() => useLocks(), { wrapper });
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.lockOf(react13)).toBe('unknown');
  });
});

describe('the Today plan', () => {
  it('stops offering a level Premium opens', () => {
    const open = buildToday({}, 'webdev');
    const first = open.all.new[0];
    expect(first).toBeDefined();
    const gated = buildToday({}, 'webdev', { canStart: (topic, level) => !(topic === first.topic && level === first.level) });
    expect(gated.all.new.some((item) => item.id === first.id)).toBe(false);
    expect(gated.all.new.length).toBe(open.all.new.length - 1);
  });
});

describe('the upgrade sheet', () => {
  // jsdom has no modal dialog; the sheet needs only the open state.
  const proto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
  proto.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  proto.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };

  it('says what Premium includes and what it costs, with VAT, and closes on Not now', async () => {
    render(<UpgradeSheet request={{ id: 1, kind: 'learn-level', ref: 'react:13' }} />, { wrapper });
    expect(screen.getByText('This level is part of Premium.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText(/€3\.99 a month or €39\.99 a year, VAT included/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go Premium' })).toBeInTheDocument();
    const sheet = renderHook(() => useUpgradeRequest());
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Not now' })); });
    expect(sheet.result.current).toBeNull();
  });
});
