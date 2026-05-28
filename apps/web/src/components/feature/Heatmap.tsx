/**
 * apps/web/src/components/feature/Heatmap.tsx
 *
 * GitHub 스타일 학습 히트맵 (7행 × 53주 그리드)
 *
 * intensity 색상 팔레트 (와비사비 레드):
 *   0 → #ECECE8 (empty / off)
 *   1 → #FBEAE8
 *   2 → #F5C5C0
 *   3 → #E08278
 *   4 → #C8332B (max)
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { logsApi } from '../../lib/api';

interface DayData {
  count:     number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

type HeatmapData = Record<string, DayData>;

const INTENSITY_COLORS: Record<number, string> = {
  0: '#ECECE8',
  1: '#FBEAE8',
  2: '#F5C5C0',
  3: '#E08278',
  4: '#C8332B',
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function isoWeeks(year: number): string[][] {
  // year の1月1日の曜日 (0=日)
  const jan1 = new Date(year, 0, 1);
  // 全週を7列 (日→土) で構築
  const weeks: string[][] = [];
  // 最初の日曜を探す (前年末から始めることもある)
  const start = new Date(jan1);
  start.setDate(jan1.getDate() - jan1.getDay()); // 直前の日曜へ

  const end = new Date(year, 11, 31);
  // 最後の土曜を探す
  end.setDate(end.getDate() + (6 - end.getDay()));

  let cursor = new Date(start);
  while (cursor <= end) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

async function fetchHeatmap(year: number): Promise<HeatmapData> {
  const res = await logsApi.heatmap(year);
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

export function Heatmap({ year: initialYear }: { year?: number }) {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(initialYear ?? currentYear);
  const locale = i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'en' ? 'en-US' : 'ko-KR';
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });

  const { data = {}, isLoading } = useQuery<HeatmapData>({
    queryKey:  ['heatmap', year],
    queryFn:   () => fetchHeatmap(year),
    staleTime: 5 * 60 * 1000,
  });

  const weeks = isoWeeks(year);

  // 月ラベルの位置計算 (列インデックス)
  const monthPositions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
      const month = new Date(week[0]!).getMonth();
      if (month !== lastMonth) {
        monthPositions.push({ label: monthFormatter.format(new Date(year, month, 1)), col });
        lastMonth = month;
    }
  });

  const [tooltip, setTooltip] = useState<{ date: string; count: number } | null>(null);

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-max">
        {/* 月ラベル行 */}
        <div className="relative h-5 mb-1" style={{ paddingLeft: '24px' }}>
          {monthPositions.map(({ label, col }) => (
            <span
              key={`${label}-${col}`}
              className="absolute text-xs text-stone-400"
              style={{ left: `${24 + col * 13}px` }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex gap-0.5">
          {/* 曜日ラベル */}
          <div className="flex flex-col gap-0.5 mr-1 pt-0">
            {DAY_KEYS.map((d, i) => (
              <span key={d} className={`text-xs text-stone-400 leading-none h-3 ${i % 2 === 0 ? 'opacity-0' : ''}`}>
                {t(`common.days.${d}`).slice(0, 1)}
              </span>
            ))}
          </div>

          {/* グリッド */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((date) => {
                const day  = data[date];
                const intensity = day?.intensity ?? 0;
                const count     = day?.count     ?? 0;
                const isCurrentYear = date.startsWith(String(year));
                return (
                  <div
                    key={date}
                    className="w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-125 relative"
                    style={{
                      backgroundColor: isCurrentYear ? INTENSITY_COLORS[intensity] : '#F5F5F0',
                    }}
                    onMouseEnter={() => setTooltip({ date, count })}
                    onMouseLeave={() => setTooltip(null)}
                    aria-label={count > 0 ? `${date}: ${t('stats.studiedCount', { count })}` : date}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* ツールチップ */}
        {tooltip && (
          <div className="mt-2 text-xs text-stone-500">
            {tooltip.date}: {tooltip.count > 0 ? t('stats.studiedCount', { count: tooltip.count }) : t('stats.noStudy')}
          </div>
        )}

        {/* 凡例 */}
        <div className="flex items-center gap-1.5 mt-2 ml-6">
          <span className="text-xs text-stone-400">{t('stats.less')}</span>
          {([0, 1, 2, 3, 4] as const).map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: INTENSITY_COLORS[i] }}
              aria-hidden="true"
            />
          ))}
          <span className="text-xs text-stone-400">{t('stats.more')}</span>
        </div>
      </div>

      {/* 年選択 */}
      <div className="flex items-center gap-2 mt-3">
        <button
          className="text-xs px-2 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          onClick={() => setYear((y) => y - 1)}
          disabled={year <= currentYear - 3}
        >
          ← {year - 1}
        </button>
        <span className="text-sm font-medium text-stone-700">{year}</span>
        <button
          className="text-xs px-2 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          onClick={() => setYear((y) => y + 1)}
          disabled={year >= currentYear}
        >
          {year + 1} →
        </button>
      </div>

      {isLoading && (
        <div className="text-xs text-stone-400 mt-2">{t('common.loading')}</div>
      )}
    </div>
  );
}
