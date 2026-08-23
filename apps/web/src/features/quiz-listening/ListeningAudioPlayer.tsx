import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { audioPlayer } from '../../lib/audio';
import { MAX_LISTENING_PLAYS } from './types';
import { recordLearningActivity } from '../../lib/activity-events';
import type { JlptLevel } from '@nihongo-n3/shared';

/** Listening prefers Google and falls back to the same-language browser voice; it never requests R2 audio. */
export function ListeningAudioPlayer({
  fallbackText,
  questionId,
  level,
  onPlaysExhausted,
}: {
  fallbackText?: string | undefined;
  questionId: string;
  level: JlptLevel;
  onPlaysExhausted?: () => void;
}) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  const handlePlay = useCallback(() => {
    if (!fallbackText || playCount >= MAX_LISTENING_PLAYS) {
      if (playCount >= MAX_LISTENING_PLAYS) onPlaysExhausted?.();
      return;
    }
    setPlaybackFailed(false);
    setPlayCount((count) => count + 1);
    void audioPlayer.speakText(fallbackText, {
      lang: 'ja-JP',
      preferGoogleVoice: true,
      onStart: () => setPlaying(true),
      onEnd: () => setPlaying(false),
      onError: () => {
        setPlaying(false);
        setPlaybackFailed(true);
      },
    }).then((played) => {
      if (!played) setPlaybackFailed(true);
      void recordLearningActivity({
        event_type: 'speech_attempted',
        learning_track: 'jlpt-ja',
        content_type: 'jlpt_practice_question',
        content_id: questionId,
        level_tag: level,
        mode: 'listening',
        speech_outcome: played ? 'played' : 'unavailable',
      }).catch(() => undefined);
    }).catch(() => {
      setPlaying(false);
      setPlaybackFailed(true);
      void recordLearningActivity({
        event_type: 'speech_attempted',
        learning_track: 'jlpt-ja',
        content_type: 'jlpt_practice_question',
        content_id: questionId,
        level_tag: level,
        mode: 'listening',
        speech_outcome: 'error',
      }).catch(() => undefined);
    });
  }, [fallbackText, level, onPlaysExhausted, playCount, questionId]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      <p className="text-center text-[12px] text-[var(--muted-foreground)] font-pretendard">
        {t('quiz.browserSpeechPreferred')}
      </p>
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          aria-label={playing ? t('common.pause') : t('common.play')}
          onClick={handlePlay}
          disabled={!fallbackText || (!playing && playCount >= MAX_LISTENING_PLAYS)}
          className="w-14 h-14 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
            {playing ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /> : <path d="M8 5v14l11-7z" />}
          </svg>
        </button>
        <div className="flex flex-col items-center gap-1 text-[var(--muted-foreground)]">
          <div className="flex gap-1">
            {Array.from({ length: MAX_LISTENING_PLAYS }).map((_, index) => (
              <span key={index} className={`w-2 h-2 rounded-full ${index < playCount ? 'bg-[var(--accent)]' : 'bg-[var(--surface-alt)]'}`} />
            ))}
          </div>
          <span className="text-[10px] font-pretendard">{t('quiz.playsCount', { count: playCount, max: MAX_LISTENING_PLAYS })}</span>
        </div>
      </div>
      {playCount >= MAX_LISTENING_PLAYS && <p className="text-center text-[12px] text-[var(--destructive)] font-pretendard">{t('quiz.maxPlaysReached')}</p>}
      {playbackFailed && <p role="alert" className="text-center text-[12px] text-[var(--destructive)] font-pretendard">{t('quiz.browserSpeechFallback')}</p>}
    </div>
  );
}
