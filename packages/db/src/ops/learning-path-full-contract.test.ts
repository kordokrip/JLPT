import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { N3_ITEMS, N3_CONCEPT_CUES } from "../content/learning-path-v4-2026-10-11/n3-authored.js";
import { buildLearningPathLessons, lessonStructureFailures, fullAuthoringFailures, fullSourceFailures, expectedDictionaryForms, LEARNING_PATH_CONTENT_SOURCE, ownedFactValue, ownedFactLocator, type FullBankIntake, type SourceBinding } from "./learning-path-full-contract.js";
import { sha256, type SelectedConcept } from "./learning-path-v2-contract.js";
const selected = (JSON.parse(readFileSync(new URL("../content/learning-path-v4-2026-10-11/selected-concepts.json", import.meta.url), "utf8")) as {concepts: SelectedConcept[]}).concepts;
const n3 = selected.filter(c => c.track === "jlpt-ja" && c.level === "N3").map(c => ({ ...c, cue: N3_CONCEPT_CUES[c.key]! }));
test("N3 actual authoring composes twenty two-concept/two-context lessons without full-bank approval", () => {
  const lessons = buildLearningPathLessons(n3, N3_ITEMS, "lp4");
  assert.equal(lessons.length, 20);
  assert.deepEqual(lessonStructureFailures(n3, N3_ITEMS, lessons), []);
  assert.deepEqual(lessons[0]!.concept_keys, ["lp4-jlpt-n3-vocab-1", "lp4-jlpt-n3-grammar-4"]);
  assert.match(fullAuthoringFailures(n3, N3_ITEMS, lessons).join("\n"), /440 items/);
});
test("duplicated situations, question reassignment, and missing cue cannot be frozen", () => {
  const lessons = buildLearningPathLessons(n3, N3_ITEMS, "lp4");
  lessons[10]!.question_ids = [...lessons[0]!.question_ids];
  assert.match(lessonStructureFailures(n3, N3_ITEMS, lessons).join("\n"), /context mismatch|exactly once/);
  const changed = structuredClone(N3_ITEMS); changed[1]!.context_tag = changed[0]!.context_tag;
  assert.throws(() => buildLearningPathLessons(n3, changed, "lp4"), /Two authored contexts/);
  const concepts = structuredClone(n3); concepts[0]!.cue.en = "";
  assert.match(fullAuthoringFailures(concepts, N3_ITEMS, buildLearningPathLessons(concepts, N3_ITEMS, "lp4")).join("\n"), /incomplete learning cue/);
});
test("full-source label alone cannot turn provider metadata into exact lexical evidence", () => {
  const concept = n3[0]!;
  const file = "docs/03_n3/10A_vocab_part1.md", prefix = `https://github.com/kordokrip/JLPT/blob/${LEARNING_PATH_CONTENT_SOURCE}/`;
  const binding: SourceBinding = { inventory_sha256: "b".repeat(64), owned_file_sha256: { [file]: "a".repeat(64) }, concept_owned_files: { [concept.key]: file } };
  const own = { source: { id: `owned-${sha256(file).slice(0,20)}`, url: `${prefix}${file}`, license: { id: "owned", url: `${prefix}docs/ATTRIBUTIONS.md` }, attribution: "owner", allowed_use: "language-facts-and-metadata-only", retrieved_at: "2026-10-11T00:00:00Z", sha256: "a".repeat(64) }, facts: [{ id: `${concept.key}-public-identity`, kind: "exam-structure", language: "en", value: ownedFactValue(concept), source_locator: ownedFactLocator(concept, binding.inventory_sha256) }] };
  // Synthetic provenance checks the contract only; these values are not collected source evidence.
  const intake: FullBankIntake = { scope: "full-bank-only", records: [own], content_source_sha: LEARNING_PATH_CONTENT_SOURCE, concept_inventory_sha256: binding.inventory_sha256, concept_evidence: [{ concept_key: concept.key, owned_record_id: own.source.id, owned_fact_id: own.facts[0]!.id, dictionary_record_ids: [], dictionary_check: "verified" }] };
  assert.match(fullSourceFailures([concept], intake, binding).join("\n"), /missing exact dictionary fact/);
  const dictionary = structuredClone(own); dictionary.source.id = "dictionary"; dictionary.source.url = "https://www.edrdg.org/cgi-bin/wwwjdic/wwwjdic?1ZUE"; dictionary.source.license.id = "CC-BY-SA-4.0"; dictionary.facts = [{ id: "word", kind: "lexical-form", language: "ja", value: "確認", source_locator: "exact headword" }];
  intake.records.push(dictionary); intake.concept_evidence[0]!.dictionary_record_ids.push("dictionary");
  assert.deepEqual(fullSourceFailures([concept], intake, binding), []);
  assert.match(fullSourceFailures([concept], intake).join("\n"), /trusted inventory/);
  for (const change of [
    (c:SelectedConcept) => { c.level = "N1"; },
    (c:SelectedConcept) => { c.authoring_context.kana = "different"; },
    (c:SelectedConcept) => { c.canonical_ref.version = "changed"; },
  ]) {
    const changed = structuredClone(concept); change(changed);
    assert.match(fullSourceFailures([changed], intake, binding).join("\n"), /identity\/hash/);
  }
  for (const change of [
    (i:FullBankIntake) => { i.records[0]!.source.url = "https://example.org/unrelated"; },
    (i:FullBankIntake) => { i.records[0]!.source.sha256 = "0".repeat(64); },
    (i:FullBankIntake) => { i.records[0]!.facts[0]!.value = "unrelated"; },
    (i:FullBankIntake) => { i.records[0]!.facts[0]!.source_locator += " arbitrary suffix"; },
    (i:FullBankIntake) => { i.content_source_sha = "0".repeat(40); },
    (i:FullBankIntake) => { i.concept_inventory_sha256 = "0".repeat(64); },
  ]) {
    const changed = structuredClone(intake); change(changed);
    assert.ok(fullSourceFailures([concept], changed, binding).length);
  }
  dictionary.source.url = "https://example.com/claimed-dictionary";
  assert.match(fullSourceFailures([concept], intake, binding).join("\n"), /missing exact dictionary fact/);
  dictionary.source.url = "https://www.edrdg.org/cgi-bin/wwwjdic/wwwjdic?1ZUE";
  dictionary.facts[0]!.value = "確認書";
  assert.match(fullSourceFailures([concept], intake, binding).join("\n"), /missing exact dictionary fact/);
  assert.deepEqual(expectedDictionaryForms(selected.find(c => c.key === "lp4-topik-5-vocab-b3")!), ["사회", "문제"]);
});
