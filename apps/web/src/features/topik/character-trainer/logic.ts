import { readProgress, writeProgress } from '../../character-trainer/logic';
import type { HangulCard } from './types';

export function buildHangulChoices(card: HangulCard, deck: readonly HangulCard[]): string[] {
  const seen = new Set([card.romanization]);
  const choices = deck
    .filter((item) => item.id !== card.id)
    .map((item) => item.romanization)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, 3);
  return [card.romanization, ...choices].sort(() => Math.random() - 0.5);
}

export function hangulExpectedAnswer(card: HangulCard | undefined): string | undefined {
  return card ? card.romanization : undefined;
}

// Reuse the existing account × track-scoped local key. `getActiveLocalUserId()`
// already includes `track:topik-ko`, so JLPT and TOPIK progress cannot collide.
export const readHangulProgress = readProgress;
export const writeHangulProgress = writeProgress;
