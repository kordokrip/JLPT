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
  await expect(
    page.getByText(/공개 준비 중|公開準備中|being prepared/),
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
});
