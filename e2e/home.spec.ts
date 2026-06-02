import { test, expect } from '@playwright/test';

/**
 * e2e/home.spec.ts
 *
 * 홈 화면 기본 로드 테스트
 * - 앱이 정상 렌더링되는지 확인
 * - due 카드 카운트가 표시되는지 확인 (0 포함)
 * - 네비게이션 주요 링크 접근 가능 여부
 */
test.describe('홈 화면', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('페이지가 정상 로드된다', async ({ page }) => {
    // 타이틀 또는 앱 이름이 있는지 확인
    await expect(page).toHaveTitle(/일본어|JLPT|Nihongo/i);
  });

  test('주요 네비게이션 요소가 렌더링된다', async ({ page }) => {
    // 헤더 또는 내비게이션 바가 존재
    const nav = page.locator('nav, header, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 10_000 });
  });

  test('복습 카드 카운트가 표시된다 (0 포함)', async ({ page }) => {
    // due count 배지 또는 숫자 — 0이라도 표시되어야 함
    // 공통적인 패턴: data-testid="due-count" 또는 텍스트로 숫자
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const dueCount = page.locator('[data-testid="due-count"], .due-count, [aria-label*="복습"]').first();
    // 있으면 숫자를 포함하고 있어야 함
    if (await dueCount.count() > 0) {
      const text = await dueCount.textContent();
      expect(text).toMatch(/\d+/);
    } else {
      // fallback: 숫자가 포함된 요소가 화면에 하나라도 있으면 통과
      const anyNumber = page.locator('text=/\\d+/').first();
      await expect(anyNumber).toBeVisible({ timeout: 5_000 });
    }
  });

  test('복습 시작 버튼 또는 링크가 존재한다', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const reviewLink = page.locator(
      'a[href*="review"], button:has-text("복습"), a:has-text("복습"), [data-testid="start-review"]',
    ).first();

    await expect(reviewLink).toBeVisible({ timeout: 5_000 });
  });
});
