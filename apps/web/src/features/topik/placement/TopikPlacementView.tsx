import { ArrowLeft, ArrowRight, CheckCircle2, Headphones, RotateCcw, Volume2 } from 'lucide-react';
import type { ReturnTypeOfUseTopikPlacement } from './types';
import { useKoreanAudio } from '../useKoreanAudio';
import { useTranslation } from 'react-i18next';

export function TopikPlacementView({ model }: { model: ReturnTypeOfUseTopikPlacement }) {
  const { t } = useTranslation();
  const audio = useKoreanAudio();

  if (model.result) return <ResultView model={model} />;

  if (!model.attempt) {
    return (
      <div className="app-page max-w-[800px]">
        <header className="mb-8">
          <p className="text-sm font-bold text-[var(--accent)]">{t('topik.placement.eyebrow')}</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{t('topik.placement.title')}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[var(--muted-foreground)]">
            {t('topik.placement.description')}
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="surface-panel p-5">
            <Headphones aria-hidden="true" className="text-[var(--accent)]" />
            <h2 className="mt-3 font-bold">{t('topik.placement.listeningCount')}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{t('topik.placement.listeningDescription')}</p>
          </section>
          <section className="surface-panel p-5">
            <CheckCircle2 aria-hidden="true" className="text-[var(--accent)]" />
            <h2 className="mt-3 font-bold">{t('topik.placement.readingCount')}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{t('topik.placement.readingDescription')}</p>
          </section>
        </div>
        {model.error && <p role="alert" className="mt-5 rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">{model.error}</p>}
        <button type="button" disabled={model.loading} onClick={() => void model.start()} className="mt-6 touch-target rounded-[var(--radius-md)] bg-[var(--accent)] px-6 font-bold text-white disabled:opacity-60">
          {model.loading ? t('topik.placement.preparing') : t('topik.placement.start')}
        </button>
      </div>
    );
  }

  const question = model.currentQuestion;
  if (!question) return null;
  const prompt = model.instructionLanguage === 'ko'
    ? question.prompt_ko
    : model.instructionLanguage === 'ja' ? question.prompt_ja : question.prompt_en;

  return (
    <div className="app-page max-w-[800px]">
      <header className="mb-5">
        <div className="flex items-center justify-between gap-4 text-sm font-bold">
          <span>{t(`topik.placement.${question.section}`)} · {model.index + 1}/{model.attempt.questions.length}</span>
          <span>{t('topik.placement.answered', { progress: model.progress })}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--muted)]" aria-label={t('topik.placement.answered', { progress: model.progress })}>
          <div className="h-full bg-[var(--accent)] transition-[width]" style={{ width: `${model.progress}%` }} />
        </div>
      </header>

      <section className="surface-panel p-5 sm:p-7">
        <p className="text-xs font-bold uppercase text-[var(--accent)]">{question.skill}</p>
        <h1 className="mt-3 break-keep text-xl font-black leading-8 sm:text-2xl">{prompt}</h1>

        {question.section === 'listening' && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-[var(--border)] py-4">
            <button
              type="button"
              disabled={!question.audio}
              onClick={() => question.audio && audio.play(question.audio)}
              className="touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 font-bold text-white disabled:opacity-50"
            >
              <Volume2 aria-hidden="true" size={19} />
              {audio.playing ? t('topik.placement.playing') : t('topik.placement.playAudio')}
            </button>
            <span className="text-xs text-[var(--muted-foreground)]">
              {question.audio?.kind === 'r2' ? t('topik.placement.reviewedAudio') : t('topik.placement.browserAudio')}
            </span>
            {audio.error && <p role="alert" className="w-full text-sm text-red-700 dark:text-red-300">{t(`topik.characters.audio.${audio.error}`)}</p>}
          </div>
        )}

        <fieldset className="mt-6 grid gap-3">
          <legend className="sr-only">{t('topik.placement.chooseAnswer')}</legend>
          {question.choices.map((choice, choiceIndex) => (
            <button
              type="button"
              role="radio"
              aria-checked={model.selectedIndex === choiceIndex}
              key={choice}
              onClick={() => model.select(choiceIndex)}
              className={`touch-target rounded-[var(--radius-md)] border px-4 py-3 text-left font-semibold ${
                model.selectedIndex === choiceIndex
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]'
              }`}
            >
              <span className="mr-3 text-xs text-[var(--muted-foreground)]">{choiceIndex + 1}</span>{choice}
            </button>
          ))}
        </fieldset>
      </section>

      {model.error && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{model.error}</p>}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" onClick={model.previous} disabled={model.index === 0} className="touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-4 font-bold disabled:opacity-40">
          <ArrowLeft aria-hidden="true" size={18} /> {t('topik.placement.previous')}
        </button>
        {model.index < model.attempt.questions.length - 1 ? (
          <button type="button" onClick={model.next} disabled={model.selectedIndex === undefined} className="touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 font-bold text-white disabled:opacity-40">
            {t('topik.placement.next')} <ArrowRight aria-hidden="true" size={18} />
          </button>
        ) : (
          <button type="button" onClick={() => void model.submit()} disabled={!model.allAnswered || model.loading} className="touch-target rounded-[var(--radius-md)] bg-[var(--accent)] px-5 font-bold text-white disabled:opacity-40">
            {model.loading ? t('topik.placement.scoring') : t('topik.placement.submit')}
          </button>
        )}
      </div>
    </div>
  );
}

function ResultView({ model }: { model: ReturnTypeOfUseTopikPlacement }) {
  const { t } = useTranslation();
  const result = model.result;
  if (!result) return null;
  return (
    <div className="app-page max-w-[800px]">
      <p className="text-sm font-bold text-[var(--accent)]">{t('topik.placement.complete')}</p>
      <h1 className="mt-2 text-4xl font-black">{t(`topik.placement.bands.${result.result_band}.title`)}</h1>
      <p className="mt-3 leading-7 text-[var(--muted-foreground)]">{t(`topik.placement.bands.${result.result_band}.description`)}</p>
      <div className="mt-7 grid grid-cols-3 gap-2">
        <Score label={t('topik.placement.scoreTotal')} value={result.score_total} />
        <Score label={t('topik.placement.scoreListening')} value={result.score_listening} />
        <Score label={t('topik.placement.scoreReading')} value={result.score_reading} />
      </div>
      <button type="button" onClick={model.restart} className="mt-7 touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-4 font-bold">
        <RotateCcw aria-hidden="true" size={18} /> {t('topik.placement.retake')}
      </button>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return <div className="surface-panel p-4 text-center"><div className="text-2xl font-black text-[var(--accent)]">{value}</div><div className="mt-1 text-xs text-[var(--muted-foreground)]">{label}</div></div>;
}
