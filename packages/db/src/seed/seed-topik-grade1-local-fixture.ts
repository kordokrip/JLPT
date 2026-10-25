import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildTopikGrade1LocalFixturePlan } from './topik-grade1-local-fixture.js';
import { argValue, executeSqlFile, parseD1Target } from './d1-cli.js';
import { chunk } from './utils.js';

const target = parseD1Target();
if (target.remote) throw new Error('The TOPIK grade 1 local fixture is never seeded remotely. Pass --local.');

const manifestOut = path.resolve(argValue('--manifest-out') ?? '.artifacts/db/topik-grade1-local-fixture-manifest.json');
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-n3-topik-grade1-fixture-'));

try {
  const plan = buildTopikGrade1LocalFixturePlan();
  fs.mkdirSync(path.dirname(manifestOut), { recursive: true });
  fs.writeFileSync(manifestOut, `${JSON.stringify(plan.manifest, null, 2)}\n`, 'utf8');
  for (const [index, statements] of chunk(plan.statements, 100).entries()) {
    const sqlPath = path.join(workDir, `topik-grade1-fixture-${index}.sql`);
    fs.writeFileSync(sqlPath, `${statements.join('\n\n')}\n`, 'utf8');
    executeSqlFile(target, sqlPath);
  }
  console.log(JSON.stringify({ event: 'topik_grade1_local_fixture_seeded', manifest: manifestOut, ...plan.manifest }, null, 2));
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
