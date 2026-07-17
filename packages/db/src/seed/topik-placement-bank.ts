import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { esc, escJson } from './utils.js';

export const TOPIK_TRACK = 'topik-ko' as const;
export const TOPIK_PLACEMENT_PARSER_VERSION = 'topik-placement-parser-v1';
export const TOPIK_PLACEMENT_SOURCE_CODE = 'TOPIK-PLACEMENT-V1';
export const TOPIK_PLACEMENT_SOURCE_PATH = path.join(REPO_ROOT, 'docs/07_topik/T3_placement_bank_v1.md');

export type TopikSection = 'vocabulary' | 'grammar' | 'reading';

export interface TopikPlacementQuestion {
  id: string;
  examLevel: 'TOPIK-I';
  section: TopikSection;
  skill: 'word-meaning' | 'honorific-vocabulary' | 'sentence-completion' | 'sentence-meaning' | 'short-reading';
  difficulty: 1 | 2 | 3;
  promptKo: string;
  promptEn: string;
  glossEn: string;
  choices: string[];
  answerIndex: number;
  explanationEn: string;
  explanationKo: string;
  sourceCode: typeof TOPIK_PLACEMENT_SOURCE_CODE;
  authorReviewer: string;
  secondReviewer: string;
  reviewedAt: string;
}

const AUTHOR_REVIEWER = 'nihongo-n3 original-content review';
const SECOND_REVIEWER = 'nihongo-n3 Korean-language QA';
const REVIEWED_AT = '2026-07-17';

function question(input: Omit<TopikPlacementQuestion, 'sourceCode' | 'authorReviewer' | 'secondReviewer' | 'reviewedAt'>): TopikPlacementQuestion {
  return {
    ...input,
    sourceCode: TOPIK_PLACEMENT_SOURCE_CODE,
    authorReviewer: AUTHOR_REVIEWER,
    secondReviewer: SECOND_REVIEWER,
    reviewedAt: REVIEWED_AT,
  };
}

/**
 * Self-authored placement checks. They intentionally do not reproduce official
 * TOPIK prompts, audio, scoring, or answer keys.
 */
