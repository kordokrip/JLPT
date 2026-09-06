/**
 * Read-only structural quality checks shared by the JLPT/TOPIK question-bank
 * auditor.  This module deliberately does not judge linguistic correctness;
 * that requires the independent reviewer workflow.  It does make accidental
 * structural defects and answer-position bias release-blocking.
 */

export type QuestionFamily = 'jlpt-reading' | 'topik-practice' | 'topik-placement';

export type QualityQuestionRow = {
  family: QuestionFamily;
  id: string;
  prompt: string | null;
  requiredFields: Readonly<Record<string, string | null>>;
  choicesJson: string | null;
  answerIndex: number | null;
  duplicateGroup: string;
  distributionGroups: readonly string[];
  r2PronunciationKey?: string | null;
};

export type QualityFailure = {
  code:
    | 'MISSING_REQUIRED_FIELD'
    | 'INVALID_CHOICES_JSON'
    | 'INVALID_CHOICE_COUNT'
    | 'EMPTY_CHOICE'
    | 'DUPLICATE_CHOICE'
    | 'INVALID_ANSWER_INDEX'
    | 'DUPLICATE_NORMALIZED_PROMPT'
    | 'ANSWER_POSITION_BIAS'
    | 'TOPIK_PRACTICE_V1_ALL_FIRST_POSITION'
    | 'R2_PRONUNCIATION_REFERENCE';
  family: QuestionFamily;
  id?: string;
  group?: string;
  details: Record<string, unknown>;
};

export type AnswerPositionDistribution = {
  group: string;
  questionCount: number;
  positions: readonly [number, number, number, number];
  spread: number;
  passed: boolean;
};

export type QuestionQualityAudit = {
  validatorVersion: 'question-bank-quality-v1';
  summary: {
    questionCount: number;
    fourChoiceQuestionCount: number;
    failureCount: number;
    passed: boolean;
  };
  families: Readonly<Record<QuestionFamily, { questionCount: number; failureCount: number }>>;
  answerPositionDistributions: readonly AnswerPositionDistribution[];
  failures: readonly QualityFailure[];
};

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Normalizes only superficial Unicode/whitespace/case differences for duplicate detection. */
export function normalizeQuestionText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('en-US');
}

function parseChoices(value: string | null): { choices?: string[]; error?: string } {
  if (!hasText(value)) return { error: 'choices_json is blank' };

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((choice) => typeof choice === 'string')) {
      return { error: 'choices_json must be a JSON array of strings' };
    }
    return { choices: parsed };
  } catch {
    return { error: 'choices_json is not valid JSON' };
  }
}

function emptyFamilyCounts(): Record<QuestionFamily, { questionCount: number; failureCount: number }> {
  return {
    'jlpt-reading': { questionCount: 0, failureCount: 0 },
    'topik-practice': { questionCount: 0, failureCount: 0 },
    'topik-placement': { questionCount: 0, failureCount: 0 },
  };
}

function addFailure(
  failures: QualityFailure[],
  families: Record<QuestionFamily, { questionCount: number; failureCount: number }>,
  failure: QualityFailure,
): void {
  failures.push(failure);
  families[failure.family].failureCount += 1;
}

/**
 * Audits rows already read from D1.  The caller supplies deliberately small
 * metadata fields so JSON artifacts identify defects without copying prompts
 * or question content into the report.
 */
