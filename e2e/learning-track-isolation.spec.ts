import { expect, test, type Page } from '@playwright/test';

type SessionUser = { id: string; learning_track: 'jlpt-ja' | 'topik-ko' };
type ApiResult<T> = { status: number; body: T };

async function api<T>(
  page: Page,
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>,
): Promise<ApiResult<T>> {
  return page.evaluate(async ({ requestPath, requestMethod, requestBody }) => {
    const response = await fetch(requestPath, {
      method: requestMethod,
      credentials: 'include',
      headers: requestBody ? { 'Content-Type': 'application/json' } : undefined,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });
    return { status: response.status, body: await response.json() };
  }, { requestPath: path, requestMethod: method, requestBody: body }) as Promise<ApiResult<T>>;
}

async function sessionUser(page: Page): Promise<SessionUser> {
  return page.evaluate(async () => {
    const response = await fetch('/api/v1/auth/me', { credentials: 'include' });
    const body = await response.json() as { data: { user: SessionUser } };
    return body.data.user;
  });
}

async function addScopedCard(page: Page, userId: string): Promise<void> {
  await page.evaluate(async (scope) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('nihongo-n3');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('srs_cards', 'readwrite');
      transaction.objectStore('srs_cards').add({
        user_id: scope,
        item_type: 'vocab',
        item_id: scope.endsWith('topik-ko') ? 901 : 902,
        state: 'new',
        stability: 0,
        difficulty: 0,
        lapses: 0,
        reps: 0,
        due_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, userId);
}

async function cardScopes(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('nihongo-n3');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<Array<{ user_id: string }>>((resolve, reject) => {
      const request = database.transaction('srs_cards', 'readonly').objectStore('srs_cards').getAll();
      request.onsuccess = () => resolve(request.result as Array<{ user_id: string }>);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return rows.map((row) => row.user_id).sort();
  });
}

test.describe('계정 및 학습 트랙 격리', () => {
  test('TOPIK과 JLPT 학습 데이터가 서로 다른 namespace에 유지된다', async ({ page }) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await page.getByRole('radio', { name: /한국어 · TOPIK/ }).click();
    await page.getByRole('link', { name: '회원가입' }).first().click();
    await page.getByLabel('이름').fill('트랙 격리 테스트');
    await page.getByLabel('이메일').fill(`track-${unique}@example.com`);
    await page.getByLabel('비밀번호').fill('Passw0rd1234');
    await page.getByRole('button', { name: '계정 만들기' }).click();

    await expect(page).toHaveURL(/\/track\/topik-ko$/);
    await expect(page.getByRole('heading', { name: /현재 실력에서 시작하는 한국어 학습 루틴/ })).toBeVisible();
    const topikUser = await sessionUser(page);
    expect(topikUser.learning_track).toBe('topik-ko');
    const topikScope = `user:${topikUser.id}|track:topik-ko`;
    await addScopedCard(page, topikScope);

    const topikDaily = await api<{ data: { date: string } }>(page, '/api/v1/logs/daily', 'POST', {
      date: '2026-07-17', items_new: 2, items_review: 0, time_min: 1, audio_min: 0,
    });
    expect(topikDaily.status).toBe(201);
    const topikCheck = await api<{ data: { week_no: number } }>(page, '/api/v1/self-check', 'POST', {
      week_no: 1, vocab_score: 20,
    });
    expect(topikCheck.status).toBe(201);
    const topikSync = await api<{
      data: { server_delta: { daily_logs: Array<{ learning_track: string }> } };
    }>(page, '/api/v1/sync', 'POST', {
      client_id: `track-isolation-${unique}`,
      last_synced_at: '2000-01-01T00:00:00.000Z',
      operations: [{
        op_id: '00000000-0000-4000-8000-000000000211',
        type: 'daily_log',
        payload: { date: '2026-07-16', items_new: 3, items_review: 0, time_min: 1, audio_min: 0 },
        occurred_at: new Date().toISOString(),
      }],
    });
    expect(topikSync.status).toBe(200);
    expect(topikSync.body.data.server_delta.daily_logs).toHaveLength(2);
    expect(topikSync.body.data.server_delta.daily_logs.every((row) => row.learning_track === 'topik-ko')).toBe(true);

    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '일본어 · JLPT' }).click();
    await expect(page).toHaveURL(/\/$/);
    const jlptUser = await sessionUser(page);
    expect(jlptUser.learning_track).toBe('jlpt-ja');
    const jlptScope = `user:${jlptUser.id}|track:jlpt-ja`;
    await addScopedCard(page, jlptScope);

    const jlptDaily = await api<{ data: { date: string } }>(page, '/api/v1/logs/daily', 'POST', {
      date: '2026-07-17', items_new: 9, items_review: 0, time_min: 1, audio_min: 0,
    });
    expect(jlptDaily.status).toBe(201);
    const jlptCheck = await api<{ data: { week_no: number } }>(page, '/api/v1/self-check', 'POST', {
      week_no: 1, vocab_score: 90,
    });
    expect(jlptCheck.status).toBe(201);
    const jlptLogs = await api<{ data: Array<{ learning_track: string; items_new: number }> }>(page, '/api/v1/logs/daily');
    expect(jlptLogs.status).toBe(200);
    expect(jlptLogs.body.data).toHaveLength(1);
    expect(jlptLogs.body.data[0]).toMatchObject({ learning_track: 'jlpt-ja', items_new: 9 });
    const jlptScore = await api<{ data: { learning_track: string; vocab_score: number } }>(page, '/api/v1/self-check/1');
    expect(jlptScore.body.data).toMatchObject({ learning_track: 'jlpt-ja', vocab_score: 90 });

    await expect.poll(() => cardScopes(page)).toEqual([jlptScope, topikScope].sort());

    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '한국어 · TOPIK' }).click();
    await expect(page).toHaveURL(/\/track\/topik-ko$/);
    expect((await sessionUser(page)).learning_track).toBe('topik-ko');
    const topikLogs = await api<{ data: Array<{ learning_track: string; items_new: number }> }>(page, '/api/v1/logs/daily');
    expect(topikLogs.status).toBe(200);
    expect(topikLogs.body.data).toHaveLength(2);
    expect(topikLogs.body.data.every((row) => row.learning_track === 'topik-ko')).toBe(true);
    const topikScore = await api<{ data: { learning_track: string; vocab_score: number } }>(page, '/api/v1/self-check/1');
    expect(topikScore.body.data).toMatchObject({ learning_track: 'topik-ko', vocab_score: 20 });
    await expect.poll(() => cardScopes(page)).toEqual([jlptScope, topikScope].sort());
  });
});
