export const GOOGLE_BROWSER_VOICE_WAIT_MS = 2_500;

export function isGoogleVoiceForLanguage(
  voice: Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'voiceURI'>,
  language: string,
): boolean {
  const prefix = language.split('-')[0]?.toLowerCase() || language.toLowerCase();
  const identity = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  return voice.lang.toLowerCase().startsWith(prefix) && identity.includes('google');
}

export function isVoiceForLanguage(
  voice: Pick<SpeechSynthesisVoice, 'lang'>,
  language: string,
): boolean {
  const prefix = language.split('-')[0]?.toLowerCase() || language.toLowerCase();
  return voice.lang.toLowerCase().startsWith(prefix);
}

export function selectBrowserVoiceForLanguage<T extends Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'voiceURI' | 'default'>>(
  voices: readonly T[],
  language: string,
): T | undefined {
  const matching = voices.filter((voice) => isVoiceForLanguage(voice, language));
  return matching.find((voice) => isGoogleVoiceForLanguage(voice, language))
    ?? matching.find((voice) => voice.default)
    ?? matching[0];
}

function currentGoogleVoice(language: string): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  return window.speechSynthesis.getVoices().find((voice) => isGoogleVoiceForLanguage(voice, language)) ?? null;
}

function currentBrowserVoice(language: string): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  return selectBrowserVoiceForLanguage(window.speechSynthesis.getVoices(), language) ?? null;
}

/** Waits for Chromium's asynchronously populated remote Google voice list. */
export async function waitForGoogleBrowserVoice(
  language: string,
  timeoutMs = GOOGLE_BROWSER_VOICE_WAIT_MS,
): Promise<SpeechSynthesisVoice | null> {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return null;
  const immediate = currentGoogleVoice(language);
  if (immediate) return immediate;

  return new Promise((resolve) => {
    const synthesis = window.speechSynthesis;
    let settled = false;
    const finish = (voice: SpeechSynthesisVoice | null) => {
      if (settled) return;
      settled = true;
      window.clearInterval(pollId);
      window.clearTimeout(timeoutId);
      synthesis.removeEventListener?.('voiceschanged', onVoicesChanged);
      resolve(voice);
    };
    const check = () => {
      const voice = currentGoogleVoice(language);
      if (voice) finish(voice);
    };
    const onVoicesChanged = () => check();
    const pollId = window.setInterval(check, 50);
    const timeoutId = window.setTimeout(() => finish(null), timeoutMs);
    synthesis.addEventListener?.('voiceschanged', onVoicesChanged);
    // A second read is intentional: Chromium starts populating remote voices lazily.
    check();
  });
}

/** Google is preferred, but an installed voice for the same language keeps playback available. */
export async function waitForBrowserVoice(
  language: string,
  timeoutMs = GOOGLE_BROWSER_VOICE_WAIT_MS,
): Promise<SpeechSynthesisVoice | null> {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return null;
  const immediate = currentBrowserVoice(language);
  if (immediate) return immediate;

  return new Promise((resolve) => {
    const synthesis = window.speechSynthesis;
    let settled = false;
    const finish = (voice: SpeechSynthesisVoice | null) => {
      if (settled) return;
      settled = true;
      window.clearInterval(pollId);
      window.clearTimeout(timeoutId);
      synthesis.removeEventListener?.('voiceschanged', onVoicesChanged);
      resolve(voice);
    };
    const check = () => {
      const voice = currentBrowserVoice(language);
      if (voice) finish(voice);
    };
    const onVoicesChanged = () => check();
    const pollId = window.setInterval(check, 50);
    const timeoutId = window.setTimeout(() => finish(null), timeoutMs);
    synthesis.addEventListener?.('voiceschanged', onVoicesChanged);
    check();
  });
}
