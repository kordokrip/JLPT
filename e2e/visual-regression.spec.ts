import { expect, test } from '@playwright/test';

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

async function prepareVisualState() {
  await document.fonts.ready;
  document.documentElement.classList.remove('dark');
  localStorage.setItem('nihongo-n3-settings', JSON.stringify({
    state: { theme: 'light', language: 'ko' },
    version: 1,
  }));
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

test.describe('핵심 화면 시각 회귀', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'screenshot baseline은 Chromium에서 고정한다');

  for (const viewport of VIEWPORTS) {
    for (const screen of SCREENS) {
      test(`${viewport.name}: ${screen.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript(prepareVisualState);
        await page.goto(screen.path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main')).toBeVisible();
        await disableAnimations(page);
        await page.waitForTimeout(250);

        await expect(page).toHaveScreenshot(`${viewport.name}-${screen.name}.png`, {
          fullPage: false,
          mask: [page.locator('[data-visual-dynamic]')],
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  }

  test('mobile-390: more sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(prepareVisualState);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await disableAnimations(page);
    await page.getByRole('button', { name: /더보기|More|その他/ }).click();
    await expect(page.getByRole('dialog', { name: /추가 메뉴|More menu|追加メニュー/ })).toBeVisible();

    await expect(page).toHaveScreenshot('mobile-390-more-sheet.png', {
      fullPage: false,
      mask: [page.locator('[data-visual-dynamic]')],
      maxDiffPixelRatio: 0.02,
    });
  });

  test('desktop: collapsed sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(prepareVisualState);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await disableAnimations(page);
    await page.getByRole('button', { name: /사이드 메뉴 접기|Collapse side menu|サイドメニューをたたむ/ }).click();
    await expect(page.getByRole('navigation', { name: /사이드|Sidebar|サイド/ })).toHaveAttribute('data-state', 'collapsed');

    await expect(page).toHaveScreenshot('desktop-sidebar-collapsed.png', {
      fullPage: false,
      mask: [page.locator('[data-visual-dynamic]')],
      maxDiffPixelRatio: 0.02,
    });
  });
});
