import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { CONTENT_PATHS, REPO_ROOT } from './constants.js';
import { parseCurriculum } from './parse-curriculum.js';
import { parseGrammar } from './parse-grammar.js';
import { parseKanji } from './parse-kanji.js';
import { parseSentences } from './parse-sentences.js';
import { parseSysProg } from './parse-sysprog.js';
import { parseVocab } from './parse-vocab.js';
import { esc } from './utils.js';

export type SeedTable =
  | 'vocab'
  | 'grammar'
  | 'kanji'
  | 'sentences'
  | 'sysprog_terms'
  | 'curriculum_weeks';

interface SourceCatalogEntry {
  code: string;
  title: string;
  filePath: string;
}

interface SeedDefinition extends SourceCatalogEntry {
  table: SeedTable;
  selector: { kind: 'source'; value: string } | { kind: 'level'; value: string } | { kind: 'all' };
  parse: () => string[];
}

export interface ContentManifestEntry {
  sourceCode: string;
  title: string;
  filePath: string;
  sha256: string;
  table: SeedTable;
  selector: SeedDefinition['selector'];
  expectedRows: number;
  expectedCategories: number;
}

export interface ContentManifest {
  schemaVersion: 1;
  generatedAt: string;
  entries: ContentManifestEntry[];
}

export interface ContentSeedPlan {
  statements: string[];
  manifest: ContentManifest;
}

const sourceCatalog: SourceCatalogEntry[] = [
  { code: '00', title: '전체 소스 맵', filePath: path.join(REPO_ROOT, 'docs/00_overview/00_source_map.md') },
  { code: '01', title: '학습 전략', filePath: path.join(REPO_ROOT, 'docs/00_overview/01_learning_strategy.md') },
  { code: '02', title: '발음·가나', filePath: CONTENT_PATHS.pronunciation },
  { code: '03', title: 'N5 한자', filePath: CONTENT_PATHS.n5Kanji },
  { code: '04', title: 'N5 어휘', filePath: CONTENT_PATHS.n5Vocab },
  { code: '05', title: 'N5 문법', filePath: CONTENT_PATHS.n5Grammar },
  { code: '06', title: 'N4 한자', filePath: CONTENT_PATHS.n4Kanji },
  { code: '07', title: 'N4 어휘', filePath: CONTENT_PATHS.n4Vocab },
  { code: '08', title: 'N4 문법', filePath: CONTENT_PATHS.n4Grammar },
  { code: '09', title: 'N3 한자', filePath: CONTENT_PATHS.n3Kanji },
  { code: '10A', title: 'N3 어휘 전반', filePath: CONTENT_PATHS.n3Vocab1 },
  { code: '10B', title: 'N3 어휘 후반', filePath: CONTENT_PATHS.n3Vocab2 },
  { code: '11', title: 'N3 문법', filePath: CONTENT_PATHS.n3Grammar },
  { code: '12', title: '예문 코퍼스', filePath: CONTENT_PATHS.sentences },
  { code: 'A', title: '직무 어휘', filePath: CONTENT_PATHS.sysprog },
  { code: 'B', title: '운영 가이드', filePath: path.join(REPO_ROOT, 'docs/00_overview/B_ops_guide.md') },
  { code: 'C', title: '12개월 기본 학습계획과 자가진단', filePath: CONTENT_PATHS.selfCheck },
];

