import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { esc, escJson } from './utils.js';

export const TOPIK_OFFICIAL_TRACK = 'topik-ko' as const;
export const TOPIK_OFFICIAL_SOURCE_CODE = 'TOPIK-NIIED-APPLICANTS-2023';
export const TOPIK_OFFICIAL_PARSER_VERSION = 'topik-official-reference-v1';
export const TOPIK_OFFICIAL_SOURCE_PATH = path.join(
  REPO_ROOT,
  'docs/07_topik/data/topik-applicants-country-age-20231231.csv',
);
export const TOPIK_OFFICIAL_SOURCE_URL = 'https://www.data.go.kr/data/15067926/fileData.do';
export const TOPIK_OFFICIAL_DOWNLOAD_URL = 'https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000002878108&fileDetailSn=1&insertDataPrcus=N';

type ExamLevel = 'TOPIK-I' | 'TOPIK-II';
type AgeBand = 'under-20' | '20s' | '30s' | '40s' | '50s' | '60plus';

type StatisticRow = {
  countryNameKo: string;
  examLevel: ExamLevel;
  ageBand: AgeBand;
  applicantCount: number;
  sourceRow: number;
};

const COLUMN_MAP: ReadonlyArray<{ examLevel: ExamLevel; ageBand: AgeBand }> = [
  { examLevel: 'TOPIK-I', ageBand: 'under-20' },
  { examLevel: 'TOPIK-I', ageBand: '20s' },
  { examLevel: 'TOPIK-I', ageBand: '30s' },
  { examLevel: 'TOPIK-I', ageBand: '40s' },
  { examLevel: 'TOPIK-I', ageBand: '50s' },
  { examLevel: 'TOPIK-I', ageBand: '60plus' },
  { examLevel: 'TOPIK-II', ageBand: 'under-20' },
  { examLevel: 'TOPIK-II', ageBand: '20s' },
  { examLevel: 'TOPIK-II', ageBand: '30s' },
  { examLevel: 'TOPIK-II', ageBand: '40s' },
  { examLevel: 'TOPIK-II', ageBand: '50s' },
  { examLevel: 'TOPIK-II', ageBand: '60plus' },
];

const BLUEPRINTS = [
  { id: 'topik-i-pbt-listening', examLevel: 'TOPIK-I', section: 'listening', questionCount: 30, sectionScore: 100, totalScore: 200, gradeMin: 1, gradeMax: 2 },
  { id: 'topik-i-pbt-reading', examLevel: 'TOPIK-I', section: 'reading', questionCount: 40, sectionScore: 100, totalScore: 200, gradeMin: 1, gradeMax: 2 },
  { id: 'topik-ii-pbt-listening', examLevel: 'TOPIK-II', section: 'listening', questionCount: 50, sectionScore: 100, totalScore: 300, gradeMin: 3, gradeMax: 6 },
  { id: 'topik-ii-pbt-writing', examLevel: 'TOPIK-II', section: 'writing', questionCount: 4, sectionScore: 100, totalScore: 300, gradeMin: 3, gradeMax: 6 },
  { id: 'topik-ii-pbt-reading', examLevel: 'TOPIK-II', section: 'reading', questionCount: 50, sectionScore: 100, totalScore: 300, gradeMin: 3, gradeMax: 6 },
] as const;

const EXAM_LEVELS: ReadonlyArray<{
  examLevel: ExamLevel;
  sortOrder: number;
  labelEn: string;
  labelKo: string;
  sections: readonly string[];
}> = [
  { examLevel: 'TOPIK-I', sortOrder: 1, labelEn: 'TOPIK I (Levels 1-2)', labelKo: 'TOPIK I (1~2급)', sections: ['listening', 'reading'] },
  { examLevel: 'TOPIK-II', sortOrder: 2, labelEn: 'TOPIK II (Levels 3-6)', labelKo: 'TOPIK II (3~6급)', sections: ['listening', 'writing', 'reading'] },
];

