import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';
import { countSqlBatch, parseD1Target } from '../seed/d1-cli.js';
import { buildTopikOwnerBatch1Plan } from '../seed/topik-owner-curriculum-batch1.js';

const target = parseD1Target();
if (target.remote) throw new Error('Run the TOPIK owner curriculum verifier locally before any approved remote seed. Pass --local.');

const reportPath = path.resolve(process.argv.find((arg) => arg.startsWith('--report='))?.slice('--report='.length)
  ?? path.join(REPO_ROOT, '.artifacts/db/topik-owner-curriculum-batch1-report.json'));
const manifest = buildTopikOwnerBatch1Plan().manifest;
const asset = `'${manifest.sourceAssetId.replaceAll("'", "''")}'`;

const checks = [
  { name: 'TOPIK Batch 1 units', expected: manifest.counts.units, sql: `SELECT count(*) AS count FROM topik_owner_authored_curriculum_units WHERE source_asset_id = ${asset}` },
  { name: 'TOPIK Batch 1 items', expected: manifest.counts.items, sql: `SELECT count(*) AS count FROM topik_owner_authored_curriculum_items WHERE source_asset_id = ${asset}` },
  { name: 'TOPIK Batch 1 stable refs', expected: manifest.counts.stableRefs, sql: `SELECT count(*) AS count FROM learning_content_stable_refs WHERE source_asset_id = ${asset} AND learning_track = 'topik-ko' AND item_type = 'topik-owner-item'` },
  { name: 'TOPIK Batch 1 Google speech bindings', expected: manifest.counts.audioBindings, sql: `SELECT count(*) AS count FROM content_speech_bindings b JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref WHERE r.source_asset_id = ${asset} AND b.language = 'ko' AND b.provider = 'google-browser' AND b.binding_state = 'ready'` },
  { name: 'all six TOPIK grades have five Batch 1 units', expected: 6, sql: `SELECT count(*) AS count FROM (SELECT target_grade FROM topik_owner_authored_curriculum_units WHERE source_asset_id = ${asset} GROUP BY target_grade HAVING count(*) = 5)` },
  { name: 'all spoken items have self-authored Korean browser text', expected: 0, sql: `SELECT count(*) AS count FROM topik_owner_authored_curriculum_items WHERE source_asset_id = ${asset} AND (audio_required <> 1 OR length(trim(COALESCE(audio_text_ko, ''))) = 0)` },
  { name: 'Batch does not enter the reviewed TOPIK practice bank', expected: 0, sql: `SELECT count(*) AS count FROM topik_practice_questions WHERE source_code = 'TOPIK-A1'` },
] as const;

const counts = countSqlBatch(target, checks.map((check) => check.sql));
const results = checks.map((check, index) => ({ ...check, actual: counts[index] ?? Number.NaN, passed: (counts[index] ?? Number.NaN) === check.expected }));
for (const result of results) console.log(`${result.passed ? 'OK  ' : 'FAIL'} ${result.name} expected=${result.expected} actual=${result.actual}`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({ manifest, results }, null, 2)}\n`, 'utf8');
if (results.some((result) => !result.passed)) process.exit(1);
