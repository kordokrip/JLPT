import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { audioPlayer, buildAudioUrl } from '../../lib/audio';
import { initialListeningAudioSource } from './logic';
import { LISTENING_SKIP_BACK_SECONDS, MAX_LISTENING_PLAYS } from './types';
import type { ListeningAudioSource } from './types';

export function ListeningAudioPlayer({
  audioKey,
  fallbackText,
  onPlaysExhausted,
}: {
  audioKey?: string | undefined;
  fallbackText?: string | undefined;
  onPlaysExhausted?: () => void;
}) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [source, setSource] = useState<ListeningAudioSource>(() => initialListeningAudioSource(Boolean(audioKey)));
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  const src = audioKey ? buildAudioUrl(audioKey) : '';
  const useBrowserSpeech = source === 'browser' || audioUnavailable || !audioKey;

  const handlePlayPause = useCallback(() => {
    const el = audioRef.current;

    if (useBrowserSpeech || !el) {
      if (!fallbackText) return;
      if (playCount >= MAX_LISTENING_PLAYS) { onPlaysExhausted?.(); return; }
      setPlayCount((n) => n + 1);
      void audioPlayer.speakText(fallbackText, {
        lang: 'ja-JP',
        preferGoogleVoice: true,
        onStart: () => setPlaying(true),
        onEnd: () => setPlaying(false),
        onError: () => setPlaying(false),
      });
      return;
    }

    if (el.paused) {
      if (playCount >= MAX_LISTENING_PLAYS) { onPlaysExhausted?.(); return; }
      el.playbackRate = audioPlayer.rate;
      el.play().catch(console.error);
    } else {
      el.pause();
    }
  }, [fallbackText, playCount, onPlaysExhausted, useBrowserSpeech]);

  const handleSkipBack = useCallback(() => {
    if (useBrowserSpeech || !audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - LISTENING_SKIP_BACK_SECONDS);
  }, [useBrowserSpeech]);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      {audioKey && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          ref={audioRef}
          src={src}
          preload="auto"
          onPlay={() => {
            setPlaying(true);
            setPlayCount((n) => n + 1);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setAudioUnavailable(true)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />
      )}

      {audioKey && fallbackText && (
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-alt)] p-1" role="group" aria-label={t('quiz.audioSource')}>
          {(['browser', 'server'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                audioRef.current?.pause();
                audioPlayer.stop();
                setPlaying(false);
                setAudioUnavailable(false);
                setSource(option);
              }}
              className={[
                'min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors',
                source === option
                  ? 'bg-[var(--card)] text-[var(--accent)] shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:text-foreground',
              ].join(' ')}
            >
              {option === 'browser' ? t('quiz.browserVoice') : t('quiz.serverAudio')}
            </button>
          ))}
        </div>
      )}

      <div
        className="h-1.5 w-full rounded-full bg-[var(--surface-alt)] overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(progressPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-75 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          aria-label={t('quiz.rewindSeconds', { seconds: LISTENING_SKIP_BACK_SECONDS })}
          onClick={handleSkipBack}
          disabled={useBrowserSpeech}
          className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 text-[var(--muted-foreground)] hover:text-foreground transition-colors disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
            <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
          <span className="text-[10px] font-pretendard">{t('quiz.rewindSeconds', { seconds: LISTENING_SKIP_BACK_SECONDS })}</span>
        </button>

        <button
          type="button"
          aria-label={playing ? t('common.pause') : t('common.play')}
          onClick={handlePlayPause}
          disabled={!playing && playCount >= MAX_LISTENING_PLAYS}
          className="w-14 h-14 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex flex-col items-center gap-1 text-[var(--muted-foreground)]">
          <div className="flex gap-1">
            {Array.from({ length: MAX_LISTENING_PLAYS }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < playCount ? 'bg-[var(--accent)]' : 'bg-[var(--surface-alt)]'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-pretendard">
            {t('quiz.playsCount', { count: playCount, max: MAX_LISTENING_PLAYS })}
          </span>
        </div>
      </div>

      {playCount >= MAX_LISTENING_PLAYS && (
        <p className="text-center text-[12px] text-[var(--destructive)] font-pretendard">
          {t('quiz.maxPlaysReached')}
        </p>
      )}
      {useBrowserSpeech && fallbackText && (
        <p className="text-center text-[12px] text-[var(--muted-foreground)] font-pretendard">
          {source === 'browser' ? t('quiz.browserSpeechPreferred') : t('quiz.browserSpeechFallback')}
        </p>
      )}
    </div>
  );
}
