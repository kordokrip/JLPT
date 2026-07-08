import { QuizListeningView } from '../features/quiz-listening/QuizListeningView';
import { useListeningQuiz } from '../features/quiz-listening/useListeningQuiz';

export default function QuizListening() {
  const quiz = useListeningQuiz();

  return (
    <QuizListeningView
      questions={quiz.questions}
      current={quiz.current}
      idx={quiz.idx}
      selected={quiz.selected}
      revealed={quiz.revealed}
      playsOut={quiz.playsOut}
      isLoading={quiz.isLoading}
      error={quiz.error}
      submitPending={quiz.submitPending}
      onSelect={quiz.selectChoice}
      onReveal={quiz.revealAnswer}
      onNext={quiz.next}
      onPlaysExhausted={() => quiz.setPlaysOut(true)}
    />
  );
}
