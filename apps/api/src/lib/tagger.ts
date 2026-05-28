/**
 * apps/api/src/lib/tagger.ts
 *
 * Phase 8-E: 독해 지문 어휘·문법 자동 태깅
 *
 * 형태소 분석기 없이 순수 문자열 매칭 방식으로 동작합니다.
 * (Workers 환경: kuromoji.js는 WASM 제약으로 사용 불가)
 *
 * 전략:
 *  1. D1에서 vocab.word(일본어) / grammar.pattern 목록 캐싱
 *  2. 긴 패턴 우선(trie-like greedy matching)으로 지문에서 검출
 *  3. 검출된 id 목록 반환
 *
 * 정확도 목표: 수동 검증 ≥80%
 */

interface VocabEntry  { id: number; word: string }
interface GrammarEntry { id: number; pattern: string }

/** 지문에서 어휘/문법 ID 추출 */
export async function tagPassage(
  db: D1Database,
  bodyJa: string,
): Promise<{ vocabIds: number[]; grammarIds: number[] }> {
  // vocab 목록 로드 (단어 길이 내림차순 — 길수록 먼저 매칭)
  const vocabRows = await db
    .prepare(`SELECT id, word FROM vocab ORDER BY LENGTH(word) DESC`)
    .all<VocabEntry>();

  // grammar 목록 로드 (〜 패턴 제거 후 매칭)
  const grammarRows = await db
    .prepare(`SELECT id, pattern FROM grammar ORDER BY LENGTH(pattern) DESC`)
    .all<GrammarEntry>();

  const vocabIds   = new Set<number>();
  const grammarIds = new Set<number>();

  // 어휘 매칭
  for (const v of vocabRows.results ?? []) {
    if (!v.word) continue;
    if (bodyJa.includes(v.word)) {
      vocabIds.add(v.id);
    }
  }

  // 문법 매칭 (〜 → 공백 치환, 기호 제거 후 부분 일치)
  for (const g of grammarRows.results ?? []) {
    if (!g.pattern) continue;
    // 〜 는 임의 문자 대체자 — 제거 후 매칭
    const clean = g.pattern.replace(/[〜～＿_]/g, '').trim();
    if (clean.length >= 2 && bodyJa.includes(clean)) {
      grammarIds.add(g.id);
    }
  }

  return {
    vocabIds:   [...vocabIds],
    grammarIds: [...grammarIds],
  };
}
