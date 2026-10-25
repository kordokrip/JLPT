import fs from 'node:fs';
import path from 'node:path';

import { argValue, parseD1Target, querySqlBatch } from '../seed/d1-cli.js';
import { REPO_ROOT } from '../seed/constants.js';
import {
  buildGrowthReadinessReport,
  growthReadinessQueries,
  type GrowthThresholdRow,
  type JlptAccuracyRow,
  type SpeechOutcomeRow,
  type TopikOwnerActivityRow,
} from './growth-readiness.js';

const target = parseD1Target();
const windowArg = argValue('--window') ?? '30d';
if (windowArg !== '7d' && windowArg !== '30d') {
  throw new Error('--window must be 7d or 30d');
}

const windowDays = windowArg === '7d' ? 7 : 30;
const now = new Date();
const cutoff = Math.floor((now.getTime() - windowDays * 86_400_000) / 1000);
const reportArg = argValue('--report');
const reportPath = reportArg
  ? (path.isAbsolute(reportArg) ? reportArg : path.join(REPO_ROOT, reportArg))
  : path.join(REPO_ROOT, `.artifacts/metrics/growth-readiness-${windowArg}.json`);

const [thresholdRows, jlptRows, topikRows, speechRows] = querySqlBatch<Record<string, unknown>>(
  target,
  growthReadinessQueries(cutoff),
);

const report = buildGrowthReadinessReport({
  windowDays,
  generatedAt: now.toISOString(),
  from: new Date(cutoff * 1000).toISOString(),
  target: {
    remote: target.remote,
    database: target.database,
    ...(target.env ? { env: target.env } : {}),
  },
  ...(thresholdRows?.[0]
    ? { threshold: thresholdRows[0] as unknown as GrowthThresholdRow }
    : {}),
  jlptAccuracy: (jlptRows ?? []) as unknown as JlptAccuracyRow[],
  topikOwnerActivity: (topikRows ?? []) as unknown as TopikOwnerActivityRow[],
  speechOutcomes: (speechRows ?? []) as unknown as SpeechOutcomeRow[],
});

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Growth readiness: ${reportPath}`);
console.log(JSON.stringify({
  window: report.window,
  thresholds: report.thresholds,
  allThresholdsReached: report.allThresholdsReached,
  releaseBlocking: report.releaseBlocking,
}, null, 2));
