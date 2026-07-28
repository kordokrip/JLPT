import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';
import { executeSqlFile, parseD1Target, querySql } from '../seed/d1-cli.js';
import { buildTopikPracticeSeedPlan, TOPIK_PRACTICE_TRACK } from '../seed/topik-practice-bank.js';

const PRODUCTION_TARGET = 'nihongo-n3-prod-v2';
const target = parseD1Target();
const publish = process.argv.includes('--publish');
if (target.remote && (target.database !== PRODUCTION_TARGET || !publish || process.env.ALLOW_PRODUCTION_CHANGE !== 'topik-practice-seed')) {
  throw new Error(`Remote TOPIK practice seed requires --database=${PRODUCTION_TARGET}, --publish, and ALLOW_PRODUCTION_CHANGE=topik-practice-seed.`);
}

const plan = buildTopikPracticeSeedPlan();
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-topik-practice-seed-'));
const sqlPath = path.join(directory, 'seed.sql');
try {
  fs.writeFileSync(sqlPath, `${plan.statements.join('\n\n')}\n`, 'utf8');
  executeSqlFile(target, sqlPath);
  const rows = querySql<{ count: number }>(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE learning_track = '${TOPIK_PRACTICE_TRACK}' AND bank_version = 'v1'`)[0]?.count ?? 0;
  if (rows !== plan.manifest.questions.expectedRows) throw new Error(`TOPIK practice seed verification failed: expected ${plan.manifest.questions.expectedRows}, got ${rows}.`);
  console.log(`TOPIK practice bank seeded: ${rows} self-authored questions, ${plan.manifest.contentVersion}`);
} finally {
  fs.rmSync(directory, { force: true, recursive: true });
}
