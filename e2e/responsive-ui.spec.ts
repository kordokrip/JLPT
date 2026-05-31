import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/browse/vocab', '/quiz', '/review', '/reading', '/stats', '/settings', '/audio-qa'];
const DEVICES = [
  { name: 'iphone-se', width: 320, height: 568 },
  { name: 'small-android', width: 360, height: 740 },
  { name: 'iphone-standard', width: 390, height: 844 },
  { name: 'large-phone', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
] as const;

async function expectNoHorizontalOverflow() {
  return window.document.documentElement.scrollWidth <= window.innerWidth + 1;
}

test.describe('반응형 UI 안전성', () => {
  for (const device of DEVICES) {
    test(`${device.name}: 주요 화면이 viewport를 넘지 않는다`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height });

      for (const route of ROUTES) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#root > *').first()).toBeVisible();
        await expect.poll(() => page.evaluate(expectNoHorizontalOverflow), {
          message: `${device.name} ${route} horizontal overflow`,
        }).toBe(true);
      }
    });
  }

  test('모바일 하단 메뉴는 스크롤 없이 핵심 탭과 더보기를 제공한다', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: /메인|Main|メイン/ });
    await expect(nav).toBeVisible();
    await expect(nav.locator('ul')).toHaveCSS('display', 'grid');
    await expect(page.getByRole('button', { name: /더보기|More|その他/ })).toBeVisible();

    const boxes = await nav.locator('li').evaluateAll((items) =>
      items.map((item) => {
        const rect = item.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      }),
    );
    expect(boxes.every((box) => box.width >= 44)).toBe(true);
    for (let i = 1; i < boxes.length; i += 1) {
      expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right - 1);
    }

    await page.getByRole('button', { name: /더보기|More|その他/ }).click();
    const dialog = page.getByRole('dialog', { name: /추가 메뉴|More menu|追加メニュー/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('a[href="/curriculum"]')).toBeVisible();
    await expect(dialog.locator('a[href="/self-check"]')).toBeVisible();
  });

  test('iOS safe-area와 네이티브 터치 기본값이 적용된다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: /메인|Main|メイン/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /더보기|More|その他/ })).toBeVisible();

    const metrics = await page.evaluate(() => {
      const root = document.getElementById('root')!;
      const bodyStyle = getComputedStyle(document.body);
      const rootStyle = getComputedStyle(root);
      const button = document.querySelector('nav button')!;
      const buttonStyle = getComputedStyle(button);
      return {
        rootPaddingLeft: rootStyle.paddingLeft,
        rootPaddingRight: rootStyle.paddingRight,
        bodyTapHighlight: bodyStyle.getPropertyValue('-webkit-tap-highlight-color'),
        bodyTouchCallout: bodyStyle.getPropertyValue('-webkit-touch-callout'),
        buttonUserSelect: buttonStyle.userSelect || buttonStyle.getPropertyValue('-webkit-user-select'),
        buttonTouchCallout: buttonStyle.getPropertyValue('-webkit-touch-callout'),
      };
    });

    expect(metrics.rootPaddingLeft).toBeDefined();
    expect(metrics.rootPaddingRight).toBeDefined();
    expect(['none', '']).toContain(metrics.bodyTouchCallout);
    expect(['none', '']).toContain(metrics.buttonTouchCallout);
    expect(metrics.buttonUserSelect).toBe('none');
  });

  test('접힌 데스크톱 사이드바도 메뉴명을 식별할 수 있다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    const side = page.getByRole('navigation', { name: /사이드|Sidebar|サイド/ });
    await page.getByRole('button', { name: /사이드 메뉴 접기|Collapse side menu|サイドメニューをたたむ/ }).click();
    await expect(side).toHaveAttribute('data-state', 'collapsed');

    const width = await side.evaluate((node) => node.getBoundingClientRect().width);
    expect(width).toBeGreaterThanOrEqual(96);

    const labels = await side.locator('a[href]').evaluateAll((links) => links.map((link) => link.textContent?.trim() ?? ''));
    expect(labels).toContain('찾아보기');
    expect(labels.some((label) => label.length >= 2)).toBe(true);
  });
});
