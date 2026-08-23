import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { audioPlayer } from '../../lib/audio';
import type { MouseEvent } from 'react';
import type { AudioSourcePreference } from '../../lib/audio';
import type { AudioSurface } from '@nihongo-n3/shared';

interface PronunciationButtonProps {
  text?: string | undefined;
  audioPath?: string | undefined;
  label?: string;
  className?: string;
  compact?: boolean;
  surface?: AudioSurface;
  prefer?: AudioSourcePreference;
  forceBrowser?: boolean;
  slow?: boolean;
  repeat?: number;
}

export function PronunciationButton({
  text,
  audioPath,
  label,
  className = '',
  compact = false,
  surface,
  prefer,
  forceBrowser = false,
  slow = false,
  repeat = 1,
}: PronunciationButtonProps) {
  const { t } = useTranslation();
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const playableText = text?.trim();
  if (!playableText && !audioPath) return null;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setPlaybackFailed(false);
    void audioPlayer.playPronunciation({
      text: playableText,
      audioPath,
      ...(surface ? { surface } : {}),
      ...(prefer ? { prefer } : {}),
      forceBrowser,
      slow,
      repeat,
      preferGoogleVoice: true,
    }).then((played) => setPlaybackFailed(!played)).catch(() => setPlaybackFailed(true));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={playbackFailed ? t('quiz.browserSpeechFallback') : (label ?? t('browse.playPronunciation'))}
      title={playbackFailed ? t('quiz.browserSpeechFallback') : undefined}
      className={[
        compact
          ? 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full'
          : 'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-[13px]',
        'border border-[var(--border)] bg-card text-[var(--muted-foreground)]',
        'hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors',
        className,
      ].join(' ')}
    >
      <SpeakerIcon className={compact ? 'h-4 w-4' : 'h-4 w-4'} />
      {!compact && <span>{playbackFailed ? t('quiz.browserSpeechFallback') : (label ?? t('browse.playPronunciation'))}</span>}
      {compact && playbackFailed && <span className="sr-only" role="alert">{t('quiz.browserSpeechFallback')}</span>}
    </button>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M18.36 5.64a9 9 0 010 12.72" />
    </svg>
  );
}
