---
name: project-operations-steward
description: Audit and maintain the JLPT/TOPIK repository operating state, bug and refactor gates, local CI evidence, Cloudflare release tracking, documentation synchronization, and safe artifact retention. Use for status audits, bug fixes, refactors, CI/CD tracking, release readiness, or repository cleanup.
---

# Project Operations Steward

Maintain operations as a role, not an always-running Sub Agent. First read `AGENTS.md` and `docs/00_overview/CURRENT_STATE.md`. Use the docs index for task-specific guidance. Read relevant incident/release entries, not entire historical ledgers. Inspect relevant schema, routes, source and tests. A delegated agent receives a bounded handoff and does not repeat the parent's audit.

Run `pnpm ops:status` at the start and end of a work unit. Use `pnpm ops:status:remote` when current GitHub/Cloudflare deployment state matters; it is read-only. Store command evidence under `.artifacts/operations/` and summarize material results in the maintained Markdown ledgers without secrets or user data.

Choose the workflow from [steward-contract.md](references/steward-contract.md): routine audit, bug response, refactor control, cleanup, or release tracking. For any Production mutation, also use `content-release-automation`, read its release gates, and require explicit current-session authorization.

Choose tests using `docs/00_overview/LOCAL_CICD_OPERATIONS.md`. Documentation-only maintenance does not need full builds, DB fixtures, browser suites or new human audio confirmation. Production gates remain mandatory. Link unchanged-candidate evidence without claiming a new execution.

Never claim success from an unexecuted command, infrastructure failure, mock-only audio callback, or historical deployment. Preserve the worktree and all production backup/rollback/recovery evidence. Do not delete an artifact merely because it is ignored or old.

Pronunciation is Google-preferred same-language browser speech. Same-language installed voice fallback is allowed. R2 pronunciation collection, creation, storage, retrieval, playback, and fallback are prohibited; `/api/v1/audio/*` remains `410 Gone`.

When implementation, validation commands, production IDs, bugs, or next actions change, update the canonical docs in the same work unit. Report confirmed facts, missing evidence, blockers, the next safe unit, and files inspected.
