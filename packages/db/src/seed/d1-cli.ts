import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG = path.resolve(__dirname, '../../../../apps/api/wrangler.toml');

export interface D1TargetOptions {
  remote: boolean;
  database: string;
  config: string;
  persistTo?: string;
}

function optionValue(args: string[], name: string): string | undefined {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function parseD1Target(args = process.argv.slice(2)): D1TargetOptions {
  const remote = args.includes('--remote');
  if (remote && args.includes('--local')) {
    throw new Error('--local and --remote cannot be used together');
  }

  const persistTo = optionValue(args, '--persist-to');
  return {
    remote,
    database: optionValue(args, '--database') ?? 'DB',
    config: path.resolve(optionValue(args, '--config') ?? DEFAULT_CONFIG),
    ...(persistTo ? { persistTo: path.resolve(persistTo) } : {}),
  };
}

export function requireRemoteChange(kind: 'seed' | 'verify'): void {
  if (kind === 'seed' && process.env.ALLOW_PRODUCTION_CHANGE !== 'seed') {
    throw new Error(
      'Remote seed is blocked. Run only from an approved production environment with ALLOW_PRODUCTION_CHANGE=seed.',
    );
  }
}

function targetArgs(options: D1TargetOptions): string[] {
  const args = [
    'exec',
    'wrangler',
    'd1',
    'execute',
    options.database,
    options.remote ? '--remote' : '--local',
    '--config',
    options.config,
    '--yes',
  ];
  if (!options.remote && options.persistTo) {
    args.push('--persist-to', options.persistTo);
  }
  return args;
}

export function executeSqlFile(options: D1TargetOptions, filePath: string): void {
  execFileSync('pnpm', [...targetArgs(options), '--file', filePath], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
  });
}

export function querySql<T extends Record<string, unknown>>(
  options: D1TargetOptions,
  sql: string,
): T[] {
  const raw = execFileSync(
    'pnpm',
    [...targetArgs(options), '--command', sql, '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const parsed = JSON.parse(raw) as Array<{ results?: T[]; success?: boolean }>;
  if (!parsed[0]?.success && !parsed[0]?.results) {
    throw new Error(`D1 query did not return a successful result: ${sql}`);
  }
  return parsed[0]?.results ?? [];
}

export function countSql(options: D1TargetOptions, sql: string): number {
  const row = querySql<Record<string, unknown>>(options, sql)[0];
  const value = row ? Object.values(row)[0] : undefined;
  if (typeof value !== 'number') {
    throw new Error(`D1 count query returned an invalid value: ${sql}`);
  }
  return value;
}

export function argValue(name: string, args = process.argv.slice(2)): string | undefined {
  return optionValue(args, name);
}
