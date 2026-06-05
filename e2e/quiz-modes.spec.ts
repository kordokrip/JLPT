import { expect, test, type Page } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:8787';

const QUIZ_MODES = [
  { mode: 'vocab_mc', title: /어휘 선택|Vocab Choice|語彙選択/, pageTitle: /어휘 선택|Vocab Choice|語彙選択/ },
  { mode: 'kanji_reading', title: /한자 읽기|Kanji Reading|漢字読み/, pageTitle: /한자 읽기|Kanji Reading|漢字読み/ },
  { mode: 'grammar_fill', title: /문법 빈칸|Grammar Fill-in|文法穴埋め/, pageTitle: /문법 빈칸|Grammar Fill-in|文法穴埋め/ },
  { mode: 'listening', title: /청해|Listening|聴解/, pageTitle: /청해 퀴즈|Listening Quiz|聴解クイズ/ },
] as const;

async function expectNoConsoleErrors(page: Page, run: () => Promise<void>) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await run();

  expect(consoleErrors, 'browser console errors').toEqual([]);
  expect(pageErrors, 'uncaught page errors').toEqual([]);
}

test.describe('퀴즈 기능 smoke', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('API가 모든 퀴즈 모드를 실제 데이터로 생성한다', async ({ page }) => {
    for (const { mode } of QUIZ_MODES) {
      const response = await page.request.post(`${API_BASE}/api/v1/quiz/generate`, {
        data: { mode, level: 'N3', count: 3 },
      });
      expect(response.ok(), `${mode} generate status`).toBe(true);
      const body = await response.json();
      expect(body.data.mode).toBe(mode);
      expect(body.data.questions.length, `${mode} question count`).toBeGreaterThan(0);
      for (const question of body.data.questions) {
        expect(question.choices.length, `${mode} choices`).toBeGreaterThanOrEqual(2);
        expect(new Set(question.choices).size, `${mode} choices are unique`).toBe(question.choices.length);
        if (mode === 'listening') {
          expect(question.script_ja, 'listening script_ja').toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
          expect(question.audio_key, 'listening audio key').toMatch(/^audio\/sentence\/n[1-5]\/\d+\.mp3$/);
        }
      }
    }
  });

  test('퀴즈 모드 선택 화면에서 4개 모드가 모두 보인다', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto('/quiz');
      await expect(page.getByRole('heading', { name: /퀴즈|Quiz|クイズ/ })).toBeVisible();
      for (const { title } of QUIZ_MODES) {
        await expect(page.getByRole('button', { name: title })).toBeVisible();
      }
    });
  });

  for (const { mode, pageTitle } of QUIZ_MODES.filter((item) => item.mode !== 'listening')) {
    test(`${mode} 모드가 문제를 생성하고 선택지를 렌더링한다`, async ({ page }) => {
      await expectNoConsoleErrors(page, async () => {
        await page.goto(`/quiz/${mode}`);
        await expect(page.getByText(pageTitle).first()).toBeVisible();
        await page.getByRole('button', { name: /시작하기|Start|開始/ }).click();
        await expect(page.getByRole('radiogroup')).toBeVisible({ timeout: 20_000 });
        await expect(page.getByRole('radio').first()).toBeVisible();
      });
    });
  }

  test('일반 퀴즈는 선택지 풀이 후 제출하고 결과 화면으로 이동한다', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto('/quiz/vocab_mc');
      await page.getByRole('button', { name: /시작하기|Start|開始/ }).click();

      for (let i = 0; i < 5; i += 1) {
        await expect(page.getByRole('radiogroup')).toBeVisible({ timeout: 20_000 });
        await page.getByRole('radio').first().click();

        const submit = page.getByRole('button', { name: /제출|Submit|提出/ });
        if (await submit.isVisible()) {
          await submit.click();
          break;
        }

        await page.getByRole('button', { name: /다음|Next|次へ/ }).click();
      }

      await expect(page.getByRole('heading', { name: /결과|Results|結果/ })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/정답|correct|正解/i).first()).toBeVisible();
    });
  });

  test('청해 전용 화면은 브라우저 일본어 음성을 기본 선택지로 제공한다', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.addInitScript(() => {
        localStorage.setItem('nihongo-n3-settings', JSON.stringify({
          state: {
            language: 'ko',
            theme: 'system',
            furiganaMode: 'hover',
            playbackRate: 1,
            voiceGender: 'female',
            selectedVoiceURI: null,
            ttsProvider: 'browser',
            autoPronounce: true,
            dailyNewLimit: 20,
            lastSyncedAt: new Date(0).toISOString(),
          },
          version: 0,
        }));
      });
      await page.goto('/quiz/listening');
      await expect(page.getByRole('heading', { name: /청해 퀴즈|Listening Quiz|聴解クイズ/ })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('group', { name: /청해 음성 소스|Listening audio source|聴解音声ソース/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /브라우저 음성|Browser voice|ブラウザー音声/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /서버 오디오|Server audio|サーバー音声/ })).toBeVisible();
      await expect(page.getByText(/일본어 브라우저 음성으로 재생합니다|Japanese browser voice|日本語ブラウザー音声/)).toBeVisible();
      await expect(page.getByRole('radiogroup')).toBeVisible();
    });
  });
});
