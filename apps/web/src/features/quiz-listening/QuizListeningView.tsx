import { useTranslation } from 'react-i18next';
import QuizTimer from '../../components/feature/QuizTimer';
import { ListeningAudioPlayer } from './ListeningAudioPlayer';
import type { ListeningQuestion } from './types';

type QuizListeningViewProps = {
  questions: ListeningQuestion[];
  current: ListeningQuestion | undefined;
  idx: number;
  selected: string | null;
  revealed: boolean;
  playsOut: boolean;
  isLoading: boolean;
  error: unknown;
  submitPending: boolean;
  onSelect: (choice: string) => void;
  onReveal: () => void;
  onNext: () => void;
  onPlaysExhausted: () => void;
};

export function QuizListeningView({
  questions,
  current,
  idx,
  selected,
  revealed,
  playsOut,
  isLoading,
  error,
  submitPending,
  onSelect,
  onReveal,
  onNext,
  onPlaysExhausted,
}: QuizListeningViewProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="font-pretendard text-[var(--muted-foreground)] text-sm">{t('quiz.loadingQuiz')}</span>
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="font-pretendard text-[var(--destructive)] text-sm">
          {t('quiz.loadError')}
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif-jp text-[28px] font-normal leading-none text-foreground">
            {t('quiz.listeningTitle')}
          </h1>
          <p className="font-pretendard text-[13px] text-[var(--muted-foreground)] mt-1">
            {idx + 1} / {questions.length}
          </p>
        </div>
        <QuizTimer running={!revealed} />
      </div>

      <div className="h-1 w-full rounded-full bg-[var(--surface-alt)] overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {current.audio_key || current.script_ja ? (
        <ListeningAudioPlayer
          key={current.id}
          audioKey={current.audio_key}
          fallbackText={current.script_ja}
          onPlaysExhausted={onPlaysExhausted}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--muted-foreground)] font-pretendard text-sm">
          {t('quiz.audioPending')}
        </div>
      )}

      {playsOut && !revealed && (
        <p className="text-center text-[12px] text-[var(--muted-foreground)] font-pretendard">
          {t('quiz.playsExhausted')}
        </p>
      )}

      {!current.audio_key && (
        <p className="font-sans-jp text-[20px] text-center text-foreground">
          {current.prompt}
        </p>
      )}

      <ul role="radiogroup" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {current.choices.map((choice, ci) => {
          const isSelected = selected === choice;
          const itemClass = [
            'w-full rounded-xl px-4 py-3 text-left border font-pretendard text-[14px] transition-colors',
            !revealed
              ? isSelected
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-foreground'
                : 'border-[var(--border)] hover:border-[var(--accent)] text-foreground'
              : isSelected
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-foreground'
                : 'border-[var(--border)] text-[var(--muted-foreground)]',
          ].join(' ');

          return (
            <li key={choice}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(choice)}
                disabled={revealed}
                className={itemClass}
              >
                <span className="font-mono text-[var(--muted-foreground)] mr-2">
                  {String.fromCharCode(0x2460 + ci)}
                </span>
                {choice}
              </button>
            </li>
          );
        })}
      </ul>

      {revealed && (current.script_ja || current.script_ko) && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-5 space-y-3">
          <p className="font-pretendard text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            {t('quiz.script')}
          </p>
          {current.script_ja && (
            <p className="font-sans-jp text-[15px] text-foreground leading-relaxed">
              {current.script_ja}
            </p>
          )}
          {current.script_ko && (
            <p className="font-pretendard text-[13px] text-[var(--muted-foreground)] leading-relaxed">
              {current.script_ko}
            </p>
          )}
        </div>
      )}

      {revealed && (
        <div className="rounded-xl p-4 text-center font-pretendard font-semibold text-[15px] bg-[var(--accent-soft)] text-[var(--accent)]">
          {t('quiz.answerRecorded')}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {!revealed ? (
          <button
            type="button"
            disabled={!selected}
            onClick={onReveal}
            className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white font-pretendard font-medium text-[14px] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {t('quiz.confirmAnswer')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={submitPending}
            className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white font-pretendard font-medium text-[14px] disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {idx + 1 >= questions.length
              ? (submitPending ? t('common.submitting') : t('quiz.viewResult'))
              : t('quiz.next')}
          </button>
        )}
      </div>
    </div>
  );
}
