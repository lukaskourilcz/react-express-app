// The launch offer in the browser (shared/launch-offer.ts). It shows only
// when the server says Checkout applies the coupon now AND the browser's own
// clock is inside the window, so neither a cached settings answer nor a
// wrong device clock can put it on a page before 4 October 2026 00:00 or
// after 2 November 2026 23:59:59, Prague time. A page left open across either
// instant redraws at that instant; nothing counts down.
import { useEffect, useState } from 'react';
import { LAUNCH_OFFER, launchOfferDisplay, launchWindowOpen, type LaunchOfferDisplay } from '../../../shared/launch-offer';
import { useBilling } from './billing';

const DISPLAY = launchOfferDisplay();
/** setTimeout's ceiling (about 24.8 days); a later boundary waits for a reload. */
const MAX_DELAY = 2 ** 31 - 1;

/** The next instant at which the window opens or closes, or null after it. */
export function nextLaunchBoundary(now: number): number | null {
  if (now < LAUNCH_OFFER.startsAt) return LAUNCH_OFFER.startsAt;
  if (now < LAUNCH_OFFER.endsBefore) return LAUNCH_OFFER.endsBefore;
  return null;
}

/** What the pages print about the launch price while it is on, else null. */
export function useLaunchOffer(): LaunchOfferDisplay | null {
  const billing = useBilling();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const boundary = nextLaunchBoundary(now);
    if (boundary === null) return;
    const delay = boundary - Date.now();
    if (delay > MAX_DELAY) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, delay));
    return () => clearTimeout(timer);
  }, [now]);
  return billing.launchOffer && launchWindowOpen(now) ? DISPLAY : null;
}
