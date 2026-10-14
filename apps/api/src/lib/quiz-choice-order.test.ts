import { describe, expect, it } from 'vitest';

import { buildBalancedChoices, rotatingAnswerIndex } from './quiz-choice-order.js';

describe('quiz choice order', () => {
it('rotates the correct JLPT choice position within one quiz session', () => {
  const positions = Array.from({ length: 9 }, (_, ordinal) => rotatingAnswerIndex(2, ordinal));
  expect(positions).toEqual([2, 3, 0, 1, 2, 3, 0, 1, 2]);
  const counts = [0, 1, 2, 3].map((position) => positions.filter((value) => value === position).length);
  expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
});

it('places a unique correct answer at the requested position', () => {
  const choices = buildBalancedChoices('정답', ['정답', '오답 하나', '오답 둘', '오답 셋'], 3, () => 0);
  expect(choices).toEqual(['오답 하나', '오답 둘', '오답 셋', '정답']);
});

it('refuses a question without three distinct distractors', () => {
  expect(buildBalancedChoices('정답', ['정답', '중복', '중복'], 0, () => 0)).toEqual([]);
});
});
