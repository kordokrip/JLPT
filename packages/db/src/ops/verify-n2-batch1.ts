import fs from 'node:fs';
import path from 'node:path';

import {
  buildContentSeedPlan,
  type ContentManifestEntry,
} from '../seed/content-manifest.js';
import {
  buildN2Batch1Plan,
  N2_BATCH_1_KANJI,
  N2_BATCH_1_SOURCE_ASSET_ID,
  N2_BATCH_1_SOURCE_CODE,
} from '../seed/n2-batch1.js';
import { argValue, countSqlBatch, parseD1Target } from '../seed/d1-cli.js';
import { REPO_ROOT } from '../seed/constants.js';

interface Check {
  name: string;
  expected: number | string;
  actual: number | string;
  passed: boolean;
}

const target = parseD1Target();
if (target.remote) {
  throw new Error('N2 Batch 1 verification is local-only. Pass --local and an isolated --persist-to path.');
}

const reportPath = path.resolve(
  argValue('--report') ?? path.join(REPO_ROOT, '.artifacts/db/n2-batch1-report.json'),
);
const batch = buildN2Batch1Plan().manifest;
const assetId = sqlLiteral(N2_BATCH_1_SOURCE_ASSET_ID);
const sourceCode = sqlLiteral(N2_BATCH_1_SOURCE_CODE);
const attribution = sqlLiteral(`self-authored N2 Batch 1; source asset ${N2_BATCH_1_SOURCE_ASSET_ID}`);

const numericChecks: Array<{ name: string; expected: number; sql: string }> = [
  {
    name: 'N2 Batch 1 source asset immutable provenance', expected: 1,
    sql: `SELECT count(*) AS count FROM content_source_assets
      WHERE id = ${assetId} AND asset_kind = 'self-authored-fixture'
        AND source_sha256 = ${sqlLiteral(batch.sourceSha256)}
        AND length(trim(source_url)) > 0 AND length(trim(license_id)) > 0
        AND length(trim(license_url)) > 0 AND length(trim(attribution_text)) > 0
        AND length(trim(allowed_use)) > 0 AND generated_at IS NOT NULL
        AND immutable_r2_key IS NULL AND stored_audio_bytes_sha256 IS NULL`,
  },
  {
    name: 'N2 Batch 1 vocab rows', expected: batch.counts.vocab,
    sql: `SELECT count(*) AS count FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${sourceCode}) AND level = 'N2'`,
  },
  {
    name: 'N2 Batch 1 grammar rows', expected: batch.counts.grammar,
    sql: `SELECT count(*) AS count FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${sourceCode}) AND level = 'N2'`,
  },
  {
    name: 'N2 Batch 1 grammar has two authored examples per item', expected: 0,
    sql: `SELECT count(*) AS count FROM grammar
      WHERE source_id = (SELECT id FROM sources WHERE code = ${sourceCode}) AND level = 'N2'
        AND (json_valid(examples) = 0 OR json_array_length(examples) < 2)`,
  },
  {
    name: 'N2 Batch 1 new kanji rows', expected: batch.counts.kanji,
    sql: `SELECT count(*) AS count FROM kanji WHERE jlpt_level = 'N2'
      AND char IN (${batchKanjiSql()})`,
  },
  {
    name: 'N2 Batch 1 listening-script rows', expected: batch.counts.sentences,
    sql: `SELECT count(*) AS count FROM sentences
      WHERE source_id = (SELECT id FROM sources WHERE code = ${sourceCode})
        AND level = 'N2' AND register = 'listening' AND audio_r2_key IS NULL`,
  },
  {
    name: 'N2 Batch 1 reading rows', expected: batch.counts.reading,
    sql: `SELECT count(*) AS count FROM reading_passages
      WHERE level = 'N2' AND source_attribution = ${attribution} AND audio_r2_key IS NULL`,
  },
  {
    name: 'N2 Batch 1 reading questions', expected: batch.counts.readingQuestions,
    sql: `SELECT count(*) AS count FROM reading_questions q
      JOIN reading_passages p ON p.id = q.passage_id
      WHERE p.level = 'N2' AND p.source_attribution = ${attribution}`,
  },
  {
    name: 'N2 Batch 1 reading questions have four choices, answer and explanation', expected: 0,
    sql: `SELECT count(*) AS count FROM reading_questions q
      JOIN reading_passages p ON p.id = q.passage_id
      WHERE p.level = 'N2' AND p.source_attribution = ${attribution}
        AND (json_valid(q.choices_json) = 0 OR json_array_length(q.choices_json) <> 4
          OR q.answer_index NOT BETWEEN 0 AND 3 OR length(trim(COALESCE(q.explanation_ko, ''))) = 0)`,
  },
  {
    name: 'N2 Batch 1 stable refs', expected: batch.counts.stableRefs,
    sql: `SELECT count(*) AS count FROM learning_content_stable_refs
      WHERE learning_track = 'jlpt-ja' AND level_tag = 'N2' AND source_asset_id = ${assetId}`,
  },
  {
    name: 'N2 Batch 1 Google speech bindings', expected: batch.counts.audioBindings,
    sql: `SELECT count(*) AS count FROM content_speech_bindings b
      JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref
      WHERE r.learning_track = 'jlpt-ja' AND r.level_tag = 'N2' AND r.source_asset_id = ${assetId}`,
  },
  {
    name: 'N2 Batch 1 speech is ready for Google browser playback', expected: batch.counts.audioBindings,
    sql: `SELECT count(*) AS count FROM content_speech_bindings b
      JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref
      WHERE r.learning_track = 'jlpt-ja' AND r.level_tag = 'N2' AND r.source_asset_id = ${assetId}
        AND b.binding_state = 'ready' AND b.provider = 'google-browser'
        AND b.unavailable_reason IS NULL`,
  },
  {
    name: 'N2 Batch 1 speech binding identity matches stable refs', expected: 0,
    sql: `SELECT count(*) AS count FROM content_speech_bindings b
      JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref
      WHERE r.source_asset_id = ${assetId} AND (b.item_type <> r.item_type OR b.item_id <> r.item_id)`,
  },
  {
    name: 'N3 canonical 対 is preserved', expected: 1,
    sql: "SELECT count(*) AS count FROM kanji WHERE char = '対' AND jlpt_level = 'N3'",
  },
  {
    name: 'N2 Batch 1 references N3 対 only as a prerequisite', expected: 1,
    sql: `SELECT count(*) AS count FROM learning_content_level_references r
      JOIN kanji k ON CAST(k.id AS TEXT) = r.item_id
      WHERE r.id = 'curriculum-reference:jlpt:n2:batch1:kanji:対'
        AND r.learning_track = 'jlpt-ja' AND r.curriculum_level = 'N2'
        AND r.item_type = 'jlpt-kanji' AND r.reference_kind = 'prerequisite'
        AND r.source_asset_id = ${assetId} AND k.char = '対' AND k.jlpt_level = 'N3'`,
  },
  {
    name: 'N2 Batch 1 never creates a public release row', expected: 0,
    sql: `SELECT count(*) AS count FROM content_releases
      WHERE learning_track = 'jlpt-ja' AND content_version = ${sourceCode}`,
  },
  {
    name: 'N2 Batch 1 never touches TOPIK practice bank', expected: 0,
    sql: `SELECT count(*) AS count FROM topik_practice_questions WHERE source_code = ${sourceCode}`,
  },
  { name: 'foreign keys', expected: 0, sql: 'SELECT count(*) AS count FROM pragma_foreign_key_check' },
];