export const TOPIK_PLACEMENT_QUESTIONS: readonly TopikPlacementQuestion[] = [
  question({
    id: 'topik-placement-v1-001', examLevel: 'TOPIK-I', section: 'vocabulary', skill: 'word-meaning', difficulty: 1,
    promptKo: '다음 중 학교에 다니는 사람을 뜻하는 말은 무엇입니까?',
    promptEn: 'Which word means a person who attends school?', glossEn: 'student',
    choices: ['학생', '선생님', '의사', '친구'], answerIndex: 0,
    explanationEn: '학생 means a student. The other choices mean teacher, doctor, and friend.',
    explanationKo: '학생은 학교에 다니는 사람이라는 뜻입니다.',
  }),
  question({
    id: 'topik-placement-v1-002', examLevel: 'TOPIK-I', section: 'vocabulary', skill: 'honorific-vocabulary', difficulty: 2,
    promptKo: '다음 중 먹다의 높임말은 무엇입니까?',
    promptEn: 'Which is the honorific verb for to eat?', glossEn: 'honorific form of eat',
    choices: ['드시다', '가다', '보다', '자다'], answerIndex: 0,
    explanationEn: '드시다 is used respectfully for another person eating. The other choices mean go, see, and sleep.',
    explanationKo: '드시다는 다른 사람을 높여 말할 때 쓰는 먹다의 높임말입니다.',
  }),
  question({
    id: 'topik-placement-v1-003', examLevel: 'TOPIK-I', section: 'vocabulary', skill: 'sentence-completion', difficulty: 1,
    promptKo: '오늘은 날씨가 아주 ___.',
    promptEn: 'Choose the natural ending: “The weather is very ___ today.”', glossEn: 'good weather',
    choices: ['좋아요', '좋습니다', '좋아', '좋은'], answerIndex: 0,
    explanationEn: '좋아요 is a natural polite conversational ending after 아주 in this sentence.',
    explanationKo: '아주 뒤에는 상태를 말하는 좋아요가 자연스럽습니다.',
  }),
  question({
    id: 'topik-placement-v1-004', examLevel: 'TOPIK-I', section: 'vocabulary', skill: 'sentence-meaning', difficulty: 1,
    promptKo: '저는 한국어를 공부합니다.',
    promptEn: 'What is the best English meaning?', glossEn: 'I study Korean.',
    choices: ['I study Korean.', 'I teach Korean.', 'I speak Japanese.', 'I live in Korea.'], answerIndex: 0,
    explanationEn: '공부합니다 means “study.” 한국어 is the Korean language.',
    explanationKo: '한국어는 Korean language이고 공부합니다는 study라는 뜻입니다.',
  }),
  question({
    id: 'topik-placement-v1-005', examLevel: 'TOPIK-I', section: 'grammar', skill: 'sentence-completion', difficulty: 1,
    promptKo: '저는 회사원___.',
    promptEn: 'Choose the correct polite copula ending: “I am an office worker.”', glossEn: 'polite copula',
    choices: ['입니다', '에', '를', '와'], answerIndex: 0,
    explanationEn: '입니다 completes a polite noun sentence. The other choices are particles.',
    explanationKo: '명사 뒤에서 공손하게 문장을 끝낼 때 입니다를 씁니다.',
  }),
  question({
    id: 'topik-placement-v1-006', examLevel: 'TOPIK-I', section: 'grammar', skill: 'sentence-completion', difficulty: 1,
    promptKo: '친구___ 카페에 갔어요.',
    promptEn: 'Choose the particle that means “with”: “I went to a cafe with a friend.”', glossEn: 'with a friend',
    choices: ['와', '를', '에', '에게'], answerIndex: 0,
    explanationEn: '와 connects a noun with another person or thing. It means “and/with.”',
    explanationKo: '친구와는 친구하고 함께라는 뜻을 나타냅니다.',
  }),
  question({
    id: 'topik-placement-v1-007', examLevel: 'TOPIK-I', section: 'grammar', skill: 'sentence-completion', difficulty: 2,
    promptKo: '어제 영화를 ___.',
    promptEn: 'Choose the past-tense ending: “Yesterday I watched a movie.”', glossEn: 'watched',
    choices: ['봤어요', '봐요', '볼 거예요', '봅니다'], answerIndex: 0,
    explanationEn: '어제 signals the past, so 봤어요 is the correct past form of 보다.',
    explanationKo: '어제는 과거이므로 보다의 과거형 봤어요를 사용합니다.',
  }),
  question({
    id: 'topik-placement-v1-008', examLevel: 'TOPIK-I', section: 'grammar', skill: 'sentence-completion', difficulty: 3,
    promptKo: '주말에 시간이 ___ 같이 만나요.',
    promptEn: 'Choose the conditional form: “If you have time this weekend, let’s meet.”', glossEn: 'if there is time',
    choices: ['있으면', '있어서', '있고', '있지만'], answerIndex: 0,
    explanationEn: '있으면 expresses a condition: “if there is/are.”',
    explanationKo: '있으면은 조건을 나타내어 시간이 있으면이라는 뜻이 됩니다.',
  }),
  question({
    id: 'topik-placement-v1-009', examLevel: 'TOPIK-I', section: 'reading', skill: 'short-reading', difficulty: 1,
    promptKo: '안내: 도서관은 오전 9시부터 오후 6시까지입니다. 일요일에는 쉽니다.\n\n도서관은 언제 쉽니까?',
    promptEn: 'Read the notice. When is the library closed?', glossEn: 'Sunday',
    choices: ['일요일', '월요일', '오전 9시', '오후 6시'], answerIndex: 0,
    explanationEn: '일요일에는 쉽니다 means “It is closed on Sunday.”',
    explanationKo: '일요일에는 쉽니다는 일요일에 문을 닫는다는 뜻입니다.',
  }),
  question({
    id: 'topik-placement-v1-010', examLevel: 'TOPIK-I', section: 'reading', skill: 'short-reading', difficulty: 2,
    promptKo: '메시지: 민수 씨, 저는 조금 늦어요. 먼저 식당에 가세요.\n\n민수 씨는 무엇을 해야 합니까?',
    promptEn: 'Read the message. What should Minsu do?', glossEn: 'go to the restaurant first',
    choices: ['먼저 식당에 간다', '집에서 기다린다', '영화를 본다', '전화를 끈다'], answerIndex: 0,
    explanationEn: '먼저 식당에 가세요 directly asks Minsu to go to the restaurant first.',
    explanationKo: '먼저 식당에 가세요라는 부탁이 있으므로 먼저 식당에 갑니다.',
  }),
  question({
    id: 'topik-placement-v1-011', examLevel: 'TOPIK-I', section: 'reading', skill: 'short-reading', difficulty: 2,
    promptKo: '광고: 오늘만 커피를 두 잔 사면 한 잔을 더 드립니다.\n\n이 광고의 혜택은 무엇입니까?',
    promptEn: 'Read the advertisement. What is the offer?', glossEn: 'buy two, get one more',
    choices: ['두 잔을 사면 한 잔을 더 받는다', '커피가 모두 무료다', '커피를 한 잔만 살 수 있다', '내일도 같은 행사가 있다'], answerIndex: 0,
    explanationEn: 'The notice says that buying two coffees gives one additional coffee today only.',
    explanationKo: '커피를 두 잔 사면 한 잔을 더 주는 행사입니다.',
  }),
  question({
    id: 'topik-placement-v1-012', examLevel: 'TOPIK-I', section: 'reading', skill: 'short-reading', difficulty: 3,
    promptKo: '일기: 비가 와서 집에서 책을 읽었습니다. 내일은 날씨가 좋으면 산책하고 싶습니다.\n\n오늘 한 일은 무엇입니까?',
    promptEn: 'Read the diary. What did the writer do today?', glossEn: 'read a book at home',
    choices: ['집에서 책을 읽었다', '공원에서 산책했다', '친구를 만났다', '커피를 샀다'], answerIndex: 0,
    explanationEn: '비가 와서 집에서 책을 읽었습니다 describes today’s completed activity.',
    explanationKo: '비가 와서 집에서 책을 읽었습니다가 오늘 한 일입니다.',
  }),
];

