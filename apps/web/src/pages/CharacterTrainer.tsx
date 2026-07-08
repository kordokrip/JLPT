import { CharacterTrainerView } from '../features/character-trainer/CharacterTrainerView';
import { useCharacterTrainer } from '../features/character-trainer/useCharacterTrainer';

export default function CharacterTrainer() {
  const trainer = useCharacterTrainer();

  return (
    <CharacterTrainerView
      mode={trainer.mode}
      level={trainer.level}
      index={trainer.index}
      stage={trainer.stage}
      revealed={trainer.revealed}
      answer={trainer.answer}
      deck={trainer.deck}
      card={trainer.card}
      progress={trainer.progress}
      choices={trainer.choices}
      expected={trainer.expected}
      correct={trainer.correct}
      onMode={trainer.switchMode}
      onLevel={trainer.setLevel}
      onReveal={trainer.setRevealed}
      onAnswer={trainer.setAnswer}
      onStage={trainer.switchStage}
      onNext={trainer.nextCard}
      onComplete={trainer.complete}
    />
  );
}
