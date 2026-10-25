// 강성호 2026-10-11: 새 출처 후보에 실제 공개 개념과 exact 사전 사실의 coverage를 기록한다. 부족하면 동결/검수/공개를 차단한다.
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { immutableLearningContentPlan } from "./immutable-learning-content-plan.js";
import { REPO_ROOT } from "../seed/constants.js";
import { resolveSelectedConcept, sha256, type SelectedConcept } from "./learning-path-v2-contract.js";
import { expectedDictionaryForms, fullSourceFailures, LEARNING_PATH_CONTENT_SOURCE, ownedFactValue, ownedFactLocator, type FullBankIntake, type SourceRecord } from "./learning-path-full-contract.js";
const directory = new URL("../content/learning-path-v4-2026-10-11/", import.meta.url);
const option = (name: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const output = option("output") ?? new URL("../../../../.artifacts/learning-path-v4-2026-10-11/source-candidate-01.json", import.meta.url);
if (existsSync(output)) throw new Error("Source candidate already recorded; use a new candidate number rather than overwrite evidence");
const inventory = readFileSync(new URL("selected-concepts.json", directory));
const concepts = (JSON.parse(inventory.toString()) as { concepts: SelectedConcept[] }).concepts;
const edrdgBytes = readFileSync(new URL("edrdg-facts.json", directory));
const previousBytes = readFileSync(new URL("../learning-path-source-intake-2026-10-11-v2.json", directory));
const previous = JSON.parse(previousBytes.toString()) as { records: SourceRecord[] };
const records = (JSON.parse(edrdgBytes.toString()) as { records: SourceRecord[] }).records;
records.push(...previous.records.filter(r => r.source.id.startsWith("krdict-") || r.source.id === "sejong-curriculum-metadata"));
const additionalPath = option("krdict-facts");
const additionalBytes = additionalPath ? readFileSync(additionalPath) : undefined;
if (additionalBytes) {
  const additional = (JSON.parse(additionalBytes.toString()) as {records:SourceRecord[]}).records;
  if (!additional.length || additional.some(r => new URL(r.source.url).hostname !== "krdict.korean.go.kr")) throw new Error("Additional dictionary records must be exact KRdict acquisition evidence");
  for (const record of additional) {
    const prior = records.findIndex(r => r.source.id === record.source.id);
    if (prior >= 0) records.splice(prior, 1, record); else records.push(record);
  }
}
const sourceSHA = LEARNING_PATH_CONTENT_SOURCE, acquired = new Date().toISOString();
const owned = new Map<string, SourceRecord>();
const bodies = new Map<string, Buffer>();
const gitBytes = (file: string) => {
  if (!bodies.has(file)) {
    const child = spawnSync("git", ["show", `${sourceSHA}:${file}`], { cwd: REPO_ROOT, maxBuffer: 4 * 1024 * 1024 });
    if (child.status !== 0) throw new Error(`Immutable owned source unavailable: ${file}`);
    bodies.set(file, child.stdout);
  }
  return bodies.get(file)!;
};
const db = new DatabaseSync(":memory:");
try {
  const migrations = new URL("../../drizzle-v2/", import.meta.url);
  for (const name of readdirSync(migrations).filter(name => /^00\d\d_.*\.sql$/.test(name)).sort()) db.exec(readFileSync(new URL(name, migrations), "utf8").replaceAll("--> statement-breakpoint", ""));
  const plan = immutableLearningContentPlan(); db.exec(plan.statements.join("\n"));
  const evidence: FullBankIntake["concept_evidence"] = [];
  const conceptFiles: Record<string, string> = {};
  for (const concept of concepts) {
    const ref = resolveSelectedConcept(db, concept);
    let file: string, license: string;
    if (concept.track === "topik-ko") {
      const batch = concept.key.match(/-b([1-4])$/)?.[1];
      if (!batch) throw new Error(`Unexpected owner source: ${concept.key}`);
      file = `packages/db/src/seed/topik-owner-curriculum-batch${batch}.ts`; license = "LicenseRef-nihongo-n3-self-authored";
    } else {
      const tables = { vocab: "vocab", grammar: "grammar", sentence: "sentences" } as const;
      if (concept.lookup.type === "kanji") {
        const entry = plan.manifest.entries.find(e => (e.selector.kind === "level" && e.selector.value === concept.level && e.table === "kanji" || e.filePath.includes(`/${concept.level === "N2" ? "05_n2" : "06_n1"}/`)) && gitBytes(e.filePath).toString().includes(concept.lookup.value));
        if (!entry) throw new Error(`Exact owned kanji file unavailable: ${concept.key}`);
        file = entry.filePath; license = entry.provenance.license.id;
      } else if (concept.lookup.type in tables) {
        const table = tables[concept.lookup.type as keyof typeof tables];
        const row = db.prepare(`SELECT s.file_path FROM sources s JOIN ${table} i ON i.source_id=s.id WHERE i.id=?`).get(ref.id) as { file_path: string };
        const entry = plan.manifest.entries.find(e => e.filePath === row.file_path);
        if (!entry) throw new Error(`Owned source manifest unavailable: ${concept.key}`);
        file = entry.filePath; license = entry.provenance.license.id;
      } else throw new Error(`Unsupported canonical source: ${concept.key}`);
    }
    conceptFiles[concept.key] = file;
    const bytes = gitBytes(file), ownedID = `owned-${sha256(file).slice(0, 20)}`;
    if (!owned.has(ownedID)) owned.set(ownedID, { source: { id: ownedID, url: `https://github.com/kordokrip/JLPT/blob/${sourceSHA}/${file}`,
      license: { id: license, url: `https://github.com/kordokrip/JLPT/blob/${sourceSHA}/docs/ATTRIBUTIONS.md` },
      attribution: "JLPT project repository-owned public canonical metadata; not an official examination level list",
      allowed_use: "language-facts-and-metadata-only", retrieved_at: acquired, sha256: sha256(bytes) }, facts: [] });
    const factID = `${concept.key}-public-identity`;
    owned.get(ownedID)!.facts.push({ id: factID, kind: "exam-structure", language: "en",
      value: ownedFactValue(concept), source_locator: ownedFactLocator(concept, sha256(inventory)) });
    const forms = expectedDictionaryForms(concept), language = concept.track === "jlpt-ja" ? "ja" : "ko";
    const matches = records.filter(record => record.facts.some(fact => fact.kind === "lexical-form" && fact.language === language && forms.includes(fact.value)));
    const complete = forms.every(form => matches.some(record => record.facts.some(f => f.kind === "lexical-form" && f.language === language && f.value === form)));
    evidence.push({ concept_key: concept.key, owned_record_id: ownedID, owned_fact_id: factID, dictionary_record_ids: matches.map(r => r.source.id), dictionary_check: !forms.length ? "not-applicable" : complete ? "verified" : "missing" });
  }
  records.push(...owned.values());
  const intake: FullBankIntake = { scope: "full-bank-only", records, concept_evidence: evidence, concept_inventory_sha256: sha256(inventory), content_source_sha: sourceSHA };
  const failures = fullSourceFailures(concepts, intake, { inventory_sha256: sha256(inventory), owned_file_sha256: Object.fromEntries([...bodies].map(([file, bytes]) => [file, sha256(bytes)])), concept_owned_files: conceptFiles });
  const result = { ...intake, schema_version: "learning-path-full-source-candidate-v4", created_at: acquired,
    state: failures.length ? "blocked-source-incomplete" : "source-complete-awaiting-independent-review",
    full_bank_ready: false, full_bank_source_complete: failures.length === 0, failures,
    reused_input_sha256: sha256(previousBytes), fresh_edrdg_sha256: sha256(edrdgBytes), original_retrieval_times_preserved: true,
    ...(additionalBytes ? {additional_krdict_acquisition_sha256:sha256(additionalBytes)} : {}),
    note: additionalBytes
      ? "Additional exact KRdict entry evidence is supplied separately with its declared hash basis and retrieval transport; verified-fact projections are not raw HTTP response hashes. Existing records retain original hashes/times. Missing headwords are never inferred from owned content or unrelated dictionary entries."
      : "Current EDRDG and KRdict policies were separately read on their official pages. Native KRdict acquisition failed; existing dictionary records retain original hashes/times. Missing headwords are never inferred from owned content or unrelated dictionary entries.",
    canonical_lookup_failures: 0, remote_writes: 0 };
  if (output instanceof URL) mkdirSync(new URL(".", output), { recursive: true });
  writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ records: records.length, concepts: evidence.length, missing_dictionary_concepts: evidence.filter(e => e.dictionary_check === "missing").map(e => e.concept_key), source_failures: failures, source_candidate_sha256: sha256(readFileSync(output)), full_bank_source_complete: result.full_bank_source_complete, independent_review_approvals: 0, remote_writes: 0 }));
  if (failures.length) process.exitCode = 1;
} finally { db.close(); }
