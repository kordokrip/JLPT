// 강성호 2026-10-13: 실제 빌드/SW 갱신 전용. 일반 Vite dev E2E와 Production 증적을 혼동하지 않는다.
import { defineConfig, devices } from "@playwright/test";
if (
  !process.env.PWA_TEST_V1 ||
  !process.env.PWA_TEST_V2 ||
  !process.env.PWA_TEST_OUTPUT
)
  throw new Error("Use scripts/run-pwa-update-gates.mjs");
export default defineConfig({
  testDir: ".",
  testMatch: "pwa-update.browser.ts",
  workers: 1,
  retries: 0,
  timeout: 45000,
  outputDir: process.env.PWA_TEST_OUTPUT + "/test-results",
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: process.env.PWA_TEST_OUTPUT + "/browser-results.json" },
    ],
  ],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
});
