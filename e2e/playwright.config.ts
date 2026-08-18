import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.E2E_BASE_URL;
const e2eWebPort = Number(process.env.E2E_WEB_PORT ?? 4173);
const e2eApiPort = Number(process.env.E2E_API_PORT ?? 8788);
const reuseExistingServer = process.env.E2E_REUSE_EXISTING_SERVER === "1";

/**
 * e2e/playwright.config.ts
 *
 * Playwright E2E 설정
 *
 * 사전 조건 (로컬):
 *   1. scripts/e2e-api-dev.sh      → http://127.0.0.1:8788
 *   2. pnpm -F @nihongo-n3/web dev → http://127.0.0.1:4173  (자동 시작)
 *
 * CI (.github/workflows/ci.yml)에서는 Playwright webServer가 isolated
 * wrangler dev + vite dev를 시작한 뒤 browser project별로 test를 실행합니다.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Local D1 seeding and WebKit auth flows are not stable under parallel workers.
  // Keep E2E serialized so deploy gating reflects product behavior, not test infra races.
  workers: 1,
  reporter: process.env.CI
    ? [
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["github"],
      ]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL: externalBaseURL ?? `http://127.0.0.1:${e2eWebPort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chromium",
      testMatch: /.*(menu-smoke|pwa)\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-webkit",
      testMatch: /.*(menu-smoke|pwa|mobile-touch-audit)\.spec\.ts/,
      use: { ...devices["iPhone 13"] },
    },
  ],

  // Vite dev 서버를 자동 시작 (API는 별도 터미널 또는 CI 스텝에서 실행)
  webServer: externalBaseURL
    ? undefined
    : [
        {
          // A reused local server can point at another checkout or an obsolete
          // Worker build. Default to an isolated server; opt in only when the
          // caller explicitly owns and has verified the existing process.
          command: "E2E_TOPIK_GRADE1_FIXTURE=1 ../scripts/e2e-api-dev.sh",
          port: e2eApiPort,
          reuseExistingServer,
          timeout: 180_000,
          gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
        },
        {
          // Do not invoke the host Corepack shim here. On macOS environments
          // with Anaconda it can have stale pnpm signing keys and prevent the
          // test server from starting before any application test runs.
          command: `VITE_PWA_DEV_SW=false VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:${e2eApiPort} pnpm -F @nihongo-n3/web exec vite --host 127.0.0.1 --port ${e2eWebPort} --strictPort`,
          port: e2eWebPort,
          reuseExistingServer,
          timeout: 60_000,
        },
      ],
});
