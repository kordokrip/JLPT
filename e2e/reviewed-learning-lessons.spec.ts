// 강성호 2026-10-11: 실제 승인 동결본 220레슨을 격리 Worker/D1에 연결해 검사한다. Preview·가족 관찰·실제 음성 증거가 아니다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page, type APIResponse } from "@playwright/test";

const cohort = process.env.E2E_REVIEWED_COHORT;
if (!cohort || process.env.E2E_BASE_URL || process.env.E2E_REUSE_EXISTING_SERVER === "1")
  throw new Error("Reviewed lessons require approved local fixture, not remote/reused runtime");
const bank = JSON.parse(readFileSync(join(cohort, "bundle.json"), "utf8"));
const copies = {
  ko: { name: "이름", email: "이메일", password: "비밀번호", create: "계정 만들기", target: "목표 급수", save: "저장", pause: "저장하고 중단", resume: "이어서 공부", records: "기록", current: "현재 위치", complete: "완료" },
  ja: { name: "名前", email: "メールアドレス", password: "パスワード", create: "アカウント作成", target: "目標レベル", save: "保存", pause: "保存して中断", resume: "続きから学習", records: "記録", current: "現在地", complete: "完了" },
};
async function data(response: APIResponse) {
  expect(response.ok(), `${response.status()} ${response.url()} ${await response.text()}`).toBe(true);
  return (await response.json()).data;
}
async function register(page: Page, language: "ko" | "ja", level: string) {
  const copy = copies[language];
  await page.goto("/welcome");
  await page.getByRole("combobox").selectOption(language);
  if (language === "ja") await page.getByRole("radio", { name: /韓国語.*TOPIK/ }).click();
  await page.goto("/register");
  await page.getByLabel(copy.name, { exact: true }).fill("Reviewed lesson QA");
  await page.getByLabel(copy.email, { exact: true }).fill(`reviewed-${crypto.randomUUID()}@example.com`);
  await page.getByLabel(copy.password, { exact: true }).fill("Passw0rd1234");
  await page.getByRole("button", { name: copy.create, exact: true }).click();
  await page.getByLabel(copy.target, { exact: true }).selectOption(level);
  await page.getByRole("button", { name: copy.save, exact: true }).click();
}

