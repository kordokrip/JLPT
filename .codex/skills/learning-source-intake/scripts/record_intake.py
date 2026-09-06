#!/usr/bin/env python3
"""Validate and canonicalize a language-facts-only source intake JSON record."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

FACT_KINDS = {"lexical-form", "reading", "sense-label", "grammar-constraint", "exam-structure"}
LANGUAGES = {"ja", "ko", "en"}
FORBIDDEN_KEYS = {
    "audio", "audio_r2_key", "answer", "answer_index", "choices", "excerpt", "full_text",
    "image", "item", "passage", "question", "r2_key", "stored_audio_bytes_sha256", "transcript",
}
SHA256 = re.compile(r"^[a-f0-9]{64}$")


def fail(message: str) -> None:
    raise ValueError(message)


def require_string(value: object, label: str, maximum: int | None = None) -> str:
    if not isinstance(value, str) or not value.strip():
        fail(f"{label} must be a non-empty string")
    value = value.strip()
    if maximum is not None and len(value) > maximum:
        fail(f"{label} must be at most {maximum} characters")
    return value


def require_url(value: object, label: str) -> str:
    value = require_string(value, label)
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        fail(f"{label} must be an absolute http(s) URL")
    return value


def require_timestamp(value: object) -> str:
    value = require_string(value, "source.retrieved_at")
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("source.retrieved_at must be ISO-8601") from exc
    if parsed.tzinfo is None:
        fail("source.retrieved_at must include a timezone")
    return parsed.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def reject_forbidden_keys(value: object, path: str = "") -> None:
    if isinstance(value, dict):
        for key, nested in value.items():
            if key in FORBIDDEN_KEYS:
                fail(f"{path}{key} is not allowed in a language-facts intake")
            reject_forbidden_keys(nested, f"{path}{key}.")
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            reject_forbidden_keys(nested, f"{path}{index}.")


def validate(record: object) -> dict:
    if not isinstance(record, dict):
        fail("input must be a JSON object")
    reject_forbidden_keys(record)
    source = record.get("source")
    facts = record.get("facts")
    if not isinstance(source, dict):
        fail("source must be an object")
    if not isinstance(facts, list) or not facts:
        fail("facts must be a non-empty array")
    license_info = source.get("license")
    if not isinstance(license_info, dict):
        fail("source.license must be an object")
    source_hash = require_string(source.get("sha256"), "source.sha256")
    if not SHA256.fullmatch(source_hash):
        fail("source.sha256 must be lowercase SHA-256")
    if source.get("allowed_use") != "language-facts-and-metadata-only":
        fail("source.allowed_use must be language-facts-and-metadata-only")
    normalized_facts = []
    fact_ids = set()
    for index, fact in enumerate(facts):
        if not isinstance(fact, dict):
            fail(f"facts[{index}] must be an object")
        fact_id = require_string(fact.get("id"), f"facts[{index}].id")
        if fact_id in fact_ids:
            fail(f"duplicate fact id: {fact_id}")
        fact_ids.add(fact_id)
        kind = fact.get("kind")
        language = fact.get("language")
        if kind not in FACT_KINDS:
            fail(f"facts[{index}].kind must be one of {sorted(FACT_KINDS)}")
        if language not in LANGUAGES:
            fail(f"facts[{index}].language must be one of {sorted(LANGUAGES)}")
        normalized_facts.append({
            "id": fact_id,
            "kind": kind,
            "language": language,
            "value": require_string(fact.get("value"), f"facts[{index}].value", 500),
            "source_locator": require_string(fact.get("source_locator"), f"facts[{index}].source_locator", 300),
        })
    return {
        "intake_schema_version": "1",
        "source": {
            "id": require_string(source.get("id"), "source.id", 100),
            "url": require_url(source.get("url"), "source.url"),
            "license": {
                "id": require_string(license_info.get("id"), "source.license.id", 120),
                "url": require_url(license_info.get("url"), "source.license.url"),
            },
            "attribution": require_string(source.get("attribution"), "source.attribution", 1000),
            "allowed_use": "language-facts-and-metadata-only",
            "retrieved_at": require_timestamp(source.get("retrieved_at")),
            "sha256": source_hash,
        },
        "facts": sorted(normalized_facts, key=lambda fact: fact["id"]),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    try:
        normalized = validate(json.loads(args.input.read_text(encoding="utf-8")))
        canonical = json.dumps(normalized, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        normalized["artifact_sha256"] = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(normalized, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
        print(f"validated intake: {args.output} ({normalized['artifact_sha256']})")
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"intake validation failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
