import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { TOPIK_PLACEMENT_QUESTIONS as V1_READING_QUESTIONS } from './topik-placement-bank.js';
import { esc, escJson } from './utils.js';

export const TOPIK_PLACEMENT_V2_TRACK = 'topik-ko' as const;
export const TOPIK_PLACEMENT_V2_BANK_VERSION = 'v2' as const;
export const TOPIK_PLACEMENT_V2_PARSER_VERSION = 'topik-placement-parser-v2';
export const TOPIK_PLACEMENT_V2_SOURCE_CODE = 'TOPIK-PLACEMENT-V2';
export const TOPIK_PLACEMENT_V2_SOURCE_PATH = path.join(REPO_ROOT, 'docs/07_topik/T4_placement_bank_v2.md');

export type TopikPlacementV2Section = 'listening' | 'reading';

export interface TopikPlacementV2Question {
  id: string;
  examLevel: 'TOPIK-I';
  section: TopikPlacementV2Section;
  skill: string;
  difficulty: 1 | 2 | 3;
  promptKo: string;
  promptEn: string;
  glossEn: string;
  choices: string[];
  answerIndex: number;
  explanationEn: string;
  explanationKo: string;
  audioScriptKo: string | null;
  audioR2Key: string | null;
  sourceCode: typeof TOPIK_PLACEMENT_V2_SOURCE_CODE;
  authorReviewer: string;
  secondReviewer: string;
  reviewedAt: string;
}

const AUTHOR_REVIEWER = 'JLPT-TOPIK Study original-content review';
const SECOND_REVIEWER = 'JLPT-TOPIK Study Korean-language QA';
const REVIEWED_AT = '2026-07-19';

function listeningQuestion(
  input: Omit<TopikPlacementV2Question, 'section' | 'sourceCode' | 'authorReviewer' | 'secondReviewer' | 'reviewedAt' | 'audioR2Key'>,
): TopikPlacementV2Question {
  return {
    ...input,
    section: 'listening',
    audioR2Key: null,
    sourceCode: TOPIK_PLACEMENT_V2_SOURCE_CODE,
    authorReviewer: AUTHOR_REVIEWER,
    secondReviewer: SECOND_REVIEWER,
    reviewedAt: REVIEWED_AT,
  };
}

function placeCorrectAnswer(
  question: TopikPlacementV2Question,
  targetIndex: number,
): TopikPlacementV2Question {
  const choices = [...question.choices];
  const [answer] = choices.splice(question.answerIndex, 1);
  if (answer === undefined) throw new Error(`Missing correct answer choice: ${question.id}`);
  choices.splice(targetIndex, 0, answer);
  return { ...question, choices, answerIndex: targetIndex };
}

const READING_QUESTIONS: TopikPlacementV2Question[] = V1_READING_QUESTIONS.map((item, index): TopikPlacementV2Question => ({
  ...item,
  id: `topik-placement-v2-r-${String(index + 1).padStart(3, '0')}`,
  section: 'reading',
  audioScriptKo: null,
  audioR2Key: null,
  sourceCode: TOPIK_PLACEMENT_V2_SOURCE_CODE,
  authorReviewer: AUTHOR_REVIEWER,
  secondReviewer: SECOND_REVIEWER,
  reviewedAt: REVIEWED_AT,
})).map((item, index) => placeCorrectAnswer(item, index % 4));

