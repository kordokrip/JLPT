import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';
import { executeSqlFile, parseD1Target, querySql } from '../seed/d1-cli.js';
import { buildTopikOfficialReferenceSeedPlan, TOPIK_OFFICIAL_SOURCE_CODE } from '../seed/topik-official-reference.js';

const target = parseD1Target();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-topik-official-verify-'));
const sqlPath = path.join(tempDir, 'seed.sql');
try {
  const plan = buildTopikOfficialReferenceSeedPlan();
  if (!target.remote) {
    fs.writeFileSync(sqlPath, `${plan.statements.join('\n\n')}\n`, 'utf8');
    executeSqlFile(target, sqlPath);
  }
  const checks = [
    ['blueprints', plan.manifest.blueprints.length, querySql<{ count: number }>(target, "SELECT count(*) AS count FROM topik_exam_blueprints WHERE learning_track = 'topik-ko'")[0]?.count ?? 0],
    ['statistics', plan.manifest.statistics.expectedRows, querySql<{ count: number }>(target, `SELECT count(*) AS count FROM topik_official_statistics WHERE source_code = '${TOPIK_OFFICIAL_SOURCE_CODE}'`)[0]?.count ?? 0],
    ['TOPIK I listening', 30, querySql<{ question_count: number }>(target, "SELECT question_count FROM topik_exam_blueprints WHERE id = 'topik-i-pbt-listening'")[0]?.question_count ?? 0],
    ['TOPIK I reading', 40, querySql<{ question_count: number }>(target, "SELECT question_count FROM topik_exam_blueprints WHERE id = 'topik-i-pbt-reading'")[0]?.question_count ?? 0],
    ['TOPIK II listening', 50, querySql<{ question_count: number }>(target, "SELECT question_count FROM topik_exam_blueprints WHERE id = 'topik-ii-pbt-listening'")[0]?.question_count ?? 0],
    ['TOPIK II writing', 4, querySql<{ question_count: number }>(target, "SELECT question_count FROM topik_exam_blueprints WHERE id = 'topik-ii-pbt-writing'")[0]?.question_count ?? 0],
    ['TOPIK II reading', 50, querySql<{ question_count: number }>(target, "SELECT question_count FROM topik_exam_blueprints WHERE id = 'topik-ii-pbt-reading'")[0]?.question_count ?? 0],
    ['foreign keys', 0, querySql<Record<string, unknown>>(target, 'PRAGMA foreign_key_check').length],
  ];
  for (const [name, expected, actual] of checks) console.log(`  ${expected === actual ? 'OK' : 'FAIL'} ${name}: expected=${expected} actual=${actual}`);
  if (checks.some(([, expected, actual]) => expected !== actual)) process.exitCode = 1;
} finally {
  fs.rmSync(tempDir, { force: true, recursive: true });
}
