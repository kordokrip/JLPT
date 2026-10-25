import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { InstructionLanguage } from '@nihongo-n3/shared';
import { Button } from '../../../components/ui/Button';
import { useSettingsStore } from '../../../stores/settings-store';
import { CharacterLesson } from '../../character-trainer/CharacterLesson';
import { useCharacterCopy } from '../../character-trainer/character-copy';
import { useKoreanAudio } from '../useKoreanAudio';
import { HANGUL_MODE_ORDER, labelFor } from './data';
import type { useHangulTrainer } from './useHangulTrainer';

export function HangulTrainerView({ trainer }: { trainer: ReturnType<typeof useHangulTrainer> }) {
  const c = useCharacterCopy();
  const { t } = useTranslation();
  const instruction = useSettingsStore(s => s.instructionLanguages['topik-ko']) as InstructionLanguage;
  const audio = useKoreanAudio();
  return <CharacterLesson key={trainer.mode} language="ko"
    letters={trainer.deck.map(card => ({ ...card, reading: card.romanization,
      example: `${card.exampleWord} · ${labelFor(card.exampleGloss, instruction)}`,
      composition: card.mode === 'syllables' ? card.composition : undefined,
    }))}
    model={{ ...trainer, onStage: trainer.switchStage, onReveal: trainer.setRevealed,
      onAnswer: trainer.setAnswer, onSelect: trainer.selectCard, onComplete: trainer.complete }}
    controls={<div className="surface-card character-controls">{HANGUL_MODE_ORDER.map(mode => <Button key={mode} variant="outline" aria-pressed={mode === trainer.mode} onClick={() => trainer.switchMode(mode)}>{c.modes[mode]}</Button>)}</div>}
    audio={() => <div><Button variant="outline" onClick={() => void audio.speakText(trainer.card!.exampleWord)}><Volume2 size={18} aria-hidden="true" />{c.play}</Button>{audio.error && <p role="alert">{t(`topik.characters.audio.${audio.error}`)}</p>}</div>}
  />;
}
