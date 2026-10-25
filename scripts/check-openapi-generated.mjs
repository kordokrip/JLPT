#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const generatedFiles = [
  new URL('../apps/web/src/types/api.d.ts', import.meta.url),
  new URL('../apps/web/src/types/admin-api.d.ts', import.meta.url),
];

const before = await Promise.all(generatedFiles.map((file) => readFile(file, 'utf8')));
const result = spawnSync('pnpm', ['openapi:generate'], {
  cwd: new URL('..', import.meta.url),
  encoding: 'utf8',
  stdio: 'inherit',
});

if (result.status !== 0) process.exit(result.status ?? 1);

const after = await Promise.all(generatedFiles.map((file) => readFile(file, 'utf8')));
const changed = generatedFiles.filter((_, index) => before[index] !== after[index]);
if (changed.length > 0) {
  console.error('OpenAPI generated types were stale:');
  for (const file of changed) console.error(`- ${file.pathname}`);
  process.exit(1);
}

console.log('OpenAPI generated types are current.');
