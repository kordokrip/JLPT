import { expect, test, type Page } from '@playwright/test';

type SessionUser = { id: string; learning_track: 'jlpt-ja' | 'topik-ko' };

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
    await page.getByRole('button', { name: /한국어 · TOPIK/ }).click();
    await page.getByRole('link', { name: '회원가입' }).first().click();
    await page.getByLabel('이름').fill('트랙 격리 테스트');
    await page.getByLabel('이메일').fill(`track-${unique}@example.com`);
    await page.getByLabel('비밀번호').fill('Passw0rd1234');
    await page.getByRole('button', { name: '계정 만들기' }).click();

    await expect(page).toHaveURL(/\/track\/topik-ko$/);
    await expect(page.getByRole('heading', { name: /한국어 학습 트랙 기반/ })).toBeVisible();
    const topikUser = await sessionUser(page);
    expect(topikUser.learning_track).toBe('topik-ko');
    const topikScope = `user:${topikUser.id}|track:topik-ko`;
    await addScopedCard(page, topikScope);

    await page.getByRole('button', { name: 'JLPT 일본어 학습으로 전환' }).click();
    await expect(page).toHaveURL(/\/$/);
    const jlptUser = await sessionUser(page);
    expect(jlptUser.learning_track).toBe('jlpt-ja');
    const jlptScope = `user:${jlptUser.id}|track:jlpt-ja`;
    await addScopedCard(page, jlptScope);

    await expect.poll(() => cardScopes(page)).toEqual([jlptScope, topikScope].sort());

    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '한국어 · TOPIK' }).click();
    await expect(page).toHaveURL(/\/track\/topik-ko$/);
    expect((await sessionUser(page)).learning_track).toBe('topik-ko');
    await expect.poll(() => cardScopes(page)).toEqual([jlptScope, topikScope].sort());
  });
});
