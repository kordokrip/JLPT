import { describe, expect, it } from 'vitest';
import { formatDayCount, hasLastStudyDate } from './logic';
import type { StreakData } from './types';

describe('Stats logic', () => {
  it('renders a stable placeholder while streak data is loading', () => {
    expect(formatDayCount(undefined, '일')).toBe('—');
    expect(formatDayCount(7, '일')).toBe('7일');
  });

  it('only exposes the last-study metric when the API provides a date', () => {
    const withoutDate: StreakData = {
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      lastStudyDate: null,
      frozen: false,
    };
    const withDate: StreakData = { ...withoutDate, lastStudyDate: '2026-07-17' };

    expect(hasLastStudyDate(withoutDate)).toBe(false);
    expect(hasLastStudyDate(withDate)).toBe(true);
  });
});
