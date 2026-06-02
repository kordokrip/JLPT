import { describe, expect, it } from 'vitest';
import { buildSelfCheckPayload, calcScore } from '../SelfCheck';

describe('SelfCheck score helpers', () => {
  it('calculates a section score from checked static keys', () => {
    expect(calcScore('語彙', new Set(['2-0', '2-1', '2-2']))).toBe(60);
  });

  it('builds the API payload expected by /self-check', () => {
    const checked = new Set([
      '0-0', '0-1', '0-2', '0-3', '0-4',
      '1-0', '1-1',
      '2-0', '2-1', '2-2',
      '3-0',
      '4-0',
      '5-0', '5-1',
      '6-0', '6-1',
    ]);

    expect(buildSelfCheckPayload(7, checked)).toEqual({
      week_no: 7,
      vocab_score: 60,
      grammar_score: 40,
      listening_score: 67,
      writing_score: 20,
      domain_score: 57,
    });
  });
});
