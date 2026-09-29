import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { StreakCard } from '../src/components/Profile';
import type { UserStats } from '../src/lib/supabase';
import { liveStreak, type StreakProtection } from '../src/lib/streakFreezes';
import { server } from './mocks/server';

// The streak the Profile shows follows the server's rule on return
// (record_verified_quiz_result_v2): shielded days are paid for, every other
// missed day needs one of the month's protections, and more than two missed
// days end the streak.
const at = (iso: string) => Date.parse(iso);
const stats = (lastQuizDate: string, currentStreak = 12) => ({ current_streak: currentStreak, last_quiz_date: lastQuizDate });
const none = { remaining: 0, shieldUntil: null };

describe('liveStreak', () => {
  it('keeps the streak when the last quiz was today or yesterday', () => {
    expect(liveStreak(stats('2026-09-29'), none, at('2026-09-29T23:59:00Z'))).toBe(12);
    expect(liveStreak(stats('2026-09-28'), none, at('2026-09-29T00:01:00Z'))).toBe(12);
    // Before the protection state has loaded, the same two days count.
    expect(liveStreak(stats('2026-09-28'), null, at('2026-09-29T12:00:00Z'))).toBe(12);
  });

  it('ends it after a missed day nothing covers', () => {
    expect(liveStreak(stats('2026-09-27'), none, at('2026-09-29T12:00:00Z'))).toBe(0);
    expect(liveStreak(stats('2026-09-27'), null, at('2026-09-29T12:00:00Z'))).toBe(0);
  });

  it('keeps it two days on when a shield covers the missed day', () => {
    // Raised on the 27th at 20:00: the window runs to the 29th at 20:00.
    const shield = { remaining: 0, shieldUntil: '2026-09-29T20:00:00Z' };
    expect(liveStreak(stats('2026-09-27'), shield, at('2026-09-29T12:00:00Z'))).toBe(12);
  });

  it('keeps it two days on when one protection is left for the missed day', () => {
    expect(liveStreak(stats('2026-09-27'), { remaining: 1, shieldUntil: null }, at('2026-09-29T12:00:00Z'))).toBe(12);
  });

  it('ends it when the gap is longer than the protections can bridge', () => {
    // Four days on, three days were missed: more than two ends it even with two left.
    expect(liveStreak(stats('2026-09-25'), { remaining: 2, shieldUntil: null }, at('2026-09-29T12:00:00Z'))).toBe(0);
    // Two missed days and one protection left.
    expect(liveStreak(stats('2026-09-26'), { remaining: 1, shieldUntil: null }, at('2026-09-29T12:00:00Z'))).toBe(0);
    expect(liveStreak(stats('2026-09-26'), { remaining: 2, shieldUntil: null }, at('2026-09-29T12:00:00Z'))).toBe(12);
  });

  it('spends a protection only on the days a shield does not cover', () => {
    // Shield 21st 10:00 to 23rd 10:00 covers the 21st, 22nd and 23rd; the 24th
    // needs the one protection left.
    const shield = { remaining: 1, shieldUntil: '2026-09-23T10:00:00Z' };
    expect(liveStreak(stats('2026-09-20'), shield, at('2026-09-25T08:00:00Z'))).toBe(12);
    expect(liveStreak(stats('2026-09-20'), { ...shield, remaining: 0 }, at('2026-09-25T08:00:00Z'))).toBe(0);
  });

  it('counts days across a month boundary in UTC', () => {
    // 31 August, then 2 September: 1 September was missed, and September's
    // budget is the one the server spends.
    expect(liveStreak(stats('2026-08-31'), { remaining: 2, shieldUntil: null }, at('2026-09-02T00:30:00Z'))).toBe(12);
    expect(liveStreak(stats('2026-08-30'), { remaining: 2, shieldUntil: null }, at('2026-09-02T23:30:00Z'))).toBe(12);
    expect(liveStreak(stats('2026-08-30'), { remaining: 1, shieldUntil: null }, at('2026-09-02T23:30:00Z'))).toBe(0);
    expect(liveStreak(stats('2026-08-31'), none, at('2026-09-01T00:00:00Z'))).toBe(12);
  });

  it('shows no streak without a recorded one', () => {
    expect(liveStreak(null, none, at('2026-09-29T12:00:00Z'))).toBe(0);
    expect(liveStreak({ current_streak: 0, last_quiz_date: '2026-09-29' }, none, at('2026-09-29T12:00:00Z'))).toBe(0);
    expect(liveStreak({ current_streak: 5, last_quiz_date: null }, none, at('2026-09-29T12:00:00Z'))).toBe(0);
  });
});

// The Profile's streak card, reading the protection state the server returns.
const utcDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
const account = (streak: number, lastQuizDaysAgo: number | null): UserStats => ({
  id: 'stats-1', user_id: 'user-1', email: null, name: null, picture: null,
  total_quizzes: 20, total_correct: 150, total_questions: 200,
  current_streak: streak, longest_streak: Math.max(streak, 20),
  last_quiz_date: lastQuizDaysAgo === null ? null : utcDate(lastQuizDaysAgo),
  created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z',
});
const protectionIs = (state: Partial<StreakProtection>) =>
  server.use(http.get('*/api/user/freezes', () => HttpResponse.json({
    remaining: 2, period: new Date().toISOString().slice(0, 7), used: [], shieldUntil: null, shieldSupported: true, ...state,
  })));
const currentStreak = () => within(screen.getByRole('group', { name: 'Current streak' }));

describe('the Profile streak card', () => {
  it('keeps the count a protection still covers, and offers the shield', async () => {
    protectionIs({ remaining: 1 });
    render(<LanguageProvider><StreakCard stats={account(12, 2)} /></LanguageProvider>);
    expect(await currentStreak().findByRole('button', { name: 'Protect for 48 h' })).toBeVisible();
    expect(currentStreak().getByText('12')).toBeVisible();
  });

  it('shows 0 once nothing covers the gap, and offers no shield', async () => {
    protectionIs({ remaining: 0 });
    render(<LanguageProvider><StreakCard stats={account(12, 3)} /></LanguageProvider>);
    expect(await currentStreak().findByText('No protection left this month')).toBeVisible();
    expect(currentStreak().getByText('0')).toBeVisible();
  });

  it('does not offer a brand-new account a shield it has nothing to protect with', async () => {
    let asked = 0;
    server.use(http.get('*/api/user/freezes', () => {
      asked += 1;
      return HttpResponse.json({ remaining: 2, period: '2026-09', used: [], shieldUntil: null, shieldSupported: true });
    }));
    render(<LanguageProvider><StreakCard stats={account(0, null)} /></LanguageProvider>);
    await vi.waitFor(() => expect(asked).toBe(1));
    expect(currentStreak().getByText('0')).toBeVisible();
    expect(currentStreak().queryByRole('button', { name: 'Protect for 48 h' })).toBeNull();
  });

  it('still shows a shield that is already running', async () => {
    protectionIs({ remaining: 1, shieldUntil: new Date(Date.now() + 30 * 3_600_000).toISOString() });
    render(<LanguageProvider><StreakCard stats={account(0, null)} /></LanguageProvider>);
    expect(await currentStreak().findByText(/^Protected · \d+ h \d+ m left$/)).toBeVisible();
  });
});
