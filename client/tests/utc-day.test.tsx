// Days are UTC days on the server (the streak, the daily challenge, Today's
// target, mastery). The screens that say "today" also say when the day ends
// on the learner's own clock, from lib/utcDay.ts.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { DayChangeNote } from '../src/components/DayChangeNote';
import { localDayChangeTime, nextUtcDayStart } from '../src/lib/utcDay';

const at = (iso: string) => Date.parse(iso);
/** Intl puts a narrow no-break space before AM/PM; compare plain spaces. */
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('nextUtcDayStart', () => {
  it('is the next 00:00 UTC', () => {
    expect(nextUtcDayStart(at('2026-09-29T23:59:59Z'))).toBe(at('2026-09-30T00:00:00Z'));
    expect(nextUtcDayStart(at('2026-09-29T00:00:00Z'))).toBe(at('2026-09-30T00:00:00Z'));
    expect(nextUtcDayStart(at('2026-12-31T12:00:00Z'))).toBe(at('2027-01-01T00:00:00Z'));
  });
});

describe('localDayChangeTime', () => {
  it('names 00:00 UTC on the learner’s clock, daylight saving included', () => {
    expect(localDayChangeTime(at('2026-09-29T12:00:00Z'), { locale: 'en-GB', timeZone: 'Europe/Prague' })).toBe('02:00');
    expect(localDayChangeTime(at('2026-12-01T12:00:00Z'), { locale: 'en-GB', timeZone: 'Europe/Prague' })).toBe('01:00');
    expect(localDayChangeTime(at('2026-09-29T12:00:00Z'), { locale: 'en-GB', timeZone: 'Asia/Kolkata' })).toBe('05:30');
    expect(localDayChangeTime(at('2026-09-29T12:00:00Z'), { locale: 'en-GB', timeZone: 'UTC' })).toBe('00:00');
  });

  it('uses the locale’s 12- or 24-hour clock', () => {
    expect(plain(localDayChangeTime(at('2026-09-29T12:00:00Z'), { locale: 'en-US', timeZone: 'America/New_York' }))).toBe('8:00 PM');
    expect(localDayChangeTime(at('2026-09-29T12:00:00Z'), { locale: 'en-GB', timeZone: 'America/New_York' })).toBe('20:00');
  });

  it('is the change still ahead, even a minute before it', () => {
    expect(localDayChangeTime(at('2026-09-29T23:59:00Z'), { locale: 'en-GB', timeZone: 'Europe/Prague' })).toBe('02:00');
  });
});

describe('DayChangeNote', () => {
  it('says when the day changes, in the browser’s own time', () => {
    render(<LanguageProvider><DayChangeNote /></LanguageProvider>);
    expect(screen.getByText(`Days change at ${localDayChangeTime()} your time.`)).toBeVisible();
  });
});
