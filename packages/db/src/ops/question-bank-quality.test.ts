import assert from 'node:assert/strict';
import test from 'node:test';

import { auditQuestionRows, type QualityQuestionRow } from './question-bank-quality.js';

function row(overrides: Partial<QualityQuestionRow> = {}): QualityQuestionRow {
  return {
    family: 'topik-placement',
    id: 'q-1',
    prompt: '문제를 읽으십시오.',
    requiredFields: {
      prompt_ko: '문제를 읽으십시오.',
      prompt_ja: '問題を読んでください。',
      prompt_en: 'Read the question.',
    },
    choicesJson: '["하나", "둘", "셋", "넷"]',
    answerIndex: 0,
    duplicateGroup: 'topik-placement:v2:TOPIK-I:reading',
    distributionGroups: ['topik-placement:bank:v2'],
    ...overrides,
  };
}

test('question-bank quality accepts a structurally valid, evenly distributed four-choice bank', () => {
  const report = auditQuestionRows([0, 1, 2, 3].map((answerIndex) => row({
    id: `q-${answerIndex}`,
    prompt: `문제를 읽으십시오 ${answerIndex + 1}.`,
    answerIndex,
  })));

  assert.equal(report.summary.passed, true);
  assert.deepEqual(report.answerPositionDistributions, [{
    group: 'topik-placement:bank:v2',
    questionCount: 4,
    positions: [1, 1, 1, 1],
    spread: 0,
    passed: true,
  }]);
});

test('question-bank quality identifies the TOPIK practice v1 24/24 first-position regression', () => {
  const report = auditQuestionRows(
    Array.from({ length: 24 }, (_, index) => row({
      family: 'topik-practice',
      id: `topik-practice-${index + 1}`,
      answerIndex: 0,
      duplicateGroup: `topik-practice:v1:${index}`,
      distributionGroups: ['topik-practice:bank:v1'],
    })),
  );

  assert.equal(report.summary.passed, false);
  assert.deepEqual(report.answerPositionDistributions, [{
    group: 'topik-practice:bank:v1',
    questionCount: 24,
    positions: [24, 0, 0, 0],
    spread: 24,
    passed: false,
  }]);
  assert.ok(report.failures.some((failure) => failure.code === 'TOPIK_PRACTICE_V1_ALL_FIRST_POSITION'));
});

test('question-bank quality rejects required-field, duplicate-choice, invalid-answer, and duplicate-prompt defects', () => {
  const report = auditQuestionRows([
    row({
      id: 'bad-1',
      requiredFields: { prompt_ko: '' },
      choicesJson: '["같음", "같음", "셋", "넷"]',
      answerIndex: 4,
      prompt: '같은 문제',
      duplicateGroup: 'same-group',
    }),
    row({ id: 'bad-2', prompt: '  같은\n문제  ', duplicateGroup: 'same-group' }),
  ]);

  assert.ok(report.failures.some((failure) => failure.code === 'MISSING_REQUIRED_FIELD' && failure.id === 'bad-1'));
  assert.ok(report.failures.some((failure) => failure.code === 'DUPLICATE_CHOICE' && failure.id === 'bad-1'));
  assert.ok(report.failures.some((failure) => failure.code === 'INVALID_ANSWER_INDEX' && failure.id === 'bad-1'));
  assert.equal(report.failures.filter((failure) => failure.code === 'DUPLICATE_NORMALIZED_PROMPT').length, 2);
});
