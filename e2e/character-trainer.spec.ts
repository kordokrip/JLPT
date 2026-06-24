import { expect, test } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';

test.describe('문자 암기 트레이너', () => {
  test('히라가나/가타카나 관찰-쓰기-퀴즈 루프가 동작한다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ensureAuthenticated(page);
    await page.goto('/characters', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: '문자 암기' })).toBeVisible();
    await expect(page.getByText('あ').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'あ 발음 듣기' }).first()).toBeVisible();
    await expect(page.getByText('あ → あいさつ (인사)')).toBeVisible();
    await expect(page.getByRole('button', { name: '1. 관찰' })).toBeVisible();
    await expect(page.getByText('읽기', { exact: true }).first()).toBeVisible();
    await expect(page.locator('dd').getByText('a', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'あ 발음 듣기' }).first().click();

    await page.getByRole('button', { name: '3. 손으로 쓰기' }).click();
    await expect(page.getByLabel('쓰기 연습 캔버스')).toBeVisible();
    await expect(page.getByText('쓰기 순서 힌트')).toBeVisible();
    const canvas = page.getByLabel('쓰기 연습 캔버스');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + 80, box.y + 60);
      await page.mouse.down();
      await page.mouse.move(box.x + 210, box.y + 180);
      await page.mouse.up();
      await page.mouse.move(box.x + 230, box.y + 70);
      await page.mouse.down();
      await page.mouse.move(box.x + 120, box.y + 210);
      await page.mouse.up();
      await page.mouse.move(box.x + 95, box.y + 165);
      await page.mouse.down();
      await page.mouse.move(box.x + 240, box.y + 165);
      await page.mouse.up();
    }
    await page.getByRole('button', { name: '채점하기' }).click();
    await expect(page.getByText(/통과입니다|다시 쓰는 편|아직 충분히/)).toBeVisible();

    await page.getByRole('button', { name: '4. 손쓰기 퀴즈' }).click();
    await expect(page.getByText('a 발음의 문자를 떠올려 쓰세요.')).toBeVisible();

    await page.getByRole('button', { name: '5. 즉시 테스트' }).click();
    await page.getByRole('button', { name: /^a$/ }).click();
    await expect(page.getByText('정답입니다.')).toBeVisible();

    await page.getByRole('button', { name: '가타카나' }).click();
    await expect(page.getByText('ア').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'ア 발음 듣기' }).first()).toBeVisible();
  });

  test('한자 모드는 API 데이터와 JLPT 레벨 선택 UI를 제공한다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ensureAuthenticated(page);
    await page.goto('/characters', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: '한자' }).click();
    await expect(page.getByRole('button', { name: 'N5' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'N4' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'N3' })).toBeVisible();
    await expect(page.getByText(/한자 데이터를 불러오는 중입니다.|획수/).first()).toBeVisible();
  });
});
