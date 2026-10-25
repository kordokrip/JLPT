import { expect, test, type Page } from "@playwright/test";
import { ensureAuthenticated } from "./auth-helper";
import { mockTopikReadApis, registerTopikUser } from "./topik-helper";

// This suite creates accounts and uses the isolated local D1 fixture. It must
// never be pointed at Preview or Production.
const isExternalDeployment = Boolean(process.env.E2E_BASE_URL);

const PHASES = [
  { name: "390-light", width: 390, height: 844, dark: false },
  { name: "768-dark", width: 768, height: 1024, dark: true },
  { name: "1440-light", width: 1440, height: 960, dark: false },
  { name: "2560-dark", width: 2560, height: 1440, dark: true },
] as const;

const PUBLIC_ROUTES = [
  "/welcome",
  "/login",
  "/register",
  "/audio-qa",
  "/detail-ui-audit-missing",
] as const;
const JLPT_ROUTES = [
  "/",
  "/learn",
  "/questions",
  "/records",
  "/settings",
  "/admin/users",
  "/review",
  "/browse/vocab",
  "/browse/grammar",
  "/browse/kanji",
  "/browse/homophones",
  "/curriculum",
  "/curriculum/1",
  "/self-check",
  "/self-check/1",
  "/quiz",
  "/quiz/vocab_mc",
  "/quiz/grammar_fill",
  "/quiz/kanji_reading",
  "/quiz/listening",
  "/characters",
  "/reading",
  "/stats",
  "/add-word",
] as const;
const TOPIK_ROUTES = [
  "/learn",
  "/records",
  "/settings",
  "/track/topik-ko",
  "/track/topik-ko/placement",
  "/track/topik-ko/learn",
  "/track/topik-ko/characters",
  "/track/topik-ko/review",
  "/track/topik-ko/progress",
] as const;

type ContentKind = "vocab" | "grammar" | "kanji";
type ContentRecord = { id?: number | string };

function phaseAt(index: number) {
  return PHASES[index % PHASES.length]!;
}

async function setTheme(page: Page, dark: boolean) {
  await page.emulateMedia({
    colorScheme: dark ? "dark" : "light",
    reducedMotion: "reduce",
  });
  await page.evaluate(
    (isDark) => document.documentElement.classList.toggle("dark", isDark),
    dark,
  );
  await expect(page.locator("html")).toHaveClass(
    dark ? /dark/ : /^(?!.*\bdark\b)/,
  );
}

async function waitForRoute(page: Page, route: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.ok(), `${route} document response`).toBe(true);
  await expect(
    page.locator("#root > *").first(),
    `${route} root render`,
  ).toBeVisible({ timeout: 15_000 });
  await page.evaluate(async () => {
    await document.fonts?.ready.catch(() => undefined);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function expectVisibleRouteContent(page: Page, route: string) {
  const main = page.locator("main").first();
  const publicPage = page.locator("#root > *").first();
  const outlet = page.locator(".app-outlet");
  // Authenticated screens must assert their outlet, not an account/resume modal
  // rendered alongside it. Public routes have no outlet and use their page root.
  const content = (await outlet.count())
    ? outlet
    : (await main.count())
      ? main
      : publicPage;
  await expect(content, `${route} primary content`).toBeVisible();
  await expect(
    content.locator('h1:visible, h2:visible, [role="heading"]:visible').first(),
    `${route} title`,
  ).toBeVisible();
  await expect
    .poll(async () => content.innerText(), {
      message: `${route} body text`,
      timeout: 8_000,
    })
    .not.toEqual("");
  await expect
    .poll(async () => content.innerText(), {
      message: `${route} must settle beyond a loader`,
      timeout: 8_000,
    })
    .not.toMatch(/^(로딩 중|Loading|読み込み中)\.?$/);
}

async function expectNoOuterOverflow(page: Page, route: string) {
  const metrics = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>("main");
    const appPage = document.querySelector<HTMLElement>(".app-page");
    return {
      document: document.documentElement.scrollWidth - window.innerWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
      page: appPage ? appPage.scrollWidth - appPage.clientWidth : 0,
    };
  });
  // Deliberate tables/chip rails retain their own scroll containers; this checks
  // the document and the route's primary container rather than banning those controls.
  expect(
    metrics.document,
    `${route} document horizontal overflow`,
  ).toBeLessThanOrEqual(1);
  expect(metrics.main, `${route} main horizontal overflow`).toBeLessThanOrEqual(
    1,
  );
  expect(
    metrics.page,
    `${route} primary content horizontal overflow`,
  ).toBeLessThanOrEqual(1);
}

