import { useCallback, useEffect, useRef, useState } from 'react';
import type { TopikPlacementAudioDto } from '@nihongo-n3/shared';

export function useKoreanAudio() {
  const [playing, setPlaying] = useState(false);
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
    if (!('speechSynthesis' in window)) return false;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.86;
    utterance.pitch = 1;
    const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith('ko'));
    if (voice) utterance.voice = voice;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
    return true;
  }, [stop]);

  const play = useCallback((source: TopikPlacementAudioDto) => {
    if (source.kind === 'browser-fallback') return speakText(source.text_ko);
    stop();
    const audio = new Audio(source.url);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    setPlaying(true);
    void audio.play().catch(() => setPlaying(false));
    return true;
  }, [speakText, stop]);

  return { play, speakText, stop, playing };
}
