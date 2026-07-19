import { expect, type Page } from '@playwright/test';

export const MOCK_TOPIK_STATUS = {
  track: 'topik-ko',
  available: true,
  content_release: 'placement-preview',
  available_levels: ['TOPIK-I'],
  available_sections: ['listening', 'reading'],
  write_enabled: true,
} as const;

export async function mockTopikReadApis(page: Page): Promise<void> {
  await page.route('**/api/v1/tracks/topik-ko/status', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: MOCK_TOPIK_STATUS }),
  }));
  await page.route('**/api/v1/tracks/topik-ko/placement/latest', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: null }),
  }));
  await page.route('**/api/v1/tracks/topik-ko/placement/review', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [] }),
  }));
}

export async function registerTopikUser(page: Page): Promise<void> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
  await page.getByRole('radio', { name: /한국어 · TOPIK|Korean · TOPIK|韓国語 · TOPIK/ }).click();
  await page.getByRole('link', { name: /회원가입|Create account|アカウント作成/ }).first().click();
  await page.getByLabel('이름').fill('TOPIK E2E 사용자');
  await page.getByLabel('이메일').fill(`topik-${unique}@example.com`);
  await page.getByLabel('비밀번호').fill('Passw0rd1234');
  await page.getByRole('button', { name: /계정 만들기|Create account|アカウント作成/ }).click();
  await expect(page).toHaveURL(/\/track\/topik-ko$/);
  await expect(page.getByRole('heading', { name: /현재 실력에서 시작하는 한국어 학습 루틴|Build a Korean routine|今の実力から韓国語/ })).toBeVisible();
}
