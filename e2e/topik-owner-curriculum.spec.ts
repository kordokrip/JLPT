import { expect, test, type Browser, type Page } from '@playwright/test';

import { mockTopikReadApis, registerTopikUser } from './topik-helper';

const FIXTURE_UNIT_TITLE = '인사와 자기소개';
const FIXTURE_VOCAB_ID = 'topik-owner-grade1-vocab-annyeonghaseyo-v1';
const BATCH4_GRADE6_UNIT_TITLE = '자료 해석';
const BATCH4_GRADE6_VOCAB_ID = 'topik-owner-batch4-item-6-vocab';
const isExternalDeployment = Boolean(process.env.E2E_BASE_URL);

declare global {
  interface Window {
    __topikSpeechCalls?: number;
    __topikSpeechVoiceNames?: string[];
  }
}

type TopikApiResponse<T> = { status: number; data: T };
type DueData = { cards: Array<{ card_id: number; item: { id: string } }> };
type ProgressData = { completed_item_ids: string[] };

function ownerCurriculumSection(page: Page) {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: '급수별 개념 학습' }),
  });
}

async function installGoogleKoreanSpeechMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, '__topikSpeechCalls', { configurable: true, value: 0, writable: true });
    Object.defineProperty(window, '__topikSpeechVoiceNames', { configurable: true, value: [], writable: true });
    class FakeSpeechSynthesisUtterance {
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(_text: string) {}
    }
    const googleKoreanVoice = {
      default: true,
      lang: 'ko-KR',
      localService: true,
      name: 'Google Korean',
      voiceURI: 'Google Korean',
    } as SpeechSynthesisVoice;
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: FakeSpeechSynthesisUtterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: () => undefined,
        getVoices: () => [googleKoreanVoice],
        speak: (utterance: FakeSpeechSynthesisUtterance) => {
          window.__topikSpeechCalls = (window.__topikSpeechCalls ?? 0) + 1;
          window.__topikSpeechVoiceNames?.push(utterance.voice?.name ?? 'missing');
          window.setTimeout(() => utterance.onend?.(new Event('end')), 0);
        },
      },
    });
  });
}

async function topikApi<T>(page: Page, path: string): Promise<TopikApiResponse<T>> {
  return page.evaluate(async (requestPath) => {
    const response = await fetch(`/api/v1${requestPath}`, { credentials: 'include' });
    return { status: response.status, data: await response.json() };
  }, path) as Promise<TopikApiResponse<T>>;
}

async function openFixtureUnit(page: Page): Promise<void> {
  await page.goto('/track/topik-ko/learn');
  const section = ownerCurriculumSection(page);
  await expect(section).toBeVisible();
  await section.getByRole('tab', { name: '1급', exact: true }).click();
  const data=await topikApi<{data:{units:Array<{id:string;items:Array<{id:string}>}>}}>(page,'/tracks/topik-ko/curriculum?target_grade=1');
  const unit=data.data.data.units.find(u=>u.items.some(i=>i.id===FIXTURE_VOCAB_ID))!;
  await section.locator(`article[data-unit-id="${unit.id}"]`).getByRole('button',{name:'학습',exact:true}).click();
  for(let i=0;i<unit.items.findIndex(item=>item.id===FIXTURE_VOCAB_ID);i++)await section.getByRole('button',{name:'다음 항목'}).click();
  await expect(section.locator(`article[data-item-id="${FIXTURE_VOCAB_ID}"]`)).toBeVisible();
}

