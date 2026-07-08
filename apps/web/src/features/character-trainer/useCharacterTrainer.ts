import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { kanjiApi } from '../../lib/api';
import { HIRAGANA, KATAKANA } from './data';
import { buildChoices, getExpectedAnswer, makeKanjiCard, readProgress, writeProgress } from './logic';
import type { CharacterMode, CharacterStage, JlptLevel, StudyCard } from './types';

export function useCharacterTrainer() {
  const [mode, setMode] = useState<CharacterMode>('hiragana');
  const [level, setLevel] = useState<JlptLevel>('N5');
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<CharacterStage>('observe');
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  const kanjiQuery = useQuery({
    queryKey: ['character-trainer-kanji', level],
    queryFn: async () => {
      const res = await kanjiApi.list({ level, limit: 200 });
      return res.ok ? res.data.map(makeKanjiCard) : [];
    },
    staleTime: 1000 * 60 * 30,
  });

  const deck = useMemo<StudyCard[]>(() => {
    if (mode === 'hiragana') return HIRAGANA;
    if (mode === 'katakana') return KATAKANA;
    return kanjiQuery.data ?? [];
  }, [mode, kanjiQuery.data]);

  const card = deck[index % Math.max(deck.length, 1)];
  const progress = card ? readProgress(card.id) : 0;
  const choices = useMemo(() => card ? buildChoices(card, deck) : [], [card, deck]);
  const expected = getExpectedAnswer(card);
  const correct = answer !== null && answer === expected;

  const switchMode = (next: CharacterMode) => {
    setMode(next);
    setIndex(0);
    setStage('observe');
    setRevealed(false);
    setAnswer(null);
  };

  const switchStage = (next: CharacterStage) => {
    setStage(next);
    setAnswer(null);
    setRevealed(false);
  };

  const nextCard = () => {
    setIndex((value) => (value + 1) % Math.max(deck.length, 1));
    setStage('observe');
    setRevealed(false);
    setAnswer(null);
  };

  const complete = (ok: boolean) => {
    if (!card) return;
    writeProgress(card.id, ok ? 1 : -1);
    forceTick((value) => value + 1);
    nextCard();
  };

  return {
    mode,
    level,
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
    setLevel,
    setRevealed,
    setAnswer,
    switchMode,
    switchStage,
    nextCard,
    complete,
  };
}
