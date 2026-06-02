/**
 * packages/db/src/seed/constants.ts
 *
 * 시드 파이프라인 상수: 실제 파일 경로 및 소스 메타데이터
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 리포지토리 루트 (packages/db/src/seed → ../../../../)
export const REPO_ROOT = path.resolve(__dirname, '../../../../');

/**
 * 실제 마크다운 파일 절대 경로 (docs/ 하위 구조).
 *
 * selfCheck와 pronunciation은 문서 메타데이터에는 포함되지만 현재 D1 시드
 * 대상이 아닙니다. selfCheck는 사용자별 입력 템플릿이고 pronunciation은
 * 정적 학습 문서입니다. 시드 대상은 seed.ts/seed-diff.ts에서 명시합니다.
 */
export const CONTENT_PATHS = {
  n5Vocab:      path.join(REPO_ROOT, 'docs/01_n5/04_vocab.md'),
  n5Grammar:    path.join(REPO_ROOT, 'docs/01_n5/05_grammar.md'),
  n5Kanji:      path.join(REPO_ROOT, 'docs/01_n5/03_kanji.md'),
  n4Vocab:      path.join(REPO_ROOT, 'docs/02_n4/07_vocab.md'),
  n4Grammar:    path.join(REPO_ROOT, 'docs/02_n4/08_grammar.md'),
  n4Kanji:      path.join(REPO_ROOT, 'docs/02_n4/06_kanji.md'),
  n3Vocab1:     path.join(REPO_ROOT, 'docs/03_n3/10A_vocab_part1.md'),
  n3Vocab2:     path.join(REPO_ROOT, 'docs/03_n3/10B_vocab_part2.md'),
  n3Grammar:    path.join(REPO_ROOT, 'docs/03_n3/11_grammar.md'),
  n3Kanji:      path.join(REPO_ROOT, 'docs/03_n3/09_kanji.md'),
  sentences:    path.join(REPO_ROOT, 'docs/04_supplement/12_example_sentences.md'),
  sysprog:      path.join(REPO_ROOT, 'docs/04_supplement/A_sysprog_vocab_500.md'),
  selfCheck:    path.join(REPO_ROOT, 'docs/04_supplement/C_self_check_16weeks.md'),
} as const;

/** 소스 코드 → D1 sources.id 조회용 캐시 (시드 중 채워짐) */
export const sourceIdCache = new Map<string, number>();

/** domain 코드 → domain enum 매핑 */
export const CATEGORY_TO_DOMAIN: Record<string, string> = {
  'SP-A': 'programming',
  'SP-B': 'architecture',
  'SP-C': 'ml',
  'SP-D': 'ml',
  'SP-E': 'semiconductor_front',
  'SP-F': 'semiconductor_back',
  'SP-G': 'manufacturing',
  'SP-H': 'automotive',
  'SP-I': 'pm',
  'SP-J': 'business',
};

/** 품사 약어 정규화 */
export const POS_NORMALIZE: Record<string, string> = {
  '名詞': '名詞', '명사': '名詞',
  '動詞': '動詞', '동사': '動詞',
  '形容詞': '形容詞', '형용사': '形容詞',
  '形容動詞': '形容動詞', '형용동사': '形容動詞',
  '副詞': '副詞', '부사': '副詞',
  '助詞': '助詞', '조사': '助詞',
  '助動詞': '助動詞', '조동사': '助動詞',
  '接続詞': '接続詞', '접속사': '接続詞',
  '感動詞': '感動詞', '감탄사': '感動詞',
  'な형': '形容動詞',
  'い형': '形容詞',
};