for (const entry of buildContentSeedPlan().manifest.entries) {
  addExistingLevelPreservationChecks(entry, numericChecks);
}

const actualCounts = countSqlBatch(target, numericChecks.map((check) => check.sql));
const checks: Check[] = numericChecks.map((check, index) => ({
  name: check.name,
  expected: check.expected,
  actual: actualCounts[index] ?? Number.NaN,
  passed: check.expected === actualCounts[index],
}));

for (const check of checks) {
  console.log(`${check.passed ? 'OK  ' : 'FAIL'} ${check.name} expected=${check.expected} actual=${check.actual}`);
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({ batch, target, checks }, null, 2)}\n`, 'utf8');

if (checks.some((check) => !check.passed)) process.exit(1);

function batchKanjiSql(): string {
  return N2_BATCH_1_KANJI.map(sqlLiteral).join(', ');
}

function addExistingLevelPreservationChecks(
  entry: ContentManifestEntry,
  destination: Array<{ name: string; expected: number; sql: string }>,
): void {
  const levels: Record<string, 'N5' | 'N4' | 'N3'> = {
    '04': 'N5', '05': 'N5', '03': 'N5',
    '07': 'N4', '08': 'N4', '06': 'N4',
    '10A': 'N3', '10B': 'N3', '11': 'N3', '09': 'N3',
  };
  const level = levels[entry.sourceCode];
  if (!level) return;

  if (entry.selector.kind === 'source') {
    destination.push({
      name: `existing ${entry.sourceCode} row count preserved`,
      expected: entry.expectedRows,
      sql: `SELECT count(*) AS count FROM ${entry.table}
        WHERE source_id = (SELECT id FROM sources WHERE code = ${sqlLiteral(entry.selector.value)})`,
    });
    if (entry.table === 'vocab' || entry.table === 'grammar') {
      destination.push({
        name: `existing ${entry.sourceCode} ${level} level tags preserved`,
        expected: entry.expectedRows,
        sql: `SELECT count(*) AS count FROM ${entry.table}
          WHERE source_id = (SELECT id FROM sources WHERE code = ${sqlLiteral(entry.selector.value)})
            AND level = ${sqlLiteral(level)}`,
      });
    }
    return;
  }

  if (entry.selector.kind === 'level') {
    const column = entry.table === 'kanji' ? 'jlpt_level' : 'level';
    destination.push({
      name: `existing ${entry.table} ${level} count preserved`,
      expected: entry.expectedRows,
      sql: `SELECT count(*) AS count FROM ${entry.table} WHERE ${column} = ${sqlLiteral(level)}`,
    });
  }
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
