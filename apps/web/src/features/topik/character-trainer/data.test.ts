import { describe, expect, it } from 'vitest';
import { HANGUL_CONSONANTS, HANGUL_DECKS, HANGUL_SYLLABLES, HANGUL_VOWELS } from './data';
import { buildHangulChoices, hangulExpectedAnswer } from './logic';

describe('TOPIK Hangul character deck', () => {
  it('starts with the requested 가·나·다 syllable progression', () => {
    expect(HANGUL_SYLLABLES.slice(0, 7).map((card) => card.char)).toEqual(['가', '나', '다', '라', '마', '바', '사']);
  });

  it('provides a non-empty Korean anchor word and localized gloss for every card', () => {
    const cards = Object.values(HANGUL_DECKS).flat();
    expect(cards).toHaveLength(38);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    for (const card of cards) {
      expect(card.exampleWord).not.toHaveLength(0);
      expect(card.exampleGloss.ko).not.toHaveLength(0);
      expect(card.exampleGloss.ja).not.toHaveLength(0);
      expect(card.exampleGloss.en).not.toHaveLength(0);
      expect(card.strokeCount).toBeGreaterThan(0);
    }
  });

  it('keeps answer choices inside the active deck and includes the expected romanization', () => {
    const card = HANGUL_SYLLABLES[0]!;
    const choices = buildHangulChoices(card, HANGUL_SYLLABLES);
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    expect(choices).toContain('ga');
    expect(hangulExpectedAnswer(card)).toBe('ga');
    expect(HANGUL_CONSONANTS).toHaveLength(14);
    expect(HANGUL_VOWELS).toHaveLength(10);
  });
});
