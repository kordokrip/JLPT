/**
 * apps/api/src/types.ts
 *
 * Hono 앱 컨텍스트 타입 — Bindings + Variables
 */

// ─────────────────────────────────────────────
// Cloudflare Workers 바인딩
// ─────────────────────────────────────────────
export type Env = {
  DB:                  D1Database;
  /** 주간 리포트 및 백업 SQL 저장 버킷 */
  REPORTS:             R2Bucket;
  /** Licensed-content evidence only. Separate from audio and reports buckets. */
  CONTENT_EVIDENCE:    R2Bucket;
  /** Reference-only queue; no content body or learner data is allowed. */
  CONTENT_RELEASE_QUEUE: Queue<ContentReleaseQueueMessage>;
  /** Dead-letter queue for poison reports. */
  CONTENT_RELEASE_DLQ: Queue<ContentReleaseQueueMessage>;
  /** Human-gated orchestration; it creates preview candidates only. */
  CONTENT_RELEASE_WORKFLOW: Workflow<ContentReleaseWorkflowParams>;
  /** Cloudflare Workers AI 바인딩 (TTS, 이미지 등) */
  AI:                  Ai;
  /** Server-side AI assistance is opt-in and disabled unless exactly "true". */
  AI_ASSISTANCE_ENABLED?: string;
  /** workers-ai | ai-gateway. Values never authorize a client request. */
  AI_ASSISTANCE_PROVIDER?: string;
  AI_ASSISTANCE_MODEL?: string;
  /** HMAC salt for pseudonymous AI usage buckets. Configure as a secret. */
  AI_ASSISTANCE_BUCKET_SECRET?: string;
  /** AI Gateway endpoint and token; both are Worker secrets, never VITE vars. */
  AI_GATEWAY_BASE_URL?: string;
  AI_GATEWAY_API_TOKEN?: string;
  ENVIRONMENT:         string;
  /** Blue/green cutover guard: off | read-only */
  MAINTENANCE_MODE?:   string;
  /** Git commit or deployment identifier injected by CI. */
  RELEASE_SHA?:        string;
  /** Preview-only 5xx observability canary secret. Never configure in production. */
  OBSERVABILITY_CANARY_TOKEN?: string;
  /** Account-scoped Workers Observability query configuration. */
  CLOUDFLARE_ACCOUNT_ID?: string;
  OBSERVABILITY_API_TOKEN?: string;
  OBSERVABILITY_ALERT_WEBHOOK_URL?: string;
  OBSERVABILITY_ALERT_WEBHOOK_TOKEN?: string;
  /** Internal Worker-to-Worker alert delivery; avoids workers.dev self-fetch loops. */
  OBSERVABILITY_ALERT_RECEIVER?: Fetcher;
  OBSERVABILITY_WORKER_NAME?: string;
  /** production auth mode: app-session | cf-access | public-owner */
  AUTH_MODE:           string;
  /** App session HMAC/password hashing secret. Set with wrangler secret in production. */
  AUTH_SECRET?:        string;
  /** Frontend origin for auth redirects. */
  APP_ORIGIN?:         string;
  /** Optional Google OAuth web client credentials. */
  GOOGLE_CLIENT_ID?:   string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  /** Optional admin bootstrap credentials/secrets. */
  ADMIN_EMAIL?:        string;
  ADMIN_PASSWORD?:     string;
  ADMIN_BOOTSTRAP_TOKEN?: string;
  /** Cloudflare Access application audience tag */
  CF_ACCESS_AUD:       string;
  /** e.g. "nihongo-n3.cloudflareaccess.com" */
  CF_TEAM_DOMAIN:      string;
  /** 주간 리포트 이메일 수신 주소 (빈 문자열이면 발송 안 함) */
  NOTIFY_EMAIL:        string;
  /** 외부 FSRS 옵티마이저 서비스 URL (Node 배치/별도 서비스) */
  FSRS_OPTIMIZER_URL:  string;
  /** 외부 FSRS 옵티마이저 인증 토큰 (Bearer) */
  FSRS_OPTIMIZER_TOKEN?:string;
  /** VAPID 키 (base64url) — Web Push */
  VAPID_PUBLIC_KEY:    string;
  VAPID_PRIVATE_KEY?:  string;
};

// ─────────────────────────────────────────────
// 인증 후 context.set() 에 저장되는 변수
// ─────────────────────────────────────────────
export type Variables = {
  userId: string;
  userEmail: string;
  learningTrack: 'jlpt-ja' | 'topik-ko';
  userRole?: 'user' | 'admin';
  requestId: string;
  requestStartedAt: number;
};

// ─────────────────────────────────────────────
// 앱 전역 Hono generic
// ─────────────────────────────────────────────
export type AppEnv = {
  Bindings: Env;
  Variables: Variables;
};
import type { ContentReleaseQueueMessage, ContentReleaseWorkflowParams } from '@nihongo-n3/shared';