async function auditRoute(
  page: Page,
  route: string,
  phaseIndex: number,
  evidence: string,
) {
  const phase = phaseAt(phaseIndex);
  await page.setViewportSize({ width: phase.width, height: phase.height });
  await waitForRoute(page, route);
  await expectVisibleRouteContent(page, route);
  for (const viewport of PHASES) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const dark of [false, true]) {
      await setTheme(page, dark);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expectNoOuterOverflow(page, route);
      test.info().annotations.push({ type: 'responsive-evidence', description: `${route}: ${viewport.width} ${dark ? 'dark' : 'light'}; ${evidence}` });
    }
    if (viewport.width === 390 || viewport.width === 1440) await page.screenshot({ path: test.info().outputPath(`${route.replace(/[^a-z0-9-]/gi, '_')}-${viewport.width}.png`) });
  }
}

async function localContentId(page: Page, kind: ContentKind): Promise<string> {
  const response = await page.request.get(`/api/v1/${kind}?limit=1`);
  expect(response.ok(), `${kind} local list API must be available`).toBe(true);
  const body = (await response.json()) as {
    data?: ContentRecord[];
    items?: ContentRecord[];
  };
  const item = body.data?.[0] ?? body.items?.[0];
  expect(
    item?.id,
    `${kind} local list API must yield a detail id`,
  ).toBeTruthy();
  return String(item!.id);
}

async function localReadingId(page: Page): Promise<string> {
  const response = await page.request.get("/api/v1/reading");
  expect(response.ok(), "reading local list API must be available").toBe(true);
  const body = (await response.json()) as {
    data?: { items?: ContentRecord[] };
    items?: ContentRecord[];
  };
  const item = body.data?.items?.[0] ?? body.items?.[0];
  expect(
    item?.id,
    "reading local list API must yield a detail id",
  ).toBeTruthy();
  return String(item!.id);
}

