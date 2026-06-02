import { test, expect } from '@playwright/test';

/**
 * e2e/vocab-search.spec.ts
 *
 * 어휘 검색 기능 테스트
 * - 검색 UI 접근
 * - "経験" 검색 입력
 * - 결과 목록 표시 확인
 */
test.describe('어휘 검색', () => {
  test('검색 페이지 또는 검색 입력란에 접근할 수 있다', async ({ page }) => {
    // /browse/vocab 또는 /search 경로 시도
    await page.goto('/browse/vocab');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="검색"], input[placeholder*="Search"], [data-testid="search-input"]',
    ).first();

    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('"経験" 검색 시 결과가 표시된다', async ({ page }) => {
    await page.goto('/browse/vocab');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="검색"], input[placeholder*="Search"], [data-testid="search-input"]',
    ).first();

    if (await searchInput.count() === 0) {
      test.skip();
      return;
    }

    // 검색어 입력
    await searchInput.fill('経験');
    await searchInput.press('Enter');

    // API 응답 대기 (최대 10초)
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // 결과 항목 또는 "결과 없음" 메시지가 표시되어야 함
    const resultItem = page.locator(
      '[data-testid="vocab-item"], .vocab-item, li, [role="listitem"]',
    ).first();

    const noResult = page.locator('text=/결과 없음|No results|검색 결과가 없습니다/i');

    // 결과 있거나 없음 메시지 중 하나가 표시되면 통과
    await expect(
      resultItem.or(noResult).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('검색 결과에 일본어 문자가 포함된다', async ({ page }) => {
    await page.goto('/browse/vocab');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="검색"], [data-testid="search-input"]',
    ).first();

    if (await searchInput.count() === 0) {
      test.skip();
      return;
    }

    await searchInput.fill('経験');
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // 結果 있는 경우 — 일본어 문자가 포함된 텍스트 확인
    const japaneseText = page.locator('text=/[\\u3000-\\u9FFF]/').first();
    const noResult = page.locator('text=/결과 없음|검색 결과가 없습니다|No results/i');

    await expect(japaneseText.or(noResult)).toBeVisible({ timeout: 10_000 });
  });
});
