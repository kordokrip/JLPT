import { expect, test } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';

test.describe('학습 통계', () => {
  test('인증된 사용자에게 스트릭과 히트맵을 API 오류 없이 표시한다', async ({ page }) => {
    await ensureAuthenticated(page);

    const streakResponse = page.waitForResponse((response) =>
      response.url().includes('/api/v1/logs/streak') && response.request().method() === 'GET',
    );

    await page.goto('/stats');

    await expect(page.getByRole('heading', { name: /학습 통계|Learning Stats|学習統計/ })).toBeVisible();
    await expect(page.getByText(/현재 연속|Current Streak|現在の連続/)).toBeVisible();
    await expect(page.getByText(/최장 기록|Longest Streak|最長記録/)).toBeVisible();
    await expect(page.getByText(/누적 학습일|Total Study Days|累計学習日/)).toBeVisible();
    await expect(page.getByText(/학습 히트맵|Study Heatmap|学習ヒートマップ/)).toBeVisible();

    expect((await streakResponse).ok()).toBe(true);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
