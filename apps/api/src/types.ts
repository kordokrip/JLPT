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
  ASSETS:              R2Bucket;
  /** 주간 리포트 및 백업 SQL 저장 버킷 */
  REPORTS:             R2Bucket;
  /** Cloudflare Workers AI 바인딩 (TTS, 이미지 등) */
  AI:                  Ai;
  ENVIRONMENT:         string;
  /** production auth mode: cf-access | public-owner */
  AUTH_MODE:           string;
  /** Cloudflare Access application audience tag */
  CF_ACCESS_AUD:       string;
  /** e.g. "nihongo-n3.cloudflareaccess.com" */
  CF_TEAM_DOMAIN:      string;
  /** 주간 리포트 이메일 수신 주소 (빈 문자열이면 발송 안 함) */
  NOTIFY_EMAIL:        string;
  /** TTS 공급자: cloudflare | google | azure | voicevox | style-bert-vits2 */
  TTS_PROVIDER:        string;
  GOOGLE_TTS_API_KEY:  string;
  AZURE_TTS_KEY:       string;
  AZURE_TTS_REGION:    string;
  VOICEVOX_URL:        string;
  STYLE_BERT_VITS2_URL:string;
  /** 외부 FSRS 옵티마이저 서비스 URL (Node 배치/별도 서비스) */
  FSRS_OPTIMIZER_URL:  string;
  /** 외부 FSRS 옵티마이저 인증 토큰 (Bearer) */
  FSRS_OPTIMIZER_TOKEN:string;
  /** VAPID 키 (base64url) — Web Push */
  VAPID_PUBLIC_KEY:    string;
  VAPID_PRIVATE_KEY:   string;
};

// ─────────────────────────────────────────────
// 인증 후 context.set() 에 저장되는 변수
// ─────────────────────────────────────────────
export type Variables = {
  userId: string;
  userEmail: string;
};

// ─────────────────────────────────────────────
// 앱 전역 Hono generic
// ─────────────────────────────────────────────
export type AppEnv = {
  Bindings: Env;
  Variables: Variables;
};
