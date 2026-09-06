import { expect, test, type Page } from "@playwright/test";

test("Japanese owner explanation is not completion; explicit completion creates one FSRS card", async ({
  page,
}) => {
  await register(page, "ja");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  const list = (
    await (
      await page.request.get(
        "/api/v1/tracks/topik-ko/curriculum?target_grade=1",
      )
    ).json()
  ).data;
  expect(list.units.length).toBeGreaterThan(0);
  const unit = list.units[0],
    item = unit.items[0];
  await page.goto("/track/topik-ko/learn?view=owner&grade=1");
  const section = page.locator("#topik-owner-curriculum");
  await section
    .locator("article")
    .filter({
      has: page.getByRole("heading", { name: unit.title_ja, exact: true }),
    })
    .getByRole("button", { name: "学習", exact: true })
    .click();
  if (item.choices.length) await section.getByRole("radio").first().click();
  const completeRequests: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/complete"))
      completeRequests.push(r.url());
  });
  await section.getByRole("button", { name: "解説", exact: true }).click();
  await expect(
    section.getByRole("button", { name: "学習完了を記録", exact: true }),
  ).toBeVisible();
  expect(completeRequests).toEqual([]);
  const progress = async () =>
    (
      await (
        await page.request.get("/api/v1/tracks/topik-ko/curriculum/progress")
      ).json()
    ).data;
  expect((await progress()).completed_item_ids).not.toContain(item.id);
  await section
    .getByRole("button", { name: "学習完了を記録", exact: true })
    .click();
  await expect
    .poll(async () => (await progress()).completed_item_ids)
    .toContain(item.id);
  expect(completeRequests).toHaveLength(1);
  const due = (
    await (
      await page.request.get("/api/v1/tracks/topik-ko/curriculum/review/due")
    ).json()
  ).data;
  expect(due.cards.filter((c: any) => c.item.id === item.id)).toHaveLength(1);
});

for (const language of ["ko", "ja"] as const) {
  test(
    "complete a full guided session and enter FSRS review " + language,
    async ({ page }) => {
      const copy = locale[language];
      await register(page, language);
      await page.getByRole("button", { name: copy.save, exact: true }).click();
      await page.getByRole("button", { name: copy.start }).click();
      await expect(page).toHaveURL(/\/study\/[\w-]+$/);
      const id = page.url().split("/").pop()!;
      const get = async () =>
        (await (await page.request.get("/api/v1/study/sessions/" + id)).json())
          .data;
      let session = await get(),
        loop = 0;
      while (session.status !== "completed" && loop++ < 30) {
        const step = session.steps.find((s: any) => !s.submitted);
        if (step.phase === "learn" || step.phase === "review") {
          if (step.mode === "writing")
            await page
              .locator("article textarea")
              .fill("저는 한국어를 공부합니다.");
          await page
            .getByRole("button", { name: copy.reveal, exact: true })
            .click();
          await page
            .getByRole("button", { name: copy.hide, exact: true })
            .click();
          await page
            .getByRole("button", { name: copy.good, exact: true })
            .click();
        } else {
          if (step.mode === "choice")
            await page.locator("article input[type=radio]").first().check();
          else
            await page
              .locator("article textarea")
              .fill("저는 한국어를 공부합니다.");
          await page
            .getByRole("button", {
              name: language === "ko" ? "답 제출" : "回答を送信",
              exact: true,
            })
            .click();
        }
        await expect
          .poll(async () => {
            session = await get();
            return session.steps.find((s: any) => s.id === step.id).submitted;
          })
          .toBeTruthy();
        await page
          .getByRole("button", {
            name:
              session.status === "completed"
                ? language === "ko"
                  ? "오늘의 학습을 마쳤어요"
                  : "今日の学習を終えました"
                : copy.next,
            exact: true,
          })
          .click();
      }
      expect(session.status).toBe("completed");
      await page.reload();
      await expect(
        page.getByRole("heading", {
          name:
            language === "ko"
              ? "오늘의 학습을 마쳤어요"
              : "今日の学習を終えました",
        }),
      ).toBeVisible();
      await page.goto(language === "ko" ? "/" : "/track/topik-ko");
      await page.getByRole("button", { name: copy.start }).click();
      await expect(
        page
          .locator("article")
          .getByText(language === "ko" ? "예정 복습" : "予定の復習", {
            exact: true,
          }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: copy.reveal, exact: true })
        .click();
      await page.getByRole("button", { name: copy.hide, exact: true }).click();
      await page.getByRole("button", { name: copy.good, exact: true }).click();
      await expect
        .poll(
          async () =>
            (await (await page.request.get("/api/v1/learning/records")).json())
              .data.totals.reviews,
        )
        .toBe(1);
    },
  );
}

