import type { StreakData } from './types';

export function formatDayCount(value: number | undefined, dayUnit: string): string {
  return value === undefined ? '—' : `${value}${dayUnit}`;
}

export function hasLastStudyDate(data: StreakData | undefined): data is StreakData & { lastStudyDate: string } {
  return Boolean(data?.lastStudyDate);
}