export function auditQuestionRows(rows: readonly QualityQuestionRow[]): QuestionQualityAudit {
  const failures: QualityFailure[] = [];
  const families = emptyFamilyCounts();
  const promptGroups = new Map<string, QualityQuestionRow[]>();
  const answerGroups = new Map<string, { family: QuestionFamily; answers: number[] }>();
  let fourChoiceQuestionCount = 0;

  for (const row of rows) {
    families[row.family].questionCount += 1;

    for (const [field, value] of Object.entries(row.requiredFields)) {
      if (!hasText(value)) {
        addFailure(failures, families, {
          code: 'MISSING_REQUIRED_FIELD',
          family: row.family,
          id: row.id,
          details: { field },
        });
      }
    }

    if (!hasText(row.prompt)) {
      addFailure(failures, families, {
        code: 'MISSING_REQUIRED_FIELD',
        family: row.family,
        id: row.id,
        details: { field: 'normalized_prompt' },
      });
    } else {
      const promptKey = `${row.duplicateGroup}\u0000${normalizeQuestionText(row.prompt)}`;
      const siblings = promptGroups.get(promptKey) ?? [];
      siblings.push(row);
      promptGroups.set(promptKey, siblings);
    }

    if (hasText(row.r2PronunciationKey)) {
      addFailure(failures, families, {
        code: 'R2_PRONUNCIATION_REFERENCE',
        family: row.family,
        id: row.id,
        details: { policy: 'google-preferred-same-language-browser-pronunciation-no-r2' },
      });
    }

    const parsed = parseChoices(row.choicesJson);
    if (!parsed.choices) {
      addFailure(failures, families, {
        code: 'INVALID_CHOICES_JSON',
        family: row.family,
        id: row.id,
        details: { reason: parsed.error ?? 'unknown choice parse error' },
      });
      continue;
    }

    const choices = parsed.choices;
    if (choices.length !== 4) {
      addFailure(failures, families, {
        code: 'INVALID_CHOICE_COUNT',
        family: row.family,
        id: row.id,
        details: { actual: choices.length, expected: 4 },
      });
    }

    const normalizedChoices = choices.map((choice) => normalizeQuestionText(choice));
    if (normalizedChoices.some((choice) => choice.length === 0)) {
      addFailure(failures, families, {
        code: 'EMPTY_CHOICE',
        family: row.family,
        id: row.id,
        details: {},
      });
    }
    if (new Set(normalizedChoices).size !== normalizedChoices.length) {
      addFailure(failures, families, {
        code: 'DUPLICATE_CHOICE',
        family: row.family,
        id: row.id,
        details: {},
      });
    }

    if (
      row.answerIndex === null
      || !Number.isInteger(row.answerIndex)
      || row.answerIndex < 0
      || row.answerIndex >= choices.length
    ) {
      addFailure(failures, families, {
        code: 'INVALID_ANSWER_INDEX',
        family: row.family,
        id: row.id,
        details: { answerIndex: row.answerIndex, choiceCount: choices.length },
      });
      continue;
    }

    if (choices.length === 4) {
      fourChoiceQuestionCount += 1;
      for (const group of row.distributionGroups) {
        const entry = answerGroups.get(group) ?? { family: row.family, answers: [] };
        entry.answers.push(row.answerIndex);
        answerGroups.set(group, entry);
      }
    }
  }

  for (const siblings of promptGroups.values()) {
    if (siblings.length < 2) continue;
    const ids = siblings.map((row) => row.id).sort();
    for (const row of siblings) {
      addFailure(failures, families, {
        code: 'DUPLICATE_NORMALIZED_PROMPT',
        family: row.family,
        id: row.id,
        group: row.duplicateGroup,
        details: { ids },
      });
    }
  }

  const answerPositionDistributions: AnswerPositionDistribution[] = [];
  for (const [group, entry] of [...answerGroups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const positions: [number, number, number, number] = [0, 0, 0, 0];
    for (const answerIndex of entry.answers) positions[answerIndex] = (positions[answerIndex] ?? 0) + 1;
    const spread = Math.max(...positions) - Math.min(...positions);
    const passed = spread <= 1;
    const distribution: AnswerPositionDistribution = {
      group,
      questionCount: entry.answers.length,
      positions,
      spread,
      passed,
    };
    answerPositionDistributions.push(distribution);
    if (!passed) {
      addFailure(failures, families, {
        code: 'ANSWER_POSITION_BIAS',
        family: entry.family,
        group,
        details: { questionCount: distribution.questionCount, positions, spread, maximumAllowedSpread: 1 },
      });
    }
  }

  const practiceV1 = answerPositionDistributions.find((distribution) => distribution.group === 'topik-practice:bank:v1');
  if (practiceV1 && practiceV1.questionCount === 24 && practiceV1.positions[0] === 24) {
    addFailure(failures, families, {
      code: 'TOPIK_PRACTICE_V1_ALL_FIRST_POSITION',
      family: 'topik-practice',
      group: practiceV1.group,
      details: {
        expectedChoiceRows: 24,
        firstPositionRows: practiceV1.positions[0],
        positions: practiceV1.positions,
      },
    });
  }

  return {
    validatorVersion: 'question-bank-quality-v1',
    summary: {
      questionCount: rows.length,
      fourChoiceQuestionCount,
      failureCount: failures.length,
      passed: failures.length === 0,
    },
    families,
    answerPositionDistributions,
    failures,
  };
}
