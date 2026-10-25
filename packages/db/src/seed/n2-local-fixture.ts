/**
 * A deliberately small, self-authored N2 vertical slice.  It is separate from
 * the N5–N3 release manifest so it never inherits that manifest's reviewer
 * metadata or turns a local fixture into a public release.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './constants.js';
import { parseGrammar } from './parse-grammar.js';
import { parseKanji } from './parse-kanji.js';
import { parseVocab } from './parse-vocab.js';
import { esc, escJson } from './utils.js';

export const N2_LOCAL_FIXTURE_SOURCE_CODE = 'N2-LOCAL-2026-07-29-V2';
export const N2_LOCAL_FIXTURE_SOURCE_ASSET_ID = 'source-asset:jlpt-n2-local-2026-07-29-v2';
export const N2_LOCAL_FIXTURE_PATH = path.join(REPO_ROOT, 'docs/05_n2/01_self_authored_local_fixture.md');
export const N2_LOCAL_FIXTURE_LICENSE_ID = 'LicenseRef-nihongo-n3-self-authored';
export const N2_LOCAL_FIXTURE_REPOSITORY_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/05_n2/01_self_authored_local_fixture.md';
export const N2_LOCAL_FIXTURE_LICENSE_URL = 'https://github.com/kordokrip/JLPT/blob/main/docs/ATTRIBUTIONS.md#학습-콘텐츠와-provenance';

export interface N2LocalFixtureManifest {
  sourceCode: string;
  sourceAssetId: string;
  sourcePath: string;
  sourceSha256: string;
  parserVersion: string;
  counts: {
    vocab: number;
    grammar: number;
    kanji: number;
    sentences: number;
    reading: number;
    audioBindings: number;
    prerequisites: number;
  };
}

export interface N2LocalFixturePlan {
  statements: string[];
  manifest: N2LocalFixtureManifest;
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableRefStatement(
  stableRef: string,
  itemType: 'jlpt-vocab' | 'jlpt-grammar' | 'jlpt-kanji' | 'jlpt-sentence' | 'jlpt-reading',
  itemIdSql: string,
): string {
  return [
    'INSERT OR IGNORE INTO `learning_content_stable_refs`',
    '  (`stable_ref`, `learning_track`, `item_type`, `item_id`, `level_tag`, `source_asset_id`)',
    `VALUES (${esc(stableRef)}, 'jlpt-ja', ${esc(itemType)}, ${itemIdSql}, 'N2', ${esc(N2_LOCAL_FIXTURE_SOURCE_ASSET_ID)});`,
  ].join('\n');
}

function pendingAudioStatement(
  id: string,
  stableRef: string,
  itemType: 'jlpt-vocab' | 'jlpt-kanji' | 'jlpt-sentence' | 'jlpt-reading',
  itemIdSql: string,
  language: 'ja',
  audioRole: 'pronunciation' | 'listening',
): string {
  const textSource = itemType === 'jlpt-sentence' ? 'sentence' : itemType === 'jlpt-reading' ? 'passage' : 'item';
  return [
    'INSERT OR IGNORE INTO `content_speech_bindings`',
    '  (`id`, `stable_ref`, `item_type`, `item_id`, `language`, `speech_role`, `provider`, `binding_state`, `text_source`, `unavailable_reason`)',
    `VALUES (${esc(id.replace(/^audio-binding:/, 'speech-binding:'))}, ${esc(stableRef)}, ${esc(itemType)}, ${itemIdSql}, ${esc(language)}, ${esc(audioRole)},`,
    `  'google-browser', 'ready', ${esc(textSource)}, NULL);`,
  ].join('\n');
}

export function buildN2LocalFixturePlan(): N2LocalFixturePlan {
  const sourceSha256 = sha256(fs.readFileSync(N2_LOCAL_FIXTURE_PATH));
  const statements: string[] = [
    [
      'INSERT INTO `sources` (`code`, `title`, `file_path`, `version`)',
      `VALUES (${esc(N2_LOCAL_FIXTURE_SOURCE_CODE)}, 'JLPT N2 자체 저작 로컬 fixture', 'docs/05_n2/01_self_authored_local_fixture.md', 'n2-local-fixture-v2')`,
      'ON CONFLICT(`code`) DO UPDATE SET',
      '  `title` = excluded.`title`,',
      '  `file_path` = excluded.`file_path`,',
      '  `version` = excluded.`version`,',
      '  `updated_at` = unixepoch();',
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `content_source_assets`',
      '  (`id`, `asset_kind`, `source_url`, `license_id`, `license_url`, `attribution_text`, `allowed_use`, `source_sha256`, `generated_at`, `selection_reason`)',
      `VALUES (${esc(N2_LOCAL_FIXTURE_SOURCE_ASSET_ID)}, 'self-authored-fixture', ${esc(N2_LOCAL_FIXTURE_REPOSITORY_URL)},`,
      `  ${esc(N2_LOCAL_FIXTURE_LICENSE_ID)}, ${esc(N2_LOCAL_FIXTURE_LICENSE_URL)},`,
      "  '© Nihongo N3 contributors; self-authored local educational fixture.',",
      "  'Local contract, parser, API, and PWA test only; not an official JLPT list or public release.',",
      `  ${esc(sourceSha256)}, 1785283200, 'Fixture provenance for the first N2 vertical slice.');`,
    ].join('\n'),
    ...parseVocab({ sourceCode: N2_LOCAL_FIXTURE_SOURCE_CODE, level: 'N2', filePath: N2_LOCAL_FIXTURE_PATH }),
    ...parseGrammar({ sourceCode: N2_LOCAL_FIXTURE_SOURCE_CODE, level: 'N2', filePath: N2_LOCAL_FIXTURE_PATH }),
    ...parseKanji({ sourceCode: N2_LOCAL_FIXTURE_SOURCE_CODE, level: 'N2', filePath: N2_LOCAL_FIXTURE_PATH }),
  ];

  const sentenceJa = '締め切りまでに機材を手配し、照会への返答をまとめよう。';
  statements.push(
    [
      'INSERT INTO `sentences` (`source_id`, `level`, `register`, `seq_no`, `ja`, `kana`, `ko`, `vocab_ids`, `grammar_ids`)',
      `VALUES ((SELECT id FROM sources WHERE code = ${esc(N2_LOCAL_FIXTURE_SOURCE_CODE)}), 'N2', 'business', 1,`,
      `  ${esc(sentenceJa)}, 'しめきりまでにきざいをてはいし、しょうかいへのへんとうをまとめよう。',`,
      "  '마감 전까지 기재를 준비하고 조회에 대한 답변을 정리하자.', '[]', '[]')",
      'ON CONFLICT(`source_id`, `level`, `register`, `seq_no`) DO UPDATE SET',
      '  `ja` = excluded.`ja`, `kana` = excluded.`kana`, `ko` = excluded.`ko`, `updated_at` = unixepoch();',
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `reading_passages`',
      '  (`level`, `genre`, `title_ja`, `body_ja`, `body_ko`, `word_count`, `vocab_ids`, `grammar_ids`, `source_attribution`)',
      "VALUES ('N2', 'notice', '作業順の見直し',",
      "  '来週の更新では、照会の多い画面から順に案内を整えます。画面の余白を確かめ、必要な機材を手配してから利用者への返答を始める予定です。',",
      "  '다음 주 업데이트에서는 조회가 많은 화면부터 안내를 정리합니다. 화면의 여백을 확인하고 필요한 기재를 준비한 뒤 이용자 답변을 시작할 예정입니다.',",
      `  41, '[]', '[]', ${esc(`self-authored fixture; source asset ${N2_LOCAL_FIXTURE_SOURCE_ASSET_ID}`)});`,
    ].join('\n'),
    [
      'INSERT OR IGNORE INTO `reading_questions`',
      '  (`passage_id`, `question_ja`, `question_ko`, `choices_json`, `answer_index`, `explanation_ko`)',
      "VALUES ((SELECT id FROM reading_passages WHERE level = 'N2' AND title_ja = '作業順の見直し'),",
      "  'この案内で、最初に見直すものは何ですか。', '이 안내에서 처음으로 다시 검토하는 것은 무엇입니까?',",
      `  ${escJson(['문의가 많은 화면의 안내', '새로운 공식 시험 문제', '사용자의 개인정보', '브라우저 음성 설정'])}, 0,`,
      "  '지문에서 문의가 많은 화면부터 안내를 다시 검토한다고 했습니다.');",
    ].join('\n'),
  );

  // A fixture must bind its own rows even when an operating N2 batch contains
  // the same headword.  Without the source predicate, SQLite can choose that
  // other row, the stable-ref uniqueness rule rejects the fixture ref, and the
  // following audio binding no longer has a matching stable ref.
  const fixtureSourceId = `(SELECT id FROM sources WHERE code = ${esc(N2_LOCAL_FIXTURE_SOURCE_CODE)})`;
  const refs: Array<{ stableRef: string; type: 'jlpt-vocab' | 'jlpt-grammar' | 'jlpt-kanji' | 'jlpt-sentence' | 'jlpt-reading'; itemId: string }> = [
    { stableRef: 'jlpt:n2:vocab:余白:よはく', type: 'jlpt-vocab', itemId: `(SELECT CAST(id AS TEXT) FROM vocab WHERE source_id = ${fixtureSourceId} AND level = 'N2' AND ja = '余白' AND kana = 'よはく')` },
    { stableRef: 'jlpt:n2:vocab:手配:てはい', type: 'jlpt-vocab', itemId: `(SELECT CAST(id AS TEXT) FROM vocab WHERE source_id = ${fixtureSourceId} AND level = 'N2' AND ja = '手配' AND kana = 'てはい')` },
    { stableRef: 'jlpt:n2:vocab:照会:しょうかい', type: 'jlpt-vocab', itemId: `(SELECT CAST(id AS TEXT) FROM vocab WHERE source_id = ${fixtureSourceId} AND level = 'N2' AND ja = '照会' AND kana = 'しょうかい')` },
    { stableRef: 'jlpt:n2:grammar:に違いない', type: 'jlpt-grammar', itemId: `(SELECT CAST(id AS TEXT) FROM grammar WHERE source_id = ${fixtureSourceId} AND level = 'N2' AND pattern = '～に違いない')` },
    { stableRef: 'jlpt:n2:kanji:余', type: 'jlpt-kanji', itemId: `(SELECT CAST(id AS TEXT) FROM kanji WHERE char = '余')` },
    { stableRef: 'jlpt:n2:sentence:business:1', type: 'jlpt-sentence', itemId: `(SELECT CAST(id AS TEXT) FROM sentences WHERE source_id = (SELECT id FROM sources WHERE code = ${esc(N2_LOCAL_FIXTURE_SOURCE_CODE)}) AND level = 'N2' AND register = 'business' AND seq_no = 1)` },
    { stableRef: 'jlpt:n2:reading:作業順の見直し', type: 'jlpt-reading', itemId: `(SELECT CAST(id AS TEXT) FROM reading_passages WHERE level = 'N2' AND title_ja = '作業順の見直し')` },
  ];
  statements.push(...refs.map((ref) => stableRefStatement(ref.stableRef, ref.type, ref.itemId)));
  statements.push([
    'INSERT OR IGNORE INTO `learning_content_level_references`',
    '  (`id`, `learning_track`, `curriculum_level`, `item_type`, `item_id`, `reference_kind`, `source_asset_id`)',
    "VALUES ('curriculum-reference:jlpt:n2:kanji:対', 'jlpt-ja', 'N2', 'jlpt-kanji',",
    "  (SELECT CAST(id AS TEXT) FROM kanji WHERE char = '対' AND jlpt_level = 'N3'), 'prerequisite',",
    `  ${esc(N2_LOCAL_FIXTURE_SOURCE_ASSET_ID)});`,
  ].join('\n'));
  statements.push(
    ...refs.filter((ref) => ref.type !== 'jlpt-grammar').map((ref) => pendingAudioStatement(
      `audio-binding:${ref.stableRef}`,
      ref.stableRef,
      ref.type as 'jlpt-vocab' | 'jlpt-kanji' | 'jlpt-sentence' | 'jlpt-reading',
      ref.itemId,
      'ja',
      ref.type === 'jlpt-sentence' || ref.type === 'jlpt-reading' ? 'listening' : 'pronunciation',
    )),
  );

  return {
    statements,
    manifest: {
      sourceCode: N2_LOCAL_FIXTURE_SOURCE_CODE,
      sourceAssetId: N2_LOCAL_FIXTURE_SOURCE_ASSET_ID,
      sourcePath: path.relative(REPO_ROOT, N2_LOCAL_FIXTURE_PATH).split(path.sep).join('/'),
      sourceSha256,
      parserVersion: 'n2-local-fixture-parser-v2',
      counts: { vocab: 3, grammar: 1, kanji: 1, sentences: 1, reading: 1, audioBindings: 6, prerequisites: 1 },
    },
  };
}
