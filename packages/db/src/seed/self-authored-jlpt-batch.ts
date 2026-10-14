import { createHash } from 'node:crypto';
import fs from 'node:fs';

import type { JlptLevel } from '@nihongo-n3/shared';

import { parseGrammar } from './parse-grammar.js';
import { parseKanji } from './parse-kanji.js';
import { parseVocab } from './parse-vocab.js';
import { esc, escJson } from './utils.js';

export interface BatchSentenceSeed {
  seqNo: number;
  ja: string;
  kana?: string;
  ko: string;
}

export interface BatchReadingQuestion {
  questionJa: string;
  questionKo: string;
  choices: readonly string[];
  answerIndex: number;
  explanationKo: string;
}

export interface BatchReadingSeed {
  titleJa: string;
  genre: string;
  bodyJa: string;
  bodyKo: string;
  wordCount: number;
  questions: readonly BatchReadingQuestion[];
}

export interface SelfAuthoredJlptBatchConfig {
  sourceCode: string;
  sourceAssetId: string;
  title: string;
  level: Extract<JlptLevel, 'N1' | 'N2'>;
  sourcePath: string;
  repositoryUrl: string;
  licenseUrl: string;
  referencePrefix: string;
  kanji: readonly string[];
  sentences: readonly BatchSentenceSeed[];
  readings: readonly BatchReadingSeed[];
  categories: number;
  generatedAt: number;
}

export interface SelfAuthoredJlptBatchManifest {
  sourceCode: string;
  sourceAssetId: string;
  sourcePath: string;
  sourceSha256: string;
  parserVersion: string;
  counts: {
    categories: number;
    vocab: number;
    grammar: number;
    kanji: number;
    sentences: number;
    reading: number;
    readingQuestions: number;
    stableRefs: number;
    audioBindings: number;
    contentRows: number;
  };
}

export interface SelfAuthoredJlptBatchPlan {
  statements: string[];
  manifest: SelfAuthoredJlptBatchManifest;
}

function countInserts(statements: readonly string[], table: string): number {
  return statements.filter((statement) => (
    statement.startsWith(`INSERT INTO \`${table}\``)
    || statement.startsWith(`INSERT OR IGNORE INTO \`${table}\``)
  )).length;
}

function sourceAttribution(config: SelfAuthoredJlptBatchConfig): string {
  return `self-authored ${config.level} ${config.sourceCode}; source asset ${config.sourceAssetId}`;
}

function sentenceStatement(config: SelfAuthoredJlptBatchConfig, sentence: BatchSentenceSeed): string {
  return [
    'INSERT INTO `sentences` (`source_id`, `level`, `register`, `seq_no`, `ja`, `kana`, `ko`, `vocab_ids`, `grammar_ids`)',
    `VALUES ((SELECT id FROM sources WHERE code = ${esc(config.sourceCode)}), ${esc(config.level)}, 'listening', ${sentence.seqNo}, ${esc(sentence.ja)}, ${sentence.kana ? esc(sentence.kana) : 'NULL'}, ${esc(sentence.ko)}, '[]', '[]')`,
    'ON CONFLICT(`source_id`, `level`, `register`, `seq_no`) DO UPDATE SET `ja` = excluded.`ja`, `kana` = excluded.`kana`, `ko` = excluded.`ko`, `updated_at` = unixepoch();',
  ].join('\n');
}

function readingStatements(config: SelfAuthoredJlptBatchConfig, reading: BatchReadingSeed): string[] {
  const attribution = esc(sourceAttribution(config));
  const passage = [
    'INSERT INTO `reading_passages` (`level`, `genre`, `title_ja`, `body_ja`, `body_ko`, `word_count`, `vocab_ids`, `grammar_ids`, `source_attribution`)',
    `SELECT ${esc(config.level)}, ${esc(reading.genre)}, ${esc(reading.titleJa)}, ${esc(reading.bodyJa)}, ${esc(reading.bodyKo)}, ${reading.wordCount}, '[]', '[]', ${attribution}`,
    'WHERE NOT EXISTS (SELECT 1 FROM `reading_passages`',
    `  WHERE level = ${esc(config.level)} AND title_ja = ${esc(reading.titleJa)} AND source_attribution = ${attribution});`,
  ].join('\n');
  const questions = reading.questions.map((question) => [
    'INSERT INTO `reading_questions` (`passage_id`, `question_ja`, `question_ko`, `choices_json`, `answer_index`, `explanation_ko`)',
    `SELECT id, ${esc(question.questionJa)}, ${esc(question.questionKo)}, ${escJson([...question.choices])}, ${question.answerIndex}, ${esc(question.explanationKo)}`,
    'FROM `reading_passages`',
    `WHERE level = ${esc(config.level)} AND title_ja = ${esc(reading.titleJa)} AND source_attribution = ${attribution}`,
    '  AND NOT EXISTS (SELECT 1 FROM `reading_questions` q WHERE q.passage_id = `reading_passages`.id',
    `    AND q.question_ja = ${esc(question.questionJa)});`,
  ].join('\n'));
  return [passage, ...questions];
}

