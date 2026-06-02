import { describe, expect, it } from 'vitest';
import { normalizeCurriculumWeek } from '../Curriculum';

describe('normalizeCurriculumWeek', () => {
  it('maps the API curriculum row to the UI week model', () => {
    expect(normalizeCurriculumWeek({
      week_no: 3,
      theme: 'N5 review',
      vocab_target: 40,
      grammar_target: 6,
      kanji_target: 12,
      sentence_target: 10,
      milestone_test: 'weekly quiz',
    })).toEqual({
      week: 3,
      theme: 'N5 review',
      level: 'N3',
      progress: 0,
      vocab_count: 40,
      grammar_count: 6,
      estimated_min: 111,
      topics: ['weekly quiz'],
    });
  });
});
