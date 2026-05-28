/**
 * QuizResult — 퀴즈 채점 결과 페이지 (Phase 7-D)
 */
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface DetailItem {
  question_id: string;
  submitted:   string;
  correct:     string;
  is_correct:  boolean;
}

interface QuizResultState {
  result: {
    quiz_id: number;
    score:   number;
    correct: number;
    total:   number;
    detail:  DetailItem[];
  };
  elapsed?: number;
}

function ScoreBadge({ score }: { score: number }) {
  const { t } = useTranslation();
  const color =
    score >= 80 ? 'text-green-600'  :
    score >= 60 ? 'text-[var(--accent)]' :
                  'text-red-500';
  return (
    <div className={`font-serif-jp text-[72px] font-normal leading-none ${color}`}>
      {score}
      <span className="text-[32px]">{t('quiz.score')}</span>
    </div>
  );
}

export default function QuizResult() {
  const navigate  = useNavigate();
  const { attemptId } = useParams<{ attemptId: string }>();
  const location  = useLocation();
  const state     = location.state as QuizResultState | null;
  const { t } = useTranslation();

  if (!state?.result) {
    return (
      <div className="max-w-[480px] mx-auto px-8 py-12 text-center">
        <p className="text-[var(--muted-foreground)] mb-6">
          {t('quiz.noResultData', { attemptId })}
        </p>
        <button
          type="button"
          onClick={() => navigate('/quiz')}
          className="px-6 py-2 rounded-lg bg-[var(--accent)] text-white text-[14px]"
        >
          {t('quiz.restart')}
        </button>
      </div>
    );
  }

  const { score, correct, total, detail } = state.result;
  const elapsed = state.elapsed ?? 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="max-w-[640px] mx-auto px-8 py-12">
      {/* 헤더 */}
      <h1 className="font-serif-jp text-[40px] font-normal text-foreground leading-none mb-8">
        {t('quiz.result')}
      </h1>

      {/* 점수 카드 */}
      <div className="card-hairline rounded-xl p-6 mb-8 text-center">
        <ScoreBadge score={score} />
        <p className="font-pretendard text-[14px] text-[var(--muted-foreground)] mt-2">
          {t('quiz.correctSummary', { correct, total, elapsed: `${mm}:${ss}` })}
        </p>
      </div>

      {/* 오답 리뷰 */}
      {detail.some((d) => !d.is_correct) && (
        <section aria-label={t('quiz.incorrectList')} className="mb-8">
          <h2 className="font-pretendard text-[13px] uppercase tracking-[0.08em]
                         text-[var(--muted-foreground)] mb-3">
            {t('quiz.incorrectList')}
          </h2>
          <ul className="space-y-2">
            {detail
              .filter((d) => !d.is_correct)
              .map((d) => (
                <li
                  key={d.question_id}
                  className="card-hairline rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"
                >
                  <span className="text-red-500 text-[13px] font-pretendard">
                    {t('quiz.myAnswer', { answer: d.submitted || t('quiz.unanswered') })}
                  </span>
                  <span className="hidden sm:block text-[var(--border)]">→</span>
                  <span className="text-green-600 text-[13px] font-pretendard font-medium">
                    {t('quiz.correctAnswer', { answer: d.correct })}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* 전체 정답 목록 */}
      <section aria-label={t('quiz.answerReview')} className="mb-10">
        <h2 className="font-pretendard text-[13px] uppercase tracking-[0.08em]
                       text-[var(--muted-foreground)] mb-3">
          {t('quiz.answerReview')}
        </h2>
        <ol className="space-y-1.5">
          {detail.map((d, i) => (
            <li
              key={d.question_id}
              className="flex items-center gap-3 text-[13px] font-pretendard"
            >
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold
                ${d.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
                aria-hidden="true"
              >
                {d.is_correct ? '○' : '✕'}
              </span>
              <span className="text-[var(--muted-foreground)] w-5">{i + 1}.</span>
              <span className={d.is_correct ? 'text-foreground' : 'line-through text-[var(--muted-foreground)]'}>
                {d.submitted || t('quiz.unanswered')}
              </span>
              {!d.is_correct && (
                <span className="text-green-600 font-medium">→ {d.correct}</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate('/quiz')}
          className="flex-1 py-3 rounded-lg border border-[var(--border)] text-[14px]
                     font-pretendard hover:border-[var(--accent)] transition-colors"
        >
          {t('quiz.quizList')}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex-1 py-3 rounded-lg bg-[var(--accent)] text-white text-[14px]
                     font-pretendard font-medium hover:opacity-90 transition-opacity"
        >
          {t('quiz.retry')}
        </button>
      </div>
    </div>
  );
}
