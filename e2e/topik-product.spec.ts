import { expect, test } from '@playwright/test';
import { mockTopikReadApis, registerTopikUser } from './topik-helper';

const ATTEMPT_ID = '10000000-0000-4000-8000-000000000001';

test.describe('TOPIK product flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockTopikReadApis(page);
  });

  test('dashboard, offline lesson, placement and result keep the TOPIK track contract', async ({ page }) => {
    const unexpectedAudioRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/audio/')) unexpectedAudioRequests.push(request.url());
    });
    await page.route('**/api/v1/tracks/topik-ko/placement/attempts', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: {
          id: ATTEMPT_ID,
          bank_version: 'v2',
          status: 'in_progress',
          instruction_language: 'ja',
          started_at: 1_768_000_000,
          questions: [
            {
              id: 'listen-1', section: 'listening', skill: 'detail', difficulty: 1,
              prompt_ko: '여자는 어디에 갑니까?', prompt_ja: '女性はどこへ行きますか。', prompt_en: 'Where is the woman going?',
              choices: ['학교', '은행', '병원', '시장'],
              audio: { kind: 'unavailable', reason: 'preparing' },
            },
            {
              id: 'read-1', section: 'reading', skill: 'notice', difficulty: 1,
              prompt_ko: '오늘 문을 닫는 곳은 어디입니까?', prompt_ja: '今日閉まっている場所はどこですか。', prompt_en: 'Which place is closed today?',
              choices: ['도서관', '우체국', '약국', '식당'], audio: null,
            },
          ],
        } }),
      });
    });
    await page.route(`**/api/v1/tracks/topik-ko/placement/attempts/${ATTEMPT_ID}/submit`, (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {
        attempt_id: ATTEMPT_ID,
        score_total: 100,
        score_listening: 100,
        score_reading: 100,
        result_band: 'ready',
        answers: [
          { question_id: 'listen-1', selected_index: 1, answer_index: 1, is_correct: true, explanation_en: 'The woman says bank.', explanation_ko: '여자는 은행에 간다고 말합니다.' },
          { question_id: 'read-1', selected_index: 0, answer_index: 0, is_correct: true, explanation_en: 'The notice says the library is closed.', explanation_ko: '안내문에 도서관 휴관이라고 적혀 있습니다.' },
        ],
      } }),
    }));

    await registerTopikUser(page);
    await expect(page.locator('a[href="/track/topik-ko/learn"]').first()).toBeVisible();
    await expect(page.locator('a[href="/browse/vocab"]')).toHaveCount(0);

    await page.goto('/settings');
    await page.getByRole('button', { name: '日本語' }).last().click();

    await page.goto('/track/topik-ko/learn');
    await expect(page.getByTitle(/오디오가 준비 중|Audio is still being prepared|音声を準備中/).first()).toBeVisible();
    await page.getByRole('button', { name: /완료로 표시|Mark complete|完了にする/ }).first().click();
    await expect(page.getByRole('button', { name: /미완료로 변경|Mark incomplete|未完了に戻す/ }).first()).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('radio', { name: /은행/ }).last().click();
    await page.getByRole('button', { name: /해설 확인|Show explanation|解説を見る/ }).click();
    await expect(page.getByText(/聞き取り文で、銀行へ行くと言っています/)).toBeVisible();
    await page.getByRole('tab', { name: 'TOPIK II' }).click();
    await page.getByRole('tab', { name: /쓰기|Writing|書き/ }).click();
    await page.getByRole('textbox', { name: /쓰기 답안|Writing response|作文の回答/ }).fill('주말에 친구를 만납니다.');
    await page.getByRole('button', { name: /해설 확인|Show explanation|解説を見る/ }).click();
    await expect(page.getByText(/週末の計画を二文で書けばよい問題です/)).toBeVisible();

    await page.goto('/track/topik-ko/placement');
    await page.getByRole('button', { name: /진단 시작|Start placement|診断を始める/ }).click();
    await expect(page.getByText('女性はどこへ行きますか。')).toBeVisible();
    await expect(page.getByText('여자는 은행에 갑니다.')).toHaveCount(0);
    await expect(page.getByText(/오디오가 준비 중|Audio is still being prepared|音声を準備中/).last()).toBeVisible();
    expect(unexpectedAudioRequests).toEqual([]);

    await page.getByRole('radio', { name: /은행/ }).click();
    await page.getByRole('button', { name: /다음|Next|次へ/ }).click();
    await page.getByRole('radio', { name: /도서관/ }).click();
    await page.getByRole('button', { name: /진단 제출|Submit placement|診断を提出/ }).click();
    await expect(page.getByRole('heading', { name: /TOPIK I 준비 단계|TOPIK I Ready|TOPIK I 準備段階/ })).toBeVisible();
    await expect(page.getByText('100').first()).toBeVisible();
  });

  test('all TOPIK routes render without horizontal overflow at target viewports', async ({ page }) => {
    await registerTopikUser(page);
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      for (const route of ['/track/topik-ko', '/track/topik-ko/learn', '/track/topik-ko/review', '/track/topik-ko/progress', '/track/topik-ko/placement']) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main')).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        const smallControls = await page.locator('main').evaluate((main) => Array.from(main.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea'))
          .filter((node) => {
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          })
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return { label: node.getAttribute('aria-label') ?? node.textContent?.trim().slice(0, 40), width: Math.round(rect.width), height: Math.round(rect.height) };
          })
          .filter((control) => control.width < 40 || control.height < 40));
        expect(smallControls, `${route} should keep 40px minimum touch targets`).toEqual([]);
      }
    }
  });
});
