import { expect, test, type Page } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';

const N5_N1_TRACK_STATUS = {
  data: {
    track: 'jlpt-ja',
    available: true,
    content_release: 'n5-n1',
    available_levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
    write_enabled: true,
  },
};

const N2_VOCAB_RESPONSE = {
  data: [{
    id: 92001,
    level: 'N2',
    ja: '対応',
    kana: 'たいおう',
    ko: '대응, 처리',
    pos: '명사',
  }],
  meta: { limit: 200, hasMore: false },
};

const N2_READING_DETAIL = {
  id: 71201,
  level: 'N2',
  genre: 'notice',
  title_ja: '作業順の見直し',
  body_ja: '来週の更新では、問い合わせの多い画面から順に案内を見直します。',
  body_ko: '다음 주 업데이트에서는 문의가 많은 화면부터 안내를 다시 검토합니다.',
  word_count: 41,
  vocab_ids: [],
  grammar_ids: [],
  audio_r2_key: null,
  source_attribution: 'self-authored local N2 fixture',
  created_at: 1_785_283_200,
  questions: [{
    id: 71202,
    question_ja: 'この案内で、最初に見直すものは何ですか。',
    question_ko: '이 안내에서 처음으로 다시 검토하는 것은 무엇입니까?',
    choices: ['문의가 많은 화면의 안내', '새로운 공식 시험 문제', '사용자의 개인정보', '브라우저 음성 설정'],
    answer_index: 0,
    explanation_ko: '지문에서 문의가 많은 화면부터 안내를 다시 검토한다고 했습니다.',
  }],
};

async function mockReleasedN5ToN1Content(page: Page) {
  await page.route('**/api/v1/tracks/jlpt-ja/status', (route) => route.fulfill({ json: N5_N1_TRACK_STATUS }));
  await page.route('**/api/v1/content/version', (route) => route.fulfill({
    json: {
      data: {
        version: 'n7-n5-n1-fixture',
        generatedAt: '2026-07-16T00:00:00.000Z',
        tables: {},
      },
    },
  }));
  await page.route('**/api/v1/vocab**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/vocab/92001')) {
      return route.fulfill({ json: { data: N2_VOCAB_RESPONSE.data[0] } });
    }
    if (url.searchParams.get('level') !== 'N2') return route.continue();
    return route.fulfill({ json: N2_VOCAB_RESPONSE });
  });
  await page.route('**/api/v1/reading/71201', (route) => route.fulfill({ json: { data: N2_READING_DETAIL } }));
  await page.route(/\/api\/v1\/reading(?:\?.*)?$/, (route) => route.fulfill({ json: { data: {
    items: [{ id: 71201, level: 'N2', genre: 'notice', title_ja: N2_READING_DETAIL.title_ja, word_count: 41, created_at: N2_READING_DETAIL.created_at }],
    cursor: null,
  } } }));
  await page.route('**/api/v1/quiz/generate', async (route) => {
    const body = route.request().postDataJSON() as { mode?: string };
    const listening = body.mode === 'listening';
    return route.fulfill({ json: { data: {
      quiz_id: listening ? 92003 : 92002,
      mode: listening ? 'listening' : 'vocab_mc',
      level: 'N2',
      questions: [listening ? {
        id: 'n2-listening-001', type: 'listening', prompt: '음성을 듣고 올바른 해석을 고르세요.',
        choices: ['마감에 여유가 있을 때 대응 순서를 다시 검토하자.', '공식 시험 문제를 복사하자.', '브라우저 음성을 기본으로 하자.', '출처를 기록하지 말자.'],
        script_ja: '締め切りまでに修正する余地があるので、対応の順番を見直そう。',
        script_ko: '마감 전까지 수정할 여지가 있으므로 대응 순서를 다시 검토하자.',
      } : {
        id: 'n2-vocab-001', type: 'vocab_mc', prompt: '対応',
        choices: ['대응, 처리', '공식 정답', '브라우저 음성', '미확인 출처'], answer: '대응, 처리', item_id: 92001,
      }],
    } } });
  });
}

