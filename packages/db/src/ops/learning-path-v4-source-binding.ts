// 강성호 2026-10-11: intake의 주장 대신 고정 Git 원본과 정확 급수 DB 조회로 동결 출처 바인딩을 재구성한다.
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { immutableLearningContentPlan } from "./immutable-learning-content-plan.js";
import { REPO_ROOT } from "../seed/constants.js";
import { resolveSelectedConcept, sha256, type SelectedConcept } from "./learning-path-v2-contract.js";
import { LEARNING_PATH_CONTENT_SOURCE } from "./learning-path-full-contract.js";
import type { TrustedSourceBinding } from "./learning-path-v4-freeze.js";

export function resolveLearningPathV4SourceBinding(publicSelectionBytes: Buffer): TrustedSourceBinding {
  const { concepts } = JSON.parse(publicSelectionBytes.toString("utf8")) as { concepts: SelectedConcept[] };
  if (concepts.length !== 220 || new Set(concepts.map(c => c.key)).size !== 220) throw new Error("Exactly 220 distinct public concepts required");
  const bodies = new Map<string, Buffer>();
  const gitBytes = (file: string) => {
    if (!bodies.has(file)) {
      const child = spawnSync("git", ["show", `${LEARNING_PATH_CONTENT_SOURCE}:${file}`], { cwd: REPO_ROOT, maxBuffer: 4 * 1024 * 1024 });
      if (child.status !== 0) throw new Error(`Immutable owned source unavailable: ${file}`);
      bodies.set(file, child.stdout);
    }
    return bodies.get(file)!;
  };
  const db = new DatabaseSync(":memory:");
  try {
    const migrations = new URL("../../drizzle-v2/", import.meta.url);
    for (const name of readdirSync(migrations).filter(n => /^00\d\d_.*\.sql$/.test(n)).sort()) db.exec(readFileSync(new URL(name, migrations), "utf8").replaceAll("--> statement-breakpoint", ""));
    const plan = immutableLearningContentPlan();
    db.exec(plan.statements.join("\n"));
    const conceptFiles: Record<string, string> = {};
    for (const concept of concepts) {
      const ref = resolveSelectedConcept(db, concept);
      let file: string;
      if (concept.track === "topik-ko") {
        const batch = concept.key.match(/-b([1-4])$/)?.[1];
        if (!batch) throw new Error(`Unexpected owner source: ${concept.key}`);
        file = `packages/db/src/seed/topik-owner-curriculum-batch${batch}.ts`;
      } else if (concept.lookup.type === "kanji") {
        const entry = plan.manifest.entries.find(e => (e.selector.kind === "level" && e.selector.value === concept.level && e.table === "kanji" || e.filePath.includes(`/${concept.level === "N2" ? "05_n2" : "06_n1"}/`)) && gitBytes(e.filePath).toString().includes(concept.lookup.value));
        if (!entry) throw new Error(`Exact owned kanji file unavailable: ${concept.key}`);
        file = entry.filePath;
      } else {
        const tables = { vocab: "vocab", grammar: "grammar", sentence: "sentences" } as const;
        if (!(concept.lookup.type in tables)) throw new Error(`Unsupported canonical source: ${concept.key}`);
        const table = tables[concept.lookup.type as keyof typeof tables];
        const row = db.prepare(`SELECT s.file_path FROM sources s JOIN ${table} i ON i.source_id=s.id WHERE i.id=?`).get(ref.id) as { file_path: string } | undefined;
        if (!row || !plan.manifest.entries.some(e => e.filePath === row.file_path)) throw new Error(`Owned source manifest unavailable: ${concept.key}`);
        file = row.file_path;
      }
      conceptFiles[concept.key] = file;
      gitBytes(file);
    }
    return { trusted: true, content_source_sha: LEARNING_PATH_CONTENT_SOURCE, inventory_sha256: sha256(publicSelectionBytes),
      owned_file_sha256: Object.fromEntries([...bodies].map(([file, bytes]) => [file, sha256(bytes)])), concept_owned_files: conceptFiles };
  } finally { db.close(); }
}
