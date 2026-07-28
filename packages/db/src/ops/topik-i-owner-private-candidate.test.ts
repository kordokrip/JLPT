import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTopikIOwnerPrivateCandidateSql,
  loadTopikIOwnerPrivateCandidate,
  topikItemLearningPayloadSha256,
} from '../seed/topik-i-owner-private-candidate.js';
import { loadTopikIPreviewCandidate } from '../seed/topik-i-preview-candidate.js';

test('owner-private TOPIK I v3 is new immutable metadata over unchanged four-item learning material', () => {
  const v1 = loadTopikIPreviewCandidate();
  const v2 = loadTopikIOwnerPrivateCandidate();

  assert.notEqual(v2.release.id, v1.release.id);
  assert.equal(v2.release.releaseState, 'draft');
  assert.equal(v2.provenance.author, 'author-ksh');
  assert.equal(v2.provenance.firstReviewStatus, 'pending');
  assert.equal(v2.provenance.secondReviewStatus, 'pending');
  assert.notEqual(v2.provenance.firstReviewer, v2.provenance.secondReviewer);
  assert.match(v2.provenance.allowedUse, /^owner-private only;/);
  assert.doesNotMatch(v2.provenance.allowedUse, /human sign-off|remote seed before/i);
  assert.equal(v2.units.length, 2);
  assert.equal(v2.items.length, 4);
  assert.deepEqual(
    v2.items.map(topikItemLearningPayloadSha256),
    v1.items.map(topikItemLearningPayloadSha256),
  );
  assert.equal(v2.ownerPrivatePolicy.claimMethod, 'authenticated_admin_session');
  assert.equal(v2.ownerPrivatePolicy.publicPublishProhibited, true);
  assert.match(v2.release.manifestSha256, /^[a-f0-9]{64}$/);
  assert.match(v2.ownerPrivatePolicy.attestationSha256, /^[a-f0-9]{64}$/);

  const statements = buildTopikIOwnerPrivateCandidateSql();
  assert.equal(statements.some((statement) => /owner_user_id/i.test(statement)), false);
  assert.equal(statements.some((statement) => /release_state\s*=\s*'published'/i.test(statement)), false);
  assert.equal(statements.every((statement) => /ON CONFLICT DO NOTHING;/i.test(statement)), true);
});
