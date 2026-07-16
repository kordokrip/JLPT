import type { JlptLevel, QuizAnswer, QuizMode } from './types';

export const QUIZ_MODES: QuizMode[] = ['vocab_mc', 'kanji_reading', 'grammar_fill', 'listening'];

export const QUIZ_MODE_ICONS: Record<QuizMode, string> = {
  vocab_mc: '📖',
  kanji_reading: '漢',
  grammar_fill: '✏️',
  listening: '🎧',
};

export const QUIZ_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3'];

export function isQuizMode(value: string | undefined): value is QuizMode {
  return value !== undefined && QUIZ_MODES.includes(value as QuizMode);
}

export function toQuizAnswers(answers: Record<string, string>): QuizAnswer[] {
  return Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
}
