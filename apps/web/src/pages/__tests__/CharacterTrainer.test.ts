import { describe, expect, it } from 'vitest';
import { buildChoices } from '../CharacterTrainer';

describe('CharacterTrainer', () => {
  it('buildChoices keeps the target choice and removes duplicates', () => {
    const deck = [
      { id: 'h-あ', mode: 'hiragana', char: 'あ', reading: 'a', meaning: '히라가나', strokeCount: 3, hint: '' },
      { id: 'h-い', mode: 'hiragana', char: 'い', reading: 'i', meaning: '히라가나', strokeCount: 2, hint: '' },
      { id: 'h-え', mode: 'hiragana', char: 'え', reading: 'e', meaning: '히라가나', strokeCount: 2, hint: '' },
      { id: 'h-お', mode: 'hiragana', char: 'お', reading: 'o', meaning: '히라가나', strokeCount: 3, hint: '' },
      { id: 'h-duplicate', mode: 'hiragana', char: 'ア', reading: 'a', meaning: '히라가나', strokeCount: 2, hint: '' },
    ] as Parameters<typeof buildChoices>[1];

    const choices = buildChoices(deck[0]!, deck);

    expect(choices).toContain('a');
    expect(new Set(choices).size).toBe(choices.length);
    expect(choices.length).toBe(4);
  });
});
