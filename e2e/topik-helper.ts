import { expect, type Page } from '@playwright/test';

export const MOCK_TOPIK_STATUS = {
  track: 'topik-ko',
  available: true,
  content_release: 'topik-i-ii',
  available_levels: ['TOPIK-I', 'TOPIK-II'],
  available_sections: ['listening', 'writing', 'reading'],
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
  await page.route(/\/api\/v1\/tracks\/topik-ko\/practice(?:\?.*)?$/, (route) => {
    const url = new URL(route.request().url());
    const examLevel = url.searchParams.get('exam_level') === 'TOPIK-II' ? 'TOPIK-II' : 'TOPIK-I';
    const section = url.searchParams.get('section') === 'writing' ? 'writing' : 'listening';
    const writing = examLevel === 'TOPIK-II' && section === 'writing';
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {
        bank_version: 'v2',
        exam_level: examLevel,
        section,
        questions: [writing ? {
          id: 'topik-practice-e2e-writing-001',
          exam_level: 'TOPIK-II',
          section: 'writing',
          question_type: 'writing',
          skill: 'opinion',
          difficulty: 3,
          prompt_ko: '주말 계획을 두 문장으로 쓰세요.',
          prompt_ja: '週末の計画を二文で書いてください。',
          prompt_en: 'Write two sentences about your weekend plans.',
          choices: [],
          audio: null,
        } : {
          id: 'topik-practice-e2e-001',
          exam_level: 'TOPIK-I',
          section: 'listening',
          question_type: 'choice',
          skill: 'detail',
          difficulty: 1,
          prompt_ko: '남자는 어디에 갑니까?',
          prompt_ja: '男性はどこへ行きますか。',
          prompt_en: 'Where is the man going?',
          choices: ['학교', '은행', '병원', '시장'],
          audio: { kind: 'google', text_ko: '남자는 은행에 갑니다.' },
        }],
      } }),
    });
  });
  await page.route('**/api/v1/tracks/topik-ko/practice/questions/*/solution', (route) => {
    const writing = route.request().url().includes('topik-practice-e2e-writing-001');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {
        question_id: writing ? 'topik-practice-e2e-writing-001' : 'topik-practice-e2e-001',
        question_type: writing ? 'writing' : 'choice',
        answer_index: writing ? null : 1,
        explanation_ko: writing ? '주말 계획을 두 문장으로 쓰면 됩니다.' : '듣기 대본에서 은행에 간다고 말합니다.',
        explanation_ja: writing ? '週末の計画を二文で書けばよい問題です。' : '聞き取り文で、銀行へ行くと言っています。',
        explanation_en: writing ? 'Write two sentences about the weekend plan.' : 'The speaker says he is going to the bank.',
        sample_answer_ko: writing ? '주말에 친구를 만납니다. 같이 영화를 봅니다.' : null,
        sample_answer_ja: writing ? '週末は友だちに会います。一緒に映画を見ます。' : null,
        sample_answer_en: writing ? 'I will meet a friend and watch a movie.' : null,
      } }),
    });
  });
}

export async function registerTopikUser(page: Page): Promise<void> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
  // Existing English-content fixtures intentionally retain their original
  // explanation language; Japanese guided journeys have separate coverage.
  await page.getByRole('combobox').selectOption('ko');
  await page.getByRole('radio', { name: /한국어 · TOPIK|Korean · TOPIK|韓国語 · TOPIK/ }).click();
  await page.getByRole('link', { name: /회원가입|Create account|アカウント作成/ }).first().click();
  await page.getByLabel('이름').fill('TOPIK E2E 사용자');
  await page.getByLabel('이메일').fill(`topik-${unique}@example.com`);
  await page.getByLabel('비밀번호').fill('Passw0rd1234');
  await page.getByRole('button', { name: /계정 만들기|Create account|アカウント作成/ }).click();
  await expect(page).toHaveURL(/\/track\/topik-ko$/);
  await expect(page.getByRole('heading', { name: '오늘도, 한 걸음' })).toBeVisible();
  await page.getByLabel('해설 언어', { exact: true }).selectOption('en');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button',{name:'20분 공부 시작'})).toBeVisible();
}
