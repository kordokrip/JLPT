import { useQuery } from '@tanstack/react-query';
import { BookOpenText, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TOPIK_FOUNDATION_UNITS } from '../features/topik/learning/content';
import { useTopikLearningProgress } from '../features/topik/learning/useTopikLearningProgress';
import { useDataScope } from '../hooks/useDataScope';
import { topikPlacementApi } from '../lib/api';
import { useSettingsStore } from '../stores/settings-store';
import { useTranslation } from 'react-i18next';

export default function TopikReview() {
  const { t } = useTranslation();
  const scope = useDataScope();
  const configuredInstructionLanguage = useSettingsStore((state) => state.instructionLanguages['topik-ko']);
  const instructionLanguage = configuredInstructionLanguage === 'ko' ? 'ko' : 'en';
  const progress = useTopikLearningProgress();
  const mistakes = useQuery({
    queryKey: ['topik-placement-review', scope],
    queryFn: async () => { const result = await topikPlacementApi.review(); if (!result.ok) throw new Error(result.message); return result.data; },
    retry: false,
  });
  const incomplete = TOPIK_FOUNDATION_UNITS.filter((unit) => !progress.completed.has(unit.id));

  return (
    <div className="app-page max-w-[800px]">
      <p className="text-sm font-bold text-[var(--accent)]">{t('topik.review.eyebrow')}</p>
      <h1 className="mt-2 text-3xl font-black">{t('topik.review.title')}</h1>
      <p className="mt-3 leading-7 text-[var(--muted-foreground)]">{t('topik.review.description')}</p>

      <section className="mt-7">
        <h2 className="font-black">{t('topik.review.mistakes')}</h2>
        <div className="mt-3 grid gap-3">
          {mistakes.isLoading && <p className="text-sm text-[var(--muted-foreground)]">{t('topik.review.loading')}</p>}
          {mistakes.data?.map((item) => (
            <article key={item.question_id} className="surface-panel p-5">
              <p className="text-xs font-bold uppercase text-[var(--accent)]">{item.section}</p>
              <h3 className="mt-2 font-bold leading-7">{instructionLanguage === 'ko' ? item.prompt_ko : item.prompt_en}</h3>
              <div className="mt-3 grid gap-2 text-sm">
                <p className="text-red-700 dark:text-red-300">{t('topik.review.yourAnswer', { answer: item.choices[item.selected_index] })}</p>
                <p className="text-[var(--success)]">{t('topik.review.correctAnswer', { answer: item.choices[item.answer_index] })}</p>
              </div>
              <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm leading-6 text-[var(--muted-foreground)]">{instructionLanguage === 'ko' ? item.explanation_ko : item.explanation_en}</p>
            </article>
          ))}
          {!mistakes.isLoading && mistakes.data?.length === 0 && <div className="surface-panel p-5"><p className="font-bold">{t('topik.review.noMistakes')}</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">{t('topik.review.noMistakesDescription')}</p></div>}
        </div>
      </section>

      <section className="mt-8 border-t border-[var(--border)] pt-6">
        <h2 className="font-black">{t('topik.review.unfinished')}</h2>
        <div className="mt-3 grid gap-3">
          {incomplete.length > 0 ? incomplete.map((unit) => (
            <Link key={unit.id} to="/track/topik-ko/learn" className="surface-panel flex items-center gap-4 p-4 hover:border-[var(--accent)]">
              <BookOpenText aria-hidden="true" className="text-[var(--accent)]" />
              <span><span className="block font-bold">{unit.titleKo}</span><span className="text-sm text-[var(--muted-foreground)]">{unit.titleEn}</span></span>
            </Link>
          )) : <p className="text-sm text-[var(--muted-foreground)]">{t('topik.review.allComplete')}</p>}
        </div>
      </section>
      <Link to="/track/topik-ko/placement" className="mt-6 touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-5 font-bold text-white"><ClipboardCheck aria-hidden="true" size={18} /> {t('topik.review.openPlacement')}</Link>
    </div>
  );
}
