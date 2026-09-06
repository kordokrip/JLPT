import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __audioQaSpeech?: Array<{ lang: string; voice: string | null }>;
  }
}

async function installGoogleSpeechMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spoken: Array<{ lang: string; voice: string | null }> = [];
    Object.defineProperty(window, '__audioQaSpeech', { configurable: true, value: spoken });
    class FakeSpeechSynthesisUtterance {
      lang = '';
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: SpeechSynthesisVoice | null = null;
      onstart: ((event: Event) => void) | null = null;
      onend: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(_text: string) {}
    }
    const voices = [
      { default: true, lang: 'ja-JP', localService: false, name: 'Google 日本語', voiceURI: 'google-ja-jp' },
      { default: true, lang: 'ko-KR', localService: false, name: 'Google 한국의', voiceURI: 'google-ko-kr' },
    ] as SpeechSynthesisVoice[];
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeSpeechSynthesisUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        cancel: () => undefined,
        resume: () => undefined,
        getVoices: () => voices,
        speak: (utterance: FakeSpeechSynthesisUtterance) => {
          spoken.push({ lang: utterance.lang, voice: utterance.voice?.voiceURI ?? null });
          utterance.onstart?.(new Event('start'));
          window.setTimeout(() => utterance.onend?.(new Event('end')), 0);
        },
      },
    });
  });
}

test('anonymous audio QA plays Japanese and Korean browser voices without an R2 request', async ({ page }) => {
  await installGoogleSpeechMock(page);
  const forbiddenAudioRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/v1/audio/') || /r2/i.test(url.hostname)) {
      forbiddenAudioRequests.push(request.url());
    }
  });

  await page.goto('/audio-qa');
  await expect(page).toHaveURL(/\/audio-qa$/);
  await expect(page.getByRole('heading', { name: '브라우저 발음 음성 확인' })).toBeVisible();

  await page.getByRole('button', { name: '브라우저 음성으로 재생' }).click();
  await expect.poll(() => page.evaluate(() => window.__audioQaSpeech ?? [])).toEqual([
    { lang: 'ja-JP', voice: 'google-ja-jp' },
  ]);
  const result = page.getByRole('status', { name: '재생 진단 결과' });
  await expect(result).toContainText('정상 종료 확인(실제 가청 여부는 별도 확인)');
  await expect(result).toContainText('일본어 1회 · 한국어 0회');

  await page.getByRole('tab', { name: '한국어' }).click();
  await page.getByRole('button', { name: '브라우저 음성으로 재생' }).click();
  await expect.poll(() => page.evaluate(() => window.__audioQaSpeech ?? [])).toEqual([
    { lang: 'ja-JP', voice: 'google-ja-jp' },
    { lang: 'ko-KR', voice: 'google-ko-kr' },
  ]);
  await expect(result).toContainText('마지막 재생 언어: 한국어');
  await expect(result).toContainText('일본어 1회 · 한국어 1회');
  await expect(result).toContainText('일본어 1개 · 한국어 1개');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('audio[src]')).toHaveCount(0);
  expect(forbiddenAudioRequests).toEqual([]);
});
