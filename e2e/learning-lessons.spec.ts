import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./auth-helper";

const isExternalDeployment = Boolean(process.env.E2E_BASE_URL);

test("unreleased catalog shows an honest empty state on the non-mocked local route", async ({
  page,
}) => {
  test.skip(
    isExternalDeployment,
    "the catalog fixture is available only in the local E2E dataset",
  );
  await ensureAuthenticated(page);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: '학습 지도' })).toBeVisible();
  const profileResponse = await page.request.get(
    "/api/v1/learning/profile?expected_track=jlpt-ja",
  );
  const profile = (await profileResponse.json()).data as {
    target_level: string;
  };
  const catalogResponse = await page.request.get(
    `/api/v1/learning/lessons?expected_track=jlpt-ja&level=${encodeURIComponent(profile.target_level)}`,
  );
  expect(catalogResponse.ok()).toBe(true);
  const catalog = (await catalogResponse.json()).data as {
    lessons: Array<{ id: string; title: string }>;
  };
  // This fixture has no reviewed learning-path release. Absence is a gate state, not a skip/pass for new lesson execution.
  expect(catalog.lessons).toEqual([]);
  await page.goto("/learn");
  await page.getByRole("link", { name: /지도 열기|マップを開く|Open map/ }).click();
  await expect(
    page.getByRole('heading', { level: 2, name: /공개된 레슨이 아직 없어요|公開中のレッスンはまだありません|no published lessons/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /레슨 시작|추천 레슨 시작/ }),
  ).toHaveCount(0);
});

test("old questions links preserve parameters and enter integrated practice", async ({
  page,
}) => {
  await ensureAuthenticated(page);
  await page.goto("/questions?level=N3&section=listening");
  await expect(page).toHaveURL(
    /\/learn\?level=N3&section=listening#free-practice$/,
  );
  await expect(
    page.getByRole("heading", { name: /자유 연습|自由練習|Free practice/ }),
  ).toBeVisible();
  const generated = page.waitForRequest((request) => {
    if (!request.url().includes("/quiz/generate") || request.method() !== "POST") return false;
    const body = request.postDataJSON() as { mode?: string; level?: string };
    return body.mode === "listening" && body.level === "N3";
  });
  await page.getByRole("link", { name: /연습|練習|Practice/ }).first().click();
  await expect(page).toHaveURL(/\/quiz\/listening\?level=N3$/);
  await generated;
});
