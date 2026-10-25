// 강성호 2026-10-11: 기존 실패 초안을 보존하고 운영의 공개 개념만 읽어 새 버전의 집필 기준선을 고정한다.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { publishedOwnerItem } from "../../../../apps/api/src/lib/owner-publication.js";
import { CONCEPTS as OLD } from "../content/learning-path-2026-10-11/concept-specs.js";

const replacements: Record<string, readonly string[]> = {
  "N5:grammar": ["~は ~です", "~を", "시간 + に", "장소 + で", "ません"],
  "N4:vocab": ["予定", "連絡", "準備する", "必要", "約束"],
  "N4:grammar": ["~ながら", "~てしまう", "~なければならない / ~なければいけない", "~ようになる", "~かもしれない"],
  "N4:kanji": ["春", "夏", "秋", "冬", "院"],
  "N3:vocab": ["確認", "変更", "影響", "相談", "状況"],
  "N3:grammar": ["~わけではない", "~ことになっている", "~おかげで", "~ようにする", "~に対して"],
  "N3:kanji": ["確", "認", "議", "報", "連"],
  "N2:kanji": ["基", "準", "測", "査", "構"],
  "N1:vocab": ["論拠", "脈絡", "妥当", "乖離", "是正"],
  "N1:kanji": ["顕", "遂", "衡", "遵", "慮"],
};
const columns = {
  vocab: ["vocab", "ja", "level"], grammar: ["grammar", "pattern", "level"],
  kanji: ["kanji", "char", "jlpt_level"], sentence: ["sentences", "ja", "level"],
  "topik-owner-item": ["topik_owner_authored_curriculum_items", "id", "target_grade"],
} as const;
const quote = (s: string) => "'" + s.replaceAll("'", "''") + "'";
const positions = new Map<string, number>();
const selected = OLD.map((concept) => {
  const group = `${concept.level}:${concept.section}`, position = positions.get(group) ?? 0;
  positions.set(group, position + 1);
  return { key: `lp2-${concept.key}`, track: concept.track, level: concept.level, section: concept.section,
    lookup: { ...concept.lookup, value: replacements[group]?.[position] ?? concept.lookup.value } };
});
const sql = selected.map((concept) => {
  const [table, column, level] = columns[concept.lookup.type];
  const publication = concept.track === "topik-ko" ? ` AND ${publishedOwnerItem("i")}` : "";
  const title = concept.track === "topik-ko"
    ? ", u.title_ko, u.title_ja, u.title_en" : "";
  const join = concept.track === "topik-ko"
    ? " JOIN topik_owner_authored_curriculum_units u ON u.id=i.unit_id" : "";
  return `SELECT i.*${title} FROM ${table} i${join} WHERE i.${column}=${quote(concept.lookup.value)} AND i.${level}=${quote(concept.level)}${publication} ORDER BY i.id;`;
});
const output = new URL("../../../../.artifacts/learning-path-v2-2026-10-11/public-concept-baseline.json", import.meta.url);
if (existsSync(output)) throw new Error("Baseline exists; preserve it and create a new snapshot version");
const result = spawnSync("pnpm", ["exec", "wrangler", "d1", "execute", "nihongo-n3-prod-v2", "--remote", "--config", "apps/api/wrangler.toml", "--command", sql.join("\n"), "--json"], {
  cwd: new URL("../../../../", import.meta.url), encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, WRANGLER_WRITE_LOGS: "0" },
});
// Do not print Wrangler errors that may contain account/database identifiers.
if (result.status !== 0) throw new Error(`Read-only concept capture failed (exit ${result.status}); no baseline or content written`);
const results = JSON.parse(result.stdout) as Array<{ success: boolean; results: Record<string, unknown>[]; meta: { rows_written?: number; changed_db?: boolean } }>;
if (results.length !== selected.length || results.some((r) => !r.success || (r.meta.rows_written ?? 0) !== 0 || r.meta.changed_db === true))
  throw new Error("Unexpected query result or remote mutation");
const unresolved = selected.filter((_, index) => !results[index]!.results.length);
if (unresolved.length) throw new Error(`Missing public strict-level concepts: ${unresolved.map((c) => c.key + ":" + c.lookup.value).join(", ")}`);
const concepts = selected.map((concept, index) => ({ ...concept, candidates: results[index]!.results }));
const content = { schema_version: "learning-path-public-concepts-v2", captured_at: new Date().toISOString(),
  environment: "production-read-only", content_source_sha: "3485c6ef8addda3cd3e209730646c296175cf3c9", rows_written: 0,
  concepts, counts: Object.fromEntries([...new Set(selected.map(c => `${c.track}/${c.level}`))].map(key => [key, selected.filter(c => `${c.track}/${c.level}` === key).length])) };
const bytes = JSON.stringify(content, null, 2) + "\n";
mkdirSync(new URL(".", output), { recursive: true }); writeFileSync(output, bytes);
console.log(JSON.stringify({ public_concepts: concepts.length, counts: content.counts, lookup_failures: 0, rows_written: 0,
  sha256: createHash("sha256").update(bytes).digest("hex") }));
