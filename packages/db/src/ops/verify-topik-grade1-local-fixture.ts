import fs from 'node:fs';
import path from 'node:path';

import { buildTopikGrade1LocalFixturePlan } from '../seed/topik-grade1-local-fixture.js';
import { argValue, countSqlBatch, parseD1Target } from '../seed/d1-cli.js';
import { REPO_ROOT } from '../seed/constants.js';

const target = parseD1Target();
if (target.remote) throw new Error('TOPIK grade 1 local fixture verification never reads remote D1. Pass --local.');
const reportPath = path.resolve(argValue('--report') ?? path.join(REPO_ROOT, '.artifacts/db/topik-grade1-local-fixture-report.json'));
const fixture = buildTopikGrade1LocalFixturePlan().manifest;
const literal = (value: string) => `'${value.replace(/'/g, "''")}'`;
const assetId = literal(fixture.sourceAssetId);

const checks = [
  { name: 'self-authored source asset provenance', expected: 1, sql: `SELECT count(*) AS count FROM content_source_assets WHERE id = ${assetId} AND asset_kind = 'self-authored-fixture' AND source_sha256 = ${literal(fixture.sourceSha256)} AND length(trim(source_url)) > 0 AND length(trim(license_id)) > 0 AND length(trim(license_url)) > 0 AND length(trim(allowed_use)) > 0` },
  { name: 'TOPIK grade 1 unit', expected: fixture.counts.units, sql: `SELECT count(*) AS count FROM topik_owner_authored_curriculum_units WHERE id = ${literal(fixture.unitId)} AND target_grade = 1 AND source_asset_id = ${assetId}` },
  { name: 'TOPIK grade 1 items', expected: fixture.counts.items, sql: `SELECT count(*) AS count FROM topik_owner_authored_curriculum_items WHERE unit_id = ${literal(fixture.unitId)} AND target_grade = 1 AND source_asset_id = ${assetId}` },
  { name: 'TOPIK stable refs', expected: fixture.counts.stableRefs, sql: `SELECT count(*) AS count FROM learning_content_stable_refs WHERE learning_track = 'topik-ko' AND item_type = 'topik-owner-item' AND level_tag = 'TOPIK-1' AND source_asset_id = ${assetId}` },
  { name: 'TOPIK Google browser speech bindings', expected: fixture.counts.audioBindings, sql: `SELECT count(*) AS count FROM content_speech_bindings b JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref WHERE r.source_asset_id = ${assetId} AND b.provider = 'google-browser'` },
  { name: 'TOPIK ready Google browser speech bindings', expected: 2, sql: `SELECT count(*) AS count FROM content_speech_bindings b JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref WHERE r.source_asset_id = ${assetId} AND b.provider = 'google-browser' AND b.binding_state = 'ready' AND b.unavailable_reason IS NULL` },
  { name: 'TOPIK unavailable Google browser speech bindings', expected: 1, sql: `SELECT count(*) AS count FROM content_speech_bindings b JOIN learning_content_stable_refs r ON r.stable_ref = b.stable_ref WHERE r.source_asset_id = ${assetId} AND b.provider = 'google-browser' AND b.binding_state = 'unavailable' AND length(trim(b.unavailable_reason)) > 0` },
  { name: 'vocabulary uses pronunciation and listening uses listening role', expected: fixture.counts.audioBindings, sql: `SELECT count(*) AS count FROM topik_owner_authored_curriculum_items i JOIN content_speech_bindings b ON b.item_type = 'topik-owner-item' AND b.item_id = i.id AND b.language = 'ko' WHERE i.unit_id = ${literal(fixture.unitId)} AND b.speech_role = CASE WHEN i.item_type = 'listening' THEN 'listening' ELSE 'pronunciation' END` },
  { name: 'review-gated TOPIK practice bank untouched', expected: 0, sql: `SELECT count(*) AS count FROM topik_practice_questions WHERE source_code = ${literal(fixture.sourceCode)}` },
  { name: 'no public release created', expected: 0, sql: `SELECT count(*) AS count FROM content_releases WHERE content_version = ${literal(fixture.sourceCode)}` },
  { name: 'foreign keys', expected: 0, sql: 'SELECT count(*) AS count FROM pragma_foreign_key_check' },
] as const;

const actuals = countSqlBatch(target, checks.map((check) => check.sql));
const results = checks.map((check, index) => ({ ...check, actual: actuals[index] ?? Number.NaN, passed: check.expected === actuals[index] }));
for (const result of results) console.log(`${result.passed ? 'OK  ' : 'FAIL'} ${result.name} expected=${result.expected} actual=${result.actual}`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({ fixture, target, checks: results }, null, 2)}\n`, 'utf8');
if (results.some((result) => !result.passed)) process.exit(1);
