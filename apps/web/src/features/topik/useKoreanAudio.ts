import { useCallback, useEffect, useRef, useState } from 'react';
import type { TopikPlacementAudioDto } from '@nihongo-n3/shared';

export function useKoreanAudio() {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<'unavailable' | 'playback-failed' | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback((source: TopikPlacementAudioDto) => {
    if (source.kind === 'unavailable') {
      stop();
      setError('unavailable');
      return false;
    }
    stop();
    setError(null);
    const audio = new Audio(source.url);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => {
      setPlaying(false);
      setError('playback-failed');
    };
    setPlaying(true);
    void audio.play().catch(() => {
      setPlaying(false);
      setError('playback-failed');
    });
    return true;
  }, [stop]);

  return { play, stop, playing, error };
}
