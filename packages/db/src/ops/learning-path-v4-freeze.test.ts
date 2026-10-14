import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fullV4Authoring } from "./learning-path-v4-authoring.js";
import { expectedDictionaryForms, LEARNING_PATH_CONTENT_SOURCE, ownedFactLocator, ownedFactValue, type FullBankIntake } from "./learning-path-full-contract.js";
import { freezeLearningPathV4Payload, sha256, type TrustedSourceBinding } from "./learning-path-v4-freeze.js";
import { writeFrozenLearningPathV4 } from "./freeze-learning-path-v4.js";

function syntheticCompleteFixture() {
  const authored = fullV4Authoring();
  const selection = Buffer.from(`${JSON.stringify({ concepts: authored.concepts.map(({ cue, ...concept }) => concept) }, null, 2)}\n`);
  const inventorySHA = sha256(selection), file = "packages/db/src/seed/synthetic-test.ts", fileSHA = sha256("synthetic immutable owned file");
  const binding: TrustedSourceBinding = { trusted: true, content_source_sha: LEARNING_PATH_CONTENT_SOURCE, inventory_sha256: inventorySHA, owned_file_sha256: { [file]: fileSHA }, concept_owned_files: Object.fromEntries(authored.concepts.map(concept => [concept.key, file])) };
  const prefix = `https://github.com/kordokrip/JLPT/blob/${LEARNING_PATH_CONTENT_SOURCE}/`;
  const owned = { source: { id: `owned-${sha256(file).slice(0, 20)}`, url: `${prefix}${file}`, license: { id: "LicenseRef-test", url: `${prefix}docs/ATTRIBUTIONS.md` }, attribution: "synthetic test fixture", allowed_use: "language-facts-and-metadata-only", retrieved_at: "2026-10-11T00:00:00.000Z", sha256: fileSHA }, facts: authored.concepts.map(concept => ({ id: `${concept.key}-public-identity`, kind: "exam-structure", language: "en", value: ownedFactValue(concept), source_locator: ownedFactLocator(concept, inventorySHA) })) };
  const dictionary = new Map<string, { source: FullBankIntake["records"][number]["source"]; facts: FullBankIntake["records"][number]["facts"] }>();
  const evidence = authored.concepts.map(concept => {
    const forms = expectedDictionaryForms(concept), language = concept.track === "jlpt-ja" ? "ja" : "ko";
    const ids = forms.map(form => {
      const id = `dictionary-${language}-${form}`;
      if (!dictionary.has(id)) dictionary.set(id, { source: { id, url: language === "ja" ? "https://www.edrdg.org/test" : "https://krdict.korean.go.kr/test", license: { id: language === "ja" ? "CC-BY-SA-4.0" : "CC-BY-SA-2.0-KR", url: "https://example.test/license" }, attribution: "synthetic test fixture", allowed_use: "language-facts-and-metadata-only", retrieved_at: "2026-10-11T00:00:00.000Z", sha256: sha256(id) }, facts: [{ id: `${id}-fact`, kind: "lexical-form", language, value: form, source_locator: "synthetic" }] });
      return id;
    });
    return { concept_key: concept.key, owned_record_id: owned.source.id, owned_fact_id: `${concept.key}-public-identity`, dictionary_record_ids: ids, dictionary_check: forms.length ? "verified" as const : "not-applicable" as const };
  });
  const source = Buffer.from(`${JSON.stringify({ scope: "full-bank-only", records: [owned, ...dictionary.values()], concept_evidence: evidence, concept_inventory_sha256: inventorySHA, content_source_sha: LEARNING_PATH_CONTENT_SOURCE, full_bank_source_complete: true }, null, 2)}\n`);
  return { authored, selection, source, binding };
}

test("freeze payload recomputes the complete 440-item authoring and preserves raw evidence hashes", () => {
  const fixture = syntheticCompleteFixture();
  const { payload, conceptsBytes } = freezeLearningPathV4Payload({ sourceBytes: fixture.source, publicSelectionBytes: fixture.selection, trustedSourceBinding: fixture.binding, authoring: fixture.authored });
  assert.equal(payload.items.length, 440); assert.equal(payload.concepts.length, 220); assert.equal(payload.lessons.length, 220);
  assert.equal(payload.source_evidence_sha256, sha256(fixture.source));
  assert.equal(payload.concept_inventory_sha256, sha256(conceptsBytes));
  assert.equal(payload.metadata.public_selection_sha256, sha256(fixture.selection));
});

