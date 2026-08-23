import { expect, test, type Page } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';

declare global {
  interface Window {
    __quizGoogleSpeech?: Array<{ lang: string; voice: string | null }>;
  }
}

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

async function installGoogleJapaneseSpeechMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spoken: Array<{ lang: string; voice: string | null }> = [];
    Object.defineProperty(window, '__quizGoogleSpeech', { configurable: true, value: spoken });
    class FakeSpeechSynthesisUtterance {
      lang = '';
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;
      onstart: ((event: Event) => void) | null = null;
      onend: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(_text: string) {}
    }
    const googleJapanese = {
      default: true,
      lang: 'ja-JP',
      localService: true,
      name: 'Google 日本語',
      voiceURI: 'google-ja-jp',
    } as SpeechSynthesisVoice;
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeSpeechSynthesisUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        cancel: () => undefined,
        getVoices: () => [googleJapanese],
        speak: (utterance: FakeSpeechSynthesisUtterance) => {
          spoken.push({ lang: utterance.lang, voice: utterance.voice?.voiceURI ?? null });
          utterance.onstart?.(new Event('start'));
          utterance.onend?.(new Event('end'));
        },
      },
    });
  });
}

test.describe('퀴즈 기능 smoke', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('API가 모든 퀴즈 모드를 실제 데이터로 생성한다', async ({ page }) => {
    for (const { mode } of QUIZ_MODES) {
      const response = await page.request.post('/api/v1/quiz/generate', {
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
          expect(question.audio_key, 'fresh DB must not fabricate an unapproved R2 key').toBeUndefined();
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
      const generatedResponse = page.waitForResponse((response) =>
        response.url().endsWith('/api/v1/quiz/generate') && response.request().method() === 'POST');
      await page.getByRole('button', { name: /시작하기|Start|開始/ }).click();
      const generatedBody = await (await generatedResponse).json();
      const questionIds = generatedBody.data.questions.map((question: { id: string }) => question.id);
      expect(new Set(questionIds).size, 'generated question IDs are unique').toBe(questionIds.length);

      for (let i = 0; i < 5; i += 1) {
        await expect(page.getByRole('radiogroup')).toBeVisible({ timeout: 20_000 });
        const firstChoice = page.getByRole('radio').first();
        await firstChoice.click();
        await expect(firstChoice).toHaveAttribute('aria-checked', 'true');

        const submit = page.getByRole('button', { name: /제출|Submit|提出/ });
        if (await submit.isVisible()) {
          await expect(submit).toBeEnabled();
          await submit.click();
          break;
        }

        await page.getByRole('button', { name: /다음|Next|次へ/ }).click();
      }

      await expect(page.getByRole('heading', { name: /결과|Results|結果/ })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/정답|correct|正解/i).first()).toBeVisible();
    });
  });

  test('취약 영역 출제는 선택적으로 weakest 전략을 보내고 기존 응답 형식을 유지한다', async ({ page }) => {
    await page.goto('/quiz/vocab_mc?strategy=weakest');
    await expect(page.getByRole('radio', { name: /취약 영역 우선|Weakest first|弱点を優先/ })).toBeChecked();
    const generatedRequest = page.waitForRequest((request) =>
      request.url().endsWith('/api/v1/quiz/generate') && request.method() === 'POST');
    const generatedResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/v1/quiz/generate') && response.request().method() === 'POST');
    await page.getByRole('button', { name: /시작하기|Start|開始/ }).click();

    expect((await generatedRequest).postDataJSON()).toMatchObject({
      mode: 'vocab_mc',
      strategy: 'weakest',
    });
    const response = await generatedResponse;
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.data).toEqual(expect.objectContaining({
      quiz_id: expect.any(Number),
      mode: 'vocab_mc',
      questions: expect.any(Array),
    }));
  });

  test('청해 전용 화면은 Google 일본어 음성만 재생하고 R2 오디오를 요청하지 않는다', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await installGoogleJapaneseSpeechMock(page);
      const serverAudioRequests: string[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.startsWith('/api/v1/audio/')) {
          serverAudioRequests.push(request.url());
        }
      });
      await page.goto('/quiz/listening');
      await expect(page.getByRole('heading', { name: /청해 퀴즈|Listening Quiz|聴解クイズ/ })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/Google 일본어 음성으로만 재생합니다|Google Japanese voice only|Google 日本語音声だけ/)).toBeVisible();
      const play = page.getByRole('button', { name: /재생|Play|再生/ });
      await expect(play).toBeEnabled();
      const activityRequest = page.waitForRequest((request) =>
        request.url().endsWith('/api/v1/activity/events') && request.method() === 'POST');
      await play.click();
      expect((await activityRequest).postDataJSON()).toEqual({
        events: [expect.objectContaining({
          event_type: 'speech_attempted',
          learning_track: 'jlpt-ja',
          mode: 'listening',
          speech_outcome: 'played',
        })],
      });
      await expect.poll(() => page.evaluate(() => window.__quizGoogleSpeech ?? [])).toEqual([
        { lang: 'ja-JP', voice: 'google-ja-jp' },
      ]);
      expect(serverAudioRequests, 'must not request an R2 path').toEqual([]);
      await expect(page.locator('audio[src]')).toHaveCount(0);
      await expect(page.getByRole('radiogroup')).toBeVisible();
    });
  });
});
