import type { Page } from '@playwright/test';

export async function ensureAuthenticated(page: Page): Promise<void> {
  const apiBase = process.env.E2E_API_URL?.replace(/\/$/, '') ?? '';
  const path = (value: string) => `${apiBase}${value}`;
  const me = await page.request.get(path('/api/v1/auth/me'));
  if (me.ok()) {
    const body = await me.json().catch(() => null) as { data?: { authenticated?: boolean } } | null;
    if (body?.data?.authenticated) return;
  }

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const register = await page.request.post(path('/api/v1/auth/register'), {
    data: {
      email: `e2e-${unique}@example.com`,
      password: 'Passw0rd1234',
      display_name: 'E2E 사용자',
    },
  });
  if (!register.ok()) {
    throw new Error(`E2E auth register failed: ${register.status()} ${await register.text()}`);
  }
}
