import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { toSubmittedAnswers } from './logic';
import type { ListeningQuestion, ListeningQuizResponse, ListeningSubmitResponse, SubmittedAnswer } from './types';

export function useListeningQuiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [playsOut, setPlaysOut] = useState(false);

  const query = useQuery({
    queryKey: ['quiz-listening', quizId],
    queryFn: async () => {
      const res = await api.post<ListeningQuizResponse>('/quiz/generate', {
        mode: 'listening',
        level: 'N3',
        count: 5,
      });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    staleTime: Infinity,
  });

  const submitMut = useMutation({
    mutationFn: (submittedAnswers: SubmittedAnswer[]) =>
      api.post<ListeningSubmitResponse>('/quiz/submit', {
        quiz_id: query.data?.quiz_id,
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

  const questions = query.data?.questions ?? [];
  const current = questions[idx] as ListeningQuestion | undefined;

  const selectChoice = (choice: string) => {
    if (revealed) return;
    setSelected(choice);
  };

  const revealAnswer = () => {
    if (!selected || !current) return;
    setRevealed(true);
    setAnswers((prev) => ({ ...prev, [current.id]: selected }));
  };

  const next = () => {
    if (!current) return;
    const nextAnswers = selected
      ? { ...answers, [current.id]: selected }
      : answers;

    if (idx + 1 >= questions.length) {
      submitMut.mutate(toSubmittedAnswers(nextAnswers));
      return;
    }

    setAnswers(nextAnswers);
    setIdx((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setPlaysOut(false);
  };

  return {
    data: query.data,
    questions,
    current,
    idx,
    selected,
    revealed,
    playsOut,
    isLoading: query.isLoading,
    error: query.error,
    submitPending: submitMut.isPending,
    selectChoice,
    revealAnswer,
    next,
    setPlaysOut,
  };
}
