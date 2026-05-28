import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.E2E_BASE_URL;

/**
 * e2e/playwright.config.ts
 *
 * Playwright E2E 설정
 *
 * 사전 조건 (로컬):
 *   1. pnpm -F @nihongo-n3/api dev   → http://localhost:8787
 *   2. pnpm -F @nihongo-n3/web dev   → http://localhost:5173  (자동 시작)
 *
 * CI (.github/workflows/e2e.yml) 에서는 wrangler dev + vite dev 를
 * 백그라운드로 실행한 뒤 `pnpm -F @nihongo-n3/e2e test` 를 호출합니다.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report', open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  use: {
    baseURL: externalBaseURL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Vite dev 서버를 자동 시작 (API는 별도 터미널 또는 CI 스텝에서 실행)
  webServer: externalBaseURL ? undefined : [
    {
      // Wrangler dev (D1 로컬) — reuseExistingServer: true 로 로컬 재사용 가능
      command: '../scripts/e2e-api-dev.sh',
      port: 8787,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'pnpm -F @nihongo-n3/web dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
