import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { commandArtifactGate } from '../lib/release-evidence.mjs';
test('command gates use artifact, not the prerequisite path field',()=>{
  const path=join(mkdtempSync(join(tmpdir(),'synthetic-gate-key-')),'fixture.log');
  writeFileSync(path,'synthetic unit test log; not actual publication evidence');
  const gate=commandArtifactGate(path,'synthetic test command');
  assert.equal(gate.artifact,path);
  assert.equal('path' in gate,false);
  assert.match(gate.sha256,/^[a-f0-9]{64}$/);
  assert.throws(()=>commandArtifactGate(path,''));
});
