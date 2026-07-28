import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTopikOfficialReferenceSeedPlan,
  parseTopikOfficialStatistics,
} from '../seed/topik-official-reference.js';

test('official TOPIK applicant data is complete and deterministic', () => {
  const rows = parseTopikOfficialStatistics();
  assert.equal(rows.length, 1_056);
  assert.equal(new Set(rows.map((row) => row.countryNameKo)).size, 88);
  assert.equal(rows.filter((row) => row.examLevel === 'TOPIK-I').length, 528);
  assert.equal(rows.filter((row) => row.examLevel === 'TOPIK-II').length, 528);

  const first = buildTopikOfficialReferenceSeedPlan();
  const second = buildTopikOfficialReferenceSeedPlan();
  assert.equal(first.manifest.manifestSha256, second.manifest.manifestSha256);
  assert.equal(first.manifest.blueprints.length, 5);
  assert.equal(first.manifest.statistics.expectedRows, rows.length);
  assert.equal(first.manifest.blueprints.find((item) => item.id === 'topik-i-pbt-listening')?.questionCount, 30);
  assert.equal(first.manifest.blueprints.find((item) => item.id === 'topik-i-pbt-reading')?.questionCount, 40);
  assert.equal(first.manifest.blueprints.find((item) => item.id === 'topik-ii-pbt-writing')?.questionCount, 4);
});
