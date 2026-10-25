import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';
import { executeSqlFile, parseD1Target, querySql } from '../seed/d1-cli.js';
import { buildTopikOfficialReferenceSeedPlan, TOPIK_OFFICIAL_SOURCE_CODE } from '../seed/topik-official-reference.js';

const target = parseD1Target();
const publish = process.argv.includes('--publish');

if (target.remote && (!publish || process.env.ALLOW_PRODUCTION_CHANGE !== 'topik-official-seed')) {
  throw new Error('Remote official TOPIK seed requires --publish and ALLOW_PRODUCTION_CHANGE=topik-official-seed.');
}

const plan = buildTopikOfficialReferenceSeedPlan();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-topik-official-seed-'));
const sqlPath = path.join(tempDir, 'seed.sql');
try {
  fs.writeFileSync(sqlPath, `${plan.statements.join('\n\n')}\n`, 'utf8');
  executeSqlFile(target, sqlPath);
  const rows = querySql<{ count: number }>(target, `SELECT count(*) AS count FROM topik_official_statistics WHERE source_code = '${TOPIK_OFFICIAL_SOURCE_CODE}'`)[0]?.count ?? 0;
  const blueprints = querySql<{ count: number }>(target, "SELECT count(*) AS count FROM topik_exam_blueprints WHERE learning_track = 'topik-ko'")[0]?.count ?? 0;
  if (rows !== plan.manifest.statistics.expectedRows || blueprints !== plan.manifest.blueprints.length) {
    throw new Error(`TOPIK official seed verification failed: statistics=${rows}, blueprints=${blueprints}.`);
  }
  console.log(`TOPIK official reference seeded: ${rows} statistic rows, ${blueprints} blueprint rows, ${plan.manifest.contentVersion}`);
} finally {
  fs.rmSync(tempDir, { force: true, recursive: true });
}
