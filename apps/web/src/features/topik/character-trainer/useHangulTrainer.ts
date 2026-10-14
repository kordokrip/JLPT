import { useMemo, useState } from 'react';
import type { CharacterStage } from '../../character-trainer/types';
import { HANGUL_DECKS } from './data';
import { buildHangulChoices, hangulExpectedAnswer, readHangulProgress, writeHangulProgress } from './logic';
import type { HangulTrainerMode } from './types';

export function useHangulTrainer() {
  const [mode, setMode] = useState<HangulTrainerMode>('syllables');
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<CharacterStage>('observe');
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  const deck = HANGUL_DECKS[mode];
  const card = deck[index % Math.max(deck.length, 1)];
  const progress = card ? readHangulProgress(card.id) : 0;
  const choices = useMemo(() => card ? buildHangulChoices(card, deck) : [], [card, deck]);
  const expected = hangulExpectedAnswer(card);
  const correct = answer !== null && answer === expected;

  const resetCardState = () => {
    setStage('observe');
    setRevealed(false);
    setAnswer(null);
  };

  const switchMode = (next: HangulTrainerMode) => {
    setMode(next);
    setIndex(0);
    resetCardState();
  };

  const switchStage = (next: CharacterStage) => {
    setStage(next);
    setRevealed(false);
    setAnswer(null);
  };

  const nextCard = () => {
    setIndex((value) => (value + 1) % Math.max(deck.length, 1));
    resetCardState();
  };

  const complete = (ok: boolean) => {
    if (!card) return;
    writeHangulProgress(card.id, ok ? 1 : -1);
    forceTick((value) => value + 1);
    nextCard();
  };

  return {
    mode,
    index,
    stage,
    revealed,
    answer,
    deck,
    card,
    progress,
    choices,
    expected,
    correct,
    setRevealed,
    setAnswer,
    switchMode,
    switchStage,
    nextCard,
    complete,
  };
}
