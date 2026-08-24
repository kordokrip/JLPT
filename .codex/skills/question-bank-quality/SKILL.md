---
name: question-bank-quality
description: Audit self-authored JLPT and TOPIK question banks before seed or release. Use when validating choices, answers, translations, difficulty, provenance, independent review, duplicate items, answer-position balance, or browser-speech pronunciation constraints.
---

# Question Bank Quality

Use this skill before a draft becomes seedable or publishable. Read [quality-contract.md](references/quality-contract.md) and keep the Item Author and Adversarial Reviewer independent.

## Workflow

1. Have the **Item Author** write all prompts, options, answers, passages, and explanations from scratch, citing only an intake artifact hash.
2. Have the **Adversarial Reviewer** independently assess each item: intended answer index, option plausibility, ambiguity, difficulty, translations, and explanation consistency. Two named, distinct approvals are required.
3. Export the generic bank JSON and run the deterministic validator:

   ```bash
   python3 .codex/skills/question-bank-quality/scripts/check_question_bank.py \
     --input path/to/question-bank.json --output .artifacts/content-quality/report.json \
     --max-answer-imbalance 1
   ```

4. For a 60-question four-choice section, add `--expected-per-answer 15`. A failing report blocks the batch; correct the authored draft and re-run both review passes.
5. Add the validator report hash and both reviewer records to the quality ledger before asking the Release Steward to seed it.

## Non-negotiable checks

- Require self-authorship, a valid intake artifact SHA-256, Korean/Japanese/English question and explanation fields, and non-empty difficulty metadata.
- For four-choice questions require exactly four distinct multilingual choices, a valid answer index, no duplicate prompt fingerprint, and two distinct approvals matching that answer index.
- For constructed-response questions require a multilingual rubric and two approvals; do not invent a multiple-choice answer index.
- Use the report to catch mechanical properties. Semantic answer/explanation consistency is established by the independent reviewer attestations, not by a model guess.
- Do not accept copied official-exam questions, source passages, answer keys, audio, or scraped banks.
- Require Google-preferred same-language browser speech. Same-language installed voice fallback is allowed; R2 pronunciation keys, assets, generation, activation, playback, and fallback are invalid.

## Data contract

Read [quality-contract.md](references/quality-contract.md) for the JSON shape. The validator uses `section` as the static answer-distribution group. Separate dynamic-session rotation tests belong in the application test suite and must retain the existing learner API wire shape.
