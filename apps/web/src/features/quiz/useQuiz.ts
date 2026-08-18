import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useTrackStatus } from '../../hooks/useTrackStatus';
import { isQuizMode, toQuizAnswers } from './logic';
import type { JlptLevel, QuizGenerateResponse, QuizMode, QuizQuestion, QuizStrategy, QuizSubmitResponse } from './types';
import { DEFAULT_JLPT_LEVEL } from '@nihongo-n3/shared';

export function useQuizRoute() {
  const { mode: rawMode } = useParams<{ mode?: string }>();
  const navigate = useNavigate();
  const mode = isQuizMode(rawMode) ? rawMode : undefined;

  return {
    rawMode,
    mode,
    selectMode: useCallback((nextMode: QuizMode) => {
      navigate(`/quiz/${nextMode}`);
    }, [navigate]),
  };
}

/**
 * Quiz session state is intentionally ephemeral. SRS and other account-scoped
 * IndexedDB data keep their user × track namespace in their owning hooks.
 */
export function useQuizSession(mode: QuizMode) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { levels } = useTrackStatus();
  const highestLevel = levels[levels.length - 1] ?? DEFAULT_JLPT_LEVEL;
  const [level, setLevel] = useState<JlptLevel>(highestLevel);
  const [count, setCount] = useState(5);
  const [strategy, setStrategy] = useState<QuizStrategy>(() =>
    searchParams.get('strategy') === 'weakest' ? 'weakest' : 'random');
  const [quizId, setQuizId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!levels.includes(level)) setLevel(highestLevel);
  }, [highestLevel, level, levels]);

  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await api.post<QuizGenerateResponse>('/quiz/generate', {
        mode,
        level,
        count,
        ...(strategy === 'weakest' ? { strategy } : {}),
      });
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

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!quizId) throw new Error('quiz_id 없음');
      const res = await api.post<QuizSubmitResponse>('/quiz/submit', {
        quiz_id: quizId,
        answers: toQuizAnswers(answers),
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

  const selectAnswer = useCallback((choice: string) => {
    const questionId = questions[current]?.id ?? '';
    setAnswers((previous) => ({ ...previous, [questionId]: choice }));
  }, [current, questions]);

  const next = useCallback(() => {
    if (current < questions.length - 1) {
      setCurrent((index) => index + 1);
    }
  }, [current, questions.length]);

  const previous = useCallback(() => {
    if (current > 0) setCurrent((index) => index - 1);
  }, [current]);

  return {
    level,
    levels,
    count,
    strategy,
    questions,
    answers,
    current,
    elapsed,
    submitted,
    isGenerated: generateMut.isSuccess,
    isGenerating: generateMut.isPending,
    generateError: generateMut.error,
    isSubmitting: submitMut.isPending,
    start: () => generateMut.mutate(),
    submit: () => submitMut.mutate(),
    selectLevel: setLevel,
    selectCount: setCount,
    selectStrategy: setStrategy,
    selectAnswer,
    selectQuestion: setCurrent,
    setElapsed: (seconds: number) => setElapsed(seconds),
    next,
    previous,
    backToModeSelect: () => navigate('/quiz'),
  };
}
