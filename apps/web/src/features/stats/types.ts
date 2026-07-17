export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  lastStudyDate: string | null;
  frozen: boolean;
}

export interface StatsViewProps {
  data: StreakData | undefined;
  isError: boolean;
}
