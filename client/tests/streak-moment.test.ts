import { describe, expect, it } from 'vitest';
import {
  STREAK_MILESTONE_DAYS,
  dayUnitKey,
  streakAtRisk,
  streakMomentFor,
} from '../src/lib/streakMoment';
import type { UserStats } from '../src/lib/supabase';

const stats = (over: Partial<UserStats>): UserStats => ({
  id: 'row',
  user_id: 'user-1',
  email: null,
  name: null,
  picture: null,
  total_quizzes: 1,
  total_correct: 1,
  total_questions: 1,
  current_streak: 0,
  longest_streak: 0,
  last_quiz_date: null,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  ...over,
});

describe('streakMomentFor', () => {
  it('announces an extension when the day count moved', () => {
    expect(streakMomentFor(stats({ current_streak: 1 }), stats({ current_streak: 2 })))
      .toEqual({ kind: 'extended', days: 2 });
  });

  it('says nothing for a second session on the same day', () => {
    expect(streakMomentFor(stats({ current_streak: 4 }), stats({ current_streak: 4 }))).toBeNull();
  });

  it('says nothing when the streak reset', () => {
    expect(streakMomentFor(stats({ current_streak: 9 }), stats({ current_streak: 1 }))).toBeNull();
  });

  it('marks the seventh day once, and calls the eighth an ordinary extension', () => {
    expect(streakMomentFor(stats({ current_streak: 6 }), stats({ current_streak: 7 })))
      .toEqual({ kind: 'milestone', days: STREAK_MILESTONE_DAYS });
    expect(streakMomentFor(stats({ current_streak: 7 }), stats({ current_streak: 8 })))
      .toEqual({ kind: 'extended', days: 8 });
  });

  it('marks the crossing even when a protection bridged the gap', () => {
    expect(streakMomentFor(stats({ current_streak: 5 }), stats({ current_streak: 9 })))
      .toEqual({ kind: 'milestone', days: 9 });
  });

  it('stays silent rather than guessing when the previous streak is unknown', () => {
    // An unwarmed cache must not turn a learner on day forty into a
    // seven-day milestone.
    expect(streakMomentFor(null, stats({ current_streak: 40 }))).toBeNull();
    expect(streakMomentFor(stats({ current_streak: 2 }), null)).toBeNull();
  });
});

describe('streakAtRisk', () => {
  const now = new Date('2026-09-16T09:00:00.000Z');

  it('is true when the last recorded day was yesterday', () => {
    expect(streakAtRisk(stats({ current_streak: 6, last_quiz_date: '2026-09-15' }), now)).toBe(true);
  });

  it('is false once today has been recorded', () => {
    expect(streakAtRisk(stats({ current_streak: 7, last_quiz_date: '2026-09-16' }), now)).toBe(false);
  });

  it('is false two days out, where the server has already decided', () => {
    expect(streakAtRisk(stats({ current_streak: 6, last_quiz_date: '2026-09-14' }), now)).toBe(false);
  });

  it('is false with no streak, no date or an unparseable one', () => {
    expect(streakAtRisk(stats({ current_streak: 0, last_quiz_date: '2026-09-15' }), now)).toBe(false);
    expect(streakAtRisk(stats({ current_streak: 6, last_quiz_date: null }), now)).toBe(false);
    expect(streakAtRisk(stats({ current_streak: 6, last_quiz_date: 'not-a-date' }), now)).toBe(false);
    expect(streakAtRisk(null, now)).toBe(false);
  });

  it('counts the day in UTC, the way the server does', () => {
    // 23:30 in Prague on the 16th is already the 16th in UTC, so a streak last
    // recorded on the 15th is still standing on yesterday either way.
    const lateEvening = new Date('2026-09-16T21:30:00.000Z');
    expect(streakAtRisk(stats({ current_streak: 3, last_quiz_date: '2026-09-15' }), lateEvening)).toBe(true);
    // Just past UTC midnight the 15th is two days back and the decision is the
    // server's, not this warning's.
    const justAfterMidnight = new Date('2026-09-17T00:10:00.000Z');
    expect(streakAtRisk(stats({ current_streak: 3, last_quiz_date: '2026-09-15' }), justAfterMidnight)).toBe(false);
  });
});

describe('dayUnitKey', () => {
  it('has two forms in English', () => {
    expect(dayUnitKey(1, 'en')).toBe('profile.day');
    expect(dayUnitKey(2, 'en')).toBe('profile.days');
    expect(dayUnitKey(11, 'en')).toBe('profile.days');
  });

  it('has three in Czech — den, dny, dní', () => {
    expect(dayUnitKey(1, 'cs')).toBe('profile.day');
    expect(dayUnitKey(3, 'cs')).toBe('profile.daysFew');
    expect(dayUnitKey(4, 'cs')).toBe('profile.daysFew');
    expect(dayUnitKey(5, 'cs')).toBe('profile.days');
    expect(dayUnitKey(0, 'cs')).toBe('profile.days');
  });
});
