/**
 * apps/web/src/components/feature/StreakBadge.tsx
 *
 * 학습 스트릭 배지 — 홈 화면 상단 표시용
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { logsApi } from '../../lib/api';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDays:     number;
  lastStudyDate: string | null;
  frozen:        boolean;
}

async function fetchStreak(): Promise<StreakData> {
  const res = await logsApi.streak();
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

export function StreakBadge() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<StreakData>({
    queryKey: ['streak'],
    queryFn:  fetchStreak,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) return null;
  if (data.currentStreak === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-sm font-medium text-red-700 select-none">
      <span
        className="w-2 h-2 rounded-full bg-red-600 animate-pulse"
        aria-hidden="true"
      />
      <span>
        {t('stats.streakBadge', { count: data.currentStreak })}
      </span>
      {data.frozen && (
        <span className="ml-1 text-xs text-red-400">({t('stats.frozen')})</span>
      )}
    </div>
  );
}
