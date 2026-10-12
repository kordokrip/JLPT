import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveLearningPathV4SourceBinding } from "./learning-path-v4-source-binding.js";
import { fullSourceFailures } from "./learning-path-full-contract.js";
import { fullV4Authoring } from "./learning-path-v4-authoring.js";

test("actual immutable Git sources bind all 220 exact public concepts; caller intake is not trusted", () => {
  const selection = readFileSync(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json", import.meta.url));
  const binding = resolveLearningPathV4SourceBinding(selection);
  assert.equal(binding.trusted, true);
  assert.equal(Object.keys(binding.concept_owned_files).length, 220);
  assert.equal(Object.keys(binding.owned_file_sha256).length, 17);
  assert.equal(binding.inventory_sha256, "13042222b27349114ee2758c61c252c956183881690092da5115748bbd5f3bc1");
  const incomplete = { scope: "full-bank-only", records: [], concept_evidence: [], content_source_sha: binding.content_source_sha, concept_inventory_sha256: binding.inventory_sha256 };
  assert.ok(fullSourceFailures(fullV4Authoring().concepts, incomplete, binding).length > 0);
  const changed = JSON.parse(selection.toString());
  changed.concepts[0].lookup.value = "unavailable-exact-concept";
  assert.throws(() => resolveLearningPathV4SourceBinding(Buffer.from(JSON.stringify(changed))));
  const forged = JSON.parse(selection.toString());
  forged.concepts[0].authoring_context.ko = "학교_SYNTHETIC_DRIFT";
  assert.throws(() => resolveLearningPathV4SourceBinding(Buffer.from(JSON.stringify(forged))));
});
