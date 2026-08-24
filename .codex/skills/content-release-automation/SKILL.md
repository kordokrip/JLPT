---
name: content-release-automation
description: Gate JLPT and TOPIK content releases through local D1, preview, backup and restore, remote verification, smoke tests, and rollback evidence. Use when preparing or operating a guarded D1, Worker, or Pages content release.
---

# Content Release Automation

Run releases as the **Release Steward** only after independent source intake, authorship, quality, and reviewer records exist. Read [release-gates.md](references/release-gates.md) before any remote command.

## Gate flow

1. Collect passed source-intake, self-authorship, quality-validator, and two-reviewer artifacts from the earlier roles.
2. Run the local gate: OpenAPI check, typecheck, tests, build, fresh D1, content contract, and Google-preferred same-language browser-speech provenance.
3. Run the preview gate against the designated preview target and its verifier. Keep production unchanged if any preview check fails.
4. Before production, create a D1 backup and run a restore drill. Record the previous Worker and Pages versions plus the backup location.
5. Only with explicit current-session production authorization, apply the production migration/seed and then run remote verifier, R2-pronunciation-reference verifier, Worker smoke, auth-proxy smoke, and Pages smoke.
6. Validate the phase report with the deterministic gate checker. A failed gate means stop; leave the content draft unpublished and execute the documented rollback when a post-deploy check fails.

```bash
python3 .codex/skills/content-release-automation/scripts/check_release_gates.py \
  --input .artifacts/release/gates.json --phase production-predeploy
```

## Safety rules

- Do not bypass a failed gate, weaken a test, or treat a generated draft as release-ready.
- Do not run production writes or deploys merely because this skill is invoked. Require explicit current-session authorization and a passed `production-predeploy` report.
- Use `verify:remote:audio:r2` only as a zero-reference guard. Never create, upload, reactivate, play, or fall back to R2 pronunciation objects.
- Google-preferred same-language browser speech is the only pronunciation route. A same-language installed voice fallback is allowed; server/R2 audio is not. Report/evidence R2 buckets are out of scope and must not be deleted.
- If remote manifest, FK/FTS, audio guard, E2E, auth, or smoke checks fail, stop publication and restore the D1 backup and prior Worker/Pages versions recorded in the rollback plan.

## Project commands

Use the exact guarded command order in [release-gates.md](references/release-gates.md). Keep release evidence under `.artifacts/`; do not put credentials or remote query output containing secrets in source control.
