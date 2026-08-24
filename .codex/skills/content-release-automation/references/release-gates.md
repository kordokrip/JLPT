# JLPT/TOPIK release gates

## Local

Run `pnpm openapi:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm -F @nihongo-n3/db verify:fresh`, `pnpm -F @nihongo-n3/db content:contract:verify`, and `pnpm -F @nihongo-n3/db verify:audio:provenance`. Run the affected Chromium and WebKit E2E specifications, including Google speech and zero `/api/v1/audio/` requests.

## Preview

Use the dedicated Preview D1 and release profile for the content being shipped. Do not substitute Production as Preview. The `topik:practice:seed:preview` and `ALLOW_TOPIK_PREVIEW_CHANGE=topik-practice-v2-seed` commands apply only to the historical TOPIK practice v2 profile; N2/N1 practice and TOPIK owner batches must use their own release seed, quality requirements, G0–G4 and verifier. Capture the exact profile, database, release IDs and reports.

## Production

Require explicit current-session authorization. First inspect migration ledger and immutable release manifest; then run `d1:backup` and `d1:restore-drill`. Apply remote migrations with their required production guard, seed remotely with its required guard, then run the verifier pinned to that release source/manifest, `verify:remote:audio:r2`, migration-ledger verification, `ops:observe -- --smoke-only`, and `ops:verify-auth-proxy`. Until `INC-DATA-024` is resolved, do not use a current-HEAD manifest comparison as Production proof for a Pages-only release.

Deploy the Worker and Pages only after these pre-deploy gates pass. Re-run remote verifier and smoke checks after deployment.

## Rollback evidence

Before any production write, record the D1 backup path, previous Worker version, previous Pages production deployment, content manifest, and responsible release record. On failed post-deploy verification, stop seeding, restore the recorded backup, roll Worker back to the recorded version, re-promote the recorded Pages deployment, and rerun remote verification plus smoke.

## Audio policy

`verify:remote:audio:r2` must report zero D1-referenced pronunciation keys. It is a blocklist verifier, not an instruction to use R2. Pronunciation uses Google-preferred same-language browser speech, with same-language installed voice fallback when Google is not enumerated.
