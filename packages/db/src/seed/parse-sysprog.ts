/**
 * packages/db/src/seed/parse-sysprog.ts
 *
 * 직무 어휘(A — A_sysprog_vocab_500.md) 파싱 → INSERT OR IGNORE SQL
 *
 * 마크다운 포맷:
 *   ## SP-A. 프로그래밍 기초 (domain: programming)
 *   | 일본어 | 읽기 | 한국어 | 비고 |
 *   | プログラム | ぷろぐらむ | 프로그램 | ★ |
 *
 *   ★ 마크 → star_freq = 1
 *   비고 컬럼에 추가 노트 포함 가능
 */
import { parseMarkdownTables, normalizeCell, stripBr, esc } from './utils.js';
import { CATEGORY_TO_DOMAIN } from './constants.js';

export interface SysProgSql {
  sourceCode: string;
  filePath: string;
}

export function parseSysProg(opts: SysProgSql): string[] {
  const tables = parseMarkdownTables(opts.filePath);
  const statements: string[] = [];

  for (const table of tables) {
    const { headers, rows, nearestH2 } = table;

    // 직무 어휘 테이블 판별: '일본어' + '읽기' 컬럼
    const jaIdx    = headers.findIndex((h) => /일본어/.test(h));
    const kanaIdx  = headers.findIndex((h) => /읽기/.test(h));
    const koIdx    = headers.findIndex((h) => /한국어/.test(h));
    if (jaIdx === -1 || koIdx === -1) continue;

    const noteIdx  = headers.findIndex((h) => /비고/.test(h));

    // 카테고리 코드 파싱: "## SP-A. 프로그래밍 기초" → "SP-A"
    const catMatch = nearestH2.match(/(SP-[A-Z])/i);
    const catCode  = catMatch ? catMatch[1].toUpperCase() : 'SP-A';
    const domain   = CATEGORY_TO_DOMAIN[catCode] ?? 'programming';

    for (const row of rows) {
      const ja = normalizeCell(stripBr(row[jaIdx] ?? ''));
      if (!ja) continue;

      const kana    = normalizeCell(stripBr(row[kanaIdx ?? -1] ?? '')) || null;
      const ko      = normalizeCell(stripBr(row[koIdx ?? -1] ?? ''));
      const noteRaw = noteIdx >= 0 ? normalizeCell(stripBr(row[noteIdx] ?? '')) : '';

      // ★ 마크 → starFreq
      const starFreq = /★/.test(noteRaw) ? 1 : 0;
      // ★ 제거 후 잔여 노트
      const note = noteRaw.replace(/★/g, '').trim() || null;

      statements.push(
        [
          `INSERT OR IGNORE INTO \`sysprog_terms\``,
          `  (\`category_code\`, \`ja\`, \`kana\`, \`ko\`, \`domain\`, \`star_freq\`, \`note\`)`,
          `VALUES (`,
          `  ${esc(catCode)}, ${esc(ja)},`,
          `  ${kana ? esc(kana) : 'NULL'}, ${esc(ko)},`,
          `  ${esc(domain)}, ${starFreq},`,
          `  ${note ? esc(note) : 'NULL'}`,
          `);`,
        ].join('\n'),
      );
    }
  }

  return statements;
}
