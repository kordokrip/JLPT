import { useTranslation } from 'react-i18next';
import QuizQuestionMC from '../../components/feature/QuizQuestionMC';
import QuizTimer from '../../components/feature/QuizTimer';
import { QUIZ_MODE_ICONS, QUIZ_MODES } from './logic';
import { useQuizSession } from './useQuiz';
import type { QuizMode } from './types';

type QuizViewProps = {
  rawMode: string | undefined;
  mode: QuizMode | undefined;
  onSelectMode: (mode: QuizMode) => void;
};

export function QuizView({ rawMode, mode, onSelectMode }: QuizViewProps) {
  const { t } = useTranslation();

  if (!rawMode) return <ModeSelect onSelectMode={onSelectMode} />;

  if (!mode) {
    return (
      <div className="max-w-[480px] mx-auto px-8 py-12 text-center">
        <p className="text-[var(--muted-foreground)]">{t('quiz.unknownMode', { mode: rawMode })}</p>
      </div>
    );
  }

  return <QuizSession mode={mode} />;
}

function ModeSelect({ onSelectMode }: { onSelectMode: (mode: QuizMode) => void }) {
  const { t } = useTranslation();

  return (
    <div className="max-w-[640px] mx-auto px-8 py-12">
      <h1 className="font-pretendard text-[32px] font-medium text-foreground leading-none mb-2">
        {t('nav.quiz')}
      </h1>
      <p className="font-pretendard text-[14px] text-[var(--muted-foreground)] mb-8">
        {t('quiz.selectMode')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUIZ_MODES.map((nextMode) => (
          <button
            key={nextMode}
            type="button"
            onClick={() => onSelectMode(nextMode)}
            className="card-hairline rounded-xl p-5 text-left hover:border-[var(--accent)]
                       transition-colors group"
          >
            <div className="text-2xl mb-2">{QUIZ_MODE_ICONS[nextMode]}</div>
            <div className="font-pretendard font-semibold text-[15px] text-foreground mb-1">
              {t(`quiz.modes.${nextMode}`)}
            </div>
            <div className="font-pretendard text-[12px] text-[var(--muted-foreground)]">
              {t(`quiz.descs.${nextMode}`)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizSession({ mode }: { mode: QuizMode }) {
  const { t } = useTranslation();
  const quiz = useQuizSession(mode);
  const icon = QUIZ_MODE_ICONS[mode];

  if (!quiz.isGenerated) {
    return (
      <div className="mx-auto max-w-[480px] px-6 py-8 pb-28 sm:px-8 sm:py-12">
        <button
          type="button"
          onClick={quiz.backToModeSelect}
          className="mb-6 flex min-h-11 items-center gap-1 rounded-[var(--radius-md)] px-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-accent-soft-20 hover:text-foreground"
        >
          ← {t('quiz.backToModeSelect')}
        </button>
        <h2 className="font-pretendard text-[28px] font-medium text-foreground mb-1">
          {icon} {t(`quiz.modes.${mode}`)}
        </h2>
        <p className="font-pretendard text-[13px] text-[var(--muted-foreground)] mb-8">
          {t('quiz.selectLevelAndCount')}
        </p>

        <div className="mb-6">
          <p className="font-pretendard text-[12px] uppercase tracking-[0.08em] text-[var(--muted-foreground)] mb-2">
            {t('quiz.jlptLevel')}
          </p>
          <div className="flex gap-2 flex-wrap">
            {quiz.levels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => quiz.selectLevel(level)}
                className={[
                  'min-h-11 px-4 rounded-full text-sm font-medium border transition-colors',
                  quiz.level === level
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]',
                ].join(' ')}
              >
                {t(`levels.${level}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <p className="font-pretendard text-[12px] uppercase tracking-[0.08em] text-[var(--muted-foreground)] mb-2">
            {t('quiz.questionCount')}
            <span className="normal-case ml-1">{quiz.count}{t('quiz.questionUnit')}</span>
          </p>
          <input
            type="range"
            min={3} max={20} step={1}
            value={quiz.count}
            onChange={(event) => quiz.selectCount(Number(event.target.value))}
            className="h-11 w-full accent-[var(--accent)]"
            aria-label={t('quiz.selectQuestionCount')}
          />
          <div className="flex justify-between text-[11px] text-[var(--muted-foreground)] mt-1">
            <span>3</span><span>20</span>
          </div>
        </div>

        <button
          type="button"
          disabled={quiz.isGenerating}
          onClick={quiz.start}
          className="min-h-12 w-full rounded-lg bg-[var(--accent)] text-white font-pretendard font-medium
                     hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {quiz.isGenerating ? t('quiz.generating') : t('quiz.start')}
        </button>
        {quiz.generateError && (
          <p className="text-red-500 text-[13px] mt-3 text-center" role="alert">
            {(quiz.generateError as Error).message}
          </p>
        )}
      </div>
    );
  }

  const question = quiz.questions[quiz.current];
  if (!question) return null;

  const answeredCount = Object.keys(quiz.answers).length;
  const allAnswered = answeredCount === quiz.questions.length;
  const progress = ((quiz.current + 1) / quiz.questions.length) * 100;

  return (
    <div className="max-w-[640px] mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-4">
        <span className="font-pretendard text-[13px] text-[var(--muted-foreground)]">
          {quiz.current + 1} / {quiz.questions.length}
        </span>
        <QuizTimer running={!quiz.submitted} onTick={quiz.setElapsed} />
      </div>

      <div className="h-1 bg-[var(--border)] rounded-full mb-8" role="progressbar"
           aria-valuenow={quiz.current + 1} aria-valuemin={1} aria-valuemax={quiz.questions.length}>
        <div
          className="h-1 bg-[var(--accent)] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <QuizQuestionMC
        questionId={question.id}
        prompt={question.prompt}
        choices={question.choices}
        audioKey={question.audio_key}
        audioText={question.script_ja}
        selected={quiz.answers[question.id]}
        onSelect={quiz.selectAnswer}
        disabled={quiz.isSubmitting}
      />

      <div className="flex items-center justify-between mt-8 gap-3">
        <button
          type="button"
          onClick={quiz.previous}
          disabled={quiz.current === 0}
          className="px-5 py-2 rounded-lg border border-[var(--border)] text-[13px]
                     disabled:opacity-30 hover:border-[var(--accent)] transition-colors"
        >
          ← {t('common.prev')}
        </button>

        {quiz.current < quiz.questions.length - 1 ? (
          <button
            type="button"
            onClick={quiz.next}
            className="px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px]
                       hover:opacity-90 transition-opacity"
          >
            {t('common.next')} →
          </button>
        ) : (
          <button
            type="button"
            disabled={!allAnswered || quiz.isSubmitting}
            onClick={quiz.submit}
            className="px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px] font-medium
                       hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {quiz.isSubmitting ? t('quiz.grading') : `${t('quiz.submit')} (${answeredCount}/${quiz.questions.length})`}
          </button>
        )}
      </div>

      <div className="flex justify-center gap-1.5 mt-6" aria-hidden="true">
        {quiz.questions.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => quiz.selectQuestion(index)}
            className={[
              'w-2.5 h-2.5 rounded-full transition-colors',
              index === quiz.current
                ? 'bg-[var(--accent)]'
                : quiz.answers[item.id]
                  ? 'bg-[var(--accent-soft)] border border-[var(--accent)]'
                  : 'bg-[var(--border)]',
            ].join(' ')}
            aria-label={`${index + 1}${t('quiz.questionNum')}${quiz.answers[item.id] ? t('quiz.answered') : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
