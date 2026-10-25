#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
WRANGLER_CONFIG="${E2E_WRANGLER_CONFIG:-$ROOT_DIR/apps/api/wrangler.test.toml}"
API_PORT="${E2E_API_PORT:-8788}"
WEB_PORT="${E2E_WEB_PORT:-4173}"

REVIEWED_MODE=0
# 강성호 2026-10-11: 검수/경로/환경을 DB 초기화와 cleanup 등록보다 먼저 검사한다. 신규 레슨 모드는 외부/재사용 DB를 받지 않는다.
if [[ -n "${E2E_REVIEWED_COHORT:-}" ]]; then
  if [[ -n "${E2E_BASE_URL:-}" || "${E2E_SKIP_DB_BOOTSTRAP:-0}" == "1" || "${E2E_REUSE_EXISTING_SERVER:-0}" == "1" || -n "${E2E_D1_PERSIST_TO:-}" || "$WRANGLER_CONFIG" != "$ROOT_DIR/apps/api/wrangler.test.toml" ]]; then
    echo "[e2e] reviewed mode refuses external/reused persistence or non-test config" >&2
    exit 1
  fi
  pnpm --dir packages/db exec tsx src/ops/seed-reviewed-learning-e2e-fixture.ts \
    --preflight \
    --cohort="$E2E_REVIEWED_COHORT" \
    --review-a="${E2E_REVIEW_A:?actual independent review A is required}" \
    --review-b="${E2E_REVIEW_B:?actual independent review B is required}"
  PERSIST_TO="$(mktemp -d "${TMPDIR:-/tmp}/nihongo-n3-reviewed-e2e-XXXXXX")"
  REVIEWED_MODE=1
  CLEANUP_PERSIST_TO=0
  echo "[e2e] preserving reviewed test evidence at $PERSIST_TO"
elif [[ -n "${E2E_D1_PERSIST_TO:-}" ]]; then
  PERSIST_TO="$E2E_D1_PERSIST_TO"
  CLEANUP_PERSIST_TO=0
else
  PERSIST_TO="${TMPDIR:-/tmp}/nihongo-n3-e2e-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
  CLEANUP_PERSIST_TO=1
fi

cleanup() {
  if [[ "$CLEANUP_PERSIST_TO" == "1" ]]; then
    rm -rf "$PERSIST_TO"
  fi
}
trap cleanup EXIT INT TERM

if [[ "${E2E_SKIP_DB_BOOTSTRAP:-}" != "1" ]]; then
  if [[ "$REVIEWED_MODE" != "1" ]]; then
    rm -rf "$PERSIST_TO"
  fi
  mkdir -p "$PERSIST_TO"
  E2E_ARTIFACT_DIR="$PERSIST_TO/artifacts"
  mkdir -p "$E2E_ARTIFACT_DIR"
  echo "[e2e] applying canonical D1 migrations"
  CI=1 pnpm exec wrangler d1 migrations apply DB \
    --local \
    --persist-to "$PERSIST_TO" \
    --config "$WRANGLER_CONFIG"

  echo "[e2e] seeding and verifying local D1"
  pnpm --dir packages/db exec tsx src/seed/seed.ts \
    --local \
    --persist-to="$PERSIST_TO" \
    --config="$WRANGLER_CONFIG" \
    --manifest-out="$E2E_ARTIFACT_DIR/content-manifest.json"
  pnpm --dir packages/db exec tsx src/seed/verify.ts \
    --local \
    --persist-to="$PERSIST_TO" \
    --config="$WRANGLER_CONFIG" \
    --manifest="$E2E_ARTIFACT_DIR/content-manifest.json" \
    --report="$E2E_ARTIFACT_DIR/content-verification-report.json"

  if [[ "${E2E_TOPIK_GRADE1_FIXTURE:-0}" == "1" ]]; then
    echo "[e2e] seeding and verifying TOPIK grade 1 local fixture"
    pnpm --dir packages/db exec tsx src/seed/seed-topik-grade1-local-fixture.ts \
      --local \
      --persist-to="$PERSIST_TO" \
      --config="$WRANGLER_CONFIG" \
      --manifest-out="$E2E_ARTIFACT_DIR/topik-grade1-local-fixture-manifest.json"
    pnpm --dir packages/db exec tsx src/ops/verify-topik-grade1-local-fixture.ts \
      --local \
      --persist-to="$PERSIST_TO" \
      --config="$WRANGLER_CONFIG" \
      --report="$E2E_ARTIFACT_DIR/topik-grade1-local-fixture-report.json"
  fi

  # 강성호 2026-10-11: 두 실제 전체 승인 콘텐츠만 새 임시 Worker DB에 연결한다. 릴리스 증거/Production 공개가 아니다.
  if [[ -n "${E2E_REVIEWED_COHORT:-}" ]]; then
    pnpm --dir packages/db exec tsx src/ops/seed-reviewed-learning-e2e-fixture.ts \
      --persist-to="$PERSIST_TO" \
      --cohort="$E2E_REVIEWED_COHORT" \
      --review-a="${E2E_REVIEW_A:?actual independent review A is required}" \
      --review-b="${E2E_REVIEW_B:?actual independent review B is required}"
  fi
fi

pnpm -C apps/api exec wrangler dev \
  --config "$WRANGLER_CONFIG" \
  --persist-to "$PERSIST_TO" \
  --port "$API_PORT" \
  --var ENVIRONMENT:test \
  --var AUTH_MODE:app-session \
  --var APP_ORIGIN:http://127.0.0.1:"$WEB_PORT" \
  --var GOOGLE_CLIENT_ID:e2e-google-client \
  --var GOOGLE_CLIENT_SECRET:e2e-google-secret \
  --var GOOGLE_REDIRECT_URI:http://127.0.0.1:"$API_PORT"/api/v1/auth/google/callback
