import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBackupId,
  rowsToInsertSql,
  sha256Hex,
  toSqlLiteral,
  validateBackupParams,
} from './backup-core.js';

test('backup parameters require explicit confirmation and valid date', () => {
  assert.deepEqual(validateBackupParams({ confirmation: 'BACKUP', date: '2026-07-18' }), {
    date: '2026-07-18',
  });
  assert.throws(() => validateBackupParams({ confirmation: 'APPLY' }), /confirmation/);
  assert.throws(() => validateBackupParams({ confirmation: 'BACKUP', date: '07-18-2026' }), /date/);
});

test('D1 values are serialized as safe SQLite literals', () => {
  assert.equal(toSqlLiteral("일본어's"), "'일본어''s'");
  assert.equal(toSqlLiteral(null), 'NULL');
  assert.equal(toSqlLiteral(42), '42');
  assert.equal(toSqlLiteral(new Uint8Array([0, 15, 255])), "X'000fff'");
  assert.equal(
    rowsToInsertSql('users', [{ id: 'a', email: "a'b@example.com" }]),
    "INSERT INTO \"users\" (\"id\", \"email\") VALUES ('a', 'a''b@example.com');\n",
  );
  assert.throws(() => toSqlLiteral(Number.NaN), /Non-finite/);
});

test('backup IDs and hashes are deterministic', async () => {
  assert.equal(
    createBackupId('2026-07-18', '2026-07-18T01:02:03.456Z'),
    '2026-07-18/2026-07-18T01-02-03-456Z',
  );
  assert.equal(
    await sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});
