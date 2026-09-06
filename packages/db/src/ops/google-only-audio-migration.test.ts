import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const migration = fs.readFileSync(
  path.resolve(import.meta.dirname, '../../drizzle-v2/0020_content_audio_binding_activations.sql'),
  'utf8',
);

test('pending migration blocks every R2 pronunciation activation path', () => {
  assert.match(migration, /content_source_assets_google_only_pronunciation_insert/);
  assert.match(migration, /content_audio_bindings_google_only_insert/);
  assert.match(migration, /R2 pronunciation assets are disabled/);
  assert.match(migration, /R2 pronunciation bindings are disabled/);
  assert.doesNotMatch(migration, /CREATE TABLE `content_audio_binding_activations`/);
});