function checksum(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function parseCsvLine(line: string): string[] {
  return line.split(',').map((value) => value.trim());
}

export function parseTopikOfficialStatistics(filePath = TOPIK_OFFICIAL_SOURCE_PATH): StatisticRow[] {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/u);
  if (lines.length !== 89) throw new Error(`Expected 88 country rows, found ${Math.max(0, lines.length - 1)}.`);
  const rows: StatisticRow[] = [];
  for (const [index, line] of lines.slice(1).entries()) {
    const cells = parseCsvLine(line);
    if (cells.length !== 13 || !cells[0]) throw new Error(`Invalid TOPIK statistic row ${index + 2}.`);
    for (const [column, metadata] of COLUMN_MAP.entries()) {
      const value = Number(cells[column + 1]);
      if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid applicant count on row ${index + 2}.`);
      rows.push({ countryNameKo: cells[0], ...metadata, applicantCount: value, sourceRow: index + 2 });
    }
  }
  return rows;
}

export function buildTopikOfficialReferenceSeedPlan() {
  const sourceContent = fs.readFileSync(TOPIK_OFFICIAL_SOURCE_PATH, 'utf8');
  const sourceChecksum = checksum(sourceContent);
  const statistics = parseTopikOfficialStatistics();
  const provenance = {
    origin: {
      name: '교육부 국립국제교육원_한국어능력시험 시행국가별 연령별 응시자 수_20231231',
      url: TOPIK_OFFICIAL_SOURCE_URL,
      downloadUrl: TOPIK_OFFICIAL_DOWNLOAD_URL,
    },
    license: {
      id: 'KOGL-UNRESTRICTED-DATA-GO-KR',
      name: '공공데이터포털 이용허락범위 제한 없음',
      url: TOPIK_OFFICIAL_SOURCE_URL,
    },
    reviewer: 'nihongo-n3 TOPIK data QA',
    reviewedAt: '2026-07-20',
    dataLimit: 'Aggregate applicants by country, age band, and TOPIK I/II only. It does not contain learning questions, answers, audio, or individual records.',
  };
  const sourceVersion = '2023-12-31';
  const manifestCore = {
    schemaVersion: 1,
    learningTrack: TOPIK_OFFICIAL_TRACK,
    parserVersion: TOPIK_OFFICIAL_PARSER_VERSION,
    source: { code: TOPIK_OFFICIAL_SOURCE_CODE, filePath: 'docs/07_topik/data/topik-applicants-country-age-20231231.csv', sourceVersion, sourceChecksum, provenance },
    blueprints: BLUEPRINTS,
    statistics: { expectedRows: statistics.length, countries: 88 },
  } as const;
  const manifestSha256 = checksum(JSON.stringify(manifestCore));
  const contentVersion = `topik-official-reference-${manifestSha256.slice(0, 12)}`;
  const seedRunId = `topik-official-${manifestSha256.slice(0, 20)}`;
  const provenanceJson = JSON.stringify(provenance);

  const statements = [
    [
      'INSERT INTO `track_content_sources` (`learning_track`,`source_code`,`title`,`file_path`,`source_version`,`provenance_json`)',
      `VALUES (${esc(TOPIK_OFFICIAL_TRACK)}, ${esc(TOPIK_OFFICIAL_SOURCE_CODE)}, ${esc('NIIED TOPIK applicant statistics by country and age (2023-12-31)')}, ${esc(manifestCore.source.filePath)}, ${esc(sourceVersion)}, ${esc(provenanceJson)})`,
      'ON CONFLICT(`learning_track`,`source_code`) DO UPDATE SET `title`=excluded.`title`,`file_path`=excluded.`file_path`,`source_version`=excluded.`source_version`,`provenance_json`=excluded.`provenance_json`,`updated_at`=unixepoch();',
    ].join('\n'),
    ...EXAM_LEVELS.map(({ examLevel, sortOrder, labelEn, labelKo, sections }) => [
      'INSERT INTO `track_exam_levels` (`learning_track`,`exam_level`,`sort_order`,`label_en`,`label_ko`,`sections_json`)',
      `VALUES (${esc(TOPIK_OFFICIAL_TRACK)}, ${esc(examLevel)}, ${sortOrder}, ${esc(labelEn)}, ${esc(labelKo)}, ${escJson([...sections])})`,
      'ON CONFLICT(`learning_track`,`exam_level`) DO UPDATE SET `sort_order`=excluded.`sort_order`,`label_en`=excluded.`label_en`,`label_ko`=excluded.`label_ko`,`sections_json`=excluded.`sections_json`,`updated_at`=unixepoch();',
    ].join('\n')),
    `INSERT INTO \`track_content_seed_runs\` (\`id\`,\`learning_track\`,\`content_version\`,\`parser_version\`,\`manifest_sha256\`) VALUES (${esc(seedRunId)}, ${esc(TOPIK_OFFICIAL_TRACK)}, ${esc(contentVersion)}, ${esc(TOPIK_OFFICIAL_PARSER_VERSION)}, ${esc(manifestSha256)}) ON CONFLICT(\`learning_track\`,\`content_version\`) DO UPDATE SET \`parser_version\`=excluded.\`parser_version\`,\`manifest_sha256\`=excluded.\`manifest_sha256\`;`,
    `INSERT INTO \`track_content_seed_sources\` (\`seed_run_id\`,\`learning_track\`,\`source_code\`,\`source_checksum\`,\`parser_version\`,\`provenance_json\`) VALUES (${esc(seedRunId)}, ${esc(TOPIK_OFFICIAL_TRACK)}, ${esc(TOPIK_OFFICIAL_SOURCE_CODE)}, ${esc(sourceChecksum)}, ${esc(TOPIK_OFFICIAL_PARSER_VERSION)}, ${esc(provenanceJson)}) ON CONFLICT(\`seed_run_id\`,\`source_code\`) DO UPDATE SET \`source_checksum\`=excluded.\`source_checksum\`,\`parser_version\`=excluded.\`parser_version\`,\`provenance_json\`=excluded.\`provenance_json\`;`,
    ...BLUEPRINTS.map((item) => [
      'INSERT INTO `topik_exam_blueprints` (`id`,`learning_track`,`exam_level`,`delivery_mode`,`section`,`question_count`,`section_score`,`total_score`,`grade_min`,`grade_max`,`source_code`,`source_url`,`source_version`)',
      `VALUES (${esc(item.id)}, ${esc(TOPIK_OFFICIAL_TRACK)}, ${esc(item.examLevel)}, 'PBT', ${esc(item.section)}, ${item.questionCount}, ${item.sectionScore}, ${item.totalScore}, ${item.gradeMin}, ${item.gradeMax}, ${esc(TOPIK_OFFICIAL_SOURCE_CODE)}, ${esc(TOPIK_OFFICIAL_SOURCE_URL)}, ${esc(sourceVersion)})`,
      'ON CONFLICT(`id`) DO UPDATE SET `question_count`=excluded.`question_count`,`section_score`=excluded.`section_score`,`total_score`=excluded.`total_score`,`grade_min`=excluded.`grade_min`,`grade_max`=excluded.`grade_max`,`source_url`=excluded.`source_url`,`source_version`=excluded.`source_version`,`updated_at`=unixepoch();',
    ].join('\n')),
    ...statistics.map((item) => [
      'INSERT INTO `topik_official_statistics` (`learning_track`,`source_code`,`country_name_ko`,`exam_level`,`age_band`,`applicant_count`,`source_row`)',
      `VALUES (${esc(TOPIK_OFFICIAL_TRACK)}, ${esc(TOPIK_OFFICIAL_SOURCE_CODE)}, ${esc(item.countryNameKo)}, ${esc(item.examLevel)}, ${esc(item.ageBand)}, ${item.applicantCount}, ${item.sourceRow})`,
      'ON CONFLICT(`learning_track`,`source_code`,`country_name_ko`,`exam_level`,`age_band`) DO UPDATE SET `applicant_count`=excluded.`applicant_count`,`source_row`=excluded.`source_row`,`updated_at`=unixepoch();',
    ].join('\n')),
  ];

  return { manifest: { ...manifestCore, contentVersion, manifestSha256, seedRunId }, statements };
}
