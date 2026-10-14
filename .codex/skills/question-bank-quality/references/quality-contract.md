# Question-bank contract

Input is a JSON object with `bank_id`, `bank_version`, and non-empty `items`.

Every item has `id`, `section`, `question_type` (`choice` or `constructed-response`), `authorship: "self-authored"`, a 64-character `source_evidence_hash`, non-empty `difficulty.exam` and `difficulty.level`, and multilingual `question` plus `explanation` objects containing non-empty `ko`, `ja`, and `en` values.

Choice items additionally have exactly four multilingual choices, `answer_index` from 0 to 3, and exactly two distinct reviewer decisions. Each reviewer decision contains `reviewer_id`, `verdict: "approved"`, the same `answer_index`, and `explanation_consistent: true`.

Constructed-response items have a multilingual `rubric`, no answer index, and two distinct approvals with `explanation_consistent: true`.

The validator rejects duplicate normalized prompt fingerprints and duplicate choice fingerprints. It groups choice-item answers by `section`: `--max-answer-imbalance 1` enforces general static balance; `--expected-per-answer 15` enforces exact `15/15/15/15` for every 60-item four-choice section.

Keep a ledger entry with the source artifact hash, validator report hash, both reviewer identities and verdicts, and release state (`draft`, `approved`, or `released`).
