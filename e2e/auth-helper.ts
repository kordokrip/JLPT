import { expect, type Page } from '@playwright/test';

export async function ensureAuthenticated(page: Page): Promise<void> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('이름').fill('E2E 사용자');
  await page.getByLabel('이메일').fill(`e2e-${unique}@example.com`);
  await page.getByLabel('비밀번호').fill('Passw0rd1234');
  await page.getByRole('button', { name: /계정 만들기|Create account|アカウント作成/ }).click();
  await expect(page.getByRole('heading', { name: /오늘도, 한 걸음|오늘도 천천히|One more step today/ }).first()).toBeVisible({ timeout: 20_000 });
}
