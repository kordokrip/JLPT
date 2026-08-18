import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTopikOwnerCurriculumProgress } from '../features/topik/curriculum/useTopikOwnerCurriculumProgress';
import { useDataScope } from '../hooks/useDataScope';
import { topikPlacementApi } from '../lib/api';
import { useTranslation } from 'react-i18next';

export default function TopikProgress() {
  const { t } = useTranslation();
  const scope = useDataScope();
  const curriculumProgress = useTopikOwnerCurriculumProgress(scope);
  const latest = useQuery({ queryKey: ['topik-placement-latest', scope], queryFn: async () => { const result = await topikPlacementApi.latest(); if (!result.ok) throw new Error(result.message); return result.data; }, retry: false });
  const totalItems = curriculumProgress.data?.grades.reduce((total, grade) => total + grade.total_items, 0) ?? 0;
  const completedItems = curriculumProgress.data?.grades.reduce((total, grade) => total + grade.completed_items, 0) ?? 0;
  const dueCards = curriculumProgress.data?.grades.reduce((total, grade) => total + grade.due_cards, 0) ?? 0;
  const unitPercent = totalItems > 0 ? Math.round(completedItems / totalItems * 100) : 0;
  return (
    <div className="app-page max-w-[800px]">
      <p className="text-sm font-bold text-[var(--accent)]">{t('topik.progress.eyebrow')}</p>
      <h1 className="mt-2 text-3xl font-black">{t('topik.progress.title')}</h1>
      <p className="mt-3 leading-7 text-[var(--muted-foreground)]">{t('topik.progress.description')}</p>
      <section className="mt-7 border-y border-[var(--border)] py-6">
        <div className="flex items-end justify-between"><h2 className="font-bold">TOPIK 1–6 자체 저작 학습</h2><strong className="text-2xl text-[var(--accent)]">{unitPercent}%</strong></div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full bg-[var(--accent)]" style={{ width: `${unitPercent}%` }} /></div>
        {curriculumProgress.isLoading ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">진행률을 불러오는 중입니다.</p> : <p className="mt-2 text-sm text-[var(--muted-foreground)]">{completedItems}/{totalItems}개 학습 완료 · 오늘 복습 {dueCards}개</p>}
        {curriculumProgress.isError && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{curriculumProgress.error.message}</p>}
      </section>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="급수별 진행률">
        {curriculumProgress.data?.grades.map((grade) => {
          const percent = grade.total_items > 0 ? Math.round(grade.completed_items / grade.total_items * 100) : 0;
          return <Link key={grade.target_grade} to="/track/topik-ko/learn" className="surface-panel p-4 hover:border-[var(--accent)]"><div className="flex items-center justify-between"><strong>{grade.target_grade}급</strong><span className="text-sm font-bold text-[var(--accent)]">{percent}%</span></div><p className="mt-2 text-sm text-[var(--muted-foreground)]">{grade.completed_items}/{grade.total_items} 완료 · 복습 {grade.due_cards}개</p></Link>;
        })}
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
