import { useMemo, useState } from 'react';
import type { TopikPlacementAttemptDto, TopikPlacementResultDto } from '@nihongo-n3/shared';
import { topikPlacementApi } from '../../../lib/api';
import { useSettingsStore } from '../../../stores/settings-store';

export function useTopikPlacement() {
  const configuredInstructionLanguage = useSettingsStore((state) => state.instructionLanguages['topik-ko']);
  const instructionLanguage = configuredInstructionLanguage === 'ko' ? 'ko' : 'en';
  const [attempt, setAttempt] = useState<TopikPlacementAttemptDto | null>(null);
  const [result, setResult] = useState<TopikPlacementResultDto | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = attempt?.questions[index] ?? null;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = !!attempt && answeredCount === attempt.questions.length;

  const start = async () => {
    setLoading(true);
    setError(null);
    const response = await topikPlacementApi.start(instructionLanguage);
    setLoading(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setAttempt(response.data);
    setResult(null);
    setIndex(0);
    setAnswers({});
  };

  const submit = async () => {
    if (!attempt || !allAnswered) return;
    setLoading(true);
    setError(null);
    const response = await topikPlacementApi.submit(
      attempt.id,
      attempt.questions.map((question) => ({ question_id: question.id, selected_index: answers[question.id] as number })),
    );
    setLoading(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setResult(response.data);
  };

  const selectedIndex = currentQuestion ? answers[currentQuestion.id] : undefined;
  const progress = useMemo(() => attempt ? Math.round(answeredCount / attempt.questions.length * 100) : 0, [answeredCount, attempt]);

  return {
    attempt, result, currentQuestion, index, selectedIndex, answeredCount, allAnswered, progress,
    instructionLanguage, loading, error,
    start, submit,
    select: (choiceIndex: number) => currentQuestion && setAnswers((current) => ({ ...current, [currentQuestion.id]: choiceIndex })),
    previous: () => setIndex((current) => Math.max(0, current - 1)),
    next: () => attempt && setIndex((current) => Math.min(attempt.questions.length - 1, current + 1)),
    restart: () => { setAttempt(null); setResult(null); setAnswers({}); setIndex(0); setError(null); },
  };
}
