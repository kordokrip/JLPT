/**
 * apps/api/vitest.config.ts
 *
 * @cloudflare/vitest-pool-workers 를 사용한 Workers 환경 테스트 설정.
 * wrangler.toml 에서 바인딩을 읽어 miniflare 가상 환경을 세팅한다.
 */
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml', environment: 'test' },
      miniflare: {
        d1Databases: ['DB'],
        r2Buckets: ['ASSETS'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@nihongo-n3/shared/fsrs': resolve(__dirname, '../../packages/shared/src/fsrs.ts'),
      '@nihongo-n3/shared/schemas': resolve(__dirname, '../../packages/shared/src/schemas.ts'),
      '@nihongo-n3/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
