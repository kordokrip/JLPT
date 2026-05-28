#!/usr/bin/env node
/**
 * scripts/setup-logpush.mjs
 *
 * Cloudflare Logpush 파이프라인을 R2 버킷으로 설정하는 스크립트.
 *
 * 전제 조건:
 *   1. `wrangler login` 으로 인증 완료
 *   2. 환경 변수 또는 .env 파일에 아래 값 설정:
 *      - CF_ACCOUNT_ID      : Cloudflare 계정 ID
 *      - CF_API_TOKEN       : Logpush 권한 포함 API 토큰
 *      - CF_ZONE_ID         : (선택) 존 ID — Workers 로그는 계정 레벨이므로 불필요
 *      - R2_BUCKET_NAME     : 로그를 저장할 R2 버킷 이름
 *      - WORKER_NAME        : Workers 스크립트 이름 (wrangler.toml name 필드)
 *
 * 사용법:
 *   node scripts/setup-logpush.mjs [--dry-run]
 *
 * 동작:
 *   1. 기존 nihongo-n3-workers-logpush 잡이 있으면 조회 후 업데이트
 *   2. 없으면 새 Logpush 잡 생성
 *   3. --dry-run 플래그 시 API 호출 없이 payload 출력만
 *
 * Logpush 필드 (Workers Trace Events):
 *   scriptName, outcome, wallTimeMs, cpuTimeMs,
 *   eventType, exceptions, logs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── .env 로드 (있을 때만) ────────────────────────────────────────────
const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

// ─── 필수 환경 변수 검증 ─────────────────────────────────────────────
const REQUIRED = ['CF_ACCOUNT_ID', 'CF_API_TOKEN', 'R2_BUCKET_NAME', 'WORKER_NAME'];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('[setup-logpush] 필수 환경 변수 누락:', missing.join(', '));
  process.exit(1);
}

const ACCOUNT_ID  = process.env.CF_ACCOUNT_ID;
const API_TOKEN   = process.env.CF_API_TOKEN;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const WORKER_NAME = process.env.WORKER_NAME;
const DRY_RUN     = process.argv.includes('--dry-run');
const JOB_NAME    = `${WORKER_NAME}-logpush`;

/** Cloudflare v4 API 호출 헬퍼 */
async function cfFetch(path, opts = {}) {
  const url  = `https://api.cloudflare.com/client/v4${path}`;
  const res  = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`CF API error: ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}

// ─── Logpush 잡 payload ───────────────────────────────────────────
const jobPayload = {
  name:               JOB_NAME,
  destination_conf:   `r2://${BUCKET_NAME}/logpush/{DATE}?account-id=${ACCOUNT_ID}`,
  dataset:            'workers_trace_events',
  enabled:            true,
  logpull_options:    'fields=ScriptName,Outcome,WallTimeMs,CPUTimeMs,EventType,Exceptions,Logs&timestamps=rfc3339',
  filter:             JSON.stringify({
    where: {
      key:   'ScriptName',
      op:    'eq',
      value: WORKER_NAME,
    },
  }),
  output_options: {
    field_delimiter: '\n',
    batch_prefix:    '',
    batch_suffix:    '',
    record_prefix:   '',
    record_suffix:   '\n',
    record_template: '{{{json}}}',
    timestamp_format: 'rfc3339',
    sample_rate:      1,
  },
};

if (DRY_RUN) {
  console.log('[setup-logpush] --dry-run: payload 미리보기\n');
  console.log(JSON.stringify(jobPayload, null, 2));
  process.exit(0);
}

// ─── 메인 실행 ───────────────────────────────────────────────────
(async () => {
  console.log(`[setup-logpush] 계정 ID : ${ACCOUNT_ID}`);
  console.log(`[setup-logpush] 버킷    : ${BUCKET_NAME}`);
  console.log(`[setup-logpush] Worker  : ${WORKER_NAME}`);
  console.log(`[setup-logpush] 잡 이름 : ${JOB_NAME}\n`);

  // 기존 잡 목록 조회
  const existingJobs = await cfFetch(`/accounts/${ACCOUNT_ID}/logpush/jobs`);
  const existing = (existingJobs ?? []).find((j) => j.name === JOB_NAME);

  if (existing) {
    console.log(`[setup-logpush] 기존 잡 발견 (id=${existing.id}) — 업데이트 중...`);
    const updated = await cfFetch(`/accounts/${ACCOUNT_ID}/logpush/jobs/${existing.id}`, {
      method: 'PUT',
      body:   JSON.stringify(jobPayload),
    });
    console.log('[setup-logpush] ✓ 업데이트 완료:', updated.id);
  } else {
    console.log('[setup-logpush] 새 Logpush 잡 생성 중...');
    // ownership 토큰 발급
    const ownership = await cfFetch(`/accounts/${ACCOUNT_ID}/logpush/ownership`, {
      method: 'POST',
      body:   JSON.stringify({ destination_conf: jobPayload.destination_conf }),
    });
    console.log('[setup-logpush] ownership filename:', ownership?.filename);

    const created = await cfFetch(`/accounts/${ACCOUNT_ID}/logpush/jobs`, {
      method: 'POST',
      body:   JSON.stringify({
        ...jobPayload,
        ownership_challenge: ownership?.filename ?? '',
      }),
    });
    console.log('[setup-logpush] ✓ 잡 생성 완료 (id=%s)', created.id);
  }

  console.log('\n[setup-logpush] 완료!');
  console.log(
    '  R2 경로 패턴: ' +
    `r2://${BUCKET_NAME}/logpush/{DATE}/...`,
  );
  console.log(
    '  로그 확인: wrangler r2 object list ' + BUCKET_NAME + ' --prefix logpush/',
  );
})().catch((err) => {
  console.error('[setup-logpush] 오류:', err.message);
  process.exit(1);
});
