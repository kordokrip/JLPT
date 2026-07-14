#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
PERSIST_TO="${E2E_D1_PERSIST_TO:-$ROOT_DIR/.artifacts/e2e/d1}"

if [[ "${E2E_SKIP_DB_BOOTSTRAP:-}" != "1" ]]; then
  rm -rf "$PERSIST_TO"
  mkdir -p "$PERSIST_TO"
  echo "[e2e] applying canonical D1 migrations"
  pnpm exec wrangler d1 migrations apply DB \
    --local \
    --persist-to "$PERSIST_TO" \
    --config apps/api/wrangler.toml

  echo "[e2e] seeding and verifying local D1"
  pnpm --dir packages/db exec tsx src/seed/seed.ts --local --persist-to="$PERSIST_TO"
  pnpm --dir packages/db exec tsx src/seed/verify.ts --local --persist-to="$PERSIST_TO"
fi

pnpm -C apps/api exec wrangler dev \
  --persist-to "$PERSIST_TO" \
  --var ENVIRONMENT:test \
  --var AUTH_MODE:app-session \
  --var APP_ORIGIN:http://localhost:5173 \
  --var GOOGLE_CLIENT_ID:e2e-google-client \
  --var GOOGLE_CLIENT_SECRET:e2e-google-secret \
  --var GOOGLE_REDIRECT_URI:http://localhost:8787/api/v1/auth/google/callback
