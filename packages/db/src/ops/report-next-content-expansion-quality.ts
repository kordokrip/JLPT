import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT } from '../seed/constants.js';
import { buildNextContentExpansionQualityReport } from './next-content-expansion-quality.js';

const reportArg = process.argv.find((argument) => argument.startsWith('--report='));
const requested = reportArg?.slice('--report='.length)
  ?? '.artifacts/content-quality/next-content-expansion-draft-2026-08-23.json';
const reportPath = path.resolve(REPO_ROOT, requested);
const report = buildNextContentExpansionQualityReport();
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Next content expansion quality report: ${reportPath}`);
console.log(`Draft SHA-256: ${report.final_draft_sha256}`);
console.log(`Items: ${report.counts.total}; passed=${report.passed}`);
if (!report.passed) {
  for (const error of report.errors) console.error(error);
  process.exitCode = 1;
}

void fileURLToPath(import.meta.url);
