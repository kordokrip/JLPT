import { expect, test } from '@playwright/test';

test.describe('로그인 온보딩', () => {
  test('비로그인 사용자는 온보딩을 보고 회원가입 후 앱에 진입한다', async ({ page }) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /계정으로 이어지는/ })).toBeVisible();

    await page.getByRole('link', { name: '회원가입' }).first().click();
    await page.getByLabel('이름').fill('인증 테스트');
    await page.getByLabel('이메일').fill(`auth-${unique}@example.com`);
    await page.getByLabel('비밀번호').fill('Passw0rd1234');
    await page.getByRole('button', { name: '계정 만들기' }).click();

    await expect(page.getByText(/오늘 할 일|오늘도 천천히/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Google SSO 버튼은 설정 전 비활성 상태를 설명한다', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Google SSO는 운영 환경변수 설정 후 활성화됩니다.')).toBeVisible();
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
    await expect(page.getByText(/오늘 할 일|오늘도 천천히/).first()).toBeVisible({ timeout: 15_000 });

    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.locator('#main-content').getByRole('button', { name: '로그아웃' }).click();
    await expect(page.getByRole('heading', { name: /계정으로 이어지는/ })).toBeVisible({ timeout: 15_000 });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호').fill(password);
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page.getByText(/오늘 할 일|오늘도 천천히/).first()).toBeVisible({ timeout: 15_000 });
  });
});