function stableRefStatements(config: SelfAuthoredJlptBatchConfig): string[] {
  const source = esc(config.sourceCode);
  const asset = esc(config.sourceAssetId);
  const attribution = esc(sourceAttribution(config));
  const chars = config.kanji.map(esc).join(', ');
  const rows: Array<[string, string, string]> = [
    ['jlpt-vocab', `${esc(`${config.referencePrefix}:vocab:`)} || ja || ':' || kana`, `FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = ${esc(config.level)}`],
    ['jlpt-grammar', `${esc(`${config.referencePrefix}:grammar:`)} || pattern`, `FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = ${esc(config.level)}`],
    ['jlpt-kanji', `${esc(`${config.referencePrefix}:kanji:`)} || char`, `FROM kanji WHERE jlpt_level = ${esc(config.level)} AND char IN (${chars})`],
    ['jlpt-sentence', `${esc(`${config.referencePrefix}:listening:`)} || seq_no`, `FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = ${esc(config.level)} AND register = 'listening'`],
    ['jlpt-reading', `${esc(`${config.referencePrefix}:reading:`)} || title_ja`, `FROM reading_passages WHERE level = ${esc(config.level)} AND source_attribution = ${attribution}`],
  ];
  return rows.map(([itemType, stableRef, from]) => [
    'INSERT OR IGNORE INTO `learning_content_stable_refs` (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
    `SELECT ${stableRef}, 'jlpt-ja', ${esc(itemType)}, CAST(id AS TEXT), ${esc(config.level)}, ${asset}`,
    `${from};`,
  ].join('\n'));
}

function audioBindingStatement(config: SelfAuthoredJlptBatchConfig, itemType: 'jlpt-vocab' | 'jlpt-kanji' | 'jlpt-sentence' | 'jlpt-reading', role: 'pronunciation' | 'listening'): string {
  const textSource = itemType === 'jlpt-sentence' ? 'sentence' : itemType === 'jlpt-reading' ? 'passage' : 'item';
  return [
    'INSERT OR IGNORE INTO `content_speech_bindings` (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `speech_role`, `provider`, `binding_state`, `text_source`, `unavailable_reason`)',
    `SELECT 'speech-binding:' || stable_ref, stable_ref, ${esc(itemType)}, item_id, 'ja', ${esc(role)}, 'google-browser', 'ready', ${esc(textSource)}, NULL`,
    'FROM `learning_content_stable_refs`',
    `WHERE learning_track = 'jlpt-ja' AND level_tag = ${esc(config.level)} AND source_asset_id = ${esc(config.sourceAssetId)} AND item_type = ${esc(itemType)};`,
  ].join('\n');
}

export function selfAuthoredJlptBatchContentRowsSql(config: SelfAuthoredJlptBatchConfig): string {
  const source = esc(config.sourceCode);
  const attribution = esc(sourceAttribution(config));
  const chars = config.kanji.map(esc).join(', ');
  return [
    'SELECT',
    `  (SELECT count(*) FROM vocab WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = ${esc(config.level)}) +`,
    `  (SELECT count(*) FROM grammar WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = ${esc(config.level)}) +`,
    `  (SELECT count(*) FROM kanji WHERE jlpt_level = ${esc(config.level)} AND char IN (${chars})) +`,
    `  (SELECT count(*) FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${source}) AND level = ${esc(config.level)} AND register = 'listening') +`,
    `  (SELECT count(*) FROM reading_passages WHERE level = ${esc(config.level)} AND source_attribution = ${attribution}) +`,
    `  (SELECT count(*) FROM reading_questions q JOIN reading_passages p ON p.id = q.passage_id WHERE p.level = ${esc(config.level)} AND p.source_attribution = ${attribution}) AS count;`,
  ].join('\n');
}

