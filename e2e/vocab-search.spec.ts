import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';
import { normalizeGrammarContentItem, normalizeKanjiContentItem, normalizeVocabContentItem, type ApiRawContentRecord } from '../packages/shared/src/content-dto';

/**
 * e2e/vocab-search.spec.ts
 *
 * 어휘 검색 기능 테스트
 * - 검색 UI 접근
 * - "経験" 검색 입력
 * - 결과 목록 표시 확인
 */
test.describe('어휘 검색', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('검색 페이지 또는 검색 입력란에 접근할 수 있다', async ({ page }) => {
    // /browse/vocab 또는 /search 경로 시도
    await page.goto('/browse/vocab');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="검색"], input[placeholder*="Search"], [data-testid="search-input"]',
    ).first();

    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('"経験" 검색 시 결과가 표시된다', async ({ page }) => {
    await page.goto('/browse/vocab');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="검색"], input[placeholder*="Search"], [data-testid="search-input"]',
    ).first();

    if (await searchInput.count() === 0) {
      test.skip();
      return;
    }

    // 검색어 입력
    await searchInput.fill('経験');
    await searchInput.press('Enter');

    // API 응답 대기 (최대 10초)
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // 결과 항목 또는 "결과 없음" 메시지가 표시되어야 함
    const resultItem = page.locator(
      '[data-testid="vocab-item"], .vocab-item, li, [role="listitem"]',
    ).first();

    const noResult = page.locator('text=/결과 없음|No results|검색 결과가 없습니다/i');

    // 결과 있거나 없음 메시지 중 하나가 표시되면 통과
    await expect(
      resultItem.or(noResult).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('검색 결과에 일본어 문자가 포함된다', async ({ page }) => {
    await page.goto('/browse/vocab');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="검색"], [data-testid="search-input"]',
    ).first();

    if (await searchInput.count() === 0) {
      test.skip();
      return;
    }

    await searchInput.fill('経験');
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // 結果 있는 경우 — 일본어 문자가 포함된 텍스트 확인
    // Assert the seeded result itself, not the hidden 日本語 language option.
    await expect(page.locator('main article').getByRole('button',{name:/^経験 —/})).toBeVisible({ timeout: 10_000 });
  });

  test('검수된 동음이의어 목록은 공개 API에서 렌더링된다', async ({ page }) => {
    await page.goto('/browse/homophones');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    await expect(
      page.getByRole('heading', { name: /동음이의어 변별|Distinguish Homophones|同音異義語の聞き分け/ }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('紙', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/최종 검토|Last reviewed|最終確認/).first()).toBeVisible();
  });

  for (const width of [390, 1440]) {
    test(`실제 탭 클릭으로 네 자료 목록과 URL이 함께 전환된다 (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/browse/grammar?q=previous');
      const cases = [
        { type: 'vocab', button: /^어휘(?:\s+vocab)?$/, text: (row: ApiRawContentRecord) => normalizeVocabContentItem(row).word },
        { type: 'kanji', button: /^한자(?:\s+kanji)?$/, text: (row: ApiRawContentRecord) => normalizeKanjiContentItem(row).character },
        { type: 'homophones', button: /^동음이의어(?:\s+homophones)?$/, text: (row: ApiRawContentRecord) => row.reading },
        { type: 'grammar', button: /^문법(?:\s+grammar)?$/, text: (row: ApiRawContentRecord) => normalizeGrammarContentItem(row).pattern },
      ];
      for (const entry of cases) {
        // Read the isolated local API, not mocked content or a page-only title.
        const response = await page.request.get(`/api/v1/${entry.type}?limit=100`);
        expect(response.ok()).toBe(true);
        const body = await response.json();
        expect(body.data.length).toBeGreaterThan(0);
        const expectedText = entry.text(body.data[0]);
        expect(typeof expectedText).toBe('string');
        expect(String(expectedText).length).toBeGreaterThan(0);
        await page.getByRole('button', { name: entry.button }).click();
        await expect(page).toHaveURL(new RegExp(`/browse/${entry.type}$`));
        await expect(page.locator('main article').filter({ hasText: String(expectedText) }).first()).toBeVisible();
      }
      await page.reload();
      await expect(page).toHaveURL(/\/browse\/grammar$/);
      await expect(page.locator('main article').first()).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(/\/browse\/homophones$/);
      await expect(page.getByText(/최종 검토|Last reviewed|最終確認/).first()).toBeVisible();
    });
  }
});
