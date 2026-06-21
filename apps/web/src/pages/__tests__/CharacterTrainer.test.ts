import { describe, expect, it } from 'vitest';
import {
  buildChoices,
  elongateKanaForSpeech,
  getCardAudioPath,
  getCardAudioText,
  kanaAudioPath,
  type StudyCard,
} from '../CharacterTrainer';

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

  it('getCardAudioText plays kana characters and first kanji reading', () => {
    const kana = {
      id: 'h-あ',
      mode: 'hiragana',
      char: 'あ',
      reading: 'a',
      meaning: '히라가나',
      strokeCount: 3,
      hint: '',
    } satisfies StudyCard;
    const kanji = {
      id: 'kanji-1',
      mode: 'kanji',
      char: '日',
      reading: 'ニチ / ジツ / ひ',
      meaning: '날 일',
      strokeCount: 4,
      hint: '',
      level: 'N5',
    } satisfies StudyCard;

    expect(getCardAudioText(kana)).toBe('あーーーーーー');
    expect(getCardAudioText(kanji)).toBe('ニチ');
  });

  it('elongateKanaForSpeech turns a single kana into a slow pronunciation prompt', () => {
    expect(elongateKanaForSpeech('あ', 'a')).toBe('あーーーーーー');
    expect(elongateKanaForSpeech('ア', 'a')).toBe('アーーーーーー');
    expect(elongateKanaForSpeech('か', 'ka')).toBe('かーーーーーー');
    expect(elongateKanaForSpeech('き', 'ki')).toBe('きーーーーーー');
    expect(elongateKanaForSpeech('ん', 'n')).toBe('んーーーーーー');
    expect(elongateKanaForSpeech('日', 'nichi')).toBe('日');
  });

  it('uses stable R2 object keys for kana audio', () => {
    const kana = {
      id: 'h-あ',
      mode: 'hiragana',
      char: 'あ',
      reading: 'a',
      meaning: '히라가나',
      strokeCount: 3,
      hint: '',
      audioPath: kanaAudioPath('hiragana', 'a'),
    } satisfies StudyCard;

    expect(kanaAudioPath('hiragana', 'a')).toBe('audio/kana/hiragana/a.m4a');
    expect(kanaAudioPath('katakana', 'shi')).toBe('audio/kana/katakana/shi.m4a');
    expect(getCardAudioPath(kana)).toBe('audio/kana/hiragana/a.m4a');
  });
});
