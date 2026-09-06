import { expect, test } from '@playwright/test';

import { mockTopikReadApis, registerTopikUser } from './topik-helper';

const counters = {
  events: 10,
  completed: 0,
  quiz_answered: 10,
  quiz_correct: 2,
  reviews: 0,
  speech_attempts: 0,
  speech_played: 0,
  speech_unavailable: 0,
  speech_errors: 0,
};

test('guided records keep first responses, retries and legacy activity separate', async ({ page }) => {
  await mockTopikReadApis(page);
  await page.route('**/api/v1/learning/records?*',route=>route.fulfill({json:{data:{window:'7d',totals:{first_answers:4,first_correct:1,retry_answers:2,retry_correct:2,learned:3,reviews:1,active_ms:120000},days:[],groups:[],sessions:[],next_review_at:null}}}));
  await page.route('**/api/v1/activity/summary?*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: {
      window: '30d',
      from: '2026-07-20T00:00:00.000Z',
      totals: counters,
      groups: [{
        ...counters,
        learning_track: 'topik-ko',
        level_tag: 'TOPIK-I',
        section: 'listening',
        mode: null,
      }],
    } }),
  }));

  await registerTopikUser(page);
  await page.goto('/records');
  await expect(page.getByRole('heading',{name:'최초 응답'}).locator('..')).toContainText('1/4');
  await expect(page.getByRole('heading',{name:'재시도',exact:true}).locator('..')).toContainText('2/2');
  const all=page.getByRole('heading',{name:'전체 학습 활동'}).locator('..');
  await expect(all).toContainText('응답 수: 10');
  await expect(all).toContainText('위 세션 통계와 더하지 않습니다');
  await expect(page.getByText('50/10/5')).toHaveCount(0);
});