export const TOPIK_EXAM_LEVELS = [
  {
    examLevel: 'TOPIK-I',
    sortOrder: 1,
    labelEn: 'TOPIK I (Levels 1–2)',
    labelKo: 'TOPIK I (1~2급)',
    sections: ['vocabulary', 'grammar', 'reading', 'listening'],
  },
  {
    examLevel: 'TOPIK-II',
    sortOrder: 2,
    labelEn: 'TOPIK II (Levels 3–6)',
    labelKo: 'TOPIK II (3~6급)',
    sections: ['vocabulary', 'grammar', 'reading', 'listening', 'writing'],
  },
] as const;

export interface TopikContentManifest {
  schemaVersion: 1;
  learningTrack: typeof TOPIK_TRACK;
  contentVersion: string;
  parserVersion: typeof TOPIK_PLACEMENT_PARSER_VERSION;
  manifestSha256: string;
  seedRunId: string;
  source: {
    code: typeof TOPIK_PLACEMENT_SOURCE_CODE;
    title: string;
    filePath: string;
    sourceVersion: string;
    sourceChecksum: string;
    provenance: {
      origin: { name: string; url: string };
      license: { id: string; name: string; url: string };
      authorReviewer: string;
      secondReviewer: string;
      reviewedAt: string;
    };
  };
  examLevels: typeof TOPIK_EXAM_LEVELS;
  questions: { expectedRows: number; sha256: string };
}

