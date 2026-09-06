import type { JlptLevel } from '@nihongo-n3/shared';

export type CharacterMode = 'hiragana' | 'katakana' | 'kanji';
export type CharacterStage = 'observe' | 'recall' | 'write' | 'writeQuiz' | 'quiz';
export type { JlptLevel } from '@nihongo-n3/shared';

export type KanaCard = {
  id: string;
  mode: 'hiragana' | 'katakana';
  char: string;
  reading: string;
  meaning: string;
  strokeCount: number;
  hint: string;
};

export type StudyCard = KanaCard | {
  id: string;
  mode: 'kanji';
  char: string;
  reading: string;
  meaning: string;
  strokeCount: number;
  hint: string;
  level: JlptLevel;
};

export type KanaPronunciationExample = {
  word: string;
  reading: string;
  meaning: string;
};

export type DrawingEvaluation = {
  status: 'empty' | 'retry' | 'good';
  score: number;
  message: string;
  details: string[];
};

export type DrawingStats = {
  strokeCount: number;
  pointCount: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  canvasWidth: number;
  canvasHeight: number;
  expectedStrokes: number;
};
