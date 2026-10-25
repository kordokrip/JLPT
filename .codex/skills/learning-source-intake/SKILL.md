---
name: learning-source-intake
description: Intake verifiable language-source facts and metadata for JLPT or TOPIK content. Use when researching dictionaries, corpora, or official exam-structure guidance before creating self-authored learning material, source evidence, or content provenance records.
---

# Learning Source Intake

Record evidence, not source-derived exercises. Read [source-policy.md](references/source-policy.md) before collecting anything.

## Workflow

1. Act as the **Source Curator**. Confirm the source URL, licence identifier and URL, required attribution, allowed use, retrieval time, and SHA-256 before recording a fact.
2. Extract only compact language facts: a headword, reading, sense label, grammar constraint, or official exam-structure metadata. Never retain a source passage, official test item, answer, audio, screenshot transcript, or a scraped question bank.
3. Store the proposed record as JSON outside this skill directory, then validate and canonicalize it:

   ```bash
   python3 .codex/skills/learning-source-intake/scripts/record_intake.py \
     --input path/to/intake.json --output .artifacts/content-intake/<source-id>.json
   ```

4. Give the immutable output hash and attribution to the Item Author. Do not give the author copied source text.
5. Reject unknown licences, missing attribution, unverifiable retrieval data, or any use outside the source terms. Mark the content draft blocked instead of guessing metadata.

## Required boundaries

- Write every learning question, passage, choice, answer, and explanation from scratch. Official JLPT/TOPIK questions, answers, passages, and audio are excluded even for personal use.
- Treat the project registry as the candidate list; re-check the actual source terms at intake time. See `docs/00_overview/CONTENT_SOURCE_REGISTRY.md` in the repository.
- Preserve a source's attribution and allowed-use statement in the intake artifact; do not publish the source body in it.
- Pronunciation is Google-preferred same-language browser speech; same-language installed voice fallback is allowed. Never put pronunciation audio, an R2 key, stored audio bytes, activation, or R2 fallback metadata into an intake record.

## Record format

Read [intake-record.schema.json](references/intake-record.schema.json) before preparing input. The validator rejects unapproved fact kinds, source-text fields, missing provenance, oversized fact values, and malformed hashes.

## Handoff

Use distinct records for the four roles: Source Curator prepares this artifact; Item Author cites only its `artifact_sha256`; Adversarial Reviewer checks the resulting item independently; Release Steward accepts only validated, self-authored items.
