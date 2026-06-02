/**
 * @nihongo-n3/content
 *
 * docs/ 하위 학습 콘텐츠 파일의 메타데이터 인덱스입니다.
 *
 * 시드 파이프라인의 단일 진실원은 이 파일이 아니라
 * packages/db/src/seed/constants.ts 의 CONTENT_PATHS 입니다.
 * 이 패키지는 문서 도구, 업로드 가이드, UI 소스 메타 표시 등에서
 * 사용할 수 있는 repo-root 상대 경로 인덱스입니다.
 */

export type ContentLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'supplement' | 'overview';

export type ContentCategory =
  | 'overview'
  | 'strategy'
  | 'pronunciation'
  | 'kanji'
  | 'vocab'
  | 'grammar'
  | 'sentences'
  | 'sysprog'
  | 'selfcheck';

export interface ContentFileMeta {
  /** Stable source code for tools and display. */
  code: string;
  /** JLPT level or non-JLPT grouping. */
  level: ContentLevel;
  /** Content category. */
  category: ContentCategory;
  /** Repository-root relative path. */
  path: string;
  /** Korean display name. */
  displayName: string;
  /** Whether packages/db/src/seed currently imports this file into D1. */
  seeded: boolean;
}

export const CONTENT_FILES = [
  {
    code: 'source_map',
    level: 'overview',
    category: 'overview',
    path: 'docs/00_overview/00_source_map.md',
    displayName: '소스 맵',
    seeded: false,
  },
  {
    code: 'learning_strategy',
    level: 'overview',
    category: 'strategy',
    path: 'docs/00_overview/01_learning_strategy.md',
    displayName: '학습 전략',
    seeded: false,
  },
  {
    code: 'pronunciation_kana',
    level: 'supplement',
    category: 'pronunciation',
    path: 'docs/04_supplement/02_pronunciation_kana.md',
    displayName: '발음/가나',
    seeded: false,
  },
  {
    code: 'n5_kanji',
    level: 'N5',
    category: 'kanji',
    path: 'docs/01_n5/03_kanji.md',
    displayName: 'N5 한자',
    seeded: true,
  },
  {
    code: 'n5_vocab',
    level: 'N5',
    category: 'vocab',
    path: 'docs/01_n5/04_vocab.md',
    displayName: 'N5 어휘',
    seeded: true,
  },
  {
    code: 'n5_grammar',
    level: 'N5',
    category: 'grammar',
    path: 'docs/01_n5/05_grammar.md',
    displayName: 'N5 문법',
    seeded: true,
  },
  {
    code: 'n4_kanji',
    level: 'N4',
    category: 'kanji',
    path: 'docs/02_n4/06_kanji.md',
    displayName: 'N4 한자',
    seeded: true,
  },
  {
    code: 'n4_vocab',
    level: 'N4',
    category: 'vocab',
    path: 'docs/02_n4/07_vocab.md',
    displayName: 'N4 어휘',
    seeded: true,
  },
  {
    code: 'n4_grammar',
    level: 'N4',
    category: 'grammar',
    path: 'docs/02_n4/08_grammar.md',
    displayName: 'N4 문법',
    seeded: true,
  },
  {
    code: 'n3_kanji',
    level: 'N3',
    category: 'kanji',
    path: 'docs/03_n3/09_kanji.md',
    displayName: 'N3 한자',
    seeded: true,
  },
  {
    code: 'n3_vocab_part1',
    level: 'N3',
    category: 'vocab',
    path: 'docs/03_n3/10A_vocab_part1.md',
    displayName: 'N3 어휘 1',
    seeded: true,
  },
  {
    code: 'n3_vocab_part2',
    level: 'N3',
    category: 'vocab',
    path: 'docs/03_n3/10B_vocab_part2.md',
    displayName: 'N3 어휘 2',
    seeded: true,
  },
  {
    code: 'n3_grammar',
    level: 'N3',
    category: 'grammar',
    path: 'docs/03_n3/11_grammar.md',
    displayName: 'N3 문법',
    seeded: true,
  },
  {
    code: 'example_sentences',
    level: 'supplement',
    category: 'sentences',
    path: 'docs/04_supplement/12_example_sentences.md',
    displayName: '예문',
    seeded: true,
  },
  {
    code: 'sysprog_vocab_500',
    level: 'supplement',
    category: 'sysprog',
    path: 'docs/04_supplement/A_sysprog_vocab_500.md',
    displayName: '직무/시스템 어휘',
    seeded: true,
  },
  {
    code: 'self_check_16weeks',
    level: 'supplement',
    category: 'selfcheck',
    path: 'docs/04_supplement/C_self_check_16weeks.md',
    displayName: '16주 자가진단',
    seeded: false,
  },
] as const satisfies readonly ContentFileMeta[];

export type ContentFileCode = (typeof CONTENT_FILES)[number]['code'];

/** @deprecated Use ContentFileCode. */
export type ContentFileId = ContentFileCode;

/** @deprecated Use CONTENT_FILES. */
export const SOURCE_FILES = CONTENT_FILES;

export function findContentFile(code: string): ContentFileMeta | undefined {
  return CONTENT_FILES.find((file) => file.code === code);
}

export function getSeededFiles(): readonly ContentFileMeta[] {
  return CONTENT_FILES.filter((file) => file.seeded);
}
