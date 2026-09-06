/**
 * Legacy R2 pronunciation absence verifier.
 *
 * Pronunciation playback is Google-preferred same-language browser speech. This script verifies
 * that the D1 references which formerly enabled the R2 path are empty; it
 * never reads an R2 object or requires R2 credentials.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseD1Target, querySql } from '../seed/d1-cli.js';
import { REPO_ROOT } from '../seed/constants.js';

type CountRow = { count: number };

/**
 * Keep each surface in its own D1 statement. A single UNION across all nine
 * surfaces exceeded Production D1's compound SELECT planner limit once the
 * legacy views were expanded, which made a zero-reference database look like
 * a failed audit.
 */
export const R2_PRONUNCIATION_REFERENCE_QUERIES = [
  { source: 'vocab.audio_r2_key', sql: 'SELECT COUNT(*) AS count FROM vocab WHERE audio_r2_key IS NOT NULL' },
  { source: 'kanji.audio_r2_key', sql: 'SELECT COUNT(*) AS count FROM kanji WHERE audio_r2_key IS NOT NULL' },
  { source: 'sentences.audio_r2_key', sql: 'SELECT COUNT(*) AS count FROM sentences WHERE audio_r2_key IS NOT NULL' },
  { source: 'reading_passages.audio_r2_key', sql: 'SELECT COUNT(*) AS count FROM reading_passages WHERE audio_r2_key IS NOT NULL' },
  { source: 'audio_generation_log.r2_key', sql: 'SELECT COUNT(*) AS count FROM audio_generation_log WHERE r2_key IS NOT NULL' },
  { source: 'topik_placement_questions.audio_r2_key', sql: 'SELECT COUNT(*) AS count FROM topik_placement_questions WHERE audio_r2_key IS NOT NULL' },
  { source: 'topik_practice_questions.audio_r2_key', sql: 'SELECT COUNT(*) AS count FROM topik_practice_questions WHERE audio_r2_key IS NOT NULL' },
  {
    source: 'content_source_assets.r2_fields',
    sql: 'SELECT COUNT(*) AS count FROM content_source_assets WHERE immutable_r2_key IS NOT NULL OR stored_audio_bytes_sha256 IS NOT NULL',
  },
  {
    source: 'content_audio_bindings.asset_id',
    sql: "SELECT COUNT(*) AS count FROM content_audio_bindings WHERE asset_id IS NOT NULL OR binding_state = 'r2-ready'",
  },
] as const;

function main() {
  const target = parseD1Target();
  if (!target.remote) {
    throw new Error('Legacy R2 pronunciation absence verification is remote-only. Pass --remote.');
  }
  const rows = R2_PRONUNCIATION_REFERENCE_QUERIES.map(({ source, sql }) => {
    const row = querySql<CountRow>(target, sql)[0];
    if (!row || typeof row.count !== 'number') {
      throw new Error(`R2 pronunciation reference query returned an invalid count for ${source}.`);
    }
    return { source, count: Number(row.count) };
  });

  const total = rows.reduce((sum, row) => sum + Number(row.count), 0);
  const report = {
    policy: 'google-preferred-same-language-browser-pronunciation-no-r2',
    target: { database: target.database, remote: target.remote },
    references: rows,
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
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
