import { expect, test, type Page } from '@playwright/test';
import { ensureAuthenticated } from './auth-helper';

// Browser preferences are device-local; only instruction language is also
// stored in the authenticated, track-scoped learning profile. No API mocking.
function settingRow(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator('..').locator('..');
}

async function storedPreferences(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('nihongo-n3-settings') ?? '{}').state);
}

for (const track of ['jlpt-ja', 'topik-ko'] as const) {
  test(`settings preferences persist and instruction language reaches the server: ${track}`, async ({ page }) => {
    await ensureAuthenticated(page);
    if (track === 'topik-ko') {
      await page.goto('/settings');
      await settingRow(page, '학습 언어').getByRole('button', { name: '한국어 · TOPIK', exact: true }).click();
      await expect(page).toHaveURL(/\/track\/topik-ko$/);
      await page.goto('/');
    }

    const initialSave = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/v1/learning/profile' && response.request().method() === 'PUT');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    expect((await initialSave).status()).toBe(200);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: '설정', exact: true })).toBeVisible();

    await settingRow(page, '앱 표시 언어').getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const profileWrite = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/v1/learning/profile' && response.request().method() === 'PUT');
    await settingRow(page, 'Instruction language').getByRole('button', { name: 'English', exact: true }).click();
    const saved = await profileWrite;
    expect(saved.status()).toBe(200);
    expect(new URL(saved.url()).searchParams.get('expected_track')).toBe(track);
    expect((await saved.json()).data).toMatchObject({ learning_track: track, instruction_language: 'en', configured: true });

    await settingRow(page, 'Furigana').getByRole('button', { name: 'Hidden', exact: true }).click();
    const limit = page.getByRole('slider', { name: 'Daily new card limit' });
    await limit.focus();
    await limit.press('Home');
    await limit.press('ArrowRight');
    await limit.press('ArrowRight');
    await expect(limit).toHaveValue('15');
    const autoPronounce = settingRow(page, 'Auto pronunciation').getByRole('switch');
    await expect(autoPronounce).toHaveAttribute('aria-checked', 'true');
    await autoPronounce.click();
    await expect(autoPronounce).toHaveAttribute('aria-checked', 'false');
    await settingRow(page, 'Playback speed').getByRole('button', { name: '0.75×', exact: true }).click();

    await expect.poll(() => storedPreferences(page)).toMatchObject({
      learningTrack: track, language: 'en', languageExplicit: true,
      instructionLanguages: { [track]: 'en' }, furiganaMode: 'never',
      dailyNewLimit: 15, autoPronounce: false, playbackRate: 0.75,
    });
    const profilePath = `/api/v1/learning/profile?expected_track=${track}`;
    const serverRead = await page.request.get(profilePath);
    expect(serverRead.status()).toBe(200);
    const serverProfile = (await serverRead.json()).data;
    expect(serverProfile).toMatchObject({ learning_track: track, instruction_language: 'en', configured: true });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    for (const [label, value] of [['App display language', 'English'], ['Instruction language', 'English'], ['Furigana', 'Hidden'], ['Playback speed', '0.75×']] as const) {
      await expect(settingRow(page, label).getByRole('button', { name: value, exact: true })).toHaveClass(/\bbg-card\b/);
    }
    await expect(page.getByRole('slider', { name: 'Daily new card limit' })).toHaveValue('15');
    await expect(settingRow(page, 'Auto pronunciation').getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    const reloadedServerRead = await page.request.get(profilePath);
    expect(reloadedServerRead.status()).toBe(200);
    expect((await reloadedServerRead.json()).data).toEqual(serverProfile);
  });
}

test('instruction language waits for the real configured profile before enabling server writes', async ({ page }) => {
  await ensureAuthenticated(page);
  const initialSave = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/v1/learning/profile' && response.request().method() === 'PUT');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  expect((await initialSave).status()).toBe(200);

  let releaseProfile!: () => void;
  const holdProfile = new Promise<void>((resolve) => { releaseProfile = resolve; });
  let intercepted = 0;
  let profileWrites = 0;
  // Delay transport only: the payload comes from this synthetic account's real
  // Worker/D1 profile, not a fabricated response. Assert interception occurred.
  await page.route('**/api/v1/learning/profile?*', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    expect((await response.json()).data.configured).toBe(true);
    intercepted++;
    await holdProfile;
    await route.fulfill({ response });
  });
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/learning/profile' && request.method() === 'PUT') profileWrites++;
  });
  try {
    await page.goto('/settings');
    await expect.poll(() => intercepted).toBe(1);
    const english = settingRow(page, '학습 해설 언어').getByRole('button', { name: 'English', exact: true });
    await expect(english).toBeDisabled();
    await expect(page.getByRole('status')).toHaveText(/불러오는 중/);
    expect((await storedPreferences(page)).instructionLanguages['jlpt-ja']).toBe('ko');
    expect(profileWrites).toBe(0);

    releaseProfile();
    await expect(english).toBeEnabled();
    const savedResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/v1/learning/profile' && response.request().method() === 'PUT');
    await english.click();
    expect((await savedResponse).status()).toBe(200);
    expect(profileWrites).toBe(1);
    const stored = await page.request.get('/api/v1/learning/profile?expected_track=jlpt-ja');
    expect(stored.status()).toBe(200);
    expect((await stored.json()).data).toMatchObject({ configured: true, instruction_language: 'en', learning_track: 'jlpt-ja' });
    await page.reload();
    await expect(settingRow(page, '학습 해설 언어').getByRole('button', { name: 'English', exact: true })).toHaveClass(/\bbg-card\b/);
  } finally {
    releaseProfile();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
