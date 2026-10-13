import { expect, test } from '@playwright/test';

// Synthetic catalog validates rendering/binding only. Actual session persistence
// remains covered by learning-experience and reviewed-learning-lessons suites.
for (const level of ['N5', 'N4', 'N3', 'N2', 'N1', '1', '2', '3', '4', '5', '6']) {
  test(`map renders scoped public catalog and equal navigation: ${level}`, async ({ page }) => {
    test.skip(Boolean(process.env.E2E_BASE_URL), 'Local synthetic UI fixture only');
    await page.setViewportSize({ width: 390, height: 844 });
    const ja = !level.startsWith('N');
    const title = ja ? '予約と変更・〜なので' : '확인 · 의식적인 노력·습관';
    await page.route('**/api/v1/learning/lessons?**', async route => {
      expect(new URL(route.request().url()).searchParams.get('level')).toBe(level);
      await route.fulfill({ json: { ok: true, data: {
        level, next_lesson_id: 'map-fixture-3',
        lessons: Array.from({ length: 20 }, (_, index) => ({
          id: `map-fixture-${index + 1}`, version: 'ui-only-v1', ordinal: index + 1,
          title: `${title} ${index + 1}`, completed: index < 2, active_session_id: null,
        })),
      } } });
    });
    await page.goto('/welcome');
    await page.getByRole('combobox').selectOption(ja ? 'ja' : 'ko');
    if (ja) await page.getByRole('radio', { name: /韓国語.*TOPIK/ }).click();
    await page.goto('/register');
    await page.getByLabel(ja ? '名前' : '이름', { exact: true }).fill('Map UI fixture');
    await page.getByLabel(ja ? 'メールアドレス' : '이메일', { exact: true }).fill(`map-${crypto.randomUUID()}@example.com`);
    await page.getByLabel(ja ? 'パスワード' : '비밀번호', { exact: true }).fill('Passw0rd1234');
    await page.getByRole('button', { name: ja ? 'アカウント作成' : '계정 만들기', exact: true }).click();
    await page.getByLabel(ja ? '目標レベル' : '목표 급수', { exact: true }).selectOption(level);
    await page.getByRole('button', { name: ja ? '保存' : '저장', exact: true }).click();
    const map = page.locator('.learning-map');
    await expect(map.getByRole('heading', { name: ja ? '学習マップ' : '학습 지도', exact: true, level: 1 })).toBeVisible();
    await expect(map.locator('.learning-map__node')).toHaveCount(20);
    const primary = map.locator('.learning-map__button--primary').first();
    await expect(primary).toBeEnabled();
    const box = await primary.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.y + box!.height).toBeLessThan(780);
    const illustration = map.locator('img');
    await expect(illustration).toHaveAttribute('alt', '');
    await expect.poll(() => illustration.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    // Use the mobile nav DOM contract; language labels are checked below.
    const bottom = page.locator('nav.fixed');
    await expect(bottom.getByRole('link')).toHaveCount(4);
    const widths = await bottom.getByRole('link').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width));
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
    if (['N3', '3', '4'].includes(level)) await page.screenshot({ path: test.info().outputPath(`map-${level}.png`), fullPage: false });
    const starts: Array<Record<string, unknown>> = [];
    await page.route('**/api/v1/study/sessions?**', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      starts.push(route.request().postDataJSON());
      await route.fulfill({ status: 503, json: { ok: false, error: { code: 'FIXTURE_UNAVAILABLE', message: 'Synthetic map does not create lessons' } } });
    });
    await primary.click();
    await expect.poll(() => starts.length).toBe(1);
    expect(starts[0]).toMatchObject({ mode: 'quick', lesson_id: 'map-fixture-3' });
    expect(starts[0]?.request_id).toEqual(expect.any(String));
    await page.addStyleTag({ content: ':root { font-size: 32px !important; }' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1024, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
