import type { HangulCard, HangulTrainerMode, LocalizedLabel } from './types';

type CardSeed = readonly [char: string, romanization: string, word: string, ko: string, ja: string, en: string, strokes: number, composition: string];

function makeDeck(mode: HangulTrainerMode, seeds: readonly CardSeed[]): HangulCard[] {
  return seeds.map(([char, romanization, exampleWord, ko, ja, en, strokeCount, composition]) => ({
    id: `topik-hangul-${mode}-${char}`,
    mode,
    char,
    romanization,
    exampleWord,
    exampleGloss: { ko, ja, en },
    strokeCount,
    composition,
  }));
}

/**
 * Self-authored Korean literacy starter deck. These are language examples, not
 * reproduced TOPIK questions. Audio always reads the representative word once
 * so isolated jamo are not synthesized as an ambiguous sequence of sounds.
 */
export const HANGUL_SYLLABLES = makeDeck('syllables', [
  ['가', 'ga', '가방', '가방', 'かばん', 'bag', 4, 'ㄱ + ㅏ'],
  ['나', 'na', '나라', '나라', '国', 'country', 4, 'ㄴ + ㅏ'],
  ['다', 'da', '다리', '다리', '橋', 'bridge', 5, 'ㄷ + ㅏ'],
  ['라', 'ra', '라면', '라면', 'ラーメン', 'ramyeon', 7, 'ㄹ + ㅏ'],
  ['마', 'ma', '마음', '마음', '心・気持ち', 'heart, mind', 5, 'ㅁ + ㅏ'],
  ['바', 'ba', '바다', '바다', '海', 'sea', 6, 'ㅂ + ㅏ'],
  ['사', 'sa', '사과', '사과', 'りんご', 'apple', 4, 'ㅅ + ㅏ'],
  ['아', 'a', '아이', '아이', '子ども', 'child', 3, 'ㅇ + ㅏ'],
  ['자', 'ja', '자전거', '자전거', '自転車', 'bicycle', 5, 'ㅈ + ㅏ'],
  ['차', 'cha', '차', '차(tea)', 'お茶', 'tea', 6, 'ㅊ + ㅏ'],
  ['카', 'ka', '카메라', '카메라', 'カメラ', 'camera', 4, 'ㅋ + ㅏ'],
  ['타', 'ta', '타다', '타다', '乗る', 'to ride', 5, 'ㅌ + ㅏ'],
  ['파', 'pa', '파도', '파도', '波', 'wave', 6, 'ㅍ + ㅏ'],
  ['하', 'ha', '하늘', '하늘', '空', 'sky', 5, 'ㅎ + ㅏ'],
] as const);

export const HANGUL_CONSONANTS = makeDeck('consonants', [
  ['ㄱ', 'g/k', '가방', '가방', 'かばん', 'bag', 2, '기본 자음'],
  ['ㄴ', 'n', '나라', '나라', '国', 'country', 2, '기본 자음'],
  ['ㄷ', 'd/t', '다리', '다리', '橋', 'bridge', 3, '기본 자음'],
  ['ㄹ', 'r/l', '라면', '라면', 'ラーメン', 'ramyeon', 5, '기본 자음'],
  ['ㅁ', 'm', '마음', '마음', '心・気持ち', 'heart, mind', 3, '기본 자음'],
  ['ㅂ', 'b/p', '바다', '바다', '海', 'sea', 4, '기본 자음'],
  ['ㅅ', 's', '사과', '사과', 'りんご', 'apple', 2, '기본 자음'],
  ['ㅇ', 'silent/ng', '아이', '아이', '子ども', 'child', 1, '초성에서는 소리가 없고 종성에서는 ng'],
  ['ㅈ', 'j', '자전거', '자전거', '自転車', 'bicycle', 3, '기본 자음'],
  ['ㅊ', 'ch', '치마', '치마', 'スカート', 'skirt', 4, '기본 자음'],
  ['ㅋ', 'k', '카메라', '카메라', 'カメラ', 'camera', 2, '기본 자음'],
  ['ㅌ', 't', '토끼', '토끼', 'うさぎ', 'rabbit', 3, '기본 자음'],
  ['ㅍ', 'p', '포도', '포도', 'ぶどう', 'grape', 4, '기본 자음'],
  ['ㅎ', 'h', '하늘', '하늘', '空', 'sky', 3, '기본 자음'],
] as const);