export interface TopikSeedPlan {
  manifest: TopikContentManifest;
  statements: string[];
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function isReviewDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).valueOf());
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function validateTopikPlacementBank(
  questions: readonly TopikPlacementQuestion[] = TOPIK_PLACEMENT_QUESTIONS,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const prompts = new Set<string>();

  for (const item of questions) {
    if (!ids.add(item.id)) errors.push(`duplicate id: ${item.id}`);
    const promptKey = item.promptKo.replace(/\s+/g, ' ').trim();
    if (!prompts.add(promptKey)) errors.push(`duplicate prompt: ${item.id}`);

    const required = [
      ['prompt_ko', item.promptKo], ['prompt_en', item.promptEn], ['gloss_en', item.glossEn],
      ['explanation_en', item.explanationEn], ['explanation_ko', item.explanationKo],
      ['source_code', item.sourceCode], ['author_reviewer', item.authorReviewer],
      ['second_reviewer', item.secondReviewer],
    ] as const;
    for (const [field, value] of required) {
      if (!nonEmpty(value)) errors.push(`blank ${field}: ${item.id}`);
    }
    if (!isReviewDate(item.reviewedAt)) errors.push(`invalid reviewed_at: ${item.id}`);
    if (item.authorReviewer === item.secondReviewer) errors.push(`review roles must differ: ${item.id}`);
    if (item.sourceCode !== TOPIK_PLACEMENT_SOURCE_CODE) errors.push(`unknown source: ${item.id}`);
    if (item.choices.length !== 4 || item.choices.some((choice) => !nonEmpty(choice))) {
      errors.push(`invalid choices: ${item.id}`);
    }
    if (new Set(item.choices.map((choice) => choice.trim())).size !== item.choices.length) {
      errors.push(`duplicate choice: ${item.id}`);
    }
    if (!Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex >= item.choices.length) {
      errors.push(`invalid answer index: ${item.id}`);
    }
  }

  return errors;
}

