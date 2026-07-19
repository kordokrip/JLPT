import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { TOPIK_FOUNDATION_UNITS } from '../features/topik/learning/content';
import { useTopikLearningProgress } from '../features/topik/learning/useTopikLearningProgress';
import { useDataScope } from '../hooks/useDataScope';
import { topikPlacementApi } from '../lib/api';
import { useTranslation } from 'react-i18next';

export default function TopikProgress() {
  const { t } = useTranslation();
  const scope = useDataScope();
  const progress = useTopikLearningProgress();
  const latest = useQuery({ queryKey: ['topik-placement-latest', scope], queryFn: async () => { const result = await topikPlacementApi.latest(); if (!result.ok) throw new Error(result.message); return result.data; }, retry: false });
  const unitPercent = Math.round(progress.completedCount / TOPIK_FOUNDATION_UNITS.length * 100);
  return (
    <div className="app-page max-w-[800px]">
      <p className="text-sm font-bold text-[var(--accent)]">{t('topik.progress.eyebrow')}</p>
      <h1 className="mt-2 text-3xl font-black">{t('topik.progress.title')}</h1>
      <p className="mt-3 leading-7 text-[var(--muted-foreground)]">{t('topik.progress.description')}</p>
      <section className="mt-7 border-y border-[var(--border)] py-6">
        <div className="flex items-end justify-between"><h2 className="font-bold">{t('topik.progress.units')}</h2><strong className="text-2xl text-[var(--accent)]">{unitPercent}%</strong></div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full bg-[var(--accent)]" style={{ width: `${unitPercent}%` }} /></div>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t('topik.progress.unitsComplete', { completed: progress.completedCount, total: TOPIK_FOUNDATION_UNITS.length })}</p>
      </section>
      <section className="mt-6 grid grid-cols-3 gap-2">
        <Metric label={t('topik.placement.scoreTotal')} value={latest.data?.score_total} />
        <Metric label={t('topik.placement.scoreListening')} value={latest.data?.score_listening} />
        <Metric label={t('topik.placement.scoreReading')} value={latest.data?.score_reading} />
      </section>
      {!latest.data && <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t('topik.progress.noPlacement')}</p>}
      <Link to="/track/topik-ko/placement" className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--border)] px-4 font-bold">{t('topik.progress.openPlacement')}</Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | undefined }) {
  return <div className="surface-panel p-4 text-center"><div className="text-2xl font-black text-[var(--accent)]">{value === undefined ? '—' : `${value}%`}</div><div className="mt-1 text-xs text-[var(--muted-foreground)]">{label}</div></div>;
}
