#!/usr/bin/env node
/**
 * Deletes only D1-referenced pronunciation objects from the dedicated
 * nihongo-n3-audio bucket, then removes their legacy D1 references.
 *
 * Default is read-only. Destructive execution needs both guards:
 *   node scripts/purge-r2-pronunciation.mjs --execute --confirm=DELETE_R2_PRONUNCIATION
 */
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const execute = process.argv.includes('--execute');
const confirmed = process.argv.includes('--confirm=DELETE_R2_PRONUNCIATION');
const bucket = 'nihongo-n3-audio';
const apiConfig = path.resolve('apps/api/wrangler.toml');
const keyQueries = [
  'SELECT audio_r2_key AS audio_key FROM vocab WHERE audio_r2_key IS NOT NULL',
  'SELECT audio_r2_key AS audio_key FROM kanji WHERE audio_r2_key IS NOT NULL',
  'SELECT audio_r2_key AS audio_key FROM sentences WHERE audio_r2_key IS NOT NULL',
  'SELECT audio_r2_key AS audio_key FROM reading_passages WHERE audio_r2_key IS NOT NULL',
  'SELECT r2_key AS audio_key FROM audio_generation_log WHERE r2_key IS NOT NULL',
  'SELECT audio_r2_key AS audio_key FROM topik_placement_questions WHERE audio_r2_key IS NOT NULL',
  'SELECT audio_r2_key AS audio_key FROM topik_practice_questions WHERE audio_r2_key IS NOT NULL',
  'SELECT immutable_r2_key AS audio_key FROM content_source_assets WHERE immutable_r2_key IS NOT NULL',
];
const legacyBindingQuery = `SELECT count(*) AS count FROM content_audio_bindings
  WHERE asset_id IS NOT NULL OR binding_state = 'r2-ready'`;
const sourceAssetMetadataQuery = `SELECT count(*) AS count FROM content_source_assets
  WHERE immutable_r2_key IS NOT NULL OR stored_audio_bytes_sha256 IS NOT NULL`;

async function wrangler(dir, args) {
  const { stdout, stderr } = await exec('pnpm', ['--dir', dir, 'exec', 'wrangler', ...args], {
    cwd: process.cwd(), maxBuffer: 16 * 1024 * 1024,
  });
  return `${stdout}\n${stderr}`;
}

function parseJson(output) {
  const start = output.indexOf('[\n  {');
  if (start < 0) throw new Error('Wrangler JSON output was not found');
  const end = output.indexOf('\n]\n', start);
  if (end < 0) throw new Error('Wrangler JSON output was incomplete');
  return JSON.parse(output.slice(start, end + 2));
}

async function queryRows(sql) {
  const rows = parseJson(await wrangler('packages/db', [
    'd1', 'execute', 'DB', '--remote', '--config', '../../apps/api/wrangler.toml', '--json', '--command', sql,
  ]));
  return rows[0]?.results ?? [];
}

const keyRows = (await Promise.all(keyQueries.map(queryRows))).flat();
const referencedKeys = keyRows.map((row) => row.audio_key).filter((key) => typeof key === 'string');
if (referencedKeys.some((key) => (!key.startsWith('audio/') && !key.startsWith('private-audio/')) || key.includes('..') || key.startsWith('/'))) {
  throw new Error('Refusing an invalid R2 key inventory');
}
const keys = [...new Set(referencedKeys)].sort();
const legacyBindingRows = await queryRows(legacyBindingQuery);
const legacyBindingCount = Number(legacyBindingRows[0]?.count ?? Number.NaN);
if (!Number.isInteger(legacyBindingCount) || legacyBindingCount < 0) {
  throw new Error('Legacy audio binding inventory returned an invalid count');
}
const sourceAssetMetadataRows = await queryRows(sourceAssetMetadataQuery);
const sourceAssetMetadataCount = Number(sourceAssetMetadataRows[0]?.count ?? Number.NaN);
if (!Number.isInteger(sourceAssetMetadataCount) || sourceAssetMetadataCount < 0) {
  throw new Error('Source asset R2 metadata inventory returned an invalid count');
}

const report = {
  generated_at: new Date().toISOString(), bucket, mode: execute ? 'execute' : 'dry-run',
  reference_rows: referencedKeys.length,
  referenced_keys: keys.length,
  source_asset_metadata_rows: sourceAssetMetadataCount,
  legacy_binding_rows: legacyBindingCount,
  deleted: [], failures: [], d1_cleanup: 'not-run',
};

if (execute && !confirmed) throw new Error('Destructive execution requires --confirm=DELETE_R2_PRONUNCIATION');
if (execute && (sourceAssetMetadataCount > 0 || legacyBindingCount > 0)) {
  throw new Error('Immutable source-asset or legacy-binding metadata remains; use an approved additive D1 purge migration before object deletion');
}

if (execute) {
  const queue = [...keys];
  const workers = Array.from({ length: 16 }, async () => {
    while (queue.length) {
      const key = queue.shift();
      if (!key) return;
      try {
        await wrangler('apps/api', ['r2', 'object', 'delete', `${bucket}/${key}`, '--remote', '--config', apiConfig]);
        report.deleted.push(key);
      } catch (error) {
        report.failures.push({ key, error: error instanceof Error ? error.message : String(error) });
      }
    }
  });
  await Promise.all(workers);
  if (report.failures.length === 0) {
    const cleanup = [
      "UPDATE vocab SET audio_r2_key = NULL WHERE audio_r2_key IS NOT NULL;",
      "UPDATE kanji SET audio_r2_key = NULL WHERE audio_r2_key IS NOT NULL;",
      "UPDATE sentences SET audio_r2_key = NULL WHERE audio_r2_key IS NOT NULL;",
      "UPDATE reading_passages SET audio_r2_key = NULL WHERE audio_r2_key IS NOT NULL;",
      "DELETE FROM audio_generation_log WHERE r2_key IS NOT NULL;",
      "UPDATE topik_placement_questions SET audio_r2_key = NULL WHERE audio_r2_key IS NOT NULL;",
      "UPDATE topik_practice_questions SET audio_r2_key = NULL WHERE audio_r2_key IS NOT NULL;",
    ].join(' ');
    await wrangler('packages/db', ['d1', 'execute', 'DB', '--remote', '--config', '../../apps/api/wrangler.toml', '--command', cleanup]);
    report.d1_cleanup = 'complete';
  }
}

await mkdir('.artifacts/audio', { recursive: true });
const reportPath = path.join('.artifacts/audio', `r2-pronunciation-purge-${Date.now()}.json`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ ...report, deleted: report.deleted.length, report: reportPath }, null, 2));
if (report.failures.length > 0) process.exit(1);