async function contentVersionMeta(page: Page, key: string): Promise<string | undefined> {
  return page.evaluate(async (metaKey) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('nihongo-n3');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const item = await new Promise<{ value?: string } | undefined>((resolve, reject) => {
      const request = database.transaction('meta', 'readonly').objectStore('meta').get(metaKey);
      request.onsuccess = () => resolve(request.result as { value?: string } | undefined);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return item?.value;
  }, key);
}

test.describe('N2/N1 release gating', () => {
  test('main seeded content exposes N2 Batches 1–3 without pretending that N1 exists', async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto('/browse/vocab');

    await expect(page.getByRole('button', { name: 'N5', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'N3', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'N2', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'N1', exact: true })).toHaveCount(0);
  });

  test('actual N2 Batches 1–3 seed render browse, grammar, reading, and audio-preparing learning paths', async ({ page }) => {
    const generatedModes: Array<{ mode?: string; level?: string }> = [];
    await page.addInitScript(() => {
      (window as typeof window & { __n2SpeechSynthesisCalls?: number }).__n2SpeechSynthesisCalls = 0;
      const prototype = window.SpeechSynthesis?.prototype;
      const originalSpeak = prototype?.speak;
      if (prototype && originalSpeak) {
        prototype.speak = function (...args: Parameters<SpeechSynthesis['speak']>) {
          (window as typeof window & { __n2SpeechSynthesisCalls?: number }).__n2SpeechSynthesisCalls =
            ((window as typeof window & { __n2SpeechSynthesisCalls?: number }).__n2SpeechSynthesisCalls ?? 0) + 1;
          return originalSpeak.apply(this, args);
        };
      }
    });
    page.on('request', (request) => {
      if (!request.url().includes('/api/v1/quiz/generate') || request.method() !== 'POST') return;
      generatedModes.push(request.postDataJSON() as { mode?: string; level?: string });
    });
    await ensureAuthenticated(page);

    await page.goto('/');
    await expect(page.getByText(/N5부터 N2까지의 콘텐츠가 준비되었습니다/)).toBeVisible();
    await expect(page.getByLabel('학습 범위').getByText('N2', { exact: true })).toBeVisible();

    await page.goto('/browse/vocab');
    await page.getByRole('button', { name: 'N2', exact: true }).click();
    await expect(page.getByText('方針')).toBeVisible();
    await expect(page.getByText('방침, 기본 방향')).toBeVisible();
    await expect(page.getByText('雇用')).toBeVisible();
    await expect(page.getByText('고용')).toBeVisible();
    await expect(page.getByText('健康')).toBeVisible();
    await expect(page.getByText('건강')).toBeVisible();
    await page.getByRole('button', { name: '方針 — 방침, 기본 방향' }).click();
    await expect(page.getByRole('heading', { name: '方針' })).toBeVisible();
    await expect(page.getByRole('button', { name: /오디오가 준비 중입니다|Audio is still being prepared|音声を準備中/ })).toBeDisabled();

    await page.goto('/quiz/grammar_fill');
    await expect(page.getByRole('button', { name: 'N2', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'N2', exact: true }).click();
    await page.getByRole('button', { name: /시작하기|Start|開始/ }).click();
    await expect(page.getByText('1 / 5')).toBeVisible();
    await expect.poll(() => generatedModes.some((body) => body.mode === 'grammar_fill' && body.level === 'N2')).toBe(true);

    await page.goto('/reading');
    await page.getByRole('button', { name: 'N2', exact: true }).click();
    await page.getByRole('button', { name: '窓口の利用時間' }).click();
    await expect(page.getByText('申請の受付は何時までですか。')).toBeVisible();

    await page.goto('/quiz/listening?level=N2');
    await expect(page.getByText('1 / 5')).toBeVisible();
    await expect.poll(() => generatedModes.some((body) => body.mode === 'listening' && body.level === 'N2')).toBe(true);
    await expect(page.getByText(/오디오가 준비 중입니다|Audio is still being prepared|音声を準備中/)).toBeVisible();
    await expect(page.getByRole('button', { name: /재생|Play|再生/ })).toBeDisabled();
    await expect(page.evaluate(() => (window as typeof window & { __n2SpeechSynthesisCalls?: number }).__n2SpeechSynthesisCalls ?? 0)).resolves.toBe(0);
  });

  test('self-authored N2 fixture covers browse detail, quiz, reading, and explicit audio-unavailable paths', async ({ page }) => {
    // UI fixture mirrors the local seed contract. The normal E2E database keeps
    // N2 hidden until the full N2 operating batch is available.
    await mockReleasedN5ToN1Content(page);
    await ensureAuthenticated(page);

    await page.goto('/');
    await expect(page.getByText(/기본 52주 과정과 상위 레벨 학습은 별도로 관리됩니다/)).toBeVisible();
    await expect(page.getByLabel('학습 범위').getByText('N1', { exact: true })).toBeVisible();

    await page.goto('/browse/vocab');

    const n2 = page.getByRole('button', { name: 'N2', exact: true });
    const n1 = page.getByRole('button', { name: 'N1', exact: true });
    await expect(n2).toBeVisible();
    await expect(n1).toBeVisible();
    await n2.click();

    await expect(page.getByText('対応')).toBeVisible();
    await expect(page.getByText('대응, 처리')).toBeVisible();
    await expect.poll(() => contentVersionMeta(page, 'content.version:jlpt-ja')).toBe('n7-n5-n1-fixture');

    await page.getByRole('button', { name: '対応 — 대응, 처리' }).click();
    await expect(page.getByRole('heading', { name: '対応' })).toBeVisible();
    await expect(page.getByRole('button', { name: /오디오가 준비 중입니다|Audio is still being prepared|音声を準備中/ })).toBeDisabled();

    await page.goto('/quiz/vocab_mc');
    await page.getByRole('button', { name: 'N2', exact: true }).click();
    await page.getByRole('button', { name: /시작하기|Start|開始/ }).click();
    await expect(page.getByText('対応')).toBeVisible();
    await expect(page.getByText(/오디오가 준비 중입니다|Audio is still being prepared|音声を準備中/)).toBeVisible();

    await page.goto('/reading');
    await page.getByRole('button', { name: 'N2', exact: true }).click();
    await page.getByRole('button', { name: '作業順の見直し' }).click();
    await expect(page.getByText('この案内で、最初に見直すものは何ですか。')).toBeVisible();

    await page.goto('/quiz/listening?level=N2');
    await expect(page.getByText('締め切りまでに修正する余地があるので、対応の順番を見直そう。')).toHaveCount(0);
    await expect(page.getByText(/오디오가 준비 중입니다|Audio is still being prepared|音声を準備中/)).toBeVisible();
    await expect(page.getByRole('button', { name: /재생|Play|再生/ })).toBeDisabled();
  });

  test('an approved N2 R2 listening harness uses the server audio endpoint, never SpeechSynthesis', async ({ page }) => {
    await mockReleasedN5ToN1Content(page);
    const r2Key = 'audio/sentence/n2/92001-0123456789abcdef.mp3';
    const r2Requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes(`/api/v1/audio/${r2Key}`)) r2Requests.push(request.url());
    });
    await page.route('**/api/v1/quiz/generate', (route) => route.fulfill({ json: { data: {
      quiz_id: 92004,
      mode: 'listening',
      level: 'N2',
      questions: [{
        id: 'n2-r2-listening-001', type: 'listening', prompt: '음성을 듣고 올바른 해석을 고르세요.',
        choices: ['대응, 처리', '공식 답안', '브라우저 음성', '출처 없는 파일'],
        audio_key: r2Key,
        script_ja: '締め切りまでに修正する余地があるので、対応の順番を見直そう。',
        script_ko: '마감 전까지 수정할 여지가 있으므로 대응 순서를 다시 검토하자.',
      }],
    } } }));
    await page.route(`**/api/v1/audio/${r2Key}`, (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: '' }));
    await ensureAuthenticated(page);
    await page.goto('/quiz/listening?level=N2');
    await expect(page.getByRole('button', { name: /재생|Play|再生/ })).toBeEnabled();
    await page.getByRole('button', { name: /재생|Play|再生/ }).click();
    await expect.poll(() => r2Requests.length).toBeGreaterThan(0);
  });
});