const LISTENING_QUESTIONS: TopikPlacementV2Question[] = [
  listeningQuestion({
    id: 'topik-placement-v2-l-001', examLevel: 'TOPIK-I', skill: 'identify-person', difficulty: 1,
    promptKo: '잘 듣고 여자의 이름을 고르십시오.', promptEn: "Listen and choose the woman's name.", glossEn: 'name',
    audioScriptKo: '안녕하세요? 저는 수진입니다. 만나서 반갑습니다.',
    choices: ['수진', '민수', '지영', '준호'], answerIndex: 0,
    explanationEn: 'The speaker introduces herself with 저는 수진입니다.',
    explanationKo: '여자가 저는 수진입니다라고 말했습니다.',
  }),
  listeningQuestion({
    id: 'topik-placement-v2-l-002', examLevel: 'TOPIK-I', skill: 'time-place', difficulty: 1,
    promptKo: '두 사람은 언제 만납니까?', promptEn: 'When will the two people meet?', glossEn: 'meeting time',
    audioScriptKo: '내일 세 시에 도서관 앞에서 만나요.',
    choices: ['내일 세 시', '오늘 세 시', '내일 두 시', '오늘 두 시'], answerIndex: 0,
    explanationEn: '내일 세 시 means tomorrow at three o’clock.',
    explanationKo: '내일 세 시에 만나자고 했습니다.',
  }),
  listeningQuestion({
    id: 'topik-placement-v2-l-003', examLevel: 'TOPIK-I', skill: 'request', difficulty: 1,
    promptKo: '남자는 무엇을 삽니까?', promptEn: 'What does the man buy?', glossEn: 'purchase',
    audioScriptKo: '물 한 병 주세요. 얼마예요?',
    choices: ['물', '우유', '커피', '주스'], answerIndex: 0,
    explanationEn: 'The man asks for one bottle of water.',
    explanationKo: '남자는 물 한 병을 달라고 했습니다.',
  }),
  listeningQuestion({
    id: 'topik-placement-v2-l-004', examLevel: 'TOPIK-I', skill: 'weather-advice', difficulty: 1,
    promptKo: '여자는 무엇을 가져가라고 합니까?', promptEn: 'What does the woman advise taking?', glossEn: 'weather advice',
    audioScriptKo: '오늘 비가 많이 와요. 우산을 가져가세요.',
    choices: ['우산', '모자', '책', '가방'], answerIndex: 0,
    explanationEn: 'Because it is raining, she says to take an umbrella.',
    explanationKo: '비가 오기 때문에 우산을 가져가라고 했습니다.',
  }),
  listeningQuestion({
    id: 'topik-placement-v2-l-005', examLevel: 'TOPIK-I', skill: 'transport-detail', difficulty: 2,
    promptKo: '오늘 지하철은 어떻습니까?', promptEn: 'What is the subway like today?', glossEn: 'transport detail',
    audioScriptKo: '지하철은 빠르지만 오늘은 사람이 아주 많아요.',
    choices: ['사람이 많습니다', '운행하지 않습니다', '아주 느립니다', '자리가 많습니다'], answerIndex: 0,
    explanationEn: 'The speaker says the subway is fast but very crowded today.',
    explanationKo: '오늘은 지하철에 사람이 아주 많다고 했습니다.',
  }),
  listeningQuestion({
    id: 'topik-placement-v2-l-006', examLevel: 'TOPIK-I', skill: 'appointment', difficulty: 2,
    promptKo: '병원 예약은 언제입니까?', promptEn: 'When is the hospital appointment?', glossEn: 'appointment',
    audioScriptKo: '병원 예약은 금요일 오전 열 시입니다. 십 분 전에 오세요.',
    choices: ['금요일 오전 열 시', '금요일 오후 열 시', '목요일 오전 열 시', '목요일 오후 열 시'], answerIndex: 0,
    explanationEn: 'The appointment is Friday at 10 a.m.',
    explanationKo: '금요일 오전 열 시에 예약되어 있습니다.',
  }),
  listeningQuestion({
    id: 'topik-placement-v2-l-007', examLevel: 'TOPIK-I', skill: 'food-order', difficulty: 2,
    promptKo: '손님은 무엇을 주문합니까?', promptEn: 'What does the customer order?', glossEn: 'food order',
    audioScriptKo: '아메리카노 한 잔하고 샌드위치 하나 주세요.',
    choices: ['커피와 샌드위치', '차와 케이크', '우유와 빵', '주스와 과일'], answerIndex: 0,
    explanationEn: 'The customer orders an Americano and a sandwich.',
    explanationKo: '아메리카노 한 잔과 샌드위치 하나를 주문했습니다.',
  }),
  listeningQuestion({
    id: 'topik-placement-v2-l-008', examLevel: 'TOPIK-I', skill: 'reason', difficulty: 2,
    promptKo: '남자는 왜 늦었습니까?', promptEn: 'Why was the man late?', glossEn: 'reason',
    audioScriptKo: '미안해요. 버스를 놓쳐서 조금 늦었어요.',
    choices: ['버스를 놓쳐서', '길을 몰라서', '비가 와서', '일이 많아서'], answerIndex: 0,
    explanationEn: 'He says he was late because he missed the bus.',
    explanationKo: '버스를 놓친 것이 늦은 이유입니다.',
  }),
  listeningQuestion({
    id: 'topik-placement-v2-l-009', examLevel: 'TOPIK-I', skill: 'public-notice', difficulty: 2,
    promptKo: '오늘 수업은 어디에서 합니까?', promptEn: 'Where is today’s class?', glossEn: 'location change',
    audioScriptKo: '알려 드립니다. 회의실 공사 때문에 오늘 수업은 삼 층 강의실에서 합니다.',
    choices: ['삼 층 강의실', '일 층 회의실', '도서관', '운동장'], answerIndex: 0,
    explanationEn: 'The notice moves today’s class to the third-floor classroom.',
    explanationKo: '공사 때문에 오늘 수업은 삼 층 강의실에서 합니다.',
  }),
  listeningQuestion({
    id: 'topik-placement-v2-l-010', examLevel: 'TOPIK-I', skill: 'future-plan', difficulty: 3,
    promptKo: '두 사람은 날씨가 좋으면 무엇을 합니까?', promptEn: 'What will they do if the weather is good?', glossEn: 'conditional plan',
    audioScriptKo: '주말에 날씨가 좋으면 한강에서 자전거를 탈까요? 네, 좋아요.',
    choices: ['자전거를 탑니다', '영화를 봅니다', '집에서 쉽니다', '책을 읽습니다'], answerIndex: 0,
    explanationEn: 'They agree to ride bicycles by the Han River if the weather is good.',
    explanationKo: '날씨가 좋으면 한강에서 자전거를 타기로 했습니다.',
  }),
  listeningQuestion({
    id: 'topik-placement-v2-l-011', examLevel: 'TOPIK-I', skill: 'sequence', difficulty: 3,
    promptKo: '여자는 가장 먼저 무엇을 합니까?', promptEn: 'What does the woman do first?', glossEn: 'sequence',
    audioScriptKo: '먼저 은행에 가고, 다음에 우체국에서 소포를 보낼 거예요. 그 후에 친구를 만나요.',
    choices: ['은행에 갑니다', '친구를 만납니다', '소포를 보냅니다', '집에 갑니다'], answerIndex: 0,
    explanationEn: '먼저 marks the bank as the first action.',
    explanationKo: '먼저 은행에 간다고 했습니다.',
  }),
  listeningQuestion({
    id: 'topik-placement-v2-l-012', examLevel: 'TOPIK-I', skill: 'situational-inference', difficulty: 3,
    promptKo: '이 말은 어디에서 들을 수 있습니까?', promptEn: 'Where would you hear this instruction?', glossEn: 'situational inference',
    audioScriptKo: '마지막으로 나가는 분은 불을 끄고 문을 꼭 잠가 주세요.',
    choices: ['사무실', '식당 주문대', '버스 안', '병원 접수처'], answerIndex: 0,
    explanationEn: 'Turning off lights and locking the door when leaving is a workplace closing instruction.',
    explanationKo: '마지막 퇴실자에게 불과 문을 확인하라는 사무실 안내입니다.',
  }),
].map((item, index) => placeCorrectAnswer(item, index % 4));

