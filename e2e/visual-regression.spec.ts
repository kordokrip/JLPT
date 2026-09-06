import { expect, test } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';
import { mockTopikReadApis, registerTopikUser } from './topik-helper';

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

const TOPIK_SCREENS = [
  { name: 'topik-dashboard', path: '/track/topik-ko' },
  { name: 'topik-placement', path: '/track/topik-ko/placement' },
  { name: 'topik-learn', path: '/track/topik-ko/learn' },
] as const;

function prepareVisualState() {
  document.documentElement.classList.remove('dark');
  localStorage.setItem('nihongo-n3-settings', JSON.stringify({
    state: { theme: 'light', language: 'ko' },
    version: 3,
  }));
}

async function prepareVisualPage(page: import('@playwright/test').Page) {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\/.*/, (route) => route.abort());
  await page.route(/https:\/\/cdn\.jsdelivr\.net\/gh\/orioncactus\/pretendard@.*/, (route) => route.abort());
  await page.addInitScript(prepareVisualState);
}

async function disableAnimations(page: import('@playwright/test').Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        scroll-behavior: auto !important;
      }
      html { color-scheme: light !important; }
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

  const layoutStable = await page.evaluate(async () => {
    const signature = () => JSON.stringify(
      Array.from(document.querySelectorAll('html, body, #root, .app-shell, main, nav')).map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return [
          element.tagName,
          element.getAttribute('data-state'),
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          style.fontFamily,
          style.fontSize,
        ];
      }),
    );

    const deadline = Date.now() + 5_000;
    let previous = '';
    let stableFrames = 0;

    while (Date.now() < deadline && stableFrames < 3) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const current = signature();
      stableFrames = current === previous ? stableFrames + 1 : 0;
      previous = current;
    }

    return stableFrames >= 3;
  });

  expect(layoutStable, 'visual layout should settle before screenshot').toBe(true);
  await expect.poll(
    () => page.evaluate(() => document.documentElement.classList.contains('dark')),
    { message: 'visual regression must use the light theme' },
  ).toBe(false);

  const horizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow, 'visual viewport must not overflow horizontally').toBeLessThanOrEqual(1);
}

test.describe('핵심 화면 시각 회귀', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'screenshot baseline은 Chromium에서 고정한다');

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name}: welcome`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await prepareVisualPage(page);
      await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await disableAnimations(page);
      await waitForVisualSettled(page);

      await expect(page).toHaveScreenshot(`${viewport.name}-welcome.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
        timeout: 20_000,
      });
    });

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

    for (const screen of TOPIK_SCREENS) {
      test(`${viewport.name}: ${screen.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await prepareVisualPage(page);
        await mockTopikReadApis(page);
        await registerTopikUser(page);
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

  test('mobile-390: account menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareVisualPage(page);
    await ensureAuthenticated(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await disableAnimations(page);
    await waitForVisualSettled(page);
    await page.locator('header details summary').click();
    await expect(page.locator('header details[open]')).toBeVisible();

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
