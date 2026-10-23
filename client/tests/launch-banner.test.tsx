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

it('shows the compact October copy without dates or an extra action', () => {
  vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));
  mount();
  expect(screen.getByRole('heading', { name: 'October launch offer · 55% off' })).toBeInTheDocument();
  expect(screen.getByText('€2.25 a month or €26.95 a year, before VAT.')).toBeInTheDocument();
  expect(screen.queryByText(/Prague time|4 October|Join by/)).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
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
  expect(screen.getByRole('complementary')).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(1); });
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});
it('expires on return to a tab whose timer slept past the end', () => {
  billing.launchOffer = true;
  vi.setSystemTime(LAUNCH_OFFER.endsBefore - 60_000);
  mount();
  expect(screen.getByRole('complementary')).toBeInTheDocument();
  // The computer slept: the clock moved on, the timer did not fire.
  vi.setSystemTime(LAUNCH_OFFER.endsBefore + 3_600_000);
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});
it('reschedules a boundary beyond the browser timeout limit', () => {
  billing.launchOffer = true;
  vi.setSystemTime(LAUNCH_OFFER.startsAt);
  mount();
  act(() => { vi.advanceTimersByTime(2 ** 31 - 1); });
  expect(screen.getByRole('complementary')).toBeInTheDocument();
  while (Date.now() < LAUNCH_OFFER.endsBefore) {
    act(() => { vi.advanceTimersByTime(Math.min(2 ** 31 - 1, LAUNCH_OFFER.endsBefore - Date.now())); });
  }
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});
