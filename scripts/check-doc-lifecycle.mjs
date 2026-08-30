import { access, readdir, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const required = [
  'AGENTS.md',
  'docs/README.md',
  'docs/00_overview/CURRENT_STATE.md',
  'docs/00_overview/ERROR_LEDGER.md',
  'docs/00_overview/OPERATIONS_MANAGEMENT_RUNBOOK.md',
  'docs/00_overview/QUESTION_BANK_QUALITY_PIPELINE.md',
  'docs/00_overview/LOCAL_CICD_OPERATIONS.md',
  'docs/00_overview/LOCAL_RELEASE_LEDGER.md',
  'docs/00_overview/SUB_AGENT_HANDOFF.md',
];
const retired = [
  'docs/00_overview/ERROR_LEDGER_2026-08-23.md',
  'docs/00_overview/GIT_FREE_MODE_OPERATING_MANUAL_2026-08-23.md',
  'docs/00_overview/LOCAL_VERSION_CONTROL_AND_RELEASE_LEDGER_2026-08-23.md',
  'docs/00_overview/QUESTION_BANK_QUALITY_PIPELINE_2026-08-17.md',
];

const failures = [];
for (const relative of required) {
  if (!(await exists(path.join(root, relative)))) failures.push(`required document missing: ${relative}`);
}
for (const relative of retired) {
  if (await exists(path.join(root, relative))) failures.push(`retired document path restored: ${relative}`);
}

const dbSourceFiles = await collectFiles(path.join(root, 'packages', 'db', 'src'), /\.(?:ts|json)$/u);
const directDocRefs = new Set();
for (const file of dbSourceFiles) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/docs\/[\w./-]+\.md/gu)) directDocRefs.add(match[0]);
}
for (const relative of directDocRefs) {
  if (!(await exists(path.join(root, relative)))) failures.push(`DB source document missing: ${relative}`);
}

if (failures.length > 0) {
  process.stderr.write(`Document lifecycle check failed (${failures.length}):\n${failures.map((entry) => `- ${entry}`).join('\n')}\n`);
  process.exit(1);
}

process.stdout.write(`Document lifecycle check passed: ${required.length} active documents, ${retired.length} retired paths absent, ${directDocRefs.size} direct DB source references present.\n`);

async function collectFiles(directory, pattern) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(target, pattern));
    else if (pattern.test(entry.name)) files.push(target);
  }
  return files;
}

async function exists(target) {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
