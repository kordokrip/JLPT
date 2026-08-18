# JLPT/TOPIK release gates

## Local

Run `pnpm openapi:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm -F @nihongo-n3/db verify:fresh`, `pnpm -F @nihongo-n3/db content:contract:verify`, and `pnpm -F @nihongo-n3/db verify:audio:provenance`. Run the affected Chromium and WebKit E2E specifications, including Google speech and zero `/api/v1/audio/` requests.

## Preview

Use the dedicated preview D1 target only. Apply migrations to `nihongo-n3-topik-preview`, then run `topik:practice:seed:preview` with `ALLOW_TOPIK_PREVIEW_CHANGE=topik-practice-v2-seed`; run `topik:practice:verify` and `audit-question-bank-quality` against that preview target and capture their reports. Do not substitute production as preview.

## Production

Require explicit current-session authorization. First inspect migration ledger and manifest; then run `d1:backup` and `d1:restore-drill`. Apply remote migrations with their required production guard, seed remotely with its required guard, then run `verify:remote`, `verify:remote:audio:r2`, migration-ledger verification, `ops:observe -- --smoke-only`, and `ops:verify-auth-proxy`.

Deploy the Worker and Pages only after these pre-deploy gates pass. Re-run remote verifier and smoke checks after deployment.

## Rollback evidence

Before any production write, record the D1 backup path, previous Worker version, previous Pages production deployment, content manifest, and responsible release record. On failed post-deploy verification, stop seeding, restore the recorded backup, roll Worker back to the recorded version, re-promote the recorded Pages deployment, and rerun remote verification plus smoke.

## Audio policy

`verify:remote:audio:r2` must report zero D1-referenced pronunciation keys. It is a blocklist verifier, not an instruction to use R2. Google browser speech is the sole pronunciation provider.
