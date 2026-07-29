import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { CONTENT_PATHS, REPO_ROOT } from './constants.js';
import {
  buildHomophoneSeedStatements,
  HOMOPHONE_PAIRS,
  HOMOPHONE_PARSER_VERSION,
  homophonePairsChecksum,
  validateHomophonePairs,
} from './homophone-pairs.js';
import { parseCurriculum } from './parse-curriculum.js';
import { parseGrammar } from './parse-grammar.js';
import { parseKanji } from './parse-kanji.js';
import { buildN2Batch1Plan } from './n2-batch1.js';
import { buildN2Batch2Plan } from './n2-batch2.js';
import { buildN2Batch3Plan } from './n2-batch3.js';
import { buildTopikOwnerBatch1Plan } from './topik-owner-curriculum-batch1.js';
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
  | 'curriculum_weeks'
  /** A multi-table, self-authored N2 learning batch with its own verifier query. */
  | 'n2_curriculum'
  /** Operating owner-authored TOPIK 1–6 curriculum, independent of the practice bank. */
  | 'topik_owner_curriculum';

export const CONTENT_MANIFEST_SCHEMA_VERSION = 3;
export const CONTENT_PARSER_VERSION = 'content-parser-v3';
export const SEEDED_SOURCE_COUNT = 17;

const REPOSITORY_URL = 'https://github.com/kordokrip/JLPT';
const ATTRIBUTIONS_URL = `${REPOSITORY_URL}/blob/main/docs/ATTRIBUTIONS.md`;
// `reviewer` is a legacy manifest column name, not a publication requirement.
const CONTENT_REVIEWER = 'self-authored personal content record (no external reviewer)';
const CONTENT_REVIEWED_AT = '2026-07-16';

export interface ContentProvenance {
  origin: {
    name: string;
    url: string;
  };
  license: {
    id: string;
    name: string;
    url: string;
  };
  reviewer: string;
  reviewedAt: string;
}

interface SourceCatalogEntry {
  code: string;
  title: string;
  filePath: string;
  provenance: ContentProvenance;
}

interface SeedDefinition extends SourceCatalogEntry {
  table: SeedTable;
  selector: { kind: 'source'; value: string } | { kind: 'level'; value: string } | { kind: 'all' };
  parse: () => string[];
  /** Multi-table sources declare their deliberate content-row total explicitly. */
  expectedRows?: number;
  /** Parsers may repeat INSERT OR IGNORE category statements across content types. */
  expectedCategories?: number;
}

export interface ContentManifestEntry {
  sourceCode: string;
  title: string;
  filePath: string;
  sha256: string;
  sourceVersion: string;
  parserVersion: string;
  provenance: ContentProvenance;
  table: SeedTable;
  selector: SeedDefinition['selector'];
  expectedRows: number;
  expectedCategories: number;
}

export interface HomophoneManifestEntry {
  sourcePath: string;
  parserVersion: string;
  sha256: string;
  expectedRows: number;
  accentSource: string;
  accentSourceUrl: string;
  reviewer: string;
  reviewedAt: string;
}

export interface ContentManifest {
  schemaVersion: typeof CONTENT_MANIFEST_SCHEMA_VERSION;
  contentVersion: string;
  parserVersion: string;
  manifestSha256: string;
  seedRunId: string;
  generatedAt: string;
  entries: ContentManifestEntry[];
  derivedContent: {
    homophonePairs: HomophoneManifestEntry;
  };
}

export interface ContentSeedPlan {
  statements: string[];
  manifest: ContentManifest;
}

function relativeFilePath(filePath: string): string {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join('/');
}

function repositoryFileUrl(filePath: string): string {
  return `${REPOSITORY_URL}/blob/main/${relativeFilePath(filePath)}`;
}

