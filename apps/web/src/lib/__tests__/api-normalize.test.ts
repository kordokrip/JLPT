import { describe, expect, it } from 'vitest';
import { __apiTestUtils } from '../api';

describe('API response normalization', () => {
  it('maps D1 vocab columns to the web vocab model', () => {
    expect(__apiTestUtils.normalizeVocab({
      id: 1280,
      level: 'N3',
      ja: '喜び',
      kana: 'よろこび',
      ko: '기쁨',
      pos: '명사',
      audio_r2_key: 'audio/vocab/1280.mp3',
    })).toMatchObject({
      id: 1280,
      word: '喜び',
      reading: 'よろこび',
      meaning: '기쁨',
      part_of_speech: '명사',
      audio_path: 'audio/vocab/1280.mp3',
    });
  });

  it('maps D1 grammar and kanji columns to web models', () => {
    expect(__apiTestUtils.normalizeGrammar({
      id: 1,
      level: 'N3',
      pattern: '〜一方だ',
      meaning_ko: '계속 ...하다',
      examples: JSON.stringify([{ ja: '物価は上がる一方だ。', ko: '물가는 계속 오르기만 한다.' }]),
    })).toMatchObject({
      pattern: '〜一方だ',
      meaning: '계속 ...하다',
      example_jp: '物価は上がる一方だ。',
    });

    expect(__apiTestUtils.normalizeKanji({
      id: 1,
      char: '喜',
      jlpt_level: 'N3',
      on_yomi: 'キ',
      kun_yomi: 'よろこぶ',
      meaning_ko: '기쁠 희',
    })).toMatchObject({
      character: '喜',
      level: 'N3',
      reading_on: 'キ',
      reading_kun: 'よろこぶ',
      meaning: '기쁠 희',
      audio_path: 'audio/kanji/n3/1.mp3',
    });
  });
});
