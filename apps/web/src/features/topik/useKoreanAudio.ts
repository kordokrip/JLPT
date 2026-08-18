import { useCallback, useEffect, useRef, useState } from 'react';
import type { TopikPlacementAudioDto } from '@nihongo-n3/shared';
import { recordLearningActivity } from '../../lib/activity-events';

export interface KoreanSpeechActivityContext {
  contentType: string;
  contentId: string;
  levelTag?: string;
  section?: string;
}

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

  const speakText = useCallback((text: string, context?: KoreanSpeechActivityContext) => {
    stop();
    setError(null);
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setError('unavailable');
      if (context) void recordSpeechActivity(context, 'unavailable');
      return false;
    }
    const voices = window.speechSynthesis.getVoices();
    const koreanVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('ko'));
    const voice = koreanVoices.find((item) => `${item.name} ${item.voiceURI}`.toLowerCase().includes('google'));
    // Google voice only: never fall through to another provider or language.
    if (!voice) {
      setError('unavailable');
      if (context) void recordSpeechActivity(context, 'unavailable');
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
    try {
      window.speechSynthesis.speak(utterance);
      if (context) void recordSpeechActivity(context, 'played');
    } catch {
      setPlaying(false);
      setError('playback-failed');
      if (context) void recordSpeechActivity(context, 'error');
      return false;
    }
    return true;
  }, [stop]);

  const play = useCallback((source: TopikPlacementAudioDto, context?: KoreanSpeechActivityContext) => {
    if (source.kind === 'google') return speakText(source.text_ko, context);
    if (source.kind === 'unavailable') {
      stop();
      setError('unavailable');
      if (context) void recordSpeechActivity(context, 'unavailable');
      return false;
    }
    return false;
  }, [speakText, stop]);

  return { play, speakText, stop, playing, error };
}

async function recordSpeechActivity(
  context: KoreanSpeechActivityContext,
  speechOutcome: 'played' | 'unavailable' | 'error',
): Promise<void> {
  await recordLearningActivity({
    event_type: 'speech_attempted',
    learning_track: 'topik-ko',
    content_type: context.contentType,
    content_id: context.contentId,
    ...(context.levelTag !== undefined ? { level_tag: context.levelTag } : {}),
    ...(context.section !== undefined ? { section: context.section } : {}),
    speech_outcome: speechOutcome,
  }).catch(() => undefined);
}
