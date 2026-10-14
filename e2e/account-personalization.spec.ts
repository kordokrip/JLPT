import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./auth-helper";

test.describe("account personalization — real isolated Worker/D1", () => {
  test.skip(
    process.env.VITE_ACCOUNT_PERSONALIZATION_ENABLED !== "true",
    "Explicit candidate flag required",
  );
  test('Japanese TOPIK settings and records retain responsive themes and profile focus', async ({page}) => {
    await ensureAuthenticated(page);
    await page.goto('/settings');
    await page.getByTestId('ui-language-control').getByRole('button',{name:'日本語',exact:true}).click();
    await page.getByRole('button',{name:/韓国語.*TOPIK/}).click();
    await page.waitForURL('**/track/topik-ko');
    const me=(await (await page.request.get('/api/v1/auth/me')).json()).data.user;
    for (const theme of ['light','dark'] as const) {
      for (const accent of ['track','forest','sea','ink']) {
        expect((await page.request.put('/api/v1/account/preferences',{headers:{'X-Account-Id':me.id},data:{theme,accent}})).status()).toBe(200);
        await page.goto('/records');
        await expect(page.getByRole('region',{name:'一年の学習',exact:true})).toBeVisible();
        await expect(page.locator('[data-account-accent]')).toHaveAttribute('data-account-accent',accent);
        if(theme==='dark')await expect(page.locator('html')).toHaveClass(/dark/);
        else await expect(page.locator('html')).not.toHaveClass(/dark/);
        for (const width of [390,768,1440]) {
          await page.setViewportSize({width,height:900});
          expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        }
      }
    }
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'アカウント',exact:true}).click();
    const panel=page.getByRole('dialog',{name:'アカウント',exact:true});
    await expect(panel).toBeVisible();
    await expect(panel.locator('..')).toHaveAttribute('data-account-accent','ink');
    await expect(panel.locator('..')).toHaveAttribute('data-learning-track','topik-ko');
    await page.screenshot({path:test.info().outputPath('profile-ja-dark-390.png')});
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button',{name:'アカウント',exact:true})).toBeFocused();
    await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const response=await page.request.get('/api/v1/learning/insights?expected_track=jlpt-ja&year='+new Date().getFullYear());
    expect(response.status()).toBe(409);
  });
  test("profile, private photo, preferences, and annual records are bound to the server", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ensureAuthenticated(page);
    await page.getByRole("button", { name: "계정", exact: true }).click();
    const panel = page.getByRole("dialog", { name: "계정", exact: true });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("E2E 사용자", { exact: true })).toBeVisible();
    await expect(panel.getByRole("link", { name: /회원관리/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "계정", exact: true }),
    ).toBeFocused();
    const me = (await (await page.request.get("/api/v1/auth/me")).json()).data
      .user;
    await page.goto("/settings");
    await expect(
      page.getByRole("button", { name: "외관 저장", exact: true }),
    ).toBeEnabled();
    await page.getByTestId("theme-option-dark").click();
    await page.getByRole("button", { name: "숲", exact: true }).click();
    const save = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/v1/account/preferences" &&
        r.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "외관 저장", exact: true }).click();
    expect((await save).status()).toBe(200);
    await page.getByLabel("알림 시간", { exact: true }).fill("18:15");
    const reminder = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/v1/account/preferences" &&
        r.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "알림 저장", exact: true }).click();
    expect((await reminder).status()).toBe(200);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("[data-account-accent]")).toHaveAttribute(
      "data-account-accent",
      "forest",
    );
    const jpeg = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#527A69";
      context.fillRect(0, 0, 256, 256);
      return canvas.toDataURL("image/jpeg").split(",")[1]!;
    });
    await page.getByRole("button", { name: "계정", exact: true }).click();
    await panel
      .locator("input[type=file]")
      .setInputFiles({
        name: "synthetic-avatar.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from(jpeg, "base64"),
      });
    await expect(panel.getByAltText("사진 미리보기")).toBeVisible();
    await panel.getByRole("slider", { name: "확대", exact: true }).fill("1.5");
    await expect(
      panel.getByRole("button", { name: "자르기 저장", exact: true }),
    ).toBeEnabled();
    const uploaded = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/v1/account/avatar" &&
        r.request().method() === "PUT",
    );
    await panel
      .getByRole("button", { name: "자르기 저장", exact: true })
      .click();
    expect((await uploaded).status()).toBe(200);
    await page.keyboard.press("Escape");
    const avatar = await page.request.get("/api/v1/account/avatar");
    expect(avatar.headers()["cache-control"]).toContain("no-store");
    await page.reload();
    await expect(
      page.getByRole("button", { name: "계정", exact: true }).locator("img"),
    ).toBeVisible();
    await page.goto("/records");
    await expect(
      page.getByRole("region", { name: "한 해의 학습", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "학습 달력", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("완료한 레슨이 없습니다.", { exact: true }).first(),
    ).toBeVisible();
    const annual = await page.request.get(
      "/api/v1/learning/insights?year=" + new Date().getFullYear(),
    );
    expect(annual.status()).toBe(200);
    expect((await annual.json()).data.total_study_days).toBe(0);
    await page.screenshot({
      path: test.info().outputPath("records-ko-dark-390.png"),
      fullPage: true,
    });
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    expect(
      (
        await page.request.delete("/api/v1/account/avatar", {
          headers: { "X-Account-Id": me.id },
        })
      ).status(),
    ).toBe(204);
    expect((await page.request.get("/api/v1/account/avatar")).status()).toBe(
      404,
    );
  });
});