const locale = {
  ko: {
    name: "이름",
    email: "이메일",
    password: "비밀번호",
    create: "계정 만들기",
    target: "목표 급수",
    save: "저장",
    start: /20분 공부 시작/,
    reveal: "뜻과 상황 확인",
    hide: "가리고 떠올리기",
    good: "기억했어요",
    pause: "저장하고 중단",
    resume: "이어서 공부",
    next: "다음 항목",
  },
  ja: {
    name: "名前",
    email: "メールアドレス",
    password: "パスワード",
    create: "アカウント作成",
    target: "目標レベル",
    save: "保存",
    start: /20分の学習を始める/,
    reveal: "意味と使う場面を確認",
    hide: "隠して思い出す",
    good: "覚えていた",
    pause: "保存して中断",
    resume: "続きから学習",
    next: "次の項目",
  },
};
async function register(page: Page, language: "ko" | "ja") {
  const copy = locale[language];
  await page.goto("/welcome");
  await page.getByRole("combobox").selectOption(language);
  if (language === "ja")
    await page.getByRole("radio", { name: /韓国語.*TOPIK/ }).click();
  await page.goto("/register");
  await page.getByLabel(copy.name, { exact: true }).fill("Study E2E");
  await page
    .getByLabel(copy.email, { exact: true })
    .fill("study-" + crypto.randomUUID() + "@example.com");
  await page.getByLabel(copy.password, { exact: true }).fill("Passw0rd1234");
  await page.getByRole("button", { name: copy.create, exact: true }).click();
  await expect(page.getByLabel(copy.target, { exact: true })).toBeVisible();
}
for (const level of [
  "N5",
  "N4",
  "N3",
  "N2",
  "N1",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
]) {
  test("guided study save and resume " + level, async ({ page }) => {
    const language = level.startsWith("N") ? "ko" : "ja",
      copy = locale[language];
    const prohibited: string[] = [];
    page.on("request", (r) => {
      if (/r2\.dev|\/api\/v1\/audio\//.test(r.url())) prohibited.push(r.url());
    });
    await register(page, language);
    await page.getByLabel(copy.target, { exact: true }).selectOption(level);
    await page.getByRole("button", { name: copy.save, exact: true }).click();
    await page.getByRole("button", { name: copy.start }).click();
    await expect(page).toHaveURL(/\/study\/[\w-]+$/);
    const sessionUrl = page.url();
    const sessionId = sessionUrl.split("/").pop()!;
    const snapshot = await page.request.get(
      "/api/v1/study/sessions/" + sessionId,
    );
    expect(snapshot.ok()).toBeTruthy();
    const initial = (await snapshot.json()).data;
    expect(initial.steps.length).toBeGreaterThan(0);
    expect(
      initial.steps.every((s: any) => s.solution === null && !s.submitted),
    ).toBeTruthy();
    expect(
      initial.steps
        .filter((s: any) => s.phase !== "practice")
        .every((s: any) => s.level === level),
    ).toBeTruthy();
    await page.getByRole("button", { name: copy.reveal, exact: true }).click();
    expect(
      (await (await page.request.get("/api/v1/learning/records")).json()).data
        .totals.learned,
    ).toBe(0);
    await page.getByRole("button", { name: copy.hide, exact: true }).click();
    await page.getByRole("button", { name: copy.good, exact: true }).click();
    await expect(
      page.getByRole("button", { name: copy.next, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: copy.pause, exact: true }).click();
    await page.getByRole("button", { name: copy.resume, exact: true }).click();
    await expect(page).toHaveURL(sessionUrl);
    await page.reload();
    await expect(
      page.getByRole("button", { name: copy.next, exact: true }),
    ).toBeVisible();
    const records = (
      await (await page.request.get("/api/v1/learning/records")).json()
    ).data;
    expect(records.totals.learned).toBe(1);
    await page.goto("/records");
    await expect(
      page.getByRole("heading", {
        name: language === "ko" ? "기록" : "記録",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("study.");
    expect(prohibited).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  });
}
test("offline response stays pending and replays once after reconnect", async ({
  page,
  context,
}) => {
  await register(page, "ko");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("button", { name: /20분 공부 시작/ }).click();
  await page
    .getByRole("button", { name: "뜻과 상황 확인", exact: true })
    .click();
  await page
    .getByRole("button", { name: "가리고 떠올리기", exact: true })
    .click();
  await context.setOffline(true);
  await page.getByRole("button", { name: "기억했어요", exact: true }).click();
  await expect(
    page.getByText("동기화 대기 · 아직 완료되지 않음"),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByRole("button", { name: "다음 항목", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  expect(
    (await (await page.request.get("/api/v1/learning/records")).json()).data
      .totals.learned,
  ).toBe(1);
});
test("another device's accepted step reconciles an offline pending response without duplicate learning", async ({ page, context }) => {
  await register(page, "ko");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("button", { name: /20분 공부 시작/ }).click();
  await expect(page).toHaveURL(/\/study\/[\w-]+$/);
  const sessionId = page.url().split("/").pop()!;
  const response = await page.request.get("/api/v1/study/sessions/" + sessionId);
  expect(response.status()).toBe(200);
  const session = (await response.json()).data;
  const step = session.steps[0];
  await page.getByRole("button", { name: "뜻과 상황 확인", exact: true }).click();
  await page.getByRole("button", { name: "가리고 떠올리기", exact: true }).click();
  const other = await context.browser()!.newContext({ storageState: await context.storageState() });
  try {
    await context.setOffline(true);
    await page.getByRole("button", { name: "기억했어요", exact: true }).click();
    await expect(page.getByText("동기화 대기 · 아직 완료되지 않음")).toBeVisible();
    const accepted = await other.request.post(new URL("/api/v1/study/sessions/" + sessionId + "/steps/" + step.id + "/submit", page.url()).href, {
      data: { request_id: crypto.randomUUID(), rating: "hard", active_ms: 800 },
    });
    expect(accepted.status()).toBe(200);
    await context.setOffline(false);
    const acknowledge = page.getByRole("button", { name: "서버 기록으로 이어서 공부", exact: true });
    await expect(acknowledge).toBeVisible();
    await acknowledge.click();
    await expect(page.getByRole("button", { name: "저장하고 중단", exact: true })).toBeEnabled();
    await expect(page.getByText("동기화 대기 · 아직 완료되지 않음")).toHaveCount(0);
    const records = (await (await page.request.get("/api/v1/learning/records")).json()).data;
    expect(records.totals.learned).toBe(1);
    const local = await page.evaluate((id) => {
      const key = Object.keys(localStorage).find((key) => key.endsWith("unaccepted:" + id.session + ":" + id.step));
      return key ? JSON.parse(localStorage.getItem(key)!) : null;
    }, { session: sessionId, step: step.id });
    expect(local.rating).toBe("good");
  } finally {
    await context.setOffline(false);
    await other.close();
  }
});

test("a stale device track cannot save a day note into the other track", async ({ page }) => {
  await register(page, "ja");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.goto("/records");
  const note = page.getByRole("textbox");
  await expect(note).toBeVisible();
  const switched = await page.request.patch("/api/v1/auth/track", { data: { track: "jlpt-ja" } });
  expect(switched.status()).toBe(200);
  await note.fill("TOPIK のメモは別のトラックに保存しない");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("button", { name: "再読み込み", exact: true }).first()).toBeVisible();
  await expect(note).toHaveValue("TOPIK のメモは別のトラックに保存しない");
  const wrongTrackNotes = (await (await page.request.get("/api/v1/learning/annotations")).json()).data;
  expect(wrongTrackNotes).toEqual([]);
});

test("mobile account controls and five menus stay reachable with larger text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await register(page, "ja");
  const nav = page.getByRole("navigation", { name: "メインナビゲーション" });
  await expect(nav.getByRole("link")).toHaveCount(5);
  await page.addStyleTag({ content: ":root { font-size: 20px !important; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByText("アカウント・設定", { exact: true }).click();
  await expect(page.getByRole("combobox").first()).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("today-ja-mobile.png"),
    fullPage: true,
  });
});