function sourceProvenance(code: string, title: string, filePath: string): ContentProvenance {
  const mixedTerminology = code === 'A';
  const selfAuthoredN2Batch = code === 'N2-A1' || code === 'N2-A2' || code === 'N2-A3';
  const selfAuthoredBatch = selfAuthoredN2Batch || code === 'TOPIK-A1';
  return {
    origin: {
      name: selfAuthoredBatch
        ? `${title} self-authored personal learning batch`
        : mixedTerminology
        ? `${title} repository compilation with documented terminology references`
        : `${title} repository-managed learning source`,
      url: repositoryFileUrl(filePath),
    },
    license: selfAuthoredBatch
      ? {
        id: 'LicenseRef-nihongo-n3-self-authored',
        name: 'Self-authored personal learning content',
        url: `${ATTRIBUTIONS_URL}#학습-콘텐츠와-provenance`,
      }
      : mixedTerminology
      ? {
        id: 'LicenseRef-nihongo-n3-mixed-terminology',
        name: 'Repository compilation with source references',
        url: `${ATTRIBUTIONS_URL}#학습-콘텐츠와-provenance`,
      }
      : {
        id: 'LicenseRef-nihongo-n3-managed-content',
        name: 'Repository-managed learning content',
        url: `${ATTRIBUTIONS_URL}#학습-콘텐츠와-provenance`,
      },
    // This field is legacy seed provenance, not a public-release reviewer gate.
    reviewer: selfAuthoredBatch ? 'self-authored personal content record (no external reviewer)' : CONTENT_REVIEWER,
    reviewedAt: code === 'TOPIK-A1' ? '2026-07-30' : selfAuthoredN2Batch ? '2026-07-29' : CONTENT_REVIEWED_AT,
  };
}

function catalogEntry(code: string, title: string, filePath: string): SourceCatalogEntry {
  return { code, title, filePath, provenance: sourceProvenance(code, title, filePath) };
}

const sourceCatalog: SourceCatalogEntry[] = [
  catalogEntry('00', '전체 소스 맵', path.join(REPO_ROOT, 'docs/00_overview/00_source_map.md')),
  catalogEntry('01', '학습 전략', path.join(REPO_ROOT, 'docs/00_overview/01_learning_strategy.md')),
  catalogEntry('02', '발음·가나', CONTENT_PATHS.pronunciation),
  catalogEntry('03', 'N5 한자', CONTENT_PATHS.n5Kanji),
  catalogEntry('04', 'N5 어휘', CONTENT_PATHS.n5Vocab),
  catalogEntry('05', 'N5 문법', CONTENT_PATHS.n5Grammar),
  catalogEntry('06', 'N4 한자', CONTENT_PATHS.n4Kanji),
  catalogEntry('07', 'N4 어휘', CONTENT_PATHS.n4Vocab),
  catalogEntry('08', 'N4 문법', CONTENT_PATHS.n4Grammar),
  catalogEntry('09', 'N3 한자', CONTENT_PATHS.n3Kanji),
  catalogEntry('10A', 'N3 어휘 전반', CONTENT_PATHS.n3Vocab1),
  catalogEntry('10B', 'N3 어휘 후반', CONTENT_PATHS.n3Vocab2),
  catalogEntry('11', 'N3 문법', CONTENT_PATHS.n3Grammar),
  catalogEntry('N2-A1', 'N2 자체 저작 Batch 1', CONTENT_PATHS.n2Batch1),
  catalogEntry('N2-A2', 'N2 자체 저작 Batch 2', CONTENT_PATHS.n2Batch2),
  catalogEntry('N2-A3', 'N2 자체 저작 Batch 3', CONTENT_PATHS.n2Batch3),
  catalogEntry('TOPIK-A1', 'TOPIK 1~6급 자체 저작 Batch 1', CONTENT_PATHS.topikOwnerBatch1),
  catalogEntry('12', '예문 코퍼스', CONTENT_PATHS.sentences),
  catalogEntry('A', '직무 어휘', CONTENT_PATHS.sysprog),
  catalogEntry('C', '12개월 기본 학습계획과 자가진단', CONTENT_PATHS.selfCheck),
];

