import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTopikIPreviewCandidateSql,
  loadTopikIPreviewCandidate,
} from '../seed/topik-i-preview-candidate.js';

test('TOPIK I preview candidate is self-authored, complete, and draft-only', () => {
  const candidate = loadTopikIPreviewCandidate();
  assert.equal(candidate.release.learningTrack, 'topik-ko');
  assert.equal(candidate.release.releaseState, 'draft');
  assert.equal(candidate.provenance.sourceType, 'self-authored');
  assert.equal(candidate.provenance.firstReviewStatus, 'pending');
  assert.equal(candidate.provenance.secondReviewStatus, 'pending');
  assert.equal(candidate.provenance.firstReviewedAt, null);
  assert.equal(candidate.provenance.secondReviewedAt, null);
  assert.equal(candidate.units.length, 2);
  assert.deepEqual(candidate.manifest.expectedRows.bySection, { listening: 2, writing: 0, reading: 2 });
  assert.equal(candidate.items.every((item) => item.promptKo && item.promptJa && item.promptEn && item.explanationKo && item.explanationJa && item.explanationEn), true);
  assert.match(candidate.release.manifestSha256, /^[a-f0-9]{64}$/);
  const statements = buildTopikIPreviewCandidateSql();
  assert.equal(statements.some((statement) => /release_state\s*=\s*'published'/i.test(statement)), false);
  assert.equal(statements.every((statement) => /ON CONFLICT DO NOTHING;/i.test(statement)), true);
});