export function buildSelfAuthoredJlptBatchPlan(config: SelfAuthoredJlptBatchConfig): SelfAuthoredJlptBatchPlan {
  const sourceSha256 = createHash('sha256').update(fs.readFileSync(config.sourcePath)).digest('hex');
  const vocab = parseVocab({ sourceCode: config.sourceCode, level: config.level, filePath: config.sourcePath });
  const grammar = parseGrammar({ sourceCode: config.sourceCode, level: config.level, filePath: config.sourcePath });
  const kanji = parseKanji({ sourceCode: config.sourceCode, level: config.level, filePath: config.sourcePath });
  const readingQuestions = config.readings.reduce((total, reading) => total + reading.questions.length, 0);
  const stableRefs = countInserts(vocab, 'vocab') + countInserts(grammar, 'grammar') + config.kanji.length + config.sentences.length + config.readings.length;
  const audioBindings = countInserts(vocab, 'vocab') + config.kanji.length + config.sentences.length + config.readings.length;
  const counts = {
    categories: config.categories,
    vocab: countInserts(vocab, 'vocab'),
    grammar: countInserts(grammar, 'grammar'),
    kanji: countInserts(kanji, 'kanji'),
    sentences: config.sentences.length,
    reading: config.readings.length,
    readingQuestions,
    stableRefs,
    audioBindings,
    contentRows: countInserts(vocab, 'vocab') + countInserts(grammar, 'grammar') + countInserts(kanji, 'kanji') + config.sentences.length + config.readings.length + readingQuestions,
  };
  if (counts.kanji !== config.kanji.length) throw new Error(`${config.sourceCode} kanji markdown/parser count changed.`);
  if (counts.contentRows !== counts.vocab + counts.grammar + counts.kanji + counts.sentences + counts.reading + counts.readingQuestions) {
    throw new Error(`${config.sourceCode} content row manifest is inconsistent.`);
  }
  const statements = [
    'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`) ' +
      `VALUES (${esc(config.sourceCode)}, ${esc(config.title)}, ${esc(config.sourcePath.replace(/^.*\/JLPT\//u, ''))}, ${esc(`source-v3-${sourceSha256.slice(0, 16)}`)}) ` +
      'ON CONFLICT(`code`) DO UPDATE SET `title` = excluded.`title`, `file_path` = excluded.`file_path`, `version` = excluded.`version`, `updated_at` = unixepoch();',
    'INSERT OR IGNORE INTO `content_source_assets` (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`) ' +
      `VALUES (${esc(config.sourceAssetId)}, 'self-authored-fixture', ${esc(config.repositoryUrl)}, 'LicenseRef-nihongo-n3-self-authored', ${esc(config.licenseUrl)}, '© Nihongo N3 contributors; self-authored Japanese-learning content.', 'Personal learning content; self-authored explanations, examples, readings, questions, and listening scripts; not official JLPT material.', ${esc(sourceSha256)}, ${config.generatedAt}, 'Operating ${config.level} self-authored curriculum batch with Google browser speech only; R2 pronunciation storage and fallback are disabled.');`,
    ...vocab,
    ...grammar,
    ...kanji,
    ...config.sentences.map((sentence) => sentenceStatement(config, sentence)),
    ...config.readings.flatMap((reading) => readingStatements(config, reading)),
    ...stableRefStatements(config),
    audioBindingStatement(config, 'jlpt-vocab', 'pronunciation'),
    audioBindingStatement(config, 'jlpt-kanji', 'pronunciation'),
    audioBindingStatement(config, 'jlpt-sentence', 'listening'),
    audioBindingStatement(config, 'jlpt-reading', 'listening'),
  ];
  return {
    statements,
    manifest: {
      sourceCode: config.sourceCode,
      sourceAssetId: config.sourceAssetId,
      sourcePath: config.sourcePath.replace(/^.*\/JLPT\//u, ''),
      sourceSha256,
      parserVersion: 'self-authored-jlpt-batch-v1',
      counts,
    },
  };
}
