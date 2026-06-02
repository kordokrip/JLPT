import type { Config } from 'drizzle-kit';

// 환경변수는 CI / .dev.vars 에서 주입됩니다.
// 로컬에서는 apps/api/.dev.vars 에 정의된 값을 사용하세요.
export default {
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env['CLOUDFLARE_ACCOUNT_ID'] ?? '',
    databaseId: process.env['D1_DATABASE_ID_PROD'] ?? '',
    token: process.env['CLOUDFLARE_API_TOKEN'] ?? '',
  },
} satisfies Config;
