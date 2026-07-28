import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BarChart3, BookOpenText, ClipboardCheck, ExternalLink, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDataScope } from '../hooks/useDataScope';
import { useTrackStatus } from '../hooks/useTrackStatus';
import { topikOfficialReferenceApi, topikPlacementApi } from '../lib/api';
import { useTopikLearningProgress } from '../features/topik/learning/useTopikLearningProgress';
import { LearningTrackSwitch } from '../components/feature/LearningTrackSwitch';

export default function TopikDashboard() {
  const { t } = useTranslation();
  const scope = useDataScope();
  const { status, isLoading: statusLoading } = useTrackStatus();
  const progress = useTopikLearningProgress();
  const latest = useQuery({
    queryKey: ['topik-placement-latest', scope],
    queryFn: async () => {
      const result = await topikPlacementApi.latest();
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    retry: false,
  });
  const officialReference = useQuery({
    queryKey: ['topik-official-reference'],
    queryFn: async () => {
      const result = await topikOfficialReferenceApi.get();
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
    retry: false,
  });
  const available = status?.track === 'topik-ko' && status.content_release !== 'foundation-only';

  return (
    <div className="app-page">
      <header className="mb-6 max-w-[800px]">
        <p className="text-sm font-bold text-[var(--accent)]">{t('topik.dashboard.eyebrow')}</p>
        <h1 className="mt-2 break-keep text-3xl font-black sm:text-4xl">{t('topik.dashboard.title')}</h1>
        <p className="mt-4 leading-7 text-[var(--muted-foreground)]">{t('topik.dashboard.description')}</p>
      </header>

      <LearningTrackSwitch />

      {!statusLoading && !available && (
        <section className="mb-6 border-l-4 border-[var(--accent)] bg-[var(--surface-alt)] p-5">
          <h2 className="font-bold">{t('topik.dashboard.releasePendingTitle')}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{t('topik.dashboard.releasePendingDescription')}</p>
        </section>
      )}

      <div className="adaptive-grid" data-cols="3">
        <ActionPanel icon={ClipboardCheck} title={t('topik.dashboard.placementTitle')} description={latest.data ? t('topik.dashboard.placementLatest', { score: latest.data.score_total }) : t('topik.dashboard.placementReady')} to="/track/topik-ko/placement" disabled={!available} />
        <ActionPanel icon={BookOpenText} title={t('topik.dashboard.lessonsTitle')} description={t('topik.dashboard.lessonsDescription', { completed: progress.completedCount, total: 6 })} to="/track/topik-ko/learn" />
        <ActionPanel icon={RotateCcw} title={t('topik.dashboard.reviewTitle')} description={t('topik.dashboard.reviewDescription')} to="/track/topik-ko/review" />
      </div>

      <section className="mt-7 max-w-[800px] border-t border-[var(--border)] pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold">{t('topik.dashboard.currentPlacement')}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{latest.data ? t('topik.dashboard.placementSummary', { band: latest.data.result_band, listening: latest.data.score_listening, reading: latest.data.score_reading }) : t('topik.dashboard.noPlacement')}</p>
          </div>
          <Link to="/track/topik-ko/progress" className="touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-bold">
            {t('topik.dashboard.progress')} <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </section>

      {officialReference.data && (
        <section className="mt-7 max-w-[800px] border-t border-[var(--border)] pt-6" aria-labelledby="topik-official-reference">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <BarChart3 aria-hidden="true" className="mt-1 shrink-0 text-[var(--accent)]" size={20} />
              <div>
                <h2 id="topik-official-reference" className="font-bold">{t('topik.dashboard.officialTitle')}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">{t('topik.dashboard.officialDescription')}</p>
              </div>
            </div>
            <a
              href={officialReference.data.source.source_url}
              target="_blank"
              rel="noreferrer"
              className="touch-target inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[var(--accent)]"
            >
              {t('topik.dashboard.officialSource')} <ExternalLink aria-hidden="true" size={15} />
            </a>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(['TOPIK-I', 'TOPIK-II'] as const).map((examLevel) => {
              const format = officialReference.data.blueprints.filter((blueprint) => blueprint.exam_level === examLevel);
              const total = officialReference.data.applicant_totals.find((item) => item.exam_level === examLevel)?.applicants ?? 0;
              const first = format[0];
              if (!first) return null;
              return (
                <article key={examLevel} className="surface-panel p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-black">{examLevel.replace('-', ' ')}</h3>
                    <span className="text-sm text-[var(--muted-foreground)]">{t('topik.dashboard.levels', { min: first.grade_min, max: first.grade_max })}</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    {format.map((blueprint) => (
                      <li key={`${blueprint.exam_level}-${blueprint.section}`} className="flex items-center justify-between gap-3">
                        <span>{t(`topik.sections.${blueprint.section}`)}</span>
                        <span className="font-bold tabular-nums">{blueprint.question_count}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted-foreground)]">
                    {t('topik.dashboard.applicants', { count: new Intl.NumberFormat().format(total) })}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function ActionPanel({ icon: Icon, title, description, to, disabled = false }: { icon: typeof ClipboardCheck; title: string; description: string; to: string; disabled?: boolean }) {
  const content = <><Icon aria-hidden="true" className="text-[var(--accent)]" /><h2 className="mt-5 text-lg font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p></>;
  if (disabled) return <div aria-disabled="true" className="surface-panel min-h-48 p-5 opacity-60">{content}</div>;
  return <Link to={to} className="surface-panel min-h-48 p-5 transition-colors hover:border-[var(--accent)]">{content}</Link>;
}
