#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
WRANGLER_CONFIG="${E2E_WRANGLER_CONFIG:-$ROOT_DIR/apps/api/wrangler.test.toml}"
API_PORT="${E2E_API_PORT:-8788}"
WEB_PORT="${E2E_WEB_PORT:-4173}"

if [[ -n "${E2E_D1_PERSIST_TO:-}" ]]; then
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
  rm -rf "$PERSIST_TO"
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
