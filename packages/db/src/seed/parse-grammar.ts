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
  // 제목 파싱:
  // - "G1-1. ~は ~です — "~은 ~입니다""
  // - "G1-1. ~そうだ (양태) "~할 것 같다""
  const withoutCode = heading.replace(/^[GgNn\d-]+\.\s*/, '').trim();
  const dashSplit = withoutCode.split(/\s+[—–-]\s+/);
  const quotedMeaning = withoutCode.match(/["「]([^"」]+)["」]\s*$/);
  const rawPattern = (dashSplit.length > 1
    ? dashSplit[0]
    : withoutCode.replace(/\s*["「][^"」]+["」]\s*$/, '')
  )?.trim() ?? '';
  const meaningKo = (dashSplit.length > 1
    ? dashSplit[1]
    : quotedMeaning?.[1]
  )?.replace(/^["「]|["」]$/g, '').trim() ?? '';

  if (!rawPattern || !meaningKo) return null;

  // **구조** / **접속**: ...
  const connectionMatch = body.match(/\*\*(?:구조|접속)\*\*[：:]\s*(.+)/);
  const connection = connectionMatch?.[1]?.trim() ?? null;

  // **흔한 오류** / **오류**: ...
  const errorMatch = body.match(/\*\*(?:흔한\s*)?오류\*\*[：:]\s*(.+)/);
  const errorNote = errorMatch?.[1]?.trim() ?? null;

  // 예문: 리스트 항목 파싱
  // - "- 일본어 → 한국어"
  // - "1. 日本語。 (한국어)"
  const examples: Array<{ ja: string; ko: string }> = [];
  const exampleStart = body.search(/\*\*예문\*\*[：:]?/);
  const exampleBody = exampleStart >= 0 ? body.slice(exampleStart) : body;
  const bulletMatches = exampleBody.matchAll(/^\s*(?:[-*]|\d+\.)\s+(.+)/gm);
  for (const m of bulletMatches) {
    const line = m[1]!;
    if (/^\*\*/.test(line.trim())) continue;
    const arrowIdx = line.search(/[→⇒]/);
    if (arrowIdx !== -1) {
      const ja = line.slice(0, arrowIdx).trim();
      const ko = line.slice(arrowIdx + 1).trim();
      if (ja) examples.push({ ja, ko });
    } else {
      const parenKo = line.match(/^(.+?)\s*[（(]([^()（）]+)[）)]\s*$/);
      if (parenKo?.[1]) {
        examples.push({ ja: parenKo[1].trim(), ko: parenKo[2]?.trim() ?? '' });
      } else if (line.trim()) {
        examples.push({ ja: line.trim(), ko: '' });
      }
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
