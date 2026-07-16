import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { D1_TRANSFER_TABLES, EXCLUDED_TRANSIENT_TABLES, REBUILT_VIRTUAL_TABLES } from './d1-tables.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const database = process.argv.find((arg) => arg.startsWith('--database='))?.split('=')[1] ?? '';
const outputDir = path.resolve(root, process.argv.find((arg) => arg.startsWith('--out='))?.split('=').slice(1).join('=') ?? '.artifacts/d1-backup');
const config = path.resolve(root, process.argv.find((arg) => arg.startsWith('--config='))?.split('=').slice(1).join('=') ?? 'apps/api/wrangler.toml');
const allowDowntime = process.argv.includes('--allow-downtime');

if (!database) throw new Error('--database=<database> is required');
if (!allowDowntime) {
  throw new Error(
    'D1 export blocks queries while it runs; pass --allow-downtime only in an approved maintenance window',
  );
}
fs.mkdirSync(outputDir, { recursive: true });

const files = D1_TRANSFER_TABLES.map((table) => {
  const file = path.join(outputDir, `${table.name}.sql`);
  fs.rmSync(file, { force: true });
  execFileSync('pnpm', [
    'exec', 'wrangler', 'd1', 'export', database, '--remote',
    `--table=${table.name}`, '--no-schema', '--skip-confirmation',
    `--output=${file}`, `--config=${config}`,
  ], { cwd: root, stdio: 'inherit' });
  const countRaw = execFileSync('pnpm', [
    'exec', 'wrangler', 'd1', 'execute', database, '--remote', '--json',
    '--command', `SELECT count(*) AS count FROM ${table.name}`,
    `--config=${config}`,
  ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const countResult = JSON.parse(countRaw) as Array<{ results?: Array<{ count?: number }> }>;
  const rowCount = countResult[0]?.results?.[0]?.count;
  if (typeof rowCount !== 'number') throw new Error(`Could not count ${table.name}`);
  const sha256 = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  return { table: table.name, file: path.basename(file), rowCount, sha256 };
});

const manifest = {
  generatedAt: new Date().toISOString(),
  database,
  files,
  excludedTransientTables: EXCLUDED_TRANSIENT_TABLES,
  rebuiltVirtualTables: REBUILT_VIRTUAL_TABLES,
};
fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
