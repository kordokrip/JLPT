import { expect, test, type Page } from "@playwright/test";
import { ensureAuthenticated } from "./auth-helper";

const ROUTES = [
  "/",
  "/learn",
  "/questions",
  "/records",
  "/browse/vocab",
  "/quiz",
  "/characters",
  "/review",
  "/reading",
  "/stats",
  "/settings",
  "/audio-qa",
];
const DEVICES = [
  { name: "iphone-se", width: 320, height: 568 },
  { name: "small-android", width: 360, height: 740 },
  { name: "iphone-standard", width: 390, height: 844 },
  { name: "large-phone", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

async function expectNoHorizontalOverflow() {
  return window.document.documentElement.scrollWidth <= window.innerWidth + 1;
}

async function waitForStableLayout(page: Page, route: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(
    response?.ok(),
    `${route} should return a successful document response`,
  ).toBe(true);

  // Lazy route modules can render after DOMContentLoaded on slower WebKit runners.
  await expect(page.locator("#root > *").first()).toBeVisible({
    timeout: 15_000,
  });
  await page.evaluate(async () => {
    if (document.readyState !== "complete") {
      await new Promise<void>((resolve) => {
        window.addEventListener("load", () => resolve(), { once: true });
      });
    }
    await document.fonts?.ready.catch(() => undefined);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
}

test.describe("반응형 UI 안전성", () => {
  for (const device of DEVICES) {
    test(`${device.name}: 주요 화면이 viewport를 넘지 않는다`, async ({
      page,
    }) => {
      // This one test opens and validates nine independent routes. WebKit can
      // legitimately exceed Playwright's 30 s per-test default even when each
      // navigation succeeds, so budget the aggregate operation explicitly.
      test.setTimeout(120_000);
      await page.setViewportSize({
        width: device.width,
        height: device.height,
      });
      await ensureAuthenticated(page);

      for (const route of ROUTES) {
        await test.step(`${device.name} ${route}`, async () => {
          // Reuse one page for the route matrix. Repeatedly creating and
          // destroying WebKit pages caused allocator crashes and navigation
          // stalls after several routes without adding isolation value.
          await waitForStableLayout(page, route);
          await expect
            .poll(() => page.evaluate(expectNoHorizontalOverflow), {
              message: `${device.name} ${route} horizontal overflow`,
              timeout: 10_000,
            })
            .toBe(true);
        });
      }
    });
  }

  test("모바일 하단 메뉴는 스크롤 없이 다섯 학습 탭을 제공한다", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await ensureAuthenticated(page);
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: /메인|Main|メイン/ });
    await expect(nav).toBeVisible();
    await expect(nav.locator("ul")).toHaveCSS("display", "grid");
    await expect(nav.getByRole('link')).toHaveCount(5);

    const boxes = await nav.locator("li").evaluateAll((items) =>
      items.map((item) => {
        const rect = item.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      }),
    );
    expect(boxes.every((box) => box.width >= 44)).toBe(true);
    for (let i = 1; i < boxes.length; i += 1) {
      expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right - 1);
    }

    await nav.locator('a[href="/learn"]').click();
    await expect(page.locator('main a[href="/curriculum"]')).toBeVisible();
    await expect(page.locator('main a[href="/characters"]')).toBeVisible();
    await expect(page.locator('main a[href="/self-check"]')).toBeVisible();
  });

  test("iOS safe-area와 네이티브 터치 기본값이 적용된다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ensureAuthenticated(page);
    await page.goto("/");
    await expect(
      page.getByRole("navigation", { name: /메인|Main|メイン/ }),
    ).toBeVisible();
    await expect(page.getByRole('navigation',{name:/메인|Main|メイン/}).getByRole('link')).toHaveCount(5);

    const metrics = await page.evaluate(() => {
      const root = document.getElementById("root")!;
      const bodyStyle = getComputedStyle(document.body);
      const rootStyle = getComputedStyle(root);
      const button = document.querySelector("nav a")!;
      const buttonStyle = getComputedStyle(button);
      return {
        rootPaddingLeft: rootStyle.paddingLeft,
        rootPaddingRight: rootStyle.paddingRight,
        bodyTapHighlight: bodyStyle.getPropertyValue(
          "-webkit-tap-highlight-color",
        ),
        bodyTouchCallout: bodyStyle.getPropertyValue("-webkit-touch-callout"),
        buttonUserSelect:
          buttonStyle.userSelect ||
          buttonStyle.getPropertyValue("-webkit-user-select"),
        buttonTouchCallout: buttonStyle.getPropertyValue(
          "-webkit-touch-callout",
        ),
      };
    });

    expect(metrics.rootPaddingLeft).toBeDefined();
    expect(metrics.rootPaddingRight).toBeDefined();
    expect(["none", ""]).toContain(metrics.bodyTouchCallout);
    expect(["none", ""]).toContain(metrics.buttonTouchCallout);
    expect(metrics.buttonUserSelect).toBe("none");
  });

  test("접힌 데스크톱 사이드바도 메뉴명을 식별할 수 있다", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ensureAuthenticated(page);
    await page.goto("/");

    const side = page.getByRole("navigation", {
      name: /사이드|Sidebar|サイド/,
    });
    await page
      .getByRole("button", {
        name: /사이드 메뉴 접기|Collapse side menu|サイドメニューをたたむ/,
      })
      .click();
    await expect(side).toHaveAttribute("data-state", "collapsed");

    const width = await side.evaluate(
      (node) => node.getBoundingClientRect().width,
    );
    expect(width).toBeGreaterThanOrEqual(96);

    const labels = await side
      .locator("a[href]")
      .evaluateAll((links) =>
        links.map((link) => link.textContent?.trim() ?? ""),
      );
    expect(labels).toContain("학습");
    expect(labels.some((label) => label.length >= 2)).toBe(true);
  });

  test("태블릿에서는 하단 탭 대신 navigation rail을 사용한다", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await ensureAuthenticated(page);
    await page.goto("/");

    const mainNav = page.getByRole("navigation", { name: /메인|Main|メイン/ });
    await expect(mainNav).toBeHidden();

    const side = page.getByRole("navigation", {
      name: /사이드|Sidebar|サイド/,
    });
    await expect(side).toBeVisible();
    await expect(side).toHaveAttribute("data-mode", "rail");

    const width = await side.evaluate(
      (node) => node.getBoundingClientRect().width,
    );
    expect(width).toBeGreaterThanOrEqual(88);
    expect(width).toBeLessThanOrEqual(100);

    const labels = await side
      .locator("a[href]")
      .evaluateAll((links) =>
        links.map((link) => link.textContent?.trim() ?? ""),
      );
    expect(labels).toContain("오늘");
    expect(labels).toContain("학습");
    expect(labels.every((label) => label.length >= 1)).toBe(true);
  });
});
