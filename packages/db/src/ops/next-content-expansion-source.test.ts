import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_PATH,
  NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256,
  NEXT_CONTENT_EXPANSION_INTAKE_FILE_SHA256,
  NEXT_CONTENT_EXPANSION_INTAKE_INPUT_FILE_SHA256,
  NEXT_CONTENT_EXPANSION_INTAKE_INPUT_PATH,
  NEXT_CONTENT_EXPANSION_PRIMARY_SOURCE_REVIEWS,
  NEXT_CONTENT_EXPANSION_SOURCE_PATH,
  NEXT_CONTENT_EXPANSION_SOURCE_SHA256,
} from '../seed/next-content-expansion-source.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../..');
const sha256 = (value: string | Buffer): string =>
  createHash('sha256').update(value).digest('hex');

test('next expansion source and tracked intake files match immutable evidence hashes', () => {
  const source = fs.readFileSync(path.join(REPO_ROOT, NEXT_CONTENT_EXPANSION_SOURCE_PATH));
  const input = fs.readFileSync(path.join(REPO_ROOT, NEXT_CONTENT_EXPANSION_INTAKE_INPUT_PATH));
  const artifactBytes = fs.readFileSync(path.join(REPO_ROOT, NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_PATH));

  assert.equal(sha256(source), NEXT_CONTENT_EXPANSION_SOURCE_SHA256);
  assert.equal(sha256(input), NEXT_CONTENT_EXPANSION_INTAKE_INPUT_FILE_SHA256);
  assert.equal(sha256(artifactBytes), NEXT_CONTENT_EXPANSION_INTAKE_FILE_SHA256);

  const artifact = JSON.parse(artifactBytes.toString('utf8')) as Record<string, unknown>;
  const { artifact_sha256: artifactSha256, ...canonicalRecord } = artifact;
  assert.equal(artifactSha256, NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256);
  assert.equal(sha256(JSON.stringify(canonicalRecord)), NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_SHA256);
  assert.equal(
    (artifact.source as { sha256: string }).sha256,
    NEXT_CONTENT_EXPANSION_SOURCE_SHA256,
  );
});

test('primary-source reviews are bounded metadata with stable SHA-256 values', () => {
  const reviews = Object.values(NEXT_CONTENT_EXPANSION_PRIMARY_SOURCE_REVIEWS);
  assert.equal(reviews.length, 7);
  assert.equal(reviews.every((review) => /^https:\/\//u.test(review.url)), true);
  assert.equal(reviews.every((review) => /^[a-f0-9]{64}$/u.test(review.sha256)), true);

  const artifact = fs.readFileSync(
    path.join(REPO_ROOT, NEXT_CONTENT_EXPANSION_INTAKE_ARTIFACT_PATH),
    'utf8',
  );
  assert.doesNotMatch(
    artifact,
    /"(?:audio|answer|choices|passage|question|r2_key|transcript)"\s*:/iu,
  );
  const intake = JSON.parse(artifact) as { facts: Array<{ id: string }> };
  assert.deepEqual(
    intake.facts
      .filter((fact) => /current-(?:test-sections|structure)$/u.test(fact.id))
      .map((fact) => fact.id)
      .sort(),
    [
      'jlpt-n1-current-test-sections',
      'jlpt-n2-current-test-sections',
      'topik-ibt-current-structure',
      'topik-pbt-current-structure',
    ],
  );
});
