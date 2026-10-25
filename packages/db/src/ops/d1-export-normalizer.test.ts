import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { normalizedD1Export } from './d1-export-normalizer.js';

test('normalizes D1 INSERT column order and explicit default extensions', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'd1-export-normalizer-'));
  const legacy = path.join(directory, 'legacy.sql');
  const target = path.join(directory, 'target.sql');
  fs.writeFileSync(legacy, `INSERT INTO "self_check_templates" ("id","item_ko","created_at") VALUES(1,'쉼표, 따옴표 ''검증''',100);\n`);
  fs.writeFileSync(target, `INSERT INTO "self_check_templates" ("learning_track","created_at","item_ko","id") VALUES('jlpt-ja',100,'쉼표, 따옴표 ''검증''',1);\n`);

  assert.equal(
    normalizedD1Export(legacy, ['learning_track']),
    normalizedD1Export(target, ['learning_track']),
  );
});

test('keeps a changed shared value visible to the checksum', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'd1-export-normalizer-'));
  const source = path.join(directory, 'source.sql');
  const target = path.join(directory, 'target.sql');
  fs.writeFileSync(source, `INSERT INTO "vocab" ("id","ko") VALUES(1,'하나');\n`);
  fs.writeFileSync(target, `INSERT INTO "vocab" ("ko","id") VALUES('둘',1);\n`);

  assert.notEqual(normalizedD1Export(source), normalizedD1Export(target));
});
