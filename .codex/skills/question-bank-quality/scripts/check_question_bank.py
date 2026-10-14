#!/usr/bin/env python3
"""Validate the portable self-authored JLPT/TOPIK question-bank contract."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

SHA256 = re.compile(r"^[a-f0-9]{64}$")
LANGUAGES = ("ko", "ja", "en")


def normalized_text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def multilingual(value: object, path: str, errors: list[str]) -> dict[str, str]:
    if not isinstance(value, dict):
        errors.append(f"{path} must be an object with ko, ja, en")
        return {}
    result = {}
    for language in LANGUAGES:
        text = normalized_text(value.get(language))
        if not text:
            errors.append(f"{path}.{language} must be non-empty")
        result[language] = text
    return result


def item_fingerprint(question: dict[str, str]) -> str:
    return hashlib.sha256("\u241f".join(question.get(language, "") for language in LANGUAGES).encode()).hexdigest()


def validate_item(item: object, index: int, errors: list[str], answer_groups: dict[str, Counter]) -> str | None:
    path = f"items[{index}]"
    if not isinstance(item, dict):
        errors.append(f"{path} must be an object")
        return None
    item_id = item.get("id")
    if not isinstance(item_id, str) or not item_id.strip():
        errors.append(f"{path}.id must be non-empty")
    if not isinstance(item.get("section"), str) or not item["section"].strip():
        errors.append(f"{path}.section must be non-empty")
    if item.get("authorship") != "self-authored":
        errors.append(f"{path}.authorship must be self-authored")
    if not isinstance(item.get("source_evidence_hash"), str) or not SHA256.fullmatch(item["source_evidence_hash"]):
        errors.append(f"{path}.source_evidence_hash must be lowercase SHA-256")
    difficulty = item.get("difficulty")
    if not isinstance(difficulty, dict) or not normalized_text(difficulty.get("exam")) or not normalized_text(difficulty.get("level")):
        errors.append(f"{path}.difficulty.exam and {path}.difficulty.level must be non-empty")
    question = multilingual(item.get("question"), f"{path}.question", errors)
    multilingual(item.get("explanation"), f"{path}.explanation", errors)
    question_type = item.get("question_type")
    reviewers = item.get("reviewers")
    if not isinstance(reviewers, list) or len(reviewers) != 2:
        errors.append(f"{path}.reviewers must contain exactly two independent decisions")
        reviewers = []
    reviewer_ids = set()
    for reviewer_index, review in enumerate(reviewers):
        review_path = f"{path}.reviewers[{reviewer_index}]"
        if not isinstance(review, dict):
            errors.append(f"{review_path} must be an object")
            continue
        reviewer_id = normalized_text(review.get("reviewer_id"))
        if not reviewer_id:
            errors.append(f"{review_path}.reviewer_id must be non-empty")
        elif reviewer_id in reviewer_ids:
            errors.append(f"{path}.reviewers must have distinct reviewer_id values")
        reviewer_ids.add(reviewer_id)
        if review.get("verdict") != "approved":
            errors.append(f"{review_path}.verdict must be approved")
        if review.get("explanation_consistent") is not True:
            errors.append(f"{review_path}.explanation_consistent must be true")
    if question_type == "choice":
        choices = item.get("choices")
        if not isinstance(choices, list) or len(choices) != 4:
            errors.append(f"{path}.choices must contain exactly four choices")
            choices = []
        choice_fingerprints = set()
        for choice_index, choice in enumerate(choices):
            normalized_choice = multilingual(choice, f"{path}.choices[{choice_index}]", errors)
            fingerprint = item_fingerprint(normalized_choice)
            if fingerprint in choice_fingerprints:
                errors.append(f"{path}.choices contains a duplicate choice")
            choice_fingerprints.add(fingerprint)
        answer_index = item.get("answer_index")
        if not isinstance(answer_index, int) or isinstance(answer_index, bool) or answer_index not in range(4):
            errors.append(f"{path}.answer_index must be an integer from 0 to 3")
        else:
            for reviewer_index, review in enumerate(reviewers):
                if isinstance(review, dict) and review.get("answer_index") != answer_index:
                    errors.append(f"{path}.reviewers[{reviewer_index}].answer_index must match item answer_index")
            section = item.get("section")
            if isinstance(section, str) and section.strip():
                answer_groups[section][answer_index] += 1
    elif question_type == "constructed-response":
        if item.get("answer_index") is not None:
            errors.append(f"{path}.answer_index must be absent or null for constructed-response")
        multilingual(item.get("rubric"), f"{path}.rubric", errors)
        for reviewer_index, review in enumerate(reviewers):
            if isinstance(review, dict) and "answer_index" in review:
                errors.append(f"{path}.reviewers[{reviewer_index}] must not have answer_index for constructed-response")
    else:
        errors.append(f"{path}.question_type must be choice or constructed-response")
    return item_fingerprint(question) if question else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--max-answer-imbalance", type=int, default=1)
    parser.add_argument("--expected-per-answer", type=int)
    args = parser.parse_args()
    errors: list[str] = []
    try:
        bank = json.loads(args.input.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"question-bank validation failed: {exc}", file=sys.stderr)
        return 1
    if not isinstance(bank, dict):
        errors.append("input must be an object")
        bank = {}
    for field in ("bank_id", "bank_version"):
        if not normalized_text(bank.get(field)):
            errors.append(f"{field} must be non-empty")
    items = bank.get("items")
    if not isinstance(items, list) or not items:
        errors.append("items must be a non-empty array")
        items = []
    item_ids = set()
    prompts = set()
    answer_groups: dict[str, Counter] = defaultdict(Counter)
    for index, item in enumerate(items):
        fingerprint = validate_item(item, index, errors, answer_groups)
        item_id = item.get("id") if isinstance(item, dict) else None
        if isinstance(item_id, str) and item_id.strip():
            if item_id in item_ids:
                errors.append(f"duplicate item id: {item_id}")
            item_ids.add(item_id)
        if fingerprint:
            if fingerprint in prompts:
                errors.append(f"duplicate normalized prompt at items[{index}]")
            prompts.add(fingerprint)
    distributions = {}
    for section, counts in sorted(answer_groups.items()):
        values = [counts[index] for index in range(4)]
        distributions[section] = values
        if max(values) - min(values) > args.max_answer_imbalance:
            errors.append(f"section {section} answer distribution {values} exceeds imbalance {args.max_answer_imbalance}")
        if args.expected_per_answer is not None and values != [args.expected_per_answer] * 4:
            errors.append(f"section {section} answer distribution {values} must equal {[args.expected_per_answer] * 4}")
    report = {
        "validator_version": "1",
        "bank_id": bank.get("bank_id"),
        "bank_version": bank.get("bank_version"),
        "items_checked": len(items),
        "answer_distributions": distributions,
        "passed": not errors,
        "errors": errors,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"question-bank report: {args.output} ({'passed' if not errors else 'failed'})")
    for error in errors:
        print(f"FAIL {error}", file=sys.stderr)
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
