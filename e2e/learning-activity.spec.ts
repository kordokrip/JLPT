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

test('TOPIK dashboard orders next action as due review, incomplete owner learning, then weakest area', async ({ page }) => {
  let dueCards = 2;
  let completedItems = 0;
  await mockTopikReadApis(page);
  await page.route('**/api/v1/tracks/topik-ko/curriculum/progress', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: {
      grades: Array.from({ length: 6 }, (_, index) => ({
        target_grade: index + 1,
        total_items: 4,
        completed_items: index === 0 ? completedItems : 4,
        due_cards: index === 0 ? dueCards : 0,
        review_cards: 0,
      })),
      completed_item_ids: [],
    } }),
  }));
  await page.route('**/api/v1/activity/summary?window=30d', (route) => route.fulfill({
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
  await expect(page.getByRole('heading', { name: /먼저 복습 2개|Complete 2 due reviews|復習2件/ })).toBeVisible();

  dueCards = 0;
  await page.reload();
  await expect(page.getByRole('heading', { name: /TOPIK 1급 미완료|incomplete TOPIK level 1|TOPIK 1級/ })).toBeVisible();

  completedItems = 4;
  await page.reload();
  await expect(page.getByRole('heading', { name: /listening 취약|weakest listening|listening領域/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /시작하기|Start|始める/ }).first()).toHaveAttribute(
    'href',
    '/track/topik-ko/learn?section=listening#topik-practice',
  );
});
