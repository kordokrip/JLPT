/**
 * Deterministically rotate correct answers in static JLPT reading banks.
 *
 * The operation changes only choice order and answer_index.  It does not
 * alter prompts, passages, explanations, or the correct answer text.
 */
import { esc, escJson } from './utils.js';

export type JlptReadingBalanceRow = {
  id: number;
  level: string;
  choicesJson: string;
  answerIndex: number;
};

export type JlptReadingBalanceChange = {
  id: number;
  level: string;
  choices: readonly string[];
  answerIndex: number;
};

function parseChoices(row: JlptReadingBalanceRow): string[] {
  const parsed: unknown = JSON.parse(row.choicesJson);
  if (!Array.isArray(parsed) || parsed.length !== 4 || !parsed.every((choice) => typeof choice === 'string')) {
    throw new Error(`JLPT reading ${row.id} must have four string choices before answer balancing.`);
  }
  if (!Number.isInteger(row.answerIndex) || row.answerIndex < 0 || row.answerIndex >= parsed.length) {
    throw new Error(`JLPT reading ${row.id} has an invalid answer index before answer balancing.`);
  }
  return parsed;
}

/**
 * Sort by immutable row ID per JLPT level and assign answer slots 0→3 in a
 * loop. This guarantees a maximum per-slot difference of one for every
 * level, while retaining every original choice and correct answer.
 */
export function buildJlptReadingBalanceChanges(rows: readonly JlptReadingBalanceRow[]): JlptReadingBalanceChange[] {
  const groups = new Map<string, JlptReadingBalanceRow[]>();
  for (const row of rows) {
    const group = groups.get(row.level) ?? [];
    group.push(row);
    groups.set(row.level, group);
  }

  const changes: JlptReadingBalanceChange[] = [];
  for (const [level, group] of groups) {
    for (const [ordinal, row] of group.sort((left, right) => left.id - right.id).entries()) {
      const sourceChoices = parseChoices(row);
      const correct = sourceChoices[row.answerIndex]!;
      const distractors = sourceChoices.filter((_, index) => index !== row.answerIndex);
      const answerIndex = ordinal % 4;
      const choices = [...distractors];
      choices.splice(answerIndex, 0, correct);
      if (choices[answerIndex] !== correct || new Set(choices).size !== 4) {
        throw new Error(`JLPT reading ${row.id} choice balance would not preserve a unique correct answer.`);
      }
      if (JSON.stringify(choices) !== row.choicesJson || answerIndex !== row.answerIndex) {
        changes.push({ id: row.id, level, choices, answerIndex });
      }
    }
  }
  return changes;
}

export function buildJlptReadingBalanceStatements(changes: readonly JlptReadingBalanceChange[]): string[] {
  return changes.map((change) => [
    'UPDATE `reading_questions`',
    `SET \`choices_json\`=${escJson([...change.choices])}, \`answer_index\`=${change.answerIndex}`,
    `WHERE \`id\`=${change.id};`,
  ].join('\n'));
}
