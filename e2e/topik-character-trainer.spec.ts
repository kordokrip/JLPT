import { expect, test } from '@playwright/test';
import { mockTopikReadApis, registerTopikUser } from './topik-helper';

test.describe('TOPIK 한글 문자 암기', () => {
  test('가·나·다 덱의 관찰·쓰기·퀴즈와 자음/모음 전환이 동작한다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockTopikReadApis(page);
    await registerTopikUser(page);
    await page.goto('/track/topik-ko/characters', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /문자 암기|Characters|文字の練習/ })).toBeVisible();
    await expect(page.getByText('가').first()).toBeVisible();
    await expect(page.locator('.character-info')).toContainText('가방');
    await expect(page.getByRole('button', { name: /발음 듣기|Play pronunciation|発音を聞く/ })).toBeVisible();
    await page.getByRole('button', { name: /발음 듣기|Play pronunciation|発音を聞く/ }).click();

    await page.getByRole('button', { name: /따라 쓰기|Practice writing|書く練習/ }).click();
    const canvas = page.getByLabel(/쓰기 연습 캔버스|Writing practice canvas|文字を書くキャンバス/);
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + 70, box.y + 80);
      await page.mouse.down();
      await page.mouse.move(box.x + 220, box.y + 80);
      await page.mouse.up();
      await page.mouse.move(box.x + 145, box.y + 55);
      await page.mouse.down();
      await page.mouse.move(box.x + 145, box.y + 205);
      await page.mouse.up();
    }
    await page.getByRole('button', { name: /쓰기 크기 확인|Check writing size|書いた大きさを確認/ }).click();
    await expect(page.getByText(/연습 흔적이 충분|크기와 위치를 조정|먼저 캔버스에|十分に書け|大きさと位置|まずキャンバス/)).toBeVisible();

    await page.getByRole('button', { name: /기억해서 쓰기|Write from memory|見ずに書く/ }).click();
    await expect(page.locator('.character-glyph')).toHaveText('?');
    await page.getByRole('button', { name: /구별하기|Distinguish|見分ける/, exact: true }).click();
    await page.getByRole('button', { name: 'ga', exact: true }).click();
    await expect(page.getByText(/잘 떠올렸어요|Nicely recalled|思い出せました/)).toBeVisible();

    await page.getByRole('button', { name: /자음|Consonants|子音/, exact: true }).click();
    await expect(page.getByText('ㄱ').first()).toBeVisible();
    await page.getByRole('button', { name: /모음|Vowels|母音/, exact: true }).click();
    await expect(page.getByText('ㅏ').first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
