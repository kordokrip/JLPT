/**
 * packages/db/src/seed/parse-vocab.ts
 *
 * N5 / N4 / N3 어휘 마크다운 파싱 → INSERT OR IGNORE SQL 생성
 *
 * 마크다운 포맷:
 *   ## 카테고리 A. 인사와 자기소개 (3행)
 *   | 일본어 | 가나 | 의미 | 주의점 |
 *   | ---- | ---- | ---- | ---- |
 *   | こんにちは | こんにちは | 안녕하세요 | - |
 *
 *   '가나' 셀이 '-' → ja 값 그대로 사용
 */
import { parseMarkdownTables, normalizeCell, stripBr, esc, escJson } from './utils.js';

export interface VocabSql {
  /** `sources.code` (예: '04') */
  sourceCode: string;
  level: 'N5' | 'N4' | 'N3';
  filePath: string;
}

export function parseVocab(opts: VocabSql): string[] {
  const tables = parseMarkdownTables(opts.filePath);
  const statements: string[] = [];

  for (const table of tables) {
    const { headers, rows, nearestH2 } = table;

    // 어휘 테이블 판별: '일본어' 컬럼 필수
    const jaIdx = headers.findIndex((h) => h.includes('일본어'));
    if (jaIdx === -1) continue;

    const kanaIdx  = headers.findIndex((h) => h.includes('가나'));
    const koIdx    = headers.findIndex((h) => h.includes('의미'));
    const noteIdx  = headers.findIndex((h) => h.includes('주의'));

    // 카테고리 코드 파싱: "## 카테고리 A. 인사와..." → "A"
    const catMatch = nearestH2.match(/카테고리\s+([A-Z0-9]+)\./i);
    const catCode  = catMatch ? catMatch[1] : null;

    for (const row of rows) {
      const ja  = normalizeCell(stripBr(row[jaIdx] ?? ''));
      if (!ja) continue;

      const kanaRaw = normalizeCell(stripBr(row[kanaIdx ?? -1] ?? ''));
      const kana    = kanaRaw || ja;           // '-'이면 ja 그대로
      const ko      = normalizeCell(stripBr(row[koIdx ?? -1] ?? ''));
      const trap    = normalizeCell(stripBr(row[noteIdx ?? -1] ?? ''));

      statements.push(
        [
          `INSERT OR IGNORE INTO \`vocab\``,
          `  (\`source_id\`, \`category_id\`, \`level\`, \`ja\`, \`kana\`, \`ko\`, \`trap_note\`, \`tags\`)`,
          `VALUES (`,
          `  (SELECT id FROM sources WHERE code = ${esc(opts.sourceCode)}),`,
          `  ${catCode ? `(SELECT id FROM categories WHERE source_id = (SELECT id FROM sources WHERE code = ${esc(opts.sourceCode)}) AND code = ${esc(catCode)})` : 'NULL'},`,
          `  ${esc(opts.level)}, ${esc(ja)}, ${esc(kana)}, ${esc(ko)},`,
          `  ${trap ? esc(trap) : 'NULL'}, ${escJson([])}`,
          `);`,
        ].join('\n'),
      );
    }
  }

  return statements;
}
