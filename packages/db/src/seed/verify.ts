import fs from "node:fs";
import path from "node:path";

import {
  buildContentSeedPlan,
  CONTENT_MANIFEST_SCHEMA_VERSION,
  hasCompleteProvenance,
  SEEDED_SOURCE_COUNT,
  type ContentManifest,
  type ContentManifestEntry,
} from "./content-manifest.js";
import {
  argValue,
  countSql,
  countSqlBatch,
  parseD1Target,
  querySql,
} from "./d1-cli.js";
import { REPO_ROOT } from "./constants.js";

interface VerificationCheck {
  name: string;
  expected: number | string;
  actual: number | string;
  passed: boolean;
  blocking: boolean;
}

interface SeedRunRow extends Record<string, unknown> {
  id: number;
  run_id: string;
  content_version: string;
  parser_version: string;
  manifest_sha256: string;
  generated_at: string;
}

interface SeedSourceRow extends Record<string, unknown> {
  source_code: string;
  source_checksum: string;
  parser_version: string;
  provenance_json: string;
}

interface SourceVersionRow extends Record<string, unknown> {
  code: string;
  version: string;
}

interface NumericSqlCheck {
  name: string;
  expected: number;
  sql: string;
  blocking: boolean;
}

const target = parseD1Target();
const manifestPath = path.resolve(
  argValue("--manifest") ??
    path.join(REPO_ROOT, ".artifacts/db/content-manifest.json"),
);
const reportPath = path.resolve(
  argValue("--report") ??
    path.join(REPO_ROOT, ".artifacts/db/verification-report.json"),
);
const currentManifest = buildContentSeedPlan().manifest;
const seededManifest = readManifest(manifestPath);
const checks: VerificationCheck[] = [];
const numericSqlChecks: NumericSqlCheck[] = [];
const requireAudio = process.argv.includes("--require-audio");

function readManifest(filePath: string): ContentManifest {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Seed manifest is missing: ${filePath}. Run seed before verify.`,
    );
  }
  const manifest = JSON.parse(
    fs.readFileSync(filePath, "utf8"),
  ) as ContentManifest;
  assertManifest(manifest, filePath);
  return manifest;
}

function assertManifest(manifest: ContentManifest, label: string): void {
  if (manifest.schemaVersion !== CONTENT_MANIFEST_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported content manifest schema in ${label}: ${String(manifest.schemaVersion)}`,
    );
  }
  if (manifest.entries.length !== SEEDED_SOURCE_COUNT) {
    throw new Error(
      `Content manifest source count mismatch in ${label}: ${manifest.entries.length}`,
    );
  }
  if (
    !manifest.contentVersion ||
    !manifest.parserVersion ||
    !manifest.manifestSha256 ||
    !manifest.seedRunId
  ) {
    throw new Error(`Content manifest identity is incomplete in ${label}`);
  }
  if (
    manifest.entries.some((entry) => !hasCompleteProvenance(entry.provenance))
  ) {
    throw new Error(`Content manifest provenance is incomplete in ${label}`);
  }
  if (manifest.derivedContent?.homophonePairs.expectedRows < 30) {
    throw new Error(
      `Content manifest homophone release set is incomplete in ${label}`,
    );
  }
}

function addCheck(
  name: string,
  expected: number | string,
  actual: number | string,
  blocking = true,
): void {
  checks.push({
    name,
    expected,
    actual,
    passed: expected === actual,
    blocking,
  });
}

function addMinimumCheck(
  name: string,
  minimum: number,
  actual: number,
  blocking = true,
): void {
  checks.push({
    name,
    expected: `>=${minimum}`,
    actual,
    passed: actual >= minimum,
    blocking,
  });
}