test("incomplete source, coverage, hashes, or authored count produces no payload", () => {
  const fixture = syntheticCompleteFixture();
  const incomplete = Buffer.from(fixture.source.toString().replace('"full_bank_source_complete": true', '"full_bank_source_complete": false'));
  assert.throws(() => freezeLearningPathV4Payload({ sourceBytes: incomplete, publicSelectionBytes: fixture.selection, trustedSourceBinding: fixture.binding, authoring: fixture.authored }), /complete full-bank-only/);
  const missingCoverageValue = JSON.parse(fixture.source.toString()) as FullBankIntake;
  missingCoverageValue.concept_evidence.pop();
  const missingCoverage = Buffer.from(JSON.stringify(missingCoverageValue));
  assert.throws(() => freezeLearningPathV4Payload({ sourceBytes: missingCoverage, publicSelectionBytes: fixture.selection, trustedSourceBinding: fixture.binding, authoring: fixture.authored }), /coverage mismatch/);
  const tampered = Buffer.from(`${fixture.selection.toString().trimEnd()} `);
  assert.throws(() => freezeLearningPathV4Payload({ sourceBytes: fixture.source, publicSelectionBytes: tampered, trustedSourceBinding: fixture.binding, authoring: fixture.authored }), /public selection/);
  assert.throws(() => freezeLearningPathV4Payload({ sourceBytes: fixture.source, publicSelectionBytes: fixture.selection, trustedSourceBinding: fixture.binding, authoring: { ...fixture.authored, items: fixture.authored.items.slice(1) } }), /440 items/);
});

test("writer creates a fresh cohort only after validation and never overwrites it", () => {
  const fixture = syntheticCompleteFixture(), directory = mkdtempSync(join(tmpdir(), "lp4-freeze-"));
  const target = join(directory, "frozen-cohort-01");
  const payload = writeFrozenLearningPathV4(target, fixture.source, fixture.selection, fixture.binding);
  assert.equal(readFileSync(join(target, "source.json"), "utf8"), fixture.source.toString());
  assert.equal(payload.version, "lp4-2026-10-11");
  assert.throws(() => writeFrozenLearningPathV4(target, fixture.source, fixture.selection, fixture.binding), /already exists/);
  const blocked = join(directory, "blocked-cohort");
  const incomplete = Buffer.from(fixture.source.toString().replace('"full_bank_source_complete": true', '"full_bank_source_complete": false'));
  assert.throws(() => writeFrozenLearningPathV4(blocked, incomplete, fixture.selection, fixture.binding));
  assert.equal(existsSync(blocked), false);
});
test("freeze compares full public concept identity, not only matching concept keys", () => {
  const fixture = syntheticCompleteFixture();
  const authoring = structuredClone(fixture.authored);
  authoring.concepts[0]!.authoring_context.ko = "SYNTHETIC_DRIFT";
  assert.throws(() => freezeLearningPathV4Payload({ sourceBytes: fixture.source, publicSelectionBytes: fixture.selection, trustedSourceBinding: fixture.binding, authoring }), /public selection/);
});
test("v5 version label cannot repackage unchanged v4 identifiers or lack source revision",()=>{
  const fixture=syntheticCompleteFixture();
  assert.throws(()=>freezeLearningPathV4Payload({sourceBytes:fixture.source,publicSelectionBytes:fixture.selection,trustedSourceBinding:fixture.binding,authoring:fixture.authored,revision:{version:"lp5-2026-10-11",bundle:"learning-path-v5-2026-10-11"}}),/revision version and item\/lesson identifiers disagree/);
  const newIds=structuredClone(fixture.authored);
  newIds.items.forEach(item=>{item.id=item.id.replace(/^lp4-/u,"lp5-");});
  newIds.lessons.forEach(lesson=>{lesson.id=lesson.id.replace(/^lp4-/u,"lp5-");lesson.question_ids=lesson.question_ids.map(id=>id.replace(/^lp4-/u,"lp5-")) as [string,string];});
  assert.throws(()=>freezeLearningPathV4Payload({sourceBytes:fixture.source,publicSelectionBytes:fixture.selection,trustedSourceBinding:fixture.binding,authoring:newIds,revision:{version:"lp5-2026-10-11",bundle:"learning-path-v5-2026-10-11"}}),/v5 source revision/);
});
