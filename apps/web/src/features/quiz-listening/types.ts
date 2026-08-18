import type { JlptLevel } from '@nihongo-n3/shared';

export const MAX_LISTENING_PLAYS = 3;

export interface ListeningQuestion {
  id: string;
  type: string;
  prompt: string;
  choices: string[];
  script_ja?: string | undefined;
  script_ko?: string | undefined;
}

export interface ListeningQuizResponse {
  quiz_id: number;
  mode: 'listening';
  level: JlptLevel;
  questions: ListeningQuestion[];
}

export interface ListeningSubmitResponse {
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

export type SubmittedAnswer = { question_id: string; answer: string };
