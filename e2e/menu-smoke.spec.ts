import { expect, test, type Page } from '@playwright/test';

const ROUTES = [
  { path: '/', label: '홈', text: /오늘 할 일|Today's Tasks|今日のタスク/ },
  { path: '/review', label: '복습', text: /복습|Review|復習/ },
  { path: '/browse/vocab', label: '찾아보기', text: /어휘 찾아보기|Browse Vocabulary|語彙ブラウズ/ },
  { path: '/quiz', label: '퀴즈', text: /퀴즈|Quiz|クイズ/ },
  { path: '/reading', label: '독해', text: /독해|Reading|読解/ },
  { path: '/curriculum', label: '커리큘럼', text: /16주 학습 계획|16-Week|16週/ },
  { path: '/self-check', label: '자가진단', text: /자가진단|Self-Check|自己診断/ },
  { path: '/stats', label: '통계', text: /학습 통계|Learning Stats|学習統計/ },
  { path: '/settings', label: '설정', text: /설정|Settings|設定/ },
] as const;

async function assertNoRuntimeFailures(page: Page, run: () => Promise<void>) {
  const failures: string[] = [];
  const badResponses: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    const errorText = failure?.errorText ?? 'failed';
    if (errorText !== 'net::ERR_ABORTED' && errorText !== 'cancelled') {
      failures.push(`${request.method()} ${request.url()} ${errorText}`);
    }
  });
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/v1/') && response.status() >= 400) {
      badResponses.push(`${response.status()} ${url}`);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await run();

  expect(failures, 'network request failures').toEqual([]);
  expect(badResponses, 'bad API responses').toEqual([]);
  expect(consoleErrors, 'browser console errors').toEqual([]);
  const actionablePageErrors = pageErrors.filter((message) => {
    if (/\/localhost:5173\/(api\/v1|dev-sw\.js).*due to access control checks/.test(message)) return false;
    if (
      failures.length === 0 &&
      badResponses.length === 0 &&
      /\/nihongo-n3\.pages\.dev\/sw\.js.*due to access control checks/.test(message)
    ) {
      return false;
    }
    if (
      failures.length === 0 &&
      badResponses.length === 0 &&
      /\/nihongo-n3-api\.kordokrip\.workers\.dev\/api\/v1\/.*due to access control checks/.test(message)
    ) {
      return false;
    }
    return true;
  });

  expect(actionablePageErrors, 'uncaught page errors').toEqual([]);
}

async function expectVisibleHref(page: Page, href: string, label: string) {
  const isVisible = async () => {
    try {
      return await page.locator(`a[href="${href}"]`).evaluateAll((links) =>
        links.some((link) => {
          const style = window.getComputedStyle(link);
          const rect = link.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
        }),
      );
    } catch {
      return false;
    }
  };

  if (!(await isVisible()) && page.viewportSize()?.width && page.viewportSize()!.width < 768) {
    const dialog = page.getByRole('dialog', { name: /추가 메뉴|More menu|追加メニュー/ });
    if (!(await dialog.isVisible().catch(() => false))) {
      const more = page.getByRole('button', { name: /더보기|More|その他/ });
      if (await more.isVisible()) await more.click();
    }
  }

  await expect.poll(isVisible, { message: `${label} nav link`, timeout: 10_000 }).toBe(true);
}

async function gotoAppRoute(page: Page, path: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: 'commit', timeout: 20_000 });
      await expect(page.locator('#root > *').first()).toBeVisible({ timeout: 15_000 });
      return;
    } catch (err) {
      if (attempt === 1) throw err;
      await page.waitForTimeout(500);
    }
  }
}

test.describe('운영 메뉴 smoke', () => {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ] as const) {
    test(`${viewport.name}: 모든 주요 메뉴가 렌더링되고 라우팅된다`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await assertNoRuntimeFailures(page, async () => {
        await gotoAppRoute(page, '/');

        for (const route of ROUTES) {
          await expectVisibleHref(page, route.path, route.label);
        }

        for (const route of ROUTES) {
          await gotoAppRoute(page, route.path);
          await expect(page.locator('main').getByText(route.text).first(), `${route.path} content`).toBeVisible({
            timeout: 15_000,
          });
        }
      });
    });
  }
});