test.describe('TOPIK 1–6 owner-authored curriculum local fixture', () => {
  test('returns Google Korean speech and unavailable audio separately without any R2 or audio endpoint request', async ({ page }) => {
    test.skip(isExternalDeployment, 'the grade-1 three-item fixture exists only in the isolated local E2E database');
    await installGoogleKoreanSpeechMock(page);
    await mockTopikReadApis(page);
    await registerTopikUser(page);

    const audioRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/audio/')) audioRequests.push(request.url());
    });
    const fixtureResponse = page.waitForResponse((response) =>
      response.url().includes('/api/v1/tracks/topik-ko/curriculum?target_grade=1') && response.request().method() === 'GET',
    );
    await openFixtureUnit(page);
    const response = await fixtureResponse;
    expect(response.status()).toBe(200);
    const payload = await response.json() as {
      data: {
        target_grade: number;
        units: Array<{ title_ko: string; items: Array<{ id: string; audio: { kind: string; text_ko?: string; reason?: string } | null }> }>;
      };
    };
    expect(payload.data.target_grade).toBe(1);
    const fixtureUnit = payload.data.units.find((unit) => unit.title_ko === FIXTURE_UNIT_TITLE);
    expect(fixtureUnit).toBeDefined();
    expect(fixtureUnit?.items).toHaveLength(3);
    expect(fixtureUnit?.items.filter((item) => item.audio?.kind === 'google')).toHaveLength(2);
    expect(fixtureUnit?.items.find((item) => item.id === FIXTURE_VOCAB_ID)?.audio).toEqual({ kind: 'google', text_ko: '안녕하세요.' });
    expect(fixtureUnit?.items.find((item) => item.audio?.kind === 'unavailable')?.audio).toEqual({ kind: 'unavailable', reason: 'not-provided' });
    expect(JSON.stringify(payload)).not.toContain('answer_index');
    expect(JSON.stringify(payload)).not.toContain('해설');

    const section = ownerCurriculumSection(page);
    await expect(section.locator('article')).toHaveCount(1);
    await expect(section.getByRole('button', { name: '소리 듣기' })).toHaveCount(1);
    const activityRequest = page.waitForRequest((request) =>
      request.url().endsWith('/api/v1/activity/events') && request.method() === 'POST');
    await section.locator('article')
      .filter({ hasText: 'Which meaning best matches 안녕하세요?' })
      .getByRole('button', { name: '소리 듣기' })
      .click();
    expect((await activityRequest).postDataJSON()).toEqual({
      events: [expect.objectContaining({
        event_type: 'speech_attempted',
        learning_track: 'topik-ko',
        content_id: FIXTURE_VOCAB_ID,
        speech_outcome: 'played',
      })],
    });
    await expect.poll(() => page.evaluate(() => window.__topikSpeechCalls ?? 0)).toBe(1);
    await expect.poll(() => page.evaluate(() => window.__topikSpeechVoiceNames ?? [])).toEqual(['Google Korean']);
    // Inspect the unavailable item without assuming the fixture's display order.
    const unavailableIndex=fixtureUnit!.items.findIndex(item=>item.audio?.kind==='unavailable');
    const vocabIndex=fixtureUnit!.items.findIndex(item=>item.id===FIXTURE_VOCAB_ID);
    for(let i=0;i<Math.abs(unavailableIndex-vocabIndex);i++)await section.getByRole('button',{name:unavailableIndex<vocabIndex?'이전 항목':'다음 항목'}).click();
    await expect(section.locator('article')).toHaveCount(1);
    await expect(section.getByRole('button', {name:'소리 듣기'})).toHaveCount(0);
    expect(audioRequests).toEqual([]);
  });

  test('completes an owner item, persists FSRS progress, records a rating, and isolates another user', async ({ page, browser }) => {
    test.skip(isExternalDeployment, 'the grade-1 three-item fixture exists only in the isolated local E2E database');
    await installGoogleKoreanSpeechMock(page);
    await mockTopikReadApis(page);
    await registerTopikUser(page);
    await openFixtureUnit(page);

    const section = ownerCurriculumSection(page);
    const vocabCard = section.locator('article').filter({ hasText: 'Which meaning best matches 안녕하세요?' });
    await expect(vocabCard).toBeVisible();
    await vocabCard.getByRole('radio', { name: '처음 만날 때의 인사' }).click();
    const solutionResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/v1/tracks/topik-ko/curriculum/items/${FIXTURE_VOCAB_ID}/solution`) && response.request().method() === 'GET',
    );
    const completeResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/v1/tracks/topik-ko/curriculum/items/${FIXTURE_VOCAB_ID}/complete`) && response.request().method() === 'POST',
    );
    await vocabCard.getByRole('button', { name: '해설', exact:true }).click();
    expect((await solutionResponse).status()).toBe(200);
    expect((await topikApi<{data:ProgressData}>(page,'/tracks/topik-ko/curriculum/progress')).data.data.completed_item_ids).not.toContain(FIXTURE_VOCAB_ID);
    await vocabCard.getByRole('button', {name:'학습 완료로 기록'}).click();
    const completion = await completeResponse;
    expect(completion.status()).toBe(200);
    const completionBody = await completion.json() as { data: { item_id: string; status: string; card_id: number } };
    expect(completionBody.data).toMatchObject({ item_id: FIXTURE_VOCAB_ID, status: 'completed' });
    expect(typeof completionBody.data.card_id).toBe('number');
    await expect(vocabCard.getByText('학습 완료', {exact:true})).toBeVisible();

    const progress = await topikApi<{ data: ProgressData }>(page, '/tracks/topik-ko/curriculum/progress');
    expect(progress.status).toBe(200);
    expect(progress.data.data.completed_item_ids).toContain(FIXTURE_VOCAB_ID);
    const due = await topikApi<{ data: DueData }>(page, '/tracks/topik-ko/curriculum/review/due?limit=20');
    expect(due.status).toBe(200);
    expect(due.data.data.cards.some((card) =>
      card.card_id === completionBody.data.card_id && card.item.id === FIXTURE_VOCAB_ID,
    )).toBe(true);

    await page.goto('/track/topik-ko/review');
    const reviewSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'TOPIK 1–6 · 복습' }) });
    await expect(reviewSection.getByText('Which meaning best matches 안녕하세요?')).toBeVisible();
    await reviewSection.getByRole('button', { name: '해설', exact:true }).click();
    const reviewResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/tracks/topik-ko/curriculum/review') && response.request().method() === 'POST',
    );
    await reviewSection.getByRole('button', { name: '기억했어요' }).click();
    const reviewed = await reviewResponse;
    expect(reviewed.status()).toBe(200);
    const reviewBody = await reviewed.json() as { data: { due_at: number } };
    expect(reviewBody.data.due_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    await expect(reviewSection.getByText('예약된 복습이 없습니다.')).toBeVisible();
    const dueAfterReview = await topikApi<{ data: DueData }>(page, '/tracks/topik-ko/curriculum/review/due?limit=20');
    expect(dueAfterReview.data.data.cards.some((card) =>
      card.card_id === completionBody.data.card_id && card.item.id === FIXTURE_VOCAB_ID,
    )).toBe(false);

    await expectIsolatedUser(browser, page);
  });

  test('exposes a real Batch 4 owner item only through the owner curriculum and connects it to Google speech and FSRS', async ({ page }) => {
    await installGoogleKoreanSpeechMock(page);
    await mockTopikReadApis(page);
    await registerTopikUser(page);
    const audioRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/audio/')) audioRequests.push(request.url());
    });

    const listed = await topikApi<{ data: { target_grade: number; units: Array<{ title_ko: string; items: Array<{ id: string; audio: { kind: string; text_ko?: string } | null }> }> } }>(page, '/tracks/topik-ko/curriculum?target_grade=6');
    expect(listed.status).toBe(200);
    const batch4Unit = listed.data.data.units.find((unit) => unit.title_ko === BATCH4_GRADE6_UNIT_TITLE);
    expect(batch4Unit?.items.find((item) => item.id === BATCH4_GRADE6_VOCAB_ID)?.audio).toEqual({ kind: 'google', text_ko: '자료 해석' });
    expect(JSON.stringify(listed.data)).not.toContain('answer_index');
    expect(JSON.stringify(listed.data)).not.toContain('해설');

    await page.goto('/track/topik-ko/learn');
    const section = ownerCurriculumSection(page);
    await expect(section).toBeVisible();
    await section.getByRole('tab', { name: '6급', exact: true }).click();
    const unitData=await topikApi<{data:{units:Array<{title_ko:string;title_en:string}>}}>(page,'/tracks/topik-ko/curriculum?target_grade=6');
    const title=unitData.data.data.units.find(u=>u.title_ko===BATCH4_GRADE6_UNIT_TITLE)!.title_en;
    await section.locator('article').filter({has:page.getByRole('heading',{name:title,exact:true})}).getByRole('button',{name:'학습',exact:true}).click();
    const batch4Card = section.locator('article').filter({ hasText: '자료 해석' });
    await expect(batch4Card).toBeVisible();
    await batch4Card.getByRole('button', { name: '소리 듣기' }).click();
    await expect.poll(() => page.evaluate(() => window.__topikSpeechCalls ?? 0)).toBe(1);
    await expect.poll(() => page.evaluate(() => window.__topikSpeechVoiceNames ?? [])).toEqual(['Google Korean']);
    await batch4Card.getByRole('radio', { name: '자료 해석' }).click();
    const completionResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/v1/tracks/topik-ko/curriculum/items/${BATCH4_GRADE6_VOCAB_ID}/complete`) && response.request().method() === 'POST',
    );
    await batch4Card.getByRole('button', { name: '해설', exact:true }).click();
    await batch4Card.getByRole('button', { name:'학습 완료로 기록' }).click();
    expect((await completionResponse).status()).toBe(200);
    const progress = await topikApi<{ data: ProgressData }>(page, '/tracks/topik-ko/curriculum/progress');
    const due = await topikApi<{ data: DueData }>(page, '/tracks/topik-ko/curriculum/review/due?limit=20');
    expect(progress.data.data.completed_item_ids).toContain(BATCH4_GRADE6_VOCAB_ID);
    expect(due.data.data.cards.some((card) => card.item.id === BATCH4_GRADE6_VOCAB_ID)).toBe(true);
    expect(audioRequests).toEqual([]);
  });
});

async function expectIsolatedUser(browser: Browser, page: Page): Promise<void> {
  const otherContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const otherPage = await otherContext.newPage();
    await installGoogleKoreanSpeechMock(otherPage);
    await mockTopikReadApis(otherPage);
    await registerTopikUser(otherPage);
    const progress = await topikApi<{ data: ProgressData }>(otherPage, '/tracks/topik-ko/curriculum/progress');
    const due = await topikApi<{ data: DueData }>(otherPage, '/tracks/topik-ko/curriculum/review/due?limit=20');
    expect(progress.status).toBe(200);
    expect(progress.data.data.completed_item_ids).not.toContain(FIXTURE_VOCAB_ID);
    expect(due.status).toBe(200);
    expect(due.data.data.cards.some((card) => card.item.id === FIXTURE_VOCAB_ID)).toBe(false);
  } finally {
    await otherContext.close();
  }
}
