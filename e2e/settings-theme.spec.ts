import { test, expect } from '@playwright/test';

/**
 * e2e/settings-theme.spec.ts
 *
 * 다크모드 테마 토글 테스트
 * - 테마 토글 버튼 찾기
 * - 클릭 후 body 또는 루트 요소의 배경색 변경 확인
 * - localStorage 또는 class 기반 테마 전환 검증
 */
test.describe('테마 설정', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
  });

  test('테마 세그먼트 컨트롤이 존재한다', async ({ page }) => {
    await expect(page.getByTestId('theme-control')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('theme-option-dark')).toBeVisible();
  });

  test('다크모드 토글 후 배경색이 변경된다', async ({ page }) => {
    // 초기 배경색 기록
    const initialBg = await page.evaluate(() =>
      window.getComputedStyle(document.documentElement).backgroundColor,
    );

    await page.getByTestId('theme-option-dark').click();

    // CSS 변수 / 클래스 전환 대기
    await page.waitForTimeout(300);

    // 배경색 변경 확인
    const newBg = await page.evaluate(() =>
      window.getComputedStyle(document.documentElement).backgroundColor,
    );

    expect(newBg).not.toBe(initialBg);
  });

  test('다크모드 클래스가 html 요소에 추가된다', async ({ page }) => {
    await page.getByTestId('theme-option-dark').click();
    await page.waitForTimeout(300);

    // Tailwind dark mode 또는 CSS 변수 기반 테마 확인
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    const htmlDataTheme = await page.evaluate(
      () => document.documentElement.getAttribute('data-theme') ?? '',
    );

    // dark 클래스 OR data-theme="dark" 중 하나가 있어야 함
    const isDarkMode = htmlClass.includes('dark') || htmlDataTheme.includes('dark');

    if (!isDarkMode) {
      // localStorage 기반 테마인 경우 확인
      const storedTheme = await page.evaluate(
        () => localStorage.getItem('theme') ?? localStorage.getItem('color-theme') ?? '',
      );
      expect(storedTheme).toMatch(/dark/i);
    } else {
      expect(isDarkMode).toBe(true);
    }
  });

  test('다크모드 설정이 새로고침 후에도 유지된다', async ({ page }) => {
    // 다크모드 활성화
    await page.getByTestId('theme-option-dark').click();
    await page.waitForTimeout(300);

    const bgAfterToggle = await page.evaluate(() =>
      window.getComputedStyle(document.documentElement).backgroundColor,
    );

    // 페이지 새로고침
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const bgAfterReload = await page.evaluate(() =>
      window.getComputedStyle(document.documentElement).backgroundColor,
    );

    // 새로고침 후에도 배경색이 유지되어야 함
    expect(bgAfterReload).toBe(bgAfterToggle);
  });
});
