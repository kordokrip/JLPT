import assert from 'node:assert/strict';
import test from 'node:test';

import { buildJlptReadingBalanceChanges, type JlptReadingBalanceRow } from '../seed/jlpt-reading-balance.js';

test('JLPT static reading balance rotates positions by level and preserves every correct answer', () => {
  const rows: JlptReadingBalanceRow[] = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    level: 'N3',
    choicesJson: JSON.stringify([`wrong-a-${index}`, `correct-${index}`, `wrong-b-${index}`, `wrong-c-${index}`]),
    answerIndex: 1,
  }));

  const changes = buildJlptReadingBalanceChanges(rows);
  assert.equal(changes.length, 7);
  const finalRows = rows.map((row) => {
    const change = changes.find((candidate) => candidate.id === row.id);
    return change ?? { ...row, choices: JSON.parse(row.choicesJson) as string[] };
  });
  assert.deepEqual([0, 1, 2, 3].map((position) => finalRows.filter((row) => row.answerIndex === position).length), [3, 3, 2, 2]);
  for (const row of finalRows) {
    assert.equal(row.choices[row.answerIndex], `correct-${row.id - 1}`);
    assert.equal(new Set(row.choices).size, 4);
  }
});
