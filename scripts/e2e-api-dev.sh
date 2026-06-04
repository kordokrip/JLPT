#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${E2E_SKIP_DB_BOOTSTRAP:-}" != "1" ]]; then
  if pnpm -C apps/api exec wrangler d1 execute nihongo-n3-prod --local --config wrangler.toml --command "SELECT COUNT(*) FROM vocab; SELECT COUNT(*) FROM reading_passages; SELECT COUNT(*) FROM push_subscriptions; SELECT COUNT(*) FROM self_check_templates;" >/dev/null 2>&1; then
    echo "[e2e] local D1 already has required tables"
  else
    echo "[e2e] bootstrapping local D1 schema and seed data"
    node scripts/e2e-bootstrap-d1.mjs
  fi
  if pnpm -C apps/api exec wrangler d1 execute nihongo-n3-prod --local --config wrangler.toml --command "SELECT password_hash FROM users LIMIT 1; SELECT COUNT(*) FROM auth_sessions; SELECT COUNT(*) FROM login_events;" >/dev/null 2>&1; then
    echo "[e2e] local D1 already has auth tables"
  else
    echo "[e2e] applying local D1 auth migration"
    pnpm -C apps/api exec wrangler d1 execute nihongo-n3-prod --local --config wrangler.toml --file ../../packages/db/drizzle/0003_app_auth.sql --yes
  fi
  echo "[e2e] ensuring local D1 seed data"
  pnpm -F @nihongo-n3/db seed:local
fi

pnpm -F @nihongo-n3/api dev
