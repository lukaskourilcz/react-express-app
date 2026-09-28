// The browser's half of the launch price (lib/launchOffer.ts): when a page
// left open redraws. The window itself is covered by the launch contracts.
import { expect, it } from 'vitest';
import { nextLaunchBoundary } from '../src/lib/launchOffer';
import { LAUNCH_OFFER } from '../../shared/launch-offer';

it('redraws at the start and at the end of the window, and never after', () => {
  expect(nextLaunchBoundary(Date.parse('2026-09-28T12:00:00Z'))).toBe(LAUNCH_OFFER.startsAt);
  expect(nextLaunchBoundary(LAUNCH_OFFER.startsAt - 1)).toBe(LAUNCH_OFFER.startsAt);
  expect(nextLaunchBoundary(LAUNCH_OFFER.startsAt)).toBe(LAUNCH_OFFER.endsBefore);
  expect(nextLaunchBoundary(LAUNCH_OFFER.endsBefore - 1)).toBe(LAUNCH_OFFER.endsBefore);
  expect(nextLaunchBoundary(LAUNCH_OFFER.endsBefore)).toBeNull();
});
