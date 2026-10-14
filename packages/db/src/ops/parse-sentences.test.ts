import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { parseSentences } from '../seed/parse-sentences.js';

test('sentence parser accepts N1 through N5 headings without regressing N3 content', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nihongo-n3-sentences-'));
  const fixturePath = path.join(directory, 'sentences.md');
  try {
    fs.writeFileSync(fixturePath, [
      '## N2 business',
      '| # | 일본어 | 한국어 |',
      '| --- | --- | --- |',
      '| 1 | 資料を確認する。 | 자료를 확인한다. |',
      '',
      '## N3 비즈니스',
      '| # | 일본어 | 한국어 |',
      '| --- | --- | --- |',
      '| 1 | 予定を確認する。 | 예정을 확인한다. |',
      '',
      '## N1 newspaper',
      '| # | 일본어 | 한국어 |',
      '| --- | --- | --- |',
      '| 1 | 制度の変化を分析する。 | 제도의 변화를 분석한다. |',
    ].join('\n'), 'utf8');

    const sql = parseSentences({ sourceCode: 'N2-A1', filePath: fixturePath }).join('\n');
    assert.match(sql, /'N2', 'business'/);
    assert.match(sql, /'N3', 'business'/);
    assert.match(sql, /'N1', 'newspaper'/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
