import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { defaultPreview160V3Paths, toGenericQuestionBank, validatePreview160V3 } from './preview160-v3-quality.js';

test('actual immutable v3 and both actual reviews pass the complete profile', () => {
  const result = validatePreview160V3();
  assert.equal(result.passed, true, result.errors.join('\n'));
  assert.deepEqual(result.counts, { total:160,jlpt_n2:60,jlpt_n1:60,topik:40,choice:152,writing:8,audio:38,r2_references:0 });
  const generic = toGenericQuestionBank(result) as { items: unknown[] };
  assert.equal(generic.items.length, 160);
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'preview160-v3-portable-'));
  try {
    const input=path.join(directory,'bank.json'), output=path.join(directory,'report.json');
    fs.writeFileSync(input,`${JSON.stringify(generic)}\n`);
    const run=spawnSync('python3',['.codex/skills/question-bank-quality/scripts/check_question_bank.py','--input',input,'--output',output,'--max-answer-imbalance','1'],{cwd:path.resolve(process.cwd(),'../..'),encoding:'utf8'});
    assert.equal(run.status,0,`${run.stdout}\n${run.stderr}`);
    assert.equal(JSON.parse(fs.readFileSync(output,'utf8')).passed,true);
  } finally { fs.rmSync(directory,{recursive:true,force:true}); }
});

test('raw hash preflight rejects changed review before consuming its claims', () => {
  const paths = defaultPreview160V3Paths(), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'preview160-v3-quality-'));
  try {
    const changed = path.join(dir, 'review.json'); fs.copyFileSync(paths.reviewA, changed); fs.appendFileSync(changed, ' ');
    assert.throws(() => validatePreview160V3({ ...paths, reviewA: changed }), /review A raw SHA-256 mismatch/u);
  } finally { fs.rmSync(dir, { recursive:true, force:true }); }
});
