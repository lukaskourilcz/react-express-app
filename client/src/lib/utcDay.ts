// When "today" ends, on the learner's own clock.
//
// The server counts days in UTC: a streak day, the daily challenge, Today's
// target and the days behind mastery all change at 00:00 UTC, whatever the
// learner's time zone. The screens that talk about "today" say when that is
// locally, so a learner in Prague knows the day changes at 02:00 (01:00 in
// winter) and one in New York at 20:00 the evening before.

import { useState } from 'react';

const DAY_MS = 86_400_000;

/** The instant the next UTC day begins, in epoch milliseconds. */
export function nextUtcDayStart(now: number = Date.now()): number {
  return (Math.floor(now / DAY_MS) + 1) * DAY_MS;
}

/**
 * The local time at which the next UTC day begins, such as "02:00" or
 * "8:00 PM": the browser's time zone and its locale's 12- or 24-hour clock.
 * `locale` and `timeZone` exist for tests; the app leaves both to the browser.
 */
export function localDayChangeTime(
  now: number = Date.now(),
  options: { locale?: string; timeZone?: string } = {},
): string {
  return new Intl.DateTimeFormat(options.locale, { timeStyle: 'short', timeZone: options.timeZone })
    .format(nextUtcDayStart(now));
}

/** `localDayChangeTime()`, read once when the component mounts. The local time
 * of 00:00 UTC moves only with a daylight-saving change, so a screen left open
 * has no reason to recompute it. */
export function useDayChangeTime(): string {
  const [time] = useState(() => localDayChangeTime());
  return time;
}
