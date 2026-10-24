import { PronunciationButton } from '../../components/feature/PronunciationButton';
import { Button } from '../../components/ui/Button';
import { getCardAudioText, getKanaPronunciationExample } from './logic';
import type { CharacterMode, CharacterStage, JlptLevel, StudyCard } from './types';
import { CharacterLesson } from './CharacterLesson';
import { useCharacterCopy } from './character-copy';

type Props = {
  mode: CharacterMode; level: JlptLevel; levels: readonly JlptLevel[];
  index: number; stage: CharacterStage; revealed: boolean; answer: string | null;
  deck: StudyCard[]; card?: StudyCard | undefined; progress: number; choices: string[]; expected?: string | undefined; correct: boolean;
  onMode: (mode: CharacterMode) => void; onLevel: (level: JlptLevel) => void;
  onReveal: (revealed: boolean) => void; onAnswer: (answer: string | null) => void;
  onStage: (stage: CharacterStage) => void; onNext: () => void; onComplete: (ok: boolean) => void;
  onSelect: (index: number) => void; loading?: boolean; error?: boolean; onReload?: () => void;
};
export function CharacterTrainerView(props: Props) {
  const c = useCharacterCopy();
  return <CharacterLesson key={`${props.mode}:${props.level}`} language="ja" loading={props.loading} error={props.error} onReload={props.onReload}
    letters={props.deck.map(card => {
      const example = getKanaPronunciationExample(card);
      return { ...card, meaning: card.mode === 'kanji' ? card.meaning : undefined, example: example ? `${example.word} · ${example.meaning}` : undefined };
    })} model={props}
    controls={<div className="surface-card character-controls" aria-label={c.group}>
      {(['hiragana', 'katakana', 'kanji'] as const).map(mode => <Button key={mode} variant="outline" aria-pressed={props.mode === mode} onClick={() => props.onMode(mode)}>{c.modes[mode]}</Button>)}
      {props.mode === 'kanji' && <div className="flex flex-wrap gap-2 basis-full">{props.levels.map(level => <Button key={level} variant="outline" aria-pressed={level === props.level} onClick={() => props.onLevel(level)}>{level}</Button>)}</div>}
    </div>}
    audio={() => props.card && <PronunciationButton text={getCardAudioText(props.card)} surface={props.mode === 'kanji' ? 'kanji' : 'kana'} label={c.play} slow repeat={1} />}
  />;
}
