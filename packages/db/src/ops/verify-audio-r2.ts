import fs from 'node:fs';
import path from 'node:path';

import { AwsClient } from 'aws4fetch';
import { config as loadDotEnv } from 'dotenv';

import {
  encodeR2Key,
  expectedAudioObject,
  type AudioSourceRow,
  verifyR2Head,
} from './audio-r2-verifier.js';
import { parseD1Target, querySql } from '../seed/d1-cli.js';
import { REPO_ROOT } from '../seed/constants.js';

const envFile = path.join(REPO_ROOT, '.env.local');
if (fs.existsSync(envFile)) loadDotEnv({ path: envFile, override: false });

const target = parseD1Target();
if (!target.remote) {
  throw new Error('R2 object verification is remote-only. Pass --remote.');
}

const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID', 'CF_ACCOUNT_ID');
const accessKeyId = requiredEnv('AUDIO_R2_ACCESS_KEY_ID');
const secretAccessKey = requiredEnv('AUDIO_R2_SECRET_ACCESS_KEY');
const endpoint = (
  process.env.R2_S3_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`
).replace(/\/$/, '');
const bucket = process.env.AUDIO_R2_BUCKET_NAME?.trim() || 'nihongo-n3-audio';
const reportPath = path.resolve(
  process.env.AUDIO_R2_VERIFY_REPORT?.trim() ||
    path.join(REPO_ROOT, '.artifacts/audio/remote-r2-audio-verification.json'),
);

const rows = querySql<AudioSourceRow>(target, `
  SELECT id, 'vocab' AS item_type, level, ja AS text, audio_r2_key
  FROM vocab WHERE level IN ('N5', 'N4', 'N3', 'N2', 'N1')
  UNION ALL
  SELECT id, 'kanji' AS item_type, jlpt_level AS level,
         COALESCE(on_yomi, kun_yomi, char) AS text, audio_r2_key
  FROM kanji WHERE jlpt_level IN ('N5', 'N4', 'N3', 'N2', 'N1')
  UNION ALL
  SELECT id, 'sentence' AS item_type, level, ja AS text, audio_r2_key
  FROM sentences WHERE level IN ('N5', 'N4', 'N3', 'N2', 'N1')
  ORDER BY CASE level WHEN 'N5' THEN 1 WHEN 'N4' THEN 2 WHEN 'N3' THEN 3 WHEN 'N2' THEN 4 ELSE 5 END, item_type, id
`);

const aws = new AwsClient({
  accessKeyId,
  secretAccessKey,
  service: 's3',
  region: 'auto',
  retries: 2,
});

interface VerificationFailure {
  item_type: string;
  id: number;
  level: string;
  kind: 'd1-key' | 'r2-head' | 'r2-metadata';
  expected_key: string;
  actual_key?: string | null;
  status?: number;
  fields?: string[];
}

const failures: VerificationFailure[] = [];
const eligible: Array<{ row: AudioSourceRow; expected: ReturnType<typeof expectedAudioObject> }> = [];

for (const row of rows) {
  const expected = expectedAudioObject(row);
  if (row.audio_r2_key !== expected.key) {
    failures.push({
      item_type: row.item_type,
      id: row.id,
      level: row.level,
      kind: 'd1-key',
      expected_key: expected.key,
      actual_key: row.audio_r2_key,
    });
  } else {
    eligible.push({ row, expected });
  }
}

await parallelMap(eligible, 20, async ({ row, expected }) => {
  const url = `${endpoint}/${encodeURIComponent(bucket)}/${encodeR2Key(expected.key)}`;
  const response = await aws.fetch(url, { method: 'HEAD' });
  if (!response.ok) {
    failures.push({
      item_type: row.item_type,
      id: row.id,
      level: row.level,
      kind: 'r2-head',
      expected_key: expected.key,
      status: response.status,
    });
    return;
  }
  const fields = verifyR2Head(response.headers, expected);
  if (fields.length > 0) {
    failures.push({
      item_type: row.item_type,
      id: row.id,
      level: row.level,
      kind: 'r2-metadata',
      expected_key: expected.key,
      fields,
    });
  }
});

const counts = countByLevelAndType(rows);
const failureCounts = failures.reduce<Record<string, number>>((result, failure) => {
  result[failure.kind] = (result[failure.kind] ?? 0) + 1;
  return result;
}, {});
const report = {
  generated_at: new Date().toISOString(),
  target: { database: target.database, remote: true, bucket },
  profile: {
    provider: 'google',
    model: 'ja-JP-Neural2-B',
    audio_version: 'google-neural2-v1',
  },
  totals: {
    source_rows: rows.length,
    d1_keys_matching_expected: eligible.length,
    verified_objects: rows.length - failures.length,
    failures: failures.length,
  },
  counts,
  failure_counts: failureCounts,
  failures,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
fs.chmodSync(reportPath, 0o600);

console.log(JSON.stringify({
  event: 'audio_r2_verification',
  source_rows: rows.length,
  d1_keys_matching_expected: eligible.length,
  failures: failures.length,
  failure_counts: failureCounts,
  report: reportPath,
}, null, 2));

if (failures.length > 0) process.exit(1);

function requiredEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(' or ')}`);
}

async function parallelMap<T>(
  items: T[],
  concurrency: number,
  operation: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await operation(items[index]!);
    }
  });
  await Promise.all(workers);
}

function countByLevelAndType(rowsToCount: AudioSourceRow[]): Record<string, number> {
  return rowsToCount.reduce<Record<string, number>>((result, row) => {
    const key = `${row.level}:${row.item_type}`;
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}
