import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { LaunchOfferBanner } from '../src/components/LaunchOffer';
import { LAUNCH_OFFER } from '../../shared/launch-offer';

const billing = vi.hoisted(() => ({ launchOffer: false }));
vi.mock('../src/lib/billing', () => ({ useBilling: () => billing }));
const mount = () => render(<MemoryRouter><LanguageProvider><LaunchOfferBanner /></LanguageProvider></MemoryRouter>);
beforeEach(() => { vi.useFakeTimers(); billing.launchOffer = false; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('announces the future dates without claiming checkout is open', () => {
  vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));
  mount();
  expect(screen.getByRole('heading', { name: 'Premium launch offer · 55% off' })).toBeInTheDocument();
  expect(screen.getByText(/4 October 2026 – 2 November 2026/)).toBeInTheDocument();
  expect(screen.getByText(/^From 4 October 2026:/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Explore Premium' })).toHaveAttribute('href', '/premium');
});
it('withdraws the announcement at launch if checkout cannot apply the offer', () => {
  vi.setSystemTime(LAUNCH_OFFER.startsAt - 1);
  mount();
  act(() => { vi.advanceTimersByTime(1); });
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});
it('expires on the open page even if settings still advertise the discount', () => {
  billing.launchOffer = true;
  vi.setSystemTime(LAUNCH_OFFER.endsBefore - 1);
  mount();
  expect(screen.getByText(/Join by 2 November 2026/)).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(1); });
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});
it('reschedules a boundary beyond the browser timeout limit', () => {
  billing.launchOffer = true;
  vi.setSystemTime(LAUNCH_OFFER.startsAt);
  mount();
  act(() => { vi.advanceTimersByTime(2 ** 31 - 1); });
  expect(screen.getByRole('complementary')).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(LAUNCH_OFFER.endsBefore - Date.now()); });
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});
