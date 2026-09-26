// Premium vouchers (migration 045): the plan line of a promo grant.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import PremiumPage from '../src/components/PremiumPage';
import PlanLine from '../src/components/PlanLine';
import UpgradeSheet from '../src/components/UpgradeSheet';
import { closeUpgradeSheet } from '../src/lib/upgradeSheet';
import { server } from './mocks/server';

const signInWithGoogle = vi.fn(async (_returnTo?: string) => undefined);
const auth = vi.hoisted(() => ({
  value: { user: null as { id: string } | null, isAuthenticated: false, isLoading: false },
}));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ ...auth.value, signInWithGoogle }) }));
const signIn = () => { auth.value = { user: { id: 'user-1' }, isAuthenticated: true, isLoading: false }; };
afterEach(() => {
  auth.value = { user: null, isAuthenticated: false, isLoading: false };
  signInWithGoogle.mockClear();
  closeUpgradeSheet();
});

// Dates in this year and the next, at noon UTC, so the plan line's "no year
// within the same year" rule and any time zone give the same text every year.
const YEAR = new Date().getFullYear();
const THIS_YEAR_END = `${YEAR}-12-26T12:00:00.000Z`;
const NEXT_YEAR_END = `${YEAR + 1}-10-26T12:00:00.000Z`;
const FREE = { tier: 'free', source: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, inGrace: false, validUntil: null };
const VOUCHER_PLAN = { ...FREE, tier: 'premium', source: 'promo', validUntil: THIS_YEAR_END };
const OFF = { enabled: false, cancellable: false, seller: null };
const ON = { enabled: true, cancellable: true, seller: 'link' };

/** The settings and the plan; the plan can change after a redemption. */
function serve({ billing = OFF as unknown, plans = [FREE] as unknown[] }: { billing?: unknown; plans?: unknown[] } = {}) {
  let reads = 0;
  server.use(
    http.get('*/api/settings', () => HttpResponse.json({ billing })),
    http.get('*/api/user/*', () => HttpResponse.json(plans[Math.min(reads++, plans.length - 1)] as never)),
  );
  return { reads: () => reads };
}

/** The redemption endpoint, answering with `answer`; records what was sent. */
function redeemAnswers(answer: () => Response) {
  const bodies: unknown[] = [];
  server.use(http.post('*/api/user/voucher', async ({ request }) => {
    bodies.push(await request.json());
    return answer();
  }));
  return bodies;
}

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.hash}</p>;
}

function renderAt(path: string, node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LanguageProvider>
          <Routes>
            <Route path="*" element={<>{node}<Where /></>} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const voucherSection = () => screen.getByRole('region', { name: 'Have a voucher?' });
const typeAndRedeem = async (code: string) => {
  const field = await screen.findByRole('textbox', { name: /Voucher code/ });
  fireEvent.change(field, { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Redeem voucher' }));
  return field;
};

describe('the plan line', () => {
  it('names a voucher grant and its end, and keeps a manual grant complimentary', async () => {
    signIn();
    serve({ billing: ON, plans: [VOUCHER_PLAN] });
    const first = renderAt('/profile', <PlanLine />);
    expect(await screen.findByText('Premium from a voucher, until 26 Dec')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage billing' })).toBeNull();
    first.unmount();
    serve({ billing: ON, plans: [{ ...VOUCHER_PLAN, validUntil: NEXT_YEAR_END }] });
    const second = renderAt('/profile', <PlanLine />);
    expect(await screen.findByText(`Premium from a voucher, until 26 Oct ${YEAR + 1}`)).toBeInTheDocument();
    second.unmount();
    serve({ billing: ON, plans: [{ ...VOUCHER_PLAN, validUntil: null }] });
    const third = renderAt('/profile', <PlanLine />);
    expect(await screen.findByText('Premium from a voucher, with no end date')).toBeInTheDocument();
    third.unmount();
    serve({ billing: ON, plans: [{ ...VOUCHER_PLAN, source: 'manual', validUntil: null }] });
    renderAt('/profile', <PlanLine />);
    expect(await screen.findByText('Premium, complimentary')).toBeInTheDocument();
  });
});
