import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256,
  buildNextContentExpansionQualityReport,
} from './next-content-expansion-quality.js';

test('next expansion draft passes all structural and Google-only quality checks', () => {
  const report = buildNextContentExpansionQualityReport('2026-08-23T00:00:00.000Z');
  assert.equal(report.passed, true, report.errors.join('\n'));
  assert.deepEqual(report.counts, {
    jlpt_n2: 60,
    jlpt_n1: 60,
    topik: 40,
    total: 160,
    topik_listening: 8,
    topik_writing: 8,
    r2_pronunciation_references: 0,
  });
  assert.match(NEXT_CONTENT_EXPANSION_FINAL_DRAFT_SHA256, /^[a-f0-9]{64}$/u);
  assert.equal(report.checks.every((check) => check.passed), true);
});
