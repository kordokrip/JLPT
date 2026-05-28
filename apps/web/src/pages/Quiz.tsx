/**
 * Quiz — 퀴즈 모드/레벨 선택 → 문제 풀기 (Phase 7-D)
 *
 * /quiz          → 모드 선택
 * /quiz/:mode    → 레벨 선택 → 문제 시작
 */
import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import QuizQuestionMC from '../components/feature/QuizQuestionMC';
import QuizTimer from '../components/feature/QuizTimer';

type QuizMode  = 'vocab_mc' | 'grammar_fill' | 'kanji_reading' | 'listening';
type JlptLevel = 'N5' | 'N4' | 'N3';

interface Question {
  id:        string;
  type:      string;
  prompt:    string;
  choices:   string[];
  audio_key?: string;
  script_ja?: string;
  script_ko?: string;
}

interface GenerateRes {
  quiz_id:   number;
  mode:      QuizMode;
  level:     JlptLevel;
  questions: Question[];
}

interface SubmitRes {
  quiz_id:  number;
  score:    number;
  correct:  number;
  total:    number;
  detail:   Array<{ question_id: string; submitted: string; correct: string; is_correct: boolean }>;
}

const QUIZ_MODES: QuizMode[] = ['vocab_mc', 'kanji_reading', 'grammar_fill', 'listening'];
const MODE_ICONS: Record<QuizMode, string> = {
  vocab_mc:      '📖',
  kanji_reading: '漢',
  grammar_fill:  '✏️',
  listening:     '🎧',
};

const LEVELS: JlptLevel[] = ['N5', 'N4', 'N3'];

