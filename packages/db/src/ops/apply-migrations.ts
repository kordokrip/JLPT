import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const database = process.argv.find((arg) => arg.startsWith('--database='))?.split('=')[1] ?? '';
const config = path.resolve(root, 'apps/api/wrangler.toml');

if (!database) throw new Error('--database=<blue-green target database> is required');
if (process.env['ALLOW_PRODUCTION_CHANGE'] !== 'migrations') {
  throw new Error('set ALLOW_PRODUCTION_CHANGE=migrations after local verification and a Cloudflare maintenance review');
}

execFileSync('pnpm', [
  'exec', 'wrangler', 'd1', 'migrations', 'apply', database,
  '--remote', `--config=${config}`,
], { cwd: root, stdio: 'inherit' });
