import { expect, test } from '@playwright/test';

test.describe('로그인 온보딩', () => {
  test('비로그인 사용자는 온보딩을 보고 회원가입 후 앱에 진입한다', async ({ page }) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: /일본어와 한국어 학습/ })).toBeVisible();

    await page.getByRole('link', { name: '회원가입' }).first().click();
    await page.getByLabel('이름').fill('인증 테스트');
    await page.getByLabel('이메일').fill(`auth-${unique}@example.com`);
    await page.getByLabel('비밀번호').fill('Passw0rd1234');
    await page.getByRole('button', { name: '계정 만들기' }).click();

    await expect(page.getByRole('heading', {name:'오늘도, 한 걸음'})).toBeVisible({ timeout: 15_000 });
  });

  test('Google SSO 버튼은 설정 상태를 반영한다', async ({ page, request }) => {
    const response = await request.get('/api/v1/auth/config');
    expect(response.status()).toBe(200);
    const { data: config } = await response.json();
    expect(typeof config.google_enabled).toBe('boolean');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    // An intentionally disabled anchor has no href and therefore no link role.
    // This checks config rendering only; the next test still requires real
    // OAuth start availability and must fail when Preview SSO is disabled.
    const googleLogin = page.locator('a').filter({ hasText: /^Google로 로그인$/ });
    await expect(googleLogin).toBeVisible();
    if (config.google_enabled) {
      await expect(googleLogin).toHaveAttribute('href', /\/api\/v1\/auth\/google\/start/);
      await expect(googleLogin).toHaveAttribute('aria-disabled', 'false');
    } else {
      await expect(googleLogin).not.toHaveAttribute('href');
      await expect(googleLogin).toHaveAttribute('aria-disabled', 'true');
      await expect(page.getByText('현재 Google 로그인을 사용할 수 없습니다.', { exact: true })).toBeVisible();
    }
  });

  test('Google SSO 시작 경로는 앱 404가 아니라 OAuth로 리다이렉트한다', async ({ request }) => {
    const res = await request.get('/api/v1/auth/google/start', { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers().location).toContain('https://accounts.google.com/');
  });

  test('회원가입 후 로그아웃하고 같은 계정으로 다시 로그인할 수 있다', async ({ page }) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const email = `login-${unique}@example.com`;
    const password = 'Passw0rd1234';

    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('이름').fill('로그인 회귀 테스트');
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호').fill(password);
    await page.getByRole('button', { name: '계정 만들기' }).click();
    await expect(page.getByRole('heading', {name:'오늘도, 한 걸음'})).toBeVisible({ timeout: 15_000 });

    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.locator('#main-content').getByRole('button', { name: '로그아웃' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /일본어와 한국어 학습/ })).toBeVisible({ timeout: 15_000 });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호').fill(password);
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page.getByRole('heading', {name:'오늘도, 한 걸음'})).toBeVisible({ timeout: 15_000 });
  });
});