test.describe("detail responsive route audit (local isolated only)", () => {
  test.skip(
    isExternalDeployment,
    "auth-helper and TOPIK fixtures are local-isolated only; remote targets are forbidden",
  );

  test("public routes: every 390/768/1440/2560 width in light and dark", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    for (const [index, route] of PUBLIC_ROUTES.entries()) {
      await test.step(route, () =>
        auditRoute(page, route, index, "no API fixture; public local render"),
      );
    }
  });

  test("KO JLPT active routes and API-derived details remain responsive", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await ensureAuthenticated(page);
    for (const [index, route] of JLPT_ROUTES.entries()) {
      await test.step(route, () =>
        auditRoute(page, route, index, "isolated local D1/API content"),
      );
    }

    const detailKinds: ContentKind[] = ["vocab", "grammar", "kanji"];
    for (const [index, kind] of detailKinds.entries()) {
      const id = await localContentId(page, kind);
      await test.step(`/browse/${kind}/${id}`, () =>
        auditRoute(
          page,
          `/browse/${kind}/${id}`,
          index + JLPT_ROUTES.length,
          "API-derived local detail id",
        ));
    }
    const readingId = await localReadingId(page);
    await test.step(`/reading/${readingId}`, () =>
      auditRoute(
        page,
        `/reading/${readingId}`,
        JLPT_ROUTES.length + detailKinds.length,
        "API-derived local detail id",
      ));
  });

  test("JA TOPIK active routes use explicit read fixtures and remain responsive", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await mockTopikReadApis(page);
    await registerTopikUser(page);
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await page.getByTestId('ui-language-option-ja').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

    for (const [index, route] of TOPIK_ROUTES.entries()) {
      await test.step(route, () =>
        auditRoute(
          page,
          route,
          index,
          "TOPIK read APIs are explicit local test mocks",
        ),
      );
    }
  });

  test('real local quiz result, listening id and guided session use the same responsive shell', async ({ page }) => {
    test.setTimeout(120_000);
    await ensureAuthenticated(page);
    const response = await page.request.post('/api/v1/quiz/generate', { data: { mode: 'vocab_mc', level: 'N3', count: 3 } });
    expect(response.ok()).toBe(true);
    const quiz = (await response.json()).data;
    const submitted = await page.request.post('/api/v1/quiz/submit', { data: { quiz_id: quiz.quiz_id, answers: quiz.questions.map((q: {id: string; choices: string[]}) => ({ question_id: q.id, answer: q.choices[0] })) } });
    expect(submitted.ok()).toBe(true);
    await auditRoute(page, `/quiz/result/${quiz.quiz_id}`, 0, 'real isolated submitted quiz result');
    await auditRoute(page, `/quiz/listening/${quiz.quiz_id}`, 0, 'local listening route with id; existing generation contract');
    const profile = await page.request.put('/api/v1/learning/profile', { data: { target_level: 'N3', instruction_language: 'ko', daily_minutes: 20, timezone: 'Asia/Seoul' } });
    expect(profile.ok()).toBe(true);
    const session = await page.request.post('/api/v1/study/sessions', { data: { request_id: crypto.randomUUID(), mode: 'quick' } });
    expect(session.ok()).toBe(true);
    const id = (await session.json()).data.id;
    await auditRoute(page, `/study/${id}`, 0, 'real isolated quick session');
  });

  test('character error, empty state, keyboard and 200% text remain usable', async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto('/characters');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await expectNoOuterOverflow(page, 'characters 200% text');
    await page.getByRole('button', { name: '가리고 떠올리기', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.character-glyph')).toHaveText('?');
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await page.route('**/api/v1/kanji?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic unavailable' }) }));
    await page.getByRole('button', { name: '한자', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('문자를 불러오지 못했어요', { timeout: 15000 });
    await page.unroute('**/api/v1/kanji?**');
    await page.route('**/api/v1/kanji?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
    await page.getByRole('button', { name: '다시 불러오기' }).click();
    await expect(page.getByRole('status')).toContainText('이 급수에 표시할 한자가 없어요');
  });

  test("JLPT character exercise description has a bounded min-width regression guard at every target width", async ({
    page,
  }) => {
    await ensureAuthenticated(page);
    for (const phase of PHASES) {
      await test.step(phase.name, async () => {
        await page.setViewportSize({
          width: phase.width,
          height: phase.height,
        });
        await waitForRoute(page, "/characters");
        await setTheme(page, phase.dark);
        await page
          .getByRole("button", { name: /따라 쓰기|Practice writing|書く練習/ })
          .click();

        const lesson = page.locator(".character-lesson");
        const exercise = page.locator(".character-exercise");
        const info = exercise.locator("section.character-detail");
        await expect(
          lesson,
          "character lesson selector must remain available",
        ).toBeVisible();
        await expect(
          exercise,
          "character exercise selector must remain available",
        ).toBeVisible();
        await expect(
          info,
          "character exercise explanation selector must remain available",
        ).toBeVisible();
        const sizes = await info.evaluate((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));
        if (phase.width >= 768)
          expect(
            sizes.clientWidth,
            "character explanation needs usable inline width",
          ).toBeGreaterThanOrEqual(220);
        expect(
          sizes.scrollWidth,
          "character explanation must not force its grid wider",
        ).toBeLessThanOrEqual(sizes.clientWidth + 1);
        await expectNoOuterOverflow(page, `/characters exercise ${phase.name}`);
      });
    }
  });
});
