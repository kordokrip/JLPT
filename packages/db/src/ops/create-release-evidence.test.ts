import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildReleaseEvidenceRecord, runReleaseEvidenceCli } from './create-release-evidence.js';

const SHA = 'a'.repeat(64);

function fixtureDirectory(): { dir: string; manifest: string; report: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'nihongo-n3-release-evidence-'));
  const manifest = path.join(dir, 'manifest.json');
  const report = path.join(dir, 'report.json');
  writeFileSync(manifest, '{"release":"topik-i"}\n', 'utf8');
  writeFileSync(report, '{"result":"passed"}\n', 'utf8');
  return { dir, manifest, report };
}

test('builds an immutable local evidence record from artifact files only', () => {
  const fixture = fixtureDirectory();
  try {
    const record = buildReleaseEvidenceRecord({
      releaseId: 'topik-i-practice-v1',
      learningTrack: 'topik-ko',
      contentRelease: 'topik-i',
      lifecycleState: 'approved',
      sourceBranch: 'feature/topik-product-expansion',
      commitSha: 'ec796f898ebcf900a18d18e33206cd1e84cdeb50',
      pullRequestRef: null,
      manifestPath: fixture.manifest,
      verificationReportPath: fixture.report,
      migrations: ['0012_content_release_contract.sql', '0013_content_release_control_plane.sql'],
      workerRelease: null,
      pagesDeployment: null,
      gateReportPaths: Object.fromEntries(['G0', 'G1', 'G2', 'G3', 'G4'].map((gate) => [gate, {
        state: 'passed', recordedBy: 'operator', path: fixture.report,
      }])) as Parameters<typeof buildReleaseEvidenceRecord>[0]['gateReportPaths'],
      generatedAt: '2026-07-28T00:00:00Z',
    });
    assert.equal(record.gates.length, 5);
    assert.equal(record.manifest.key.split('/')[4], record.manifest.sha256);
    assert.deepEqual(record.migration_ids, ['0012_content_release_contract.sql', '0013_content_release_control_plane.sql']);
    assert.notEqual(record.manifest.sha256, SHA);
  } finally {
    rmSync(fixture.dir, { recursive: true, force: true });
  }
});

test('CLI writes a local artifact and refuses remote execution flags', () => {
  const fixture = fixtureDirectory();
  try {
    const output = path.join(fixture.dir, 'evidence.json');
    const args = [
      '--release-id=topik-i-practice-v1', '--track=topik-ko', '--content-release=topik-i', '--state=approved',
      '--branch=feature/topik-product-expansion', '--commit=ec796f898ebcf900a18d18e33206cd1e84cdeb50',
      `--manifest=${fixture.manifest}`, `--verification-report=${fixture.report}`,
      '--migration=0012_content_release_contract.sql', '--migration=0013_content_release_control_plane.sql', `--out=${output}`,
      ...['G0', 'G1', 'G2', 'G3', 'G4'].map((gate) => `--gate-report=${gate}|passed|system|${fixture.report}`),
    ];
    assert.equal(runReleaseEvidenceCli(args), output);
    assert.equal(JSON.parse(readFileSync(output, 'utf8')).release_id, 'topik-i-practice-v1');
    assert.throws(() => runReleaseEvidenceCli([...args, '--remote']), /local-only/);
  } finally {
    rmSync(fixture.dir, { recursive: true, force: true });
  }
});
