import { expect, test } from '@playwright/test';

test.describe('자연 일본어 검색 UX', () => {
  test('데스크톱 사이드 메뉴를 접고 펼칠 수 있다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: /사이드|Sidebar|サイド/ })).toHaveAttribute('data-state', 'expanded');
    await page.getByRole('button', { name: /사이드 메뉴 접기|Collapse side menu|サイドメニューをたたむ/ }).click();
    await expect(page.getByRole('navigation', { name: /사이드|Sidebar|サイド/ })).toHaveAttribute('data-state', 'collapsed');
    await page.getByRole('button', { name: /사이드 메뉴 펼치기|Expand side menu|サイドメニューを開く/ }).click();
    await expect(page.getByRole('navigation', { name: /사이드|Sidebar|サイド/ })).toHaveAttribute('data-state', 'expanded');
  });

  test('한국어 표현을 자연 일본어로 바꿔 어휘 검색에 사용한다', async ({ page }) => {
    await page.route('**/api/v1/ai/translate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sourceText: '오늘은 조금 피곤해요',
            translatedText: '今日は少し疲れています。',
            readingHint: 'きょうは すこし つかれています。',
            nuanceKo: '정중하고 자연스러운 일상 표현입니다.',
            alternatives: ['今日はちょっと疲れています。'],
            model: '@cf/zai-org/glm-4.7-flash',
          },
        }),
      });
    });

    await page.goto('/browse/vocab');
    await page.getByPlaceholder(/오늘은 일이 많아서|今日は仕事|I am a little tired/).fill('오늘은 조금 피곤해요');
    await page.getByRole('button', { name: /자연 일본어로 변환|Convert to natural Japanese|自然な日本語に変換/ }).click();

    await expect(page.getByText('今日は少し疲れています。')).toBeVisible();
    await page.getByRole('button', { name: /이 표현으로 검색|Search this expression|この表現で検索/ }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('今日は少し疲れています。');
    await expect(page).toHaveURL(/\/browse\/vocab\?q=/);
  });
});
