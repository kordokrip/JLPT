import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';

/**
 * e2e/srs-review.spec.ts
 *
 * SRS 복습 플로우 테스트
 * - 복습 화면 진입
 * - Space 키로 답안 표시
 * - Good(4) 버튼 클릭으로 카드 1장 완료
 * - 결과 화면 또는 다음 카드로 전환 확인
 */
async function ensureReviewCard(page: import('@playwright/test').Page) {
  const cardFront = page.locator('[data-testid="card-front"], .card-front, [data-testid="question"]').first();
  if (await cardFront.isVisible().catch(() => false)) return true;

  const starterButton = page.getByRole('button', { name: /카드 10장 시작|Start 10 cards|10枚を開始/i });
  if (await starterButton.isVisible().catch(() => false)) {
    if (!(await starterButton.isEnabled().catch(() => false))) return false;
    await starterButton.click();
    await expect(cardFront).toBeVisible({ timeout: 15_000 });
    return true;
  }

  return false;
}

test.describe('SRS 복습 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('복습 화면에 진입할 수 있다', async ({ page }) => {
    await page.goto('/review');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // 복습 화면 또는 "복습할 카드 없음" 메시지 중 하나가 표시
    const reviewCard = page.locator(
      '[data-testid="review-card"], .review-card, [data-testid="no-cards"]',
    ).first();
    const emptyState = page.getByRole('heading', { name: /오늘 복습 없음|No reviews today|今日は復習なし/i });

    await expect(reviewCard.or(emptyState))
      .toBeVisible({ timeout: 10_000 });
  });

  test('복습 발음은 일본어 browser voice만 사용한다', async ({ page }) => {
    const serverAudioRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/v1/audio/')) {
        serverAudioRequests.push(request.url());
      }
    });
    await page.addInitScript(() => {
      const spoken: Array<{ lang: string; voice: string | null }> = [];
      Object.defineProperty(window, '__reviewPronunciationForTest', {
        value: spoken,
        configurable: true,
      });

      class FakeSpeechSynthesisUtterance {
        lang = '';
        rate = 1;
        pitch = 1;
        volume = 1;
        voice: SpeechSynthesisVoice | null = null;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor(_text: string) {}
      }

      const googleJapanese = {
        default: false,
        lang: 'ja-JP',
        localService: false,
        name: 'Google 日本語',
        voiceURI: 'google-ja-jp',
      } as SpeechSynthesisVoice;
      const german = {
        default: true,
        lang: 'de-DE',
        localService: true,
        name: 'Deutsch',
        voiceURI: 'de-de',
      } as SpeechSynthesisVoice;
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        value: FakeSpeechSynthesisUtterance,
      });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          cancel: () => undefined,
          getVoices: () => [german, googleJapanese],
          speak: (utterance: FakeSpeechSynthesisUtterance) => {
            spoken.push({ lang: utterance.lang, voice: utterance.voice?.voiceURI ?? null });
            utterance.onstart?.();
            utterance.onend?.();
          },
        },
      });
    });

    await page.goto('/review');
    if (!(await ensureReviewCard(page))) {
      test.skip();
      return;
    }

    await page.getByRole('button', { name: /발음 재생|Play pronunciation|発音を再生/ }).first().click();
    await expect.poll(async () => page.evaluate(() => (
      window as unknown as { __reviewPronunciationForTest: unknown[] }
    ).__reviewPronunciationForTest.length)).toBe(1);
    const spoken = await page.evaluate(() => (
      window as unknown as {
        __reviewPronunciationForTest: Array<{ lang: string; voice: string | null }>;
      }
    ).__reviewPronunciationForTest);

    expect(spoken[0]).toEqual({ lang: 'ja-JP', voice: 'google-ja-jp' });
    expect(serverAudioRequests, 'legacy R2 audio must not be requested').toEqual([]);
  });

  test('카드가 있으면 Space 키로 답안을 표시한다', async ({ page }) => {
    await page.goto('/review');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    if (!(await ensureReviewCard(page))) {
      test.skip();
      return;
    }

    // 질문(앞면) 표시 대기
    const question = page.locator(
      '[data-testid="card-front"], .card-front, [data-testid="question"]',
    ).first();
    await expect(question).toBeVisible({ timeout: 10_000 });

    // Space 키로 답안 표시 (뒷면)
    await page.keyboard.press('Space');

    const answer = page.locator(
      '[data-testid="card-back"], .card-back, [data-testid="answer"], .rating-buttons',
    ).first();
    await expect(answer).toBeVisible({ timeout: 5_000 });
  });

  test('Good 버튼 클릭으로 카드 1장을 완료한다', async ({ page }) => {
    await page.goto('/review');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    if (!(await ensureReviewCard(page))) {
      test.skip();
      return;
    }

    // 앞면 대기
    await page.waitForSelector(
      '[data-testid="card-front"], .card-front, [data-testid="question"]',
      { timeout: 10_000 },
    );

    // Space 키로 뒤집기
    await page.keyboard.press('Space');

    // Good 버튼 클릭 (텍스트 매칭)
    const goodBtn = page.locator(
      'button:has-text("Good"), button:has-text("좋아요"), button:has-text("4"), [data-rating="good"]',
    ).first();
    await expect(goodBtn).toBeVisible({ timeout: 5_000 });
    await goodBtn.click();

    // 카드가 다음으로 넘어가거나 완료 화면이 표시되어야 함
    await page.waitForTimeout(500);
    // 응답 후 어떤 상태로든 에러 없이 전환됨을 확인
    const errorMessage = page.locator('text=/error|오류|실패/i');
    await expect(errorMessage).not.toBeVisible();
  });
});
