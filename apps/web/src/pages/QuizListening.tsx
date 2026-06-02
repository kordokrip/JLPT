/**
 * QuizListening.tsx — Phase 8-C: 청해 전용 퀴즈 페이지
 *
 * Route: /quiz/listening/:quizId
 *
 * 특징:
 *  - 오디오 플레이어 (재생/일시정지/-5초 / 최대 3회 재생 제한)
 *  - 4지 선다 답안 확정 후 제출
 *  - 완료 후 /quiz/result/:attemptId 로 이동
 */
import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { audioPlayer, buildAudioUrl } from '../lib/audio';
import QuizTimer from '../components/feature/QuizTimer';

const MAX_PLAYS = 3;
const SKIP_BACK = 5;   // 초

interface ListeningQuestion {
  id:          string;
  type:        string;
  prompt:      string;
  choices:     string[];
  audio_key?:  string | undefined;
  script_ja?:  string | undefined;
  script_ko?:  string | undefined;
}

interface GenerateRes {
  quiz_id:   number;
  mode:      'listening';
  level:     string;
  questions: ListeningQuestion[];
}

interface SubmitRes {
  quiz_id:  number;
  score:    number;
  correct:  number;
  total:    number;
  detail:   Array<{
    question_id: string;
    submitted:   string;
    correct:     string;
    is_correct:  boolean;
  }>;
}

type SubmittedAnswer = { question_id: string; answer: string };

