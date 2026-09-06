/**
 * Read-only JLPT/TOPIK question-bank audit.
 *
 * Usage (no D1 writes):
 *   pnpm --filter @nihongo-n3/db exec tsx src/ops/audit-question-bank-quality.ts --local --report=.artifacts/db/question-bank-quality-local.json
 *   pnpm --filter @nihongo-n3/db exec tsx src/ops/audit-question-bank-quality.ts --remote --database=nihongo-n3-prod-v2 --report=.artifacts/db/question-bank-quality-remote.json
 *   pnpm --filter @nihongo-n3/db exec tsx src/ops/audit-question-bank-quality.ts --remote --database=nihongo-n3-prod-v2 --include-unpublished
 *
 * This command reports only structural quality evidence. It never downloads
 * source text, seeds D1, writes R2, or invokes audio generation/playback.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseD1Target, querySql } from '../seed/d1-cli.js';
import { REPO_ROOT } from '../seed/constants.js';
import { auditQuestionRows, type QualityQuestionRow } from './question-bank-quality.js';

type ReadingSqlRow = {
  id: number;
  level: string;
  question_ja: string | null;
  question_ko: string | null;
  choices_json: string | null;
  answer_index: number | null;
  explanation_ko: string | null;
  audio_r2_key: string | null;
};

type TopikPracticeSqlRow = {
  id: string;
  bank_version: string;
  exam_level: string;
  section: string;
  prompt_ko: string | null;
  prompt_ja: string | null;
  prompt_en: string | null;
  choices_json: string | null;
  answer_index: number | null;
  explanation_ko: string | null;
  explanation_ja: string | null;
  explanation_en: string | null;
  source_code: string | null;
  author_reviewer: string | null;
  second_reviewer: string | null;
  reviewed_at: string | null;
  audio_r2_key: string | null;
};

type TopikPlacementSqlRow = TopikPracticeSqlRow & {
  gloss_en: string | null;
};

type AuditArtifact = ReturnType<typeof auditQuestionRows> & {
  generatedAt: string;
  target: { database: string; remote: boolean };
  scope: { topikPractice: 'published-only' | 'published-and-unpublished' };
  policy: {
    pronunciation: 'google-only-browser-speech';
    r2: 'no reads, writes, generation, playback, or fallback';
  };
  limitations: readonly string[];
};

function reportArgument(args = process.argv.slice(2)): string | undefined {
  const prefix = '--report=';
  return args.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function includeUnpublishedArgument(args = process.argv.slice(2)): boolean {
  return args.includes('--include-unpublished');
}

function resolveReportPath(report: string | undefined): string {
  const requested = report ?? '.artifacts/db/question-bank-quality-report.json';
  return path.isAbsolute(requested) ? requested : path.resolve(REPO_ROOT, requested);
}

function toQualityRows(
  readingRows: readonly ReadingSqlRow[],
  practiceRows: readonly TopikPracticeSqlRow[],
  placementRows: readonly TopikPlacementSqlRow[],
): QualityQuestionRow[] {
  return [
    ...readingRows.map((row): QualityQuestionRow => ({
      family: 'jlpt-reading',
      id: `reading:${row.id}`,
      prompt: row.question_ja,
      requiredFields: {
        question_ja: row.question_ja,
        question_ko: row.question_ko,
        explanation_ko: row.explanation_ko,
      },
      choicesJson: row.choices_json,
      answerIndex: row.answer_index,
      duplicateGroup: `jlpt-reading:${row.level}`,
      distributionGroups: [`jlpt-reading:level:${row.level}`],
      r2PronunciationKey: row.audio_r2_key,
    })),
    ...practiceRows.map((row): QualityQuestionRow => {
      const bankGroup = `topik-practice:bank:${row.bank_version}`;
      return {
        family: 'topik-practice',
        id: row.id,
        prompt: row.prompt_ko,
        requiredFields: {
          prompt_ko: row.prompt_ko,
          prompt_ja: row.prompt_ja,
          prompt_en: row.prompt_en,
          explanation_ko: row.explanation_ko,
          explanation_ja: row.explanation_ja,
          explanation_en: row.explanation_en,
          source_code: row.source_code,
          author_reviewer: row.author_reviewer,
          second_reviewer: row.second_reviewer,
          reviewed_at: row.reviewed_at,
        },
        choicesJson: row.choices_json,
        answerIndex: row.answer_index,
        duplicateGroup: `${bankGroup}:${row.exam_level}:${row.section}`,
        distributionGroups: [bankGroup, `${bankGroup}:${row.exam_level}:${row.section}`],
        r2PronunciationKey: row.audio_r2_key,
      };
    }),
    ...placementRows.map((row): QualityQuestionRow => {
      const bankGroup = `topik-placement:bank:${row.bank_version}`;
      return {
        family: 'topik-placement',
        id: row.id,
        prompt: row.prompt_ko,
        requiredFields: {
          prompt_ko: row.prompt_ko,
          prompt_ja: row.prompt_ja,
          prompt_en: row.prompt_en,
          gloss_en: row.gloss_en,
          explanation_ko: row.explanation_ko,
          explanation_ja: row.explanation_ja,
          explanation_en: row.explanation_en,
          source_code: row.source_code,
          author_reviewer: row.author_reviewer,
          second_reviewer: row.second_reviewer,
          reviewed_at: row.reviewed_at,
        },
        choicesJson: row.choices_json,
        answerIndex: row.answer_index,
        duplicateGroup: `${bankGroup}:${row.exam_level}:${row.section}`,
        distributionGroups: [bankGroup, `${bankGroup}:${row.exam_level}:${row.section}`],
        r2PronunciationKey: row.audio_r2_key,
      };
    }),
  ];
}

export function runQuestionBankQualityAudit(options: { includeUnpublished?: boolean } = {}): AuditArtifact {
  const target = parseD1Target();
  const includeUnpublished = options.includeUnpublished ?? includeUnpublishedArgument();
  const readingRows = querySql<ReadingSqlRow>(target, `
    SELECT q.id, p.level, q.question_ja, q.question_ko, q.choices_json,
      q.answer_index, q.explanation_ko, p.audio_r2_key
    FROM reading_questions q
    INNER JOIN reading_passages p ON p.id = q.passage_id
    ORDER BY p.level, q.id
  `);
  const practiceRows = querySql<TopikPracticeSqlRow>(target, `
    SELECT id, bank_version, exam_level, section, prompt_ko, prompt_ja,
      prompt_en, choices_json, answer_index, explanation_ko, explanation_ja,
      explanation_en, source_code, author_reviewer, second_reviewer, reviewed_at,
      audio_r2_key
    FROM topik_practice_questions
    WHERE question_type = 'choice'${includeUnpublished ? '' : ' AND is_published = 1'}
    ORDER BY bank_version, exam_level, section, id
  `);
  const placementRows = querySql<TopikPlacementSqlRow>(target, `
    SELECT id, bank_version, exam_level, section, prompt_ko, prompt_ja,
      prompt_en, gloss_en, choices_json, answer_index, explanation_ko,
      explanation_ja, explanation_en, source_code, author_reviewer,
      second_reviewer, reviewed_at, audio_r2_key
    FROM topik_placement_questions
    ORDER BY bank_version, exam_level, section, id
  `);
  const audit = auditQuestionRows(toQualityRows(readingRows, practiceRows, placementRows));
  return {
    ...audit,
    generatedAt: new Date().toISOString(),
    target: { database: target.database, remote: target.remote },
    scope: { topikPractice: includeUnpublished ? 'published-and-unpublished' : 'published-only' },
    policy: {
      pronunciation: 'google-only-browser-speech',
      r2: 'no reads, writes, generation, playback, or fallback',
    },
    limitations: [
      'This read-only audit checks D1 rows only; it does not migrate, seed, or change D1/R2.',
      'It detects structural inconsistencies and position bias, not semantic correctness of a correct answer or explanation.',
      'TOPIK writing questions are intentionally excluded because they are not four-choice questions.',
      'By default TOPIK practice rows are limited to is_published = 1 for release gating; pass --include-unpublished to audit historical drafts such as practice v1.',
      'R2 checks cover audio_r2_key values attached to audited question/passage rows; run verify-audio-r2 for the complete legacy pronunciation-reference inventory.',
    ],
  };
}

export function main(): void {
  const artifact = runQuestionBankQualityAudit();
  const reportPath = resolveReportPath(reportArgument());
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

  console.log(`Question-bank quality report: ${reportPath}`);
  console.log(`  questions=${artifact.summary.questionCount} four_choice=${artifact.summary.fourChoiceQuestionCount} failures=${artifact.summary.failureCount}`);
  for (const distribution of artifact.answerPositionDistributions) {
    console.log(`  ${distribution.passed ? 'OK' : 'FAIL'} ${distribution.group}: [${distribution.positions.join(', ')}], spread=${distribution.spread}`);
  }
  for (const failure of artifact.failures) {
    if (failure.code === 'TOPIK_PRACTICE_V1_ALL_FIRST_POSITION') {
      console.error('  FAIL TOPIK practice v1: all 24 choice rows use answer_index=0 (first position).');
    }
  }
  if (!artifact.summary.passed) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) main();
