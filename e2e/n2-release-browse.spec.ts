import { expect, test, type Page } from '@playwright/test';

import { ensureAuthenticated } from './auth-helper';

declare global {
  interface Window {
    __jlptGoogleSpeech?: Array<{ lang: string; voice: string | null }>;
  }
}

async function installGoogleJapaneseSpeechMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spoken: Array<{ lang: string; voice: string | null }> = [];
    Object.defineProperty(window, '__jlptGoogleSpeech', { configurable: true, value: spoken });
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
    const googleJapanese = {
      default: true,
      lang: 'ja-JP',
      localService: true,
      name: 'Google 日本語',
      voiceURI: 'google-ja-jp',
    } as SpeechSynthesisVoice;
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeSpeechSynthesisUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        cancel: () => undefined,
        getVoices: () => [googleJapanese],
        speak: (utterance: FakeSpeechSynthesisUtterance) => {
          spoken.push({ lang: utterance.lang, voice: utterance.voice?.voiceURI ?? null });
          utterance.onstart?.(new Event('start'));
          utterance.onend?.(new Event('end'));
        },
      },
    });
  });
}

test.describe('N2/N1 public learning contract', () => {
  test('releases contiguous N5–N1 levels from the actual seeded primary learning surfaces', async ({ page }) => {
    await ensureAuthenticated(page);
    const status = await page.request.get('/api/v1/tracks/jlpt-ja/status');
    expect(status.status()).toBe(200);
    expect(await status.json()).toMatchObject({
      data: {
        track: 'jlpt-ja',
        content_release: 'n5-n1',
        available_levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
      },
    });
    await page.goto('/');
    await expect(page.getByText(/N5부터 N1까지의 콘텐츠가 준비되었습니다/)).toBeVisible();
    await expect(page.getByLabel('학습 범위').getByText('N1', { exact: true })).toBeVisible();

    await page.goto('/browse/vocab');
    await expect(page.getByRole('button', { name: 'N2', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'N1', exact: true })).toBeVisible();
  });

  test('shows actual N2 Batches 4–5 and N1 Batches 3–4 material and plays every tested JLPT surface through Google speech only', async ({ page }) => {
    await installGoogleJapaneseSpeechMock(page);
    const audioRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/audio/')) audioRequests.push(request.url());
    });
    await ensureAuthenticated(page);

    await page.goto('/browse/vocab');
    await page.getByRole('button', { name: 'N2', exact: true }).click();
    await page.getByRole('searchbox', { name: '어휘 검색' }).fill('登録');
    const n2Registration = page.locator('article').filter({ hasText: /登録[\s\S]*N2/ });
    await expect(n2Registration).toHaveCount(1);
    await expect(n2Registration.getByText('登録', { exact: true })).toBeVisible();
    await expect(n2Registration.getByText('등록', { exact: true })).toBeVisible();
    await n2Registration.getByRole('button', { name: '登録 발음 재생' }).click();
    await expect.poll(() => page.evaluate(() => window.__jlptGoogleSpeech ?? [])).toEqual([
      { lang: 'ja-JP', voice: 'google-ja-jp' },
    ]);

    await page.getByRole('searchbox', { name: '어휘 검색' }).fill('自治体');
    const n2Municipality = page.locator('article').filter({ hasText: /自治体[\s\S]*N2/ });
    await expect(n2Municipality).toHaveCount(1);
    await expect(n2Municipality.getByText('自治体', { exact: true })).toBeVisible();
    await expect(n2Municipality.getByText('지방자치단체', { exact: true })).toBeVisible();
    await n2Municipality.getByRole('button', { name: '自治体 발음 재생' }).click();
    await expect.poll(() => page.evaluate(() => window.__jlptGoogleSpeech?.length ?? 0)).toBe(2);

    await page.getByRole('button', { name: 'N1', exact: true }).click();
    await page.getByRole('searchbox', { name: '어휘 검색' }).fill('論点');
    const n1Point = page.locator('article').filter({ hasText: /論点[\s\S]*N1/ });
    await expect(n1Point).toHaveCount(1);
    await expect(n1Point.getByText('論点', { exact: true })).toBeVisible();
    await expect(n1Point.getByText('논점', { exact: true })).toBeVisible();
    await n1Point.getByRole('button', { name: '論点 발음 재생' }).click();
    await expect.poll(() => page.evaluate(() => window.__jlptGoogleSpeech?.length ?? 0)).toBe(3);

    await page.getByRole('searchbox', { name: '어휘 검색' }).fill('命題');
    const n1Proposition = page.locator('article').filter({ hasText: /命題[\s\S]*N1/ });
    await expect(n1Proposition).toHaveCount(1);
    await expect(n1Proposition.getByText('命題', { exact: true })).toBeVisible();
    await expect(n1Proposition.getByText('명제', { exact: true })).toBeVisible();
    await n1Proposition.getByRole('button', { name: '命題 발음 재생' }).click();
    await expect.poll(() => page.evaluate(() => window.__jlptGoogleSpeech?.length ?? 0)).toBe(4);

    await page.goto('/browse/grammar');
    await page.getByRole('button', { name: 'N2', exact: true }).click();
    await page.getByRole('searchbox', { name: '문법 검색' }).fill('に限って');
    await expect(page.getByText('に限って', { exact: true })).toBeVisible();
    await page.getByRole('searchbox', { name: '문법 검색' }).fill('に基づいて');
    await expect(page.getByText('に基づいて', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'N1', exact: true }).click();
    await page.getByRole('searchbox', { name: '문법 검색' }).fill('にかたくない');
    await expect(page.getByText('にかたくない', { exact: true })).toBeVisible();
    await page.getByRole('searchbox', { name: '문법 검색' }).fill('に照らして');
    await expect(page.getByText('に照らして', { exact: true })).toBeVisible();

    await page.goto('/reading');
    await page.getByRole('button', { name: 'N2', exact: true }).click();
    await expect(page.getByRole('button', { name: 'オンライン申請の手順' })).toBeVisible();
    await expect(page.getByRole('button', { name: '証明書の交付を申し込む' })).toBeVisible();
    await page.getByRole('button', { name: 'N1', exact: true }).click();
    await expect(page.getByRole('button', { name: '制度評価の前提' })).toBeVisible();
    await expect(page.getByRole('button', { name: '政策評価における視座' })).toBeVisible();

    await page.goto('/quiz/listening?level=N2');
    await expect(page.getByText('1 / 5')).toBeVisible();
    await page.getByRole('button', { name: /재생|Play|再生/ }).click();
    await expect.poll(() => page.evaluate(() => window.__jlptGoogleSpeech ?? [])).toEqual([
      { lang: 'ja-JP', voice: 'google-ja-jp' },
    ]);
    expect(audioRequests, 'R2 pronunciation endpoint must never be requested').toEqual([]);
  });
});