export function buildTopikPlacementSeedPlan(): TopikSeedPlan {
  const validationErrors = validateTopikPlacementBank();
  if (validationErrors.length > 0) {
    throw new Error(`TOPIK placement bank validation failed: ${validationErrors.join('; ')}`);
  }

  const sourceDocumentChecksum = sha256(fs.readFileSync(TOPIK_PLACEMENT_SOURCE_PATH, 'utf8'));
  const questionChecksum = sha256(stableJson(TOPIK_PLACEMENT_QUESTIONS));
  const sourceChecksum = sha256(`${sourceDocumentChecksum}:${questionChecksum}`);
  const source = {
    code: TOPIK_PLACEMENT_SOURCE_CODE,
    title: 'Self-authored TOPIK I placement bank v1',
    filePath: 'docs/07_topik/T3_placement_bank_v1.md',
    sourceVersion: '2026-07-17',
    sourceChecksum,
    provenance: {
      origin: {
        name: 'nihongo-n3 self-authored placement content',
        url: 'https://github.com/kordokrip/JLPT/blob/main/docs/07_topik/T3_placement_bank_v1.md',
      },
      license: {
        id: 'LicenseRef-nihongo-n3-topik-original',
        name: 'Repository self-authored learning content',
        url: 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#topik-자체-저작-콘텐츠',
      },
      authorReviewer: AUTHOR_REVIEWER,
      secondReviewer: SECOND_REVIEWER,
      reviewedAt: REVIEWED_AT,
    },
  } as const;
  const questions = { expectedRows: TOPIK_PLACEMENT_QUESTIONS.length, sha256: questionChecksum };
  const manifestCore = {
    schemaVersion: 1 as const,
    learningTrack: TOPIK_TRACK,
    parserVersion: TOPIK_PLACEMENT_PARSER_VERSION as typeof TOPIK_PLACEMENT_PARSER_VERSION,
    source,
    examLevels: TOPIK_EXAM_LEVELS,
    questions,
  };
  const manifestSha256 = sha256(stableJson(manifestCore));
  const contentVersion = `topik-placement-v1-${manifestSha256.slice(0, 12)}`;
  const seedRunId = `topik-${manifestSha256.slice(0, 24)}`;
  const manifest: TopikContentManifest = { ...manifestCore, contentVersion, manifestSha256, seedRunId };

  const statements = [
    [
      'INSERT INTO `track_content_sources`',
      '(`learning_track`,`source_code`,`title`,`file_path`,`source_version`,`provenance_json`)',
      `VALUES (${esc(TOPIK_TRACK)}, ${esc(source.code)}, ${esc(source.title)}, ${esc(source.filePath)}, ${esc(source.sourceVersion)}, ${esc(JSON.stringify(source.provenance))})`,
      'ON CONFLICT(`learning_track`,`source_code`) DO UPDATE SET',
      '`title` = excluded.`title`, `file_path` = excluded.`file_path`,',
      '`source_version` = excluded.`source_version`, `provenance_json` = excluded.`provenance_json`, `updated_at` = unixepoch();',
    ].join('\n'),
    ...TOPIK_EXAM_LEVELS.map((level) => [
      'INSERT INTO `track_exam_levels`',
      '(`learning_track`,`exam_level`,`sort_order`,`label_en`,`label_ko`,`sections_json`)',
      `VALUES (${esc(TOPIK_TRACK)}, ${esc(level.examLevel)}, ${level.sortOrder}, ${esc(level.labelEn)}, ${esc(level.labelKo)}, ${escJson([...level.sections])})`,
      'ON CONFLICT(`learning_track`,`exam_level`) DO UPDATE SET',
      '`sort_order` = excluded.`sort_order`, `label_en` = excluded.`label_en`, `label_ko` = excluded.`label_ko`, `sections_json` = excluded.`sections_json`, `updated_at` = unixepoch();',
    ].join('\n')),
    [
      'INSERT INTO `track_content_seed_runs`',
      '(`id`,`learning_track`,`content_version`,`parser_version`,`manifest_sha256`)',
      `VALUES (${esc(seedRunId)}, ${esc(TOPIK_TRACK)}, ${esc(contentVersion)}, ${esc(TOPIK_PLACEMENT_PARSER_VERSION)}, ${esc(manifestSha256)})`,
      'ON CONFLICT(`learning_track`,`content_version`) DO UPDATE SET',
      '`parser_version` = excluded.`parser_version`, `manifest_sha256` = excluded.`manifest_sha256`;',
    ].join('\n'),
    [
      'INSERT INTO `track_content_seed_sources`',
      '(`seed_run_id`,`learning_track`,`source_code`,`source_checksum`,`parser_version`,`provenance_json`)',
      `VALUES (${esc(seedRunId)}, ${esc(TOPIK_TRACK)}, ${esc(source.code)}, ${esc(sourceChecksum)}, ${esc(TOPIK_PLACEMENT_PARSER_VERSION)}, ${esc(JSON.stringify(source.provenance))})`,
      'ON CONFLICT(`seed_run_id`,`source_code`) DO UPDATE SET',
      '`source_checksum` = excluded.`source_checksum`, `parser_version` = excluded.`parser_version`, `provenance_json` = excluded.`provenance_json`;',
    ].join('\n'),
    ...TOPIK_PLACEMENT_QUESTIONS.map((item) => [
      'INSERT INTO `topik_placement_questions`',
      '(`id`,`learning_track`,`exam_level`,`section`,`skill`,`difficulty`,`prompt_ko`,`prompt_en`,`gloss_en`,`choices_json`,`answer_index`,`explanation_en`,`explanation_ko`,`source_code`,`author_reviewer`,`second_reviewer`,`reviewed_at`)',
      `VALUES (${esc(item.id)}, ${esc(TOPIK_TRACK)}, ${esc(item.examLevel)}, ${esc(item.section)}, ${esc(item.skill)}, ${item.difficulty}, ${esc(item.promptKo)}, ${esc(item.promptEn)}, ${esc(item.glossEn)}, ${escJson(item.choices)}, ${item.answerIndex}, ${esc(item.explanationEn)}, ${esc(item.explanationKo)}, ${esc(item.sourceCode)}, ${esc(item.authorReviewer)}, ${esc(item.secondReviewer)}, ${esc(item.reviewedAt)})`,
      'ON CONFLICT(`id`) DO UPDATE SET',
      '`exam_level` = excluded.`exam_level`, `section` = excluded.`section`, `skill` = excluded.`skill`, `difficulty` = excluded.`difficulty`,',
      '`prompt_ko` = excluded.`prompt_ko`, `prompt_en` = excluded.`prompt_en`, `gloss_en` = excluded.`gloss_en`, `choices_json` = excluded.`choices_json`, `answer_index` = excluded.`answer_index`,',
      '`explanation_en` = excluded.`explanation_en`, `explanation_ko` = excluded.`explanation_ko`, `source_code` = excluded.`source_code`,',
      '`author_reviewer` = excluded.`author_reviewer`, `second_reviewer` = excluded.`second_reviewer`, `reviewed_at` = excluded.`reviewed_at`, `updated_at` = unixepoch();',
    ].join('\n')),
  ];

  return { manifest, statements };
}
