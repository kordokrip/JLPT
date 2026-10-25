import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fullV4Authoring } from "./learning-path-v4-authoring.js";
import { LEARNING_PATH_CONTENT_SOURCE } from "./learning-path-full-contract.js";
import { currentRepresentativeEvidence, evidenceFailures } from "./learning-path-evidence.js";
import { sha256, type FrozenLearningPathV4, type TrustedSourceBinding } from "./learning-path-v4-freeze.js";
import { learningPathV4Readiness } from "./learning-path-v4-readiness.js";

// Synthetic fixtures exercise only mechanical gates; they are never semantic approval evidence.
function syntheticCandidate() {
  const authored = fullV4Authoring();
  const publicSelectionBytes = readFileSync(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json", import.meta.url));
  const inventoryBytes = Buffer.from(`${JSON.stringify({ concepts: authored.concepts }, null, 2)}\n`);
  const sourceBytes = Buffer.from(JSON.stringify({ scope: "full-bank-only", full_bank_source_complete: true, content_source_sha: LEARNING_PATH_CONTENT_SOURCE, concept_inventory_sha256: sha256(publicSelectionBytes), records: [], concept_evidence: [] }));
  const noHashes: Omit<FrozenLearningPathV4, "draft_sha256" | "source_evidence_sha256" | "concept_inventory_sha256"> = { scope: "full-bank-only" as const, publication: "draft-unpublished" as const, version: "lp4-2026-10-11" as const, bundle: "learning-path-v4-2026-10-11" as const, screen_contract: { audio: "google-preferred-same-language-fallback-ko-ja-only-no-r2" as const, r2_audio: "prohibited" as const, legacy_audio: "410-gone" as const }, concepts: authored.concepts, items: authored.items, lessons: authored.lessons, metadata: { content_source_sha: LEARNING_PATH_CONTENT_SOURCE, source_scope: "full-bank-only" as const, full_bank_source_complete: true as const, trusted_source_binding: "immutable-content-source" as const, public_selection_sha256: sha256(publicSelectionBytes), hash_method: "SHA-256 of JSON.stringify(payload) after excluding draft_sha256, source_evidence_sha256 and concept_inventory_sha256" as const } };
  const bundle: FrozenLearningPathV4 = { ...noHashes, draft_sha256: sha256(JSON.stringify(noHashes)), source_evidence_sha256: sha256(sourceBytes), concept_inventory_sha256: sha256(inventoryBytes) };
  const binding: TrustedSourceBinding = { trusted: true, content_source_sha: LEARNING_PATH_CONTENT_SOURCE, inventory_sha256: sha256(publicSelectionBytes), owned_file_sha256: {}, concept_owned_files: {} };
  return { bundle, sourceBytes, inventoryBytes, publicSelectionBytes, binding };
}

test("synthetic fixture with no reviews remains blocked and creates no semantic approval", () => {
  const fixture = syntheticCandidate();
  const report = learningPathV4Readiness({ ...fixture, trustedSourceBinding: fixture.binding, reviews: [] });
  assert.equal(report.full_bank_ready, false);
  assert.match(report.failures.join("\n"), /exactly two distinct independent reviewers/);
  assert.equal(report.remote_writes, 0);
});

test("forged frozen hashes, false source-complete flag, and item count changes remain blocked", () => {
  const fixture = syntheticCandidate();
  const forged = structuredClone(fixture.bundle); forged.draft_sha256 = "0".repeat(64);
  assert.match(learningPathV4Readiness({ ...fixture, bundle: forged, trustedSourceBinding: fixture.binding, reviews: [] }).failures.join("\n"), /hash mismatch/);
  const falseSource = Buffer.from(fixture.sourceBytes.toString().replace("true", "false"));
  assert.match(learningPathV4Readiness({ ...fixture, sourceBytes: falseSource, trustedSourceBinding: fixture.binding, reviews: [] }).failures.join("\n"), /complete full-bank-only/);
  const fewer = structuredClone(fixture.bundle); fewer.items.pop();
  assert.match(learningPathV4Readiness({ ...fixture, bundle: fewer, trustedSourceBinding: fixture.binding, reviews: [] }).failures.join("\n"), /440 items/);
});

test("current v3 representative reviews cannot become 440-item approval", () => {
  const { bundle, source, inventory, reviews } = currentRepresentativeEvidence();
  assert.match(evidenceFailures(bundle, source, inventory, reviews, "full-bank-only").join("\n"), /440 items/);
});
test("original public selection rejects changed frozen concept identity even when derived hashes are coherent", () => {
  const fixture = syntheticCandidate();
  const changed = structuredClone(fixture.bundle);
  changed.concepts[0]!.authoring_context.ko = "SYNTHETIC_DRIFT";
  const inventoryBytes = Buffer.from(JSON.stringify({ concepts: changed.concepts }));
  changed.concept_inventory_sha256 = sha256(inventoryBytes);
  const { draft_sha256, source_evidence_sha256, concept_inventory_sha256, ...payload } = changed;
  changed.draft_sha256 = sha256(JSON.stringify(payload));
  const report = learningPathV4Readiness({ ...fixture, bundle: changed, inventoryBytes, trustedSourceBinding: fixture.binding, reviews: [] });
  assert.equal(report.full_bank_ready, false);
  assert.match(report.failures.join("\n"), /frozen concept identity differs from original public selection/);
});