for (const level of ["N5", "N4", "N3", "N2", "N1", "1", "2", "3", "4", "5", "6"]) {
  test(`actual reviewed 20 lessons, submissions, resume, records and FSRS ${level}`, async ({ page }) => {
    test.setTimeout(180_000);
    page.setDefaultTimeout(5_000);
    const language = level.startsWith("N") ? "ko" : "ja", track = language === "ko" ? "jlpt-ja" : "topik-ko", copy = copies[language];
    const prohibited: string[] = [];
    page.on("request", request => { if (/r2\.dev|\/api\/v1\/audio\//.test(request.url())) prohibited.push(request.url()); });
    await register(page, language, level);
    const get = async (path: string) => data(await page.request.get(path, { timeout: 5_000 }));
    const post = async (path: string, body: object = {}) => data(await page.request.post(path, { data: body, timeout: 5_000 }));
    const catalogPath = `/api/v1/learning/lessons?expected_track=${track}&level=${level}`;
    const fixture = JSON.parse(readFileSync(process.env.E2E_REVIEWED_FIXTURE_REPORT!, "utf8"));
    expect(fixture.draft_sha256).toBe(bank.draft_sha256);
    expect(fixture.source_evidence_sha256).toBe(bank.source_evidence_sha256);
    expect(fixture.concept_inventory_sha256).toBe(bank.concept_inventory_sha256);
    expect(Object.keys(fixture.resolved_concepts)).toHaveLength(220);
    expect(fixture.publication_gate_evidence).toBe(false);
    const catalog = await get(catalogPath), expected = bank.lessons.filter((lesson: any) => lesson.track === track && lesson.level === level);
    expect(catalog.lessons.map((lesson: any) => lesson.id)).toEqual(expected.map((lesson: any) => lesson.id));
    expect(expected).toHaveLength(20);
    const firstTitle = catalog.lessons[0]?.title;
    expect(typeof firstTitle).toBe("string");
    expect(firstTitle.trim()).not.toBe("");
    expect(catalog.lessons.every((lesson: any) => lesson.version === bank.version && !lesson.completed && !('answer_index' in lesson))).toBe(true);
    expect((await get("/api/v1/learning/records")).totals.learned).toBe(0);
    let choiceAnswers = 0;
    for (const [index, lesson] of expected.entries()) {
      let session: any;
      if (index === 0) {
        await page.goto("/");
        await expect(page.locator(".learning-map__node")).toHaveCount(20);
        const firstNode = page.getByRole("button", { name: `${firstTitle}: ${copy.current}`, exact: true });
        await expect(firstNode).toBeEnabled();
        await firstNode.click();
        await expect(page).toHaveURL(/\/study\/[\w-]+$/);
        const sessionURL = page.url(), id = sessionURL.split("/").pop()!;
        session = await get(`/api/v1/study/sessions/${id}`);
        const firstStep = session.steps[0], firstPath = `/api/v1/study/sessions/${id}/steps/${firstStep.id}`;
        await post(`${firstPath}/reveal`);
        await post(`${firstPath}/submit`, { request_id: crypto.randomUUID(), rating: "good", active_ms: 100 });
        const saved = await get(`/api/v1/study/sessions/${id}`);
        await page.reload();
        await page.getByRole("button", { name: copy.pause, exact: true }).click();
        await page.getByRole("button", { name: copy.resume, exact: true }).click();
        await expect(page).toHaveURL(sessionURL);
        await page.reload();
        session = await get(`/api/v1/study/sessions/${id}`);
        expect(session.steps).toEqual(saved.steps);
      } else {
        const request_id = crypto.randomUUID();
        session = await post("/api/v1/study/sessions", { request_id, mode: "quick", lesson_id: lesson.id });
        expect((await post("/api/v1/study/sessions", { request_id, mode: "quick", lesson_id: lesson.id })).id).toBe(session.id);
      }
      expect(session.lesson_id).toBe(lesson.id);
      expect(session.lesson_version).toBe(bank.version);
      expect(session.steps.map((step: any) => step.phase)).toEqual(["learn", "learn", "practice", "practice"]);
      expect(session.steps.every((step: any) => step.level === level && step.ref.track === track && (step.submitted || step.solution === null))).toBe(true);
      expect(session.steps.filter((step: any) => step.phase === "learn").map((step: any) => step.ref)).toEqual(lesson.concept_keys.map((key: string) => fixture.resolved_concepts[key]));
      expect(session.steps.filter((step: any) => step.phase === "practice").map((step: any) => step.ref.id)).toEqual(lesson.question_ids);
      for (const step of session.steps) {
        if (step.submitted) continue;
        const path = `/api/v1/study/sessions/${session.id}/steps/${step.id}`;
        let submission: any = { request_id: crypto.randomUUID(), active_ms: 100 };
        let authored: any;
        if (step.phase === "learn") {
          const revealed = await post(`${path}/reveal`);
          const revealedStep = revealed.steps.find((candidate: any) => candidate.id === step.id);
          expect(revealedStep.solution).not.toBeNull();
          const conceptIndex = session.steps.filter((candidate: any) => candidate.phase === "learn").findIndex((candidate: any) => candidate.id === step.id);
          expect(revealedStep.solution.explanation).toContain(bank.concepts.find((concept: any) => concept.key === lesson.concept_keys[conceptIndex]).cue[language]);
          submission.rating = "good";
          if (step.mode === "writing") submission.answer = "저는 한국어를 공부합니다. 오늘도 연습합니다.";
        } else {
          const item = authored = bank.items.find((item: any) => item.id === step.ref.id);
          expect(item).toBeTruthy();
          expect(item.level).toBe(level);
          if (step.mode === "choice") {
            submission.answer = item.choices[item.answer_index][language];
            expect(step.choices).toContain(submission.answer);
            choiceAnswers++;
          } else submission.answer = item.sample.ko;
        }
        session = await post(`${path}/submit`, submission);
        const accepted = session.steps.find((candidate: any) => candidate.id === step.id);
        if (authored) {
          if (step.mode === "choice") {
            expect(accepted.correct).toBe(true);
            expect(accepted.solution.answer).toBe(submission.answer);
            expect(accepted.solution.explanation).toBe(authored.explanation[language]);
          } else {
            expect(accepted.correct).toBeNull();
            expect(accepted.solution.answer).toBeNull();
            expect(accepted.solution.sample).toBe(authored.sample.ko);
            expect(accepted.solution.explanation).toContain(authored.rubric[language]);
          }
        }
        const repeated = await post(`${path}/submit`, submission);
        expect(repeated.steps.find((candidate: any) => candidate.id === step.id)).toEqual(session.steps.find((candidate: any) => candidate.id === step.id));
      }
      expect(session.status).toBe("completed");
    }
    expect((await get(catalogPath)).lessons.every((lesson: any) => lesson.completed)).toBe(true);
    await page.goto("/");
    await expect(page.locator(".learning-map__node")).toHaveCount(20);
    await expect(page.getByRole("button", { name: `${firstTitle}: ${copy.complete}`, exact: true })).toBeVisible();
    const records = await get("/api/v1/learning/records");
    expect(records.totals.learned).toBe(40);
    expect(records.totals.first_answers).toBe(choiceAnswers);
    expect(records.totals.first_correct).toBe(choiceAnswers);
    expect(records.totals.retry_answers).toBe(0);
    expect(records.sessions.filter((session: any) => session.status === "completed")).toHaveLength(20);
    const motivation = await get("/api/v1/learning/motivation");
    expect(motivation.streak).toBe(1);
    expect(motivation.xp).toBe(100);
    // 동일 실제 concept ID의 예정 FSRS 복습이 만들어졌는지 세션 생성/평가/재전송으로 검사한다.
    let review = await post("/api/v1/study/sessions", { request_id: crypto.randomUUID(), mode: "quick" });
    expect(review.steps[0].phase).toBe("review");
    const reviewStep = review.steps[0], path = `/api/v1/study/sessions/${review.id}/steps/${reviewStep.id}`;
    expect(expected.flatMap((lesson: any) => lesson.concept_keys.map((key: string) => fixture.resolved_concepts[key]))).toContainEqual(reviewStep.ref);
    await post(`${path}/reveal`);
    const rating: any = { request_id: crypto.randomUUID(), rating: "good", active_ms: 100 };
    if (reviewStep.mode === "writing") rating.answer = "오늘 한국어를 복습합니다.";
    await post(`${path}/submit`, rating);
    await post(`${path}/submit`, rating);
    expect((await get("/api/v1/learning/records")).totals.reviews).toBe(1);
    await page.goto("/records");
    await expect(page.getByRole("heading", { name: copy.records, exact: true })).toBeVisible();
    expect(prohibited).toEqual([]);
    await test.info().attach("actual-cohort-scope", { body: JSON.stringify({ version: bank.version, draft_sha256: bank.draft_sha256, level, lessons: 20, completed: 20, choiceAnswers, local_only: true, human_observation: false, audible_audio: false }), contentType: "application/json" });
  });
}
