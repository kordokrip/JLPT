import { useCallback, useEffect, useRef, useState } from 'react';
import type { TopikPlacementAudioDto } from '@nihongo-n3/shared';

export function useKoreanAudio() {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<'unsupported' | 'voice-unavailable' | 'playback-failed' | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  useEffect(() => stop, [stop]);

  const speakText = useCallback((text: string) => {
    stop();
    setError(null);
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setError('unsupported');
      return false;
    }
    const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith('ko'));
    // Never let an unrelated system-default voice pronounce Korean content.
    // Devices without a Korean voice show an explicit unavailable state instead.
    if (!voice) {
      setError('voice-unavailable');
      return false;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.86;
    utterance.pitch = 1;
    utterance.voice = voice;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => {
      setPlaying(false);
      setError('playback-failed');
    };
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
    return true;
  }, [stop]);

  const play = useCallback((source: TopikPlacementAudioDto) => {
    if (source.kind === 'browser-fallback') return speakText(source.text_ko);
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
  }, [speakText, stop]);

  return { play, speakText, stop, playing, error };
}
