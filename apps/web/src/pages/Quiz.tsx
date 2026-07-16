import { QuizView } from '../features/quiz/QuizView';
import { useQuizRoute } from '../features/quiz/useQuiz';

export default function Quiz() {
  const quiz = useQuizRoute();

  return (
    <QuizView
      rawMode={quiz.rawMode}
      mode={quiz.mode}
      onSelectMode={quiz.selectMode}
    />
  );
}
