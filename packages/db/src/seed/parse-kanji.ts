/**
 * packages/db/src/seed/parse-kanji.ts
 *
 * N5 / N4 / N3 한자 마크다운 파싱 → INSERT OR IGNORE SQL 생성
 *
 * 마크다운 포맷:
 *   | 한자 | 의미 | 음독 | 훈독 | 한국 한자음 | N5 어휘 |
 *   | ---- | ---- | ---- | ---- | ---- | ---- |
 *   | 一 | 하나, 1 | いち | ひと | 일(一) | 一つ |
 */
import { parseMarkdownTables, normalizeCell, stripBr, esc, escJson } from './utils.js';

export interface KanjiSql {
  sourceCode: string;
  level: 'N5' | 'N4' | 'N3';
  filePath: string;
}

export function parseKanji(opts: KanjiSql): string[] {
  const tables = parseMarkdownTables(opts.filePath);
  const statements: string[] = [];

  for (const table of tables) {
    const { headers, rows } = table;

    // 한자 테이블 판별: '한자' 컬럼 필수
    const charIdx    = headers.findIndex((h) => /한자/.test(h));
    if (charIdx === -1) continue;

    const meaningIdx = headers.findIndex((h) => /의미/.test(h));
    const onYomiIdx  = headers.findIndex((h) => /음독/.test(h));
    const kunYomiIdx = headers.findIndex((h) => /훈독/.test(h));
    const hanjaIdx   = headers.findIndex((h) => /한국\s*한자음/.test(h));

    for (const row of rows) {
      const char = normalizeCell(stripBr(row[charIdx] ?? ''));
      if (!char || char.length !== 1) continue; // 단일 한자만

      const meaningKo = normalizeCell(stripBr(row[meaningIdx ?? -1] ?? ''));
      const onYomi    = normalizeCell(stripBr(row[onYomiIdx ?? -1] ?? '')) || null;
      const kunYomi   = normalizeCell(stripBr(row[kunYomiIdx ?? -1] ?? '')) || null;
      const hanja     = normalizeCell(stripBr(row[hanjaIdx ?? -1] ?? '')) || null;

      statements.push(
        [
          `INSERT OR IGNORE INTO \`kanji\``,
          `  (\`char\`, \`meaning_ko\`, \`on_yomi\`, \`kun_yomi\`,`,
          `   \`korean_hanja_pronunciation\`, \`jlpt_level\`, \`related_vocab_ids\`)`,
          `VALUES (`,
          `  ${esc(char)}, ${esc(meaningKo)},`,
          `  ${onYomi ? esc(onYomi) : 'NULL'}, ${kunYomi ? esc(kunYomi) : 'NULL'},`,
          `  ${hanja ? esc(hanja) : 'NULL'}, ${esc(opts.level)}, ${escJson([])}`,
          `);`,
        ].join('\n'),
      );
    }
  }

  return statements;
}
