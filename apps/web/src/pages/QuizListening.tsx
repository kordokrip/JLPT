import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_JLPT_LEVEL, isJlptLevel, type JlptLevel } from '@nihongo-n3/shared';
import { QuizListeningView } from '../features/quiz-listening/QuizListeningView';
import { useListeningQuiz } from '../features/quiz-listening/useListeningQuiz';
import { useTrackStatus } from '../hooks/useTrackStatus';

export default function QuizListening() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { levels, isLoading: isTrackStatusLoading } = useTrackStatus();
  const selectedLevel = useMemo(() => {
    const requested = searchParams.get('level');
    // Keep a valid deep-linked level while the status query is still resolving.
    // Otherwise the N5–N3 offline fallback can rewrite `/quiz/listening?level=N2`
    // to N3 before the server confirms that the operating N2 batch is available.
    if (isJlptLevel(requested) && (isTrackStatusLoading || levels.includes(requested))) {
      return requested;
    }
    return levels.includes(DEFAULT_JLPT_LEVEL) ? DEFAULT_JLPT_LEVEL : levels[levels.length - 1] ?? DEFAULT_JLPT_LEVEL;
  }, [isTrackStatusLoading, levels, searchParams]);

  useEffect(() => {
    if (searchParams.get('level') === selectedLevel) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('level', selectedLevel);
      return next;
    }, { replace: true });
  }, [searchParams, selectedLevel, setSearchParams]);

  const quiz = useListeningQuiz(selectedLevel);

  const selectLevel = (level: JlptLevel) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('level', level);
      return next;
    });
  };

  return (
    <QuizListeningView
      level={selectedLevel}
      levels={levels}
      questions={quiz.questions}
      current={quiz.current}
      idx={quiz.idx}
      selected={quiz.selected}
      revealed={quiz.revealed}
      playsOut={quiz.playsOut}
      isLoading={quiz.isLoading}
      error={quiz.error}
      submitPending={quiz.submitPending}
      onLevel={selectLevel}
      onSelect={quiz.selectChoice}
      onReveal={quiz.revealAnswer}
      onNext={quiz.next}
      onPlaysExhausted={() => quiz.setPlaysOut(true)}
    />
  );
}
