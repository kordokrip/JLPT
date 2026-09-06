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
import {
  categoryInsert,
  parseCategoryHeading,
  parseMarkdownTables,
  normalizeCell,
  stripBr,
  esc,
  escJson,
} from './utils.js';
import type { JlptLevel } from '@nihongo-n3/shared';

export interface VocabSql {
  /** `sources.code` (예: '04') */
  sourceCode: string;
  level: JlptLevel;
  filePath: string;
  naturalKeys?: Set<string>;
}

export function parseVocab(opts: VocabSql): string[] {
  const tables = parseMarkdownTables(opts.filePath);
  const statements: string[] = [];
  const insertedCategories = new Set<string>();
  const naturalKeys = opts.naturalKeys ?? new Set<string>();

  for (const table of tables) {
    const { headers, rows, nearestH2 } = table;

    const category = parseCategoryHeading(nearestH2);
    if (!category) continue;

    // 카테고리 안의 어휘 테이블만 허용한다. 학습표·동음이의어 표는 제외한다.
    const jaIdx = headers.findIndex((h) => h.includes('일본어'));
    if (jaIdx === -1) continue;

    const kanaIdx  = headers.findIndex((h) => h.includes('가나'));
    const koIdx = headers.findIndex((h) => /^(?:한국어\s*)?(?:의미|뜻)$/u.test(h.trim()));
    const noteIdx = headers.findIndex((h) => /주의|함정/u.test(h));

    if (koIdx === -1) {
      throw new Error(
        `[vocab:${opts.sourceCode}] 의미 헤더(의미/뜻/한국어 뜻)가 없습니다: ${nearestH2}`,
      );
    }

    if (!insertedCategories.has(category.code)) {
      statements.push(categoryInsert(opts.sourceCode, category));
      insertedCategories.add(category.code);
    }

    for (const row of rows) {
      const ja  = normalizeCell(stripBr(row[jaIdx] ?? ''));
      if (!ja) continue;

      const kanaRaw = normalizeCell(stripBr(row[kanaIdx ?? -1] ?? ''));
      const kana    = kanaRaw || ja;           // '-'이면 ja 그대로
      const ko      = normalizeCell(stripBr(row[koIdx ?? -1] ?? ''));
      const trap    = normalizeCell(stripBr(row[noteIdx ?? -1] ?? ''));

      if (!ko) {
        throw new Error(
          `[vocab:${opts.sourceCode}] 한국어 뜻이 비어 있습니다: ${nearestH2} / ${ja}`,
        );
      }

      const naturalKey = `${opts.level}\u0000${ja}\u0000${kana}`;
      if (naturalKeys.has(naturalKey)) continue;
      naturalKeys.add(naturalKey);

      statements.push(
        [
          `INSERT INTO \`vocab\``,
          `  (\`source_id\`, \`category_id\`, \`level\`, \`ja\`, \`kana\`, \`ko\`, \`trap_note\`, \`tags\`)`,
          `VALUES (`,
          `  (SELECT id FROM sources WHERE code = ${esc(opts.sourceCode)}),`,
          `  (SELECT id FROM categories WHERE source_id = (SELECT id FROM sources WHERE code = ${esc(opts.sourceCode)}) AND code = ${esc(category.code)}),`,
          `  ${esc(opts.level)}, ${esc(ja)}, ${esc(kana)}, ${esc(ko)},`,
          `  ${trap ? esc(trap) : 'NULL'}, ${escJson([])}`,
          `) ON CONFLICT(\`level\`, \`ja\`, \`kana\`) DO UPDATE SET`,
          `  \`source_id\` = excluded.\`source_id\`,`,
          `  \`category_id\` = excluded.\`category_id\`,`,
          `  \`ko\` = excluded.\`ko\`,`,
          `  \`trap_note\` = excluded.\`trap_note\`,`,
          `  \`tags\` = excluded.\`tags\`,`,
          `  \`updated_at\` = unixepoch();`,
        ].join('\n'),
      );
    }
  }

  return statements;
}