function buildSeedDefinitions(): SeedDefinition[] {
  const vocabKeys = new Set<string>();
  const grammarKeys = new Set<string>();
  const kanjiKeys = new Set<string>();
  return [
    sourceSeed('04', 'vocab', 'source', () => parseVocab({ sourceCode: '04', level: 'N5', filePath: CONTENT_PATHS.n5Vocab, naturalKeys: vocabKeys })),
    sourceSeed('05', 'grammar', 'source', () => parseGrammar({ sourceCode: '05', level: 'N5', filePath: CONTENT_PATHS.n5Grammar, naturalKeys: grammarKeys })),
    sourceSeed('03', 'kanji', 'level', () => parseKanji({ sourceCode: '03', level: 'N5', filePath: CONTENT_PATHS.n5Kanji, naturalKeys: kanjiKeys }), 'N5'),
    sourceSeed('07', 'vocab', 'source', () => parseVocab({ sourceCode: '07', level: 'N4', filePath: CONTENT_PATHS.n4Vocab, naturalKeys: vocabKeys })),
    sourceSeed('08', 'grammar', 'source', () => parseGrammar({ sourceCode: '08', level: 'N4', filePath: CONTENT_PATHS.n4Grammar, naturalKeys: grammarKeys })),
    sourceSeed('06', 'kanji', 'level', () => parseKanji({ sourceCode: '06', level: 'N4', filePath: CONTENT_PATHS.n4Kanji, naturalKeys: kanjiKeys }), 'N4'),
    sourceSeed('10A', 'vocab', 'source', () => parseVocab({ sourceCode: '10A', level: 'N3', filePath: CONTENT_PATHS.n3Vocab1, naturalKeys: vocabKeys })),
    sourceSeed('10B', 'vocab', 'source', () => parseVocab({ sourceCode: '10B', level: 'N3', filePath: CONTENT_PATHS.n3Vocab2, naturalKeys: vocabKeys })),
    sourceSeed('11', 'grammar', 'source', () => parseGrammar({ sourceCode: '11', level: 'N3', filePath: CONTENT_PATHS.n3Grammar, naturalKeys: grammarKeys })),
    sourceSeed('09', 'kanji', 'level', () => parseKanji({ sourceCode: '09', level: 'N3', filePath: CONTENT_PATHS.n3Kanji, naturalKeys: kanjiKeys }), 'N3'),
    sourceSeed('12', 'sentences', 'source', () => parseSentences({ sourceCode: '12', filePath: CONTENT_PATHS.sentences })),
    sourceSeed('A', 'sysprog_terms', 'all', () => parseSysProg({ sourceCode: 'A', filePath: CONTENT_PATHS.sysprog })),
    sourceSeed('C', 'curriculum_weeks', 'all', parseCurriculum),
  ];
}

function sourceSeed(
  code: string,
  table: SeedTable,
  selectorKind: SeedDefinition['selector']['kind'],
  parse: () => string[],
  selectorValue = code,
): SeedDefinition {
  const source = sourceCatalog.find((entry) => entry.code === code);
  if (!source) throw new Error(`Unknown source code: ${code}`);
  return {
    ...source,
    table,
    selector: selectorKind === 'all'
      ? { kind: 'all' }
      : { kind: selectorKind, value: selectorValue },
    parse,
  };
}

function relativeFilePath(filePath: string): string {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join('/');
}

function fileChecksum(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function countInserts(statements: string[], table: string): number {
  const pattern = new RegExp('^INSERT(?: OR IGNORE)? INTO `?' + table + '`?', 'm');
  return statements.filter((statement) => pattern.test(statement)).length;
}

function sourceCatalogStatements(): string[] {
  return sourceCatalog.map((source) => [
    'INSERT INTO `sources` (`code`, `title`, `file_path`)',
    `VALUES (${esc(source.code)}, ${esc(source.title)}, ${esc(relativeFilePath(source.filePath))})`,
    'ON CONFLICT(`code`) DO UPDATE SET',
    '  `title` = excluded.`title`,',
    '  `file_path` = excluded.`file_path`,',
    '  `updated_at` = unixepoch();',
  ].join('\n'));
}

export function buildContentSeedPlan(): ContentSeedPlan {
  const statements = sourceCatalogStatements();
  const entries: ContentManifestEntry[] = [];

  for (const definition of buildSeedDefinitions()) {
    if (!fs.existsSync(definition.filePath)) {
      throw new Error(`Content source is missing: ${relativeFilePath(definition.filePath)}`);
    }

    const parsed = definition.parse();
    statements.push(...parsed);
    entries.push({
      sourceCode: definition.code,
      title: definition.title,
      filePath: relativeFilePath(definition.filePath),
      sha256: fileChecksum(definition.filePath),
      table: definition.table,
      selector: definition.selector,
      expectedRows: countInserts(parsed, definition.table),
      expectedCategories: countInserts(parsed, 'categories'),
    });
  }

  return {
    statements,
    manifest: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      entries,
    },
  };
}
