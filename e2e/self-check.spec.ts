import { expect, test, type Page } from '@playwright/test';

async function expectNoRuntimeFailures(page: Page, run: () => Promise<void>) {
  const badResponses: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/v1/') && response.status() >= 400) {
      badResponses.push(`${response.status()} ${url}`);
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await run();

  expect(badResponses, 'bad API responses').toEqual([]);
  expect(consoleErrors, 'browser console errors').toEqual([]);
  expect(pageErrors, 'uncaught page errors').toEqual([]);
}

test.describe('자가진단 기능', () => {
  test('한국어 자기진단 문항과 추천 학습 방향을 렌더링하고 저장한다', async ({ page }) => {
    await expectNoRuntimeFailures(page, async () => {
      await page.addInitScript(() => {
        localStorage.setItem('nihongo-n3-settings', JSON.stringify({
          state: { language: 'ko' },
          version: 0,
        }));
      });
      await page.goto('/self-check');
      await expect(page.getByRole('heading', { name: /자가진단|Self-Check|自己診断/ })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('추천 학습 방향')).toBeVisible();
      await expect(page.getByText(/N3 지문에서 모르는 단어/)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/매일 N3 어휘|문장 단위로 복습/).first()).toBeVisible();

      await page.getByText(/N3 지문에서 모르는 단어/).click();
      await page.getByText(/짧은 안내문, 이메일, 공지문/).click();
      await page.getByRole('button', { name: /진단 저장|Save self-check|診断を保存/ }).click();
      await expect(page.getByText(/저장되었습니다|Saved|保存しました/)).toBeVisible({ timeout: 20_000 });
    });
  });
});