// ─────────────────────────────────────────────
// 화면 1 — 모드 선택
// ─────────────────────────────────────────────
function ModeSelect() {
  const navigate = useNavigate();
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
        {QUIZ_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => navigate(`/quiz/${mode}`)}
            className="card-hairline rounded-xl p-5 text-left hover:border-[var(--accent)]
                       transition-colors group"
          >
            <div className="text-2xl mb-2">{MODE_ICONS[mode]}</div>
            <div className="font-pretendard font-semibold text-[15px] text-foreground mb-1">
              {t(`quiz.modes.${mode}`)}
            </div>
            <div className="font-pretendard text-[12px] text-[var(--muted-foreground)]">
              {t(`quiz.descs.${mode}`)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 화면 2 — 레벨 선택 + 문제 수 설정 → 퀴즈 진행
// ─────────────────────────────────────────────
function QuizSession({ mode }: { mode: QuizMode }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 설정 상태
  const [level, setLevel]   = useState<JlptLevel>('N3');
  const [count, setCount]   = useState(5);

  // 퀴즈 진행 상태
  const [quizId,    setQuizId]    = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers,   setAnswers]   = useState<Record<string, string>>({});
  const [current,   setCurrent]   = useState(0);
  const [elapsed,   setElapsed]   = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const icon = MODE_ICONS[mode]!

  // 문제 생성
  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await api.post<GenerateRes>('/quiz/generate', { mode, level, count });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (data) => {
      setQuizId(data.quiz_id);
      setQuestions(data.questions);
      setAnswers({});
      setCurrent(0);
      setSubmitted(false);
    },
  });

  // 답안 제출
  const submitMut = useMutation({
    mutationFn: async () => {
      if (!quizId) throw new Error('quiz_id 없음');
      const answerList = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer,
      }));
      const res = await api.post<SubmitRes>('/quiz/submit', {
        quiz_id: quizId,
        answers: answerList,
      });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (data) => {
      navigate(`/quiz/result/${data.quiz_id}`, {
        state: { result: data, elapsed },
      });
    },
  });

  const handleSelect = useCallback((choice: string) => {
    const qId = questions[current]?.id ?? '';
    setAnswers((prev) => ({ ...prev, [qId]: choice }));
  }, [current, questions]);

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((n) => n + 1);
    }
  };

  const handlePrev = () => {
    if (current > 0) setCurrent((n) => n - 1);
  };

  // ─── 설정 화면 ───
  if (!generateMut.isSuccess) {
    return (
      <div className="max-w-[480px] mx-auto px-8 py-12">
        <button
          type="button"
          onClick={() => navigate('/quiz')}
          className="text-[12px] text-[var(--muted-foreground)] hover:text-foreground mb-6 flex items-center gap-1"
        >
          ← {t('quiz.backToModeSelect')}
        </button>
        <h2 className="font-pretendard text-[28px] font-medium text-foreground mb-1">
          {icon} {t(`quiz.modes.${mode}`)}
        </h2>
        <p className="font-pretendard text-[13px] text-[var(--muted-foreground)] mb-8">
          {t('quiz.selectLevelAndCount')}
        </p>

        {/* 레벨 */}
        <div className="mb-6">
          <p className="font-pretendard text-[12px] uppercase tracking-[0.08em] text-[var(--muted-foreground)] mb-2">
            {t('quiz.jlptLevel')}
          </p>
          <div className="flex gap-2 flex-wrap">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={[
                  'px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors',
                  level === l
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]',
                ].join(' ')}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* 문제 수 */}
        <div className="mb-8">
          <p className="font-pretendard text-[12px] uppercase tracking-[0.08em] text-[var(--muted-foreground)] mb-2">
            {t('quiz.questionCount')} <span className="normal-case">{count}{t('quiz.questionUnit')}</span>
          </p>
          <input
            type="range"
            min={3} max={20} step={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
            aria-label={t('quiz.selectQuestionCount')}
          />
          <div className="flex justify-between text-[11px] text-[var(--muted-foreground)] mt-1">
            <span>3</span><span>20</span>
          </div>
        </div>

        <button
          type="button"
          disabled={generateMut.isPending}
          onClick={() => generateMut.mutate()}
          className="w-full py-3 rounded-lg bg-[var(--accent)] text-white font-pretendard font-medium
                     hover:opacity-90 transition-opacity disabled:opacity-50"
        >
        {generateMut.isPending ? t('quiz.generating') : t('quiz.start')}
        </button>
        {generateMut.isError && (
          <p className="text-red-500 text-[13px] mt-3 text-center" role="alert">
            {(generateMut.error as Error).message}
          </p>
        )}
      </div>
    );
  }

  // ─── 문제 풀기 화면 ───
  const q = questions[current];
  if (!q) return null;

  const answeredCount = Object.keys(answers).length;
  const allAnswered   = answeredCount === questions.length;
  const progress      = ((current + 1) / questions.length) * 100;

  return (
    <div className="max-w-[640px] mx-auto px-8 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-pretendard text-[13px] text-[var(--muted-foreground)]">
          {current + 1} / {questions.length}
        </span>
        <QuizTimer running={!submitted} onTick={setElapsed} />
      </div>

      {/* 프로그레스 바 */}
      <div className="h-1 bg-[var(--border)] rounded-full mb-8" role="progressbar"
           aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={questions.length}>
        <div
          className="h-1 bg-[var(--accent)] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 문제 */}
      <QuizQuestionMC
        questionId={q.id}
        prompt={q.prompt}
        choices={q.choices}
        audioKey={q.audio_key}
        audioText={q.script_ja}
        selected={answers[q.id]}
        onSelect={handleSelect}
        disabled={submitMut.isPending}
      />

      {/* 네비게이션 */}
      <div className="flex items-center justify-between mt-8 gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={current === 0}
          className="px-5 py-2 rounded-lg border border-[var(--border)] text-[13px]
                     disabled:opacity-30 hover:border-[var(--accent)] transition-colors"
        >
          ← {t('common.prev')}
        </button>

        {current < questions.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px]
                       hover:opacity-90 transition-opacity"
          >
            {t('common.next')} →
          </button>
        ) : (
          <button
            type="button"
            disabled={!allAnswered || submitMut.isPending}
            onClick={() => submitMut.mutate()}
            className="px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px] font-medium
                       hover:opacity-90 transition-opacity disabled:opacity-40"
          >
          {submitMut.isPending ? t('quiz.grading') : `${t('quiz.submit')} (${answeredCount}/${questions.length})`}
          </button>
        )}
      </div>

      {/* 답변 현황 점 */}
      <div className="flex justify-center gap-1.5 mt-6" aria-hidden="true">
        {questions.map((qq, i) => (
          <button
            key={qq.id}
            type="button"
            onClick={() => setCurrent(i)}
            className={[
              'w-2.5 h-2.5 rounded-full transition-colors',
              i === current
                ? 'bg-[var(--accent)]'
                : answers[qq.id]
                  ? 'bg-[var(--accent-soft)] border border-[var(--accent)]'
                  : 'bg-[var(--border)]',
            ].join(' ')}
            aria-label={`${i + 1}${t('quiz.questionNum')}${answers[qq.id] ? t('quiz.answered') : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function Quiz() {
  const { mode } = useParams<{ mode?: QuizMode }>();
  const { t } = useTranslation();

  if (!mode) return <ModeSelect />;
  if (!Object.keys({ vocab_mc: 1, grammar_fill: 1, kanji_reading: 1, listening: 1 }).includes(mode)) {
    return (
      <div className="max-w-[480px] mx-auto px-8 py-12 text-center">
        <p className="text-[var(--muted-foreground)]">{t('quiz.unknownMode', { mode })}</p>
      </div>
    );
  }
  return <QuizSession mode={mode as QuizMode} />;
}