function buildSeedDefinitions(): SeedDefinition[] {
  const vocabKeys = new Set<string>();
  const grammarKeys = new Set<string>();
  const kanjiKeys = new Set<string>();
  const n2Batch1 = buildN2Batch1Plan();
  const n2Batch2 = buildN2Batch2Plan();
  const n2Batch3 = buildN2Batch3Plan();
  const topikOwnerBatch1 = buildTopikOwnerBatch1Plan();
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
    {
      ...sourceSeed('N2-A1', 'n2_curriculum', 'source', () => n2Batch1.statements),
      expectedRows: n2Batch1.manifest.counts.contentRows,
      expectedCategories: n2Batch1.manifest.counts.categories,
    },
    {
      ...sourceSeed('N2-A2', 'n2_curriculum', 'source', () => n2Batch2.statements),
      expectedRows: n2Batch2.manifest.counts.contentRows,
      expectedCategories: n2Batch2.manifest.counts.categories,
    },
    {
      ...sourceSeed('N2-A3', 'n2_curriculum', 'source', () => n2Batch3.statements),
      expectedRows: n2Batch3.manifest.counts.contentRows,
      expectedCategories: n2Batch3.manifest.counts.categories,
    },
    {
      ...sourceSeed('TOPIK-A1', 'topik_owner_curriculum', 'source', () => topikOwnerBatch1.statements),
      expectedRows: topikOwnerBatch1.manifest.counts.contentRows,
      expectedCategories: 0,
    },
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
  if (!hasCompleteProvenance(source.provenance)) {
    throw new Error(`Seed source provenance is incomplete: ${code}`);
  }
  return {
    ...source,
    table,
    selector: selectorKind === 'all'
      ? { kind: 'all' }
      : { kind: selectorKind, value: selectorValue },
    parse,
  };
}

