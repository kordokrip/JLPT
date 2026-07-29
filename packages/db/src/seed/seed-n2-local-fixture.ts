import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildN2LocalFixturePlan } from './n2-local-fixture.js';
import { argValue, executeSqlFile, parseD1Target } from './d1-cli.js';
import { chunk } from './utils.js';

const target = parseD1Target();
if (target.remote) throw new Error('The N2 local fixture is never seeded remotely. Pass --local.');

const manifestOut = path.resolve(argValue('--manifest-out') ?? '.artifacts/db/n2-local-fixture-manifest.json');
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-n3-n2-fixture-'));

try {
  const plan = buildN2LocalFixturePlan();
  fs.mkdirSync(path.dirname(manifestOut), { recursive: true });
  fs.writeFileSync(manifestOut, `${JSON.stringify(plan.manifest, null, 2)}\n`, 'utf8');
  for (const [index, statements] of chunk(plan.statements, 100).entries()) {
    const sqlPath = path.join(workDir, `n2-fixture-${index}.sql`);
    fs.writeFileSync(sqlPath, `${statements.join('\n\n')}\n`, 'utf8');
    executeSqlFile(target, sqlPath);
  }
  console.log(JSON.stringify({ event: 'n2_local_fixture_seeded', manifest: manifestOut, ...plan.manifest }, null, 2));
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