export const HANGUL_VOWELS = makeDeck('vowels', [
  ['ㅏ', 'a', '아이', '아이', '子ども', 'child', 2, '기본 모음'],
  ['ㅑ', 'ya', '야구', '야구', '野球', 'baseball', 3, '기본 모음'],
  ['ㅓ', 'eo', '어머니', '어머니', '母', 'mother', 2, '기본 모음'],
  ['ㅕ', 'yeo', '여자', '여자', '女性', 'woman', 3, '기본 모음'],
  ['ㅗ', 'o', '오이', '오이', 'きゅうり', 'cucumber', 2, '기본 모음'],
  ['ㅛ', 'yo', '요리', '요리', '料理', 'cooking', 3, '기본 모음'],
  ['ㅜ', 'u', '우유', '우유', '牛乳', 'milk', 2, '기본 모음'],
  ['ㅠ', 'yu', '유리', '유리', 'ガラス', 'glass', 3, '기본 모음'],
  ['ㅡ', 'eu', '음악', '음악', '音楽', 'music', 1, '기본 모음'],
  ['ㅣ', 'i', '이름', '이름', '名前', 'name', 1, '기본 모음'],
] as const);

export const HANGUL_DECKS: Record<HangulTrainerMode, readonly HangulCard[]> = {
  syllables: HANGUL_SYLLABLES,
  consonants: HANGUL_CONSONANTS,
  vowels: HANGUL_VOWELS,
};

export const HANGUL_MODE_ORDER: readonly HangulTrainerMode[] = ['syllables', 'consonants', 'vowels'];

export const HANGUL_STAGE_TITLES: Record<'ko' | 'ja' | 'en', Record<string, { title: string; description: string }>> = {
  ko: {
    observe: { title: '1. 관찰', description: '글자 모양, 소리 표기, 대표 단어를 함께 봅니다.' },
    recall: { title: '2. 가리기 인출', description: '글자를 가리고 먼저 소리와 대표 단어를 떠올립니다.' },
    write: { title: '3. 손으로 쓰기', description: '권장 횟수와 조합을 보며 크게 써 봅니다.' },
    writeQuiz: { title: '4. 손쓰기 퀴즈', description: '소리 표기만 보고 글자를 직접 씁니다.' },
    quiz: { title: '5. 즉시 테스트', description: '로마자 표기를 고르고 다음 복습 강도를 정합니다.' },
  },
  ja: {
    observe: { title: '1. 観察', description: '文字の形、発音表記、代表語を一緒に確認します。' },
    recall: { title: '2. 想起', description: '文字を隠し、音と代表語を先に思い出します。' },
    write: { title: '3. 手書き', description: '目安の画数と組み合わせを見て大きく書きます。' },
    writeQuiz: { title: '4. 手書きクイズ', description: '発音表記だけを見て文字を書きます。' },
    quiz: { title: '5. 即時テスト', description: 'ローマ字表記を選び、次の復習強度を決めます。' },
  },
  en: {
    observe: { title: '1. Observe', description: 'Study the shape, pronunciation label, and anchor word together.' },
    recall: { title: '2. Recall', description: 'Hide the character and retrieve its sound and anchor word first.' },
    write: { title: '3. Write', description: 'Write it large while checking the suggested strokes and composition.' },
    writeQuiz: { title: '4. Handwriting quiz', description: 'Write the character from its pronunciation label.' },
    quiz: { title: '5. Quick check', description: 'Choose its romanization and set the next review strength.' },
  },
};

export function labelFor(value: LocalizedLabel, language: 'ko' | 'ja' | 'en'): string {
  return value[language];
}
