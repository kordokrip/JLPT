import { expect, test } from '@playwright/test';
import { mockTopikReadApis, registerTopikUser } from './topik-helper';

test.describe('TOPIK 한글 문자 암기', () => {
  test('가·나·다 덱의 관찰·쓰기·퀴즈와 자음/모음 전환이 동작한다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockTopikReadApis(page);
    await registerTopikUser(page);
    await page.goto('/track/topik-ko/characters', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /한글을 보고, 쓰고, 기억하세요|See, write, and remember Hangul|ハングルを見て、書いて、覚える/ })).toBeVisible();
    await expect(page.getByText('가').first()).toBeVisible();
    await expect(page.getByText('가방').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /가방.*발음|Play Korean pronunciation for 가방|가방の韓国語発音/ })).toBeVisible();
    await page.getByRole('button', { name: /가방.*발음|Play Korean pronunciation for 가방|가방の韓国語発音/ }).click();

    await page.getByRole('button', { name: /3\. 손으로 쓰기|3\. Write|3\. 手書き/ }).click();
    const canvas = page.getByLabel(/한글 쓰기 연습 캔버스|Hangul handwriting practice canvas|ハングル手書き練習キャンバス/);
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
    await page.getByRole('button', { name: '채점하기' }).click();
    await expect(page.getByText(/통과입니다|다시 쓰는 편|아직 충분히/)).toBeVisible();

    await page.getByRole('button', { name: /4\. 손쓰기 퀴즈|4\. Handwriting quiz|4\. 手書きクイズ/ }).click();
    await expect(page.getByText(/ga.*한글|Hangul character for the ga|ga表記/).first()).toBeVisible();
    await page.getByRole('button', { name: /5\. 즉시 테스트|5\. Quick check|5\. 即時テスト/ }).click();
    await page.getByRole('button', { name: 'ga', exact: true }).click();
    await expect(page.getByText(/정답입니다|Correct\.|正解です/)).toBeVisible();

    await page.getByRole('tab', { name: /자음|Consonants|子音/ }).click();
    await expect(page.getByText('ㄱ').first()).toBeVisible();
    await page.getByRole('tab', { name: /모음|Vowels|母音/ }).click();
    await expect(page.getByText('ㅏ').first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
