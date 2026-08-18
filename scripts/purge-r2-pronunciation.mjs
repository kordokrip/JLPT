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
const query = `WITH keys AS (
  SELECT audio_r2_key AS audio_key FROM vocab WHERE audio_r2_key IS NOT NULL
  UNION SELECT audio_r2_key FROM kanji WHERE audio_r2_key IS NOT NULL
  UNION SELECT audio_r2_key FROM sentences WHERE audio_r2_key IS NOT NULL
  UNION SELECT audio_r2_key FROM reading_passages WHERE audio_r2_key IS NOT NULL
  UNION SELECT r2_key FROM audio_generation_log WHERE r2_key IS NOT NULL
) SELECT audio_key FROM keys WHERE audio_key LIKE 'audio/%' ORDER BY audio_key;`;

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

const rows = parseJson(await wrangler('packages/db', [
  'd1', 'execute', 'DB', '--remote', '--config', '../../apps/api/wrangler.toml', '--json', '--command', query,
]));
const keys = rows[0]?.results?.map((row) => row.audio_key).filter((key) => typeof key === 'string' && key.startsWith('audio/')) ?? [];
const duplicate = new Set(keys);
if (duplicate.size !== keys.length || keys.some((key) => key.includes('..') || key.startsWith('/'))) {
  throw new Error('Refusing an invalid or duplicate R2 key inventory');
}

const report = {
  generated_at: new Date().toISOString(), bucket, mode: execute ? 'execute' : 'dry-run',
  referenced_keys: keys.length, deleted: [], failures: [], d1_cleanup: 'not-run',
};

if (execute && !confirmed) throw new Error('Destructive execution requires --confirm=DELETE_R2_PRONUNCIATION');

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
