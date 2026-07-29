import fs from 'node:fs';
import path from 'node:path';

import { buildN2LocalFixturePlan } from '../seed/n2-local-fixture.js';
import { N2_BATCH_1_SOURCE_ASSET_ID } from '../seed/n2-batch1.js';
import { buildContentSeedPlan } from '../seed/content-manifest.js';
import { argValue, countSqlBatch, parseD1Target } from '../seed/d1-cli.js';
import { REPO_ROOT } from '../seed/constants.js';

interface Check {
  name: string;
  expected: number | string;
  actual: number | string;
  passed: boolean;
}

const target = parseD1Target();
if (target.remote) throw new Error('N2 local fixture verification never reads a remote D1 database. Pass --local.');

const reportPath = path.resolve(argValue('--report') ?? path.join(REPO_ROOT, '.artifacts/db/n2-local-fixture-report.json'));
const fixture = buildN2LocalFixturePlan().manifest;
const sourceCode = sqlLiteral(fixture.sourceCode);
const assetId = sqlLiteral(fixture.sourceAssetId);

const sqlChecks: Array<{ name: string; expected: number; sql: string }> = [
  {
    name: 'source asset immutable provenance', expected: 1,
    sql: `SELECT count(*) AS count FROM content_source_assets
      WHERE id = ${assetId}
        AND asset_kind = 'self-authored-fixture'
        AND source_sha256 = ${sqlLiteral(fixture.sourceSha256)}
        AND length(trim(source_url)) > 0 AND length(trim(license_id)) > 0
        AND length(trim(license_url)) > 0 AND length(trim(attribution_text)) > 0
        AND length(trim(allowed_use)) > 0 AND generated_at IS NOT NULL`,
  },
  { name: 'N2 vocab rows', expected: fixture.counts.vocab, sql: `SELECT count(*) AS count FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${sourceCode}) AND level = 'N2'` },
  { name: 'N2 grammar rows', expected: fixture.counts.grammar, sql: `SELECT count(*) AS count FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${sourceCode}) AND level = 'N2'` },
  { name: 'N2 kanji rows', expected: fixture.counts.kanji, sql: `SELECT count(*) AS count FROM kanji WHERE jlpt_level = 'N2' AND char = '余'` },
  { name: 'N3 canonical 対 remains representative level', expected: 1, sql: "SELECT count(*) AS count FROM kanji WHERE char = '対' AND jlpt_level = 'N3'" },
  // The relation is intentionally unique per curriculum item. A fixture-only
  // database records its fixture source asset; a fresh main-seed database has
  // the same immutable N3 prerequisite owned by the operating Batch 1 asset.
  { name: 'N2 uses N3 対 as an immutable prerequisite', expected: fixture.counts.prerequisites, sql: `SELECT count(*) AS count FROM learning_content_level_references r JOIN kanji k ON CAST(k.id AS TEXT) = r.item_id WHERE r.learning_track = 'jlpt-ja' AND r.curriculum_level = 'N2' AND r.item_type = 'jlpt-kanji' AND r.reference_kind = 'prerequisite' AND r.source_asset_id IN (${assetId}, ${sqlLiteral(N2_BATCH_1_SOURCE_ASSET_ID)}) AND k.char = '対' AND k.jlpt_level = 'N3'` },
  { name: 'N2 sentence rows', expected: fixture.counts.sentences, sql: `SELECT count(*) AS count FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${sourceCode}) AND level = 'N2'` },
  { name: 'N2 reading rows', expected: fixture.counts.reading, sql: `SELECT count(*) AS count FROM reading_passages WHERE level = 'N2' AND source_attribution LIKE '%${fixture.sourceAssetId}%'` },
  { name: 'N2 reading questions', expected: 1, sql: `SELECT count(*) AS count FROM reading_questions q JOIN reading_passages p ON p.id = q.passage_id WHERE p.level = 'N2' AND p.source_attribution LIKE '%${fixture.sourceAssetId}%'` },
  { name: 'N2 stable refs', expected: fixture.counts.vocab + fixture.counts.grammar + fixture.counts.kanji + fixture.counts.sentences + fixture.counts.reading, sql: `SELECT count(*) AS count FROM learning_content_stable_refs WHERE learning_track = 'jlpt-ja' AND level_tag = 'N2' AND source_asset_id = ${assetId}` },
  { name: 'N2 audio bindings', expected: fixture.counts.audioBindings, sql: `SELECT count(*) AS count FROM content_audio_bindings b JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref WHERE r.learning_track = 'jlpt-ja' AND r.level_tag = 'N2' AND r.source_asset_id = ${assetId}` },
  { name: 'N2 audio bindings do not use browser fallback', expected: fixture.counts.audioBindings, sql: `SELECT count(*) AS count FROM content_audio_bindings b JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref WHERE r.learning_track = 'jlpt-ja' AND r.level_tag = 'N2' AND r.source_asset_id = ${assetId} AND b.binding_state = 'preparing' AND b.asset_id IS NULL AND length(trim(b.unavailable_reason)) > 0` },
  { name: 'N2 audio bindings match stable item identity', expected: 0, sql: `SELECT count(*) AS count FROM content_audio_bindings b JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref WHERE b.item_type <> r.item_type OR b.item_id <> r.item_id` },
  { name: 'TOPIK owner curriculum has no reviewer columns', expected: 0, sql: `SELECT count(*) AS count FROM pragma_table_info('topik_owner_authored_curriculum_items') WHERE lower(name) LIKE '%reviewer%' OR lower(name) LIKE '%reviewed%'` },
  { name: 'TOPIK practice bank untouched by N2 fixture', expected: 0, sql: `SELECT count(*) AS count FROM topik_practice_questions WHERE source_code = ${sourceCode}` },
  { name: 'foreign keys', expected: 0, sql: 'SELECT count(*) AS count FROM pragma_foreign_key_check' },
];

