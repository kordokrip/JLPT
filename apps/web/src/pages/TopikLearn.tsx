import { Check, Circle, Volume2 } from 'lucide-react';
import { TOPIK_FOUNDATION_UNITS } from '../features/topik/learning/content';
import { useTopikLearningProgress } from '../features/topik/learning/useTopikLearningProgress';
import { useKoreanAudio } from '../features/topik/useKoreanAudio';
import { useTranslation } from 'react-i18next';

export default function TopikLearn() {
  const { t } = useTranslation();
  const progress = useTopikLearningProgress();
  const audio = useKoreanAudio();

  return (
    <div className="app-page">
      <header className="mb-6 max-w-[800px]">
        <p className="text-sm font-bold text-[var(--accent)]">{t('topik.learn.eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-black">{t('topik.learn.title')}</h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">{t('topik.learn.description')}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {TOPIK_FOUNDATION_UNITS.map((unit) => {
          const complete = progress.completed.has(unit.id);
          return (
            <article key={unit.id} className="surface-panel p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold text-[var(--accent)]">{t('topik.learn.unit', { order: unit.order })}</p><h2 className="mt-1 text-xl font-black">{unit.titleKo}</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">{unit.titleEn}</p></div>
                <button type="button" aria-pressed={complete} onClick={() => void progress.toggle(unit.id)} className={`touch-target inline-flex items-center justify-center rounded-[var(--radius-md)] border ${complete ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)]'}`} title={complete ? t('topik.learn.markIncomplete') : t('topik.learn.markComplete')} aria-label={complete ? t('topik.learn.markIncomplete') : t('topik.learn.markComplete')}>
                  {complete ? <Check aria-hidden="true" size={19} /> : <Circle aria-hidden="true" size={19} />}
                </button>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">{unit.objectiveEn}</p>
              <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {unit.expressions.map((expression) => (
                  <li key={expression.ko} className="flex items-center gap-3 py-3">
                    <button type="button" onClick={() => audio.speakText(expression.ko)} className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-[var(--accent)]" aria-label={t('topik.learn.playExpression', { text: expression.ko })}>
                      <Volume2 aria-hidden="true" size={18} />
                    </button>
                    <span className="min-w-0"><span lang="ko" className="block font-bold">{expression.ko}</span><span className="mt-0.5 block text-sm text-[var(--muted-foreground)]">{expression.en}</span></span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
