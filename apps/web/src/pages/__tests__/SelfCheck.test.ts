import { describe, expect, it } from 'vitest';
import { buildSelfCheckPayload, calcScore } from '../SelfCheck';

describe('SelfCheck score helpers', () => {
  it('calculates a section score from checked Korean template codes', () => {
    expect(calcScore('vocab', new Set(['n3_vocab_01']))).toBe(50);
  });

  it('builds the API payload expected by /self-check', () => {
    const checked = new Set([
      'n3_vocab_01',
      'n3_grammar_01',
      'n3_reading_01',
      'n3_listening_01',
      'n3_speaking_01',
      'n3_writing_01',
      'n3_strategy_01',
    ]);

    expect(buildSelfCheckPayload(7, checked)).toMatchObject({
      week_no: 7,
      vocab_score: 50,
      grammar_score: 50,
      reading_score: 50,
      listening_score: 50,
      speaking_score: 100,
      writing_score: 100,
      domain_score: 83,
    });
  });
});
