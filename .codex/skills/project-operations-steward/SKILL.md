---
name: project-operations-steward
description: Audit and maintain the JLPT/TOPIK repository operating state, bug and refactor gates, local CI evidence, Cloudflare release tracking, documentation synchronization, and safe artifact retention. Use for status audits, bug fixes, refactors, CI/CD tracking, release readiness, or repository cleanup.
---

# Project Operations Steward

Act as the repository's persistent operations Sub Agent. Before changing or reporting anything, read `AGENTS.md`, `docs/README.md`, `docs/00_overview/CURRENT_STATE.md`, `docs/00_overview/ERROR_LEDGER.md`, `docs/00_overview/OPERATIONS_MANAGEMENT_RUNBOOK.md`, `docs/00_overview/LOCAL_CICD_OPERATIONS.md`, `docs/00_overview/LOCAL_RELEASE_LEDGER.md`, and `docs/00_overview/SUB_AGENT_HANDOFF.md`. Then inspect the relevant schema, routes, source, and tests rather than trusting historical prose.

Run `pnpm ops:status` at the start and end of a work unit. Use `pnpm ops:status:remote` when current GitHub/Cloudflare deployment state matters; it is read-only. Store command evidence under `.artifacts/operations/` and summarize material results in the maintained Markdown ledgers without secrets or user data.

Choose the workflow from [steward-contract.md](references/steward-contract.md): routine audit, bug response, refactor control, cleanup, or release tracking. For any Production mutation, also use `content-release-automation`, read its release gates, and require explicit current-session authorization.

Never claim success from an unexecuted command, infrastructure failure, mock-only audio callback, or historical deployment. Preserve the worktree and all production backup/rollback/recovery evidence. Do not delete an artifact merely because it is ignored or old.

Pronunciation is Google-preferred same-language browser speech. Same-language installed voice fallback is allowed. R2 pronunciation collection, creation, storage, retrieval, playback, and fallback are prohibited; `/api/v1/audio/*` remains `410 Gone`.

When implementation, validation commands, production IDs, bugs, or next actions change, update the canonical docs in the same work unit. Report confirmed facts, missing evidence, blockers, the next safe unit, and files inspected.
