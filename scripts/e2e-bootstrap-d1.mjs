import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationPaths = [
  join(root, 'packages/db/drizzle/0000_init.sql'),
  join(root, 'packages/db/drizzle/0001_self_check_templates.sql'),
  join(root, 'packages/db/drizzle/0002_jlpt_n3_practice_content.sql'),
  join(root, 'packages/db/src/migrate/phase8-audio-reading.sql'),
  join(root, 'packages/db/src/migrate/phase9-push.sql'),
];
const outPath = join(root, '.tmp-e2e-migration.sql');

function extractStatements(filePath) {
  const filteredLines = readFileSync(filePath, 'utf-8')
  .split('\n')
  .filter((line) => {
    const t = line.trim();
    return t && !t.startsWith('--') && !/^PRAGMA\s/i.test(t);
  });

  const statements = [];
  let current = '';
  let depth = 0;

  for (const line of filteredLines) {
    const up = line.trim().toUpperCase();
    if (up === 'BEGIN') depth++;
    if (up === 'END;') depth = Math.max(0, depth - 1);

    current += line + '\n';

    if (depth === 0 && line.trim().endsWith(';')) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

const statements = migrationPaths.flatMap(extractStatements).filter((stmt) => {
  if (/CREATE\s+VIRTUAL\s+TABLE|vocab_fts|sentences_fts/i.test(stmt)) return false;
  if (/^ALTER\s+TABLE/i.test(stmt)) return false;
  return true;
});

writeFileSync(outPath, statements.join('\n\n') + '\n', 'utf-8');

try {
  execFileSync(
    'pnpm',
    [
      '-C', 'apps/api',
      'exec', 'wrangler', 'd1', 'execute', 'nihongo-n3-prod',
      '--local',
      '--config', 'wrangler.toml',
      '--file', outPath,
      '--yes',
    ],
    { cwd: root, stdio: 'inherit' },
  );
} finally {
  rmSync(outPath, { force: true });
}
