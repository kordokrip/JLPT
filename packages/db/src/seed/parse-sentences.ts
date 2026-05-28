/**
 * packages/db/src/seed/parse-sentences.ts
 *
 * 예문 마크다운 파싱 → INSERT OR IGNORE SQL 생성
 *
 * 마크다운 포맷:
 *   ## N5 회화
 *   | # | 일본어 | 한국어 |
 *   | 1 | 私は山田です。 | 저는 야마다입니다. |
 *
 *   레벨: 헤딩에서 N5/N4/N3 추출
 *   레지스터: 헤딩에서 회화→conversation, 신문→newspaper, 비즈니스→business
 */
import { parseMarkdownTables, normalizeCell, stripBr, esc, escJson } from './utils.js';

export interface SentencesSql {
  sourceCode: string;
  filePath: string;
}

const REGISTER_MAP: Record<string, string> = {
  '회화': 'conversation',
  '신문': 'newspaper',
  '비즈니스': 'business',
  'business': 'business',
  'conversation': 'conversation',
  'newspaper': 'newspaper',
};

function detectLevelAndRegister(
  heading: string,
): { level: string | null; register: string | null } {
  const levelMatch = heading.match(/N([3-5])/i);
  const level = levelMatch ? `N${levelMatch[1]}` : null;

  let register: string | null = null;
  for (const [key, val] of Object.entries(REGISTER_MAP)) {
    if (heading.includes(key)) { register = val; break; }
  }
  return { level, register };
}

export function parseSentences(opts: SentencesSql): string[] {
  const tables = parseMarkdownTables(opts.filePath);
  const statements: string[] = [];

  for (const table of tables) {
    const { headers, rows, nearestH2, nearestH3 } = table;

    // 예문 테이블 판별: '#' 또는 '일본어' 컬럼
    const seqIdx = headers.findIndex((h) => h.trim() === '#');
    const jaIdx  = headers.findIndex((h) => /일본어/.test(h));
    const koIdx  = headers.findIndex((h) => /한국어/.test(h));
    if (jaIdx === -1 || koIdx === -1) continue;

    // 레벨/레지스터는 H2 우선, 없으면 H3
    const context = detectLevelAndRegister(nearestH2 || nearestH3);
    const { level, register } = context;
    if (!level || !register) continue;

    let autoSeq = 0;
    for (const row of rows) {
      const ja = normalizeCell(stripBr(row[jaIdx] ?? ''));
      const ko = normalizeCell(stripBr(row[koIdx] ?? ''));
      if (!ja || !ko) continue;

      const seqRaw = seqIdx >= 0 ? normalizeCell(row[seqIdx] ?? '') : '';
      const seqNo  = seqRaw ? (parseInt(seqRaw, 10) || ++autoSeq) : ++autoSeq;

      statements.push(
        [
          `INSERT OR IGNORE INTO \`sentences\``,
          `  (\`source_id\`, \`level\`, \`register\`, \`seq_no\`, \`ja\`, \`ko\`, \`vocab_ids\`, \`grammar_ids\`)`,
          `VALUES (`,
          `  (SELECT id FROM sources WHERE code = ${esc(opts.sourceCode)}),`,
          `  ${esc(level)}, ${esc(register)}, ${seqNo},`,
          `  ${esc(ja)}, ${esc(ko)},`,
          `  ${escJson([])}, ${escJson([])}`,
          `);`,
        ].join('\n'),
      );
    }
  }

  return statements;
}
