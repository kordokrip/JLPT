import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { D1_BACKUP_SCHEMA_QUERY, detectD1BackupSchemaProfile, parseD1SchemaTableNames, tablesForPhase, EXCLUDED_TRANSIENT_TABLES, EXCLUDED_GENERATED_METADATA_TABLES, REBUILT_VIRTUAL_TABLES } from './d1-tables.js';
import { resolveD1BackupOutputDirectory } from './d1-backup-paths.js';
import { validateD1BackupManifest, validateD1BackupManifestForSchema, type D1BackupFile } from './d1-backup-manifest.js';

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
const fragmentDir = path.join(outputDir, '.fragments');

function selectedTables() {
  if (!tablesArg) return transferTables;
  const names = tablesArg.split(',').map((name) => name.trim()).filter(Boolean);
  const selectedNames = new Set(names);
  const selected = transferTables.filter((table) => selectedNames.has(table.name));
  if (names.length === 0 || selectedNames.size !== names.length || selected.length !== selectedNames.size) {
    throw new Error('unknown or duplicate table in --tables for detected schema profile');
  }
  return selected;
}

function readFragments(): D1BackupFile[] {
  const expectedFragments = transferTables.map((table) => `${table.name}.json`).sort();
  const actualFragments = fs.readdirSync(fragmentDir).filter((name) => name.endsWith('.json')).sort();
  if (JSON.stringify(actualFragments) !== JSON.stringify(expectedFragments)) {
    throw new Error('Backup fragments do not exactly match the detected schema profile');
  }
  const files = transferTables.map((table) => {
    const fragment = path.join(fragmentDir, `${table.name}.json`);
    if (!fs.existsSync(fragment)) throw new Error(`backup fragment is missing: ${table.name}`);
    const entry = JSON.parse(fs.readFileSync(fragment, 'utf8')) as D1BackupFile & { schemaProfile?: string };
    if ((entry.schemaProfile ?? '0027') !== schemaProfile) {
      throw new Error(`Backup fragment schema profile mismatch: ${table.name}`);
    }
    const file = path.join(outputDir, entry.file);
    if (entry.table !== table.name || path.basename(entry.file) !== entry.file || !fs.existsSync(file)) {
      throw new Error(`backup fragment is invalid: ${table.name}`);
    }
    const actualHash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (actualHash !== entry.sha256) throw new Error(`backup fragment checksum mismatch: ${table.name}`);
    return { table: entry.table, file: entry.file, rowCount: entry.rowCount, sha256: entry.sha256 };
  });
  return validateD1BackupManifest({ schemaProfile, files }).files;
}

function runWrangler(args: string[], label: string): string {
  try {
    return execFileSync('pnpm', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: 'true', WRANGLER_WRITE_LOGS: '0' },
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    // Wrangler export output includes temporary signed R2 download URLs. Do not
    // expose those URLs in CI or operator logs.
    throw new Error(`D1 backup failed while ${label}`);
  }
}

function readSchemaTableNames(): string[] {
  const raw = runWrangler([
    'exec', 'wrangler', 'd1', 'execute', database, '--remote', '--json',
    '--command', D1_BACKUP_SCHEMA_QUERY, `--config=${config}`,
  ], 'reading schema metadata');
  return parseD1SchemaTableNames(raw);
}

// Detect before any export or fragment overwrite. Do not use local migration
// files to claim that an older remote database already contains 0028.
const initialSchemaTables = readSchemaTableNames();
const schemaProfile = detectD1BackupSchemaProfile(initialSchemaTables);
const transferTables = tablesForPhase('all', schemaProfile);
const manifestPath = path.join(outputDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  validateD1BackupManifestForSchema(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), initialSchemaTables);
}
fs.mkdirSync(fragmentDir, { recursive: true });

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
    if (typeof rowCount !== 'number' || !Number.isSafeInteger(rowCount) || rowCount < 0) throw new Error(`Could not count ${table.name}`);
    const entry: D1BackupFile & { schemaProfile: typeof schemaProfile } = {
      schemaProfile,
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
  schemaProfile,
  files,
  excludedTransientTables: EXCLUDED_TRANSIENT_TABLES,
  excludedGeneratedMetadataTables: EXCLUDED_GENERATED_METADATA_TABLES,
  rebuiltVirtualTables: REBUILT_VIRTUAL_TABLES,
};
// A migration during a multi-table export must not leave a 65-table manifest
// labelled complete after the database has gained the five learning tables.
validateD1BackupManifestForSchema(manifest, readSchemaTableNames());
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
