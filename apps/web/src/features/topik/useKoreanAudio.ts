import { useCallback, useEffect, useRef, useState } from 'react';
import type { TopikPlacementAudioDto } from '@nihongo-n3/shared';
import { recordLearningActivity } from '../../lib/activity-events';
import { isGoogleVoiceForLanguage, waitForGoogleBrowserVoice } from '../../lib/google-browser-speech';

export interface KoreanSpeechActivityContext {
  contentType: string;
  contentId: string;
  levelTag?: string;
  section?: string;
}

export function isGoogleKoreanVoice(
  voice: Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'voiceURI'>,
): boolean {
  return isGoogleVoiceForLanguage(voice, 'ko-KR');
}

function currentGoogleKoreanVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  return window.speechSynthesis.getVoices().find(isGoogleKoreanVoice) ?? null;
}

export async function waitForGoogleKoreanVoice(
  timeoutMs?: number,
): Promise<SpeechSynthesisVoice | null> {
  return waitForGoogleBrowserVoice('ko-KR', timeoutMs);
}

export function useKoreanAudio() {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<'unavailable' | 'playback-failed' | null>(null);
  const operationRef = useRef(0);
  const pendingCancelRef = useRef<(() => void) | null>(null);
  const voicePromiseRef = useRef<Promise<SpeechSynthesisVoice | null> | null>(null);

  const resolveVoice = useCallback(() => {
    const immediate = currentGoogleKoreanVoice();
    if (immediate) return Promise.resolve(immediate);
    if (voicePromiseRef.current) return voicePromiseRef.current;
    const pending = waitForGoogleKoreanVoice();
    voicePromiseRef.current = pending;
    void pending.finally(() => {
      if (voicePromiseRef.current === pending) voicePromiseRef.current = null;
    });
    return pending;
  }, []);

  const stop = useCallback(() => {
    operationRef.current += 1;
    pendingCancelRef.current?.();
    pendingCancelRef.current = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setPlaying(false);
  }, []);

  useEffect(() => {
    // Warm the asynchronously populated Chrome voice list before the first click.
    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) void resolveVoice();
    return () => {
      operationRef.current += 1;
      pendingCancelRef.current?.();
      pendingCancelRef.current = null;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [resolveVoice]);

  const speakText = useCallback(async (text: string, context?: KoreanSpeechActivityContext): Promise<boolean> => {
    stop();
    const operation = operationRef.current;
    setError(null);
    setPlaying(true);
    if (!text.trim() || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setPlaying(false);
      setError('unavailable');
      if (context) void recordSpeechActivity(context, 'unavailable');
      return false;
    }

    const voice = await resolveVoice();
    if (operation !== operationRef.current) return false;
    // Google voice only: never fall through to another provider or language.
    if (!voice || !isGoogleKoreanVoice(voice)) {
      setPlaying(false);
      setError('unavailable');
      if (context) void recordSpeechActivity(context, 'unavailable');
      return false;
    }

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'ko-KR';
    utterance.rate = 0.86;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.voice = voice;

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (result: boolean, outcome?: 'played' | 'error') => {
        if (settled) return;
        settled = true;
        if (pendingCancelRef.current === cancelPending) pendingCancelRef.current = null;
        if (operation === operationRef.current) {
          setPlaying(false);
          if (!result) setError('playback-failed');
          if (context && outcome) void recordSpeechActivity(context, outcome);
        }
        resolve(result);
      };
      const cancelPending = () => finish(false);
      pendingCancelRef.current = cancelPending;
      utterance.onend = () => finish(true, 'played');
      utterance.onerror = () => finish(false, 'error');

      try {
        window.speechSynthesis.resume?.();
        window.speechSynthesis.speak(utterance);
      } catch {
        finish(false, 'error');
      }
    });
  }, [resolveVoice, stop]);

  const play = useCallback(async (
    source: TopikPlacementAudioDto,
    context?: KoreanSpeechActivityContext,
  ): Promise<boolean> => {
    if (source.kind === 'google') return speakText(source.text_ko, context);
    stop();
    setError('unavailable');
    if (context) void recordSpeechActivity(context, 'unavailable');
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