const baselineManifest = buildContentSeedPlan().manifest;
const baselineLevelBySource: Record<string, 'N5' | 'N4' | 'N3'> = {
  '04': 'N5', '05': 'N5', '03': 'N5',
  '07': 'N4', '08': 'N4', '06': 'N4',
  '10A': 'N3', '10B': 'N3', '11': 'N3', '09': 'N3',
};
for (const entry of baselineManifest.entries) {
  // N2 Batch 1 is a multi-table curriculum entry with its own local verifier;
  // it is not a physical `n2_curriculum` table and must not be treated as one
  // while this fixture checker establishes the N5~N3 preservation baseline.
  if (entry.table === 'n2_curriculum') continue;
  if (entry.selector.kind === 'source') {
    sqlChecks.push({
      name: `existing ${entry.sourceCode} row count preserved`,
      expected: entry.expectedRows,
      sql: `SELECT count(*) AS count FROM ${entry.table} WHERE source_id = (SELECT id FROM sources WHERE code = ${sqlLiteral(entry.selector.value)})`,
    });
    const expectedLevel = baselineLevelBySource[entry.sourceCode];
    if (expectedLevel && (entry.table === 'vocab' || entry.table === 'grammar')) {
      sqlChecks.push({
        name: `existing ${entry.sourceCode} ${expectedLevel} level tags preserved`,
        expected: entry.expectedRows,
        sql: `SELECT count(*) AS count FROM ${entry.table} WHERE source_id = (SELECT id FROM sources WHERE code = ${sqlLiteral(entry.selector.value)}) AND level = ${sqlLiteral(expectedLevel)}`,
      });
    }
  } else if (entry.selector.kind === 'level' && ['N5', 'N4', 'N3'].includes(entry.selector.value)) {
    const levelColumn = entry.table === 'kanji' ? 'jlpt_level' : 'level';
    sqlChecks.push({
      name: `existing ${entry.table} ${entry.selector.value} count preserved`,
      expected: entry.expectedRows,
      sql: `SELECT count(*) AS count FROM ${entry.table} WHERE ${levelColumn} = ${sqlLiteral(entry.selector.value)}`,
    });
  }
}

const actuals = countSqlBatch(target, sqlChecks.map((check) => check.sql));
const checks: Check[] = sqlChecks.map((check, index) => ({
  name: check.name,
  expected: check.expected,
  actual: actuals[index] ?? Number.NaN,
  passed: check.expected === actuals[index],
}));

for (const check of checks) {
  console.log(`${check.passed ? 'OK  ' : 'FAIL'} ${check.name} expected=${check.expected} actual=${check.actual}`);
}
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({ fixture, target, checks }, null, 2)}\n`, 'utf8');

if (checks.some((check) => !check.passed)) process.exit(1);

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