function addNumericSqlCheck(
  name: string,
  expected: number,
  sql: string,
  blocking = true,
): void {
  numericSqlChecks.push({ name, expected, sql, blocking });
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function rowCountSql(entry: ContentManifestEntry): string {
  if (entry.selector.kind === "source") {
    return `SELECT count(*) AS count FROM ${entry.table} WHERE source_id = (SELECT id FROM sources WHERE code = ${sqlLiteral(entry.selector.value)})`;
  }
  if (entry.selector.kind === "level") {
    const column = entry.table === "kanji" ? "jlpt_level" : "level";
    return `SELECT count(*) AS count FROM ${entry.table} WHERE ${column} = ${sqlLiteral(entry.selector.value)}`;
  }
  return `SELECT count(*) AS count FROM ${entry.table}`;
}

function compareManifests(
  expected: ContentManifest,
  actual: ContentManifest,
): void {
  addCheck(
    "manifest:schema-version",
    expected.schemaVersion,
    actual.schemaVersion,
  );
  addCheck(
    "manifest:content-version",
    expected.contentVersion,
    actual.contentVersion,
  );
  addCheck(
    "manifest:parser-version",
    expected.parserVersion,
    actual.parserVersion,
  );
  addCheck("manifest:sha256", expected.manifestSha256, actual.manifestSha256);
  addCheck(
    "manifest:seeded-source-count",
    expected.entries.length,
    actual.entries.length,
  );

  const actualEntries = new Map(
    actual.entries.map((entry) => [entry.sourceCode, entry]),
  );
  for (const entry of expected.entries) {
    const seeded = actualEntries.get(entry.sourceCode);
    addCheck(
      `manifest:${entry.sourceCode}:present`,
      "yes",
      seeded ? "yes" : "no",
    );
    if (!seeded) continue;
    addCheck(
      `manifest:${entry.sourceCode}:sha256`,
      entry.sha256,
      seeded.sha256,
    );
    addCheck(
      `manifest:${entry.sourceCode}:source-version`,
      entry.sourceVersion,
      seeded.sourceVersion,
    );
    addCheck(
      `manifest:${entry.sourceCode}:parser-version`,
      entry.parserVersion,
      seeded.parserVersion,
    );
    addCheck(
      `manifest:${entry.sourceCode}:provenance`,
      JSON.stringify(entry.provenance),
      JSON.stringify(seeded.provenance),
    );
    addCheck(
      `manifest:${entry.sourceCode}:rows`,
      entry.expectedRows,
      seeded.expectedRows,
    );
    addCheck(
      `manifest:${entry.sourceCode}:categories`,
      entry.expectedCategories,
      seeded.expectedCategories,
    );
  }

  const expectedHomophones = expected.derivedContent.homophonePairs;
  const actualHomophones = actual.derivedContent.homophonePairs;
  addCheck(
    "manifest:homophones:sha256",
    expectedHomophones.sha256,
    actualHomophones.sha256,
  );
  addCheck(
    "manifest:homophones:parser-version",
    expectedHomophones.parserVersion,
    actualHomophones.parserVersion,
  );
  addCheck(
    "manifest:homophones:rows",
    expectedHomophones.expectedRows,
    actualHomophones.expectedRows,
  );
  addCheck(
    "manifest:homophones:accent-source",
    expectedHomophones.accentSource,
    actualHomophones.accentSource,
  );
  addCheck(
    "manifest:homophones:reviewer",
    expectedHomophones.reviewer,
    actualHomophones.reviewer,
  );
  addCheck(
    "manifest:homophones:reviewed-at",
    expectedHomophones.reviewedAt,
    actualHomophones.reviewedAt,
  );
}

function verifySeedRunLedger(manifest: ContentManifest): void {
  const seedRuns = querySql<SeedRunRow>(
    target,
    `SELECT id, run_id, content_version, parser_version, manifest_sha256, generated_at
     FROM content_seed_runs WHERE run_id = ${sqlLiteral(manifest.seedRunId)}`,
  );
  addCheck("seed-run:recorded", 1, seedRuns.length);
  const seedRun = seedRuns[0];
  if (!seedRun) return;

  addCheck(
    "seed-run:content-version",
    manifest.contentVersion,
    seedRun.content_version,
  );
  addCheck(
    "seed-run:parser-version",
    manifest.parserVersion,
    seedRun.parser_version,
  );
  addCheck(
    "seed-run:manifest-sha256",
    manifest.manifestSha256,
    seedRun.manifest_sha256,
  );
  addCheck("seed-run:generated-at", manifest.generatedAt, seedRun.generated_at);

  const sourceRows = querySql<SeedSourceRow>(
    target,
    `SELECT source_code, source_checksum, parser_version, provenance_json
     FROM content_seed_sources WHERE seed_run_id = ${seedRun.id}`,
  );
  addCheck(
    "seed-run:source-record-count",
    SEEDED_SOURCE_COUNT + 1,
    sourceRows.length,
  );
  const sources = new Map(sourceRows.map((row) => [row.source_code, row]));

  for (const entry of manifest.entries) {
    const source = sources.get(entry.sourceCode);
    addCheck(
      `seed-run:${entry.sourceCode}:recorded`,
      "yes",
      source ? "yes" : "no",
    );
    if (!source) continue;
    addCheck(
      `seed-run:${entry.sourceCode}:checksum`,
      entry.sha256,
      source.source_checksum,
    );
    addCheck(
      `seed-run:${entry.sourceCode}:parser-version`,
      entry.parserVersion,
      source.parser_version,
    );
    addCheck(
      `seed-run:${entry.sourceCode}:provenance`,
      JSON.stringify(entry.provenance),
      source.provenance_json,
    );
  }

  const homophones = sources.get("derived:homophone_pairs");
  addCheck("seed-run:homophones:recorded", "yes", homophones ? "yes" : "no");
  if (homophones) {
    addCheck(
      "seed-run:homophones:checksum",
      manifest.derivedContent.homophonePairs.sha256,
      homophones.source_checksum,
    );
    addCheck(
      "seed-run:homophones:parser-version",
      manifest.derivedContent.homophonePairs.parserVersion,
      homophones.parser_version,
    );
  }
}

function verifyHomophoneRelease(manifest: ContentManifest): void {
  const reviewedPairs = countSql(
    target,
    `SELECT count(*) AS count
     FROM homophone_pairs hp
     JOIN vocab va ON va.id = hp.word_a_id
     JOIN vocab vb ON vb.id = hp.word_b_id
     JOIN sources sa ON sa.code = hp.word_a_source_code
     JOIN sources sb ON sb.code = hp.word_b_source_code
     WHERE trim(COALESCE(hp.note_ko, '')) <> ''
       AND trim(hp.accent_source) <> ''
       AND trim(hp.accent_source_url) <> ''
       AND trim(hp.accent_a) <> ''
       AND trim(hp.accent_b) <> ''
       AND trim(hp.example_a_ja) <> ''
       AND trim(hp.example_a_ko) <> ''
       AND trim(hp.example_b_ja) <> ''
       AND trim(hp.example_b_ko) <> ''
       AND trim(hp.reviewer) <> ''
       AND trim(hp.reviewed_at) <> ''
       AND va.kana = vb.kana
       AND va.source_id = sa.id
       AND vb.source_id = sb.id`,
  );
  addMinimumCheck(
    "homophone_pairs:reviewed-release-minimum",
    manifest.derivedContent.homophonePairs.expectedRows,
    reviewedPairs,
  );

  const homophoneChecks: Array<[string, string]> = [
    [
      "homophone_pairs incomplete reviewed records",
      `SELECT count(*) AS count
      FROM homophone_pairs
      WHERE trim(COALESCE(note_ko, '')) <> '' AND (
        trim(accent_source) = '' OR trim(accent_source_url) = '' OR
        trim(accent_a) = '' OR trim(accent_b) = '' OR
        trim(example_a_ja) = '' OR trim(example_a_ko) = '' OR
        trim(example_b_ja) = '' OR trim(example_b_ko) = '' OR
        trim(reviewer) = '' OR trim(reviewed_at) = ''
      )`,
    ],
    [
      "homophone_pairs reading mismatches",
      `SELECT count(*) AS count
      FROM homophone_pairs hp
      JOIN vocab va ON va.id = hp.word_a_id
      JOIN vocab vb ON vb.id = hp.word_b_id
      WHERE trim(hp.reviewer) <> '' AND va.kana <> vb.kana`,
    ],
    [
      "homophone_pairs source mapping mismatches",
      `SELECT count(*) AS count
      FROM homophone_pairs hp
      JOIN vocab va ON va.id = hp.word_a_id
      JOIN vocab vb ON vb.id = hp.word_b_id
      LEFT JOIN sources sa ON sa.code = hp.word_a_source_code
      LEFT JOIN sources sb ON sb.code = hp.word_b_source_code
      WHERE trim(hp.reviewer) <> '' AND (
        sa.id IS NULL OR sb.id IS NULL OR va.source_id <> sa.id OR vb.source_id <> sb.id
      )`,
    ],
    [
      "homophone_pairs unordered duplicates",
      `SELECT count(*) AS count FROM (
      SELECT min(word_a_id, word_b_id) AS low_id, max(word_a_id, word_b_id) AS high_id
      FROM homophone_pairs
      GROUP BY low_id, high_id
      HAVING count(*) > 1
    )`,
    ],
  ];
  for (const [name, sql] of homophoneChecks)
    addCheck(name, 0, countSql(target, sql));
}

assertManifest(currentManifest, "current source tree");
console.log(
  `\nD1 verification (${target.remote ? "remote" : "local"}, database=${target.database})\n`,
);
compareManifests(currentManifest, seededManifest);

const sourceVersions = new Map(
  querySql<SourceVersionRow>(
    target,
    `SELECT code, version FROM sources WHERE code IN (${currentManifest.entries.map((entry) => sqlLiteral(entry.sourceCode)).join(", ")})`,
  ).map((row) => [row.code, row.version]),
);

for (const entry of currentManifest.entries) {
  addCheck(
    `source:${entry.sourceCode}:version`,
    entry.sourceVersion,
    sourceVersions.get(entry.sourceCode) ?? "missing",
  );
  addNumericSqlCheck(
    `rows:${entry.sourceCode}:${entry.table}`,
    entry.expectedRows,
    rowCountSql(entry),
  );
  if (entry.expectedCategories > 0) {
    addNumericSqlCheck(
      `categories:${entry.sourceCode}`,
      entry.expectedCategories,
      `SELECT count(*) AS count FROM categories WHERE source_id = (SELECT id FROM sources WHERE code = ${sqlLiteral(entry.sourceCode)})`,
    );
  }
}

verifySeedRunLedger(seededManifest);
verifyHomophoneRelease(seededManifest);

for (const [ftsTable, sourceTable] of [
  ["vocab_fts", "vocab"],
  ["sentences_fts", "sentences"],
] as const) {
  addNumericSqlCheck(
    `fts:${ftsTable}:exists`,
    1,
    `SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ${sqlLiteral(ftsTable)}`,
  );
  addNumericSqlCheck(
    `fts:${ftsTable}:parity`,
    0,
    `SELECT abs((SELECT count(*) FROM ${sourceTable}) - (SELECT count(*) FROM ${ftsTable})) AS count`,
  );
}

const requiredFieldChecks: Array<[string, string]> = [
  [
    "vocab required fields",
    "SELECT count(*) AS count FROM vocab WHERE trim(ja) = '' OR trim(kana) = '' OR trim(ko) = ''",
  ],
  [
    "grammar required fields",
    "SELECT count(*) AS count FROM grammar WHERE trim(pattern) = '' OR trim(meaning_ko) = ''",
  ],
  [
    "kanji required fields",
    "SELECT count(*) AS count FROM kanji WHERE trim(char) = '' OR trim(meaning_ko) = ''",
  ],
  [
    "sentences required fields",
    "SELECT count(*) AS count FROM sentences WHERE trim(ja) = '' OR trim(ko) = ''",
  ],
  [
    "sysprog required fields",
    "SELECT count(*) AS count FROM sysprog_terms WHERE trim(ja) = '' OR trim(ko) = ''",
  ],
  [
    "vocab duplicates",
    "SELECT count(*) AS count FROM (SELECT level, ja, kana FROM vocab GROUP BY level, ja, kana HAVING count(*) > 1)",
  ],
  [
    "grammar duplicates",
    "SELECT count(*) AS count FROM (SELECT level, pattern FROM grammar GROUP BY level, pattern HAVING count(*) > 1)",
  ],
  [
    "sentence duplicates",
    "SELECT count(*) AS count FROM (SELECT source_id, level, register, seq_no FROM sentences GROUP BY source_id, level, register, seq_no HAVING count(*) > 1)",
  ],
];
for (const [name, sql] of requiredFieldChecks) {
  addNumericSqlCheck(name, 0, sql);
}

addNumericSqlCheck(
  "foreign_key_check",
  0,
  "SELECT count(*) AS count FROM pragma_foreign_key_check",
);

function invalidImmutableAudioKey(
  itemType: string,
  levelColumn: string,
): string {
  const prefix = `'audio/${itemType}/' || lower(${levelColumn}) || '/' || id || '-'`;
  return `(
    audio_r2_key IS NULL
    OR audio_r2_key NOT LIKE ${prefix} || '%.mp3'
    OR length(audio_r2_key) <> length(${prefix}) + 20
    OR substr(audio_r2_key, length(${prefix}) + 1, 16) GLOB '*[^0-9a-f]*'
  )`;
}

addNumericSqlCheck(
  "audio_r2_key missing/non-immutable (R2 gate)",
  0,
  `SELECT
     (SELECT count(*) FROM vocab
      WHERE level IN ('N5', 'N4', 'N3')
        AND ${invalidImmutableAudioKey("vocab", "level")})
     +
     (SELECT count(*) FROM kanji
      WHERE jlpt_level IN ('N5', 'N4', 'N3')
        AND ${invalidImmutableAudioKey("kanji", "jlpt_level")})
     +
     (SELECT count(*) FROM sentences
     WHERE level IN ('N5', 'N4', 'N3')
        AND ${invalidImmutableAudioKey("sentence", "level")})
     AS count`,
  requireAudio,
);

const numericActuals = countSqlBatch(
  target,
  numericSqlChecks.map((check) => check.sql),
);
for (const [index, check] of numericSqlChecks.entries()) {
  addCheck(
    check.name,
    check.expected,
    numericActuals[index] ?? Number.NaN,
    check.blocking,
  );
}

for (const check of checks) {
  const icon = check.passed ? "OK" : check.blocking ? "FAIL" : "WARN";
  console.log(
    `  ${icon.padEnd(4)} ${check.name} expected=${check.expected} actual=${check.actual}`,
  );
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      target,
      contentVersion: seededManifest.contentVersion,
      seedRunId: seededManifest.seedRunId,
      checks,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const failures = checks.filter((check) => check.blocking && !check.passed);
if (failures.length > 0) {
  console.error(
    `\nVerification failed: ${failures.length} blocking check(s). Report: ${reportPath}\n`,
  );
  process.exit(1);
}
console.log(`\nVerification passed. Report: ${reportPath}\n`);
