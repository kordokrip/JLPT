/**
 * apps/web/src/pages/Stats.tsx
 *
 * 학습 통계 페이지 (/stats)
 *   - 스트릭 카드 (현재/최장/총 일수)
 *   - GitHub 스타일 히트맵
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Heatmap } from '../components/feature/Heatmap.js';
import { logsApi } from '../lib/api';

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

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-[var(--border)] shadow-sm min-w-[100px]">
      <span className="text-2xl font-bold text-foreground tabular-nums">{value}</span>
      <span className="text-xs text-[var(--muted-foreground)] mt-0.5">{label}</span>
      {sub && <span className="text-xs text-red-600 mt-0.5">{sub}</span>}
    </div>
  );
}

export default function Stats() {
  const { t } = useTranslation();
  const { data, isError } = useQuery<StreakData>({
    queryKey:  ['streak'],
    queryFn:   fetchStreak,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-xl font-bold text-foreground">{t('stats.title')}</h1>

      <section>
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
          {t('stats.streak')}
        </h2>
        <div className="flex flex-wrap gap-3">
          <StatCard
            label={t('stats.currentStreak')}
            value={data ? `${data.currentStreak}${t('stats.dayUnit')}` : '—'}
            sub={data?.frozen ? t('stats.frozen') : undefined}
          />
          <StatCard
            label={t('stats.longestStreak')}
            value={data ? `${data.longestStreak}${t('stats.dayUnit')}` : '—'}
          />
          <StatCard
            label={t('stats.totalDays')}
            value={data ? `${data.totalDays}${t('stats.dayUnit')}` : '—'}
          />
          {data?.lastStudyDate && (
            <StatCard
              label={t('stats.lastStudyDate')}
              value={data.lastStudyDate}
            />
          )}
        </div>
        {isError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {t('stats.loadError')}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
          {t('stats.heatmap')}
        </h2>
        <div className="p-4 rounded-xl bg-card border border-[var(--border)] shadow-sm overflow-hidden">
          <Heatmap />
        </div>
      </section>
    </main>
  );
}
