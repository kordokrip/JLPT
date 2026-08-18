/**
 * Legacy R2 pronunciation absence verifier.
 *
 * Pronunciation playback is Google-only.  This script intentionally verifies
 * that the D1 references which formerly enabled the R2 path are empty; it
 * never reads an R2 object or requires R2 credentials.
 */
import fs from 'node:fs';
import path from 'node:path';

import { parseD1Target, querySql } from '../seed/d1-cli.js';
import { REPO_ROOT } from '../seed/constants.js';

const target = parseD1Target();
if (!target.remote) {
  throw new Error('Legacy R2 pronunciation absence verification is remote-only. Pass --remote.');
}

type CountRow = { source: string; count: number };

const rows = querySql<CountRow>(target, `
  SELECT 'vocab.audio_r2_key' AS source, COUNT(*) AS count
  FROM vocab WHERE audio_r2_key IS NOT NULL
  UNION ALL
  SELECT 'kanji.audio_r2_key', COUNT(*)
  FROM kanji WHERE audio_r2_key IS NOT NULL
  UNION ALL
  SELECT 'sentences.audio_r2_key', COUNT(*)
  FROM sentences WHERE audio_r2_key IS NOT NULL
  UNION ALL
  SELECT 'reading_passages.audio_r2_key', COUNT(*)
  FROM reading_passages WHERE audio_r2_key IS NOT NULL
  UNION ALL
  SELECT 'audio_generation_log.r2_key', COUNT(*)
  FROM audio_generation_log WHERE r2_key IS NOT NULL
`);

const total = rows.reduce((sum, row) => sum + Number(row.count), 0);
const report = {
  policy: 'google-only-pronunciation',
  target: { database: target.database, remote: target.remote },
  references: rows.map((row) => ({ source: row.source, count: Number(row.count) })),
  total,
};
const reportArgument = process.argv.find((arg) => arg.startsWith('--report='))?.slice('--report='.length);
if (reportArgument) {
  const reportPath = path.isAbsolute(reportArgument)
    ? reportArgument
    : path.resolve(REPO_ROOT, reportArgument);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(report, null, 2));

if (total !== 0) {
  throw new Error(`R2 pronunciation references remain in D1 (${total}). Run the approved purge before release.`);
}
