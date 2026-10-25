import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';

/**
 * e2e/home.spec.ts
 *
 * 홈 화면 기본 로드 테스트
 * - 앱이 정상 렌더링되는지 확인
 * - 신규 목표 설정과 기존 사용자의 한 번 눌러 시작 확인
 * - 네비게이션 주요 링크 접근 가능 여부
 */
test.describe('홈 화면', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
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

  test('목표 설정 뒤 오늘 분량을 한 번 눌러 시작한다', async ({ page }) => {
    await expect(page.getByRole('heading', {name:'오늘도, 한 걸음'})).toBeVisible();
    await expect(page.getByLabel('목표 급수', {exact:true})).toHaveValue('N5');
    await page.getByRole('button', {name:'저장',exact:true}).click();
    await page.getByRole('button', {name:'20분 공부 시작'}).click();
    await expect(page).toHaveURL(/\/study\/[\w-]+$/);
    await expect(page.getByRole('progressbar')).toHaveAttribute('value','0');
  });

  test('복습 시작 버튼 또는 링크가 존재한다', async ({ page }) => {
    await expect(page.getByRole('heading', {name:'오늘도, 한 걸음'})).toBeVisible({ timeout: 10_000 });

    const reviewLink = page.locator(
      'a[href*="review"], button:has-text("복습"), a:has-text("복습"), [data-testid="start-review"]',
    ).first();

    await expect(reviewLink).toBeVisible({ timeout: 5_000 });
  });
});
