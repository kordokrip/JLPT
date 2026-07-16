import { expect, test, type Page } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';

const N5_N1_TRACK_STATUS = {
  data: {
    track: 'jlpt-ja',
    available: true,
    content_release: 'n5-n1',
    available_levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
    write_enabled: true,
  },
};

const N2_VOCAB_RESPONSE = {
  data: [{
    id: 92001,
    level: 'N2',
    ja: '検証語',
    kana: 'けんしょうご',
    ko: '검증용 N2 어휘',
    pos: '명사',
  }],
  meta: { limit: 200, hasMore: false },
};

async function mockReleasedN5ToN1Content(page: Page) {
  await page.route('**/api/v1/tracks/jlpt-ja/status', (route) => route.fulfill({ json: N5_N1_TRACK_STATUS }));
  await page.route('**/api/v1/content/version', (route) => route.fulfill({
    json: {
      data: {
        version: 'n7-n5-n1-fixture',
        generatedAt: '2026-07-16T00:00:00.000Z',
        tables: {},
      },
    },
  }));
  await page.route('**/api/v1/vocab**', (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('level') !== 'N2') return route.continue();
    return route.fulfill({ json: N2_VOCAB_RESPONSE });
  });
}

async function contentVersionMeta(page: Page, key: string): Promise<string | undefined> {
  return page.evaluate(async (metaKey) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('nihongo-n3');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const item = await new Promise<{ value?: string } | undefined>((resolve, reject) => {
      const request = database.transaction('meta', 'readonly').objectStore('meta').get(metaKey);
      request.onsuccess = () => resolve(request.result as { value?: string } | undefined);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return item?.value;
  }, key);
}

test.describe('N2/N1 release gating', () => {
  test('default seeded content keeps N2 and N1 hidden', async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto('/browse/vocab');

    await expect(page.getByRole('button', { name: 'N5', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'N3', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'N2', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'N1', exact: true })).toHaveCount(0);
  });

  test('released N2 content becomes selectable and keeps higher-level progress separate on Home', async ({ page }) => {
    // Browser UI contract fixture: API tests independently prove the DB release calculation.
    await mockReleasedN5ToN1Content(page);
    await ensureAuthenticated(page);

    await page.goto('/');
    await expect(page.getByText(/기본 52주 과정과 상위 레벨 학습은 별도로 관리됩니다/)).toBeVisible();
    await expect(page.getByLabel('학습 범위').getByText('N1', { exact: true })).toBeVisible();

    await page.goto('/browse/vocab');

    const n2 = page.getByRole('button', { name: 'N2', exact: true });
    const n1 = page.getByRole('button', { name: 'N1', exact: true });
    await expect(n2).toBeVisible();
    await expect(n1).toBeVisible();
    await n2.click();

    await expect(page.getByText('検証語')).toBeVisible();
    await expect(page.getByText('검증용 N2 어휘')).toBeVisible();
    await expect.poll(() => contentVersionMeta(page, 'content.version:jlpt-ja')).toBe('n7-n5-n1-fixture');
  });
});
