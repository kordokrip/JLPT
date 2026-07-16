export type QuizMode = 'vocab_mc' | 'grammar_fill' | 'kanji_reading' | 'listening';

export type JlptLevel = 'N5' | 'N4' | 'N3';

export interface QuizQuestion {
  id: string;
  type: string;
  prompt: string;
  choices: string[];
  audio_key?: string;
  script_ja?: string;
  script_ko?: string;
}

export interface QuizGenerateResponse {
  quiz_id: number;
  mode: QuizMode;
  level: JlptLevel;
  questions: QuizQuestion[];
}

export interface QuizSubmitResponse {
  quiz_id: number;
  score: number;
  correct: number;
  total: number;
  detail: Array<{
    question_id: string;
    submitted: string;
    correct: string;
    is_correct: boolean;
  }>;
}

export type QuizAnswer = {
  question_id: string;
  answer: string;
};
