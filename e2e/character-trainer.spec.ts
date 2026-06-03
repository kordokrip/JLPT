import { expect, test } from '@playwright/test';

test.describe('문자 암기 트레이너', () => {
  test('히라가나/가타카나 관찰-쓰기-퀴즈 루프가 동작한다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/characters', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: '문자 암기' })).toBeVisible();
    await expect(page.getByText('あ').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '1. 관찰' })).toBeVisible();
    await expect(page.getByText('읽기', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('a').first()).toBeVisible();

    await page.getByRole('button', { name: '3. 손으로 쓰기' }).click();
    await expect(page.getByLabel('쓰기 연습 캔버스')).toBeVisible();
    await expect(page.getByText('쓰기 순서 힌트')).toBeVisible();

    await page.getByRole('button', { name: '4. 즉시 테스트' }).click();
    await page.getByRole('button', { name: /^a$/ }).click();
    await expect(page.getByText('정답입니다.')).toBeVisible();

    await page.getByRole('button', { name: '가타카나' }).click();
    await expect(page.getByText('ア').first()).toBeVisible();
  });

  test('한자 모드는 API 데이터와 JLPT 레벨 선택 UI를 제공한다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/characters', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: '한자' }).click();
    await expect(page.getByRole('button', { name: 'N5' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'N4' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'N3' })).toBeVisible();
    await expect(page.getByText(/한자 데이터를 불러오는 중입니다.|획수/).first()).toBeVisible();
  });
});
