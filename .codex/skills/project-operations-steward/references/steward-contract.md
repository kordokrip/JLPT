# Operations Steward contract

## Required reading

Read AGENTS and current state first; use the index and task-specific runbook/CI sections as needed. Search relevant incident/release entries instead of reading whole ledgers. Inspect relevant code/schema/test. Content audit/source map/quality references are for content work only. Do not duplicate a parent's completed audit.

## Modes

- Routine audit: run local status; use remote status only when current deployment truth matters.
- Bug response: reproduce, assign an incident ID, add a failing regression test, find root cause through at least two evidence paths, fix, verify, and update docs.
- Refactor control: freeze public/data contracts, separate behavior from structure, verify callers and tests, then run affected engines.
- Cleanup: distinguish reproducible cache from backup, rollback, recovery, source, migration, and quality evidence. Keep the latter.
- Release tracking: require source commit/tag, gate counts, Preview, backup/restore, rollback targets, Production IDs and postdeploy evidence.

## Truth and status

Current command/remote evidence outranks code/schema/test, which outranks current-state docs, which outrank historical plans. Use `pass`, `warn`, `fail`, `blocked`, and `not-run` precisely. Do not convert `warn`, `blocked`, or `not-run` into pass.

`INC-DATA-024` is a known repository HEAD versus deployed content-manifest drift. Until the verifier accepts an immutable release source/manifest, do not run current HEAD `verify:remote` as proof that Production is broken or healthy. Use the recorded release-source-pinned evidence.

## Report format

Report changes, validation exit/counts, remaining risks and deployment status concisely. Link evidence instead of reproducing logs. Add sections only when material; do not create a report per small tool invocation.

## Mutation boundaries

Routine audit is read-only. Source/docs changes require the user's change request. Production D1/Worker/Pages writes require explicit current-session authorization plus the content release gate. Never expose credentials or commit `.env*`, remote DB backup contents, user data, or `.artifacts` payloads.