export const TOPIK_PLACEMENT_V2_QUESTIONS: readonly TopikPlacementV2Question[] = [
  ...LISTENING_QUESTIONS,
  ...READING_QUESTIONS,
];

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function validateTopikPlacementV2Bank(questions = TOPIK_PLACEMENT_V2_QUESTIONS): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const prompts = new Set<string>();
  const sectionCounts = new Map<TopikPlacementV2Section, number>();
  const answerPositionCounts = new Map<number, number>();

  for (const item of questions) {
    if (!ids.add(item.id)) errors.push(`duplicate id: ${item.id}`);
    if (!prompts.add(`${item.section}:${item.promptKo.replace(/\s+/g, ' ').trim()}`)) errors.push(`duplicate prompt: ${item.id}`);
    sectionCounts.set(item.section, (sectionCounts.get(item.section) ?? 0) + 1);
    const required = [item.promptKo, item.promptEn, item.glossEn, item.explanationEn, item.explanationKo, item.sourceCode, item.authorReviewer, item.secondReviewer];
    if (required.some((value) => value.trim().length === 0)) errors.push(`blank required field: ${item.id}`);
    if (item.section === 'listening' && !item.audioScriptKo?.trim()) errors.push(`blank listening script: ${item.id}`);
    if (item.section === 'reading' && item.audioScriptKo !== null) errors.push(`unexpected reading audio script: ${item.id}`);
    if (item.choices.length !== 4 || new Set(item.choices.map((choice) => choice.trim())).size !== 4) errors.push(`invalid choices: ${item.id}`);
    if (!Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex >= item.choices.length) errors.push(`invalid answer index: ${item.id}`);
    answerPositionCounts.set(item.answerIndex, (answerPositionCounts.get(item.answerIndex) ?? 0) + 1);
    if (item.authorReviewer === item.secondReviewer) errors.push(`review roles must differ: ${item.id}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.reviewedAt)) errors.push(`invalid reviewed date: ${item.id}`);
  }

  for (const section of ['listening', 'reading'] as const) {
    if (sectionCounts.get(section) !== 12) errors.push(`${section} must contain exactly 12 questions`);
  }
  if (questions.length % 4 === 0) {
    const expectedPerPosition = questions.length / 4;
    for (let position = 0; position < 4; position += 1) {
      if (answerPositionCounts.get(position) !== expectedPerPosition) {
        errors.push(`answer position ${position} must contain exactly ${expectedPerPosition} questions`);
      }
    }
  }
  return errors;
}

export function buildTopikPlacementV2SeedPlan() {
  const errors = validateTopikPlacementV2Bank();
  if (errors.length > 0) throw new Error(`TOPIK placement V2 validation failed: ${errors.join('; ')}`);

  const documentChecksum = sha256(fs.readFileSync(TOPIK_PLACEMENT_V2_SOURCE_PATH, 'utf8'));
  const questionChecksum = sha256(JSON.stringify(TOPIK_PLACEMENT_V2_QUESTIONS));
  const sourceChecksum = sha256(`${documentChecksum}:${questionChecksum}`);
  const manifestCore = {
    schemaVersion: 2,
    learningTrack: TOPIK_PLACEMENT_V2_TRACK,
    bankVersion: TOPIK_PLACEMENT_V2_BANK_VERSION,
    parserVersion: TOPIK_PLACEMENT_V2_PARSER_VERSION,
    source: {
      code: TOPIK_PLACEMENT_V2_SOURCE_CODE,
      title: 'Self-authored TOPIK I placement bank V2',
      filePath: 'docs/07_topik/T4_placement_bank_v2.md',
      sourceVersion: REVIEWED_AT,
      sourceChecksum,
      provenance: {
        origin: { name: 'JLPT-TOPIK Study self-authored content', url: 'https://github.com/kordokrip/JLPT/blob/main/docs/07_topik/T4_placement_bank_v2.md' },
        license: { id: 'LicenseRef-nihongo-n3-topik-original', name: 'Repository self-authored learning content', url: 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#topik-자체-저작-콘텐츠' },
        authorReviewer: AUTHOR_REVIEWER,
        secondReviewer: SECOND_REVIEWER,
        reviewedAt: REVIEWED_AT,
      },
    },
    examLevels: [{ examLevel: 'TOPIK-I', sortOrder: 1, labelEn: 'TOPIK I (Levels 1-2)', labelKo: 'TOPIK I (1~2급)', sections: ['listening', 'reading'] }],
    questions: { expectedRows: 24, sha256: questionChecksum },
  } as const;
  const manifestSha256 = sha256(JSON.stringify(manifestCore));
  const contentVersion = `topik-placement-v2-${manifestSha256.slice(0, 12)}`;
  const seedRunId = `topik-v2-${manifestSha256.slice(0, 20)}`;
  const manifest = { ...manifestCore, contentVersion, manifestSha256, seedRunId };
  const provenanceJson = JSON.stringify(manifest.source.provenance);

  const statements = [
    [
      'INSERT INTO `track_content_sources` (`learning_track`,`source_code`,`title`,`file_path`,`source_version`,`provenance_json`)',
      `VALUES (${esc(TOPIK_PLACEMENT_V2_TRACK)}, ${esc(manifest.source.code)}, ${esc(manifest.source.title)}, ${esc(manifest.source.filePath)}, ${esc(manifest.source.sourceVersion)}, ${esc(provenanceJson)})`,
      'ON CONFLICT(`learning_track`,`source_code`) DO UPDATE SET `title`=excluded.`title`,`file_path`=excluded.`file_path`,`source_version`=excluded.`source_version`,`provenance_json`=excluded.`provenance_json`,`updated_at`=unixepoch();',
    ].join('\n'),
    [
      'INSERT INTO `track_exam_levels` (`learning_track`,`exam_level`,`sort_order`,`label_en`,`label_ko`,`sections_json`)',
      `VALUES (${esc(TOPIK_PLACEMENT_V2_TRACK)}, 'TOPIK-I', 1, 'TOPIK I (Levels 1-2)', 'TOPIK I (1~2급)', ${escJson(['listening', 'reading'])})`,
      'ON CONFLICT(`learning_track`,`exam_level`) DO UPDATE SET `sections_json`=excluded.`sections_json`,`updated_at`=unixepoch();',
    ].join('\n'),
    `INSERT INTO \`track_content_seed_runs\` (\`id\`,\`learning_track\`,\`content_version\`,\`parser_version\`,\`manifest_sha256\`) VALUES (${esc(seedRunId)}, ${esc(TOPIK_PLACEMENT_V2_TRACK)}, ${esc(contentVersion)}, ${esc(TOPIK_PLACEMENT_V2_PARSER_VERSION)}, ${esc(manifestSha256)}) ON CONFLICT(\`learning_track\`,\`content_version\`) DO UPDATE SET \`parser_version\`=excluded.\`parser_version\`,\`manifest_sha256\`=excluded.\`manifest_sha256\`;`,
    `INSERT INTO \`track_content_seed_sources\` (\`seed_run_id\`,\`learning_track\`,\`source_code\`,\`source_checksum\`,\`parser_version\`,\`provenance_json\`) VALUES (${esc(seedRunId)}, ${esc(TOPIK_PLACEMENT_V2_TRACK)}, ${esc(TOPIK_PLACEMENT_V2_SOURCE_CODE)}, ${esc(sourceChecksum)}, ${esc(TOPIK_PLACEMENT_V2_PARSER_VERSION)}, ${esc(provenanceJson)}) ON CONFLICT(\`seed_run_id\`,\`source_code\`) DO UPDATE SET \`source_checksum\`=excluded.\`source_checksum\`,\`parser_version\`=excluded.\`parser_version\`,\`provenance_json\`=excluded.\`provenance_json\`;`,
    ...TOPIK_PLACEMENT_V2_QUESTIONS.map((item) => [
      'INSERT INTO `topik_placement_questions` (`id`,`learning_track`,`exam_level`,`section`,`skill`,`difficulty`,`prompt_ko`,`prompt_en`,`gloss_en`,`choices_json`,`answer_index`,`explanation_en`,`explanation_ko`,`source_code`,`author_reviewer`,`second_reviewer`,`reviewed_at`,`bank_version`,`audio_script_ko`,`audio_r2_key`,`is_published`)',
      `VALUES (${esc(item.id)}, ${esc(TOPIK_PLACEMENT_V2_TRACK)}, ${esc(item.examLevel)}, ${esc(item.section)}, ${esc(item.skill)}, ${item.difficulty}, ${esc(item.promptKo)}, ${esc(item.promptEn)}, ${esc(item.glossEn)}, ${escJson(item.choices)}, ${item.answerIndex}, ${esc(item.explanationEn)}, ${esc(item.explanationKo)}, ${esc(item.sourceCode)}, ${esc(item.authorReviewer)}, ${esc(item.secondReviewer)}, ${esc(item.reviewedAt)}, ${esc(TOPIK_PLACEMENT_V2_BANK_VERSION)}, ${esc(item.audioScriptKo)}, ${esc(item.audioR2Key)}, 1)`,
      'ON CONFLICT(`id`) DO UPDATE SET `section`=excluded.`section`,`skill`=excluded.`skill`,`difficulty`=excluded.`difficulty`,`prompt_ko`=excluded.`prompt_ko`,`prompt_en`=excluded.`prompt_en`,`gloss_en`=excluded.`gloss_en`,`choices_json`=excluded.`choices_json`,`answer_index`=excluded.`answer_index`,`explanation_en`=excluded.`explanation_en`,`explanation_ko`=excluded.`explanation_ko`,`source_code`=excluded.`source_code`,`author_reviewer`=excluded.`author_reviewer`,`second_reviewer`=excluded.`second_reviewer`,`reviewed_at`=excluded.`reviewed_at`,`bank_version`=excluded.`bank_version`,`audio_script_ko`=excluded.`audio_script_ko`,`audio_r2_key`=excluded.`audio_r2_key`,`is_published`=excluded.`is_published`,`updated_at`=unixepoch();',
    ].join('\n')),
  ];

  return { manifest, statements };
}
