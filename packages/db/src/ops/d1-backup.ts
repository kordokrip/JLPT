import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { D1_TRANSFER_TABLES, EXCLUDED_TRANSIENT_TABLES, REBUILT_VIRTUAL_TABLES } from './d1-tables.js';
import { resolveD1BackupOutputDirectory } from './d1-backup-paths.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const database = process.argv.find((arg) => arg.startsWith('--database='))?.split('=')[1] ?? '';
const outputArgument = process.argv.find((arg) => arg.startsWith('--out='))?.split('=').slice(1).join('=');
const outputDir = resolveD1BackupOutputDirectory(root, outputArgument);
const config = path.resolve(root, process.argv.find((arg) => arg.startsWith('--config='))?.split('=').slice(1).join('=') ?? 'apps/api/wrangler.toml');
const allowDowntime = process.argv.includes('--allow-downtime');
const finalize = process.argv.includes('--finalize');
const tablesArg = process.argv.find((arg) => arg.startsWith('--tables='))?.slice('--tables='.length);

if (!database) throw new Error('--database=<database> is required');
if (!allowDowntime) {
  throw new Error(
    'D1 export blocks queries while it runs; pass --allow-downtime only in an approved maintenance window',
  );
}
fs.mkdirSync(outputDir, { recursive: true });
const fragmentDir = path.join(outputDir, '.fragments');
fs.mkdirSync(fragmentDir, { recursive: true });

type BackupFile = {
  table: string;
  file: string;
  rowCount: number;
  sha256: string;
};

function selectedTables() {
  if (!tablesArg) return [...D1_TRANSFER_TABLES];
  const selectedNames = new Set(tablesArg.split(',').map((name) => name.trim()).filter(Boolean));
  const selected = D1_TRANSFER_TABLES.filter((table) => selectedNames.has(table.name));
  if (selected.length !== selectedNames.size) {
    throw new Error('unknown table in --tables');
  }
  return selected;
}

function readFragments(): BackupFile[] {
  return D1_TRANSFER_TABLES.map((table) => {
    const fragment = path.join(fragmentDir, `${table.name}.json`);
    if (!fs.existsSync(fragment)) throw new Error(`backup fragment is missing: ${table.name}`);
    const entry = JSON.parse(fs.readFileSync(fragment, 'utf8')) as BackupFile;
    const file = path.join(outputDir, entry.file);
    if (entry.table !== table.name || path.basename(entry.file) !== entry.file || !fs.existsSync(file)) {
      throw new Error(`backup fragment is invalid: ${table.name}`);
    }
    const actualHash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (actualHash !== entry.sha256) throw new Error(`backup fragment checksum mismatch: ${table.name}`);
    return entry;
  });
}

function runWrangler(args: string[], label: string): string {
  try {
    return execFileSync('pnpm', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    // Wrangler export output includes temporary signed R2 download URLs. Do not
    // expose those URLs in CI or operator logs.
    throw new Error(`D1 backup failed while ${label}`);
  }
}

if (!finalize) {
  for (const table of selectedTables()) {
    const file = path.join(outputDir, `${table.name}.sql`);
    fs.rmSync(file, { force: true });
    runWrangler([
      'exec', 'wrangler', 'd1', 'export', database, '--remote',
      `--table=${table.name}`, '--no-schema', '--skip-confirmation',
      `--output=${file}`, `--config=${config}`,
    ], `exporting ${table.name}`);
    const countRaw = runWrangler([
      'exec', 'wrangler', 'd1', 'execute', database, '--remote', '--json',
      '--command', `SELECT count(*) AS count FROM ${table.name}`,
      `--config=${config}`,
    ], `counting ${table.name}`);
    const countResult = JSON.parse(countRaw) as Array<{ results?: Array<{ count?: number }> }>;
    const rowCount = countResult[0]?.results?.[0]?.count;
    if (typeof rowCount !== 'number') throw new Error(`Could not count ${table.name}`);
    const entry: BackupFile = {
      table: table.name,
      file: path.basename(file),
      rowCount,
      sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
    };
    fs.writeFileSync(path.join(fragmentDir, `${table.name}.json`), `${JSON.stringify(entry)}\n`, 'utf8');
    console.log(`  backed up ${table.name}: ${rowCount} rows`);
  }
  if (tablesArg) process.exit(0);
}

const files = readFragments();

const manifest = {
  generatedAt: new Date().toISOString(),
  database,
  files,
  excludedTransientTables: EXCLUDED_TRANSIENT_TABLES,
  rebuiltVirtualTables: REBUILT_VIRTUAL_TABLES,
};
fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