export function toSubmittedAnswers(answers: Record<string, string>): SubmittedAnswer[] {
  return Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 오디오 플레이어 서브컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
function AudioPlayer({
  audioKey,
  fallbackText,
  onPlaysExhausted,
}: {
  audioKey?: string | undefined;
  fallbackText?: string | undefined;
  onPlaysExhausted?: () => void;
}) {
  const { t } = useTranslation();
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying]   = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  const src = audioKey ? buildAudioUrl(audioKey) : '';

  const handlePlayPause = useCallback(() => {
    const el = audioRef.current;

    if (audioUnavailable || !audioKey || !el) {
      if (!fallbackText) return;
      if (playCount >= MAX_PLAYS) { onPlaysExhausted?.(); return; }
      setPlayCount((n) => n + 1);
      void audioPlayer.speakText(fallbackText, {
        onStart: () => setPlaying(true),
        onEnd:   () => setPlaying(false),
        onError: () => setPlaying(false),
      });
      return;
    }
    if (el.paused) {
      if (playCount >= MAX_PLAYS) { onPlaysExhausted?.(); return; }
      el.playbackRate = audioPlayer.rate;
      el.play().catch(console.error);
    } else {
      el.pause();
    }
  }, [audioKey, audioUnavailable, fallbackText, playCount, onPlaysExhausted]);

  const handleSkipBack = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - SKIP_BACK);
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      {audioKey && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          ref={audioRef}
          src={src}
          preload="auto"
          onPlay={() => {
            setPlaying(true);
            setPlayCount((n) => n + 1);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setAudioUnavailable(true)}
          onTimeUpdate={(e) => setCurrentTime((e.currentTarget).currentTime)}
          onLoadedMetadata={(e) => setDuration((e.currentTarget).duration)}
        />
      )}

      {/* 진행 바 */}
      <div
        className="h-1.5 w-full rounded-full bg-[var(--surface-alt)] overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(progressPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-75 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 컨트롤 */}
      <div className="flex items-center justify-center gap-6">
        {/* -5초 */}
        <button
          type="button"
          aria-label={t('quiz.rewindSeconds', { seconds: SKIP_BACK })}
          onClick={handleSkipBack}
          className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 text-[var(--muted-foreground)]
                     hover:text-foreground transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
            <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
          <span className="text-[10px] font-pretendard">{t('quiz.rewindSeconds', { seconds: SKIP_BACK })}</span>
        </button>

        {/* 재생/일시정지 */}
        <button
          type="button"
          aria-label={playing ? t('common.pause') : t('common.play')}
          onClick={handlePlayPause}
          disabled={!playing && playCount >= MAX_PLAYS}
          className="w-14 h-14 rounded-full bg-[var(--accent)] text-white
                     flex items-center justify-center shadow-md
                     hover:opacity-90 transition-opacity
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* 재생 횟수 */}
        <div className="flex flex-col items-center gap-1 text-[var(--muted-foreground)]">
          <div className="flex gap-1">
            {Array.from({ length: MAX_PLAYS }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < playCount ? 'bg-[var(--accent)]' : 'bg-[var(--surface-alt)]'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-pretendard">
            {t('quiz.playsCount', { count: playCount, max: MAX_PLAYS })}
          </span>
        </div>
      </div>

      {playCount >= MAX_PLAYS && (
        <p className="text-center text-[12px] text-[var(--destructive)] font-pretendard">
          {t('quiz.maxPlaysReached')}
        </p>
      )}
      {(audioUnavailable || !audioKey) && fallbackText && (
        <p className="text-center text-[12px] text-[var(--muted-foreground)] font-pretendard">
          {t('quiz.browserSpeechFallback')}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────────────────────────────────────────
export default function QuizListening() {
  const { quizId }  = useParams<{ quizId: string }>();
  const navigate    = useNavigate();
  const { t } = useTranslation();

  const [idx, setIdx]         = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers]   = useState<Record<string, string>>({});
  const [playsOut, setPlaysOut] = useState(false);

  // 퀴즈 데이터 조회 — quizId가 있으면 기존 퀴즈, 없으면 새 퀴즈 생성
  const { data, isLoading, error } = useQuery({
    queryKey: ['quiz-listening', quizId],
    queryFn:  async () => {
      let res;
      if (quizId) {
        // 기존 quiz_attempts에서 questions_json 로드 (미구현 시 generate 재호출)
        res = await api.post<GenerateRes>('/quiz/generate', {
          mode: 'listening', level: 'N3', count: 5,
        });
      } else {
        res = await api.post<GenerateRes>('/quiz/generate', {
          mode: 'listening', level: 'N3', count: 5,
        });
      }
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    staleTime: Infinity,
  });

  const submitMut = useMutation({
    mutationFn: (submittedAnswers: SubmittedAnswer[]) =>
      api.post<SubmitRes>('/quiz/submit', {
        quiz_id: data?.quiz_id,
        answers: submittedAnswers,
      }),
    onSuccess: (res) => {
      if (res.ok) {
        navigate(`/quiz/result/${res.data.quiz_id}`, {
          state: { result: res.data },
        });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="font-pretendard text-[var(--muted-foreground)] text-sm">{t('quiz.loadingQuiz')}</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="font-pretendard text-[var(--destructive)] text-sm">
          {t('quiz.loadError')}
        </span>
      </div>
    );
  }

  const questions = data.questions;
  const current   = questions[idx];

  if (!current) {
    return null; // 방어코드
  }

  const handleSelect = (choice: string) => {
    if (revealed) return;
    setSelected(choice);
  };

  const handleReveal = () => {
    if (!selected) return;
    setRevealed(true);
    setAnswers((prev) => ({ ...prev, [current.id]: selected }));
  };

  const handleNext = () => {
    const nextAnswers = selected
      ? { ...answers, [current.id]: selected }
      : answers;

    if (idx + 1 >= questions.length) {
      // 모든 문제 완료 → 제출
      submitMut.mutate(toSubmittedAnswers(nextAnswers));
      return;
    }
    setAnswers(nextAnswers);
    setIdx((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setPlaysOut(false);
  };

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
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

      {/* 진행 바 */}
      <div className="h-1 w-full rounded-full bg-[var(--surface-alt)] overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* 오디오 플레이어 */}
      {current.audio_key || current.script_ja ? (
        <AudioPlayer
          audioKey={current.audio_key}
          fallbackText={current.script_ja}
          onPlaysExhausted={() => setPlaysOut(true)}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center
                        text-[var(--muted-foreground)] font-pretendard text-sm">
          {t('quiz.audioPending')}
        </div>
      )}

      {/* 재생 소진 알림 */}
      {playsOut && !revealed && (
        <p className="text-center text-[12px] text-[var(--muted-foreground)] font-pretendard">
          {t('quiz.playsExhausted')}
        </p>
      )}

      {/* 문제 텍스트 */}
      {!current.audio_key && (
        <p className="font-sans-jp text-[20px] text-center text-foreground">
          {current.prompt}
        </p>
      )}

      {/* 선택지 */}
      <ul role="radiogroup" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {current.choices.map((choice: string, ci: number) => {
          const isSelected  = selected === choice;

          let itemClass =
            'w-full rounded-xl px-4 py-3 text-left border font-pretendard text-[14px] transition-colors ';

          if (!revealed) {
            itemClass += isSelected
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-foreground'
              : 'border-[var(--border)] hover:border-[var(--accent)] text-foreground';
          } else {
            itemClass += isSelected
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-foreground'
              : 'border-[var(--border)] text-[var(--muted-foreground)]';
          }

          return (
            <li key={ci}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelect(choice)}
                disabled={revealed}
                className={itemClass}
              >
                <span className="font-mono text-[var(--muted-foreground)] mr-2">
                  {String.fromCharCode(0x2460 + ci)} {/* ①②③④ */}
                </span>
                {choice}
              </button>
            </li>
          );
        })}
      </ul>

      {/* 정답 공개 후 — 스크립트 + 해석 */}
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

      {/* 답안 확정 표시 */}
      {revealed && (
        <div className="rounded-xl p-4 text-center font-pretendard font-semibold text-[15px] bg-[var(--accent-soft)] text-[var(--accent)]">
          {t('quiz.answerRecorded')}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex justify-end gap-3 pt-2">
        {!revealed ? (
          <button
            type="button"
            disabled={!selected}
            onClick={handleReveal}
            className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white
                       font-pretendard font-medium text-[14px]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:opacity-90 transition-opacity"
          >
            {t('quiz.confirmAnswer')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={submitMut.isPending}
            className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white
                       font-pretendard font-medium text-[14px]
                       disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {idx + 1 >= questions.length
              ? (submitMut.isPending ? t('common.submitting') : t('quiz.viewResult'))
              : t('quiz.next')}
          </button>
        )}
      </div>
    </div>
  );
}
