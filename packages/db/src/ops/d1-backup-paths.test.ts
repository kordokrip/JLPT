import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { resolveD1BackupOutputDirectory } from './d1-backup-paths.js';

const root = '/workspace/JLPT';

test('refuses an omitted or empty release ID that resolves to the shared backup root', () => {
  assert.throws(
    () => resolveD1BackupOutputDirectory(root, '.artifacts/d1-backup/'),
    /refusing the shared backup root/,
  );
  assert.throws(
    () => resolveD1BackupOutputDirectory(root, undefined),
    /refusing the shared backup root/,
  );
});

test('keeps each local backup in an explicit release directory', () => {
  assert.equal(
    resolveD1BackupOutputDirectory(root, '.artifacts/d1-backup/topik-i-20260728'),
    path.join(root, '.artifacts/d1-backup/topik-i-20260728'),
  );
});
