import type { SubmittedAnswer } from './types';

export function toSubmittedAnswers(answers: Record<string, string>): SubmittedAnswer[] {
  return Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
}
