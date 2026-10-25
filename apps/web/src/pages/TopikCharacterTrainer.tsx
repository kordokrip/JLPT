import { HangulTrainerView } from '../features/topik/character-trainer/HangulTrainerView';
import { useHangulTrainer } from '../features/topik/character-trainer/useHangulTrainer';

export default function TopikCharacterTrainer() {
  const trainer = useHangulTrainer();
  return <HangulTrainerView trainer={trainer} />;
}
