import { prefersBrowserAudio } from '@nihongo-n3/shared';
import type { ListeningAudioSource, SubmittedAnswer } from './types';

export function toSubmittedAnswers(answers: Record<string, string>): SubmittedAnswer[] {
  return Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
}

export function initialListeningAudioSource(hasServerAudio: boolean): ListeningAudioSource {
  return hasServerAudio && !prefersBrowserAudio('listening') ? 'server' : 'browser';
}
