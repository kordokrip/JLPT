import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPO_ROOT } from '../seed/constants.js';
import { executeSqlFile, parseD1Target, querySql } from '../seed/d1-cli.js';
import {
  buildTopikPracticeV2SeedPlan,
  TOPIK_PRACTICE_V2_BANK_VERSION,
  TOPIK_PRACTICE_V2_TRACK,
} from '../seed/topik-practice-bank-v2.js';

const PRODUCTION_TARGET = 'nihongo-n3-prod-v2';
const PREVIEW_TARGET = 'nihongo-n3-topik-preview';
const target = parseD1Target();
const publish = process.argv.includes('--publish');
if (target.remote && target.database === PRODUCTION_TARGET && (!publish || process.env.ALLOW_PRODUCTION_CHANGE !== 'topik-practice-v2-seed')) {
  throw new Error(`Production TOPIK practice v2 seed requires --database=${PRODUCTION_TARGET}, --publish, and ALLOW_PRODUCTION_CHANGE=topik-practice-v2-seed.`);
}
if (target.remote && target.database === PREVIEW_TARGET && process.env.ALLOW_TOPIK_PREVIEW_CHANGE !== 'topik-practice-v2-seed') {
  throw new Error(`Preview TOPIK practice v2 seed requires --database=${PREVIEW_TARGET} and ALLOW_TOPIK_PREVIEW_CHANGE=topik-practice-v2-seed.`);
}
if (target.remote && target.database !== PRODUCTION_TARGET && target.database !== PREVIEW_TARGET) {
  throw new Error(`Remote TOPIK practice v2 seed is restricted to ${PREVIEW_TARGET} or ${PRODUCTION_TARGET}.`);
}

const plan = buildTopikPracticeV2SeedPlan();
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-topik-practice-seed-'));
const sqlPath = path.join(directory, 'seed.sql');
try {
  fs.writeFileSync(sqlPath, `${plan.statements.join('\n\n')}\n`, 'utf8');
  executeSqlFile(target, sqlPath);
  const rows = querySql<{ count: number }>(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE learning_track = '${TOPIK_PRACTICE_V2_TRACK}' AND bank_version = '${TOPIK_PRACTICE_V2_BANK_VERSION}' AND is_published = 1`)[0]?.count ?? 0;
  const publishedV1 = querySql<{ count: number }>(target, `SELECT count(*) AS count FROM topik_practice_questions WHERE learning_track = '${TOPIK_PRACTICE_V2_TRACK}' AND bank_version = 'v1' AND is_published = 1`)[0]?.count ?? 0;
  const auditRows = querySql<{ count: number }>(target, `SELECT count(*) AS count FROM content_quality_audits WHERE learning_track = '${TOPIK_PRACTICE_V2_TRACK}' AND content_type = 'topik-practice' AND content_version = '${plan.manifest.contentVersion}' AND release_state = 'published'`)[0]?.count ?? 0;
  if (rows !== plan.manifest.questions.expectedRows || publishedV1 !== 0 || auditRows !== rows) {
    throw new Error(`TOPIK practice v2 seed verification failed: v2=${rows}/${plan.manifest.questions.expectedRows}, v1-published=${publishedV1}, quality-ledger=${auditRows}.`);
  }
  console.log(`TOPIK practice v2 bank seeded: ${rows} self-authored questions; v1 is unpublished; ${auditRows} quality-ledger entries; ${plan.manifest.contentVersion}`);
} finally {
  fs.rmSync(directory, { force: true, recursive: true });
}
