/**
 * packages/db/src/seed/parse-grammar.ts
 *
 * N5 / N4 / N3 문법 마크다운 파싱 → INSERT OR IGNORE SQL 생성
 *
 * 포맷 (테이블 없음, 섹션 기반):
 *   ### G1-1. ~は ~です — "~은 ~입니다"
 *   **구조**: N + は + 명사/형용사 + です
 *   **흔한 오류**: 어미 변형 미사용
 *   예문:
 *   - 私は学生です。 → 저는 학생입니다.
 */
import { parseSections, esc, escJson } from './utils.js';

export interface GrammarSql {
  sourceCode: string;
  level: 'N5' | 'N4' | 'N3';
  filePath: string;
}

interface GrammarEntry {
  pattern: string;
  meaningKo: string;
  connection: string | null;
  errorNote: string | null;
  examples: Array<{ ja: string; ko: string }>;
}

function parseGrammarEntry(heading: string, body: string): GrammarEntry | null {
  // 제목 파싱: "G1-1. ~は ~です — "~은 ~입니다""
  const dashSplit = heading.split(/\s+[—–-]\s+/);
  const rawPattern = dashSplit[0]?.replace(/^[GgNn\d-]+\.\s*/, '').trim() ?? '';
  const meaningKo  = dashSplit[1]?.replace(/^["「]|["」]$/g, '').trim() ?? '';

  if (!rawPattern || !meaningKo) return null;

  // **구조**: ...
  const connectionMatch = body.match(/\*\*구조\*\*[：:]\s*(.+)/);
  const connection = connectionMatch?.[1]?.trim() ?? null;

  // **흔한 오류**: ...
  const errorMatch = body.match(/\*\*흔한\s*오류\*\*[：:]\s*(.+)/);
  const errorNote = errorMatch?.[1]?.trim() ?? null;

  // 예문: 리스트 항목 파싱 "- 일본어 → 한국어" 또는 "- 일본어" (한국어 생략)
  const examples: Array<{ ja: string; ko: string }> = [];
  const bulletMatches = body.matchAll(/^[-*]\s+(.+)/gm);
  for (const m of bulletMatches) {
    const line = m[1]!;
    const arrowIdx = line.search(/[→⇒]/);
    if (arrowIdx !== -1) {
      const ja = line.slice(0, arrowIdx).trim();
      const ko = line.slice(arrowIdx + 1).trim();
      if (ja) examples.push({ ja, ko });
    } else {
      if (line.trim()) examples.push({ ja: line.trim(), ko: '' });
    }
  }

  return {
    pattern: rawPattern,
    meaningKo,
    connection,
    errorNote,
    examples,
  };
}

export function parseGrammar(opts: GrammarSql): string[] {
  const sections = parseSections(opts.filePath);
  const statements: string[] = [];

  for (const sec of sections) {
    if (sec.depth !== 3) continue;
    // 문법 항목 섹션 판별: "G숫자" 또는 "N숫자" 패턴
    if (!/^[GgNn\d]+[-\d]*\.\s/.test(sec.heading)) continue;

    const entry = parseGrammarEntry(sec.heading, sec.body);
    if (!entry) continue;

    statements.push(
      [
        `INSERT OR IGNORE INTO \`grammar\``,
        `  (\`source_id\`, \`level\`, \`pattern\`, \`connection\`, \`meaning_ko\`, \`error_note\`, \`examples\`)`,
        `VALUES (`,
        `  (SELECT id FROM sources WHERE code = ${esc(opts.sourceCode)}),`,
        `  ${esc(opts.level)}, ${esc(entry.pattern)},`,
        `  ${entry.connection ? esc(entry.connection) : 'NULL'},`,
        `  ${esc(entry.meaningKo)},`,
        `  ${entry.errorNote ? esc(entry.errorNote) : 'NULL'},`,
        `  ${escJson(entry.examples)}`,
        `);`,
      ].join('\n'),
    );
  }

  return statements;
}
