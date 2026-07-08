import { expect, test } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';

const VIEWPORTS = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
] as const;

const SCREENS = [
  { name: 'home', path: '/' },
  { name: 'review', path: '/review' },
  { name: 'browse-vocab', path: '/browse/vocab' },
] as const;

function prepareVisualState() {
  document.documentElement.classList.remove('dark');
  localStorage.setItem('nihongo-n3-settings', JSON.stringify({
    state: { theme: 'light', language: 'ko' },
    version: 1,
  }));
}

async function prepareVisualPage(page: import('@playwright/test').Page) {
  await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\/.*/, (route) => route.abort());
  await page.route(/https:\/\/cdn\.jsdelivr\.net\/gh\/orioncactus\/pretendard@.*/, (route) => route.abort());
  await page.addInitScript(prepareVisualState);
}

async function disableAnimations(page: import('@playwright/test').Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `,
  });
}

async function waitForVisualSettled(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await Promise.race([
      document.fonts?.ready.catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 10_000)),
    ]);
  }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
}

test.describe('핵심 화면 시각 회귀', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'screenshot baseline은 Chromium에서 고정한다');

  for (const viewport of VIEWPORTS) {
    for (const screen of SCREENS) {
      test(`${viewport.name}: ${screen.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await prepareVisualPage(page);
        await ensureAuthenticated(page);
        await page.goto(screen.path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main')).toBeVisible();
        await disableAnimations(page);
        await waitForVisualSettled(page);

        await expect(page).toHaveScreenshot(`${viewport.name}-${screen.name}.png`, {
          fullPage: false,
          mask: [page.locator('[data-visual-dynamic]')],
          maxDiffPixelRatio: 0.02,
          timeout: 20_000,
        });
      });
    }
  }

  test('mobile-390: more sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareVisualPage(page);
    await ensureAuthenticated(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await disableAnimations(page);
    await waitForVisualSettled(page);
    await page.getByRole('button', { name: /더보기|More|その他/ }).click();
    await expect(page.getByRole('dialog', { name: /추가 메뉴|More menu|追加メニュー/ })).toBeVisible();

    await expect(page).toHaveScreenshot('mobile-390-more-sheet.png', {
      fullPage: false,
      mask: [page.locator('[data-visual-dynamic]')],
      maxDiffPixelRatio: 0.02,
      timeout: 20_000,
    });
  });

  test('desktop: collapsed sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await prepareVisualPage(page);
    await ensureAuthenticated(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await disableAnimations(page);
    await waitForVisualSettled(page);
    await page.getByRole('button', { name: /사이드 메뉴 접기|Collapse side menu|サイドメニューをたたむ/ }).click();
    await expect(page.getByRole('navigation', { name: /사이드|Sidebar|サイド/ })).toHaveAttribute('data-state', 'collapsed');

    await expect(page).toHaveScreenshot('desktop-sidebar-collapsed.png', {
      fullPage: false,
      mask: [page.locator('[data-visual-dynamic]')],
      maxDiffPixelRatio: 0.02,
      timeout: 20_000,
    });
  });
});
