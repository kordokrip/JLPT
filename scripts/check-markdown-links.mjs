import { access, readdir, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const scannedRoots = [
  path.join(repoRoot, 'AGENTS.md'),
  path.join(repoRoot, 'README.md'),
  path.join(repoRoot, 'PROJECT_CODEBASE_ANALYSIS.md'),
  path.join(repoRoot, 'docs'),
  path.join(repoRoot, '.codex', 'skills'),
];
const markdownLink = /\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/g;
const files = await collectMarkdown(scannedRoots);
const failures = [];
let linksChecked = 0;

for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(markdownLink)) {
    const target = (match[1] ?? match[2] ?? '').trim();
    if (!isRelativeFileTarget(target)) continue;
    linksChecked += 1;
    const relativeTarget = target.split('#', 1)[0].split('?', 1)[0];
    if (!relativeTarget) continue;
    const candidate = path.resolve(path.dirname(file), decodeURIComponent(relativeTarget));
    if (!isInsideRepository(candidate) || !(await exists(candidate))) failures.push(`${path.relative(repoRoot, file)} -> ${target}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`Broken relative Markdown links (${failures.length}):\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
  process.exit(1);
}

process.stdout.write(`Markdown link check passed: ${files.length} files, ${linksChecked} relative links.\n`);

async function collectMarkdown(entries) {
  const files = [];
  for (const entry of entries) {
    const type = await targetType(entry);
    if (type === 'file') {
      if (entry.endsWith('.md')) files.push(entry);
      continue;
    }
    if (type !== 'directory') continue;
    for (const child of await readdir(entry, { withFileTypes: true })) {
      if (child.name === '.git' || child.name === 'node_modules') continue;
      files.push(...await collectMarkdown([path.join(entry, child.name)]));
    }
  }
  return files;
}

function isRelativeFileTarget(target) {
  return target.length > 0 && !target.startsWith('#') && !target.startsWith('/') && !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target);
}

function isInsideRepository(candidate) {
  return candidate === repoRoot || candidate.startsWith(`${repoRoot}${path.sep}`);
}

async function exists(target) {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function targetType(target) {
  try {
    await readdir(target);
    return 'directory';
  } catch {
    return (await exists(target)) ? 'file' : 'missing';
  }
}