function fileChecksum(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function checksum(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function countInserts(statements: string[], table: string): number {
  const pattern = new RegExp('^INSERT(?: OR IGNORE)? INTO `?' + table + '`?', 'm');
  return statements.filter((statement) => pattern.test(statement)).length;
}

export function hasCompleteProvenance(value: ContentProvenance | undefined): value is ContentProvenance {
  return Boolean(
    value
      && value.origin.name.trim()
      && isHttpsUrl(value.origin.url)
      && value.license.id.trim()
      && value.license.name.trim()
      && isHttpsUrl(value.license.url)
      && value.reviewer.trim()
      && isCalendarDate(value.reviewedAt),
  );
}

function sourceCatalogStatements(entries: ContentManifestEntry[]): string[] {
  const sourceVersions = new Map(entries.map((entry) => [entry.sourceCode, entry.sourceVersion]));
  return sourceCatalog.map((source) => [
    'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`)',
    `VALUES (${esc(source.code)}, ${esc(source.title)}, ${esc(relativeFilePath(source.filePath))}, ${esc(sourceVersions.get(source.code) ?? 'catalog-v1')})`,
    'ON CONFLICT(`code`) DO UPDATE SET',
    '  `title` = excluded.`title`,',
    '  `file_path` = excluded.`file_path`,',
    '  `version` = excluded.`version`,',
    '  `updated_at` = unixepoch();',
  ].join('\n'));
}

function homophoneManifestEntry(): HomophoneManifestEntry {
  validateHomophonePairs();
  const exemplar = HOMOPHONE_PAIRS[0];
  if (!exemplar) throw new Error('Homophone seed is empty.');
  return {
    sourcePath: 'packages/db/src/seed/homophone-pairs.ts',
    parserVersion: HOMOPHONE_PARSER_VERSION,
    sha256: homophonePairsChecksum(),
    expectedRows: HOMOPHONE_PAIRS.length,
    accentSource: exemplar.accentSource,
    accentSourceUrl: exemplar.accentSourceUrl,
    reviewer: exemplar.reviewer,
    reviewedAt: exemplar.reviewedAt,
  };
}

function seedRunStatements(manifest: ContentManifest): string[] {
  const runInsert = [
    'INSERT INTO `content_seed_runs`',
    '  (`run_id`, `content_version`, `parser_version`, `manifest_sha256`, `generated_at`)',
    `VALUES (${esc(manifest.seedRunId)}, ${esc(manifest.contentVersion)}, ${esc(manifest.parserVersion)}, ${esc(manifest.manifestSha256)}, ${esc(manifest.generatedAt)})`,
    'ON CONFLICT(`run_id`) DO NOTHING;',
  ].join('\n');

  const sourceRecords = [
    ...manifest.entries.map((entry) => ({
      sourceCode: entry.sourceCode,
      sourceChecksum: entry.sha256,
      parserVersion: entry.parserVersion,
      provenance: entry.provenance,
    })),
    {
      sourceCode: 'derived:homophone_pairs',
      sourceChecksum: manifest.derivedContent.homophonePairs.sha256,
      parserVersion: manifest.derivedContent.homophonePairs.parserVersion,
      provenance: {
        origin: {
          name: 'Reviewed homophone pair dataset',
          url: `${REPOSITORY_URL}/blob/main/${manifest.derivedContent.homophonePairs.sourcePath}`,
        },
        license: {
          id: 'LicenseRef-nihongo-n3-managed-content',
          name: 'Repository-managed learning content',
          url: `${ATTRIBUTIONS_URL}#동음이의어-콘텐츠`,
        },
        reviewer: manifest.derivedContent.homophonePairs.reviewer,
        reviewedAt: manifest.derivedContent.homophonePairs.reviewedAt,
      },
    },
  ];

  const sourceInserts = sourceRecords.map((entry) => [
    'INSERT INTO `content_seed_sources`',
    '  (`seed_run_id`, `source_code`, `source_checksum`, `parser_version`, `provenance_json`)',
    'SELECT `id`,',
    `  ${esc(entry.sourceCode)}, ${esc(entry.sourceChecksum)}, ${esc(entry.parserVersion)}, ${esc(JSON.stringify(entry.provenance))}`,
    `FROM \`content_seed_runs\` WHERE \`run_id\` = ${esc(manifest.seedRunId)}`,
    'ON CONFLICT(`seed_run_id`, `source_code`) DO UPDATE SET',
    '  `source_checksum` = excluded.`source_checksum`,',
    '  `parser_version` = excluded.`parser_version`,',
    '  `provenance_json` = excluded.`provenance_json`;',
  ].join('\n'));

  return [runInsert, ...sourceInserts];
}

export function buildContentSeedPlan(): ContentSeedPlan {
  const parsedDefinitions = buildSeedDefinitions().map((definition) => {
    if (!fs.existsSync(definition.filePath)) {
      throw new Error(`Content source is missing: ${relativeFilePath(definition.filePath)}`);
    }
    const parsed = definition.parse();
    const sha256 = fileChecksum(definition.filePath);
    return {
      definition,
      parsed,
      entry: {
        sourceCode: definition.code,
        title: definition.title,
        filePath: relativeFilePath(definition.filePath),
        sha256,
        sourceVersion: `source-v3-${sha256.slice(0, 16)}`,
        parserVersion: CONTENT_PARSER_VERSION,
        provenance: definition.provenance,
        table: definition.table,
        selector: definition.selector,
        expectedRows: definition.expectedRows ?? countInserts(parsed, definition.table),
        expectedCategories: definition.expectedCategories ?? countInserts(parsed, 'categories'),
      } satisfies ContentManifestEntry,
    };
  });

  const entries = parsedDefinitions.map(({ entry }) => entry);
  if (entries.length !== SEEDED_SOURCE_COUNT) {
    throw new Error(`Expected ${SEEDED_SOURCE_COUNT} seed sources, received ${entries.length}.`);
  }
  if (entries.some((entry) => !hasCompleteProvenance(entry.provenance))) {
    throw new Error('Seed manifest has incomplete provenance.');
  }

  const derivedContent = { homophonePairs: homophoneManifestEntry() };
  const identity = {
    schemaVersion: CONTENT_MANIFEST_SCHEMA_VERSION as typeof CONTENT_MANIFEST_SCHEMA_VERSION,
    parserVersion: CONTENT_PARSER_VERSION,
    entries,
    derivedContent,
  };
  const manifestSha256 = checksum(identity);
  const manifest: ContentManifest = {
    ...identity,
    contentVersion: `content-v3-${manifestSha256.slice(0, 20)}`,
    manifestSha256,
    seedRunId: `seed-${randomUUID()}`,
    generatedAt: new Date().toISOString(),
  };

  return {
    statements: [
      ...sourceCatalogStatements(entries),
      ...parsedDefinitions.flatMap(({ parsed }) => parsed),
      ...buildHomophoneSeedStatements(),
      ...seedRunStatements(manifest),
    ],
    manifest,
  };
}
