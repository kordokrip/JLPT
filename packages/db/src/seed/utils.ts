/**
 * packages/db/src/seed/utils.ts
 *
 * 마크다운 파싱 공유 유틸리티
 * - remark + remark-gfm 기반 GFM 테이블 파싱
 * - 헤딩 컨텍스트 추적 (카테고리·레벨·레지스터 감지)
 * - SQL 생성 헬퍼 (idempotent INSERT OR IGNORE)
 */
import fs from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Root, Table, Heading, TableRow } from 'mdast';

// ─────────────────────────────────────────────
// 공개 타입
// ─────────────────────────────────────────────
export interface ParsedTable {
  /** 컬럼 헤더 배열 */
  headers: string[];
  /** 데이터 행 배열 (각 행은 셀 문자열 배열) */
  rows: string[][];
  /** 이 테이블 바로 앞 H2/H3 제목 (카테고리·레벨 감지용) */
  nearestH2: string;
  nearestH3: string;
}

// ─────────────────────────────────────────────
// 마크다운 → ParsedTable[]
// ─────────────────────────────────────────────
export function parseMarkdownTables(filePath: string): ParsedTable[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const processor = unified().use(remarkParse).use(remarkGfm);
  const ast = processor.parse(content) as Root;

  const tables: ParsedTable[] = [];
  let h2 = '';
  let h3 = '';

  visit(ast, (node) => {
    if (node.type === 'heading') {
      const heading = node as Heading;
      const text = toString(heading);
      if (heading.depth === 2) { h2 = text; h3 = ''; }
      if (heading.depth === 3) h3 = text;
    }

    if (node.type === 'table') {
      const tableNode = node as Table;
      const [headerRow, ...dataRows] = tableNode.children as TableRow[];
      if (!headerRow) return;

      const headers = headerRow.children.map((cell) => toString(cell).trim());
      const rows = dataRows
        .map((row) => row.children.map((cell) => toString(cell).trim()))
        // 모든 셀이 '---' 인 구분자 행 제거
        .filter((row) => !row.every((c) => /^-+$/.test(c)));

      tables.push({ headers, rows, nearestH2: h2, nearestH3: h3 });
    }
  });

  return tables;
}

// ─────────────────────────────────────────────
// 마크다운 → H2/H3 섹션 블록 배열
// (grammar처럼 테이블이 아닌 자유형식 파싱용)
// ─────────────────────────────────────────────
export interface MarkdownSection {
  depth: 2 | 3;
  heading: string;
  body: string; // 해당 섹션의 원시 텍스트
}

export function parseSections(filePath: string): MarkdownSection[] {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;
  const bodyBuf: string[] = [];

  const flush = () => {
    if (current) {
      current.body = bodyBuf.join('\n').trim();
      sections.push(current);
      bodyBuf.length = 0;
    }
  };

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.*)/);
    const h3Match = line.match(/^###\s+(.*)/);
    if (h2Match) {
      flush();
      current = { depth: 2, heading: h2Match[1]!.trim(), body: '' };
    } else if (h3Match) {
      flush();
      current = { depth: 3, heading: h3Match[1]!.trim(), body: '' };
    } else {
      bodyBuf.push(line);
    }
  }
  flush();
  return sections;
}

// ─────────────────────────────────────────────
// 셀 정규화 헬퍼
// ─────────────────────────────────────────────

/** '-' 는 빈 문자열로 변환 */
export function normalizeCell(value: string): string {
  const v = value.trim();
  return v === '-' || v === '—' || v === '' ? '' : v;
}

/** HTML <br> 태그 제거 */
export function stripBr(value: string): string {
  return value.replace(/<br\s*\/?>/gi, ' ').trim();
}

// ─────────────────────────────────────────────
// SQL 생성 헬퍼
// ─────────────────────────────────────────────

/** SQL 문자열 이스케이핑 (단일 인용부호 → 두 개) */
export function esc(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** JSON 배열을 SQL 문자열로 */
export function escJson(arr: unknown[]): string {
  return esc(JSON.stringify(arr));
}

/** INSERT OR IGNORE 구문 생성 */
export function insertOrIgnore(
  table: string,
  cols: string[],
  values: (string | number | null)[],
): string {
  const colStr = cols.map((c) => `\`${c}\``).join(', ');
  const valStr = values
    .map((v) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : v))
    .join(', ');
  return `INSERT OR IGNORE INTO \`${table}\` (${colStr}) VALUES (${valStr});`;
}

// ─────────────────────────────────────────────
// 배치 청크 분할
// ─────────────────────────────────────────────
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
