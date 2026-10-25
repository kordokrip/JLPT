#!/usr/bin/env python3
"""Validate recorded release gates; this script never deploys or changes remote state."""

import argparse
import json
import sys
from pathlib import Path

PHASES = {
    "local": ["source_intake", "self_authorship", "quality_validator", "independent_review", "openapi", "typecheck", "tests", "build", "fresh_d1", "content_contract", "google_only_audio", "e2e_chromium", "e2e_webkit"],
    "preview": ["source_intake", "self_authorship", "quality_validator", "independent_review", "preview_d1", "preview_verifier", "google_only_audio", "e2e_chromium", "e2e_webkit"],
    "production-predeploy": ["source_intake", "self_authorship", "quality_validator", "independent_review", "fresh_d1", "content_contract", "google_only_audio", "e2e_chromium", "e2e_webkit", "predeploy_backup", "restore_drill", "migration_ledger", "remote_verifier", "r2_pronunciation_guard", "rollback_plan"],
    "postdeploy": ["remote_verifier", "r2_pronunciation_guard", "worker_deploy", "pages_deploy", "worker_smoke", "auth_proxy_smoke", "pages_smoke", "rollback_plan"],
}


def passed_gate(value: object, name: str, errors: list[str]) -> None:
    if name == "rollback_plan":
        if not isinstance(value, dict):
            errors.append("rollback_plan must be an object")
            return
        for field in ("d1_backup", "worker_version", "pages_deployment"):
            if not isinstance(value.get(field), str) or not value[field].strip():
                errors.append(f"rollback_plan.{field} must be a non-empty string")
        return
    if not isinstance(value, dict):
        errors.append(f"{name} must be an object")
        return
    if value.get("passed") is not True:
        errors.append(f"{name}.passed must be true")
    if not isinstance(value.get("artifact"), str) or not value["artifact"].strip():
        errors.append(f"{name}.artifact must be a non-empty evidence path or identifier")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--phase", required=True, choices=sorted(PHASES))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    errors: list[str] = []
    try:
        record = json.loads(args.input.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"release-gate validation failed: {exc}", file=sys.stderr)
        return 1
    if not isinstance(record, dict):
        errors.append("input must be an object")
        record = {}
    for field in ("release_id", "content_manifest", "validator_version"):
        if not isinstance(record.get(field), str) or not record[field].strip():
            errors.append(f"{field} must be a non-empty string")
    gates = record.get("gates")
    if not isinstance(gates, dict):
        errors.append("gates must be an object")
        gates = {}
    for name in PHASES[args.phase]:
        passed_gate(gates.get(name), name, errors)
    audio = gates.get("google_only_audio")
    if isinstance(audio, dict):
        if audio.get("provider") != "google-browser":
            errors.append("google_only_audio.provider must be google-browser")
        if audio.get("r2_pronunciation_references") != 0:
            errors.append("google_only_audio.r2_pronunciation_references must be 0")
    r2_guard = gates.get("r2_pronunciation_guard")
    if isinstance(r2_guard, dict) and r2_guard.get("referenced_keys") != 0:
        errors.append("r2_pronunciation_guard.referenced_keys must be 0")
    result = {"phase": args.phase, "release_id": record.get("release_id"), "passed": not errors, "errors": errors}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"release gates {args.phase}: {'passed' if not errors else 'failed'}")
    for error in errors:
        print(f"FAIL {error}", file=sys.stderr)
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
