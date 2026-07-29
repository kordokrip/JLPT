import { expect, test } from '@playwright/test';

import { mockTopikReadApis, registerTopikUser } from './topik-helper';

declare global {
  interface Window {
    __topikSpeechCalls?: number;
  }
}

test.describe('TOPIK 1–6 owner-authored curriculum local fixture', () => {
  test('grade 1 local D1 fixture reaches API and PWA without browser speech or public-bank changes', async ({ page }) => {
    await page.addInitScript(() => {
      window.__topikSpeechCalls = 0;
      try {
        const synthesis = window.speechSynthesis;
        const originalSpeak = synthesis.speak.bind(synthesis);
        synthesis.speak = ((utterance: SpeechSynthesisUtterance) => {
          window.__topikSpeechCalls = (window.__topikSpeechCalls ?? 0) + 1;
          originalSpeak(utterance);
        }) as typeof synthesis.speak;
      } catch {
        // The assertion below still proves there was no learning-path trigger.
      }
    });
    await mockTopikReadApis(page);
    await registerTopikUser(page);

    const audioRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/audio/')) audioRequests.push(request.url());
    });
    const fixtureResponse = page.waitForResponse((response) =>
      response.url().includes('/api/v1/tracks/topik-ko/curriculum?target_grade=1') && response.request().method() === 'GET',
    );
    await page.goto('/track/topik-ko/learn');
    const response = await fixtureResponse;
    expect(response.status()).toBe(200);
    const payload = await response.json() as { data: { target_grade: number; units: Array<{ title_ko: string; items: Array<Record<string, unknown>> }> } };
    expect(payload.data.target_grade).toBe(1);
    expect(payload.data.units).toHaveLength(1);
    expect(payload.data.units[0]?.title_ko).toBe('인사와 자기소개');
    expect(JSON.stringify(payload)).not.toContain('answer_index');
    expect(JSON.stringify(payload)).not.toContain('해설');

    await page.getByRole('tab', { name: '1급', exact: true }).click();
    await page.getByRole('button', { name: '인사와 자기소개 학습 시작' }).click();
    const vocabCard = page.locator('article').filter({ hasText: 'Which meaning best matches 안녕하세요?' });
    await expect(vocabCard).toBeVisible();
    await expect(page.getByText('오디오 준비 중')).toHaveCount(2);
    await vocabCard.getByRole('radio', { name: '처음 만날 때의 인사' }).click();
    await vocabCard.getByRole('button', { name: '정답과 해설 보기' }).click();
    await expect(vocabCard.getByText('안녕하세요 can be used when first meeting someone or greeting politely.')).toBeVisible();
    expect(audioRequests).toEqual([]);
    await expect.poll(() => page.evaluate(() => window.__topikSpeechCalls ?? 0)).toBe(0);
  });
});
