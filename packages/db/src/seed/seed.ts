import fs from 'node:fs';
import path from 'node:path';

import { buildContentSeedPlan } from './content-manifest.js';
import {
  argValue,
  executeSqlFile,
  parseD1Target,
  requireRemoteChange,
} from './d1-cli.js';
import { REPO_ROOT } from './constants.js';
import { chunk } from './utils.js';

const CHUNK_SIZE = 800;
const target = parseD1Target();
if (target.remote) requireRemoteChange('seed');

const manifestPath = path.resolve(
  argValue('--manifest-out') ?? path.join(REPO_ROOT, '.artifacts/db/content-manifest.json'),
);
const tmpDir = path.join(REPO_ROOT, `.tmp-seed-${process.pid}`);

console.log(`\nSeed start (${target.remote ? 'remote' : 'local'}, database=${target.database})\n`);

try {
  const plan = buildContentSeedPlan();
  console.log(
    `Content version=${plan.manifest.contentVersion} parser=${plan.manifest.parserVersion} run=${plan.manifest.seedRunId}`,
  );
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(plan.manifest, null, 2)}\n`, 'utf8');

  fs.mkdirSync(tmpDir, { recursive: true });
  const chunks = chunk(plan.statements, CHUNK_SIZE);
  for (const [index, statements] of chunks.entries()) {
    const sqlFile = path.join(tmpDir, `seed_${String(index).padStart(4, '0')}.sql`);
    fs.writeFileSync(sqlFile, `${statements.join('\n\n')}\n`, 'utf8');
    process.stdout.write(`  [${index + 1}/${chunks.length}] ${statements.length} statements`);
    executeSqlFile(target, sqlFile);
    process.stdout.write(' OK\n');
  }

  for (const entry of plan.manifest.entries) {
    console.log(
      `  ${entry.sourceCode.padEnd(3)} ${entry.table.padEnd(18)} rows=${entry.expectedRows} categories=${entry.expectedCategories} sha256=${entry.sha256.slice(0, 12)}`,
    );
  }
  const homophones = plan.manifest.derivedContent.homophonePairs;
  console.log(
    `  HMP ${'homophone_pairs'.padEnd(18)} rows=${homophones.expectedRows} sha256=${homophones.sha256.slice(0, 12)} parser=${homophones.parserVersion}`,
  );
  console.log(`\nSeed complete. Manifest: ${manifestPath}\n`);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
