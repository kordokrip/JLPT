import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type AppliedMigration = {
  id: number;
  name: string;
  applied_at: string;
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const migrationsDir = path.join(root, 'packages/db/drizzle-v2');

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function firstResults(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  const first = value[0] as { results?: unknown[] } | undefined;
  return first?.results ?? [];
}

function main(): void {
  const database = argument('database') ?? '';
  if (!database) throw new Error('--database=<D1 database> is required');
  const local = process.argv.includes('--local');
  const config = path.resolve(root, argument('config') ?? 'apps/api/wrangler.toml');
  const output = path.resolve(
    root,
    argument('out') ?? `.artifacts/d1-blue-green/${Date.now()}/migration-ledger.json`,
  );
  const expected = fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const raw = execFileSync('pnpm', [
    'exec', 'wrangler', 'd1', 'execute', database, local ? '--local' : '--remote', '--json',
    '--command=SELECT id, name, applied_at FROM d1_migrations ORDER BY id',
    `--config=${config}`,
  ], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const applied = firstResults(JSON.parse(raw) as unknown) as AppliedMigration[];
  const appliedNames = applied.map((migration) => migration.name);
  const missing = expected.filter((name) => !appliedNames.includes(name));
  const unexpected = appliedNames.filter((name) => !expected.includes(name));
  const orderMatches = expected.length === appliedNames.length &&
    expected.every((name, index) => name === appliedNames[index]);
  const report = {
    generatedAt: new Date().toISOString(),
    database,
    location: local ? 'local' : 'remote',
    expected,
    applied,
    missing,
    unexpected,
    orderMatches,
    verified: expected.length > 0 && missing.length === 0 && unexpected.length === 0 && orderMatches,
  };

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  console.log(`Migration ledger report: ${output}`);
  if (!report.verified) process.exitCode = 1;
}

main();
